import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';
import './SuppressionList.css';

const REASONS = ['Unsubscribed', 'Bounced', 'Complained', 'Manual', 'Other'];

const SuppressionList = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();

  const [suppressions, setSuppressions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [form, setForm]                 = useState({ email: '', reason: 'Unsubscribed', notes: '' });
  const [submitting, setSubmitting]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');

  const loadSuppressions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gmailService.getSuppressions();
      setSuppressions(data.suppressions || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to load suppressions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showFeedback]);

  useEffect(() => { loadSuppressions(); }, [loadSuppressions]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.email.trim()) {
      showFeedback('Email is required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await gmailService.addSuppression(form);
      setForm({ email: '', reason: 'Unsubscribed', notes: '' });
      loadSuppressions();
      showFeedback('Email added to suppression list.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to suppress email.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (email) => {
    try {
      await gmailService.removeSuppression(email);
      loadSuppressions();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="syne" style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-1)' }}>Suppression List</div>
          <div className="helper-text">Manage opted-out and bounced email addresses.</div>
        </div>
        <button className="topbar-btn" onClick={loadSuppressions}>Refresh</button>
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
                <label className="form-label">Email address</label>
                <input
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
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  placeholder="Optional notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <button type="submit" className="topbar-btn primary" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to Suppression List'}
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
              className="form-input"
              style={{ marginLeft: 'auto', maxWidth: 220 }}
              placeholder="Search emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="card-body">
            {loading ? (
              <div className="empty-state"><p>Loading…</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <p>{searchQuery ? 'No matching addresses.' : 'No suppressed addresses yet.'}</p>
              </div>
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
                    <span className="mono sl-email">{s.email}</span>
                    <span className={`sl-reason-badge reason-${(s.reason || 'other').toLowerCase()}`}>
                      {s.reason || 'Other'}
                    </span>
                    <span className="sl-notes">{s.notes || '—'}</span>
                    <span className="helper-text sl-date">
                      {s.createdAtUtc ? new Date(s.createdAtUtc).toLocaleDateString() : '—'}
                    </span>
                    <button className="sl-remove-btn" onClick={() => handleRemove(s.email)}>
                      Remove
                    </button>
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
