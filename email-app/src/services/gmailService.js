import axios from 'axios';
import { API_BASE_URL, getAuthHeaders } from '../config/authConfig';

export const gmailService = {
  login: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/login`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      if (!error.response) {
        throw new Error(
          'Unable to reach backend. Start API with HTTPS and trust dev certificate: dotnet dev-certs https --trust'
        );
      }
      throw error;
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

    if (pageToken) {
      query.append('pageToken', pageToken);
    }

    if (classification && classification !== 'All') {
      query.append('classification', classification);
    }

    if (q) {
      query.append('q', q);
    }

    const url = `${API_BASE_URL}/email/list?${query.toString()}`;
    
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  getEmailById: async (emailId) => {
    const response = await axios.get(`${API_BASE_URL}/email/${emailId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  sendEmail: async (to, subject, body) => {
    await axios.post(`${API_BASE_URL}/email/send`, 
      { to, subject, body },
      { headers: getAuthHeaders() }
    );
  },

  forwardEmail: async ({ messageId, to, note = '' }) => {
    const response = await axios.post(`${API_BASE_URL}/email/forward`,
      { messageId, to, note },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  sendBulkEmail: async (recipients, subject, body, delaySeconds = 3) => {
    const response = await axios.post(`${API_BASE_URL}/email/bulk-send`, 
      { recipients, subject, body, delaySeconds },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getBulkEmailStatus: async (jobId) => {
    const response = await axios.get(`${API_BASE_URL}/email/bulk-send/${jobId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateEmailClassification: async (emailId, classification) => {
    const response = await axios.post(`${API_BASE_URL}/email/${emailId}/classification`,
      { classification },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getClassificationSummary: async () => {
    const response = await axios.get(`${API_BASE_URL}/email/classification-summary`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getEmailSummary: async () => {
    const response = await axios.get(`${API_BASE_URL}/email/summary`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getContacts: async ({ q = null, leadStage = null, limit = 50 } = {}) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (q) {
      query.append('search', q);
    }
    if (leadStage) {
      query.append('leadStage', leadStage);
    }

    const response = await axios.get(`${API_BASE_URL}/marketing/contacts?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  upsertContact: async (contact) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts`, contact, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateContactLeadStage: async (contactId, toLeadStage, reason = 'Manual update') => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts/${contactId}/lead-stage`, {
      toLeadStage,
      reason
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getLeadStageHistory: async (contactId) => {
    const response = await axios.get(`${API_BASE_URL}/marketing/contacts/${contactId}/lead-stage-history`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  assignContactOwner: async (contactId, ownerEmail) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts/${contactId}/owner`, {
      ownerEmail
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getContactNotes: async (contactId) => {
    const response = await axios.get(`${API_BASE_URL}/marketing/contacts/${contactId}/notes`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  addContactNote: async (contactId, body) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts/${contactId}/notes`, {
      body
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getContactTasks: async (contactId, { status = null, onlyOverdue = false } = {}) => {
    const query = new URLSearchParams();
    if (status) {
      query.append('status', status);
    }
    if (onlyOverdue) {
      query.append('onlyOverdue', 'true');
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await axios.get(`${API_BASE_URL}/marketing/contacts/${contactId}/tasks${suffix}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getTasks: async ({ ownerEmail = null, status = null, due = null, limit = null, page = null, pageSize = null } = {}) => {
    const query = new URLSearchParams();
    if (ownerEmail) {
      query.append('ownerEmail', ownerEmail);
    }
    if (status) {
      query.append('status', status);
    }
    if (due) {
      query.append('due', due);
    }
    if (limit) {
      query.append('limit', String(limit));
    }
    if (page) {
      query.append('page', String(page));
    }
    if (pageSize) {
      query.append('pageSize', String(pageSize));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await axios.get(`${API_BASE_URL}/marketing/tasks${suffix}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createContactTask: async (contactId, task) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts/${contactId}/tasks`, task, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateContactTask: async (contactId, taskId, patch) => {
    const response = await axios.patch(`${API_BASE_URL}/marketing/contacts/${contactId}/tasks/${taskId}`, patch, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getPipeline: async ({ ownerEmail = null, search = null, stage = null, pageSize = 20 } = {}) => {
    const query = new URLSearchParams();
    query.append('pageSize', String(pageSize));
    if (ownerEmail) {
      query.append('ownerEmail', ownerEmail);
    }
    if (search) {
      query.append('search', search);
    }
    if (stage) {
      query.append('stage', stage);
    }

    const response = await axios.get(`${API_BASE_URL}/marketing/pipeline?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getAnalytics: async ({ days = 30, ownerEmail = null } = {}) => {
    const query = new URLSearchParams();
    query.append('days', String(days));
    if (ownerEmail) {
      query.append('ownerEmail', ownerEmail);
    }

    const response = await axios.get(`${API_BASE_URL}/marketing/analytics?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getLists: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/lists`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getSuppressionSummary: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/suppressions/summary`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createList: async ({ name, description }) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/lists`, { name, description }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getTemplates: async ({ category = null } = {}) => {
    const query = new URLSearchParams();
    if (category && category !== 'all') {
      query.append('category', category);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await axios.get(`${API_BASE_URL}/marketing/templates${suffix}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getTokens: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/tokens`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getTemplateById: async (templateId) => {
    const response = await axios.get(`${API_BASE_URL}/marketing/templates/${templateId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createTemplate: async (template) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/templates`, template, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateTemplate: async (templateId, template) => {
    const response = await axios.put(`${API_BASE_URL}/marketing/templates/${templateId}`, template, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  previewTemplate: async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/templates/preview`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getCampaigns: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/campaigns`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getEvents: async ({ contactId = null, eventType = null, limit = 100 } = {}) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (contactId) {
      query.append('contactId', contactId);
    }
    if (eventType) {
      query.append('eventType', eventType);
    }

    const response = await axios.get(`${API_BASE_URL}/marketing/events?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createEvent: async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/events`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createCampaignDraft: async (campaign) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/campaigns`, campaign, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  sendCampaign: async (campaignId) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/campaigns/${campaignId}/send`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  deleteCampaign: async (campaignId) => {
    const response = await axios.delete(`${API_BASE_URL}/marketing/campaigns/${campaignId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  deleteTemplate: async (templateId) => {
    const response = await axios.delete(`${API_BASE_URL}/marketing/templates/${templateId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  deleteList: async (listId) => {
    const response = await axios.delete(`${API_BASE_URL}/marketing/lists/${listId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getJourneys: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/journeys`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getJourneySummary: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/journeys/summary`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createJourney: async (journey) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/journeys`, journey, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getJourneyById: async (journeyId) => {
    const response = await axios.get(`${API_BASE_URL}/marketing/journeys/${journeyId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  upsertJourneySteps: async (journeyId, steps) => {
    const response = await axios.put(`${API_BASE_URL}/marketing/journeys/${journeyId}/steps`, steps, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  publishJourney: async (journeyId) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/journeys/${journeyId}/publish`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  pauseJourney: async (journeyId) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/journeys/${journeyId}/pause`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getContactById: async (contactId) => {
    const response = await axios.get(`${API_BASE_URL}/marketing/contacts/${contactId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getSuppressions: async () => {
    const response = await axios.get(`${API_BASE_URL}/marketing/suppressions`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  addSuppression: async ({ email, reason = 'Unsubscribed', notes = '' }) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/suppressions`,
      { email, reason, notes },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  removeSuppression: async (email) => {
    const encoded = encodeURIComponent(email);
    const response = await axios.delete(`${API_BASE_URL}/marketing/suppressions/${encoded}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  importContactsCsv: async ({ csvContent, hasHeader = true, delimiter = ',', source = 'csv_import' }) => {
    const response = await axios.post(`${API_BASE_URL}/marketing/contacts/import-csv`,
      { csvContent, hasHeader, delimiter, source },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  addContactsToList: async (listId, contactIds) => {
    const response = await axios.post(
      `${API_BASE_URL}/marketing/lists/${listId}/members/bulk`,
      { contactIds },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getListContacts: async (listId) => {
    const response = await axios.get(
      `${API_BASE_URL}/marketing/lists/${listId}/members`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  }
};
