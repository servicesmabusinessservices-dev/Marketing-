using GmailManager.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<UserTokenEntity> UserTokens => Set<UserTokenEntity>();
    public DbSet<BulkEmailJobEntity> BulkEmailJobs => Set<BulkEmailJobEntity>();
    public DbSet<EmailClassificationEntity> EmailClassifications => Set<EmailClassificationEntity>();
    public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
    public DbSet<ContactListEntity> ContactLists => Set<ContactListEntity>();
    public DbSet<ContactListMemberEntity> ContactListMembers => Set<ContactListMemberEntity>();
    public DbSet<SuppressionEntryEntity> Suppressions => Set<SuppressionEntryEntity>();
    public DbSet<SegmentEntity> Segments => Set<SegmentEntity>();
    public DbSet<CampaignTemplateEntity> CampaignTemplates => Set<CampaignTemplateEntity>();
    public DbSet<CampaignEntity> Campaigns => Set<CampaignEntity>();
    public DbSet<JourneyEntity> Journeys => Set<JourneyEntity>();
    public DbSet<JourneyStepEntity> JourneySteps => Set<JourneyStepEntity>();
    public DbSet<JourneyEnrollmentEntity> JourneyEnrollments => Set<JourneyEnrollmentEntity>();
    public DbSet<MessageEventEntity> MessageEvents => Set<MessageEventEntity>();
    public DbSet<LeadStageHistoryEntity> LeadStageHistory => Set<LeadStageHistoryEntity>();
    public DbSet<CrmNoteEntity> CrmNotes => Set<CrmNoteEntity>();
    public DbSet<CrmTaskEntity> CrmTasks => Set<CrmTaskEntity>();
    public DbSet<PlatformUpdateEntity> PlatformUpdates => Set<PlatformUpdateEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var userTokens = modelBuilder.Entity<UserTokenEntity>();
        userTokens.HasKey(x => x.Email);
        userTokens.Property(x => x.Email).HasMaxLength(320).HasCharSet("ascii");

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

        var contacts = modelBuilder.Entity<ContactEntity>();
        contacts.HasKey(x => x.ContactId);
        contacts.HasIndex(x => new { x.UserEmail, x.EmailNormalized }).IsUnique();
        contacts.HasIndex(x => new { x.UserEmail, x.LeadStage });
        contacts.HasIndex(x => new { x.UserEmail, x.OwnerEmail });
        contacts.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        contacts.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        contacts.Property(x => x.Email).HasMaxLength(320).HasCharSet("ascii");
        contacts.Property(x => x.EmailNormalized).HasMaxLength(320).HasCharSet("ascii");
        contacts.Property(x => x.FirstName).HasMaxLength(120);
        contacts.Property(x => x.LastName).HasMaxLength(120);
        contacts.Property(x => x.Company).HasMaxLength(200);
        contacts.Property(x => x.ServiceInterest).HasMaxLength(120);
        contacts.Property(x => x.Timezone).HasMaxLength(80);
        contacts.Property(x => x.Location).HasMaxLength(120);
        contacts.Property(x => x.LeadStage).HasMaxLength(50).HasCharSet("ascii");
        contacts.Property(x => x.OwnerEmail).HasMaxLength(320).HasCharSet("ascii");
        contacts.Property(x => x.Source).HasMaxLength(120);
        contacts.Property(x => x.DealValue).HasPrecision(18, 2);

        var contactLists = modelBuilder.Entity<ContactListEntity>();
        contactLists.HasKey(x => x.ListId);
        contactLists.HasIndex(x => new { x.UserEmail, x.Name });
        contactLists.Property(x => x.ListId).HasMaxLength(32).HasCharSet("ascii");
        contactLists.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        contactLists.Property(x => x.Name).HasMaxLength(200).HasCharSet("ascii");

        var contactListMembers = modelBuilder.Entity<ContactListMemberEntity>();
        contactListMembers.HasKey(x => new { x.UserEmail, x.ListId, x.ContactId });
        contactListMembers.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        contactListMembers.Property(x => x.ListId).HasMaxLength(32).HasCharSet("ascii");
        contactListMembers.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");

        var suppressions = modelBuilder.Entity<SuppressionEntryEntity>();
        suppressions.HasKey(x => new { x.UserEmail, x.EmailNormalized });
        suppressions.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        suppressions.Property(x => x.EmailNormalized).HasMaxLength(320).HasCharSet("ascii");
        suppressions.Property(x => x.Email).HasMaxLength(320).HasCharSet("ascii");
        suppressions.Property(x => x.Reason).HasMaxLength(120);

        var segments = modelBuilder.Entity<SegmentEntity>();
        segments.HasKey(x => x.SegmentId);
        segments.HasIndex(x => new { x.UserEmail, x.Name });
        segments.Property(x => x.SegmentId).HasMaxLength(32).HasCharSet("ascii");
        segments.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        segments.Property(x => x.Name).HasMaxLength(200).HasCharSet("ascii");

        var campaignTemplates = modelBuilder.Entity<CampaignTemplateEntity>();
        campaignTemplates.HasKey(x => x.TemplateId);
        campaignTemplates.HasIndex(x => new { x.UserEmail, x.Category, x.Name });
        campaignTemplates.Property(x => x.TemplateId).HasMaxLength(32).HasCharSet("ascii");
        campaignTemplates.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        campaignTemplates.Property(x => x.Name).HasMaxLength(200).HasCharSet("ascii");
        campaignTemplates.Property(x => x.Category).HasMaxLength(50).HasCharSet("ascii");
        campaignTemplates.Property(x => x.Subject).HasMaxLength(300);

        var campaigns = modelBuilder.Entity<CampaignEntity>();
        campaigns.HasKey(x => x.CampaignId);
        campaigns.HasIndex(x => new { x.UserEmail, x.Status });
        campaigns.Property(x => x.CampaignId).HasMaxLength(32).HasCharSet("ascii");
        campaigns.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        campaigns.Property(x => x.Name).HasMaxLength(200);
        campaigns.Property(x => x.Status).HasMaxLength(50).HasCharSet("ascii");
        campaigns.Property(x => x.TemplateId).HasMaxLength(32).HasCharSet("ascii");
        campaigns.Property(x => x.ListId).HasMaxLength(32).HasCharSet("ascii");
        campaigns.Property(x => x.SegmentId).HasMaxLength(32).HasCharSet("ascii");
        campaigns.Property(x => x.CampaignCost).HasPrecision(18, 2);

        var journeys = modelBuilder.Entity<JourneyEntity>();
        journeys.HasKey(x => x.JourneyId);
        journeys.HasIndex(x => new { x.UserEmail, x.Status });
        journeys.Property(x => x.JourneyId).HasMaxLength(32).HasCharSet("ascii");
        journeys.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        journeys.Property(x => x.Name).HasMaxLength(200);
        journeys.Property(x => x.TriggerType).HasMaxLength(80).HasCharSet("ascii");
        journeys.Property(x => x.TriggerRefId).HasMaxLength(64).HasCharSet("ascii");
        journeys.Property(x => x.Status).HasMaxLength(50).HasCharSet("ascii");

        var journeySteps = modelBuilder.Entity<JourneyStepEntity>();
        journeySteps.HasKey(x => new { x.JourneyId, x.StepOrder });
        journeySteps.Property(x => x.JourneyId).HasMaxLength(32).HasCharSet("ascii");
        journeySteps.Property(x => x.StepType).HasMaxLength(80).HasCharSet("ascii");
        journeySteps.Property(x => x.TemplateId).HasMaxLength(32).HasCharSet("ascii");
        journeySteps.Property(x => x.ConditionEventType).HasMaxLength(80).HasCharSet("ascii");
        journeySteps.Property(x => x.ToLeadStage).HasMaxLength(50).HasCharSet("ascii");

        var journeyEnrollments = modelBuilder.Entity<JourneyEnrollmentEntity>();
        journeyEnrollments.HasKey(x => x.EnrollmentId);
        journeyEnrollments.HasIndex(x => new { x.UserEmail, x.JourneyId, x.Status });
        journeyEnrollments.Property(x => x.EnrollmentId).HasMaxLength(32).HasCharSet("ascii");
        journeyEnrollments.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        journeyEnrollments.Property(x => x.JourneyId).HasMaxLength(32).HasCharSet("ascii");
        journeyEnrollments.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        journeyEnrollments.Property(x => x.Status).HasMaxLength(50).HasCharSet("ascii");
        journeyEnrollments.Property(x => x.TriggerEventId).HasMaxLength(32).HasCharSet("ascii");

        var messageEvents = modelBuilder.Entity<MessageEventEntity>();
        messageEvents.HasKey(x => x.EventId);
        messageEvents.HasIndex(x => new { x.UserEmail, x.ContactId, x.EventType, x.OccurredAtUtc });
        messageEvents.HasIndex(x => new { x.UserEmail, x.SourceEventId, x.EventType });
        messageEvents.Property(x => x.EventId).HasMaxLength(32).HasCharSet("ascii");
        messageEvents.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        messageEvents.Property(x => x.EventType).HasMaxLength(80).HasCharSet("ascii");
        messageEvents.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        messageEvents.Property(x => x.CampaignId).HasMaxLength(32).HasCharSet("ascii");
        messageEvents.Property(x => x.JourneyId).HasMaxLength(32).HasCharSet("ascii");
        messageEvents.Property(x => x.MessageId).HasMaxLength(255).HasCharSet("ascii");
        messageEvents.Property(x => x.SourceEventId).HasMaxLength(64).HasCharSet("ascii");

        var leadStageHistory = modelBuilder.Entity<LeadStageHistoryEntity>();
        leadStageHistory.HasKey(x => x.HistoryId);
        leadStageHistory.HasIndex(x => new { x.UserEmail, x.ContactId, x.CreatedAtUtc });
        leadStageHistory.Property(x => x.HistoryId).HasMaxLength(32).HasCharSet("ascii");
        leadStageHistory.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        leadStageHistory.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        leadStageHistory.Property(x => x.FromStage).HasMaxLength(50).HasCharSet("ascii");
        leadStageHistory.Property(x => x.ToStage).HasMaxLength(50).HasCharSet("ascii");
        leadStageHistory.Property(x => x.Reason).HasMaxLength(200);
        leadStageHistory.Property(x => x.EventType).HasMaxLength(80).HasCharSet("ascii");
        leadStageHistory.Property(x => x.EventId).HasMaxLength(32).HasCharSet("ascii");

        var crmNotes = modelBuilder.Entity<CrmNoteEntity>();
        crmNotes.HasKey(x => x.NoteId);
        crmNotes.HasIndex(x => new { x.UserEmail, x.ContactId, x.CreatedAtUtc });
        crmNotes.Property(x => x.NoteId).HasMaxLength(32).HasCharSet("ascii");
        crmNotes.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        crmNotes.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");

        var crmTasks = modelBuilder.Entity<CrmTaskEntity>();
        crmTasks.HasKey(x => x.TaskId);
        crmTasks.HasIndex(x => new { x.UserEmail, x.ContactId, x.Status, x.DueAtUtc });
        crmTasks.HasIndex(x => new { x.UserEmail, x.OwnerEmail, x.Status });
        crmTasks.Property(x => x.TaskId).HasMaxLength(32).HasCharSet("ascii");
        crmTasks.Property(x => x.UserEmail).HasMaxLength(320).HasCharSet("ascii");
        crmTasks.Property(x => x.ContactId).HasMaxLength(32).HasCharSet("ascii");
        crmTasks.Property(x => x.Title).HasMaxLength(200);
        crmTasks.Property(x => x.Status).HasMaxLength(50).HasCharSet("ascii");
        crmTasks.Property(x => x.Priority).HasMaxLength(20).HasCharSet("ascii");
        crmTasks.Property(x => x.OwnerEmail).HasMaxLength(320).HasCharSet("ascii");

        var platformUpdates = modelBuilder.Entity<PlatformUpdateEntity>();
        platformUpdates.HasKey(x => x.UpdateId);
        platformUpdates.HasIndex(x => new { x.IsActive, x.IsCritical, x.PublishedAtUtc });
        platformUpdates.HasIndex(x => new { x.Source, x.Category, x.Severity });
        platformUpdates.Property(x => x.UpdateId).HasMaxLength(120).HasCharSet("ascii");
        platformUpdates.Property(x => x.Source).HasMaxLength(80).HasCharSet("ascii");
        platformUpdates.Property(x => x.Category).HasMaxLength(80).HasCharSet("ascii");
        platformUpdates.Property(x => x.Severity).HasMaxLength(40).HasCharSet("ascii");
        platformUpdates.Property(x => x.Title).HasMaxLength(300);
        platformUpdates.Property(x => x.Url).HasMaxLength(500);

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
