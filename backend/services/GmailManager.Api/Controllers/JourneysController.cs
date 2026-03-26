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
[Route("api/v{version:apiVersion}/journeys")]
public class JourneysController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public JourneysController(IMarketingService svc) => _svc = svc;

    [HttpGet("summary")]
    public async Task<IActionResult> GetJourneySummary()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneySummaryAsync(email));
    }

    [HttpGet]
    public async Task<IActionResult> GetJourneys()
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneysAsync(email));
    }

    [HttpPost]
    public async Task<IActionResult> CreateJourney([FromBody] CreateJourneyRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateJourneyAsync(email, request));
    }

    [HttpGet("{journeyId}")]
    public async Task<IActionResult> GetJourneyById(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetJourneyByIdAsync(email, journeyId));
    }

    [HttpPut("{journeyId}/steps")]
    public async Task<IActionResult> UpsertJourneySteps(string journeyId, [FromBody] List<UpsertJourneyStepRequest> steps)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpsertJourneyStepsAsync(email, journeyId, steps));
    }

    [HttpPost("{journeyId}/publish")]
    public async Task<IActionResult> PublishJourney(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PublishJourneyAsync(email, journeyId));
    }

    [HttpPost("{journeyId}/pause")]
    public async Task<IActionResult> PauseJourney(string journeyId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PauseJourneyAsync(email, journeyId));
    }
}
