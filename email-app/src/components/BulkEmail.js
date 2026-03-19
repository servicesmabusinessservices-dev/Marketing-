import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';
import LoadingSpinner from './ui/LoadingSpinner';
import { useLists, useTemplates, useSuppressionSummary, useTokens } from '../hooks/useApi';

//  Progress panel (memoised to avoid re-rendering with parent state) 
const BulkEmailProgress = React.memo(({ jobStatus, progress, progressLabel, processedCount, totalCount, successCount, failureCount }) => (
  <div className="card">
    <div className="card-header">
      <Icon name="zap" size={14} color="var(--accent-primary)" />
      <span className="card-title">Send Progress</span>
    </div>
    <div className="card-body">
      {jobStatus ? (
        <>
          <div className="bulk-progress-track">
            <div className="bulk-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="bulk-progress-value">{progressLabel}</div>
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
));

//  Main component 
const BulkEmail = ({ onClose, mode = 'modal' }) => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const isPageMode = mode === 'page';

  //  Metadata from React Query (replaces the old useEffect Promise.all) 
  const listsQuery = useLists();
  const templatesQuery = useTemplates();
  const suppressionQuery = useSuppressionSummary();
  const tokensQuery = useTokens();

  const lists = useMemo(() => listsQuery.data?.lists || [], [listsQuery.data]);
  const templates = useMemo(() => templatesQuery.data?.templates || [], [templatesQuery.data]);
  const suppressionSummary = suppressionQuery.data ?? null;
  const tokens = useMemo(() => tokensQuery.data?.tokens || [], [tokensQuery.data]);
  const loadingMetadata =
    listsQuery.isLoading ||
    templatesQuery.isLoading ||
    suppressionQuery.isLoading ||
    tokensQuery.isLoading;

  //  Compose state 
  const [recipientTags, setRecipientTags] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(3);

  //  Contact search state 
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingFromList, setLoadingFromList] = useState(false);
  const searchTimerRef = useRef(null);

  //  Job / polling state 
  const [activeJobId, setActiveJobId] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const feedbackShownRef = useRef(false);

  //  React Query polling - replaces the 600x1.5s loop (no memory leak) 
  const { data: polledStatus } = useQuery({
    queryKey: ['bulkJobStatus', activeJobId],
    queryFn: () => gmailService.getBulkEmailStatus(activeJobId),
    enabled: !!activeJobId && isScheduling,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return (s === 'Completed' || s === 'Failed') ? false : 1500;
    },
  });

  // Sync polling results into local state
  useEffect(() => {
    if (!polledStatus) return;
    setProcessedCount(polledStatus.processedCount || 0);
    setSuccessCount(polledStatus.successCount || 0);
    setFailureCount(polledStatus.failureCount || 0);
    setTotalCount((current) => polledStatus.totalRecipients || current);
    const s = polledStatus.status?.toString() ?? 'Queued';
    if ((s === 'Completed' || s === 'Failed') && !feedbackShownRef.current) {
      feedbackShownRef.current = true;
      setIsScheduling(false);
      showFeedback(
        `Bulk email finished. Success: ${polledStatus.successCount || 0}, Failed: ${polledStatus.failureCount || 0}.`,
        s === 'Completed' ? 'success' : 'warning'
      );
    }
  }, [polledStatus, showFeedback]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const jobStatus = polledStatus?.status?.toString() ?? (activeJobId ? 'Queued' : null);

  //  Handlers 
  const handleClose = useCallback(() => {
    if (onClose) { onClose(); return; }
    navigate('/emails');
  }, [onClose, navigate]);

  const handleSchedule = async () => {
    if (!recipientTags.length || !subject || !content) {
      showFeedback('Please fill all fields and add at least one email.', 'warning');
      return;
    }
    feedbackShownRef.current = false;
    setIsScheduling(true);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setTotalCount(recipientTags.length);
    try {
      const job = await gmailService.sendBulkEmail(recipientTags, subject, content, delaySeconds);
      setActiveJobId(job.jobId);
    } catch (error) {
      if (error.response?.status === 401) {
        setIsScheduling(false);
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      setIsScheduling(false);
      showFeedback(error.response?.data?.error || 'Failed to schedule bulk email.', 'error');
    }
  };

  const addEmailTag = useCallback((raw) => {
    const val = raw.trim().toLowerCase();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
    setRecipientTags(prev => prev.includes(val) ? prev : [...prev, val]);
    setEmailInput('');
  }, []);

  const removeEmailTag = useCallback((email) => setRecipientTags(prev => prev.filter(e => e !== email)), []);

  const handleEmailInputKey = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmailTag(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && recipientTags.length) {
      setRecipientTags(prev => prev.slice(0, -1));
    }
  }, [addEmailTag, emailInput, recipientTags.length]);

  const toggleContact = useCallback((email) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }, []);

  const addSelectedToList = useCallback(() => {
    if (!selectedContacts.size) return;
    setRecipientTags(prev => [...new Set([...prev, ...selectedContacts])]);
    setSelectedContacts(new Set());
    setContactResults([]);
    setContactSearch('');
    showFeedback(`${selectedContacts.size} contact(s) added to recipient list.`, 'success');
  }, [selectedContacts, showFeedback]);

  // 300ms debounced contact search
  const handleContactSearchChange = useCallback((e) => {
    const q = e.target.value;
    setContactSearch(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
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
    }, 300);
  }, []);

  const loadFromList = useCallback(async (listId) => {
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
  }, [showFeedback]);

  const loadTemplate = useCallback((templateId) => {
    const tpl = templates.find((t) => String(t.templateId) === String(templateId));
    if (!tpl) return;
    if (tpl.subject) setSubject(tpl.subject);
    if (tpl.bodyHtml) setContent(tpl.bodyHtml);
    showFeedback(`Template "${tpl.name}" loaded.`, 'success');
  }, [templates, showFeedback]);

  const progress = totalCount ? Math.round((processedCount / totalCount) * 100) : 0;
  const progressLabel = jobStatus ? `${progress}%` : '0%';
  const suppressionTotal = suppressionSummary?.total ?? 0;
  const suppressionBreakdown = suppressionSummary?.byReason?.length
    ? suppressionSummary.byReason.map((item) => `${item.reason}: ${item.count}`).join(' | ')
    : 'No suppressions yet.';
  const tokenList = tokens.map((token) => `{{${token}}}`);

  //  Render 
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
                        <option value="" disabled>{loadingFromList ? 'Loading...' : 'Pick a list...'}</option>
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
                        <option value="" disabled>Pick a template...</option>
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
                    className="form-input bulk-contact-search-input"
                    type="text"
                    value={contactSearch}
                    onChange={handleContactSearchChange}
                    placeholder="Search by name, email or company..."
                    disabled={isScheduling}
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
                {loadingContacts && <div className="bulk-inline-note">Searching...</div>}
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
                          className={`bulk-contact-result-row${checked ? ' selected' : ''}`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleContact(email)} onClick={e => e.stopPropagation()} />
                          <div className="bulk-contact-result-info">
                            <div className="bulk-contact-result-name">{name}</div>
                            <div className="bulk-contact-result-meta">{email}{company ? ` - ${company}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Recipients{recipientTags.length > 0 && <span className="recipient-count">{recipientTags.length} added</span>}</label>
                <div className="recipient-editor" onClick={() => document.getElementById('email-tag-input').focus()}>
                  {recipientTags.length > 20 ? (
                    <div className="recipient-summary-wrap">
                      <span className="recipient-summary-pill">Mail {recipientTags.length} recipients loaded</span>
                      <div className="recipient-summary-preview">
                        {recipientTags.slice(0, 5).map(email => (
                          <span key={email} className="recipient-summary-chip">
                            {email}
                            <span onClick={(e) => { e.stopPropagation(); removeEmailTag(email); }} className="recipient-chip-remove">x</span>
                          </span>
                        ))}
                        {recipientTags.length > 5 && <span className="recipient-summary-more">+{recipientTags.length - 5} more</span>}
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setRecipientTags([]); }} className="recipient-clear-btn">Clear all</button>
                    </div>
                  ) : (
                    <div className="recipient-tags-wrap">
                      {recipientTags.map(email => (
                        <span key={email} className="recipient-tag-chip">
                          {email}
                          <span onClick={(e) => { e.stopPropagation(); removeEmailTag(email); }} className="recipient-chip-remove">x</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`recipient-input-row${recipientTags.length > 0 ? ' has-border' : ''}`}>
                    <input
                      id="email-tag-input"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleEmailInputKey}
                      onBlur={() => addEmailTag(emailInput)}
                      placeholder={recipientTags.length ? 'Add another email...' : 'Type email and press Enter...'}
                      disabled={isScheduling}
                      className="recipient-input-field"
                    />
                    <button type="button" onClick={() => addEmailTag(emailInput)} disabled={!emailInput.trim() || isScheduling} className="recipient-add-btn">Add</button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input className="form-input" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter email subject" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body</label>
                <textarea className="form-input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter email content" rows="8" />
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
          <BulkEmailProgress
            jobStatus={jobStatus}
            progress={progress}
            progressLabel={progressLabel}
            processedCount={processedCount}
            totalCount={totalCount}
            successCount={successCount}
            failureCount={failureCount}
          />

          <div className="card">
            <div className="card-header">
              <Icon name="filter" size={14} color="var(--accent-primary)" />
              <span className="card-title">Suppression Check</span>
            </div>
            <div className="card-body">
              {loadingMetadata ? (
                <LoadingSpinner label="Loading suppression data..." />
              ) : suppressionSummary ? (
                <>
                  <div className="bulk-suppression-summary">
                    <span className="bulk-suppression-highlight">{suppressionTotal} emails suppressed</span> - automatically excluded from this send.
                  </div>
                  <div className="bulk-suppression-breakdown">{suppressionBreakdown}</div>
                </>
              ) : (
                <div className="bulk-inline-note">Suppression data unavailable.</div>
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
                <LoadingSpinner label="Loading tokens..." />
              ) : tokenList.length ? (
                tokenList.map((token) => <div key={token} className="bulk-token-item">{token}</div>)
              ) : (
                <div className="bulk-inline-note">No tokens available yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPageMode) return bulkContent;

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
