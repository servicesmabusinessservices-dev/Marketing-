import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmailService } from '../../services/gmailService';
import { useFeedback } from '../../context/FeedbackContext';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useContacts, useLists } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const ContactsTab = () => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const contactsQuery = useContacts({ limit: 1000 });
  const listsQuery = useLists();
  const contacts = useMemo(() => contactsQuery.data?.contacts || [], [contactsQuery.data]);
  const lists = useMemo(() => listsQuery.data?.lists || [], [listsQuery.data]);

  const [contactForm, setContactForm] = useState({
    email: '', firstName: '', lastName: '', company: '', leadStage: 'New'
  });
  const [contactSearch, setContactSearch] = useState('');
  const [contactSourceFilter, setContactSourceFilter] = useState('all');
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [addingToList, setAddingToList] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvForm, setCsvForm] = useState({ csvContent: '', hasHeader: true, delimiter: ',', source: 'csv_import' });
  const [csvImporting, setCsvImporting] = useState(false);

  const uniqueSources = useMemo(
    () => [...new Set(contacts.map(c => c.source || c.Source).filter(Boolean))],
    [contacts]
  );

  const filteredContacts = useMemo(() => contacts.filter(c => {
    const src = c.source || c.Source || '';
    const matchesSource = contactSourceFilter === 'all' || src === contactSourceFilter;
    const matchesSearch = !contactSearch ||
      (c.email || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
      `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(contactSearch.toLowerCase());
    return matchesSource && matchesSearch;
  }), [contacts, contactSearch, contactSourceFilter]);

  const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.contactId));

  const toggleContact = (id) => setSelectedContactIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedContactIds(prev => { const n = new Set(prev); filteredContacts.forEach(c => n.delete(c.contactId)); return n; });
    } else {
      setSelectedContactIds(prev => { const n = new Set(prev); filteredContacts.forEach(c => n.add(c.contactId)); return n; });
    }
  };

  const handleCreateContact = async (event) => {
    event.preventDefault();
    if (!contactForm.email.trim()) { showFeedback('Email is required.', 'warning'); return; }
    try {
      await gmailService.upsertContact(contactForm);
      setContactForm({ email: '', firstName: '', lastName: '', company: '', leadStage: 'New' });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showFeedback('Contact saved.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to save contact.', 'error');
    }
  };

  const handleAddToList = async (listId) => {
    if (!selectedContactIds.size) return;
    setAddingToList(true);
    try {
      await gmailService.addContactsToList(listId, [...selectedContactIds]);
      showFeedback(`Added ${selectedContactIds.size} contact(s) to list.`, 'success');
      setSelectedContactIds(new Set());
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to add contacts to list.', 'error');
    } finally {
      setAddingToList(false);
    }
  };

  const handleCsvImport = async (event) => {
    event.preventDefault();
    if (!csvForm.csvContent.trim()) { showFeedback('Paste CSV content first.', 'warning'); return; }
    setCsvImporting(true);
    try {
      const result = await gmailService.importContactsCsv(csvForm);
      showFeedback(`Imported ${result.imported ?? result.count ?? '?'} contacts.`, 'success');
      setCsvForm({ csvContent: '', hasHeader: true, delimiter: ',', source: 'csv_import' });
      setShowCsvImport(false);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Import failed.', 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  if (contactsQuery.isLoading) return <LoadingSpinner label="Loading contacts..." />;
  if (contactsQuery.isError) return (
    <EmptyState icon="!" title="Failed to load contacts" subtitle={contactsQuery.error?.message} action={{ label: 'Retry', onClick: () => contactsQuery.refetch() }} />
  );

  return (
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

        <div className="marketing-filter-row">
          <input className="form-input marketing-filter-input" type="text" placeholder="Search contacts..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
          <select
            className="form-input marketing-filter-source"
            value={contactSourceFilter}
            onChange={(e) => {
              const val = e.target.value;
              setContactSourceFilter(val);
              if (val !== 'all') {
                setSelectedContactIds(new Set(contacts.filter(c => (c.source || c.Source) === val).map(c => c.contactId)));
              }
            }}
          >
            <option value="all">All sources</option>
            {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {selectedContactIds.size > 0 && (
          <div className="marketing-selection-strip">
            <span className="marketing-selection-count">{selectedContactIds.size} selected</span>
            <select
              className="form-input marketing-selection-action"
              defaultValue=""
              onChange={(e) => { if (e.target.value) { handleAddToList(e.target.value); e.target.value = ''; } }}
              disabled={addingToList || !lists.length}
            >
              <option value="" disabled>
                {addingToList ? 'Adding...' : lists.length ? 'Add to list...' : 'Create a list first'}
              </option>
              {lists.map(l => <option key={l.listId} value={l.listId}>{l.name}</option>)}
            </select>
            <button type="button" className="topbar-btn" onClick={() => setSelectedContactIds(new Set())}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="marketing-table">
            <thead>
              <tr>
                <th className="marketing-th-check">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr><td colSpan={6} className="marketing-table-empty">No contacts found</td></tr>
              ) : (
                filteredContacts.slice(0, 200).map((contact) => (
                  <tr
                    key={contact.contactId}
                    className={`marketing-row${selectedContactIds.has(contact.contactId) ? ' selected' : ''}`}
                    onClick={() => navigate(`/marketing/contacts/${contact.contactId}`)}
                  >
                    <td className="marketing-td-check" onClick={(e) => { e.stopPropagation(); toggleContact(contact.contactId); }}>
                      <input type="checkbox" checked={selectedContactIds.has(contact.contactId)} onChange={() => toggleContact(contact.contactId)} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="marketing-td-strong">{contact.firstName || ''} {contact.lastName || ''}</td>
                    <td className="marketing-td-muted">{contact.email}</td>
                    <td className="marketing-td-muted">{contact.company || '-'}</td>
                    <td><span className="marketing-stage-pill">{contact.leadStage || 'New'}</span></td>
                    <td className="marketing-td-dim">{contact.source || contact.Source || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredContacts.length > 200 && (
            <div className="marketing-table-note">
              Showing 200 of {filteredContacts.length} - use search or source filter to narrow down.
            </div>
          )}
        </div>

        <div className="marketing-csv-area">
          <button type="button" className="topbar-btn" onClick={() => setShowCsvImport(!showCsvImport)}>
            <Icon name="upload" size={13} /> CSV Import
          </button>
          {showCsvImport && (
            <form onSubmit={handleCsvImport} className="marketing-csv-form">
              <div className="form-group">
                <label className="form-label">CSV Content</label>
                <textarea className="form-input" rows={5} placeholder="email,firstName,lastName,company,..." value={csvForm.csvContent} onChange={(e) => setCsvForm({ ...csvForm, csvContent: e.target.value })} />
              </div>
              <div className="card-form-grid">
                <div className="form-group">
                  <label className="form-label">Delimiter</label>
                  <select className="form-input" value={csvForm.delimiter} onChange={(e) => setCsvForm({ ...csvForm, delimiter: e.target.value })}>
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="&#9;">Tab</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Source tag</label>
                  <input className="form-input" value={csvForm.source} onChange={(e) => setCsvForm({ ...csvForm, source: e.target.value })} />
                </div>
              </div>
              <div className="inline-actions marketing-csv-actions">
                <label className="marketing-checkbox-inline">
                  <input type="checkbox" checked={csvForm.hasHeader} onChange={(e) => setCsvForm({ ...csvForm, hasHeader: e.target.checked })} />
                  First row is header
                </label>
                <button type="submit" className="topbar-btn primary" disabled={csvImporting}>
                  {csvImporting ? 'Importing...' : 'Import'}
                </button>
                <button type="button" className="topbar-btn" onClick={() => setShowCsvImport(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactsTab;
