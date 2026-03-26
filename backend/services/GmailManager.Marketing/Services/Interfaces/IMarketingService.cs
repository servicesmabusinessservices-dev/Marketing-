using GmailManager.Shared.Models;
using GmailManager.Marketing.DTOs.Marketing;

namespace GmailManager.Marketing.Services.Interfaces;

public interface IMarketingService
{
    // ── Contacts ─────────────────────────────────────────────────────────
    Task<ServiceResult> GetContactsAsync(string userEmail, string? search, string? q, string? tag,
        string? leadStage, string? ownerEmail, int? limit, int? page, int? pageSize);
    Task<ServiceResult> GetContactByIdAsync(string userEmail, string contactId);
    Task<ServiceResult> UpsertContactAsync(string userEmail, UpsertContactRequest request);
    Task<ServiceResult> UpdateLeadStageAsync(string userEmail, string contactId, UpdateLeadStageRequest request);
    Task<ServiceResult> AssignContactOwnerAsync(string userEmail, string contactId, AssignOwnerRequest request);
    Task<ServiceResult> GetContactNotesAsync(string userEmail, string contactId);
    Task<ServiceResult> AddContactNoteAsync(string userEmail, string contactId, AddNoteRequest request);
    Task<ServiceResult> GetContactTasksAsync(string userEmail, string contactId, string? status, bool onlyOverdue);
    Task<ServiceResult> CreateContactTaskAsync(string userEmail, string contactId, CreateTaskRequest request);
    Task<ServiceResult> UpdateContactTaskAsync(string userEmail, string contactId, string taskId, UpdateTaskRequest request);
    Task<ServiceResult> ImportContactsCsvAsync(string userEmail, ImportCsvRequest request);
    Task<ServiceResult> GetPipelineAsync(string userEmail, string? ownerEmail, string? search, string? stage, int pageSize);
    Task<ServiceResult> GetLeadStageHistoryAsync(string userEmail, string contactId);
    Task<ServiceResult> ExportContactsCsvAsync(string userEmail, string? search, string? leadStage, string? ownerEmail);

    // ── Tasks global ─────────────────────────────────────────────────────
    Task<ServiceResult> GetTasksAsync(string userEmail, string? ownerEmail, string? status, string? due,
        int? limit, int? page, int? pageSize);

    // ── Lists ────────────────────────────────────────────────────────────
    Task<ServiceResult> GetListsAsync(string userEmail, int? page, int? pageSize);
    Task<ServiceResult> CreateListAsync(string userEmail, CreateListRequest request);
    Task<ServiceResult> GetListMembersAsync(string userEmail, string listId);
    Task<ServiceResult> AddListMemberAsync(string userEmail, string listId, string contactId);
    Task<ServiceResult> AddListMembersBulkAsync(string userEmail, string listId, BulkAddMembersRequest request);
    Task<ServiceResult> DeleteListAsync(string userEmail, string listId);

    // ── Suppressions ─────────────────────────────────────────────────────
    Task<ServiceResult> GetSuppressionsAsync(string userEmail);
    Task<ServiceResult> GetSuppressionSummaryAsync(string userEmail);
    Task<ServiceResult> AddSuppressionAsync(string userEmail, CreateSuppressionRequest request);
    Task<ServiceResult> RemoveSuppressionAsync(string userEmail, string email);

    // ── Segments ─────────────────────────────────────────────────────────
    Task<ServiceResult> GetSegmentsAsync(string userEmail);
    Task<ServiceResult> CreateSegmentAsync(string userEmail, CreateSegmentRequest request);

    // ── Templates ────────────────────────────────────────────────────────
    Task<ServiceResult> GetTemplatesAsync(string userEmail, string? category, int? page, int? pageSize);
    Task<ServiceResult> GetTemplateByIdAsync(string userEmail, string templateId);
    Task<ServiceResult> CreateTemplateAsync(string userEmail, CreateTemplateRequest request);
    Task<ServiceResult> UpdateTemplateAsync(string userEmail, string templateId, CreateTemplateRequest request);
    Task<ServiceResult> PreviewTemplateAsync(string userEmail, TemplatePreviewRequest request);
    Task<ServiceResult> DeleteTemplateAsync(string userEmail, string templateId);

    // ── Campaigns ────────────────────────────────────────────────────────
    Task<ServiceResult> GetCampaignsAsync(string userEmail, int? page, int? pageSize);
    Task<ServiceResult> CreateCampaignAsync(string userEmail, CreateCampaignRequest request);
    Task<ServiceResult> SendCampaignAsync(string userEmail, string campaignId);
    Task<ServiceResult> DeleteCampaignAsync(string userEmail, string campaignId);
    Task<ServiceResult> ExportCampaignsCsvAsync(string userEmail);

    // ── Events / Tracking ────────────────────────────────────────────────
    Task<ServiceResult> GetEventsAsync(string userEmail, string? contactId, string? eventType, int limit, int? page, int? pageSize);
    Task<ServiceResult> CreateEventAsync(string userEmail, CreateEventRequest request);
    Task TrackOpenAsync(string userEmail, string contactId, string? campaignId, string? journeyId, string? messageId);
    Task<string> TrackClickAsync(string userEmail, string contactId, string url, string? campaignId, string? journeyId, string? messageId);

    // ── Journeys ─────────────────────────────────────────────────────────
    Task<ServiceResult> GetJourneySummaryAsync(string userEmail);
    Task<ServiceResult> GetJourneysAsync(string userEmail);
    Task<ServiceResult> CreateJourneyAsync(string userEmail, CreateJourneyRequest request);
    Task<ServiceResult> GetJourneyByIdAsync(string userEmail, string journeyId);
    Task<ServiceResult> UpsertJourneyStepsAsync(string userEmail, string journeyId, List<UpsertJourneyStepRequest> steps);
    Task<ServiceResult> PublishJourneyAsync(string userEmail, string journeyId);
    Task<ServiceResult> PauseJourneyAsync(string userEmail, string journeyId);

    // ── Analytics ────────────────────────────────────────────────────────
    Task<ServiceResult> GetAnalyticsAsync(string userEmail, int days, string? ownerEmail, DateTime? fromUtc, DateTime? toUtc);

    // ── Search ───────────────────────────────────────────────────────────
    Task<ServiceResult> GlobalSearchAsync(string userEmail, string? q, int limit);

    // ── Tokens ───────────────────────────────────────────────────────────
    ServiceResult GetAllowedTokens();
}
