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
[Route("api/v{version:apiVersion}/lists")]
public class ListsController : ApiControllerBase
{
    private readonly IMarketingService _svc;
    public ListsController(IMarketingService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetLists([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetListsAsync(email, page, pageSize));
    }

    [HttpPost]
    public async Task<IActionResult> CreateList([FromBody] CreateListRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.CreateListAsync(email, request));
    }

    [HttpGet("{listId}/members")]
    public async Task<IActionResult> GetListMembers(string listId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.GetListMembersAsync(email, listId));
    }

    [HttpPost("{listId}/members/{contactId}")]
    public async Task<IActionResult> AddListMember(string listId, string contactId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddListMemberAsync(email, listId, contactId));
    }

    [HttpPost("{listId}/members/bulk")]
    public async Task<IActionResult> AddListMembersBulk(string listId, [FromBody] BulkAddMembersRequest request)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.AddListMembersBulkAsync(email, listId, request));
    }

    [HttpDelete("{listId}")]
    public async Task<IActionResult> DeleteList(string listId)
    {
        var email = GetUserEmail();
        if (string.IsNullOrWhiteSpace(email)) return UnauthorizedMissingEmail();
        return ToApiResult(await _svc.DeleteListAsync(email, listId));
    }
}
