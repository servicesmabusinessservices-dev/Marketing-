/**
 * Analytics feature API — dashboards, pipeline, exports, global search.
 * Re-exports from the shared gmailService for feature-local usage.
 */
import { gmailService } from '../../services/gmailService';

export const analyticsApi = {
  getAnalytics: gmailService.getAnalytics,
  getPipeline: gmailService.getPipeline,
  globalSearch: gmailService.globalSearch,
};
