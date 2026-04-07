import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Icon from '../../../components/ui/Icon';
import BulkEmail from './BulkEmail';
import { useInboxData, parseSenderName, parseSenderEmail } from '../../../hooks/useInboxData';
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

const FRAME_BASE_HEIGHT = 360;
const FRAME_EXTERNAL_HEIGHT = 720;
const FRAME_HEIGHT_BUFFER = 16;

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

const escapeAttributeValue = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * SECURITY FIX: Use industry-standard DOMPurify for HTML sanitization
 * Replaces custom regex-based sanitizer to prevent XSS attacks
 * DOMPurify handles edge cases like HTML entity encoding, data: URIs, CSS expressions, etc.
 */
const normalizeEmailHtml = (value) => {
  if (!value?.trim()) {
    return {
      embeddedStyles: '',
      bodyMarkup: '<p class="mail-render-empty">No content</p>',
      bodyClassName: '',
      bodyInlineStyle: '',
    };
  }

  // Configure DOMPurify for safe email rendering
  const cleanHtml = DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'a', 'img', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote',
      'pre', 'code', 'hr', 'b', 'i'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'cellpadding', 'cellspacing', 'border',
      'align', 'valign', 'target', 'loading', 'decoding'
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'frame', 'frameset', 'iframe', 'form', 'input', 'button', 'select'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });

  const parser = new DOMParser();
  const hasDocumentShell = /<(html|head|body)\b/i.test(cleanHtml);
  const parsedDoc = parser.parseFromString(
    hasDocumentShell ? cleanHtml : `<!doctype html><html><head></head><body>${cleanHtml}</body></html>`,
    'text/html'
  );

  // Post-sanitization enhancements
  parsedDoc.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.setAttribute('target', '_self');
    anchor.removeAttribute('download');
  });

  parsedDoc.querySelectorAll('img').forEach((image) => {
    if (!image.hasAttribute('alt')) {
      image.setAttribute('alt', '');
    }
    if (!image.hasAttribute('loading')) {
      image.setAttribute('loading', 'lazy');
    }
    if (!image.hasAttribute('decoding')) {
      image.setAttribute('decoding', 'async');
    }
  });

  parsedDoc.querySelectorAll('table').forEach((table) => {
    table.classList.add('mail-render-table');
    if (!table.hasAttribute('cellpadding')) {
      table.setAttribute('cellpadding', '0');
    }
    if (!table.hasAttribute('cellspacing')) {
      table.setAttribute('cellspacing', '0');
    }
  });

  parsedDoc
    .querySelectorAll('blockquote, blockquote[type="cite"], .gmail_quote, .gmail_attr, .moz-cite-prefix, #divRplyFwdMsg, .yahoo_quoted')
    .forEach((node) => node.classList.add('mail-render-quoted'));

  const embeddedStyles = Array.from(parsedDoc.head.querySelectorAll('style'))
    .map((styleNode) => styleNode.outerHTML)
    .join('\n');

  return {
    embeddedStyles,
    bodyMarkup: parsedDoc.body.innerHTML.trim() || '<p class="mail-render-empty">No content</p>',
    bodyClassName: parsedDoc.body.getAttribute('class') || '',
    bodyInlineStyle: parsedDoc.body.getAttribute('style') || '',
  };
};

const buildEmailHtmlDoc = (value) => {
  const {
    embeddedStyles,
    bodyMarkup,
    bodyClassName,
    bodyInlineStyle,
  } = normalizeEmailHtml(value);

  const articleClassName = `mail-frame-message${bodyClassName ? ` ${escapeAttributeValue(bodyClassName)}` : ''}`;
  const articleStyle = bodyInlineStyle ? ` style="${escapeAttributeValue(bodyInlineStyle)}"` : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base target="_self">
    ${embeddedStyles}
    <style>
      :root { color-scheme: light only; }
      html { margin: 0; padding: 0; background: #eef4fb; }
      body {
        margin: 0;
        padding: 0;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        line-height: 1.65;
        color: #1f2937;
        background: linear-gradient(180deg, #eef4fb 0%, #f7f9fc 100%);
        overflow-x: hidden;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .mail-frame-canvas {
        padding: clamp(12px, 2.5vw, 22px);
      }
      .mail-frame-message {
        max-width: 780px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe5f0;
        border-radius: 18px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
        padding: clamp(18px, 2.8vw, 30px);
        box-sizing: border-box;
        overflow-x: auto;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .mail-frame-message,
      .mail-frame-message * {
        box-sizing: border-box;
      }
      .mail-frame-message * {
        max-width: 100%;
      }
      .mail-frame-message > :first-child { margin-top: 0 !important; }
      .mail-frame-message > :last-child { margin-bottom: 0 !important; }
      .mail-frame-message h1,
      .mail-frame-message h2,
      .mail-frame-message h3,
      .mail-frame-message h4,
      .mail-frame-message h5,
      .mail-frame-message h6 {
        color: #0f172a;
        line-height: 1.28;
        margin: 0 0 0.8em;
      }
      .mail-frame-message p,
      .mail-frame-message ul,
      .mail-frame-message ol,
      .mail-frame-message blockquote,
      .mail-frame-message pre,
      .mail-frame-message table,
      .mail-frame-message hr {
        margin-top: 0;
        margin-bottom: 1em;
      }
      .mail-frame-message ul,
      .mail-frame-message ol {
        padding-left: 1.35rem;
      }
      .mail-frame-message li + li {
        margin-top: 0.35rem;
      }
      .mail-frame-message hr {
        border: 0;
        border-top: 1px solid #d7e1ec;
        margin: 1.35rem 0;
      }
      .mail-frame-message a {
        color: #2563eb;
        text-decoration: underline;
        text-underline-offset: 2px;
        word-break: break-word;
      }
      .mail-frame-message img,
      .mail-frame-message video,
      .mail-frame-message canvas,
      .mail-frame-message svg {
        max-width: 100% !important;
        height: auto !important;
      }
      .mail-frame-message table {
        max-width: 100% !important;
        border-collapse: collapse;
      }
      .mail-frame-message td,
      .mail-frame-message th {
        vertical-align: top;
      }
      .mail-frame-message pre,
      .mail-frame-message code {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: 'DM Mono', monospace;
      }
      .mail-frame-message pre {
        padding: 14px 16px;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .mail-frame-message blockquote,
      .mail-frame-message .mail-render-quoted {
        margin: 1.2rem 0;
        padding: 0.95rem 1rem;
        border-left: 4px solid #9fb7d1;
        background: #f6f8fc;
        color: #52627a;
      }
      .mail-frame-message .gmail_attr,
      .mail-frame-message .moz-cite-prefix {
        color: #6b7280;
        font-size: 12px;
      }
      .mail-render-empty {
        margin: 0;
        color: #64748b;
      }
      @media (max-width: 640px) {
        .mail-frame-canvas {
          padding: 10px;
        }
        .mail-frame-message {
          border-radius: 14px;
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <div class="mail-frame-canvas">
      <article class="${articleClassName}"${articleStyle}>${bodyMarkup}</article>
    </div>
  </body>
</html>`;
};

const HtmlEmailBody = React.memo(({ subject, htmlContent }) => {
  const iframeRef = useRef(null);
  const mutationObserverRef = useRef(null);
  const frameStateRef = useRef({
    rafId: 0,
    timeoutIds: [],
    imageCleanups: [],
    resizeCleanup: null,
  });
  const [frameHeight, setFrameHeight] = useState(FRAME_BASE_HEIGHT);

  const srcDoc = useMemo(() => buildEmailHtmlDoc(htmlContent), [htmlContent]);

  const teardownFrameWatchers = useCallback(() => {
    if (frameStateRef.current.rafId) {
      cancelAnimationFrame(frameStateRef.current.rafId);
      frameStateRef.current.rafId = 0;
    }

    frameStateRef.current.timeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    frameStateRef.current.timeoutIds = [];

    mutationObserverRef.current?.disconnect();
    mutationObserverRef.current = null;

    frameStateRef.current.imageCleanups.forEach((cleanup) => cleanup());
    frameStateRef.current.imageCleanups = [];

    frameStateRef.current.resizeCleanup?.();
    frameStateRef.current.resizeCleanup = null;
  }, []);

  const measureFrameHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeBody = iframeDoc?.body;
      const iframeHtml = iframeDoc?.documentElement;

      if (!iframeBody || !iframeHtml) {
        return;
      }

      const nextHeight = Math.max(
        Math.ceil(iframeBody.scrollHeight),
        Math.ceil(iframeBody.offsetHeight),
        Math.ceil(iframeHtml.scrollHeight),
        Math.ceil(iframeHtml.offsetHeight),
        FRAME_BASE_HEIGHT
      ) + FRAME_HEIGHT_BUFFER;

      setFrameHeight((currentHeight) => (
        Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
      ));
    } catch (error) {
      setFrameHeight((currentHeight) => (
        currentHeight === FRAME_EXTERNAL_HEIGHT ? currentHeight : FRAME_EXTERNAL_HEIGHT
      ));
    }
  }, []);

  const scheduleFrameMeasure = useCallback((delay = 0) => {
    const queueMeasurement = () => {
      if (frameStateRef.current.rafId) {
        cancelAnimationFrame(frameStateRef.current.rafId);
      }

      frameStateRef.current.rafId = requestAnimationFrame(() => {
        frameStateRef.current.rafId = 0;
        measureFrameHeight();
      });
    };

    if (!delay) {
      queueMeasurement();
      return;
    }

    const timeoutId = setTimeout(() => {
      frameStateRef.current.timeoutIds = frameStateRef.current.timeoutIds.filter(
        (activeTimeoutId) => activeTimeoutId !== timeoutId
      );
      queueMeasurement();
    }, delay);

    frameStateRef.current.timeoutIds.push(timeoutId);
  }, [measureFrameHeight]);

  const handleFrameLoad = useCallback(() => {
    teardownFrameWatchers();
    scheduleFrameMeasure();

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeBody = iframeDoc?.body;
      const iframeHtml = iframeDoc?.documentElement;

      if (!iframeBody || !iframeHtml) {
        return;
      }

      const MutationObserverCtor = typeof window !== 'undefined' ? window.MutationObserver : null;
      if (MutationObserverCtor) {
        const mutationObserver = new MutationObserverCtor(() => {
          scheduleFrameMeasure();
        });
        mutationObserver.observe(iframeBody, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true,
        });
        mutationObserverRef.current = mutationObserver;
      }


      if (typeof window !== 'undefined') {
        const handleWindowResize = () => {
          scheduleFrameMeasure();
        };

        window.addEventListener('resize', handleWindowResize);
        frameStateRef.current.resizeCleanup = () => {
          window.removeEventListener('resize', handleWindowResize);
        };
      }

      iframeDoc.fonts?.ready
        ?.then(() => {
          scheduleFrameMeasure();
        })
        .catch(() => {});

      scheduleFrameMeasure(120);
      scheduleFrameMeasure(360);
      frameStateRef.current.imageCleanups = Array.from(iframeDoc.images || []).map((image) => {
        const handleImageUpdate = () => {
          scheduleFrameMeasure();
        };

        image.addEventListener('load', handleImageUpdate);
        image.addEventListener('error', handleImageUpdate);

        return () => {
          image.removeEventListener('load', handleImageUpdate);
          image.removeEventListener('error', handleImageUpdate);
        };
      });
    } catch (error) {
      setFrameHeight(FRAME_EXTERNAL_HEIGHT);
    }
  }, [scheduleFrameMeasure, teardownFrameWatchers]);

  useEffect(() => {
    setFrameHeight(FRAME_BASE_HEIGHT);
    teardownFrameWatchers();
    return teardownFrameWatchers;
  }, [srcDoc, teardownFrameWatchers]);

  return (
    <div className="email-body email-body-frame-wrap">
      <div className="email-body-frame-shell">
        <iframe
          ref={iframeRef}
          className="email-body-frame"
          title={`Email body: ${subject || 'message'}`}
          sandbox="allow-same-origin"
          srcDoc={srcDoc}
          onLoad={handleFrameLoad}
          style={{ height: `${frameHeight}px` }}
        />
      </div>
    </div>
  );
});
HtmlEmailBody.displayName = 'HtmlEmailBody';

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
              <div className="addr">{decodeHtmlEntities(email.from || '')}</div>
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
          <HtmlEmailBody
            subject={detailData.subject || 'message'}
            htmlContent={detailData.body}
          />
        ) : (
          <div className="email-body email-body--plaintext">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedEmailId = searchParams.get('email') || emailId || null;

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
  } = useInboxData(requestedEmailId);

  useEffect(() => {
    if (!emailId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('email', emailId);
    navigate({ pathname: '/emails', search: `?${nextSearchParams.toString()}` }, { replace: true });
  }, [emailId, navigate, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(max-width: 768px)').matches && requestedEmailId) {
      setMobileView('detail');
    }
  }, [requestedEmailId]);

  const handleSelectEmail = useCallback((id) => {
    selectEmail(id);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('email', id);
    setSearchParams(nextSearchParams, { replace: true });
    setMobileView('detail');
  }, [searchParams, selectEmail, setSearchParams]);

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  const hasFilter = classificationFilter !== 'All' || searchInput.length > 0;

  const handleClearFilter = useCallback(() => {
    setClassificationFilter('All');
    handleClearSearch();
  }, [setClassificationFilter, handleClearSearch]);

  return (
    <div className="content fade-in">
      <div className="inbox-container">
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
              onClick={handleBackToList}
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
    </div>
  );
};

export default EmailList;