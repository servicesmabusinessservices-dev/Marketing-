import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';

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
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [journeys, setJourneys] = useState([]);
  const [windowLabel, setWindowLabel] = useState('Last 30 days');

  const buildContactMap = (contacts) => {
    const map = new Map();
    contacts.forEach((contact) => {
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      map.set(contact.contactId, {
        label: name || contact.email || 'Contact'
      });
    });
    return map;
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [analytics, contactsData, emailSummary, tasksData, journeySummary, eventsData] = await Promise.all([
          gmailService.getAnalytics({ days: 30 }),
          gmailService.getContacts({ limit: 200 }),
          gmailService.getEmailSummary(),
          gmailService.getTasks({ status: 'Open', limit: 50 }),
          gmailService.getJourneySummary(),
          gmailService.getEvents({ limit: 6 })
        ]);

        const totalContacts = contactsData?.totalCount ?? (contactsData?.contacts || []).length;
        const contactMap = buildContactMap(contactsData?.contacts || []);
        const deliverability = analytics?.deliverability || {};
        const stageFunnel = analytics?.stageFunnel || {};
        const windowDays = analytics?.windowDays || 30;
        const totalEmails = emailSummary?.totalCount || 0;
        const unreadEmails = emailSummary?.unreadCount || 0;

        setWindowLabel(`Last ${windowDays} days`);

        setStats([
          {
            key: 'contacts',
            label: 'Total Contacts',
            value: formatNumber(totalContacts),
            change: 'All time',
            dir: 'neutral',
            color: 'amber',
            icon: 'users'
          },
          {
            key: 'totalEmails',
            label: 'Total Emails',
            value: formatNumber(totalEmails),
            change: 'Gmail total',
            dir: 'neutral',
            color: 'blue',
            icon: 'mail'
          },
          {
            key: 'unread',
            label: 'Unread Emails',
            value: formatNumber(unreadEmails),
            change: 'Live',
            dir: 'neutral',
            color: 'rose',
            icon: 'inbox'
          },
          {
            key: 'openRate',
            label: 'Avg Open Rate',
            value: formatPercent(deliverability.openRate),
            change: `Last ${windowDays} days`,
            dir: 'neutral',
            color: 'emerald',
            icon: 'bar'
          }
        ]);

        setPipelineStages([
          ['New', stageFunnel.New || 0],
          ['Qualified', stageFunnel.Qualified || 0],
          ['Proposal', stageFunnel.Proposal || 0],
          ['Won', stageFunnel.Won || 0],
          ['Lost', stageFunnel.Lost || 0]
        ]);

        const events = eventsData?.events || [];
        setActivities(
          events.map((event) => {
            const eventType = (event.eventType || '').toLowerCase();
            const contact = contactMap.get(event.contactId);
            const label = EVENT_LABELS[eventType] || 'Activity logged';
            const contactLabel = contact?.label || `Contact ${String(event.contactId || '').slice(0, 6)}`;
            return {
              id: event.eventId || `${eventType}-${event.contactId}-${event.occurredAtUtc}`,
              color: EVENT_COLORS[eventType] || 'blue',
              text: `${label} · ${contactLabel}`,
              time: formatRelativeTime(event.occurredAtUtc || event.createdAtUtc)
            };
          })
        );

        const taskRows = tasksData?.tasks || [];
        setTaskTotal(tasksData?.totalCount || taskRows.length);

        const now = Date.now();
        const sortedTasks = [...taskRows].sort((a, b) => {
          const aOverdue = a.dueAtUtc && new Date(a.dueAtUtc).getTime() < now;
          const bOverdue = b.dueAtUtc && new Date(b.dueAtUtc).getTime() < now;
          if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1;
          }

          const aDue = a.dueAtUtc ? new Date(a.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.dueAtUtc ? new Date(b.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
          if (aDue !== bDue) {
            return aDue - bDue;
          }

          return new Date(b.updatedAtUtc).getTime() - new Date(a.updatedAtUtc).getTime();
        });

        setTasks(sortedTasks.slice(0, 12));

        const publishedJourneys = (journeySummary?.journeys || []).filter(
          (journey) => String(journey.status || '').toLowerCase() === 'published'
        );
        const sortedJourneys = [...publishedJourneys].sort(
          (a, b) => (b.activeEnrollments || 0) - (a.activeEnrollments || 0)
        );
        setJourneys(sortedJourneys.slice(0, 4));
      } catch (error) {
        if (error.response?.status === 401) {
          handleUnauthorized(navigate, showFeedback);
          return;
        }
        showFeedback(error.response?.data?.error || 'Failed to load dashboard data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div className="syne" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
              {greeting} — <span className="gradient-text">let’s make moves today.</span>
            </div>
            <div className="helper-text" style={{ marginTop: 4 }}>{today}</div>
          </div>

          <div className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.key} className={`stat-card ${stat.color}`}>
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
              </div>
            ))}
          </div>

          <div className="dash-grid">
            <div className="dash-left">
              <div className="card">
                <div className="card-header">
                <Icon name="zap" size={14} color="var(--purple)" />
                  <span className="card-title">Recent Activity</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{windowLabel}</span>
                </div>
                <div className="card-body">
                  {activities.length === 0 ? (
                    <div className="empty-state" style={{ padding: 16 }}>
                      <p>No activity yet</p>
                      <small>Events will appear once tracked</small>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div className={`activity-dot ${activity.color}`} />
                        <div>
                          <div className="activity-text">{activity.text}</div>
                          <div className="activity-time">{activity.time}</div>
                        </div>
                      </div>
                    ))
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
                  <div style={{ fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
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
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{formatNumber(taskTotal)} open</span>
                </div>
                <div className="card-body">
                  {tasks.length === 0 ? (
                    <div className="empty-state" style={{ padding: 12 }}>
                      <p>No open tasks</p>
                      <small>Create a task from pipeline contacts</small>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 6 }}>
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
                              <div className="task-meta" style={{ color: overdue ? 'var(--rose)' : 'var(--text-3)' }}>
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
                    <div className="empty-state" style={{ padding: 12 }}>
                      <p>No published journeys</p>
                      <small>Create and publish a journey to see it here</small>
                    </div>
                  ) : (
                    journeys.map((journey) => (
                      <div key={journey.journeyId} className="journey-card" style={{ padding: '10px 12px', marginBottom: 6 }}>
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
                    ))
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
