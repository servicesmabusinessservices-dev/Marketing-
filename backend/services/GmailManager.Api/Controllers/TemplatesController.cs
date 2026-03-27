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
[Route("api/v{version:apiVersion}/templates")]
public class TemplatesController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public TemplatesController(IMarketingService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] string? category = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTemplatesAsync(email, category, page, pageSize));
    }

    [HttpGet("{templateId}")]
    public async Task<IActionResult> GetTemplateById(string templateId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetTemplateByIdAsync(email, templateId));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateTemplateAsync(email, request));
    }

    [HttpPut("{templateId}")]
    public async Task<IActionResult> UpdateTemplate(string templateId, [FromBody] CreateTemplateRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.UpdateTemplateAsync(email, templateId, request));
    }

    [HttpPost("preview")]
    public async Task<IActionResult> PreviewTemplate([FromBody] TemplatePreviewRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.PreviewTemplateAsync(email, request));
    }

    [HttpDelete("{templateId}")]
    public async Task<IActionResult> DeleteTemplate(string templateId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteTemplateAsync(email, templateId));
    }

    [HttpGet("tokens")]
    public IActionResult GetTokens() => ToApiResult(_svc.GetAllowedTokens());
}
