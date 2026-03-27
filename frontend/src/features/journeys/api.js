/**
 * Journeys feature API
 */
import { gmailService } from '../../services/gmailService';

export const journeysApi = {
  getJourneys: gmailService.getJourneys,
  getJourneySummary: gmailService.getJourneySummary,
  createJourney: gmailService.createJourney,
  getJourneyById: gmailService.getJourneyById,
  upsertJourneySteps: gmailService.upsertJourneySteps,
  publishJourney: gmailService.publishJourney,
  pauseJourney: gmailService.pauseJourney,
};

export default journeysApi;
