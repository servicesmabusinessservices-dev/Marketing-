import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import { handleUnauthorized } from '../utils/session';
import Icon from './ui/Icon';

const Marketing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showFeedback } = useFeedback();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [previewResult, setPreviewResult] = useState('');

  const [contactForm, setContactForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    leadStage: 'New'
  });

  const [listForm, setListForm] = useState({ name: '', description: '' });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'welcome',
    subject: '',
    bodyHtml: '<p>Hi {{firstName}},</p><p>Quick update for {{company}}.</p>'
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    listId: '',
    templateId: ''
  });

  const [journeyForm, setJourneyForm] = useState({
    name: '',
    triggerType: 'new_lead',
    triggerRefId: ''
  });
  const [selectedEventContactId, setSelectedEventContactId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('proposal_sent');

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvForm, setCsvForm] = useState({ csvContent: '', hasHeader: true, delimiter: ',', source: 'csv_import' });
  const [csvImporting, setCsvImporting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [contactsData, listsData, templatesData, campaignsData, journeysData] = await Promise.all([
        gmailService.getContacts({ limit: 100 }),
        gmailService.getLists(),
        gmailService.getTemplates({ category: templateCategoryFilter }),
        gmailService.getCampaigns(),
        gmailService.getJourneys()
      ]);

      setContacts(contactsData.contacts || []);
      setLists(listsData.lists || []);
      setTemplates(templatesData.templates || []);
      setCampaigns(campaignsData.campaigns || []);
      setJourneys(journeysData.journeys || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized(navigate, showFeedback);
        return;
      }
      showFeedback(error.response?.data?.error || 'Failed to load marketing data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateCategoryFilter]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab || loading) {
      return;
    }

    const target = document.getElementById(`marketing-${tab}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams, loading]);

  const handleCreateContact = async (event) => {
    event.preventDefault();
    if (!contactForm.email.trim()) {
      showFeedback('Email is required.', 'warning');
      return;
    }

    try {
      await gmailService.upsertContact(contactForm);
      setContactForm({ email: '', firstName: '', lastName: '', company: '', leadStage: 'New' });
      fetchAll();
      showFeedback('Contact saved.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to save contact.', 'error');
    }
  };

  const handleCreateList = async (event) => {
    event.preventDefault();
    if (!listForm.name.trim()) {
      showFeedback('List name is required.', 'warning');
      return;
    }

    try {
      await gmailService.createList(listForm);
      setListForm({ name: '', description: '' });
      fetchAll();
      showFeedback('List created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create list.', 'error');
    }
  };

  const handleCreateTemplate = async (event) => {
    event.preventDefault();
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.bodyHtml.trim()) {
      showFeedback('Template name, subject, and body are required.', 'warning');
      return;
    }

    try {
      await gmailService.createTemplate({
        name: templateForm.name,
        category: templateForm.category,
        subject: templateForm.subject,
        bodyHtml: templateForm.bodyHtml
      });
      setTemplateForm({
        name: '',
        category: templateForm.category,
        subject: '',
        bodyHtml: '<p>Hi {{firstName}},</p><p>Quick update for {{company}}.</p>'
      });
      fetchAll();
      showFeedback('Template created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create template.', 'error');
    }
  };

  const handlePreviewTemplate = async () => {
    if (!templateForm.subject.trim() || !templateForm.bodyHtml.trim()) {
      showFeedback('Subject and body are required for preview.', 'warning');
      return;
    }

    try {
      const result = await gmailService.previewTemplate({
        subject: templateForm.subject,
        bodyHtml: templateForm.bodyHtml
      });
      setPreviewResult(`${result.subject}\n\n${result.bodyHtml}`);
    } catch (error) {
      const unresolved = error.response?.data?.unresolvedTokens;
      if (Array.isArray(unresolved) && unresolved.length > 0) {
        showFeedback(`Unresolved tokens: ${unresolved.join(', ')}`, 'warning');
        return;
      }
      showFeedback(error.response?.data?.error || 'Template preview failed.', 'error');
    }
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.name.trim()) {
      showFeedback('Campaign name is required.', 'warning');
      return;
    }

    try {
      await gmailService.createCampaignDraft(campaignForm);
      setCampaignForm({ name: '', description: '', listId: '', templateId: '' });
      fetchAll();
      showFeedback('Campaign draft created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create campaign draft.', 'error');
    }
  };

  const handleCreateJourney = async (event) => {
    event.preventDefault();
    if (!journeyForm.name.trim()) {
      showFeedback('Journey name is required.', 'warning');
      return;
    }

    try {
      await gmailService.createJourney(journeyForm);
      setJourneyForm({ name: '', triggerType: 'new_lead', triggerRefId: '' });
      fetchAll();
      showFeedback('Journey created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create journey.', 'error');
    }
  };

  const handleLogBehaviorEvent = async () => {
    if (!selectedEventContactId) {
      showFeedback('Select a contact first.', 'warning');
      return;
    }

    try {
      await gmailService.createEvent({
        eventType: selectedEventType,
        contactId: selectedEventContactId
      });
      showFeedback('Event logged.', 'success');
      fetchAll();
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to log event.', 'error');
    }
  };

  const handleCsvImport = async (event) => {
    event.preventDefault();
    if (!csvForm.csvContent.trim()) {
      showFeedback('Paste CSV content first.', 'warning');
      return;
    }
    setCsvImporting(true);
    try {
      const result = await gmailService.importContactsCsv(csvForm);
      setCsvForm({ csvContent: '', hasHeader: true, delimiter: ',', source: 'csv_import' });
      setShowCsvImport(false);
      fetchAll();
      showFeedback(`Imported ${result.imported ?? 0} contacts.`, 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Import failed.', 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleJourneyStatus = async (journey, action) => {
    try {
      if (action === 'publish') {
        await gmailService.publishJourney(journey.journeyId);
      } else {
        await gmailService.pauseJourney(journey.journeyId);
      }
      fetchAll();
      showFeedback(action === 'publish' ? 'Journey published.' : 'Journey paused.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update journey status.', 'error');
    }
  };

  return (
    <div className="content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="syne" style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-1)' }}>Marketing Workspace</div>
          <div className="helper-text">Templates, campaigns, and automation journeys.</div>
        </div>
        <button className="topbar-btn" onClick={fetchAll}>Refresh Data</button>
      </div>

      {loading ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Loading marketing data...</p>
        </div>
      ) : (
        <div className="page-grid">
          <section className="card" id="marketing-contacts">
            <div className="card-header">
              <Icon name="users" size={14} color="var(--accent-primary)" />
              <span className="card-title">Contacts ({contacts.length})</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateContact}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div className="card-form-grid">
                  <div className="form-group">
                    <label className="form-label">First name</label>
                    <input className="form-input" placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last name</label>
                    <input className="form-input" placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" placeholder="Company" value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Stage</label>
                  <select className="form-input" value={contactForm.leadStage} onChange={(e) => setContactForm({ ...contactForm, leadStage: e.target.value })}>
                    <option value="New">New</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <button type="submit" className="topbar-btn primary">Save Contact</button>
              </form>
              <div className="data-list" style={{ marginTop: 16 }}>
                {contacts.slice(0, 8).map((contact) => (
                  <div
                    key={contact.contactId}
                    className="data-list-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/marketing/contacts/${contact.contactId}`)}
                  >
                    <strong>{contact.firstName || contact.email}</strong>
                    <span>{contact.email}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="topbar-btn"
                  onClick={() => setShowCsvImport(!showCsvImport)}
                >
                  <Icon name="upload" size={13} /> CSV Import
                </button>
                {showCsvImport && (
                  <form
                    onSubmit={handleCsvImport}
                    style={{ marginTop: 10, padding: 14, background: 'var(--glass-2)', borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <div className="form-group">
                      <label className="form-label">CSV Content</label>
                      <textarea
                        className="form-input"
                        rows={5}
                        placeholder="email,firstName,lastName,company,..."
                        value={csvForm.csvContent}
                        onChange={(e) => setCsvForm({ ...csvForm, csvContent: e.target.value })}
                      />
                    </div>
                    <div className="card-form-grid">
                      <div className="form-group">
                        <label className="form-label">Delimiter</label>
                        <select
                          className="form-input"
                          value={csvForm.delimiter}
                          onChange={(e) => setCsvForm({ ...csvForm, delimiter: e.target.value })}
                        >
                          <option value=",">Comma (,)</option>
                          <option value=";">Semicolon (;)</option>
                          <option value="&#9;">Tab</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Source tag</label>
                        <input
                          className="form-input"
                          value={csvForm.source}
                          onChange={(e) => setCsvForm({ ...csvForm, source: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="inline-actions" style={{ marginTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
                        <input
                          type="checkbox"
                          checked={csvForm.hasHeader}
                          onChange={(e) => setCsvForm({ ...csvForm, hasHeader: e.target.checked })}
                        />
                        First row is header
                      </label>
                      <button type="submit" className="topbar-btn primary" disabled={csvImporting}>
                        {csvImporting ? 'Importing…' : 'Import'}
                      </button>
                      <button type="button" className="topbar-btn" onClick={() => setShowCsvImport(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section className="card" id="marketing-lists">
            <div className="card-header">
              <Icon name="list" size={14} color="var(--blue)" />
              <span className="card-title">Lists ({lists.length})</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateList}>
                <div className="form-group">
                  <label className="form-label">List name</label>
                  <input className="form-input" placeholder="List name" value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="Description" value={listForm.description} onChange={(e) => setListForm({ ...listForm, description: e.target.value })} />
                </div>
                <button type="submit" className="topbar-btn primary">Create List</button>
              </form>
              <div className="data-list" style={{ marginTop: 16 }}>
                {lists.slice(0, 8).map((list) => (
                  <div key={list.listId} className="data-list-item">
                    <strong>{list.name}</strong>
                    <span>{list.memberCount || 0} members</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card" id="marketing-templates">
            <div className="card-header">
              <Icon name="template" size={14} color="var(--purple)" />
              <span className="card-title">Templates ({templates.length})</span>
              <select className="form-input" style={{ marginLeft: 'auto', maxWidth: 160 }} value={templateCategoryFilter} onChange={(e) => setTemplateCategoryFilter(e.target.value)}>
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
              <div className="data-list" style={{ marginTop: 16 }}>
                {templates.slice(0, 8).map((template) => (
                  <div key={template.templateId} className="data-list-item">
                    <strong>{template.name}</strong>
                    <span>{template.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card" id="marketing-campaigns">
            <div className="card-header">
              <Icon name="campaign" size={14} color="var(--indigo)" />
              <span className="card-title">Campaign Drafts ({campaigns.length})</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label className="form-label">Campaign name</label>
                  <input className="form-input" placeholder="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="Description" value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Select list target</label>
                  <select className="form-input" value={campaignForm.listId} onChange={(e) => setCampaignForm({ ...campaignForm, listId: e.target.value })}>
                    <option value="">Select list target</option>
                    {lists.map((list) => <option key={list.listId} value={list.listId}>{list.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select template</label>
                  <select className="form-input" value={campaignForm.templateId} onChange={(e) => setCampaignForm({ ...campaignForm, templateId: e.target.value })}>
                    <option value="">Select template</option>
                    {templates.map((template) => <option key={template.templateId} value={template.templateId}>{template.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="topbar-btn primary">Create Campaign Draft</button>
              </form>
              <div className="data-list" style={{ marginTop: 16 }}>
                {campaigns.slice(0, 8).map((campaign) => (
                  <div key={campaign.campaignId} className="data-list-item">
                    <strong>{campaign.name}</strong>
                    <span>{campaign.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card page-grid-wide" id="marketing-journeys">
            <div className="card-header">
              <Icon name="journey" size={14} color="#a78bfa" />
              <span className="card-title">Automation Journeys ({journeys.length})</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateJourney}>
                <div className="card-form-grid">
                  <div className="form-group">
                    <label className="form-label">Journey name</label>
                    <input className="form-input" placeholder="Journey name" value={journeyForm.name} onChange={(e) => setJourneyForm({ ...journeyForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trigger type</label>
                    <select className="form-input" value={journeyForm.triggerType} onChange={(e) => setJourneyForm({ ...journeyForm, triggerType: e.target.value })}>
                      <option value="new_lead">Trigger: New Lead</option>
                      <option value="proposal_sent">Trigger: Proposal Sent</option>
                      <option value="no_reply_3d">Trigger: No Reply in 3 Days</option>
                      <option value="opened">Trigger: Email Opened</option>
                      <option value="clicked">Trigger: Email Clicked</option>
                      <option value="replied">Trigger: Replied</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Trigger list</label>
                  <select className="form-input" value={journeyForm.triggerRefId} onChange={(e) => setJourneyForm({ ...journeyForm, triggerRefId: e.target.value })}>
                    <option value="">Select trigger list</option>
                    {lists.map((list) => <option key={list.listId} value={list.listId}>{list.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="topbar-btn primary">Create Journey</button>
              </form>

              <div className="data-list" style={{ marginTop: 16 }}>
                {journeys.map((journey) => (
                  <div key={journey.journeyId} className="data-list-item" style={{ alignItems: 'center' }}>
                    <strong>{journey.name}</strong>
                    <div className="inline-actions">
                      <span className="helper-text">{journey.status}</span>
                      <button className="topbar-btn" type="button" onClick={() => navigate(`/marketing/journeys/${journey.journeyId}`)}>Build Steps</button>
                      <button className="topbar-btn" type="button" onClick={() => handleJourneyStatus(journey, 'publish')}>Publish</button>
                      <button className="topbar-btn" type="button" onClick={() => handleJourneyStatus(journey, 'pause')}>Pause</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
              <div className="syne" style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Behavior Event Tester</div>
              <div className="inline-actions">
                <select className="form-input" value={selectedEventContactId} onChange={(e) => setSelectedEventContactId(e.target.value)}>
                  <option value="">Select contact</option>
                  {contacts.map((contact) => <option key={contact.contactId} value={contact.contactId}>{contact.email}</option>)}
                </select>
                <select className="form-input" value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}>
                  <option value="proposal_sent">proposal_sent</option>
                  <option value="opened">opened</option>
                  <option value="clicked">clicked</option>
                  <option value="replied">replied</option>
                </select>
                <button type="button" className="topbar-btn" onClick={handleLogBehaviorEvent}>Log Event</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Marketing;
