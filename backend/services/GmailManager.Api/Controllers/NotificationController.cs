using Asp.Versioning;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Repositories.Interfaces;
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
    private readonly INotificationRepository _notificationRepo;

    public NotificationController(
        IDbContextFactory<AppDbContext> dbContextFactory,
        INotificationRepository notificationRepo)
    {
        _dbContextFactory = dbContextFactory;
        _notificationRepo = notificationRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        var notifications = await _notificationRepo.GetNotificationsAsync(db, userEmail, unreadOnly);
        var unreadCount = await _notificationRepo.GetUnreadCountAsync(db, userEmail);

        return OkResponse(new
        {
            notifications = notifications.Select(x => new
            {
                x.NotificationId,
                x.Type,
                x.Title,
                x.Message,
                x.LinkUrl,
                x.IsRead,
                x.CreatedAtUtc
            }),
            unreadCount
        });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        var notification = await _notificationRepo.GetByIdAsync(db, userEmail, id);
        if (notification == null)
            return NotFoundResponse("Notification not found");

        await _notificationRepo.MarkAsReadAsync(db, notification);
        return OkResponse(new { success = true });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
            return UnauthorizedMissingEmail();

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        await _notificationRepo.MarkAllAsReadAsync(db, userEmail);
        return OkResponse(new { success = true });
    }
}
