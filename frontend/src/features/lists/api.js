/**
 * Lists feature API
 */
import { gmailService } from '../../services/gmailService';

export const listsApi = {
  getLists: gmailService.getLists,
  createList: gmailService.createList,
  deleteList: gmailService.deleteList,
  getListContacts: gmailService.getListContacts,
  addContactsToList: gmailService.addContactsToList,
};

export default listsApi;
