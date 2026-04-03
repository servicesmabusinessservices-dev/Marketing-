import React, { useState } from 'react';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import { useSuppressions, useAddSuppression, useRemoveSuppression } from '../../../hooks/useApi';
import './SuppressionList.css';

const REASONS = ['Unsubscribed', 'Bounced', 'Complained', 'Manual', 'Other'];

const SuppressionList = () => {
  const { showFeedback } = useFeedback();

  const { data, isLoading, refetch } = useSuppressions();
  const addMutation    = useAddSuppression();
  const removeMutation = useRemoveSuppression();
  const suppressions   = data?.suppressions || [];

  const [form, setForm]               = useState({ email: '', reason: 'Unsubscribed', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) {
      showFeedback('Email is required.', 'warning');
      return;
    }
    try {
      await addMutation.mutateAsync(form);
      setForm({ email: '', reason: 'Unsubscribed', notes: '' });
      showFeedback('Email added to suppression list.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to suppress email.', 'error');
    }
  };

  const handleRemove = async (email) => {
    try {
      await removeMutation.mutateAsync(email);
      showFeedback('Suppression removed.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to remove suppression.', 'error');
    }
  };

  const filtered = suppressions.filter(
    (s) => !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="content fade-in">
      <div className="page-header-row">
        <div className="page-header-copy">
          <div className="page-title-inline">Suppression List</div>
          <div className="helper-text">Manage opted-out and bounced email addresses.</div>
        </div>
        <button type="button" className="topbar-btn" onClick={refetch}>Refresh</button>
      </div>

      <div className="page-grid">
        {/* Add form */}
        <section className="card">
          <div className="card-header">
            <Icon name="shield" size={14} color="var(--rose)" />
            <span className="card-title">Add Suppression</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label" htmlFor="suppression-email-add">Email address</label>
                <input
                  id="suppression-email-add"
                  name="email"
                  className="form-input"
                  type="email"
                  placeholder="contact@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select
                  className="form-input"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                >
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="suppression-notes">Notes (optional)</label>
                <input
                  id="suppression-notes"
                  name="notes"
                  className="form-input"
                  placeholder="Optional notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <button type="submit" className="topbar-btn primary" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding…' : 'Add to Suppression List'}
              </button>
            </form>
          </div>
        </section>

        {/* Suppressions table */}
        <section className="card page-grid-wide">
          <div className="card-header">
            <Icon name="shield" size={14} color="var(--rose)" />
            <span className="card-title">Suppressed Addresses ({filtered.length})</span>
            <input
              id="suppression-search"
              name="search"
              className="form-input inline-search-field"
              type="search"
              aria-label="Search suppressed email addresses"
              placeholder="Search emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="empty-state"><p>Loading…</p></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon="shield" title={searchQuery ? 'No matching addresses.' : 'No suppressed addresses yet.'} size="sm" />
            ) : (
              <div className="sl-table">
                <div className="sl-row sl-header">
                  <span>Email</span>
                  <span>Reason</span>
                  <span>Notes</span>
                  <span>Suppressed At</span>
                  <span></span>
                </div>
                {filtered.map((s) => (
                  <div key={s.email} className="sl-row">
                    <div className="sl-field">
                      <span className="sl-field-label">Email</span>
                      <span className="mono sl-email">{s.email}</span>
                    </div>
                    <div className="sl-field">
                      <span className="sl-field-label">Reason</span>
                      <span className={`sl-reason-badge reason-${(s.reason || 'other').toLowerCase()}`}>
                        {s.reason || 'Other'}
                      </span>
                    </div>
                    <div className="sl-field sl-field-notes">
                      <span className="sl-field-label">Notes</span>
                      <span className="sl-notes">{s.notes || '—'}</span>
                    </div>
                    <div className="sl-field sl-field-date">
                      <span className="sl-field-label">Suppressed At</span>
                      <span className="helper-text sl-date">
                        {s.createdAtUtc ? new Date(s.createdAtUtc).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="sl-field sl-field-action">
                      <span className="sl-field-label">Action</span>
                      <button type="button" className="sl-remove-btn" onClick={() => handleRemove(s.email)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuppressionList;
