import apiClient from './apiClient';
import { API_BASE_URL } from '../config/authConfig';

export const gmailService = {
  devLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/dev-login`;
  },

  login: async () => {
    try {
      const response = await apiClient.get('/auth/login');
      return response.data;
    } catch (error) {
      if (!error.response) {
        throw new Error(
          `Unable to reach backend. Check API at ${API_BASE_URL || '<<missing API URL>>'}.`
        );
      }

      const backendMessage = error.response?.data?.error || error.message || 'Login failed. Please try again.';
      throw new Error(backendMessage);
    }
  },

  getEmails: async ({
    pageToken = null,
    maxResults = 50,
    classification = null,
    sortBy = 'date',
    sortDir = 'desc',
    q = null
  } = {}) => {
    const query = new URLSearchParams();
    query.append('maxResults', String(maxResults));
    query.append('sortBy', sortBy);
    query.append('sortDir', sortDir);
    if (pageToken) query.append('pageToken', pageToken);
    if (classification && classification !== 'All') query.append('classification', classification);
    if (q) query.append('q', q);

    const response = await apiClient.get(`/email/list?${query.toString()}`);
    return response.data;
  },

  getEmailById: async (emailId) => {
    const response = await apiClient.get(`/email/${emailId}`);
    return response.data;
  },

  sendEmail: async (to, subject, body) => {
    await apiClient.post('/email/send', { to, subject, body });
  },

  forwardEmail: async ({ messageId, to, note = '' }) => {
    const response = await apiClient.post('/email/forward', { messageId, to, note });
    return response.data;
  },

  sendBulkEmail: async (recipients, subject, body, delaySeconds = 3) => {
    const response = await apiClient.post('/email/bulk-send', { recipients, subject, body, delaySeconds });
    return response.data;
  },

  getBulkEmailStatus: async (jobId) => {
    const response = await apiClient.get(`/email/bulk-send/${jobId}`);
    return response.data;
  },

  updateEmailClassification: async (emailId, classification) => {
    const response = await apiClient.post(`/email/${emailId}/classification`, { classification });
    return response.data;
  },

  getClassificationSummary: async () => {
    const response = await apiClient.get('/email/classification-summary');
    return response.data;
  },

  getEmailSummary: async () => {
    const response = await apiClient.get('/email/summary');
    return response.data;
  },

  getContacts: async ({ q = null, leadStage = null, limit = 50 } = {}) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (q) query.append('search', q);
    if (leadStage) query.append('leadStage', leadStage);

    const response = await apiClient.get(`/contacts?${query.toString()}`);
    return response.data;
  },

  upsertContact: async (contact) => {
    const response = await apiClient.post('/contacts', contact);
    return response.data;
  },

  updateContactLeadStage: async (contactId, toLeadStage, reason = 'Manual update') => {
    const response = await apiClient.post(`/contacts/${contactId}/lead-stage`, { toLeadStage, reason });
    return response.data;
  },

  getLeadStageHistory: async (contactId) => {
    const response = await apiClient.get(`/contacts/${contactId}/lead-stage-history`);
    return response.data;
  },

  assignContactOwner: async (contactId, ownerEmail) => {
    const response = await apiClient.post(`/contacts/${contactId}/owner`, { ownerEmail });
    return response.data;
  },

  getContactNotes: async (contactId) => {
    const response = await apiClient.get(`/contacts/${contactId}/notes`);
    return response.data;
  },

  addContactNote: async (contactId, body) => {
    const response = await apiClient.post(`/contacts/${contactId}/notes`, { body });
    return response.data;
  },

  getContactTasks: async (contactId, { status = null, onlyOverdue = false } = {}) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (onlyOverdue) query.append('onlyOverdue', 'true');

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient.get(`/contacts/${contactId}/tasks${suffix}`);
    return response.data;
  },

  getTasks: async ({ ownerEmail = null, status = null, due = null, limit = null, page = null, pageSize = null } = {}) => {
    const query = new URLSearchParams();
    if (ownerEmail) query.append('ownerEmail', ownerEmail);
    if (status) query.append('status', status);
    if (due) query.append('due', due);
    if (limit) query.append('limit', String(limit));
    if (page) query.append('page', String(page));
    if (pageSize) query.append('pageSize', String(pageSize));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient.get(`/marketing/tasks${suffix}`);
    return response.data;
  },

  createContactTask: async (contactId, task) => {
    const response = await apiClient.post(`/contacts/${contactId}/tasks`, task);
    return response.data;
  },

  updateContactTask: async (contactId, taskId, patch) => {
    const response = await apiClient.patch(`/contacts/${contactId}/tasks/${taskId}`, patch);
    return response.data;
  },

  getPipeline: async ({ ownerEmail = null, search = null, stage = null, pageSize = 20 } = {}) => {
    const query = new URLSearchParams();
    query.append('pageSize', String(pageSize));
    if (ownerEmail) query.append('ownerEmail', ownerEmail);
    if (search) query.append('search', search);
    if (stage) query.append('stage', stage);

    const response = await apiClient.get(`/marketing/pipeline?${query.toString()}`);
    return response.data;
  },

  getAnalytics: async ({ days = 30, ownerEmail = null } = {}) => {
    const query = new URLSearchParams();
    query.append('days', String(days));
    if (ownerEmail) query.append('ownerEmail', ownerEmail);

    const response = await apiClient.get(`/marketing/analytics?${query.toString()}`);
    return response.data;
  },

  getLists: async () => {
    const response = await apiClient.get('/lists');
    return response.data;
  },

  getSuppressionSummary: async () => {
    const response = await apiClient.get('/marketing/suppressions/summary');
    return response.data;
  },

  createList: async ({ name, description }) => {
    const response = await apiClient.post('/lists', { name, description });
    return response.data;
  },

  getTemplates: async ({ category = null } = {}) => {
    const query = new URLSearchParams();
    if (category && category !== 'all') query.append('category', category);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient.get(`/templates${suffix}`);
    return response.data;
  },

  getTokens: async () => {
    const response = await apiClient.get('/templates/tokens');
    return response.data;
  },

  getTemplateById: async (templateId) => {
    const response = await apiClient.get(`/templates/${templateId}`);
    return response.data;
  },

  createTemplate: async (template) => {
    const response = await apiClient.post('/templates', template);
    return response.data;
  },

  updateTemplate: async (templateId, template) => {
    const response = await apiClient.put(`/templates/${templateId}`, template);
    return response.data;
  },

  previewTemplate: async (payload) => {
    const response = await apiClient.post('/templates/preview', payload);
    return response.data;
  },

  getCampaigns: async () => {
    const response = await apiClient.get('/campaigns');
    return response.data;
  },

  getEvents: async ({ contactId = null, eventType = null, limit = 100 } = {}) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (contactId) query.append('contactId', contactId);
    if (eventType) query.append('eventType', eventType);

    const response = await apiClient.get(`/marketing/events?${query.toString()}`);
    return response.data;
  },

  createEvent: async (payload) => {
    const response = await apiClient.post('/marketing/events', payload);
    return response.data;
  },

  createCampaignDraft: async (campaign) => {
    const response = await apiClient.post('/campaigns', campaign);
    return response.data;
  },

  sendCampaign: async (campaignId) => {
    const response = await apiClient.post(`/campaigns/${campaignId}/send`, {});
    return response.data;
  },

  deleteCampaign: async (campaignId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}`);
    return response.data;
  },

  deleteTemplate: async (templateId) => {
    const response = await apiClient.delete(`/templates/${templateId}`);
    return response.data;
  },

  deleteList: async (listId) => {
    const response = await apiClient.delete(`/lists/${listId}`);
    return response.data;
  },

  getJourneys: async () => {
    const response = await apiClient.get('/journeys');
    return response.data;
  },

  getJourneySummary: async () => {
    const response = await apiClient.get('/journeys/summary');
    return response.data;
  },

  createJourney: async (journey) => {
    const response = await apiClient.post('/journeys', journey);
    return response.data;
  },

  getJourneyById: async (journeyId) => {
    const response = await apiClient.get(`/journeys/${journeyId}`);
    return response.data;
  },

  upsertJourneySteps: async (journeyId, steps) => {
    const response = await apiClient.put(`/journeys/${journeyId}/steps`, steps);
    return response.data;
  },

  publishJourney: async (journeyId) => {
    const response = await apiClient.post(`/journeys/${journeyId}/publish`, {});
    return response.data;
  },

  pauseJourney: async (journeyId) => {
    const response = await apiClient.post(`/journeys/${journeyId}/pause`, {});
    return response.data;
  },

  getContactById: async (contactId) => {
    const response = await apiClient.get(`/contacts/${contactId}`);
    return response.data;
  },

  getSuppressions: async () => {
    const response = await apiClient.get('/marketing/suppressions');
    return response.data;
  },

  addSuppression: async ({ email, reason = 'Unsubscribed', notes = '' }) => {
    const response = await apiClient.post('/marketing/suppressions', { email, reason, notes });
    return response.data;
  },

  removeSuppression: async (email) => {
    const encoded = encodeURIComponent(email);
    const response = await apiClient.delete(`/marketing/suppressions/${encoded}`);
    return response.data;
  },

  importContactsCsv: async ({ csvContent, hasHeader = true, delimiter = ',', source = 'csv_import' }) => {
    const response = await apiClient.post('/contacts/import-csv', {
      csvContent, hasHeader, delimiter, source
    });
    return response.data;
  },

  addContactsToList: async (listId, contactIds) => {
    const response = await apiClient.post(`/lists/${listId}/members/bulk`, { contactIds });
    return response.data;
  },

  getListContacts: async (listId) => {
    const response = await apiClient.get(`/lists/${listId}/members`);
    return response.data;
  },

  globalSearch: async (q, limit = 20) => {
    const query = new URLSearchParams();
    if (q) query.append('q', q);
    query.append('limit', String(limit));
    const response = await apiClient.get(`/search?${query.toString()}`);
    return response.data;
  },

  // Notification APIs
  getNotifications: async (unreadOnly = false) => {
    const suffix = unreadOnly ? '?unreadOnly=true' : '';
    const response = await apiClient.get(`/notification${suffix}`);
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    const response = await apiClient.post(`/notification/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await apiClient.post('/notification/read-all');
    return response.data;
  }
};
