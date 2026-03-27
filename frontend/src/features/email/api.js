/**
 * Email feature API — inbox, send, forward, bulk, classification.
 * Re-exports from the shared gmailService for feature-local usage.
 */
import { gmailService } from '../../services/gmailService';

export const emailApi = {
  getEmails: gmailService.getEmails,
  getEmailById: gmailService.getEmailById,
  sendEmail: gmailService.sendEmail,
  forwardEmail: gmailService.forwardEmail,
  sendBulkEmail: gmailService.sendBulkEmail,
  getBulkEmailStatus: gmailService.getBulkEmailStatus,
  updateEmailClassification: gmailService.updateEmailClassification,
  getClassificationSummary: gmailService.getClassificationSummary,
  getEmailSummary: gmailService.getEmailSummary,
};
