/**
 * Contacts feature API
 */
import { gmailService } from '../../services/gmailService';

export const contactsApi = {
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
};

export default contactsApi;
