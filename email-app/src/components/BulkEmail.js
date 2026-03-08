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

  const [emails, setEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(1);
  const [isScheduling, setIsScheduling] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [suppressionSummary, setSuppressionSummary] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  useEffect(() => {
    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [suppressionData, tokenData] = await Promise.all([
          gmailService.getSuppressionSummary(),
          gmailService.getTokens()
        ]);
        setSuppressionSummary(suppressionData);
        setTokens(tokenData.tokens || []);
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
    const emailList = emails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email);

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
      const job = await gmailService.sendBulkEmail(emailList, subject, content, delayMinutes);
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
  const tokenList = tokens.map((token) => `{{${token}}}`);

  const bulkContent = (
    <div className={isPageMode ? 'content fade-in' : 'fade-in'}>
      <div className="bulk-layout">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <Icon name="bulk" size={14} color="var(--amber)" />
              <span className="card-title">Campaign Setup</span>
              {isPageMode && (
                <span style={{ marginLeft: 'auto' }}>
                  <button type="button" className="close-btn" onClick={handleClose}>
                    Back to Inbox
                  </button>
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Email Addresses (one per line)</label>
                <textarea
                  className="form-input"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="email1@example.com\nemail2@example.com\nemail3@example.com"
                  rows="6"
                />
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
                <label className="form-label">Delay Between Sends (minutes)</label>
                <input
                  className="form-input"
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  min="1"
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <Icon name="zap" size={14} color="var(--amber)" />
              <span className="card-title">Send Progress</span>
            </div>
            <div className="card-body">
              {jobStatus ? (
                <>
                  <div style={{ background: 'var(--navy-4)', borderRadius: 100, height: 6, marginBottom: 16, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, var(--amber), #f59e0b)',
                        borderRadius: 100,
                        transition: 'width 0.2s'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 32, fontFamily: 'Syne', fontWeight: 800, color: 'var(--text-1)', textAlign: 'center', marginBottom: 4 }}>
                    {progressLabel}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 20 }}>
                    {jobStatus === 'Completed' ? 'Complete' : 'Sending'}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: 24 }}>
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
              <Icon name="filter" size={14} color="var(--amber)" />
              <span className="card-title">Suppression Check</span>
            </div>
            <div className="card-body">
              {loadingMetadata ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <p>Loading suppression data...</p>
                </div>
              ) : suppressionSummary ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>{suppressionTotal} emails suppressed</span> - automatically excluded from this send.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    {suppressionBreakdown}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Suppression data unavailable.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Icon name="tag" size={14} color="var(--amber)" />
              <span className="card-title">Personalization Tokens</span>
            </div>
            <div className="card-body">
              {loadingMetadata ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <p>Loading tokens...</p>
                </div>
              ) : tokenList.length ? (
                tokenList.map((token) => (
                  <div
                    key={token}
                    style={{
                      background: 'var(--navy-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      marginBottom: 6,
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 12,
                      color: 'var(--amber)'
                    }}
                  >
                    {token}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
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
        <div style={{ padding: 20 }}>{bulkContent}</div>
      </div>
    </div>
  );
};

export default BulkEmail;