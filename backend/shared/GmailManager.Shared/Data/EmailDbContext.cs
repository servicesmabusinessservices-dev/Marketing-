using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Shared.Data;

public class EmailDbContext : DbContext
{
    public EmailDbContext(DbContextOptions<EmailDbContext> options) : base(options) { }

    public DbSet<EmailClassificationEntity> EmailClassifications => Set<EmailClassificationEntity>();
    public DbSet<BulkEmailJobEntity> BulkEmailJobs => Set<BulkEmailJobEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var bulkEmailJobs = modelBuilder.Entity<BulkEmailJobEntity>();
        bulkEmailJobs.HasKey(x => x.JobId);
        bulkEmailJobs.Property(x => x.JobId).HasMaxLength(64).HasCharSet("ascii");
        bulkEmailJobs.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");

        var emailClassifications = modelBuilder.Entity<EmailClassificationEntity>();
        emailClassifications.HasKey(x => new { x.UserEmail, x.MessageId });
        emailClassifications.HasIndex(x => x.UserEmail);
        emailClassifications.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        emailClassifications.Property(x => x.MessageId).HasMaxLength(255).HasCharSet("ascii");
        emailClassifications.Property(x => x.Classification).HasMaxLength(64);
    }
}
