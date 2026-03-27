using Asp.Versioning;
using GmailManager.Api.Services.Interfaces;
using GmailManager.Shared.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GmailManager.Api.Controllers;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/search")]
public class SearchController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public SearchController(IMarketingService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GlobalSearch([FromQuery] string? q = null, [FromQuery] int limit = 20)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GlobalSearchAsync(email, q, limit));
    }
}
