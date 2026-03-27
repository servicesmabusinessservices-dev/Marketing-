using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Analytics.Controllers;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/analytics")]
public class AnalyticsController : ApiControllerBase
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IDbContextFactory<AppDbContext> dbFactory, ILogger<AnalyticsController> logger)
    {
        _dbFactory = dbFactory;
        _logger = logger;
    }

    // Analytics endpoints will be extracted from MarketingService in a future iteration.
    // For now, the gateway host's MarketingController handles these routes:
    //   GET /api/v1/marketing/analytics
    //   GET /api/v1/marketing/pipeline
    //   GET /api/v1/marketing/contacts/export
    //   GET /api/v1/marketing/campaigns/export
    //   GET /api/v1/search

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health() => Ok(new { service = "analytics", status = "healthy" });
}
