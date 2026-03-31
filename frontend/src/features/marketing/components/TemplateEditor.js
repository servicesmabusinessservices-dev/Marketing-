import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import { gmailService } from '../../../services/gmailService';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import useUnsavedChangesWarning from '../../../hooks/useUnsavedChangesWarning';
import './TemplateEditor.css';

const TEMPLATE_AUTOSAVE_KEY = 'template_editor_draft';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const BLOCKS = [
  {
    id: 'intro',
    label: 'Intro',
    html: `<p style="margin:0 0 16px;">Hi {{firstName}},</p>
<p style="margin:0 0 16px;">I wanted to quickly share something useful for {{company}}.</p>`
  },
  {
    id: 'cta',
    label: 'CTA',
    html: `<p style="margin:20px 0;">
  <a href="https://example.com" style="display:inline-block;padding:12px 18px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Book a 15-min call</a>
</p>`
  },
  {
    id: 'signature',
    label: 'Signature',
    html: `<p style="margin:24px 0 0;">Best regards,<br /><strong>Your Name</strong><br />MA Business Services</p>`
  }
];

const MERGE_TAGS = {
  firstName: {
    name: 'First Name',
    value: '{{firstName}}'
  },
  lastName: {
    name: 'Last Name',
    value: '{{lastName}}'
  },
  company: {
    name: 'Company',
    value: '{{company}}'
  },
  email: {
    name: 'Email',
    value: '{{email}}'
  }
};

const parsedProjectId = Number.parseInt(import.meta.env.VITE_UNLAYER_PROJECT_ID || '', 10);
const UNLAYER_PROJECT_ID = Number.isFinite(parsedProjectId) ? parsedProjectId : undefined;

const TemplateEditor = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const htmlEditorRef = useRef(null);
  const emailEditorRef = useRef(null);
  const syncTimerRef = useRef(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('welcome');
  const [subject, setSubject] = useState('Welcome {{firstName}}');
  const [bodyHtml, setBodyHtml] = useState('');
  const [editorDesign, setEditorDesign] = useState(null);
  const [editorMode, setEditorMode] = useState('visual');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isSyncingHtml, setIsSyncingHtml] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(isDirty);

  const markDirty = useCallback(() => { if (!isDirty) setIsDirty(true); }, [isDirty]);

  const exportBuilderContent = useCallback(() => {
    const editor = emailEditorRef.current?.editor;

    if (!editor) {
      return Promise.resolve({ html: bodyHtml, design: editorDesign });
    }

    return new Promise((resolve) => {
      editor.exportHtml((data) => {
        resolve({ html: data?.html || '', design: data?.design || null });
      });
    });
  }, [bodyHtml, editorDesign]);

  const syncHtmlFromBuilder = useCallback(async ({ silent = false } = {}) => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    if (!silent) setIsSyncingHtml(true);

    try {
      const { html, design } = await exportBuilderContent();
      if (typeof html === 'string') setBodyHtml(html);
      if (design) setEditorDesign(design);
      if (!silent) showFeedback('Builder HTML synced.', 'success');
      markDirty();
    } catch {
      if (!silent) showFeedback('Could not sync HTML from builder.', 'error');
    } finally {
      if (!silent) setIsSyncingHtml(false);
    }
  }, [exportBuilderContent, markDirty, showFeedback]);

  const insertBlock = useCallback((snippet) => {
    const textarea = htmlEditorRef.current;
    if (!textarea) {
      setBodyHtml((prev) => `${prev}\n${snippet}`);
      markDirty();
      return;
    }

    const start = textarea.selectionStart ?? bodyHtml.length;
    const end = textarea.selectionEnd ?? bodyHtml.length;
    const before = bodyHtml.slice(0, start);
    const after = bodyHtml.slice(end);
    const next = `${before}${snippet}${after}`;
    setBodyHtml(next);
    markDirty();

    requestAnimationFrame(() => {
      const cursor = start + snippet.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [bodyHtml, markDirty]);

  const previewDoc = useMemo(() => {
    const inner = (bodyHtml || '').trim() || '<p style="color:#64748b;">Start writing your template...</p>';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;">
      ${inner}
    </div>
  </body>
</html>`;
  }, [bodyHtml]);

  // Restore autosaved draft on mount (with 24h expiry)
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATE_AUTOSAVE_KEY);
    if (!saved) return;

    try {
      const draft = JSON.parse(saved);
      if (draft.savedAt && (Date.now() - draft.savedAt) > DRAFT_EXPIRY_MS) {
        localStorage.removeItem(TEMPLATE_AUTOSAVE_KEY);
        return;
      }
      setName(draft.name ?? '');
      setCategory(draft.category ?? 'welcome');
      setSubject(draft.subject ?? '');
      setBodyHtml(draft.bodyHtml ?? '');
      setEditorDesign(draft.editorDesign ?? null);
      setEditorMode(draft.editorMode ?? 'visual');
    } catch {
      // ignore malformed draft
    }
  }, []);

  // Debounced autosave for template fields
  useEffect(() => {
    const payload = { name, category, subject, bodyHtml, editorDesign, editorMode, savedAt: Date.now() };
    const timer = setTimeout(() => {
      localStorage.setItem(TEMPLATE_AUTOSAVE_KEY, JSON.stringify(payload));
    }, 800);
    return () => clearTimeout(timer);
  }, [name, category, subject, bodyHtml, editorDesign, editorMode]);

  useEffect(() => () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
  }, []);

  const handleEditorReady = useCallback(() => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    if (editorDesign) {
      editor.loadDesign(editorDesign);
    }

    editor.addEventListener('design:updated', () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncHtmlFromBuilder({ silent: true });
      }, 1200);
    });

    setIsEditorReady(true);
  }, [editorDesign, syncHtmlFromBuilder]);

  const saveTemplate = async () => {
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
      let htmlToSave = bodyHtml;
      let designToSave = editorDesign;

      if (editorMode === 'visual' && isEditorReady) {
        const { html, design } = await exportBuilderContent();
        htmlToSave = html || bodyHtml;
        designToSave = design || editorDesign;
      }

      const payload = {
        name,
        category,
        subject,
        bodyHtml: htmlToSave,
        metadata: designToSave ? { unlayerDesign: designToSave } : undefined,
      };

      await gmailService.createTemplate(payload);
      localStorage.removeItem(TEMPLATE_AUTOSAVE_KEY);
      showFeedback('Template saved.', 'success');
      navigate('/marketing');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to save template.', 'error');
    } finally {
      setIsSaving(false);
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
              <input className="form-input" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} placeholder="Template name" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={(e) => { setCategory(e.target.value); markDirty(); }}>
                <option value="welcome">Welcome</option>
                <option value="follow-up">Follow-up</option>
                <option value="proposal">Proposal</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={subject} onChange={(e) => { setSubject(e.target.value); markDirty(); }} placeholder="Subject (supports {{firstName}}, {{company}})" />
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
          <div className="template-designer">
            <div className="template-designer-toolbar">
              <span className="template-designer-label">Mode</span>
              <button
                type="button"
                className={`topbar-btn ${editorMode === 'visual' ? 'primary' : ''}`}
                onClick={() => setEditorMode('visual')}
              >
                Visual Builder
              </button>
              <button
                type="button"
                className={`topbar-btn ${editorMode === 'html' ? 'primary' : ''}`}
                onClick={() => setEditorMode('html')}
              >
                HTML Editor
              </button>

              {editorMode === 'visual' && (
                <button
                  type="button"
                  className="topbar-btn"
                  onClick={() => syncHtmlFromBuilder()}
                  disabled={!isEditorReady || isSyncingHtml}
                >
                  {isSyncingHtml ? 'Syncing...' : 'Sync HTML'}
                </button>
              )}

              {editorMode === 'html' && BLOCKS.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className="topbar-btn"
                  onClick={() => insertBlock(block.html)}
                >
                  {block.label}
                </button>
              ))}
            </div>

            {editorMode === 'visual' ? (
              <div className="template-unlayer-shell">
                <EmailEditor
                  ref={emailEditorRef}
                  onReady={handleEditorReady}
                  minHeight="72vh"
                  options={{
                    ...(UNLAYER_PROJECT_ID ? { projectId: UNLAYER_PROJECT_ID } : {}),
                    appearance: {
                      theme: 'dark',
                      panels: {
                        tools: { dock: 'left' }
                      }
                    },
                    features: {
                      stockImages: true
                    },
                    mergeTags: MERGE_TAGS
                  }}
                />
              </div>
            ) : (
              <div className="template-designer-grid">
                <div className="template-designer-pane">
                  <div className="template-designer-pane-title">HTML</div>
                  <textarea
                    ref={htmlEditorRef}
                    className="form-input template-designer-editor"
                    value={bodyHtml}
                    onChange={(e) => { setBodyHtml(e.target.value); markDirty(); }}
                    placeholder="Paste or write your email HTML here..."
                  />
                </div>
                <div className="template-designer-pane">
                  <div className="template-designer-pane-title">Live Preview</div>
                  <iframe
                    title="Email Preview"
                    className="template-designer-preview"
                    srcDoc={previewDoc}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isBlocked}
        title="Unsaved Changes"
        message="You have unsaved template changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        tone="warning"
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </div>
  );
};

export default TemplateEditor;
