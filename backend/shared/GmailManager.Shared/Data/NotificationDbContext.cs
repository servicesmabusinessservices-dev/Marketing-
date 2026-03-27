using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Shared.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options) { }

    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var notifications = modelBuilder.Entity<NotificationEntity>();
        notifications.HasKey(x => x.NotificationId);
        notifications.HasIndex(x => new { x.UserEmail, x.IsRead, x.CreatedAtUtc });
        notifications.Property(x => x.NotificationId).HasMaxLength(32).HasCharSet("ascii");
        notifications.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        notifications.Property(x => x.Type).HasMaxLength(60).HasCharSet("ascii");
        notifications.Property(x => x.Title).HasMaxLength(300);
        notifications.Property(x => x.Message).HasMaxLength(1000);
        notifications.Property(x => x.LinkUrl).HasMaxLength(500);
    }
}
