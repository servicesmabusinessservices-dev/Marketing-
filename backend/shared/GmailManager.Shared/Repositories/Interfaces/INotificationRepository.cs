using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface INotificationRepository
{
    Task<List<NotificationEntity>> GetNotificationsAsync(AppDbContext db, string userEmail, bool unreadOnly, int limit = 50);
    Task<int> GetUnreadCountAsync(AppDbContext db, string userEmail);
    Task<NotificationEntity?> GetByIdAsync(AppDbContext db, string userEmail, string notificationId);
    Task MarkAsReadAsync(AppDbContext db, NotificationEntity notification);
    Task MarkAllAsReadAsync(AppDbContext db, string userEmail);
    Task AddAsync(AppDbContext db, NotificationEntity notification);
}
