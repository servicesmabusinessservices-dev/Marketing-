import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';

const BulkEmail = ({ onClose, mode = 'modal' }) => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const isPageMode = mode === 'page';

  const [recipientTags, setRecipientTags] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [isScheduling, setIsScheduling] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [suppressionSummary, setSuppressionSummary] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingFromList, setLoadingFromList] = useState(false);

  const searchContacts = async (q) => {
    if (!q.trim()) { setContactResults([]); return; }
    setLoadingContacts(true);
    try {
      const data = await gmailService.getContacts({ q, limit: 50 });
      setContactResults(data.contacts || data.items || data || []);
    } catch {
      setContactResults([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleContact = (email) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const addEmailTag = (raw) => {
    const val = raw.trim().toLowerCase();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
    setRecipientTags(prev => prev.includes(val) ? prev : [...prev, val]);
    setEmailInput('');
  };

  const removeEmailTag = (email) => setRecipientTags(prev => prev.filter(e => e !== email));

  const handleEmailInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmailTag(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && recipientTags.length) {
      setRecipientTags(prev => prev.slice(0, -1));
    }
  };

  const addSelectedToList = () => {
    if (!selectedContacts.size) return;
    setRecipientTags(prev => [...new Set([...prev, ...selectedContacts])]);
    setSelectedContacts(new Set());
    setContactResults([]);
    setContactSearch('');
    showFeedback(`${selectedContacts.size} contact(s) added to recipient list.`, 'success');
  };

  useEffect(() => {
    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [suppressionData, tokenData, listsData, templatesData] = await Promise.all([
          gmailService.getSuppressionSummary(),
          gmailService.getTokens(),
          gmailService.getLists(),
          gmailService.getTemplates()
        ]);
        setSuppressionSummary(suppressionData);
        setTokens(tokenData.tokens || []);
        setLists(listsData.lists || []);
        setTemplates(templatesData.templates || []);
      } catch (error) {
        if (error.response?.status === 401) {
          handleUnauthorized(navigate, showFeedback);
          return;
        }
        showFeedback(error.response?.data?.error || 'Failed to load suppression data.', 'error');
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [navigate, showFeedback]);

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    navigate('/emails');
  };

  const handleSchedule = async () => {
    const emailList = recipientTags;

    if (!emailList.length || !subject || !content) {
      showFeedback('Please fill all fields and add at least one email.', 'warning');
      return;
    }

    setIsScheduling(true);
    setJobStatus('Queued');
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setTotalCount(emailList.length);

    try {
      const job = await gmailService.sendBulkEmail(emailList, subject, content, delaySeconds);
      const jobId = job.jobId;

      for (let attempt = 0; attempt < 600; attempt++) {
        const status = await gmailService.getBulkEmailStatus(jobId);
        const statusText = status.status?.toString() ?? 'Queued';

        setJobStatus(statusText);
        setProcessedCount(status.processedCount || 0);
        setSuccessCount(status.successCount || 0);
        setFailureCount(status.failureCount || 0);
        setTotalCount(status.totalRecipients || emailList.length);

        if (statusText === 'Completed' || statusText === 'Failed') {
          setIsScheduling(false);
          showFeedback(
            `Bulk email finished. Success: ${status.successCount || 0}, Failed: ${status.failureCount || 0}.`,
            statusText === 'Completed' ? 'success' : 'warning'
          );
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setIsScheduling(false);
      showFeedback('Bulk job is still running. Check status again shortly.', 'info');
    } catch (error) {
      console.error('Bulk email job failed:', error);
      setIsScheduling(false);
      showFeedback(error.response?.data?.error || 'Failed to schedule bulk email.', 'error');
    }
  };

  const progress = totalCount ? Math.round((processedCount / totalCount) * 100) : 0;
  const progressLabel = jobStatus ? `${progress}%` : '0%';
  const suppressionTotal = suppressionSummary?.total ?? 0;
  const suppressionBreakdown = suppressionSummary?.byReason?.length
    ? suppressionSummary.byReason.map((item) => `${item.reason}: ${item.count}`).join(' | ')
    : 'No suppressions yet.';

  const loadFromList = async (listId) => {
    if (!listId) return;
    setLoadingFromList(true);
    try {
      const data = await gmailService.getListContacts(listId);
      const emails = (data.contacts || []).map(c => (c.email || c.Email || '').toLowerCase()).filter(e => e.includes('@'));
      if (!emails.length) { showFeedback('This list has no contacts yet.', 'warning'); return; }
      setRecipientTags(prev => [...new Set([...prev, ...emails])]);
      showFeedback(`Loaded ${emails.length} contacts from list.`, 'success');
    } catch {
      showFeedback('Failed to load contacts from list.', 'error');
    } finally {
      setLoadingFromList(false);
    }
  };

  const loadTemplate = (templateId) => {
    const tpl = templates.find(t => t.templateId === templateId);
    if (!tpl) return;
    if (tpl.subject) setSubject(tpl.subject);
    if (tpl.bodyHtml) setContent(tpl.bodyHtml);
    showFeedback(`Template "${tpl.name}" loaded.`, 'success');
  };
  const tokenList = tokens.map((token) => `{{${token}}}`);

  const bulkContent = (
    <div className={isPageMode ? 'content fade-in' : 'fade-in'}>
      <div className="bulk-layout">
        <div>
          <div className="card card-stack">
            <div className="card-header">
              <Icon name="bulk" size={14} color="var(--accent-primary)" />
              <span className="card-title">Campaign Setup</span>
              {isPageMode && (
                <span className="ml-auto">
                  <button type="button" className="close-btn" onClick={handleClose}>
                    Back to Inbox
                  </button>
                </span>
              )}
            </div>
            <div className="card-body">
              {(lists.length > 0 || templates.length > 0) && (
                <div className="bulk-source-row">
                  {lists.length > 0 && (
                    <div className="bulk-source-col">
                      <label className="form-label">Load Recipients from List</label>
                      <select
                        className="form-input"
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) { loadFromList(e.target.value); e.target.value = ''; } }}
                        disabled={isScheduling || loadingFromList}
                      >
                        <option value="" disabled>{loadingFromList ? 'Loading…' : 'Pick a list…'}</option>
                        {lists.map(l => (
                          <option key={l.listId} value={l.listId}>{l.name} ({l.memberCount ?? 0})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {templates.length > 0 && (
                    <div className="bulk-source-col">
                      <label className="form-label">Use Template</label>
                      <select
                        className="form-input"
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) { loadTemplate(e.target.value); e.target.value = ''; } }}
                        disabled={isScheduling}
                      >
                        <option value="" disabled>Pick a template…</option>
                        {templates.map(t => (
                          <option key={t.templateId} value={t.templateId}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Pick from Contacts</label>
                <div className="bulk-contact-search-row">
                  <input
                    className="form-input"
                    type="text"
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); searchContacts(e.target.value); }}
                    placeholder="Search by name, email or company..."
                    disabled={isScheduling}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="send-btn bulk-add-selected-btn"
                    onClick={addSelectedToList}
                    disabled={!selectedContacts.size || isScheduling}
                  >
                    Add {selectedContacts.size > 0 ? `(${selectedContacts.size})` : ''}
                  </button>
                </div>
                {loadingContacts && (
                  <div className="bulk-inline-note">Searching...</div>
                )}
                {contactResults.length > 0 && (
                  <div className="bulk-contact-results">
                    {contactResults.map((c) => {
                      const email = c.email || c.Email || '';
                      const name = [c.firstName || c.FirstName, c.lastName || c.LastName].filter(Boolean).join(' ') || email;
                      const company = c.company || c.Company || '';
                      const checked = selectedContacts.has(email);
                      return (
                        <div
                          key={email}
                          onClick={() => toggleContact(email)}
                          className="bulk-contact-result-row"
                          style={{ background: checked ? 'var(--navy-3)' : 'transparent' }}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleContact(email)} onClick={e => e.stopPropagation()} />
                          <div className="bulk-contact-result-info">
                            <div className="bulk-contact-result-name">{name}</div>
                            <div className="bulk-contact-result-meta">{email}{company ? ` · ${company}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Recipients{recipientTags.length > 0 && <span className="recipient-count">{recipientTags.length} added</span>}</label>
                <div
                  className="recipient-editor"
                  onClick={() => document.getElementById('email-tag-input').focus()}
                >
                  {recipientTags.length > 20 ? (
                    <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: 20, padding: '4px 14px', fontSize: 12.5, color: '#a5b4fc', fontWeight: 600
                      }}>
                        ✉ {recipientTags.length} recipients loaded
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                        {recipientTags.slice(0, 5).map(email => (
                          <span key={email} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'var(--navy-4)', border: '1px solid var(--border)',
                            borderRadius: 20, padding: '2px 8px', fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap'
                          }}>
                            {email}
                            <span onClick={(e) => { e.stopPropagation(); removeEmailTag(email); }}
                              style={{ cursor: 'pointer', color: 'var(--text-3)', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>×</span>
                          </span>
                        ))}
                        {recipientTags.length > 5 && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 4px', alignSelf: 'center' }}>
                            +{recipientTags.length - 5} more
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRecipientTags([]); }}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--navy-5)', color: 'var(--rose)', border: '1px solid var(--border)', cursor: 'pointer' }}
                      >Clear all</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '6px 10px', maxHeight: 120, overflowY: 'auto' }}>
                      {recipientTags.map(email => (
                        <span key={email} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'var(--navy-4)', border: '1px solid var(--border)',
                          borderRadius: 20, padding: '3px 10px 3px 10px',
                          fontSize: 12, color: '#a5b4fc', whiteSpace: 'nowrap'
                        }}>
                          {email}
                          <span
                            onClick={(e) => { e.stopPropagation(); removeEmailTag(email); }}
                            style={{ cursor: 'pointer', color: 'var(--text-3)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}
                          >×</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 6px', borderTop: recipientTags.length > 0 ? '1px solid var(--border)' : 'none' }}>
                    <input
                      id="email-tag-input"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleEmailInputKey}
                      onBlur={() => addEmailTag(emailInput)}
                      placeholder={recipientTags.length ? 'Add another email…' : 'Type email and press Enter...'}
                      disabled={isScheduling}
                      style={{
                        flex: 1, minWidth: 180, border: 'none', outline: 'none',
                        background: 'transparent', color: 'var(--text-1)', fontSize: 13
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addEmailTag(emailInput)}
                      disabled={!emailInput.trim() || isScheduling}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: 'var(--gradient-cta)', color: '#fff', border: 'none', cursor: 'pointer',
                        opacity: !emailInput.trim() ? 0.4 : 1
                      }}
                    >Add</button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  className="form-input"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body</label>
                <textarea
                  className="form-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter email content"
                  rows="8"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delay Between Sends (seconds)</label>
                <input
                  className="form-input"
                  type="number"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Math.max(2, parseInt(e.target.value, 10) || 3))}
                  min="2"
                  max="300"
                  disabled={isScheduling}
                />
              </div>
            </div>
          </div>

          <button className="send-btn" onClick={handleSchedule} disabled={isScheduling}>
            {isScheduling ? 'Scheduling...' : 'Send Campaign'}
          </button>
        </div>

        <div className="bulk-side-stack">
          <div className="card">
            <div className="card-header">
              <Icon name="zap" size={14} color="var(--accent-primary)" />
              <span className="card-title">Send Progress</span>
            </div>
            <div className="card-body">
              {jobStatus ? (
                <>
                  <div className="bulk-progress-track">
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, var(--indigo), var(--violet))',
                        borderRadius: 100,
                        transition: 'width 0.2s'
                      }}
                    />
                  </div>
                  <div className="bulk-progress-value">
                    {progressLabel}
                  </div>
                  <div className="bulk-progress-status">
                    {jobStatus === 'Completed' ? 'Complete' : 'Sending'}
                  </div>
                </>
              ) : (
                <div className="empty-state empty-state-md">
                  <div className="icon">Progress</div>
                  <p>Progress will appear here</p>
                  <small>after you send</small>
                </div>
              )}
              <div className="progress-stat">
                <span className="progress-stat-label">Processed</span>
                <span className="progress-stat-val">{jobStatus ? `${processedCount}/${totalCount}` : '-'}</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-label">Delivered</span>
                <span className="progress-stat-val green">{jobStatus ? successCount : '-'}</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-label">Failed</span>
                <span className="progress-stat-val red">{jobStatus ? failureCount : '-'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Icon name="filter" size={14} color="var(--accent-primary)" />
              <span className="card-title">Suppression Check</span>
            </div>
            <div className="card-body">
              {loadingMetadata ? (
                <div className="empty-state empty-state-md">
                  <p>Loading suppression data...</p>
                </div>
              ) : suppressionSummary ? (
                <>
                  <div className="bulk-suppression-summary">
                    <span className="bulk-suppression-highlight">{suppressionTotal} emails suppressed</span> - automatically excluded from this send.
                  </div>
                  <div className="bulk-suppression-breakdown">
                    {suppressionBreakdown}
                  </div>
                </>
              ) : (
                <div className="bulk-inline-note">
                  Suppression data unavailable.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Icon name="tag" size={14} color="var(--accent-primary)" />
              <span className="card-title">Personalization Tokens</span>
            </div>
            <div className="card-body">
              {loadingMetadata ? (
                <div className="empty-state empty-state-md">
                  <p>Loading tokens...</p>
                </div>
              ) : tokenList.length ? (
                tokenList.map((token) => (
                  <div
                    key={token}
                    className="bulk-token-item"
                  >
                    {token}
                  </div>
                ))
              ) : (
                <div className="bulk-inline-note">
                  No tokens available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPageMode) {
    return bulkContent;
  }

  return (
    <div className="bulk-email-overlay">
      <div className="bulk-email-modal">
        <div className="modal-header">
          <h2>Bulk Email Scheduler</h2>
          <button className="close-btn" onClick={handleClose}>Close</button>
        </div>
        <div className="bulk-modal-content">{bulkContent}</div>
      </div>
    </div>
  );
};

export default BulkEmail;