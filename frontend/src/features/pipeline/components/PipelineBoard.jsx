import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { gmailService } from '../../../services/gmailService';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import {
  usePipeline,
  useContactNotes,
  useContactTasks,
  useUpdateContactLeadStage,
  useAddContactNote,
  useCreateContactTask,
  useUpdateContactTask,
} from '../../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { getStageColorVar } from '../../../utils/uiColorMaps';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Drawer from '../../../components/ui/Drawer';

const STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];

const PipelineSkeleton = () => (
  <div className="pipeline-shell">
    <div className="pipeline-shell-main">
      <div className="pipeline-board">
        {STAGES.map((stage) => (
          <div key={stage} className="pipeline-col">
            <div className="pipeline-col-header">
              <div className="skeleton-block" style={{ width: 10, height: 10, borderRadius: '50%' }} />
              <div className="skeleton-block" style={{ width: 80, height: 14, borderRadius: 6 }} />
            </div>
            <div className="pipeline-col-body">
              {[1, 2, 3].map((i) => (
                <div key={i} className="pipeline-card" style={{ padding: 16 }}>
                  <div className="skeleton-block" style={{ width: '60%', height: 14, borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton-block" style={{ width: '40%', height: 12, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const formatDealValue = (contact) => {
  const value = contact?.dealValue || contact?.dealAmount || contact?.estimatedValue;
  if (!value) return '-';
  return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);
};

const getTaskCount = (contact) => contact?.openTasks ?? contact?.taskCount ?? 0;

const ContactCard = React.memo(({ contact, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      className={`contact-card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(contact)}
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
    </button>
  );
});

ContactCard.displayName = 'ContactCard';

const PipelineBoard = () => {
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState({ title: '', dueAtUtc: '', priority: 'Medium', ownerEmail: '' });
  const [pendingStageChange, setPendingStageChange] = useState(null);

  const pipelineParams = useMemo(() => ({
    ownerEmail: ownerFilter || null,
    search: search || null,
    stage: stageFilter || null,
    pageSize: 120,
  }), [ownerFilter, search, stageFilter]);

  const pipelineQuery = usePipeline(pipelineParams);
  const notesQuery = useContactNotes(selectedContact?.contactId);
  const tasksQuery = useContactTasks(selectedContact?.contactId);

  const updateStageMutation = useUpdateContactLeadStage();
  const addNoteMutation = useAddContactNote(selectedContact?.contactId);
  const createTaskMutation = useCreateContactTask(selectedContact?.contactId);
  const updateTaskMutation = useUpdateContactTask(selectedContact?.contactId);

  const columns = pipelineQuery.data?.columns || [];
  const ownerOptions = pipelineQuery.data?.ownerOptions || [];
  const loading = pipelineQuery.isLoading;
  const notes = notesQuery.data?.notes || [];
  const tasks = tasksQuery.data?.tasks || [];

  useEffect(() => {
    setOwnerDraft(selectedContact?.ownerEmail || '');
  }, [selectedContact?.contactId, selectedContact?.ownerEmail]);

  const invalidatePipeline = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pipeline'] });
  }, [queryClient]);

  const handleSelectContact = useCallback((contact) => {
    setSelectedContact(contact);
  }, []);

  const executeStageMove = useCallback(async (contactId, toStage) => {
    try {
      await updateStageMutation.mutateAsync({
        contactId,
        toLeadStage: toStage,
        reason: 'Pipeline board move',
      });
      invalidatePipeline();
      showFeedback('Contact stage updated.', 'success');
      setSelectedContact((prev) => {
        if (!prev || prev.contactId !== contactId) return prev;
        return { ...prev, leadStage: toStage };
      });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update stage.', 'error');
    }
  }, [invalidatePipeline, showFeedback, updateStageMutation]);

  const handleStageMove = useCallback(async (contactId, toStage) => {
    if (toStage === 'Won' || toStage === 'Lost') {
      setPendingStageChange({ contactId, toStage });
      return;
    }
    executeStageMove(contactId, toStage);
  }, [executeStageMove]);

  const handleAssignOwner = useCallback(async () => {
    if (!selectedContact) return;
    if (!ownerDraft.trim()) {
      showFeedback('Owner email is required.', 'warning');
      return;
    }

    try {
      await gmailService.assignContactOwner(selectedContact.contactId, ownerDraft.trim());
      invalidatePipeline();
      showFeedback('Owner assigned.', 'success');
      setSelectedContact((prev) => (prev ? { ...prev, ownerEmail: ownerDraft.trim() } : prev));
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to assign owner.', 'error');
    }
  }, [invalidatePipeline, ownerDraft, selectedContact, showFeedback]);

  const handleAddNote = useCallback(async () => {
    if (!selectedContact || !newNote.trim()) return;

    try {
      await addNoteMutation.mutateAsync(newNote.trim());
      setNewNote('');
      showFeedback('Note added.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add note.', 'error');
    }
  }, [addNoteMutation, newNote, selectedContact, showFeedback]);

  const handleAddTask = useCallback(async () => {
    if (!selectedContact || !newTask.title.trim()) {
      showFeedback('Task title is required.', 'warning');
      return;
    }

    try {
      await createTaskMutation.mutateAsync({
        title: newTask.title.trim(),
        priority: newTask.priority,
        dueAtUtc: newTask.dueAtUtc ? new Date(newTask.dueAtUtc).toISOString() : null,
        ownerEmail: newTask.ownerEmail || selectedContact.ownerEmail || null,
      });
      setNewTask({ title: '', dueAtUtc: '', priority: 'Medium', ownerEmail: '' });
      showFeedback('Task added.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add task.', 'error');
    }
  }, [createTaskMutation, newTask, selectedContact, showFeedback]);

  const handleTaskComplete = useCallback(async (taskId) => {
    if (!selectedContact) return;

    try {
      await updateTaskMutation.mutateAsync({ taskId, patch: { status: 'Completed' } });
      showFeedback('Task marked as completed.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update task.', 'error');
    }
  }, [selectedContact, showFeedback, updateTaskMutation]);

  const stageOptions = useMemo(() => ['All', ...STAGES], []);
  const hasActiveFilters = Boolean(search || ownerFilter || stageFilter);

  return (
    <div className="content fade-in">
      <div className="pipeline-filter-bar">
        <div className="search-box pipeline-search-box">
          <Icon name="search" size={13} color="var(--text-3)" />
          <input
            type="search"
            aria-label="Search pipeline contacts"
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {stageOptions.map((stage) => (
          <button
            type="button"
            key={stage}
            className={`filter-chip ${stageFilter === stage || (stage === 'All' && stageFilter === '') ? 'active' : ''}`}
            onClick={() => setStageFilter(stage === 'All' ? '' : stage)}
          >
            {stage}
          </button>
        ))}

        <select
          className="form-input pipeline-owner-filter"
          aria-label="Filter pipeline by owner"
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
        >
          <option value="">All owners</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="topbar-btn"
            onClick={() => {
              setSearch('');
              setOwnerFilter('');
              setStageFilter('');
            }}
          >
            Clear Filters
          </button>
        )}

        <div className="pipeline-primary-action ml-auto">
          <button className="topbar-btn primary" type="button">Add Contact</button>
        </div>
      </div>

      {loading ? (
        <PipelineSkeleton />
      ) : (
        <div className="pipeline-shell">
          <div className="pipeline-shell-main">
            <div className="pipeline-board">
              {columns.map((column) => (
                <div key={column.stage} className="pipeline-col">
                  <div className="pipeline-col-header">
                    <div className="col-dot" style={{ background: getStageColorVar(column.stage) }} />
                    <div className="col-name">{column.stage}</div>
                    <div className="col-count">{(column.items || []).length}</div>
                  </div>

                  <div className="pipeline-col-body">
                    {(column.items || []).map((contact) => (
                      <ContactCard
                        key={contact.contactId}
                        contact={contact}
                        isSelected={selectedContact?.contactId === contact.contactId}
                        onSelect={handleSelectContact}
                      />
                    ))}

                    {(column.items || []).length === 0 && (
                      <div className="empty-state empty-state-sm">
                        <small>No contacts</small>
                      </div>
                    )}

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
            <Drawer
              open={!!selectedContact}
              onClose={() => setSelectedContact(null)}
              title={selectedContact.firstName || selectedContact.email || 'Contact'}
            >
              <div className="pipeline-contact-header">
                <div className="avatar pipeline-contact-avatar">{(selectedContact.firstName || selectedContact.email || 'A')[0]}</div>
                <div className="pipeline-contact-meta">
                  <div className="pipeline-contact-name">{selectedContact.firstName || selectedContact.email}</div>
                  <div className="pipeline-contact-company">{selectedContact.company || 'No company'}</div>
                </div>
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
                    value={ownerDraft}
                    onChange={(event) => setOwnerDraft(event.target.value)}
                    placeholder="Owner email"
                  />
                  <button type="button" className="topbar-btn" onClick={handleAssignOwner}>Assign</button>
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
              <button type="button" className="topbar-btn pipeline-full-btn pipeline-btn-gap-bottom" onClick={handleAddNote}>Add Note</button>

              <div className="data-list">
                {notes.map((note) => (
                  <div key={note.noteId} className="data-list-item">
                    <span>{note.body}</span>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="empty-state empty-state-sm">
                    <small>No notes yet</small>
                  </div>
                )}
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
              <button type="button" className="topbar-btn pipeline-full-btn pipeline-input-gap" onClick={handleAddTask}>Add Task</button>

              <div className="data-list pipeline-input-gap">
                {tasks.map((task) => (
                  <div key={task.taskId} className="data-list-item pipeline-task-item">
                    <div>
                      <strong>{task.title}</strong>
                      <div className="helper-text">{task.priority} | {task.status}</div>
                    </div>
                    {task.status !== 'Completed' && (
                      <button type="button" className="topbar-btn" onClick={() => handleTaskComplete(task.taskId)}>Complete</button>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="empty-state empty-state-sm">
                    <small>No tasks yet</small>
                  </div>
                )}
              </div>
            </Drawer>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!pendingStageChange}
        title={`Move to ${pendingStageChange?.toStage}?`}
        message={`This will mark the contact as "${pendingStageChange?.toStage}". This is a terminal stage and typically cannot be reversed.`}
        confirmLabel={pendingStageChange?.toStage === 'Won' ? 'Mark as Won' : 'Mark as Lost'}
        cancelLabel="Cancel"
        tone={pendingStageChange?.toStage === 'Lost' ? 'error' : 'warning'}
        onConfirm={() => {
          if (pendingStageChange) {
            executeStageMove(pendingStageChange.contactId, pendingStageChange.toStage);
          }
          setPendingStageChange(null);
        }}
        onCancel={() => setPendingStageChange(null)}
      />
    </div>
  );
};

export default PipelineBoard;
