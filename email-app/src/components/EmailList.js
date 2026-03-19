import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from './ui/Icon';
import BulkEmail from './BulkEmail';
import { useInboxData, parseSenderName, parseSenderEmail } from '../hooks/useInboxData';
import './EmailList.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASSIFICATION_OPTIONS = ['None', 'Lead', 'Potential Client', 'Client', 'Follow Up', 'Not Relevant'];

const FILTER_OPTIONS = [
  { label: 'All',        value: 'All' },
  { label: 'Lead',       value: 'Lead' },
  { label: 'Client',     value: 'Client' },
  { label: 'Follow Up',  value: 'Follow Up' },
  { label: 'Potential',  value: 'Potential Client' },
  { label: 'None',       value: 'None' },
];

// ─── Pure helpers (module-level — not recreated per render) ───────────────────

const decodeHtmlEntities = (text) => {
  if (!text) return '';
  const t = document.createElement('textarea');
  t.innerHTML = text;
  return t.value;
};

const formatDate = (dateString) => {
  const d = new Date(dateString);
  const diffDays = Math.ceil(Math.abs(Date.now() - d) / 86_400_000);
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const TAG_CLASS_MAP = {
  'lead': 'tag-lead',
  'client': 'tag-client',
  'follow up': 'tag-followup',
  'potential client': 'tag-potential',
};
const getTagClass = (c) => TAG_CLASS_MAP[(c || '').toLowerCase()] ?? 'tag-none';

const getTagLabel = (c) => {
  if (!c || c === 'None') return 'None';
  if (c === 'Potential Client') return 'Potential';
  return c;
};

const hasHtmlContent = (v) => /<\/?[a-z][\s\S]*>/i.test(v || '');

const buildEmailHtmlDoc = (value) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      html,body{margin:0;padding:0;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.6;
        color:#1f2937;background:#f7f9fc;overflow-wrap:anywhere;word-break:break-word}
      body{padding:14px}
      img,video,canvas,svg{max-width:100%!important;height:auto!important}
      table{max-width:100%!important;width:auto!important;display:block;overflow-x:auto}
      pre,code{white-space:pre-wrap;word-break:break-word}
      a{color:#2563eb}
    </style>
  </head>
  <body>${value || ''}</body>
</html>`;

// ─── EmailSkeletonRow ─────────────────────────────────────────────────────────

const EmailSkeletonRow = () => (
  <li className="email-item email-item--skeleton" aria-hidden="true">
    <div className="email-meta">
      <span className="sk sk--text sk--w55" />
      <span className="sk sk--text sk--w18" />
    </div>
    <span className="sk sk--text sk--w80 sk--mt" />
    <span className="sk sk--text sk--w40 sk--mt" />
  </li>
);

// ─── EmptyInbox ───────────────────────────────────────────────────────────────

const EmptyInbox = ({ hasFilter, onClearFilter }) => (
  <div className="empty-state empty-state-md" role="status">
    <Icon name="inbox" size={28} color="var(--text-3)" decorative />
    <h3>{hasFilter ? 'No matching emails' : 'All clear'}</h3>
    <p>{hasFilter ? 'Try a different filter or clear your search.' : 'Your inbox is empty.'}</p>
    {hasFilter && (
      <button type="button" className="topbar-btn inbox-empty-btn" onClick={onClearFilter}>
        Clear filter
      </button>
    )}
  </div>
);

// ─── ListErrorState ───────────────────────────────────────────────────────────

const ListErrorState = ({ message, onRetry }) => (
  <div className="empty-state empty-state-md" role="alert">
    <Icon name="zap" size={24} color="var(--rose)" decorative />
    <p className="inbox-error-msg">{message}</p>
    <button type="button" className="topbar-btn inbox-empty-btn" onClick={onRetry}>
      Try again
    </button>
  </div>
);

// ─── EmailRow ─────────────────────────────────────────────────────────────────

const EmailRow = React.memo(({ email, isSelected, onSelect }) => {
  const senderDisplay = useMemo(
    () => decodeHtmlEntities(parseSenderName(email.from) || parseSenderEmail(email.from)),
    [email.from]
  );

  const handleClick = useCallback(() => onSelect(email.id), [onSelect, email.id]);
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(email.id); }
  }, [onSelect, email.id]);

  return (
    <li
      className={`email-item${!email.isRead ? ' unread' : ''}${isSelected ? ' active' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      aria-label={`From ${senderDisplay}: ${email.subject || 'No Subject'}`}
    >
      {!email.isRead && <div className="unread-indicator" aria-hidden="true" />}
      <div className="email-meta">
        <span className={`email-sender${!email.isRead ? ' email-indent' : ''}`}>
          {senderDisplay}
        </span>
        <time className="email-time" dateTime={email.date}>{formatDate(email.date)}</time>
      </div>
      <div className={`email-subject${!email.isRead ? ' email-indent' : ''}`}>
        {decodeHtmlEntities(email.subject || '(No Subject)')}
      </div>
      <div className={`email-snippet-row${!email.isRead ? ' email-indent' : ''}`}>
        <span className="email-snippet email-snippet-grow">
          {decodeHtmlEntities(email.snippet || '')}
        </span>
        <span className={`classification-tag ${getTagClass(email.classification)}`}>
          {getTagLabel(email.classification)}
        </span>
      </div>
    </li>
  );
});
EmailRow.displayName = 'EmailRow';

// ─── EmailDetailPane ──────────────────────────────────────────────────────────

const EmailDetailPane = React.memo(({
  panel, dispatch, selectedEmail, updatingClassification,
  onClassify, onAddToCrm, onSendReply, onSendForward,
}) => {
  const navigate = useNavigate();
  const {
    loading, data: detailData, error,
    showReply, replyText, showForward, forwardTo, forwardNote,
    sending, forwarding, addingContact,
  } = panel;
  const email = detailData || selectedEmail;

  if (loading) {
    return (
      <div className="inbox-detail-pane">
        <div className="detail-skeleton-wrap" role="status" aria-label="Loading email">
          <div className="sk sk--block sk--h20 sk--w65 sk--mb12" />
          <div className="sk sk--text sk--w30 sk--mb24" />
          <div className="sk sk--block sk--h260" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inbox-detail-pane">
        <div className="empty-state empty-state-lg" role="alert">
          <Icon name="zap" size={22} color="var(--rose)" decorative />
          <p className="inbox-error-msg">{error}</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="inbox-detail-pane">
        <div className="empty-state empty-state-lg">
          <Icon name="mail" size={32} color="var(--text-3)" decorative />
          <p className="inbox-select-hint">Select an email to read</p>
        </div>
      </div>
    );
  }

  const senderEmail = parseSenderEmail(email.from || '');

  return (
    <div className="inbox-detail-pane">
      <div className="email-detail">
        <header className="email-detail-header">
          <h2 className="email-subject-large">
            {decodeHtmlEntities(email.subject || '(No Subject)')}
          </h2>

          <div className="email-from-row">
            <div className="sender-avatar" aria-hidden="true">
              {decodeHtmlEntities(email.from || 'A')[0].toUpperCase()}
            </div>
            <div className="sender-info">
              <div className="name">{decodeHtmlEntities(email.from || '')}</div>
              <div className="addr">{email.from || ''}</div>
            </div>
            {senderEmail && (
              <button
                type="button"
                className="crm-hint"
                onClick={() =>
                  navigate(`/marketing?tab=contacts&q=${encodeURIComponent(senderEmail)}`)
                }
              >
                <Icon name="users" size={12} decorative />
                View in CRM
              </button>
            )}
          </div>

          <div className="action-row" role="toolbar" aria-label="Email actions">
            <button
              type="button"
              className={`action-btn${showReply ? ' primary' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_REPLY' })}
              aria-pressed={showReply}
            >
              <Icon name="mail" size={13} decorative />
              Reply
            </button>
            <button
              type="button"
              className={`action-btn${showForward ? ' primary' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_FORWARD' })}
              aria-pressed={showForward}
            >
              <Icon name="arrow" size={13} decorative />
              Forward
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={onAddToCrm}
              disabled={addingContact}
            >
              <Icon name="users" size={13} decorative />
              {addingContact ? 'Adding…' : 'Add to CRM'}
            </button>
          </div>

          <div className="classification-wrap">
            <label htmlFor="classify-select" className="form-label">Classification</label>
            <select
              id="classify-select"
              className="form-input"
              value={selectedEmail?.classification || 'None'}
              disabled={!selectedEmail || updatingClassification.has(selectedEmail?.id)}
              onChange={(e) => selectedEmail && onClassify(selectedEmail.id, e.target.value)}
            >
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </header>

        {detailData && hasHtmlContent(detailData.body) ? (
          <div className="email-body email-body-frame-wrap">
            <iframe
              className="email-body-frame"
              title={`Email body: ${detailData.subject || 'message'}`}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              srcDoc={buildEmailHtmlDoc(detailData.body)}
            />
          </div>
        ) : (
          <div className="email-body">
            {detailData?.body || selectedEmail?.snippet || 'No content'}
          </div>
        )}

        {showReply && (
          <section className="composer-wrap" aria-label="Reply composer">
            <label htmlFor="reply-body" className="form-label">Your reply</label>
            <textarea
              id="reply-body"
              className="form-input"
              rows={6}
              value={replyText}
              onChange={(e) => dispatch({ type: 'SET_REPLY_TEXT', payload: e.target.value })}
              placeholder="Type your reply…"
            />
            <div className="composer-actions">
              <button
                type="button"
                className="action-btn primary"
                onClick={onSendReply}
                disabled={sending || !replyText.trim()}
              >
                {sending ? 'Sending…' : 'Send Reply'}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => dispatch({ type: 'TOGGLE_REPLY' })}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {showForward && (
          <section className="composer-wrap" aria-label="Forward composer">
            <label htmlFor="forward-to" className="form-label">Forward to</label>
            <input
              id="forward-to"
              className="form-input"
              value={forwardTo}
              onChange={(e) => dispatch({ type: 'SET_FORWARD_TO', payload: e.target.value })}
              placeholder="Recipient emails, comma-separated"
              autoComplete="off"
            />
            <label htmlFor="forward-note" className="form-label form-label-offset">
              Note (optional)
            </label>
            <textarea
              id="forward-note"
              className="form-input"
              rows={4}
              value={forwardNote}
              onChange={(e) => dispatch({ type: 'SET_FORWARD_NOTE', payload: e.target.value })}
              placeholder="Add a short note…"
            />
            <div className="composer-actions">
              <button
                type="button"
                className="action-btn primary"
                onClick={onSendForward}
                disabled={forwarding || !forwardTo.trim()}
              >
                {forwarding ? 'Forwarding…' : 'Send Forward'}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => dispatch({ type: 'TOGGLE_FORWARD' })}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
});
EmailDetailPane.displayName = 'EmailDetailPane';

// ─── EmailList ────────────────────────────────────────────────────────────────

const EmailList = () => {
  const { emailId } = useParams();
  const navigate = useNavigate();

  // Mobile: 'list' | 'detail' — show only one panel at a time on small screens
  const [mobileView, setMobileView] = useState('list');

  const {
    filteredEmails, loading, listError, loadingMore, nextPageToken,
    updatingClassification, classificationFilter, setClassificationFilter,
    searchInput, handleSearchChange, handleClearSearch,
    selectedEmailId, selectedEmail,
    showBulkEmail, setShowBulkEmail,
    panel, dispatch,
    selectEmail, loadMoreEmails,
    handleUpdateClassification, handleSendReply, handleSendForward, handleAddToCrm,
    refresh,
  } = useInboxData(emailId);

  const handleSelectEmail = useCallback((id) => {
    selectEmail(id);
    setMobileView('detail');
  }, [selectEmail]);

  const hasFilter = classificationFilter !== 'All' || searchInput.length > 0;

  const handleClearFilter = useCallback(() => {
    setClassificationFilter('All');
    handleClearSearch();
  }, [setClassificationFilter, handleClearSearch]);

  return (
    <div className="inbox-container fade-in">
      <div className={`inbox-layout inbox-layout--${mobileView}`}>

        {/* ── Left panel: filter + email list ── */}
        <aside className="inbox-sidebar" aria-label="Email list">
          <div className="inbox-filters">
            <div className="search-box search-box--full" role="search" aria-label="Search inbox">
              <Icon name="search" size={13} color="var(--text-3)" decorative />
              <input
                type="search"
                aria-label="Search emails"
                placeholder="Search emails…"
                value={searchInput}
                onChange={handleSearchChange}
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="chip-wrap" role="group" aria-label="Filter by classification">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`filter-chip${classificationFilter === f.value ? ' active' : ''}`}
                  onClick={() => setClassificationFilter(f.value)}
                  aria-pressed={classificationFilter === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="inbox-actions">
              <button type="button" className="topbar-btn" onClick={() => setShowBulkEmail(true)}>
                Quick Bulk
              </button>
              <button type="button" className="topbar-btn" onClick={() => navigate('/emails/bulk')}>
                Bulk Page
              </button>
              <button type="button" className="topbar-btn" onClick={refresh}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <ul className="inbox-email-list" aria-label="Loading emails" aria-busy="true">
              {Array.from({ length: 7 }, (_, i) => <EmailSkeletonRow key={i} />)}
            </ul>
          ) : listError ? (
            <ListErrorState message={listError} onRetry={refresh} />
          ) : filteredEmails.length === 0 ? (
            <EmptyInbox hasFilter={hasFilter} onClearFilter={handleClearFilter} />
          ) : (
            <ul
              className="inbox-email-list"
              role="listbox"
              aria-label="Emails"
              aria-multiselectable="false"
            >
              {filteredEmails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  isSelected={String(selectedEmailId) === String(email.id)}
                  onSelect={handleSelectEmail}
                />
              ))}
            </ul>
          )}

          {nextPageToken && !loading && (
            <div className="inbox-load-more">
              <button
                type="button"
                className="topbar-btn"
                onClick={loadMoreEmails}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </aside>

        {/* ── Right panel: email detail ── */}
        <div className="inbox-detail-wrapper">
          <button
            type="button"
            className="inbox-back-btn topbar-btn"
            onClick={() => setMobileView('list')}
          >
            ← Back to inbox
          </button>
          <EmailDetailPane
            panel={panel}
            dispatch={dispatch}
            selectedEmail={selectedEmail}
            updatingClassification={updatingClassification}
            onClassify={handleUpdateClassification}
            onAddToCrm={handleAddToCrm}
            onSendReply={handleSendReply}
            onSendForward={handleSendForward}
          />
        </div>
      </div>

      {showBulkEmail && <BulkEmail mode="modal" onClose={() => setShowBulkEmail(false)} />}
    </div>
  );
};

export default EmailList;