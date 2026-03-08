import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';
import BulkEmail from './BulkEmail';

const EmailList = () => {
  const classificationOptions = ['None', 'Lead', 'Potential Client', 'Client', 'Follow Up', 'Not Relevant'];
  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Lead', value: 'Lead' },
    { label: 'Client', value: 'Client' },
    { label: 'Follow Up', value: 'Follow Up' },
    { label: 'Potential', value: 'Potential Client' },
    { label: 'None', value: 'None' }
  ];

  const { emailId } = useParams();
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [updatingClassification, setUpdatingClassification] = useState(new Set());
  const [classificationFilter, setClassificationFilter] = useState('All');
  const [classificationSort] = useState('none');
  const [sortBy] = useState('date');
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkEmail, setShowBulkEmail] = useState(false);

  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    fetchEmails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchEmails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificationFilter, classificationSort, sortBy, searchTerm]);

  useEffect(() => {
    if (emailId) {
      setSelectedEmailId(emailId);
      return;
    }

    if (!selectedEmailId && emails.length > 0) {
      setSelectedEmailId(emails[0].id);
    }
  }, [emailId, emails, selectedEmailId]);

  useEffect(() => {
    if (!selectedEmailId) {
      setDetailData(null);
      setSelectedEmail(null);
      return;
    }

    setShowReply(false);
    setShowForward(false);
    setReplyText('');
    setForwardTo('');
    setForwardNote('');
    const emailFromList = emails.find((email) => String(email.id) === String(selectedEmailId));
    setSelectedEmail(emailFromList || null);
    fetchEmailDetail(selectedEmailId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmailId, emails]);

  const fetchEmails = async (reset = true) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await gmailService.getEmails({
        pageToken: reset ? null : nextPageToken,
        maxResults: pageSize,
        classification: classificationFilter,
        sortBy,
        sortDir: classificationSort === 'none' ? 'desc' : classificationSort,
        q: searchTerm || null
      });
      const fetchedEmails = data.emails || [];

      setNextPageToken(data.nextPageToken || null);

      if (reset) {
        setEmails(fetchedEmails);
      } else {
        setEmails((prev) => {
          const merged = [...prev, ...fetchedEmails];
          const uniqueMap = new Map(merged.map((email) => [email.id, email]));
          return Array.from(uniqueMap.values());
        });
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
      }
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const fetchEmailDetail = async (targetEmailId) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const data = await gmailService.getEmailById(targetEmailId);
      setDetailData(data);
    } catch (error) {
      console.error('Failed to fetch email detail:', error);
      setDetailError('Unable to load email detail.');
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || loadingMore) {
      return;
    }

    await fetchEmails(false);
  };

  const handleUpdateClassification = async (targetEmailId, classification) => {
    const pending = new Set(updatingClassification);
    pending.add(targetEmailId);
    setUpdatingClassification(pending);

    const previous = emails;
    setEmails((prev) => prev.map((email) => (email.id === targetEmailId ? { ...email, classification } : email)));

    try {
      await gmailService.updateEmailClassification(targetEmailId, classification);
      showFeedback('Email classification updated.', 'success');
    } catch (error) {
      setEmails(previous);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }

      if (error.response?.status === 404) {
        showFeedback('Classification API not found. Restart backend with latest code.', 'error');
        return;
      }

      showFeedback(error.response?.data?.error || 'Failed to update email classification.', 'error');
    } finally {
      setUpdatingClassification((current) => {
        const next = new Set(current);
        next.delete(targetEmailId);
        return next;
      });
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !detailData) {
      return;
    }

    setSending(true);
    try {
      const toEmail = detailData.from.match(/<(.+?)>/)?.[1] || detailData.from;
      await gmailService.sendEmail([toEmail], `Re: ${detailData.subject}`, replyText);
      showFeedback('Reply sent successfully.', 'success');
      setShowReply(false);
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback('Failed to send reply. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendForward = async () => {
    const messageId = detailData?.id || selectedEmail?.id || selectedEmailId;
    const recipients = forwardTo
      .split(/[,\n;]/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (!messageId || recipients.length === 0) {
      showFeedback('Add at least one recipient to forward.', 'warning');
      return;
    }

    setForwarding(true);
    try {
      await gmailService.forwardEmail({ messageId, to: recipients, note: forwardNote.trim() });
      showFeedback('Email forwarded successfully.', 'success');
      setShowForward(false);
      setForwardTo('');
      setForwardNote('');
    } catch (error) {
      console.error('Failed to forward email:', error);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to forward email.', 'error');
    } finally {
      setForwarding(false);
    }
  };

  const parseSenderEmail = (value) => {
    const match = value?.match(/<([^>]+)>/);
    return (match ? match[1] : value || '').trim();
  };

  const parseSenderName = (value) => {
    if (!value) {
      return '';
    }

    const match = value.match(/^(.*)<.+>$/);
    const name = (match ? match[1] : value).trim();
    const cleaned = name.replace(/^"|"$/g, '');
    return cleaned.includes('@') ? '' : cleaned;
  };

  const splitName = (value) => {
    const parts = (value || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return { firstName: '', lastName: '' };
    }
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const handleAddToCrm = async () => {
    if (addingContact) {
      return;
    }

    const fromValue = detailData?.from || selectedEmail?.from || '';
    const emailAddress = parseSenderEmail(fromValue);
    const displayName = parseSenderName(fromValue);
    const { firstName, lastName } = splitName(displayName);

    if (!emailAddress) {
      showFeedback('No sender email found to add.', 'warning');
      return;
    }

    const leadStage = selectedEmail?.classification && selectedEmail.classification !== 'None'
      ? selectedEmail.classification
      : undefined;

    const contactPayload = {
      email: emailAddress,
      source: 'Inbox'
    };

    if (firstName) {
      contactPayload.firstName = firstName;
    }
    if (lastName) {
      contactPayload.lastName = lastName;
    }
    if (leadStage) {
      contactPayload.leadStage = leadStage;
    }

    setAddingContact(true);
    try {
      await gmailService.upsertContact(contactPayload);
      showFeedback('Contact added to CRM.', 'success');
    } catch (error) {
      console.error('Failed to add contact:', error);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to add contact to CRM.', 'error');
    } finally {
      setAddingContact(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    return (
      !searchTerm ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const decodeHtmlEntities = (text) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getTagClass = (classification) => {
    switch ((classification || '').toLowerCase()) {
      case 'lead':
        return 'tag-lead';
      case 'client':
        return 'tag-client';
      case 'follow up':
        return 'tag-followup';
      case 'potential client':
        return 'tag-potential';
      default:
        return 'tag-none';
    }
  };

  const getTagLabel = (classification) => {
    if (!classification || classification === 'None') {
      return 'None';
    }
    if (classification === 'Potential Client') {
      return 'Potential';
    }
    return classification;
  };

  const hasHtmlContent = (value) => /<\/?[a-z][\s\S]*>/i.test(value || '');

  const getEmailHtmlDocument = (value) => {
    const safeContent = value || '';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1f2937;
        background: #f7f9fc;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      body { padding: 14px; }
      img, video, canvas, svg {
        max-width: 100% !important;
        height: auto !important;
      }
      table {
        max-width: 100% !important;
        width: auto !important;
        display: block;
        overflow-x: auto;
      }
      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
      }
      a { color: #2563eb; }
    </style>
  </head>
  <body>${safeContent}</body>
</html>`;
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="fade-in">
      <div className="inbox-layout">
        <div className="inbox-sidebar">
          <div className="inbox-filters">
            <div className="search-box" style={{ width: '100%' }}>
              <Icon name="search" size={13} color="var(--text-3)" />
              <input placeholder="Search inbox" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {filterOptions.map((filter) => (
                <div
                  key={filter.value}
                  className={`filter-chip ${classificationFilter === filter.value ? 'active' : ''}`}
                  onClick={() => setClassificationFilter(filter.value)}
                >
                  {filter.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="topbar-btn" onClick={() => setShowBulkEmail(true)}>
                Quick Bulk
              </button>
              <button type="button" className="topbar-btn" onClick={() => navigate('/emails/bulk')}>
                Bulk Page
              </button>
              <button type="button" className="topbar-btn" onClick={() => fetchEmails(true)}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>Loading emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No emails found</p>
              <small>Try adjusting your search keyword</small>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                className={`email-item ${!email.isRead ? 'unread' : ''} ${String(selectedEmailId) === String(email.id) ? 'active' : ''}`}
                onClick={() => {
                  setSelectedEmailId(email.id);
                  navigate(`/email/${email.id}`);
                }}
              >
                {!email.isRead && <div className="unread-indicator" />}
                <div className="email-meta">
                  <div className="email-sender" style={{ paddingLeft: !email.isRead ? 8 : 0 }}>
                    {decodeHtmlEntities(email.from)}
                  </div>
                  <div className="email-time">{formatDate(email.date)}</div>
                </div>
                <div className="email-subject" style={{ paddingLeft: !email.isRead ? 8 : 0 }}>
                  {decodeHtmlEntities(email.subject || '(No Subject)')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: !email.isRead ? 8 : 0 }}>
                  <div className="email-snippet" style={{ flex: 1 }}>{decodeHtmlEntities(email.snippet || '')}</div>
                  <span className={`classification-tag ${getTagClass(email.classification)}`}>{getTagLabel(email.classification)}</span>
                </div>
              </div>
            ))
          )}

          {nextPageToken && (
            <div style={{ padding: '12px 16px' }}>
              <button type="button" className="topbar-btn" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {detailLoading && (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>Loading email detail...</p>
            </div>
          )}

          {!detailLoading && detailError && (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>{detailError}</p>
            </div>
          )}

          {!detailLoading && !detailError && (detailData || selectedEmail) && (
            <div className="email-detail">
              <div className="email-detail-header">
                <div className="email-subject-large">
                  {decodeHtmlEntities(detailData?.subject || selectedEmail?.subject || '(No Subject)')}
                </div>
                <div className="email-from-row">
                  <div className="sender-avatar">{decodeHtmlEntities(detailData?.from || selectedEmail?.from || 'A')[0]}</div>
                  <div className="sender-info">
                    <div className="name">{decodeHtmlEntities(detailData?.from || selectedEmail?.from || '')}</div>
                    <div className="addr">{detailData?.from || selectedEmail?.from || ''}</div>
                  </div>
                  <div className="crm-hint">
                    <Icon name="users" size={12} />
                    View in CRM
                  </div>
                </div>
                <div className="action-row">
                  <div
                    className="action-btn primary"
                    onClick={() => {
                      setShowForward(false);
                      setShowReply((prev) => !prev);
                    }}
                  >
                    <Icon name="mail" size={13} /> Reply
                  </div>
                  <div
                    className="action-btn"
                    onClick={() => {
                      setShowReply(false);
                      setShowForward((prev) => !prev);
                    }}
                  >
                    <Icon name="arrow" size={13} /> Forward
                  </div>
                  <div className="action-btn">
                    <Icon name="tag" size={13} /> Classify
                  </div>
                  <div className="action-btn" onClick={handleAddToCrm}>
                    <Icon name="users" size={13} /> {addingContact ? 'Adding...' : 'Add to CRM'}
                  </div>
                </div>
                <div style={{ marginTop: 16, maxWidth: 240 }}>
                  <label className="form-label">Classification</label>
                  <select
                    className="form-input"
                    value={selectedEmail?.classification || 'None'}
                    disabled={!selectedEmail || updatingClassification.has(selectedEmail.id)}
                    onChange={(event) => selectedEmail && handleUpdateClassification(selectedEmail.id, event.target.value)}
                  >
                    {classificationOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {detailData && hasHtmlContent(detailData.body) ? (
                <div className="email-body" style={{ padding: 10 }}>
                  <iframe
                    className="email-body-frame"
                    title="email-body"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={getEmailHtmlDocument(detailData.body)}
                  />
                </div>
              ) : (
                <div className="email-body">
                  {detailData?.body || selectedEmail?.snippet || 'No content'}
                </div>
              )}

              {showReply && (
                <div style={{ marginTop: 16 }}>
                  <label className="form-label">Reply</label>
                  <textarea
                    className="form-input"
                    rows="6"
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Type your reply"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="action-btn primary" onClick={handleSendReply} disabled={sending}>
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                    <button type="button" className="action-btn" onClick={() => setShowReply(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showForward && (
                <div style={{ marginTop: 16 }}>
                  <label className="form-label">Forward to</label>
                  <input
                    className="form-input"
                    value={forwardTo}
                    onChange={(event) => setForwardTo(event.target.value)}
                    placeholder="Add recipient emails"
                  />
                  <label className="form-label" style={{ marginTop: 12 }}>Note (optional)</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    value={forwardNote}
                    onChange={(event) => setForwardNote(event.target.value)}
                    placeholder="Add a short note"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="action-btn primary" onClick={handleSendForward} disabled={forwarding}>
                      {forwarding ? 'Forwarding...' : 'Send Forward'}
                    </button>
                    <button type="button" className="action-btn" onClick={() => setShowForward(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showBulkEmail && <BulkEmail mode="modal" onClose={() => setShowBulkEmail(false)} />}
    </div>
  );
};

export default EmailList;