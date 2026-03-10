import React, { useMemo, useState } from 'react';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import { usePipeline, useContactNotes, useContactTasks } from '../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];

const PipelineBoard = () => {
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const [search, setSearch]           = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [newNote, setNewNote]         = useState('');
  const [newTask, setNewTask]         = useState({ title: '', dueAtUtc: '', priority: 'Medium', ownerEmail: '' });
  const [ownerDrafts, setOwnerDrafts] = useState({});

  const pipelineQuery = usePipeline({
    ownerEmail: ownerFilter || null,
    search:     search     || null,
    stage:      stageFilter|| null,
    pageSize:   120
  });
  const notesQuery = useContactNotes(selectedContact?.contactId);
  const tasksQuery = useContactTasks(selectedContact?.contactId);

  const columns      = pipelineQuery.data?.columns      || [];
  const ownerOptions = pipelineQuery.data?.ownerOptions || [];
  const loading      = pipelineQuery.isLoading;
  const notes        = notesQuery.data?.notes || [];
  const tasks        = tasksQuery.data?.tasks || [];

  const invalidatePipeline = () => queryClient.invalidateQueries({ queryKey: ['pipeline'] });

  const handleStageMove = async (contactId, toStage) => {
    try {
      await gmailService.updateContactLeadStage(contactId, toStage, 'Pipeline board move');
      invalidatePipeline();
      showFeedback('Contact stage updated.', 'success');
      if (selectedContact?.contactId === contactId) {
        setSelectedContact({ ...selectedContact, leadStage: toStage });
      }
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update stage.', 'error');
    }
  };

  const handleAssignOwner = async (contact) => {
    const ownerEmail = ownerDrafts[contact.contactId] || contact.ownerEmail || '';
    if (!ownerEmail.trim()) {
      showFeedback('Owner email is required.', 'warning');
      return;
    }

    try {
      await gmailService.assignContactOwner(contact.contactId, ownerEmail.trim());
      invalidatePipeline();
      showFeedback('Owner assigned.', 'success');
      if (selectedContact?.contactId === contact.contactId) {
        setSelectedContact({ ...selectedContact, ownerEmail: ownerEmail.trim() });
      }
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to assign owner.', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!selectedContact || !newNote.trim()) {
      return;
    }

    try {
      await gmailService.addContactNote(selectedContact.contactId, newNote.trim());
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['contactNotes', selectedContact.contactId] });
      showFeedback('Note added.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add note.', 'error');
    }
  };

  const handleAddTask = async () => {
    if (!selectedContact || !newTask.title.trim()) {
      showFeedback('Task title is required.', 'warning');
      return;
    }

    try {
      await gmailService.createContactTask(selectedContact.contactId, {
        title: newTask.title.trim(),
        priority: newTask.priority,
        dueAtUtc: newTask.dueAtUtc ? new Date(newTask.dueAtUtc).toISOString() : null,
        ownerEmail: newTask.ownerEmail || selectedContact.ownerEmail || null
      });
      setNewTask({ title: '', dueAtUtc: '', priority: 'Medium', ownerEmail: '' });
      queryClient.invalidateQueries({ queryKey: ['contactTasks', selectedContact.contactId] });
      showFeedback('Task added.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add task.', 'error');
    }
  };

  const handleTaskComplete = async (task) => {
    if (!selectedContact) {
      return;
    }

    try {
      await gmailService.updateContactTask(selectedContact.contactId, task.taskId, { status: 'Completed' });
      queryClient.invalidateQueries({ queryKey: ['contactTasks', selectedContact.contactId] });
      showFeedback('Task marked as completed.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update task.', 'error');
    }
  };

  const stageOptions = useMemo(() => ['All', ...STAGES], []);
  const stageColors = {
    New: '#60a5fa',
    Qualified: '#f59e0b',
    Proposal: '#8b5cf6',
    Won: '#10b981',
    Lost: '#f43f5e'
  };

  const formatDealValue = (contact) => {
    const value = contact?.dealValue || contact?.dealAmount || contact?.estimatedValue;
    if (!value) {
      return '-';
    }
    return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);
  };

  const getTaskCount = (contact) => {
    return contact?.openTasks ?? contact?.taskCount ?? 0;
  };

  return (
    <div className="content fade-in">
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="search-box" style={{ width: 220 }}>
          <Icon name="search" size={13} color="var(--text-3)" />
          <input
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {stageOptions.map((stage) => (
          <div
            key={stage}
            className={`filter-chip ${stageFilter === stage || (stage === 'All' && stageFilter === '') ? 'active' : ''}`}
            onClick={() => setStageFilter(stage === 'All' ? '' : stage)}
          >
            {stage}
          </div>
        ))}
        <select className="form-input" style={{ maxWidth: 220 }} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
          <option value="">All owners</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <button className="topbar-btn" onClick={() => pipelineQuery.refetch()}>Apply Filters</button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="topbar-btn primary" type="button">Add Contact</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Loading pipeline...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', overflow: 'hidden', gap: 0, marginTop: 12 }}>
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <div className="pipeline-board">
              {(columns || []).map((column) => (
                <div key={column.stage} className="pipeline-col">
                  <div className="pipeline-col-header">
                    <div className="col-dot" style={{ background: stageColors[column.stage] || 'var(--text-3)' }} />
                    <div className="col-name">{column.stage}</div>
                    <div className="col-count">{(column.items || []).length}</div>
                  </div>
                  <div className="pipeline-col-body">
                    {(column.items || []).map((contact) => (
                      <div
                        key={contact.contactId}
                        className={`contact-card ${selectedContact?.contactId === contact.contactId ? 'selected' : ''}`}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div className="contact-name">{contact.firstName || contact.email}</div>
                        <div className="contact-company">{contact.company || 'No company'}</div>
                        <div className="contact-card-footer">
                          <div className="deal-value">{formatDealValue(contact)}</div>
                          <div className="task-count">
                            <Icon name="check" size={11} color="var(--text-3)" />
                            {getTaskCount(contact)} tasks
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '8px 4px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="plus" size={12} color="var(--text-3)" /> Add
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedContact && (
            <div style={{ width: 300, borderLeft: '1px solid var(--border)', background: 'var(--navy-2)', overflow: 'auto', padding: 20, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 15 }}>{(selectedContact.firstName || selectedContact.email || 'A')[0]}</div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                    {selectedContact.firstName || selectedContact.email}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selectedContact.company || 'No company'}</div>
                </div>
                <div style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18 }} onClick={() => setSelectedContact(null)}>x</div>
              </div>
              <div style={{ background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-3)' }}>Deal Value</span>
                  <span style={{ color: 'var(--emerald)', fontFamily: 'DM Mono', fontWeight: 600 }}>{formatDealValue(selectedContact)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>Open Tasks</span>
                  <span style={{ color: 'var(--text-1)', fontFamily: 'DM Mono' }}>{getTaskCount(selectedContact)}</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Stage</label>
                <select
                  className="form-input"
                  value={selectedContact.leadStage || 'New'}
                  onChange={(event) => handleStageMove(selectedContact.contactId, event.target.value)}
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
                <label className="form-label" style={{ marginTop: 12 }}>Owner</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={ownerDrafts[selectedContact.contactId] ?? selectedContact.ownerEmail ?? ''}
                    onChange={(event) => setOwnerDrafts((prev) => ({ ...prev, [selectedContact.contactId]: event.target.value }))}
                    placeholder="Owner email"
                  />
                  <button type="button" className="topbar-btn" onClick={() => handleAssignOwner(selectedContact)}>Assign</button>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Notes</div>
              <textarea
                className="form-input"
                placeholder="Add a note"
                style={{ height: 72, marginBottom: 8 }}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
              />
              <button className="topbar-btn" style={{ justifyContent: 'center', width: '100%', marginBottom: 16 }} onClick={handleAddNote}>Add Note</button>
              <div className="data-list">
                {notes.map((note) => (
                  <div key={note.noteId} className="data-list-item">
                    <span>{note.body}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>Tasks</div>
              <input
                className="form-input"
                value={newTask.title}
                onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Task title"
              />
              <select
                className="form-input"
                style={{ marginTop: 8 }}
                value={newTask.priority}
                onChange={(event) => setNewTask((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <input
                className="form-input"
                style={{ marginTop: 8 }}
                type="datetime-local"
                value={newTask.dueAtUtc}
                onChange={(event) => setNewTask((prev) => ({ ...prev, dueAtUtc: event.target.value }))}
              />
              <input
                className="form-input"
                style={{ marginTop: 8 }}
                value={newTask.ownerEmail}
                onChange={(event) => setNewTask((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                placeholder="Task owner email"
              />
              <button className="topbar-btn" style={{ justifyContent: 'center', width: '100%', marginTop: 10 }} onClick={handleAddTask}>Add Task</button>

              <div className="data-list" style={{ marginTop: 10 }}>
                {tasks.map((task) => (
                  <div key={task.taskId} className="data-list-item" style={{ alignItems: 'center' }}>
                    <div>
                      <strong>{task.title}</strong>
                      <div className="helper-text">{task.priority} | {task.status}</div>
                    </div>
                    {task.status !== 'Completed' && (
                      <button className="topbar-btn" onClick={() => handleTaskComplete(task)}>Complete</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
