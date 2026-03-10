import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gmailService } from '../services/gmailService';
import { useFeedback } from '../context/FeedbackContext';
import Icon from './ui/Icon';
import {
  useContacts, useLists, useTemplates, useCampaigns, useJourneys
} from '../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const Marketing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  // This state must come before the query that consumes it
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');

  const contactsQuery  = useContacts({ limit: 1000 });
  const listsQuery     = useLists();
  const templatesQuery = useTemplates({ category: templateCategoryFilter });
  const campaignsQuery = useCampaigns();
  const journeysQuery  = useJourneys();

  const contacts  = contactsQuery.data?.contacts  || [];
  const lists     = listsQuery.data?.lists         || [];
  const templates = templatesQuery.data?.templates || [];
  const campaigns = campaignsQuery.data?.campaigns || [];
  const journeys  = journeysQuery.data?.journeys   || [];
  const loading   = [contactsQuery, listsQuery, templatesQuery, campaignsQuery, journeysQuery].some((q) => q.isLoading);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
    queryClient.invalidateQueries({ queryKey: ['templates'] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['journeys'] });
  };

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
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [contactSourceFilter, setContactSourceFilter] = useState('all');
  const [contactSearch, setContactSearch] = useState('');
  const [addingToList, setAddingToList] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
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
      queryClient.invalidateQueries({ queryKey: ['lists'] });
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
      queryClient.invalidateQueries({ queryKey: ['templates'] });
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
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
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
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
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
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
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
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      showFeedback(action === 'publish' ? 'Journey published.' : 'Journey paused.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to update journey status.', 'error');
    }
  };

  const handleAddToList = async (listId) => {
    if (!selectedContactIds.size || !listId) return;
    setAddingToList(true);
    try {
      const result = await gmailService.addContactsToList(listId, [...selectedContactIds]);
      const listName = lists.find(l => l.listId === listId)?.name || 'list';
      showFeedback(`Added ${result.added} contact(s) to "${listName}".`, 'success');
      setSelectedContactIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add contacts to list.', 'error');
    } finally {
      setAddingToList(false);
    }
  };

  const handleSendCampaign = async (campaign) => {
    if (!campaign.listId && !campaign.ListId) { showFeedback('Assign a list to this campaign first.', 'warning'); return; }
    if (!campaign.templateId && !campaign.TemplateId) { showFeedback('Assign a template to this campaign first.', 'warning'); return; }
    const id = campaign.campaignId || campaign.CampaignId;
    if (!window.confirm(`Send campaign "${campaign.name || campaign.Name}" now to all list members?`)) return;
    setSendingCampaignId(id);
    try {
      const result = await gmailService.sendCampaign(id);
      showFeedback(`Campaign queued! Sending to ${result.totalRecipients} recipient(s).`, 'success');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to send campaign.', 'error');
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    const id = campaign.campaignId || campaign.CampaignId;
    const name = campaign.name || campaign.Name;
    if (!window.confirm(`Delete campaign "${name}"?`)) return;
    setDeletingId(id);
    try {
      await gmailService.deleteCampaign(id);
      showFeedback('Campaign deleted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to delete campaign.', 'error');
    } finally {
      setDeletingId(null);
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

  const handleDeleteList = async (list) => {
    const id = list.listId || list.ListId;
    const name = list.name || list.Name;
    if (!window.confirm(`Delete list "${name}" and remove all its members?`)) return;
    setDeletingId(id);
    try {
      await gmailService.deleteList(id);
      showFeedback('List deleted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to delete list.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const uniqueSources = [...new Set(contacts.map(c => c.source || c.Source).filter(Boolean))];
  const filteredContacts = contacts.filter(c => {
    const src = c.source || c.Source || '';
    const matchesSource = contactSourceFilter === 'all' || src === contactSourceFilter;
    const matchesSearch = !contactSearch ||
      (c.email || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
      `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(contactSearch.toLowerCase());
    return matchesSource && matchesSearch;
  });
  const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.contactId));
  const toggleContact = (id) => setSelectedContactIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedContactIds(prev => { const n = new Set(prev); filteredContacts.forEach(c => n.delete(c.contactId)); return n; });
    } else {
      setSelectedContactIds(prev => { const n = new Set(prev); filteredContacts.forEach(c => n.add(c.contactId)); return n; });
    }
  };

  return (
    <div className="content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="syne" style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-1)' }}>Marketing Workspace</div>
          <div className="helper-text">Templates, campaigns, and automation journeys.</div>
        </div>
        <button className="topbar-btn" onClick={refreshAll}>Refresh Data</button>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <select
                  className="form-input"
                  value={contactSourceFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContactSourceFilter(val);
                    if (val !== 'all') {
                      setSelectedContactIds(new Set(contacts.filter(c => (c.source || c.Source) === val).map(c => c.contactId)));
                    }
                  }}
                  style={{ maxWidth: 164 }}
                >
                  <option value="all">All sources</option>
                  {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {selectedContactIds.size > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', background: 'var(--accent-soft)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {selectedContactIds.size} selected
                  </span>
                  <select
                    className="form-input"
                    style={{ maxWidth: 210 }}
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) { handleAddToList(e.target.value); e.target.value = ''; } }}
                    disabled={addingToList || !lists.length}
                  >
                    <option value="" disabled>
                      {addingToList ? 'Adding…' : lists.length ? 'Add to list…' : 'Create a list first'}
                    </option>
                    {lists.map(l => <option key={l.listId} value={l.listId}>{l.name}</option>)}
                  </select>
                  <button type="button" className="topbar-btn" onClick={() => setSelectedContactIds(new Set())}>Clear</button>
                </div>
              )}

              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ width: 32, padding: '6px 8px', textAlign: 'center' }}>
                        <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>Company</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>Stage</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600 }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.slice(0, 200).map((contact) => (
                      <tr
                        key={contact.contactId}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedContactIds.has(contact.contactId) ? 'var(--accent-soft)' : 'transparent' }}
                        onClick={() => navigate(`/marketing/contacts/${contact.contactId}`)}
                      >
                        <td style={{ padding: '6px 8px', textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleContact(contact.contactId); }}>
                          <input type="checkbox" checked={selectedContactIds.has(contact.contactId)} onChange={() => toggleContact(contact.contactId)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-1)', fontWeight: 500 }}>{contact.firstName || ''} {contact.lastName || ''}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-2)' }}>{contact.email}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-2)' }}>{contact.company || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--navy-4)', color: 'var(--text-3)' }}>{contact.leadStage || 'New'}</span>
                        </td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-3)', fontSize: 11 }}>{contact.source || contact.Source || '—'}</td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)' }}>No contacts found</td></tr>
                    )}
                  </tbody>
                </table>
                {filteredContacts.length > 200 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>
                    Showing 200 of {filteredContacts.length} — use search or source filter to narrow down.
                  </div>
                )}
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
                {lists.map((list) => {
                  const id = list.listId || list.ListId;
                  const name = list.name || list.Name;
                  const count = list.memberCount ?? 0;
                  return (
                    <div key={id} className="data-list-item" style={{ alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: 'var(--text-1)' }}>{name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{count} member{count !== 1 ? 's' : ''}</div>
                      </div>
                      <button
                        type="button"
                        className="topbar-btn"
                        style={{ color: 'var(--red, #ef4444)', marginLeft: 'auto' }}
                        onClick={() => handleDeleteList(list)}
                        disabled={deletingId === id}
                      >
                        {deletingId === id ? '…' : 'Delete'}
                      </button>
                    </div>
                  );
                })}
                {lists.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>No lists yet. Create one above.</div>}
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
                {templates.map((template) => {
                  const id = template.templateId || template.TemplateId;
                  const name = template.name || template.Name;
                  const subject = template.subject || template.Subject || '';
                  const category = template.category || template.Category;
                  return (
                    <div key={id} className="data-list-item" style={{ alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text-1)' }}>{name}</strong>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--navy-4)', color: 'var(--text-3)' }}>{category}</span>
                        </div>
                        {subject && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Subject: {subject}</div>}
                      </div>
                      <button
                        type="button"
                        className="topbar-btn"
                        style={{ color: 'var(--red, #ef4444)', flexShrink: 0 }}
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={deletingId === id}
                      >
                        {deletingId === id ? '…' : 'Delete'}
                      </button>
                    </div>
                  );
                })}
                {templates.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>No templates yet. Create one above.</div>}
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
                {campaigns.map((campaign) => {
                  const id = campaign.campaignId || campaign.CampaignId;
                  const name = campaign.name || campaign.Name;
                  const status = campaign.status || campaign.Status || 'Draft';
                  const linkedList = lists.find(l => (l.listId || l.ListId) === (campaign.listId || campaign.ListId));
                  const linkedTemplate = templates.find(t => (t.templateId || t.TemplateId) === (campaign.templateId || campaign.TemplateId));
                  const isSending = sendingCampaignId === id;
                  const isDeleting = deletingId === id;
                  const canSend = (campaign.listId || campaign.ListId) && (campaign.templateId || campaign.TemplateId) && status !== 'Sent';
                  return (
                    <div key={id} className="data-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ color: 'var(--text-1)' }}>{name}</strong>
                          <span style={{ fontSize: 10, marginLeft: 8, padding: '1px 7px', borderRadius: 20,
                            background: status === 'Sent' ? 'rgba(34,197,94,0.12)' : 'var(--navy-4)',
                            color: status === 'Sent' ? '#16a34a' : 'var(--text-3)' }}>{status}</span>
                        </div>
                        <div className="inline-actions">
                          {canSend && (
                            <button type="button" className="topbar-btn primary" onClick={() => handleSendCampaign(campaign)} disabled={isSending || isDeleting}>
                              {isSending ? 'Sending…' : 'Send Now'}
                            </button>
                          )}
                          <button type="button" className="topbar-btn" style={{ color: 'var(--red, #ef4444)' }} onClick={() => handleDeleteCampaign(campaign)} disabled={isSending || isDeleting}>
                            {isDeleting ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
                        <span>List: {linkedList ? (linkedList.name || linkedList.Name) : <em style={{ color: 'var(--orange, #f97316)' }}>None — assign one</em>}</span>
                        <span>Template: {linkedTemplate ? (linkedTemplate.name || linkedTemplate.Name) : <em style={{ color: 'var(--orange, #f97316)' }}>None — assign one</em>}</span>
                      </div>
                    </div>
                  );
                })}
                {campaigns.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>No campaign drafts yet. Create one above.</div>}
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
