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
[Route("api/v{version:apiVersion}/campaigns")]
public class CampaignsController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public CampaignsController(IMarketingService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetCampaigns([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetCampaignsAsync(email, page, pageSize));
    }

    [HttpPost]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateCampaignAsync(email, request));
    }

    [HttpPost("{campaignId}/send")]
    public async Task<IActionResult> SendCampaign(string campaignId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.SendCampaignAsync(email, campaignId));
    }

    [HttpDelete("{campaignId}")]
    public async Task<IActionResult> DeleteCampaign(string campaignId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteCampaignAsync(email, campaignId));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCampaigns([FromQuery] string format = "csv")
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        var result = await _svc.ExportCampaignsCsvAsync(email);
        if (!result.Success) return ToApiResult(result);
        var data = (dynamic)result.Data!;
        return File((byte[])data.csvBytes, "text/csv", "campaigns.csv");
    }
}
