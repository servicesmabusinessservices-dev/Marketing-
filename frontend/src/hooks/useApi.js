import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gmailService } from '../services/gmailService';

// ── Query keys — centralised so invalidations are consistent ─────────────────
export const QueryKeys = {
  emails:             (params) => ['emails', params ?? {}],
  emailById:          (id)     => ['email', id],
  emailSummary:       ()       => ['emailSummary'],
  classificationSummary: ()   => ['classificationSummary'],
  contacts:           (params) => ['contacts', params ?? {}],
  contactById:        (id)     => ['contact', id],
  contactNotes:       (id)     => ['contactNotes', id],
  contactTasks:       (id, p)  => ['contactTasks', id, p ?? {}],
  tasks:              (params) => ['tasks', params ?? {}],
  pipeline:           (params) => ['pipeline', params ?? {}],
  analytics:          (params) => ['analytics', params ?? {}],
  lists:              ()       => ['lists'],
  listContacts:       (id)     => ['listContacts', id],
  templates:          (params) => ['templates', params ?? {}],
  templateById:       (id)     => ['template', id],
  campaigns:          ()       => ['campaigns'],
  journeys:           ()       => ['journeys'],
  journeySummary:     ()       => ['journeySummary'],
  journeyById:        (id)     => ['journey', id],
  events:             (params) => ['events', params ?? {}],
  suppressions:       ()       => ['suppressions'],
  suppressionSummary: ()       => ['suppressionSummary'],
  leadStageHistory:   (id)     => ['leadStageHistory', id],
  tokens:             ()       => ['tokens'],
  notifications:      ()       => ['notifications'],
};

// ── Email queries ─────────────────────────────────────────────────────────────
export const useEmails = (params) =>
  useQuery({
    queryKey: QueryKeys.emails(params),
    queryFn: () => gmailService.getEmails(params),
    staleTime: 20_000,
  });

export const useEmailById = (emailId) =>
  useQuery({
    queryKey: QueryKeys.emailById(emailId),
    queryFn: () => gmailService.getEmailById(emailId),
    enabled: Boolean(emailId),
  });

export const useEmailSummary = (enabled = true) =>
  useQuery({
    queryKey: QueryKeys.emailSummary(),
    queryFn: gmailService.getEmailSummary,
    staleTime: 60_000,
    enabled,
  });

export const useClassificationSummary = () =>
  useQuery({
    queryKey: QueryKeys.classificationSummary(),
    queryFn: gmailService.getClassificationSummary,
    staleTime: 60_000,
  });

// ── Contact queries ───────────────────────────────────────────────────────────
export const useContacts = (params) =>
  useQuery({
    queryKey: QueryKeys.contacts(params),
    queryFn: () => gmailService.getContacts(params),
    staleTime: 30_000,
  });

export const useContactById = (contactId) =>
  useQuery({
    queryKey: QueryKeys.contactById(contactId),
    queryFn: () => gmailService.getContactById(contactId),
    enabled: Boolean(contactId),
  });

export const useContactNotes = (contactId) =>
  useQuery({
    queryKey: QueryKeys.contactNotes(contactId),
    queryFn: () => gmailService.getContactNotes(contactId),
    enabled: Boolean(contactId),
  });

export const useContactTasks = (contactId, params) =>
  useQuery({
    queryKey: QueryKeys.contactTasks(contactId, params),
    queryFn: () => gmailService.getContactTasks(contactId, params),
    enabled: Boolean(contactId),
  });

export const useLeadStageHistory = (contactId) =>
  useQuery({
    queryKey: QueryKeys.leadStageHistory(contactId),
    queryFn: () => gmailService.getLeadStageHistory(contactId),
    enabled: Boolean(contactId),
  });

// ── Task queries ──────────────────────────────────────────────────────────────
export const useTasks = (params) =>
  useQuery({
    queryKey: QueryKeys.tasks(params),
    queryFn: () => gmailService.getTasks(params),
    staleTime: 30_000,
  });

// ── Pipeline query ────────────────────────────────────────────────────────────
export const usePipeline = (params) =>
  useQuery({
    queryKey: QueryKeys.pipeline(params),
    queryFn: () => gmailService.getPipeline(params),
    staleTime: 30_000,
  });

// ── Analytics query ───────────────────────────────────────────────────────────
export const useAnalytics = (params) =>
  useQuery({
    queryKey: QueryKeys.analytics(params),
    queryFn: () => gmailService.getAnalytics(params),
    staleTime: 5 * 60_000, // analytics change slowly
  });

// ── List queries ──────────────────────────────────────────────────────────────
export const useLists = () =>
  useQuery({
    queryKey: QueryKeys.lists(),
    queryFn: gmailService.getLists,
    staleTime: 60_000,
  });

export const useListContacts = (listId) =>
  useQuery({
    queryKey: QueryKeys.listContacts(listId),
    queryFn: () => gmailService.getListContacts(listId),
    enabled: Boolean(listId),
  });

// ── Template queries ──────────────────────────────────────────────────────────
export const useTemplates = (params) =>
  useQuery({
    queryKey: QueryKeys.templates(params),
    queryFn: () => gmailService.getTemplates(params),
    staleTime: 60_000,
  });

export const useTemplateById = (templateId) =>
  useQuery({
    queryKey: QueryKeys.templateById(templateId),
    queryFn: () => gmailService.getTemplateById(templateId),
    enabled: Boolean(templateId),
  });

// ── Campaign queries ──────────────────────────────────────────────────────────
export const useCampaigns = () =>
  useQuery({
    queryKey: QueryKeys.campaigns(),
    queryFn: gmailService.getCampaigns,
    staleTime: 30_000,
  });

// ── Journey queries ───────────────────────────────────────────────────────────
export const useJourneys = () =>
  useQuery({
    queryKey: QueryKeys.journeys(),
    queryFn: gmailService.getJourneys,
    staleTime: 60_000,
  });

export const useJourneySummary = (enabled = true) =>
  useQuery({
    queryKey: QueryKeys.journeySummary(),
    queryFn: gmailService.getJourneySummary,
    staleTime: 60_000,
    enabled,
  });

export const useJourneyById = (journeyId) =>
  useQuery({
    queryKey: QueryKeys.journeyById(journeyId),
    queryFn: () => gmailService.getJourneyById(journeyId),
    enabled: Boolean(journeyId),
  });

// ── Events query ──────────────────────────────────────────────────────────────
export const useEvents = (params) =>
  useQuery({
    queryKey: QueryKeys.events(params),
    queryFn: () => gmailService.getEvents(params),
    staleTime: 30_000,
  });

// ── Suppression queries ───────────────────────────────────────────────────────
export const useSuppressions = () =>
  useQuery({
    queryKey: QueryKeys.suppressions(),
    queryFn: gmailService.getSuppressions,
    staleTime: 60_000,
  });

export const useSuppressionSummary = () =>
  useQuery({
    queryKey: QueryKeys.suppressionSummary(),
    queryFn: gmailService.getSuppressionSummary,
    staleTime: 60_000,
  });

export const useTokens = () =>
  useQuery({
    queryKey: QueryKeys.tokens(),
    queryFn: gmailService.getTokens,
    staleTime: 300_000,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useSendEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ to, subject, body }) => gmailService.sendEmail(to, subject, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QueryKeys.emailSummary() }),
  });
};

export const useUpdateEmailClassification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emailId, classification }) =>
      gmailService.updateEmailClassification(emailId, classification),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emails'] });
      qc.invalidateQueries({ queryKey: QueryKeys.classificationSummary() });
    },
  });
};

export const useUpsertContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contact) => gmailService.upsertContact(contact),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
};

export const useUpdateContactLeadStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, toLeadStage, reason }) =>
      gmailService.updateContactLeadStage(contactId, toLeadStage, reason),
    onMutate: async ({ contactId, toLeadStage }) => {
      await qc.cancelQueries({ queryKey: ['pipeline'] });
      const previousPipeline = qc.getQueriesData({ queryKey: ['pipeline'] });
      qc.setQueriesData({ queryKey: ['pipeline'] }, (old) => {
        if (!old?.columns) return old;
        let movedContact = null;
        const columns = old.columns.map((col) => {
          const found = col.contacts?.find((c) => c.contactId === contactId);
          if (found) movedContact = { ...found, leadStage: toLeadStage };
          return { ...col, contacts: (col.contacts || []).filter((c) => c.contactId !== contactId) };
        }).map((col) => {
          if (col.stage === toLeadStage && movedContact) {
            return { ...col, contacts: [...col.contacts, movedContact] };
          }
          return col;
        });
        return { ...old, columns };
      });
      return { previousPipeline };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPipeline) {
        context.previousPipeline.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: QueryKeys.contactById(variables.contactId) });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: QueryKeys.leadStageHistory(variables.contactId) });
    },
  });
};

export const useAddContactNote = (contactId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => gmailService.addContactNote(contactId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QueryKeys.contactNotes(contactId) }),
  });
};

export const useCreateContactTask = (contactId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task) => gmailService.createContactTask(contactId, task),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.contactTasks(contactId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateContactTask = (contactId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, patch }) =>
      gmailService.updateContactTask(contactId, taskId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.contactTasks(contactId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useAddSuppression = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => gmailService.addSuppression(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.suppressions() });
      qc.invalidateQueries({ queryKey: QueryKeys.suppressionSummary() });
    },
  });
};

export const useRemoveSuppression = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email) => gmailService.removeSuppression(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.suppressions() });
      qc.invalidateQueries({ queryKey: QueryKeys.suppressionSummary() });
    },
  });
};

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaign) => gmailService.createCampaignDraft(campaign),
    onSuccess: () => qc.invalidateQueries({ queryKey: QueryKeys.campaigns() }),
  });
};

export const useSendCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId) => gmailService.sendCampaign(campaignId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QueryKeys.campaigns() }),
  });
};

export const useCreateJourney = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (journey) => gmailService.createJourney(journey),
    onSuccess: () => qc.invalidateQueries({ queryKey: QueryKeys.journeys() }),
  });
};

export const usePublishJourney = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (journeyId) => gmailService.publishJourney(journeyId),
    onSuccess: (_data, journeyId) => {
      qc.invalidateQueries({ queryKey: QueryKeys.journeyById(journeyId) });
      qc.invalidateQueries({ queryKey: QueryKeys.journeys() });
    },
  });
};

// ── Notification queries ──────────────────────────────────────────────────────
export const useNotifications = () =>
  useQuery({
    queryKey: QueryKeys.notifications(),
    queryFn: () => gmailService.getNotifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => gmailService.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.notifications() });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gmailService.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.notifications() });
    },
  });
};
