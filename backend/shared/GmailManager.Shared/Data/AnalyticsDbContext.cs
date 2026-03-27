using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Shared.Data;

public class AnalyticsDbContext : DbContext
{
    public AnalyticsDbContext(DbContextOptions<AnalyticsDbContext> options) : base(options) { }

    public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
    public DbSet<CampaignEntity> Campaigns => Set<CampaignEntity>();
    public DbSet<MessageEventEntity> MessageEvents => Set<MessageEventEntity>();
    public DbSet<CrmTaskEntity> CrmTasks => Set<CrmTaskEntity>();
    public DbSet<JourneyEntity> Journeys => Set<JourneyEntity>();
    public DbSet<JourneyEnrollmentEntity> JourneyEnrollments => Set<JourneyEnrollmentEntity>();
    public DbSet<LeadStageHistoryEntity> LeadStageHistory => Set<LeadStageHistoryEntity>();
    public DbSet<SuppressionEntryEntity> Suppressions => Set<SuppressionEntryEntity>();
    public DbSet<ContactListEntity> ContactLists => Set<ContactListEntity>();
    public DbSet<ContactListMemberEntity> ContactListMembers => Set<ContactListMemberEntity>();
    public DbSet<CampaignTemplateEntity> CampaignTemplates => Set<CampaignTemplateEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Read-only context — mirror key/index configuration from AppDbContext
        var contacts = modelBuilder.Entity<ContactEntity>();
        contacts.HasKey(x => x.ContactId);
        contacts.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        contacts.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        contacts.Property(x => x.DealValue).HasPrecision(18, 2);

        var campaigns = modelBuilder.Entity<CampaignEntity>();
        campaigns.HasKey(x => x.CampaignId);
        campaigns.Property(x => x.CampaignId).HasMaxLength(32).HasCharSet("ascii");
        campaigns.Property(x => x.CampaignCost).HasPrecision(18, 2);

        var messageEvents = modelBuilder.Entity<MessageEventEntity>();
        messageEvents.HasKey(x => x.EventId);
        messageEvents.Property(x => x.EventId).HasMaxLength(32).HasCharSet("ascii");

        var crmTasks = modelBuilder.Entity<CrmTaskEntity>();
        crmTasks.HasKey(x => x.TaskId);
        crmTasks.Property(x => x.TaskId).HasMaxLength(32).HasCharSet("ascii");

        var journeys = modelBuilder.Entity<JourneyEntity>();
        journeys.HasKey(x => x.JourneyId);
        journeys.Property(x => x.JourneyId).HasMaxLength(32).HasCharSet("ascii");

        var journeyEnrollments = modelBuilder.Entity<JourneyEnrollmentEntity>();
        journeyEnrollments.HasKey(x => x.EnrollmentId);
        journeyEnrollments.Property(x => x.EnrollmentId).HasMaxLength(32).HasCharSet("ascii");

        var leadStageHistory = modelBuilder.Entity<LeadStageHistoryEntity>();
        leadStageHistory.HasKey(x => x.HistoryId);
        leadStageHistory.Property(x => x.HistoryId).HasMaxLength(32).HasCharSet("ascii");

        var suppressions = modelBuilder.Entity<SuppressionEntryEntity>();
        suppressions.HasKey(x => new { x.UserEmail, x.EmailNormalized });
        suppressions.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        suppressions.Property(x => x.EmailNormalized).HasMaxLength(320).HasCharSet("ascii");

        var contactLists = modelBuilder.Entity<ContactListEntity>();
        contactLists.HasKey(x => x.ListId);
        contactLists.Property(x => x.ListId).HasMaxLength(32).HasCharSet("ascii");

        var contactListMembers = modelBuilder.Entity<ContactListMemberEntity>();
        contactListMembers.HasKey(x => new { x.UserEmail, x.ListId, x.ContactId });

        var campaignTemplates = modelBuilder.Entity<CampaignTemplateEntity>();
        campaignTemplates.HasKey(x => x.TemplateId);
        campaignTemplates.Property(x => x.TemplateId).HasMaxLength(32).HasCharSet("ascii");
    }
}
