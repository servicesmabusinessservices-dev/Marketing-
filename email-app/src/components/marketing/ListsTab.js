import React, { useState } from 'react';
import { gmailService } from '../../services/gmailService';
import { useFeedback } from '../../context/FeedbackContext';
import Icon from '../ui/Icon';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import { useLists } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const ListsTab = () => {
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const listsQuery = useLists();
  const lists = listsQuery.data?.lists || [];

  const [listForm, setListForm] = useState({ name: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);

  const handleCreateList = async (event) => {
    event.preventDefault();
    if (!listForm.name.trim()) { showFeedback('List name is required.', 'warning'); return; }
    try {
      await gmailService.createList(listForm);
      setListForm({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      showFeedback('List created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create list.', 'error');
    }
  };

  const handleDeleteList = async (list) => {
    const id = list.listId || list.ListId;
    const name = list.name || list.Name;
    if (!window.confirm(`Delete list "${name}" and remove all its members?`)) return;
    setDeletingId(id);
    try {
      await gmailService.deleteList(id);
      showFeedback('List deleted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to delete list.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (listsQuery.isLoading) return <LoadingSpinner label="Loading lists..." />;
  if (listsQuery.isError) return (
    <EmptyState icon="!" title="Failed to load lists" action={{ label: 'Retry', onClick: () => listsQuery.refetch() }} />
  );

  return (
    <section className="card" id="marketing-lists">
      <div className="card-header">
        <Icon name="list" size={14} color="var(--blue)" />
        <span className="card-title">Lists ({lists.length})</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleCreateList}>
          <div className="form-group">
            <label className="form-label">List name</label>
            <input className="form-input" placeholder="List name" value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Description" value={listForm.description} onChange={(e) => setListForm({ ...listForm, description: e.target.value })} />
          </div>
          <button type="submit" className="topbar-btn primary">Create List</button>
        </form>

        {lists.length === 0 ? (
          <EmptyState title="No lists yet" subtitle="Create one above." size="sm" />
        ) : (
          <div className="data-list marketing-list-gap">
            {lists.map((list) => {
              const id = list.listId || list.ListId;
              const name = list.name || list.Name;
              const count = list.memberCount ?? 0;
              return (
                <div key={id} className="data-list-item marketing-item-center">
                  <div>
                    <strong>{name}</strong>
                    <div className="marketing-item-subtext">{count} member{count !== 1 ? 's' : ''}</div>
                  </div>
                  <button
                    type="button"
                    className="topbar-btn topbar-btn-danger ml-auto"
                    onClick={() => handleDeleteList(list)}
                    disabled={deletingId === id}
                  >
                    {deletingId === id ? '...' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ListsTab;
