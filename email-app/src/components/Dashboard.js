import React, { useMemo } from 'react';
import Icon from './ui/Icon';
import AnimatedCard from './ui/AnimatedCard';
import {
  useAnalytics,
  useContacts,
  useEmailSummary,
  useTasks,
  useJourneySummary,
  useEvents
} from '../hooks/useApi';

const EVENT_LABELS = {
  opened: 'Email opened',
  clicked: 'Link clicked',
  replied: 'Reply received',
  delivered: 'Email delivered',
  bounced: 'Email bounced',
  unsubscribed: 'Unsubscribed',
  proposal_sent: 'Proposal sent',
  no_reply_3d: 'No reply after 3 days',
  new_lead: 'New lead added'
};

const EVENT_COLORS = {
  replied: 'emerald',
  opened: 'purple',
  clicked: 'blue',
  delivered: 'blue',
  bounced: 'rose',
  unsubscribed: 'rose',
  proposal_sent: 'amber',
  no_reply_3d: 'amber',
  new_lead: 'emerald'
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

const formatTrigger = (value) => {
  if (!value) return 'Trigger: unknown';
  return `Trigger: ${value.replace(/_/g, ' ')}`;
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
  return isTaskOverdue(task) ? `Overdue · ${label}` : `Due ${label}`;
};

const formatTaskContact = (task) => {
  const contact = task?.contact;
  if (!contact) return 'Contact unavailable';
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  return name || contact.email || 'Contact unavailable';
};

const Dashboard = () => {
  const analyticsQuery      = useAnalytics({ days: 30 });
  const contactsQuery       = useContacts({ limit: 200 });
  const emailSummaryQuery   = useEmailSummary();
  const tasksQuery          = useTasks({ status: 'Open', limit: 50 });
  const journeySummaryQuery = useJourneySummary();
  const eventsQuery         = useEvents({ limit: 6 });

  const loading = [analyticsQuery, contactsQuery, emailSummaryQuery, tasksQuery, journeySummaryQuery, eventsQuery]
    .some((q) => q.isLoading);

  const analytics      = analyticsQuery.data;
  const contactsData   = contactsQuery.data;
  const emailSummary   = emailSummaryQuery.data;
  const tasksData      = tasksQuery.data;
  const journeySummary = journeySummaryQuery.data;
  const eventsData     = eventsQuery.data;

  const windowLabel = useMemo(() => `Last ${analytics?.windowDays ?? 30} days`, [analytics]);

  const contactMap = useMemo(() => buildContactMap(contactsData?.contacts || []), [contactsData]);

  const stats = useMemo(() => {
    const deliverability = analytics?.deliverability || {};
    const windowDays     = analytics?.windowDays || 30;
    const totalContacts  = contactsData?.totalCount ?? (contactsData?.contacts || []).length;
    const totalEmails    = emailSummary?.totalCount || 0;
    const unreadEmails   = emailSummary?.unreadCount || 0;
    return [
      { key: 'contacts',   label: 'Total Contacts', value: formatNumber(totalContacts),            change: 'All time',            dir: 'neutral', color: 'amber',   icon: 'users' },
      { key: 'totalEmails',label: 'Total Emails',   value: formatNumber(totalEmails),              change: 'Gmail total',         dir: 'neutral', color: 'blue',    icon: 'mail'  },
      { key: 'unread',     label: 'Unread Emails',  value: formatNumber(unreadEmails),             change: 'Live',                dir: 'neutral', color: 'rose',    icon: 'inbox' },
      { key: 'openRate',   label: 'Avg Open Rate',  value: formatPercent(deliverability.openRate), change: `Last ${windowDays} days`, dir: 'neutral', color: 'emerald', icon: 'bar'   }
    ];
  }, [analytics, contactsData, emailSummary]);

  const pipelineStages = useMemo(() => {
    const stageFunnel = analytics?.stageFunnel || {};
    return [
      ['New',       stageFunnel.New       || 0],
      ['Qualified', stageFunnel.Qualified || 0],
      ['Proposal',  stageFunnel.Proposal  || 0],
      ['Won',       stageFunnel.Won       || 0],
      ['Lost',      stageFunnel.Lost      || 0]
    ];
  }, [analytics]);

  const activities = useMemo(() => {
    const events = eventsData?.events || [];
    return events.map((event) => {
      const eventType    = (event.eventType || '').toLowerCase();
      const contact      = contactMap.get(event.contactId);
      const label        = EVENT_LABELS[eventType] || 'Activity logged';
      const contactLabel = contact?.label || `Contact ${String(event.contactId || '').slice(0, 6)}`;
      return {
        id:    event.eventId || `${eventType}-${event.contactId}-${event.occurredAtUtc}`,
        color: EVENT_COLORS[eventType] || 'blue',
        text:  `${label} · ${contactLabel}`,
        time:  formatRelativeTime(event.occurredAtUtc || event.createdAtUtc)
      };
    });
  }, [eventsData, contactMap]);

  const { tasks, taskTotal } = useMemo(() => {
    const taskRows = tasksData?.tasks || [];
    const now      = Date.now();
    const sorted   = [...taskRows].sort((a, b) => {
      const aOverdue = a.dueAtUtc && new Date(a.dueAtUtc).getTime() < now;
      const bOverdue = b.dueAtUtc && new Date(b.dueAtUtc).getTime() < now;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aDue = a.dueAtUtc ? new Date(a.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueAtUtc ? new Date(b.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(b.updatedAtUtc).getTime() - new Date(a.updatedAtUtc).getTime();
    });
    return { tasks: sorted.slice(0, 12), taskTotal: tasksData?.totalCount || taskRows.length };
  }, [tasksData]);

  const journeys = useMemo(() => {
    const published = (journeySummary?.journeys || []).filter(
      (j) => String(j.status || '').toLowerCase() === 'published'
    );
    return [...published]
      .sort((a, b) => (b.activeEnrollments || 0) - (a.activeEnrollments || 0))
      .slice(0, 4);
  }, [journeySummary]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="content fade-in">
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading dashboard…</p>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div className="syne page-title-greeting">
              {greeting} — <span className="gradient-text">let’s make moves today.</span>
            </div>
            <div className="helper-text helper-text-top">{today}</div>
          </div>

          <div className="stats-grid">
            {stats.map((stat) => (
              <AnimatedCard key={stat.key} className={`stat-card ${stat.color}`}>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-change ${stat.dir || ''}`}>
                  {stat.dir === 'up' && <span>+</span>}
                  {stat.dir === 'down' && <span>-</span>}
                  {stat.change}
                </div>
                <div className="stat-icon">
                  <Icon name={stat.icon} size={28} color="currentColor" />
                </div>
              </AnimatedCard>
            ))}
          </div>

          <div className="dash-grid">
            <div className="dash-left">
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
                      {activities.map((activity) => (
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

              <div className="card">
                <div className="card-header">
                <Icon name="pipeline" size={14} color="var(--blue)" />
                  <span className="card-title">Pipeline Overview</span>
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
                  <div className="card-footer-note">
                    Live view from analytics window
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-right">
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
                      {tasks.map((task) => {
                        const done = String(task.status || '').toLowerCase() === 'completed';
                        const overdue = isTaskOverdue(task);
                        const priorityClass = getTaskPriorityClass(task.priority);
                        return (
                          <div key={task.taskId} className="task-item">
                            <div className={`task-check ${done ? 'done' : ''}`}>
                              {done && <Icon name="check" size={10} color="#fff" />}
                            </div>
                            <div className="task-info">
                              <div className={`task-name ${done ? 'done' : ''}`}>{task.title}</div>
                              <div className={`task-meta ${overdue ? 'overdue' : ''}`}>
                                {formatTaskDue(task)} · {formatTaskContact(task)}
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

              <div className="card">
                <div className="card-header">
                <Icon name="journey" size={14} color="#a78bfa" />
                  <span className="card-title">Active Journeys</span>
                </div>
                <div className="card-body">
                  {journeys.length === 0 ? (
                    <div className="empty-state empty-state-sm">
                      <p>No published journeys</p>
                      <small>Create and publish a journey to see it here</small>
                    </div>
                  ) : (
                    <div className="dashboard-journey-list">
                      {journeys.map((journey) => (
                        <div key={journey.journeyId} className="journey-card journey-card-compact">
                          <div className={`journey-status ${String(journey.status || '').toLowerCase()}`} />
                          <div className="journey-info">
                            <div className="journey-name">{journey.name}</div>
                            <div className="journey-trigger">{formatTrigger(journey.triggerType)}</div>
                          </div>
                          <div className="journey-stats">
                            <div className="journey-enrolled">{journey.activeEnrollments || 0}</div>
                            <div className="journey-lbl">active</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
