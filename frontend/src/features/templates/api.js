/**
 * Templates feature API
 */
import { gmailService } from '../../services/gmailService';

export const templatesApi = {
  getTemplates: gmailService.getTemplates,
  getTemplateById: gmailService.getTemplateById,
  createTemplate: gmailService.createTemplate,
  updateTemplate: gmailService.updateTemplate,
  previewTemplate: gmailService.previewTemplate,
  deleteTemplate: gmailService.deleteTemplate,
};

export default templatesApi;
