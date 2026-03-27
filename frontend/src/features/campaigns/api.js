/**
 * Campaigns feature API
 */
import { gmailService } from '../../services/gmailService';

export const campaignsApi = {
  getCampaigns: gmailService.getCampaigns,
  createCampaignDraft: gmailService.createCampaignDraft,
  sendCampaign: gmailService.sendCampaign,
  deleteCampaign: gmailService.deleteCampaign,
};

export default campaignsApi;
