using Asp.Versioning;
using GmailManager.Api.DTOs.Marketing;
using GmailManager.Api.Services.Interfaces;
using GmailManager.Shared.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GmailManager.Api.Controllers;

/// <summary>
/// Marketing-specific endpoints: suppressions, segments, events,
/// tracking pixels, pipeline, analytics, and cross-contact tasks.
/// Contacts, campaigns, templates, journeys, lists, and search
/// have been extracted to their own controllers.
/// </summary>
[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/marketing")]
public class MarketingController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public MarketingController(IMarketingService svc) => _svc = svc;

    // -- Tasks (global) --------------------------------------------------

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(
        [FromQuery] string? ownerEmail = null, [FromQuery] string? status = null, [FromQuery] string? due = null,
        [FromQuery] int? limit = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTasksAsync(email, ownerEmail, status, due, limit, page, pageSize));
    }

    // -- Pipeline --------------------------------------------------------

    [HttpGet("pipeline")]
    public async Task<IActionResult> GetPipeline(
        [FromQuery] string? ownerEmail = null, [FromQuery] string? search = null,
        [FromQuery] string? stage = null, [FromQuery] int pageSize = 200)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetPipelineAsync(email, ownerEmail, search, stage, pageSize));
    }

    // -- Suppressions ----------------------------------------------------

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

    // -- Segments --------------------------------------------------------

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

    // -- Events ----------------------------------------------------------

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

    // -- Analytics -------------------------------------------------------

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(
        [FromQuery] int days = 30, [FromQuery] string? ownerEmail = null,
        [FromQuery] DateTime? fromUtc = null, [FromQuery] DateTime? toUtc = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetAnalyticsAsync(email, days, ownerEmail, fromUtc, toUtc));
    }
}
