using Asp.Versioning;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Models;
using GmailManager.Marketing.DTOs.Marketing;
using GmailManager.Marketing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GmailManager.Marketing.Controllers;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/marketing")]
public class MarketingController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public MarketingController(IMarketingService svc) => _svc = svc;

    // ── Contacts ────────────────────────────────────────────────────────

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts(
        [FromQuery] string? search = null, [FromQuery] string? q = null, [FromQuery] string? tag = null,
        [FromQuery] string? leadStage = null, [FromQuery] string? ownerEmail = null,
        [FromQuery] int? limit = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactsAsync(email, search, q, tag, leadStage, ownerEmail, limit, page, pageSize));
    }

    [HttpGet("contacts/{contactId}")]
    public async Task<IActionResult> GetContactById(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactByIdAsync(email, contactId));
    }

    [HttpPost("contacts")]
    public async Task<IActionResult> UpsertContact([FromBody] UpsertContactRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpsertContactAsync(email, request));
    }

    [HttpPost("contacts/{contactId}/lead-stage")]
    public async Task<IActionResult> UpdateLeadStage(string contactId, [FromBody] UpdateLeadStageRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateLeadStageAsync(email, contactId, request));
    }

    [HttpPost("contacts/{contactId}/owner")]
    public async Task<IActionResult> AssignOwner(string contactId, [FromBody] AssignOwnerRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AssignContactOwnerAsync(email, contactId, request));
    }

    [HttpGet("contacts/{contactId}/notes")]
    public async Task<IActionResult> GetNotes(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactNotesAsync(email, contactId));
    }

    [HttpPost("contacts/{contactId}/notes")]
    public async Task<IActionResult> AddNote(string contactId, [FromBody] AddNoteRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddContactNoteAsync(email, contactId, request));
    }

    [HttpGet("contacts/{contactId}/tasks")]
    public async Task<IActionResult> GetContactTasks(string contactId,
        [FromQuery] string? status = null, [FromQuery] bool onlyOverdue = false)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactTasksAsync(email, contactId, status, onlyOverdue));
    }

    [HttpPost("contacts/{contactId}/tasks")]
    public async Task<IActionResult> CreateContactTask(string contactId, [FromBody] CreateTaskRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateContactTaskAsync(email, contactId, request));
    }

    [HttpPatch("contacts/{contactId}/tasks/{taskId}")]
    public async Task<IActionResult> UpdateContactTask(string contactId, string taskId, [FromBody] UpdateTaskRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateContactTaskAsync(email, contactId, taskId, request));
    }

    [HttpPost("contacts/import-csv")]
    public async Task<IActionResult> ImportCsv([FromBody] ImportCsvRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.ImportContactsCsvAsync(email, request));
    }

    [HttpGet("contacts/{contactId}/lead-stage-history")]
    public async Task<IActionResult> GetLeadStageHistory(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetLeadStageHistoryAsync(email, contactId));
    }

    [HttpGet("contacts/export")]
    public async Task<IActionResult> ExportContacts(
        [FromQuery] string format = "csv",
        [FromQuery] string? search = null, [FromQuery] string? leadStage = null, [FromQuery] string? ownerEmail = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        var result = await _svc.ExportContactsCsvAsync(email, search, leadStage, ownerEmail);
        if (!result.Success) return StatusCode(result.StatusCode, new { error = result.Error });
        var data = (dynamic)result.Data!;
        return File((byte[])data.csvBytes, "text/csv", "contacts.csv");
    }

    // ── Tasks (global) ──────────────────────────────────────────────────

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(
        [FromQuery] string? ownerEmail = null, [FromQuery] string? status = null, [FromQuery] string? due = null,
        [FromQuery] int? limit = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTasksAsync(email, ownerEmail, status, due, limit, page, pageSize));
    }

    // ── Pipeline ────────────────────────────────────────────────────────

    [HttpGet("pipeline")]
    public async Task<IActionResult> GetPipeline(
        [FromQuery] string? ownerEmail = null, [FromQuery] string? search = null,
        [FromQuery] string? stage = null, [FromQuery] int pageSize = 200)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetPipelineAsync(email, ownerEmail, search, stage, pageSize));
    }

    // ── Lists ───────────────────────────────────────────────────────────

    [HttpGet("lists")]
    public async Task<IActionResult> GetLists([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetListsAsync(email, page, pageSize));
    }

    [HttpPost("lists")]
    public async Task<IActionResult> CreateList([FromBody] CreateListRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateListAsync(email, request));
    }

    [HttpGet("lists/{listId}/members")]
    public async Task<IActionResult> GetListMembers(string listId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetListMembersAsync(email, listId));
    }

    [HttpPost("lists/{listId}/members/{contactId}")]
    public async Task<IActionResult> AddListMember(string listId, string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddListMemberAsync(email, listId, contactId));
    }

    [HttpPost("lists/{listId}/members/bulk")]
    public async Task<IActionResult> AddListMembersBulk(string listId, [FromBody] BulkAddMembersRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddListMembersBulkAsync(email, listId, request));
    }

    [HttpDelete("lists/{listId}")]
    public async Task<IActionResult> DeleteList(string listId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteListAsync(email, listId));
    }

    // ── Suppressions ────────────────────────────────────────────────────

    [HttpGet("suppressions")]
    public async Task<IActionResult> GetSuppressions()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetSuppressionsAsync(email));
    }

    [HttpGet("suppressions/summary")]
    public async Task<IActionResult> GetSuppressionSummary()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetSuppressionSummaryAsync(email));
    }

    [HttpPost("suppressions")]
    public async Task<IActionResult> AddSuppression([FromBody] CreateSuppressionRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddSuppressionAsync(email, request));
    }

    [HttpDelete("suppressions/{email}")]
    public async Task<IActionResult> RemoveSuppression(string email)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.RemoveSuppressionAsync(userEmail, email));
    }

    // ── Segments ────────────────────────────────────────────────────────

    [HttpGet("segments")]
    public async Task<IActionResult> GetSegments()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetSegmentsAsync(email));
    }

    [HttpPost("segments")]
    public async Task<IActionResult> CreateSegment([FromBody] CreateSegmentRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateSegmentAsync(email, request));
    }

    // ── Tokens ──────────────────────────────────────────────────────────

    [HttpGet("tokens")]
    public IActionResult GetTokens() => ToApiResult(_svc.GetAllowedTokens());

    // ── Templates ───────────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] string? category = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTemplatesAsync(email, category, page, pageSize));
    }

    [HttpGet("templates/{templateId}")]
    public async Task<IActionResult> GetTemplateById(string templateId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTemplateByIdAsync(email, templateId));
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateTemplateAsync(email, request));
    }

    [HttpPut("templates/{templateId}")]
    public async Task<IActionResult> UpdateTemplate(string templateId, [FromBody] CreateTemplateRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateTemplateAsync(email, templateId, request));
    }

    [HttpPost("templates/preview")]
    public async Task<IActionResult> PreviewTemplate([FromBody] TemplatePreviewRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PreviewTemplateAsync(email, request));
    }

    [HttpDelete("templates/{templateId}")]
    public async Task<IActionResult> DeleteTemplate(string templateId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteTemplateAsync(email, templateId));
    }

    // ── Campaigns ───────────────────────────────────────────────────────

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetCampaignsAsync(email, page, pageSize));
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateCampaignAsync(email, request));
    }

    [HttpPost("campaigns/{campaignId}/send")]
    public async Task<IActionResult> SendCampaign(string campaignId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.SendCampaignAsync(email, campaignId));
    }

    [HttpDelete("campaigns/{campaignId}")]
    public async Task<IActionResult> DeleteCampaign(string campaignId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteCampaignAsync(email, campaignId));
    }

    [HttpGet("campaigns/export")]
    public async Task<IActionResult> ExportCampaigns([FromQuery] string format = "csv")
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        var result = await _svc.ExportCampaignsCsvAsync(email);
        if (!result.Success) return StatusCode(result.StatusCode, new { error = result.Error });
        var data = (dynamic)result.Data!;
        return File((byte[])data.csvBytes, "text/csv", "campaigns.csv");
    }

    // ── Events ──────────────────────────────────────────────────────────

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(
        [FromQuery] string? contactId = null, [FromQuery] string? eventType = null,
        [FromQuery] int limit = 50, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetEventsAsync(email, contactId, eventType, limit, page, pageSize));
    }

    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateEventAsync(email, request));
    }

    [AllowAnonymous]
    [HttpGet("track/open")]
    public async Task<IActionResult> TrackOpen(
        [FromQuery] string userEmail, [FromQuery] string contactId,
        [FromQuery] string? campaignId = null, [FromQuery] string? journeyId = null, [FromQuery] string? messageId = null)
    {
        await _svc.TrackOpenAsync(userEmail, contactId, campaignId, journeyId, messageId);
        var gifBytes = Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
        return File(gifBytes, "image/gif");
    }

    [AllowAnonymous]
    [HttpGet("track/click")]
    public async Task<IActionResult> TrackClick(
        [FromQuery] string userEmail, [FromQuery] string contactId, [FromQuery] string url,
        [FromQuery] string? campaignId = null, [FromQuery] string? journeyId = null, [FromQuery] string? messageId = null)
    {
        var target = await _svc.TrackClickAsync(userEmail, contactId, url, campaignId, journeyId, messageId);
        return Redirect(target);
    }

    // ── Journeys ────────────────────────────────────────────────────────

    [HttpGet("journeys/summary")]
    public async Task<IActionResult> GetJourneySummary()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneySummaryAsync(email));
    }

    [HttpGet("journeys")]
    public async Task<IActionResult> GetJourneys()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneysAsync(email));
    }

    [HttpPost("journeys")]
    public async Task<IActionResult> CreateJourney([FromBody] CreateJourneyRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateJourneyAsync(email, request));
    }

    [HttpGet("journeys/{journeyId}")]
    public async Task<IActionResult> GetJourneyById(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneyByIdAsync(email, journeyId));
    }

    [HttpPut("journeys/{journeyId}/steps")]
    public async Task<IActionResult> UpsertJourneySteps(string journeyId, [FromBody] List<UpsertJourneyStepRequest> steps)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpsertJourneyStepsAsync(email, journeyId, steps));
    }

    [HttpPost("journeys/{journeyId}/publish")]
    public async Task<IActionResult> PublishJourney(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PublishJourneyAsync(email, journeyId));
    }

    [HttpPost("journeys/{journeyId}/pause")]
    public async Task<IActionResult> PauseJourney(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PauseJourneyAsync(email, journeyId));
    }

    // ── Analytics ───────────────────────────────────────────────────────

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(
        [FromQuery] int days = 30, [FromQuery] string? ownerEmail = null,
        [FromQuery] DateTime? fromUtc = null, [FromQuery] DateTime? toUtc = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetAnalyticsAsync(email, days, ownerEmail, fromUtc, toUtc));
    }

    // ── Global Search ───────────────────────────────────────────────────

    [HttpGet("/api/v1/search")]
    public async Task<IActionResult> GlobalSearch([FromQuery] string? q = null, [FromQuery] int limit = 20)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GlobalSearchAsync(email, q, limit));
    }
}

