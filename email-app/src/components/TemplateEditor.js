import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';

const TemplateEditor = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const { showFeedback } = useFeedback();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('welcome');
  const [subject, setSubject] = useState('Welcome {{firstName}}');
  const [isSaving, setIsSaving] = useState(false);

  const saveTemplate = async () => {
    const editor = editorRef.current?.editor;
    if (!editor) {
      showFeedback('Editor is not ready.', 'warning');
      return;
    }

    if (!name.trim()) {
      showFeedback('Template name is required.', 'warning');
      return;
    }

    if (!subject.trim()) {
      showFeedback('Template subject is required.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      editor.exportHtml(async (data) => {
        try {
          const payload = {
            name,
            category,
            subject,
            bodyHtml: data.html,
            designJson: JSON.stringify(data.design)
          };

          await gmailService.createTemplate(payload);
          showFeedback('Template saved.', 'success');
          navigate('/marketing');
        } catch (error) {
          if (error.response?.status === 401) {
            handleUnauthorized(navigate, showFeedback);
            return;
          }
          showFeedback(error.response?.data?.error || 'Failed to save template.', 'error');
        } finally {
          setIsSaving(false);
        }
      });
    } catch {
      setIsSaving(false);
      showFeedback('Failed to export template HTML.', 'error');
    }
  };

  return (
    <div className="content fade-in">
      <div className="page-header-row">
        <div className="page-header-copy">
          <h1 className="page-title-inline">Template Block Editor</h1>
        </div>
        <div className="inline-actions">
          <button className="topbar-btn" onClick={() => navigate('/marketing')}>Back</button>
          <button className="topbar-btn primary" onClick={saveTemplate} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="card page-card-stack">
        <div className="card-header">
          <Icon name="template" size={14} color="var(--accent-primary)" />
          <span className="card-title">Template Details</span>
        </div>
        <div className="card-body">
          <div className="card-form-grid">
            <div className="form-group">
              <label className="form-label">Template name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="welcome">Welcome</option>
                <option value="follow-up">Follow-up</option>
                <option value="proposal">Proposal</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (supports {{firstName}}, {{company}})" />
          </div>
          <div className="helper-text">
            Use personalization tokens: {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'}, {'{{email}}'}
          </div>
        </div>
      </div>

      <div className="card page-card-stack">
        <div className="card-header">
          <Icon name="mail" size={14} color="var(--accent-primary)" />
          <span className="card-title">Email Builder</span>
        </div>
        <div className="card-body card-body-flush">
          <EmailEditor ref={editorRef} minHeight="70vh" />
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
