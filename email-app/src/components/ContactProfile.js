import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import {
  useContactById, useContactNotes, useContactTasks, useEvents, useLeadStageHistory,
  useAddContactNote, useCreateContactTask, useUpdateContactTask, useUpdateContactLeadStage
} from '../hooks/useApi';
import './ContactProfile.css';

const STAGE_COLORS = {
  new: 'blue',
  qualified: 'amber',
  proposal: 'purple',
  won: 'emerald',
  lost: 'rose'
};

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
  replied: 'emerald', opened: 'purple', clicked: 'blue',
  delivered: 'blue', bounced: 'rose', unsubscribed: 'rose',
  proposal_sent: 'amber', no_reply_3d: 'amber', new_lead: 'emerald'
};

const LEAD_STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(value);
};

const ContactProfile = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();

  const contactQuery       = useContactById(contactId);
  const notesQuery         = useContactNotes(contactId);
  const tasksQuery         = useContactTasks(contactId);
  const eventsQuery        = useEvents({ contactId, limit: 50 });
  const historyQuery       = useLeadStageHistory(contactId);
  const addNoteMutation    = useAddContactNote(contactId);
  const createTaskMutation = useCreateContactTask(contactId);
  const updateTaskMutation = useUpdateContactTask(contactId);
  const updateStageMutation = useUpdateContactLeadStage();

  const contact      = contactQuery.data ?? null;
  const notes        = notesQuery.data?.notes || [];
  const tasks        = tasksQuery.data?.tasks || [];
  const events       = eventsQuery.data?.events || [];
  const stageHistory = historyQuery.data?.history || [];
  const isLoading    = contactQuery.isLoading;

  const [tab, setTab]             = useState('activity');
  const [noteText, setNoteText]   = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [taskForm, setTaskForm]   = useState({ title: '', priority: 'Medium', dueDate: '' });
  const [addingTask, setAddingTask] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [newStage, setNewStage]   = useState('');
  const [stageReason, setStageReason] = useState('');

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addNoteMutation.mutateAsync(noteText.trim());
      setNoteText('');
      showFeedback('Note added.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add note.', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setAddingTask(true);
    try {
      await createTaskMutation.mutateAsync({
        title:    taskForm.title,
        priority: taskForm.priority,
        dueAtUtc: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null
      });
      setTaskForm({ title: '', priority: 'Medium', dueDate: '' });
      showFeedback('Task created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create task.', 'error');
    } finally {
      setAddingTask(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await updateTaskMutation.mutateAsync({ taskId, patch: { status: 'Completed' } });
      showFeedback('Task completed.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update task.', 'error');
    }
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!newStage) return;
    try {
      await updateStageMutation.mutateAsync({ contactId, toLeadStage: newStage, reason: stageReason || 'Manual update' });
      setEditingStage(false);
      setNewStage('');
      setStageReason('');
      showFeedback('Stage updated.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update stage.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="content fade-in">
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Loading contact...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="content fade-in">
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Contact not found.</p>
        </div>
      </div>
    );
  }

  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email;
  const initials = displayName.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
  const stageKey = (contact.leadStage || '').toLowerCase();
  const stageColor = STAGE_COLORS[stageKey] || 'blue';

  const openTasks = tasks.filter(t => (t.status || '').toLowerCase() !== 'completed').length;

  return (
    <div className="content fade-in">
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <button className="topbar-btn" onClick={() => navigate('/marketing?tab=contacts')}>
          ← Back to Contacts
        </button>
      </div>

      {/* Header card */}
      <div className="cp-header card">
        <div className="cp-avatar-lg">{initials}</div>
        <div className="cp-info">
          <div className="cp-name">{displayName}</div>
          <div className="cp-email">{contact.email}</div>
          {contact.company && <div className="cp-company">{contact.company}</div>}
          <div className="cp-tags-row">
            <span className={`stage-badge stage-${stageColor}`}>{contact.leadStage || 'No Stage'}</span>
            {contact.dealValue > 0 && (
              <span className="cp-deal">£{Number(contact.dealValue).toLocaleString()}</span>
            )}
            {(contact.tags || []).map(tag => (
              <span key={tag} className="cp-tag">{tag}</span>
            ))}
          </div>
        </div>
        <div className="cp-actions">
          {!editingStage ? (
            <button
              className="topbar-btn"
              onClick={() => { setEditingStage(true); setNewStage(contact.leadStage || 'New'); }}
            >
              Change Stage
            </button>
          ) : (
            <form onSubmit={handleUpdateStage} className="cp-stage-form">
              <select
                className="form-input"
                value={newStage}
                onChange={e => setNewStage(e.target.value)}
              >
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                className="form-input"
                placeholder="Reason (optional)"
                value={stageReason}
                onChange={e => setStageReason(e.target.value)}
              />
              <div className="cp-stage-form-row">
                <button type="submit" className="topbar-btn primary">Save</button>
                <button type="button" className="topbar-btn" onClick={() => setEditingStage(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="cp-layout">
        {/* Left: contact details */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Details</span>
            </div>
            <div className="card-body">
              {[
                ['Email', contact.email],
                ['Company', contact.company],
                ['Location', contact.location],
                ['Interest', contact.serviceInterest],
                ['Owner', contact.ownerEmail],
                ['Source', contact.source],
                ['Timezone', contact.timezone],
                ['Added', formatDate(contact.createdAtUtc)],
                ['Updated', formatDate(contact.updatedAtUtc)]
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="cp-detail-row">
                  <span className="cp-detail-lbl">{label}</span>
                  <span className="cp-detail-val">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: tabs */}
        <div>
          <div className="cp-tabs">
            {[
              { id: 'activity', label: `Activity (${events.length})` },
              { id: 'notes',    label: `Notes (${notes.length})` },
              { id: 'tasks',    label: `Tasks (${openTasks} open)` },
              { id: 'history',  label: 'Stage History' }
            ].map(t => (
              <button
                key={t.id}
                className={`cp-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Activity ── */}
          {tab === 'activity' && (
            <div className="card">
              <div className="card-body">
                {events.length === 0 ? (
                  <div className="empty-state" style={{ padding: 16 }}>
                    <p>No activity yet</p>
                    <small>Events appear once tracked via the Marketing module</small>
                  </div>
                ) : (
                  events.map(ev => {
                    const color = EVENT_COLORS[ev.eventType] || 'blue';
                    const label = EVENT_LABELS[ev.eventType] || ev.eventType;
                    return (
                      <div key={ev.eventId} className="activity-item">
                        <div className={`activity-dot ${color}`} />
                        <div>
                          <div className="activity-text">{label}</div>
                          <div className="activity-time">{formatRelativeTime(ev.occurredAtUtc || ev.createdAtUtc)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {tab === 'notes' && (
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleAddNote} className="cp-note-form">
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Write a note..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="topbar-btn primary"
                    disabled={addingNote || !noteText.trim()}
                  >
                    {addingNote ? 'Adding…' : 'Add Note'}
                  </button>
                </form>
                <div className="cp-notes-list">
                  {notes.length === 0 ? (
                    <div className="empty-state" style={{ padding: 12 }}>
                      <p>No notes yet</p>
                    </div>
                  ) : (
                    notes.map(note => (
                      <div key={note.noteId} className="cp-note">
                        <div className="cp-note-body">{note.body}</div>
                        <div className="cp-note-date">{formatRelativeTime(note.createdAtUtc)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tasks ── */}
          {tab === 'tasks' && (
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleAddTask} className="cp-task-form">
                  <input
                    className="form-input"
                    placeholder="Task title"
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  />
                  <div className="cp-task-row">
                    <select
                      className="form-input"
                      style={{ flex: '0 0 auto' }}
                      value={taskForm.priority}
                      onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                    <input
                      type="date"
                      className="form-input"
                      style={{ flex: '1 1 auto' }}
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                    />
                    <button
                      type="submit"
                      className="topbar-btn primary"
                      disabled={addingTask || !taskForm.title.trim()}
                    >
                      {addingTask ? 'Adding…' : 'Add Task'}
                    </button>
                  </div>
                </form>
                <div>
                  {tasks.length === 0 ? (
                    <div className="empty-state" style={{ padding: 12 }}>
                      <p>No tasks yet</p>
                    </div>
                  ) : (
                    tasks.map(task => {
                      const done = (task.status || '').toLowerCase() === 'completed';
                      const overdue = task.dueAtUtc && new Date(task.dueAtUtc) < new Date() && !done;
                      return (
                        <div key={task.taskId} className="task-item">
                          <div
                            className={`task-check ${done ? 'done' : ''}`}
                            onClick={() => !done && handleCompleteTask(task.taskId)}
                          >
                            {done && <Icon name="check" size={10} color="#fff" />}
                          </div>
                          <div className="task-info">
                            <div className={`task-name ${done ? 'done' : ''}`}>{task.title}</div>
                            <div
                              className="task-meta"
                              style={{ color: overdue ? 'var(--rose)' : 'var(--text-3)' }}
                            >
                              {task.dueAtUtc
                                ? `Due ${formatDate(task.dueAtUtc)}${overdue ? ' · Overdue' : ''}`
                                : 'No due date'}
                            </div>
                          </div>
                          <span className={`priority-badge ${(task.priority || 'medium').toLowerCase()}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Stage History ── */}
          {tab === 'history' && (
            <div className="card">
              <div className="card-body">
                {stageHistory.length === 0 ? (
                  <div className="empty-state" style={{ padding: 16 }}>
                    <p>No stage history yet</p>
                    <small>Stage changes will appear here</small>
                  </div>
                ) : (
                  <div className="cp-history">
                    {stageHistory.map((entry, i) => {
                      const fromColor = STAGE_COLORS[(entry.fromLeadStage || '').toLowerCase()] || 'blue';
                      const toColor   = STAGE_COLORS[(entry.toLeadStage  || '').toLowerCase()] || 'blue';
                      return (
                        <div key={i} className="cp-history-item">
                          <div className="cp-history-dot" />
                          <div className="cp-history-content">
                            <div className="cp-history-stages">
                              {entry.fromLeadStage && (
                                <>
                                  <span className={`stage-badge stage-${fromColor}`}>{entry.fromLeadStage}</span>
                                  <span className="cp-history-arrow">→</span>
                                </>
                              )}
                              <span className={`stage-badge stage-${toColor}`}>{entry.toLeadStage}</span>
                            </div>
                            {entry.reason && <div className="cp-history-reason">{entry.reason}</div>}
                            <div className="cp-history-date">{formatRelativeTime(entry.changedAtUtc)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactProfile;
