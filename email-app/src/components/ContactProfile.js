import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import {
  useContactById,
  useContactNotes,
  useContactTasks,
  useEvents,
  useLeadStageHistory,
  useAddContactNote,
  useCreateContactTask,
  useUpdateContactTask,
  useUpdateContactLeadStage,
} from '../hooks/useApi';
import './ContactProfile.css';
import { getEventTone, getStageTone, ON_SOLID_ICON_COLOR } from '../utils/uiColorMaps';

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

const LEAD_STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

const ActivityTab = React.memo(({ events }) => {
  if (!events.length) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state empty-state-sm">
            <p>No activity yet</p>
            <small>Events appear once tracked via the Marketing module</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="cp-activity-list">
          {events.map((event) => {
            const eventType = String(event.eventType || '').toLowerCase();
            const color = getEventTone(eventType);
            const label = EVENT_LABELS[eventType] || event.eventType;
            return (
              <div key={event.eventId} className="activity-item">
                <div className={`activity-dot ${color}`} />
                <div>
                  <div className="activity-text">{label}</div>
                  <div className="activity-time">{formatRelativeTime(event.occurredAtUtc || event.createdAtUtc)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ActivityTab.displayName = 'ActivityTab';

const NotesTab = React.memo(({ notes, noteText, setNoteText, addingNote, onAddNote }) => (
  <div className="card">
    <div className="card-body">
      <form onSubmit={onAddNote} className="cp-note-form">
        <textarea
          className="form-input"
          rows={3}
          placeholder="Write a note..."
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
        />
        <button
          type="submit"
          className="topbar-btn primary"
          disabled={addingNote || !noteText.trim()}
        >
          {addingNote ? 'Adding...' : 'Add Note'}
        </button>
      </form>

      <div className="cp-notes-list">
        {notes.length === 0 ? (
          <div className="empty-state empty-state-sm">
            <p>No notes yet</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.noteId} className="cp-note">
              <div className="cp-note-body">{note.body}</div>
              <div className="cp-note-date">{formatRelativeTime(note.createdAtUtc)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
));

NotesTab.displayName = 'NotesTab';

const TasksTab = React.memo(({ tasks, taskForm, setTaskForm, addingTask, onAddTask, onCompleteTask }) => (
  <div className="card">
    <div className="card-body">
      <form onSubmit={onAddTask} className="cp-task-form">
        <input
          className="form-input"
          placeholder="Task title"
          value={taskForm.title}
          onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <div className="cp-task-row">
          <select
            className="form-input cp-task-priority"
            value={taskForm.priority}
            onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
          <input
            type="date"
            className="form-input cp-task-date"
            value={taskForm.dueDate}
            onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
          <button
            type="submit"
            className="topbar-btn primary"
            disabled={addingTask || !taskForm.title.trim()}
          >
            {addingTask ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>

      <div className="cp-task-list">
        {tasks.length === 0 ? (
          <div className="empty-state empty-state-sm">
            <p>No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => {
            const done = String(task.status || '').toLowerCase() === 'completed';
            const overdue = task.dueAtUtc && new Date(task.dueAtUtc) < new Date() && !done;
            return (
              <div key={task.taskId} className="task-item">
                <button
                  type="button"
                  className={`task-check ${done ? 'done' : ''}`}
                  onClick={() => !done && onCompleteTask(task.taskId)}
                >
                  {done && <Icon name="check" size={10} color={ON_SOLID_ICON_COLOR} />}
                </button>
                <div className="task-info">
                  <div className={`task-name ${done ? 'done' : ''}`}>{task.title}</div>
                  <div className={`task-meta ${overdue ? 'overdue' : ''}`}>
                    {task.dueAtUtc
                      ? `Due ${formatDate(task.dueAtUtc)}${overdue ? ' - Overdue' : ''}`
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
));

TasksTab.displayName = 'TasksTab';

const HistoryTab = React.memo(({ stageHistory }) => {
  if (!stageHistory.length) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state empty-state-sm">
            <p>No stage history yet</p>
            <small>Stage changes will appear here</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="cp-history">
          {stageHistory.map((entry, index) => {
            const fromColor = getStageTone(entry.fromLeadStage);
            const toColor = getStageTone(entry.toLeadStage);
            return (
              <div key={`${entry.changedAtUtc || index}`} className="cp-history-item">
                <div className="cp-history-dot" />
                <div className="cp-history-content">
                  <div className="cp-history-stages">
                    {entry.fromLeadStage && (
                      <>
                        <span className={`stage-badge stage-${fromColor}`}>{entry.fromLeadStage}</span>
                        <span className="cp-history-arrow">{'->'}</span>
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
      </div>
    </div>
  );
});

HistoryTab.displayName = 'HistoryTab';

const ContactProfile = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();

  const contactQuery = useContactById(contactId);
  const notesQuery = useContactNotes(contactId);
  const tasksQuery = useContactTasks(contactId);
  const eventsQuery = useEvents({ contactId, limit: 50 });
  const historyQuery = useLeadStageHistory(contactId);
  const addNoteMutation = useAddContactNote(contactId);
  const createTaskMutation = useCreateContactTask(contactId);
  const updateTaskMutation = useUpdateContactTask(contactId);
  const updateStageMutation = useUpdateContactLeadStage();

  const contact = contactQuery.data ?? null;
  const isLoading = contactQuery.isLoading;

  const notes = useMemo(() => {
    const rows = notesQuery.data?.notes || [];
    return [...rows].sort((a, b) => new Date(b.createdAtUtc) - new Date(a.createdAtUtc));
  }, [notesQuery.data]);

  const tasks = useMemo(() => {
    const rows = tasksQuery.data?.tasks || [];
    return [...rows].sort((a, b) => {
      const aDone = String(a.status || '').toLowerCase() === 'completed';
      const bDone = String(b.status || '').toLowerCase() === 'completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aDue = a.dueAtUtc ? new Date(a.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueAtUtc ? new Date(b.dueAtUtc).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
  }, [tasksQuery.data]);

  const events = useMemo(() => {
    const rows = eventsQuery.data?.events || [];
    return [...rows].sort(
      (a, b) => new Date(b.occurredAtUtc || b.createdAtUtc) - new Date(a.occurredAtUtc || a.createdAtUtc)
    );
  }, [eventsQuery.data]);

  const stageHistory = useMemo(() => {
    const rows = historyQuery.data?.history || [];
    return [...rows].sort((a, b) => new Date(b.changedAtUtc) - new Date(a.changedAtUtc));
  }, [historyQuery.data]);

  const [tab, setTab] = useState('activity');
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'Medium', dueDate: '' });
  const [addingTask, setAddingTask] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [stageReason, setStageReason] = useState('');

  const handleAddNote = useCallback(async (event) => {
    event.preventDefault();
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
  }, [addNoteMutation, noteText, showFeedback]);

  const handleAddTask = useCallback(async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    setAddingTask(true);
    try {
      await createTaskMutation.mutateAsync({
        title: taskForm.title,
        priority: taskForm.priority,
        dueAtUtc: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
      });
      setTaskForm({ title: '', priority: 'Medium', dueDate: '' });
      showFeedback('Task created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create task.', 'error');
    } finally {
      setAddingTask(false);
    }
  }, [createTaskMutation, showFeedback, taskForm]);

  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await updateTaskMutation.mutateAsync({ taskId, patch: { status: 'Completed' } });
      showFeedback('Task completed.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update task.', 'error');
    }
  }, [showFeedback, updateTaskMutation]);

  const handleUpdateStage = useCallback(async (event) => {
    event.preventDefault();
    if (!newStage) return;
    try {
      await updateStageMutation.mutateAsync({
        contactId,
        toLeadStage: newStage,
        reason: stageReason || 'Manual update',
      });
      setEditingStage(false);
      setNewStage('');
      setStageReason('');
      showFeedback('Stage updated.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update stage.', 'error');
    }
  }, [contactId, newStage, showFeedback, stageReason, updateStageMutation]);

  if (isLoading) {
    return (
      <div className="content fade-in">
        <div className="empty-state empty-state-top">
          <p>Loading contact...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="content fade-in">
        <div className="empty-state empty-state-top">
          <p>Contact not found.</p>
        </div>
      </div>
    );
  }

  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email;
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const stageKey = (contact.leadStage || '').toLowerCase();
  const stageColor = getStageTone(stageKey);
  const openTasks = tasks.filter((task) => String(task.status || '').toLowerCase() !== 'completed').length;

  const tabItems = [
    { id: 'activity', label: `Activity (${events.length})` },
    { id: 'notes', label: `Notes (${notes.length})` },
    { id: 'tasks', label: `Tasks (${openTasks} open)` },
    { id: 'history', label: 'Stage History' },
  ];

  return (
    <div className="content fade-in">
      <div className="cp-back-row">
        <button type="button" className="topbar-btn" onClick={() => navigate('/marketing?tab=contacts')}>
          {'<-'} Back to Contacts
        </button>
      </div>

      <div className="cp-header card">
        <div className="cp-avatar-lg">{initials}</div>
        <div className="cp-info">
          <div className="cp-name">{displayName}</div>
          <div className="cp-email">{contact.email}</div>
          {contact.company && <div className="cp-company">{contact.company}</div>}
          <div className="cp-tags-row">
            <span className={`stage-badge stage-${stageColor}`}>{contact.leadStage || 'No Stage'}</span>
            {contact.dealValue > 0 && (
              <span className="cp-deal">GBP {Number(contact.dealValue).toLocaleString()}</span>
            )}
            {(contact.tags || []).map((tag) => (
              <span key={tag} className="cp-tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="cp-actions">
          {!editingStage ? (
            <button
              type="button"
              className="topbar-btn"
              onClick={() => {
                setEditingStage(true);
                setNewStage(contact.leadStage || 'New');
              }}
            >
              Change Stage
            </button>
          ) : (
            <form onSubmit={handleUpdateStage} className="cp-stage-form">
              <select className="form-input" value={newStage} onChange={(event) => setNewStage(event.target.value)}>
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <input
                className="form-input"
                placeholder="Reason (optional)"
                value={stageReason}
                onChange={(event) => setStageReason(event.target.value)}
              />
              <div className="cp-stage-form-row">
                <button type="submit" className="topbar-btn primary">Save</button>
                <button type="button" className="topbar-btn" onClick={() => setEditingStage(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="cp-layout">
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
                ['Updated', formatDate(contact.updatedAtUtc)],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label} className="cp-detail-row">
                  <span className="cp-detail-lbl">{label}</span>
                  <span className="cp-detail-val">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="cp-tabs">
            {tabItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`cp-tab ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'activity' && <ActivityTab events={events} />}
          {tab === 'notes' && (
            <NotesTab
              notes={notes}
              noteText={noteText}
              setNoteText={setNoteText}
              addingNote={addingNote}
              onAddNote={handleAddNote}
            />
          )}
          {tab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              addingTask={addingTask}
              onAddTask={handleAddTask}
              onCompleteTask={handleCompleteTask}
            />
          )}
          {tab === 'history' && <HistoryTab stageHistory={stageHistory} />}
        </div>
      </div>
    </div>
  );
};

export default ContactProfile;
