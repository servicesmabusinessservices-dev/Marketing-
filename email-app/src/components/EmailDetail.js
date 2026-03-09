import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import './EmailDetail.css';

const EmailDetail = () => {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

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
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #1f2937;
        background: #f7f9fc;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      body {
        padding: 14px;
      }
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
      a {
        color: #2d63d8;
      }
      @media (prefers-color-scheme: dark) {
        html, body {
          color: #dbe6fb;
          background: #101b2b;
        }
        a {
          color: #8badff;
        }
      }
    </style>
  </head>
  <body>${safeContent}</body>
</html>`;
  };

  useEffect(() => {
    fetchEmailDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId]);

  const fetchEmailDetail = async () => {
    try {
      const data = await gmailService.getEmailById(emailId);
      setEmail(data);
    } catch (error) {
      console.error('Failed to fetch email:', error);
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
      }
    } finally {
      setLoading(false);
    }
  };

  const parseSender = (fromField) => {
    if (!fromField) return { email: '', firstName: '', lastName: '' };
    const match = fromField.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      const parts = match[1].trim().replace(/"/g, '').split(/\s+/);
      return { email: match[2].trim(), firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
    }
    return { email: fromField.trim(), firstName: '', lastName: '' };
  };

  const handleSaveSenderAsContact = async () => {
    const { email: senderEmail, firstName, lastName } = parseSender(email?.from);
    if (!senderEmail) return;
    setSavingContact(true);
    try {
      await gmailService.upsertContact({ email: senderEmail, firstName, lastName });
      setContactSaved(true);
      showFeedback(`${senderEmail} saved as contact.`, 'success');
    } catch (error) {
      showFeedback('Failed to save contact.', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    setSending(true);
    try {
      const toEmail = email.from.match(/<(.+?)>/)?.[1] || email.from;
      await gmailService.sendEmail([toEmail], `Re: ${email.subject}`, replyText);
      showFeedback('Reply sent successfully.', 'success');
      setShowReply(false);
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
      showFeedback('Failed to send reply. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="detail-loading">Loading email...</div>;
  if (!email) return <div className="detail-error">Email not found</div>;

  return (
    <div className="email-detail">
      <div className="top-bar">
        <button onClick={() => navigate('/emails')} className="back-btn">← Back</button>
      </div>
      
      <div className="email-container">
        <div className="detail-header">
          <h2>{email.subject || '(No Subject)'}</h2>
          <div className="email-meta">
            <div className="meta-item">
              <span className="meta-label">From:</span>
              <span className="meta-value">{email.from}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{email.date}</span>
            </div>
            {email.to && (
              <div className="meta-item">
                <span className="meta-label">To:</span>
                <span className="meta-value">{email.to}</span>
              </div>
            )}
            <div className="meta-item" style={{ marginTop: 8 }}>
              <button
                onClick={handleSaveSenderAsContact}
                disabled={savingContact || contactSaved}
                className="reply-btn"
                style={{ fontSize: 13, padding: '5px 14px' }}
              >
                {contactSaved ? '✓ Contact saved' : savingContact ? 'Saving…' : '+ Save sender as contact'}
              </button>
            </div>
          </div>
        </div>

        {hasHtmlContent(email.body) ? (
          <div className="email-body email-body-frame-wrapper">
            <iframe
              className="email-body-frame"
              title="email-body"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              srcDoc={getEmailHtmlDocument(email.body)}
            />
          </div>
        ) : (
          <pre className="email-body email-body-plain">{email.body || '(No content)'}</pre>
        )}

        <button onClick={() => setShowReply(!showReply)} className="reply-btn">
          {showReply ? 'Cancel Reply' : 'Reply'}
        </button>

        {showReply && (
          <div className="reply-section">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows="6"
            />
            <button onClick={handleSendReply} disabled={sending} className="send-btn">
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDetail;
