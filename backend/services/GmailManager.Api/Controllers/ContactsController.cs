using Asp.Versioning;
using GmailManager.Api.DTOs.Marketing;
using GmailManager.Api.Services.Interfaces;
using GmailManager.Shared.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GmailManager.Api.Controllers;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/contacts")]
public class ContactsController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public ContactsController(IMarketingService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetContacts(
        [FromQuery] string? search = null, [FromQuery] string? q = null, [FromQuery] string? tag = null,
        [FromQuery] string? leadStage = null, [FromQuery] string? ownerEmail = null,
        [FromQuery] int? limit = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactsAsync(email, search, q, tag, leadStage, ownerEmail, limit, page, pageSize));
    }

    [HttpGet("{contactId}")]
    public async Task<IActionResult> GetContactById(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactByIdAsync(email, contactId));
    }

    [HttpPost]
    public async Task<IActionResult> UpsertContact([FromBody] UpsertContactRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpsertContactAsync(email, request));
    }

    [HttpPost("{contactId}/lead-stage")]
    public async Task<IActionResult> UpdateLeadStage(string contactId, [FromBody] UpdateLeadStageRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateLeadStageAsync(email, contactId, request));
    }

    [HttpPost("{contactId}/owner")]
    public async Task<IActionResult> AssignOwner(string contactId, [FromBody] AssignOwnerRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AssignContactOwnerAsync(email, contactId, request));
    }

    [HttpGet("{contactId}/notes")]
    public async Task<IActionResult> GetNotes(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactNotesAsync(email, contactId));
    }

    [HttpPost("{contactId}/notes")]
    public async Task<IActionResult> AddNote(string contactId, [FromBody] AddNoteRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddContactNoteAsync(email, contactId, request));
    }

    [HttpGet("{contactId}/tasks")]
    public async Task<IActionResult> GetContactTasks(string contactId,
        [FromQuery] string? status = null, [FromQuery] bool onlyOverdue = false)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetContactTasksAsync(email, contactId, status, onlyOverdue));
    }

    [HttpPost("{contactId}/tasks")]
    public async Task<IActionResult> CreateContactTask(string contactId, [FromBody] CreateTaskRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateContactTaskAsync(email, contactId, request));
    }

    [HttpPatch("{contactId}/tasks/{taskId}")]
    public async Task<IActionResult> UpdateContactTask(string contactId, string taskId, [FromBody] UpdateTaskRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateContactTaskAsync(email, contactId, taskId, request));
    }

    [HttpPost("import-csv")]
    public async Task<IActionResult> ImportCsv([FromBody] ImportCsvRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.ImportContactsCsvAsync(email, request));
    }

    [HttpGet("{contactId}/lead-stage-history")]
    public async Task<IActionResult> GetLeadStageHistory(string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetLeadStageHistoryAsync(email, contactId));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportContacts(
        [FromQuery] string format = "csv",
        [FromQuery] string? search = null, [FromQuery] string? leadStage = null, [FromQuery] string? ownerEmail = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        var result = await _svc.ExportContactsCsvAsync(email, search, leadStage, ownerEmail);
        if (!result.Success) return ToApiResult(result);
        var data = (dynamic)result.Data!;
        return File((byte[])data.csvBytes, "text/csv", "contacts.csv");
    }
}
