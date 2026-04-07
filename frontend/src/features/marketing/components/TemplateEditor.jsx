import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import { gmailService } from '../../../services/gmailService';
import { useFeedback } from '../../../context/FeedbackContext';
import Icon from '../../../components/ui/Icon';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import './TemplateEditor.css';

/**
 * TemplateEditor - Visual email template builder using Unlayer editor
 * 
 * Features:
 * - Drag-and-drop email design
 * - Template variable support ({{firstName}}, {{company}}, etc.)
 * - Save templates to the backend
 * - Export HTML for campaigns
 */
const TemplateEditor = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const emailEditorRef = useRef(null);
  
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  /**
   * Called when the Unlayer editor has finished loading
   */
  const onReady = useCallback(() => {
    setEditorReady(true);
    showFeedback('Template editor loaded', 'success');
  }, [showFeedback]);

  /**
   * Export the current design as HTML
   */
  const handleExportHtml = useCallback(() => {
    if (!emailEditorRef.current?.editor) {
      showFeedback('Editor not ready yet', 'warning');
      return;
    }

    emailEditorRef.current.editor.exportHtml((data) => {
      const { design, html } = data;
      console.log('Exported HTML:', html);
      showFeedback('HTML exported to console', 'info');
    });
  }, [showFeedback]);

  /**
   * Save the current template design to the backend
   */
  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      showFeedback('Please enter a template name', 'warning');
      return;
    }

    if (!emailEditorRef.current?.editor) {
      showFeedback('Editor not ready yet', 'warning');
      return;
    }

    setIsSaving(true);
    
    try {
      emailEditorRef.current.editor.exportHtml(async (data) => {
        const { design, html } = data;
        
        // Save template with design JSON and HTML
        await gmailService.createTemplate({
          name: templateName,
          category: templateCategory,
          subject: `Email from ${templateName}`,
          bodyHtml: html,
          designJson: JSON.stringify(design), // Store design for future editing
        });

        showFeedback(`Template "${templateName}" saved successfully`, 'success');
        setTemplateName('');
        
        // Navigate back to templates tab after short delay
        setTimeout(() => {
          navigate('/marketing?tab=templates');
        }, 1500);
      });
    } catch (error) {
      showFeedback(
        error?.response?.data?.error || 'Failed to save template',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }, [templateName, templateCategory, showFeedback, navigate]);

  /**
   * Load a saved template design into the editor
   */
  const handleLoadTemplate = useCallback((designJson) => {
    if (!emailEditorRef.current?.editor) {
      showFeedback('Editor not ready yet', 'warning');
      return;
    }

    try {
      const design = JSON.parse(designJson);
      emailEditorRef.current.editor.loadDesign(design);
      showFeedback('Template loaded', 'success');
    } catch (error) {
      showFeedback('Failed to load template design', 'error');
    }
  }, [showFeedback]);

  return (
    <div className="template-editor-container">
      {/* Header with controls */}
      <div className="template-editor-header">
        <button
          className="btn-secondary"
          onClick={() => navigate('/marketing?tab=templates')}
          disabled={isSaving}
        >
          <Icon name="back" size={14} />
          Back to Templates
        </button>

        <div className="template-editor-controls">
          <input
            type="text"
            className="form-input"
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            disabled={isSaving}
          />
          
          <select
            className="form-input"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
            disabled={isSaving}
          >
            <option value="welcome">Welcome</option>
            <option value="follow-up">Follow-up</option>
            <option value="proposal">Proposal</option>
            <option value="reminder">Reminder</option>
            <option value="newsletter">Newsletter</option>
          </select>

          <button
            className="btn-secondary"
            onClick={handleExportHtml}
            disabled={!editorReady || isSaving}
          >
            <Icon name="code" size={14} />
            Export HTML
          </button>

          <button
            className="btn-primary"
            onClick={handleSaveTemplate}
            disabled={!editorReady || isSaving || !templateName.trim()}
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="check" size={14} />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unlayer Email Editor */}
      <div className="template-editor-canvas">
        {!editorReady && (
          <div className="template-editor-loading">
            <LoadingSpinner label="Loading editor..." />
          </div>
        )}
        
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{
            projectId: 123456, // Optional: Replace with your Unlayer project ID
            displayMode: 'email',
            appearance: {
              theme: 'dark',
              panels: {
                tools: {
                  dock: 'left'
                }
              }
            },
            features: {
              textEditor: {
                spellChecker: true
              }
            },
            mergeTags: {
              firstName: {
                name: 'First Name',
                value: '{{firstName}}',
                sample: 'John'
              },
              lastName: {
                name: 'Last Name',
                value: '{{lastName}}',
                sample: 'Doe'
              },
              company: {
                name: 'Company',
                value: '{{company}}',
                sample: 'Acme Corp'
              },
              email: {
                name: 'Email',
                value: '{{email}}',
                sample: 'john@example.com'
              }
            }
          }}
          style={{ height: 'calc(100vh - 120px)' }}
        />
      </div>
    </div>
  );
};

export default TemplateEditor;
  