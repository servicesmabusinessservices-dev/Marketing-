/**
 * Auth feature API — login and token management.
 * Re-exports from the shared gmailService for feature-local usage.
 */
import { gmailService } from '../../services/gmailService';

export const authApi = {
  devLogin: gmailService.devLogin,
  login: gmailService.login,
  getTokens: gmailService.getTokens,
};
