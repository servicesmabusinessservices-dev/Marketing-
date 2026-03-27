using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class NotificationRepository : INotificationRepository
{
    public async Task<List<NotificationEntity>> GetNotificationsAsync(
        AppDbContext db, string userEmail, bool unreadOnly, int limit = 50)
    {
        var query = db.Notifications.Where(x => x.UserEmail == userEmail);
        if (unreadOnly)
            query = query.Where(x => !x.IsRead);

        return await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(limit)
            .ToListAsync();
    }

    public Task<int> GetUnreadCountAsync(AppDbContext db, string userEmail)
        => db.Notifications.Where(x => x.UserEmail == userEmail && !x.IsRead).CountAsync();

    public Task<NotificationEntity?> GetByIdAsync(AppDbContext db, string userEmail, string notificationId)
        => db.Notifications.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserEmail == userEmail);

    public async Task MarkAsReadAsync(AppDbContext db, NotificationEntity notification)
    {
        notification.IsRead = true;
        await db.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(AppDbContext db, string userEmail)
    {
        await db.Notifications
            .Where(x => x.UserEmail == userEmail && !x.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }

    public Task AddAsync(AppDbContext db, NotificationEntity notification)
    {
        db.Notifications.Add(notification);
        return Task.CompletedTask;
    }
}
