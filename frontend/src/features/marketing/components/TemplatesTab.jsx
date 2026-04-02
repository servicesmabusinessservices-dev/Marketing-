import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../../../services/gmailService';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { useTemplates } from '../../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const TemplatesTab = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const templatesQuery = useTemplates({ category: templateCategoryFilter });
  const templates = templatesQuery.data?.templates || [];

  const [templateForm, setTemplateForm] = useState({
    name: '', category: 'welcome', subject: '',
    bodyHtml: '<p>Hi {{firstName}},</p><p>Quick update for {{company}}.</p>'
  });
  const [previewResult, setPreviewResult] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const handlePreviewTemplate = () => {
    let preview = templateForm.bodyHtml;
    preview = preview.replace(/{{firstName}}/g, 'Jane');
    preview = preview.replace(/{{lastName}}/g, 'Doe');
    preview = preview.replace(/{{company}}/g, 'Acme Corp');
    preview = preview.replace(/{{email}}/g, 'jane@acme.com');
    setPreviewResult(preview);
  };

  const handleCreateTemplate = async (event) => {
    event.preventDefault();
    if (!templateForm.name.trim()) { showFeedback('Template name is required.', 'warning'); return; }
    try {
      await gmailService.createTemplate(templateForm);
      setTemplateForm({ name: '', category: 'welcome', subject: '', bodyHtml: '<p>Hi {{firstName}},</p><p>Quick update for {{company}}.</p>' });
      setPreviewResult('');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showFeedback('Template created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create template.', 'error');
    }
  };

  const handleDeleteTemplate = async (template) => {
    const id = template.templateId || template.TemplateId;
    const name = template.name || template.Name;
    if (!window.confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    try {
      await gmailService.deleteTemplate(id);
      showFeedback('Template deleted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to delete template.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (templatesQuery.isLoading) return <LoadingSpinner label="Loading templates..." />;
  if (templatesQuery.isError) return (
    <EmptyState icon="template" title="Failed to load templates" action={{ label: 'Retry', onClick: () => templatesQuery.refetch() }} />
  );

  return (
    <section className="card" id="marketing-templates">
      <div className="card-header">
        <Icon name="template" size={14} color="var(--purple)" />
        <span className="card-title">Templates ({templates.length})</span>
        <select className="form-input ml-auto marketing-template-filter" value={templateCategoryFilter} onChange={(e) => setTemplateCategoryFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="welcome">Welcome</option>
          <option value="follow-up">Follow-up</option>
          <option value="proposal">Proposal</option>
          <option value="reminder">Reminder</option>
        </select>
      </div>
      <div className="card-body">
        <form onSubmit={handleCreateTemplate}>
          <div className="form-group">
            <label className="form-label">Template name</label>
            <input className="form-input" placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}>
              <option value="welcome">Welcome</option>
              <option value="follow-up">Follow-up</option>
              <option value="proposal">Proposal</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject with tokens</label>
            <input className="form-input" placeholder="Subject with tokens" value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">HTML Body</label>
            <textarea className="form-input" placeholder="HTML body with tokens like {{firstName}} and {{company}}" value={templateForm.bodyHtml} onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })} />
          </div>
          <div className="inline-actions">
            <button type="submit" className="topbar-btn primary">Create Template</button>
            <button type="button" className="topbar-btn" onClick={handlePreviewTemplate}>Preview Tokens</button>
            <button type="button" className="topbar-btn" onClick={() => navigate('/marketing/template-editor')}>Block Editor</button>
          </div>
        </form>
        {previewResult && <pre className="preview-box">{previewResult}</pre>}

        {templates.length === 0 ? (
          <EmptyState icon="template" title="No templates yet" subtitle="Create one above." size="sm" />
        ) : (
          <div className="data-list marketing-list-gap">
            {templates.map((template) => {
              const id = template.templateId || template.TemplateId;
              const name = template.name || template.Name;
              const subject = template.subject || template.Subject || '';
              const category = template.category || template.Category;
              return (
                <div key={id} className="data-list-item marketing-item-start">
                  <div className="marketing-flex-main">
                    <div className="marketing-item-meta-row">
                      <strong>{name}</strong>
                      <span className="marketing-meta-pill">{category}</span>
                    </div>
                    {subject && <div className="marketing-subject-line">Subject: {subject}</div>}
                  </div>
                  <button
                    type="button"
                    className="topbar-btn topbar-btn-danger marketing-no-shrink"
                    onClick={() => handleDeleteTemplate(template)}
                    disabled={deletingId === id}
                  >
                    {deletingId === id ? '...' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TemplatesTab;
