import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

export const graphService = {
  getEmails: async (accessToken, skip = 0, top = 20) => {
    const response = await axios.get(
      `${GRAPH_API_BASE}/me/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  },

  getEmailById: async (accessToken, emailId) => {
    const response = await axios.get(
      `${GRAPH_API_BASE}/me/messages/${emailId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  },

  sendReply: async (accessToken, emailId, replyContent) => {
    await axios.post(
      `${GRAPH_API_BASE}/me/messages/${emailId}/reply`,
      {
        comment: replyContent
      },
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
