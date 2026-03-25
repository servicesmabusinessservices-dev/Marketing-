import React, { useState, useMemo } from 'react';
import { gmailService } from '../../services/gmailService';
import { useFeedback } from '../../context/FeedbackContext';
import Icon from '../ui/Icon';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import DataTable from '../ui/DataTable';
import { exportToCSV } from '../../utils/exportData';
import { useCampaigns, useLists, useTemplates } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

const CampaignsTab = () => {
  const { showFeedback } = useFeedback();
  const queryClient = useQueryClient();

  const campaignsQuery = useCampaigns();
  const listsQuery = useLists();
  const templatesQuery = useTemplates();
  const campaigns = campaignsQuery.data?.campaigns || [];
  const lists = listsQuery.data?.lists || [];
  const templates = templatesQuery.data?.templates || [];

  const [campaignForm, setCampaignForm] = useState({
    name: '', description: '', listId: '', templateId: ''
  });
  const [sendingCampaignId, setSendingCampaignId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.name.trim()) { showFeedback('Campaign name is required.', 'warning'); return; }
    try {
      await gmailService.createCampaignDraft(campaignForm);
      setCampaignForm({ name: '', description: '', listId: '', templateId: '' });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showFeedback('Campaign draft created.', 'success');
    } catch (error) {
      showFeedback(error.response?.data?.error || 'Failed to create campaign.', 'error');
    }
  };

  const handleSendCampaign = async (campaign) => {
    const id = campaign.campaignId || campaign.CampaignId;
    if (!window.confirm('Send this campaign now?')) return;
    setSendingCampaignId(id);
    try {
      await gmailService.sendCampaign(id);
      showFeedback('Campaign sent!', 'success');
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

  const campaignRows = useMemo(() => campaigns.map((c) => {
    const id = c.campaignId || c.CampaignId;
    const linkedList = lists.find(l => (l.listId || l.ListId) === (c.listId || c.ListId));
    const linkedTemplate = templates.find(t => (t.templateId || t.TemplateId) === (c.templateId || c.TemplateId));
    return {
      campaignId: id,
      name: c.name || c.Name,
      list: linkedList ? (linkedList.name || linkedList.Name) : '-',
      template: linkedTemplate ? (linkedTemplate.name || linkedTemplate.Name) : '-',
      status: c.status || c.Status || 'Draft',
      _raw: c,
    };
  }), [campaigns, lists, templates]);

  const campaignColumns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'list', label: 'List' },
    { key: 'template', label: 'Template' },
    { key: 'status', label: 'Status', render: (v) => <span className={`marketing-status-pill${v === 'Sent' ? ' sent' : ''}`}>{v}</span> },
    {
      key: 'actions', label: 'Actions', sortable: false, filterable: false,
      render: (_v, row) => {
        const canSend = row._raw.listId && row._raw.templateId && row.status !== 'Sent';
        const isSending = sendingCampaignId === row.campaignId;
        const isDeleting = deletingId === row.campaignId;
        return (
          <div className="inline-actions" onClick={(e) => e.stopPropagation()}>
            {canSend && (
              <button type="button" className="topbar-btn primary" onClick={() => handleSendCampaign(row._raw)} disabled={isSending || isDeleting}>
                {isSending ? 'Sending...' : 'Send'}
              </button>
            )}
            <button type="button" className="topbar-btn topbar-btn-danger" onClick={() => handleDeleteCampaign(row._raw)} disabled={isSending || isDeleting}>
              {isDeleting ? '...' : 'Delete'}
            </button>
          </div>
        );
      }
    },
  ], [sendingCampaignId, deletingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (campaignsQuery.isLoading || listsQuery.isLoading || templatesQuery.isLoading) {
    return <LoadingSpinner label="Loading campaigns..." />;
  }
  if (campaignsQuery.isError) return (
    <EmptyState icon="campaign" title="Failed to load campaigns" action={{ label: 'Retry', onClick: () => campaignsQuery.refetch() }} />
  );

  return (
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

        {campaigns.length > 0 && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <button type="button" className="topbar-btn" onClick={() => exportToCSV(
              campaignRows,
              [{ key: 'name', label: 'Name' }, { key: 'list', label: 'List' }, { key: 'template', label: 'Template' }, { key: 'status', label: 'Status' }],
              'campaigns.csv'
            )}>
              <Icon name="download" size={13} /> Export CSV
            </button>
          </div>
        )}

        {campaigns.length === 0 ? (
          <EmptyState icon="campaign" title="No campaign drafts yet" subtitle="Create one above." size="sm" />
        ) : (
          <DataTable
            columns={campaignColumns}
            data={campaignRows}
            sortable
            paginated
            pageSize={10}
            emptyMessage="No campaigns."
          />
        )}
      </div>
    </section>
  );
};

export default CampaignsTab;
