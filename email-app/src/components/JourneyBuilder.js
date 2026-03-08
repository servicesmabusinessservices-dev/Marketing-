import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';
import './JourneyBuilder.css';

const STEP_TYPES = [
  { value: 'send_email',    label: 'Send Email' },
  { value: 'advance_stage', label: 'Advance Stage' },
  { value: 'mark_client',   label: 'Mark as Client' },
  { value: 'emit_event',    label: 'Emit Event' }
];

const LEAD_STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];

const EVENT_TYPES = ['proposal_sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'];

let _uid = 0;
const makeStep = (order) => ({
  _id: ++_uid,
  stepOrder: order,
  stepType: 'send_email',
  delayMinutes: 0,
  templateId: '',
  conditionEventType: '',
  conditionWindowHours: '',
  toLeadStage: ''
});

const JourneyBuilder = () => {
  const { journeyId } = useParams();
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();

  const [journey, setJourney]     = useState(null);
  const [steps, setSteps]         = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [acting, setActing]       = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [journeyData, templatesData] = await Promise.all([
        gmailService.getJourneyById(journeyId),
        gmailService.getTemplates()
      ]);
      setJourney(journeyData.journey);
      const loaded = (journeyData.steps || []).map((s) => ({
        _id: ++_uid,
        stepOrder:           s.stepOrder,
        stepType:            s.stepType,
        delayMinutes:        s.delayMinutes ?? 0,
        templateId:          s.templateId || '',
        conditionEventType:  s.conditionEventType || '',
        conditionWindowHours: s.conditionWindowHours != null ? String(s.conditionWindowHours) : '',
        toLeadStage:         s.toLeadStage || ''
      }));
      setSteps(loaded.length > 0 ? loaded : [makeStep(1)]);
      setTemplates(templatesData.templates || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to load journey.', 'error');
    } finally {
      setLoading(false);
    }
  }, [journeyId, navigate, showFeedback]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStep = (id, field, value) =>
    setSteps((prev) => prev.map((s) => (s._id === id ? { ...s, [field]: value } : s)));

  const addStep = () => setSteps((prev) => [...prev, makeStep(prev.length + 1)]);

  const removeStep = (id) =>
    setSteps((prev) => {
      const filtered = prev.filter((s) => s._id !== id);
      return filtered.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    });

  const handleSaveSteps = async () => {
    if (steps.length === 0) {
      showFeedback('Add at least one step before saving.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = steps.map((s, i) => ({
        stepOrder:           i + 1,
        stepType:            s.stepType,
        delayMinutes:        parseInt(s.delayMinutes, 10) || 0,
        templateId:          s.templateId || null,
        conditionEventType:  s.conditionEventType || null,
        conditionWindowHours: s.conditionWindowHours ? parseInt(s.conditionWindowHours, 10) : null,
        toLeadStage:         s.toLeadStage || null
      }));
      await gmailService.upsertJourneySteps(journeyId, payload);
      showFeedback('Steps saved.', 'success');
      loadData();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to save steps.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setActing(true);
    try {
      await gmailService.publishJourney(journeyId);
      showFeedback('Journey published.', 'success');
      loadData();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to publish journey.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handlePause = async () => {
    setActing(true);
    try {
      await gmailService.pauseJourney(journeyId);
      showFeedback('Journey paused.', 'success');
      loadData();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to pause journey.', 'error');
    } finally {
      setActing(false);
    }
  };

  const statusClass = journey?.status === 'active' ? 'active'
    : journey?.status === 'paused' ? 'paused' : 'draft';

  if (loading) {
    return (
      <div className="content fade-in">
        <div className="empty-state" style={{ paddingTop: 60 }}><p>Loading journey…</p></div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="content fade-in">
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Journey not found.</p>
          <button className="topbar-btn" style={{ marginTop: 16 }} onClick={() => navigate('/marketing?tab=journeys')}>
            ← Back to Journeys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content fade-in">
      {/* Header */}
      <div className="jb-header">
        <button className="topbar-btn" onClick={() => navigate('/marketing?tab=journeys')} style={{ flexShrink: 0 }}>
          ← Journeys
        </button>
        <div className="jb-title-group">
          <div className="jb-name syne">{journey.name}</div>
          <div className="jb-meta">
            <span className="jb-trigger">{journey.triggerType}</span>
            <span className={`jb-status ${statusClass}`}>{journey.status || 'draft'}</span>
          </div>
        </div>
        <div className="jb-actions">
          <button className="topbar-btn primary" onClick={handleSaveSteps} disabled={saving}>
            {saving ? 'Saving…' : 'Save Steps'}
          </button>
          {journey.status !== 'active' ? (
            <button className="topbar-btn" onClick={handlePublish} disabled={acting}>
              {acting ? '…' : 'Publish'}
            </button>
          ) : (
            <button className="topbar-btn" onClick={handlePause} disabled={acting}>
              {acting ? '…' : 'Pause'}
            </button>
          )}
        </div>
      </div>

      {/* Steps card */}
      <div className="card">
        <div className="card-header">
          <Icon name="journey" size={14} color="var(--amber)" />
          <span className="card-title">Steps ({steps.length})</span>
          <span className="helper-text" style={{ marginLeft: 'auto', fontSize: 12 }}>
            Configure the sequence of actions for each enrolled contact.
          </span>
        </div>
        <div className="card-body">
          {steps.length === 0 ? (
            <div className="jb-empty">No steps yet. Add your first step below.</div>
          ) : (
            <div className="jb-canvas">
              {steps.map((step, index) => (
                <div key={step._id} className="jb-step-row">
                  <div className="jb-step-connector">
                    <div className={`jb-step-dot ${step.stepType}`} />
                    {index < steps.length - 1 && <div className="jb-step-line" />}
                  </div>
                  <div className="jb-step-card">
                    <div className="jb-step-top">
                      <span className="jb-step-num">#{index + 1}</span>
                      <select
                        className="form-input jb-step-type-select"
                        value={step.stepType}
                        onChange={(e) => updateStep(step._id, 'stepType', e.target.value)}
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <span className={`jb-type-badge ${step.stepType}`}>
                        {STEP_TYPES.find((t) => t.value === step.stepType)?.label}
                      </span>
                      <button
                        className="jb-step-remove"
                        onClick={() => removeStep(step._id)}
                        title="Remove step"
                      >✕</button>
                    </div>

                    <div className="jb-step-fields">
                      <div className="form-group">
                        <label className="form-label">Delay (minutes)</label>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          value={step.delayMinutes}
                          onChange={(e) => updateStep(step._id, 'delayMinutes', e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      {step.stepType === 'send_email' && (
                        <div className="form-group">
                          <label className="form-label">Template</label>
                          <select
                            className="form-input"
                            value={step.templateId}
                            onChange={(e) => updateStep(step._id, 'templateId', e.target.value)}
                          >
                            <option value="">Select template</option>
                            {templates.map((t) => (
                              <option key={t.templateId} value={t.templateId}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {step.stepType === 'advance_stage' && (
                        <div className="form-group">
                          <label className="form-label">Target Stage</label>
                          <select
                            className="form-input"
                            value={step.toLeadStage}
                            onChange={(e) => updateStep(step._id, 'toLeadStage', e.target.value)}
                          >
                            <option value="">Select stage</option>
                            {LEAD_STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {step.stepType === 'emit_event' && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Condition Event Type</label>
                            <select
                              className="form-input"
                              value={step.conditionEventType}
                              onChange={(e) => updateStep(step._id, 'conditionEventType', e.target.value)}
                            >
                              <option value="">No condition</option>
                              {EVENT_TYPES.map((et) => (
                                <option key={et} value={et}>{et}</option>
                              ))}
                            </select>
                          </div>
                          {step.conditionEventType && (
                            <div className="form-group">
                              <label className="form-label">Condition Window (hours)</label>
                              <input
                                className="form-input"
                                type="number"
                                min="1"
                                value={step.conditionWindowHours}
                                onChange={(e) => updateStep(step._id, 'conditionWindowHours', e.target.value)}
                                placeholder="e.g. 72"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="jb-add-btn" onClick={addStep}>
            <Icon name="plus" size={14} />
            Add Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default JourneyBuilder;
