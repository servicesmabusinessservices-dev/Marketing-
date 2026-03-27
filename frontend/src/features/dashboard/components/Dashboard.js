import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Icon from '../../../components/ui/Icon';
import AnimatedCard from '../../../components/ui/AnimatedCard';
import KPICard from '../../../components/ui/KPICard';
import ChartCard from '../../../components/ui/ChartCard';
import InsightCard from '../../../components/ui/InsightCard';
import ErrorState from '../../../components/ui/ErrorState';
import { KPIRowSkeleton, ChartSkeleton, InsightSkeleton } from '../../../components/ui/PageSkeleton';
import WelcomeModal, { shouldShowWelcomeModal } from '../../../components/ui/WelcomeModal';
import '../../../components/ui/DashboardCards.css';
import {
  useAnalytics,
  useContacts,
  useEmailSummary,
  useTasks,
  useJourneySummary,
  useEvents,
  useTemplates,
  useCampaigns,
} from '../../../hooks/useApi';
import { getEventTone, ON_SOLID_ICON_COLOR } from '../../../utils/uiColorMaps';
import { generateDashboardInsights } from '../../../utils/insightEngine';
import {
  STAGE_COLORS, CHART_COLORS, CHART_HEIGHT,
  getThemeStyles,
} from '../../../utils/chartTheme';

const EVENT_LABELS = {
  opened: 'Email opened',
  clicked: 'Link clicked',
  replied: 'Reply received',
  delivered: 'Email delivered',
  bounced: 'Email bounced',
  unsubscribed: 'Unsubscribed',
  proposal_sent: 'Proposal sent',
  no_reply_3d: 'No reply after 3 days',
  new_lead: 'New lead added',
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatNumber = (value) => {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safe);
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return '--';
  return `${Number(value).toFixed(1)}%`;
};

const buildContactMap = (contacts) => {
  const map = new Map();
  contacts.forEach((contact) => {
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
    map.set(contact.contactId, { label: name || contact.email || 'Contact' });
  });
  return map;
};

const getTaskPriorityClass = (value) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('low')) return 'low';
  return 'medium';
};

const isTaskOverdue = (task) => {
  if (!task?.dueAtUtc) return false;
  if (String(task.status || '').toLowerCase() === 'completed') return false;
  return new Date(task.dueAtUtc) < new Date();
};

const formatTaskDue = (task) => {
  if (!task?.dueAtUtc) return 'No due date';
  const dueDate = new Date(task.dueAtUtc);
  if (Number.isNaN(dueDate.getTime())) return 'No due date';
  const label = dueDate.toLocaleDateString();
  return isTaskOverdue(task) ? `Overdue - ${label}` : `Due ${label}`;
};

const formatTaskContact = (task) => {
  const contact = task?.contact;
  if (!contact) return 'Contact unavailable';
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  return name || contact.email || 'Contact unavailable';
};

/* ── Sub-components ──────────────────────────────── */

const ActivityFeed = React.memo(({ activities, windowLabel }) => (
  <div className="card">
    <div className="card-header">
      <Icon name="zap" size={14} color="var(--purple)" />
      <span className="card-title">Recent Activity</span>
      <span className="card-header-meta">{windowLabel}</span>
    </div>
    <div className="card-body">
      {activities.length === 0 ? (
        <div className="empty-state empty-state-sm">
          <p>No activity yet</p>
          <small>Events will appear once tracked</small>
        </div>
      ) : (
        <div className="dashboard-activity-list">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className={`activity-dot ${activity.color}`} />
              <div>
                <div className="activity-text">{activity.text}</div>
                <div className="activity-time">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
));
ActivityFeed.displayName = 'ActivityFeed';

const PipelineOverview = React.memo(({ pipelineStages, totalContacts }) => (
  <div className="card">
    <div className="card-header">
      <Icon name="pipeline" size={14} color="var(--indigo)" />
      <span className="card-title">Pipeline Snapshot</span>
      <span className="card-header-meta">{formatNumber(totalContacts)} total</span>
    </div>
    <div className="card-body">
      <div className="pipeline-stages">
        {pipelineStages.map(([stage, count]) => (
          <div key={stage} className={`stage-pill ${stage.toLowerCase()}`}>
            <span className="count">{count}</span>
            {stage}
          </div>
        ))}
      </div>
    </div>
  </div>
));
PipelineOverview.displayName = 'PipelineOverview';

const TaskFocus = React.memo(({ tasks, taskTotal }) => (
  <div className="card">
    <div className="card-header">
      <Icon name="check" size={14} color="var(--emerald)" />
      <span className="card-title">Task Focus</span>
      <span className="card-header-meta">{formatNumber(taskTotal)} open</span>
    </div>
    <div className="card-body">
      {tasks.length === 0 ? (
        <div className="empty-state empty-state-sm">
          <p>No open tasks</p>
          <small>Create a task from pipeline contacts</small>
        </div>
      ) : (
        <div className="task-scroll-wrap">
          {tasks.slice(0, 5).map((task) => {
            const done = String(task.status || '').toLowerCase() === 'completed';
            const overdue = isTaskOverdue(task);
            const priorityClass = getTaskPriorityClass(task.priority);
            return (
              <div key={task.taskId} className="task-item">
                <div className={`task-check ${done ? 'done' : ''}`}>
                  {done && <Icon name="check" size={10} color={ON_SOLID_ICON_COLOR} />}
                </div>
                <div className="task-info">
                  <div className={`task-name ${done ? 'done' : ''}`}>{task.title}</div>
                  <div className={`task-meta ${overdue ? 'overdue' : ''}`}>
                    {formatTaskDue(task)} - {formatTaskContact(task)}
                  </div>
                </div>
                <span className={`priority-badge ${priorityClass}`}>{priorityClass}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
));
TaskFocus.displayName = 'TaskFocus';

/* ── Custom Recharts Tooltip ─────────────────────── */

const FunnelTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  const theme = getThemeStyles();
  return (
    <div style={theme.tooltip}>
      <strong>{name}</strong>: {formatNumber(value)}
    </div>
  );
};

const EngagementTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, unit } = payload[0].payload;
  const theme = getThemeStyles();
  return (
    <div style={theme.tooltip}>
      <strong>{name}</strong>: {unit === '%' ? `${value}%` : formatNumber(value)}
    </div>
  );
};

/* ── Main Dashboard ──────────────────────────────── */

const Dashboard = () => {
  const analyticsQuery = useAnalytics({ days: 30 });
  const contactsQuery = useContacts({ limit: 200 });
  const emailSummaryQuery = useEmailSummary();
  const tasksQuery = useTasks({ status: 'Open', limit: 50 });
  const journeySummaryQuery = useJourneySummary();
  const eventsQuery = useEvents({ limit: 6 });
  const templatesQuery = useTemplates();
  const campaignsQuery = useCampaigns();

  const [showWelcome, setShowWelcome] = useState(() => shouldShowWelcomeModal());

  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  const loading = [
    analyticsQuery,
    contactsQuery,
    emailSummaryQuery,
    tasksQuery,
    journeySummaryQuery,
    eventsQuery,
    templatesQuery,
    campaignsQuery,
  ].some((q) => q.isLoading);
  const hasError = [
    analyticsQuery,
    contactsQuery,
    emailSummaryQuery,
    tasksQuery,
    journeySummaryQuery,
    eventsQuery,
    templatesQuery,
    campaignsQuery,
  ].some((q) => q.isError);

  const analytics = analyticsQuery.data;
  const contactsData = contactsQuery.data;
  const emailSummary = emailSummaryQuery.data;
  const tasksData = tasksQuery.data;
  const journeySummary = journeySummaryQuery.data;
  const eventsData = eventsQuery.data;

  const windowLabel = useMemo(() => `Last ${analytics?.windowDays ?? 30} days`, [analytics]);
  const contactMap = useMemo(() => buildContactMap(contactsData?.contacts || []), [contactsData]);

  /* ── KPI metrics ── */
  const kpis = useMemo(() => {
    const engagement = analytics?.engagement || {};
    const conversion = analytics?.conversionRates || {};
    const totalContacts = contactsData?.totalCount ?? (contactsData?.contacts || []).length;
    const publishedJourneys = (journeySummary?.journeys || []).filter(
      (j) => String(j.status || '').toLowerCase() === 'published'
    );
    const totalEnrollments = publishedJourneys.reduce((s, j) => s + (j.activeEnrollments || 0), 0);

    return [
      { label: 'Total Contacts', value: formatNumber(totalContacts), change: 'All time', changeDirection: 'neutral', icon: 'users', accentColor: 'amber' },
      { label: 'Win Rate', value: formatPercent(conversion.overallWinRate), change: windowLabel, changeDirection: 'neutral', icon: 'trending', accentColor: 'emerald' },
      { label: 'Open Rate', value: formatPercent(engagement.openRate), change: windowLabel, changeDirection: 'neutral', icon: 'mail', accentColor: 'blue' },
      { label: 'Click Rate', value: formatPercent(engagement.clickRate), change: windowLabel, changeDirection: 'neutral', icon: 'cursor', accentColor: 'primary' },
      { label: 'Active Journeys', value: String(publishedJourneys.length), change: `${totalEnrollments} enrolled`, changeDirection: totalEnrollments > 0 ? 'up' : 'neutral', icon: 'journey', accentColor: 'purple' },
    ];
  }, [analytics, contactsData, journeySummary, windowLabel]);

  /* ── Chart data ── */
  const funnelData = useMemo(() => {
    const funnel = analytics?.stageFunnel || {};
    return [
      { name: 'New', value: funnel.New || 0, fill: STAGE_COLORS.New },
      { name: 'Qualified', value: funnel.Qualified || 0, fill: STAGE_COLORS.Qualified },
      { name: 'Proposal', value: funnel.Proposal || 0, fill: STAGE_COLORS.Proposal },
      { name: 'Won', value: funnel.Won || 0, fill: STAGE_COLORS.Won },
    ];
  }, [analytics]);

  const engagementData = useMemo(() => {
    const eng = analytics?.engagement || {};
    return [
      { name: 'Sent', value: eng.sent || 0, unit: '#', fill: CHART_COLORS.primary },
      { name: 'Open Rate', value: eng.openRate || 0, unit: '%', fill: CHART_COLORS.amber },
      { name: 'Click Rate', value: eng.clickRate || 0, unit: '%', fill: CHART_COLORS.emerald },
      { name: 'Reply Rate', value: eng.replyRate || 0, unit: '%', fill: CHART_COLORS.blue },
    ];
  }, [analytics]);

  /* ── Pipeline stages ── */
  const pipelineStages = useMemo(() => {
    const funnel = analytics?.stageFunnel || {};
    return [
      ['New', funnel.New || 0],
      ['Qualified', funnel.Qualified || 0],
      ['Proposal', funnel.Proposal || 0],
      ['Won', funnel.Won || 0],
      ['Lost', funnel.Lost || 0],
    ];
  }, [analytics]);
  const totalPipelineContacts = useMemo(
    () => pipelineStages.reduce((s, [, c]) => s + c, 0),
    [pipelineStages]
  );

  /* ── Activity feed ── */
  const activities = useMemo(() => {
    const rows = eventsData?.events || [];
    return rows.map((event) => {
      const eventType = (event.eventType || '').toLowerCase();
      const contact = contactMap.get(event.contactId);
      const label = EVENT_LABELS[eventType] || 'Activity logged';
      const contactLabel = contact?.label || `Contact ${String(event.contactId || '').slice(0, 6)}`;
      return {
        id: event.eventId || `${eventType}-${event.contactId}-${event.occurredAtUtc}`,
        color: getEventTone(eventType),
        text: `${label} - ${contactLabel}`,
        time: formatRelativeTime(event.occurredAtUtc || event.createdAtUtc),
      };
    });
  }, [eventsData, contactMap]);

  /* ── Tasks ── */
  const { tasks, taskTotal } = useMemo(() => {
    const rows = tasksData?.tasks || [];
    const now = Date.now();
    const sorted = [...rows].sort((a, b) => {
      const aOverdue = a.dueAtUtc && new Date(a.dueAtUtc).getTime() < now;
      const bOverdue = b.dueAtUtc && new Date(b.dueAtUtc).getTime() < now;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aDue = a.dueAtUtc ? new Date(a.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueAtUtc ? new Date(b.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(b.updatedAtUtc).getTime() - new Date(a.updatedAtUtc).getTime();
    });
    return { tasks: sorted.slice(0, 5), taskTotal: tasksData?.totalCount || rows.length };
  }, [tasksData]);

  /* ── Insights ── */
  const insights = useMemo(
    () => generateDashboardInsights({ analytics, contacts: contactsData, tasks: tasksData, journeys: journeySummary }),
    [analytics, contactsData, tasksData, journeySummary]
  );

  /* ── Greeting ── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const refetchAll = () => {
    analyticsQuery.refetch();
    contactsQuery.refetch();
    emailSummaryQuery.refetch();
    tasksQuery.refetch();
    journeySummaryQuery.refetch();
    eventsQuery.refetch();
  };

  const theme = getThemeStyles();

  const shouldShowWelcome = showWelcome && !loading;

  return (
    <div className="content fade-in">
      {shouldShowWelcome && (
        <WelcomeModal onDismiss={dismissWelcome} />
      )}
      {loading ? (
        <>
          <div className="dash-page-header">
            <div>
              <div className="skeleton-block" style={{ width: 220, height: 24, borderRadius: 6 }} />
              <div className="skeleton-block" style={{ width: 160, height: 14, borderRadius: 4, marginTop: 8 }} />
            </div>
          </div>
          <KPIRowSkeleton count={5} />
          <div className="charts-row"><ChartSkeleton /><ChartSkeleton /></div>
          <InsightSkeleton />
        </>
      ) : hasError ? (
        <ErrorState message="Failed to load dashboard data." onRetry={refetchAll} />
      ) : (
        <>
          {/* ── Page Header ── */}
          <div className="dash-page-header">
            <div>
              <h1 className="dash-title">{greeting}</h1>
              <p className="dash-subtitle">{today} · {windowLabel}</p>
            </div>
          </div>

          {/* ── KPI Cards Row ── */}
          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} {...kpi} />
            ))}
          </div>

          {/* ── Primary Charts ── */}
          <div className="charts-row">
            <ChartCard title="Pipeline Funnel" subtitle="Leads by stage" icon="pipeline">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                  <CartesianGrid horizontal={false} {...theme.grid} />
                  <XAxis type="number" tick={theme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={theme.axisTick} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<FunnelTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {funnelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Engagement Overview" subtitle={windowLabel} icon="bar">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={engagementData} margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                  <CartesianGrid vertical={false} {...theme.grid} />
                  <XAxis dataKey="name" tick={theme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axisTick} axisLine={false} tickLine={false} />
                  <Tooltip content={<EngagementTooltip />} cursor={false} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {engagementData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Secondary Widgets ── */}
          <div className="secondary-row">
            <ActivityFeed activities={activities} windowLabel={windowLabel} />
            <PipelineOverview pipelineStages={pipelineStages} totalContacts={totalPipelineContacts} />
            <TaskFocus tasks={tasks} taskTotal={taskTotal} />
          </div>

          {/* ── Insights Panel ── */}
          <InsightCard insights={insights} />
        </>
      )}
    </div>
  );
};

export default Dashboard;
