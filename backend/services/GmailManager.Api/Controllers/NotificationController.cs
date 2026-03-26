using Asp.Versioning;
using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Controllers;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/notification")]
public class NotificationController : ApiControllerBase
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;

    public NotificationController(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        var query = db.Notifications.Where(x => x.UserEmail == userEmail);
        if (unreadOnly)
            query = query.Where(x => !x.IsRead);

        var notifications = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(50)
            .Select(x => new
            {
                x.NotificationId,
                x.Type,
                x.Title,
                x.Message,
                x.LinkUrl,
                x.IsRead,
                x.CreatedAtUtc
            })
            .ToListAsync();

        var unreadCount = await db.Notifications
            .Where(x => x.UserEmail == userEmail && !x.IsRead)
            .CountAsync();

        return OkResponse(new { notifications, unreadCount });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        var notification = await db.Notifications
            .FirstOrDefaultAsync(x => x.NotificationId == id && x.UserEmail == userEmail);

        if (notification == null)
            return NotFoundResponse("Notification not found");

        notification.IsRead = true;
        await db.SaveChangesAsync();

        return OkResponse(new { success = true });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        await db.Notifications
            .Where(x => x.UserEmail == userEmail && !x.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return OkResponse(new { success = true });
    }
}
