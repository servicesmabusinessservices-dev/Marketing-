/**
 * Marketing feature API — contacts, lists, templates, campaigns, journeys, events, suppressions.
 * Re-exports from the shared gmailService for feature-local usage.
 */
import { gmailService } from '../../services/gmailService';

export const marketingApi = {
  // Contacts
  getContacts: gmailService.getContacts,
  getContactById: gmailService.getContactById,
  upsertContact: gmailService.upsertContact,
  updateContactLeadStage: gmailService.updateContactLeadStage,
  getLeadStageHistory: gmailService.getLeadStageHistory,
  assignContactOwner: gmailService.assignContactOwner,
  getContactNotes: gmailService.getContactNotes,
  addContactNote: gmailService.addContactNote,
  getContactTasks: gmailService.getContactTasks,
  createContactTask: gmailService.createContactTask,
  updateContactTask: gmailService.updateContactTask,
  importContactsCsv: gmailService.importContactsCsv,
  addContactsToList: gmailService.addContactsToList,
  getListContacts: gmailService.getListContacts,

  // Tasks
  getTasks: gmailService.getTasks,

  // Lists
  getLists: gmailService.getLists,
  createList: gmailService.createList,
  deleteList: gmailService.deleteList,

  // Templates
  getTemplates: gmailService.getTemplates,
  getTemplateById: gmailService.getTemplateById,
  createTemplate: gmailService.createTemplate,
  updateTemplate: gmailService.updateTemplate,
  previewTemplate: gmailService.previewTemplate,
  deleteTemplate: gmailService.deleteTemplate,

  // Campaigns
  getCampaigns: gmailService.getCampaigns,
  createCampaignDraft: gmailService.createCampaignDraft,
  sendCampaign: gmailService.sendCampaign,
  deleteCampaign: gmailService.deleteCampaign,

  // Events
  getEvents: gmailService.getEvents,
  createEvent: gmailService.createEvent,

  // Journeys
  getJourneys: gmailService.getJourneys,
  getJourneySummary: gmailService.getJourneySummary,
  createJourney: gmailService.createJourney,
  getJourneyById: gmailService.getJourneyById,
  upsertJourneySteps: gmailService.upsertJourneySteps,
  publishJourney: gmailService.publishJourney,
  pauseJourney: gmailService.pauseJourney,

  // Suppressions
  getSuppressions: gmailService.getSuppressions,
  getSuppressionSummary: gmailService.getSuppressionSummary,
  addSuppression: gmailService.addSuppression,
  removeSuppression: gmailService.removeSuppression,
};
