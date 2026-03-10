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
      <div className="pipeline-filter-bar">
        <div className="search-box pipeline-search-box">
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
        <select className="form-input pipeline-owner-filter" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
          <option value="">All owners</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <button className="topbar-btn" onClick={() => pipelineQuery.refetch()}>Apply Filters</button>
        <div className="ml-auto">
          <button className="topbar-btn primary" type="button">Add Contact</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state empty-state-top">
          <p>Loading pipeline...</p>
        </div>
      ) : (
        <div className="pipeline-shell">
          <div className="pipeline-shell-main">
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
                    <div className="pipeline-add-row">
                      <div className="pipeline-add-action">
                        <Icon name="plus" size={12} color="var(--text-3)" /> Add
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedContact && (
            <div className="pipeline-shell-sidepanel">
              <div className="pipeline-contact-header">
                <div className="avatar pipeline-contact-avatar">{(selectedContact.firstName || selectedContact.email || 'A')[0]}</div>
                <div className="pipeline-contact-meta">
                  <div className="pipeline-contact-name">
                    {selectedContact.firstName || selectedContact.email}
                  </div>
                  <div className="pipeline-contact-company">{selectedContact.company || 'No company'}</div>
                </div>
                <button type="button" className="pipeline-close-btn ml-auto" onClick={() => setSelectedContact(null)}>x</button>
              </div>
              <div className="pipeline-summary-card">
                <div className="pipeline-summary-row pipeline-summary-row-gap">
                  <span className="pipeline-summary-label">Deal Value</span>
                  <span className="pipeline-summary-value pipeline-summary-value-positive">{formatDealValue(selectedContact)}</span>
                </div>
                <div className="pipeline-summary-row">
                  <span className="pipeline-summary-label">Open Tasks</span>
                  <span className="pipeline-summary-value">{getTaskCount(selectedContact)}</span>
                </div>
              </div>

              <div className="pipeline-section-gap">
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
                <label className="form-label form-label-offset">Owner</label>
                <div className="inline-actions">
                  <input
                    className="form-input"
                    value={ownerDrafts[selectedContact.contactId] ?? selectedContact.ownerEmail ?? ''}
                    onChange={(event) => setOwnerDrafts((prev) => ({ ...prev, [selectedContact.contactId]: event.target.value }))}
                    placeholder="Owner email"
                  />
                  <button type="button" className="topbar-btn" onClick={() => handleAssignOwner(selectedContact)}>Assign</button>
                </div>
              </div>

              <div className="pipeline-section-title">Notes</div>
              <textarea
                className="form-input"
                placeholder="Add a note"
                rows={3}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
              />
              <button className="topbar-btn pipeline-full-btn pipeline-btn-gap-bottom" onClick={handleAddNote}>Add Note</button>
              <div className="data-list">
                {notes.map((note) => (
                  <div key={note.noteId} className="data-list-item">
                    <span>{note.body}</span>
                  </div>
                ))}
              </div>

              <div className="pipeline-section-title pipeline-section-title-gap">Tasks</div>
              <input
                className="form-input"
                value={newTask.title}
                onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Task title"
              />
              <select
                className="form-input"
                value={newTask.priority}
                onChange={(event) => setNewTask((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <input
                className="form-input pipeline-input-gap"
                type="datetime-local"
                value={newTask.dueAtUtc}
                onChange={(event) => setNewTask((prev) => ({ ...prev, dueAtUtc: event.target.value }))}
              />
              <input
                className="form-input pipeline-input-gap"
                value={newTask.ownerEmail}
                onChange={(event) => setNewTask((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                placeholder="Task owner email"
              />
              <button className="topbar-btn pipeline-full-btn pipeline-input-gap" onClick={handleAddTask}>Add Task</button>

              <div className="data-list pipeline-input-gap">
                {tasks.map((task) => (
                  <div key={task.taskId} className="data-list-item pipeline-task-item">
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
