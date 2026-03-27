/**
 * Suppression feature API
 */
import { gmailService } from '../../services/gmailService';

export const suppressionApi = {
  getSuppressions: gmailService.getSuppressions,
  getSuppressionSummary: gmailService.getSuppressionSummary,
  addSuppression: gmailService.addSuppression,
  removeSuppression: gmailService.removeSuppression,
};

export default suppressionApi;
