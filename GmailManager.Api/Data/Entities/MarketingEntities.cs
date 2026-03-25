namespace GmailManager.Api.Data.Entities;

public class ContactEntity
{
    public string ContactId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string EmailNormalized { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Company { get; set; }
    public string? ServiceInterest { get; set; }
    public string? Timezone { get; set; }
    public decimal? DealValue { get; set; }
    public string? Location { get; set; }
    public string? LeadStage { get; set; }
    public string? OwnerEmail { get; set; }
    public string? Source { get; set; }
    public string TagsJson { get; set; } = "[]";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ContactListEntity
{
    public string ListId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ContactListMemberEntity
{
    public string UserEmail { get; set; } = string.Empty;
    public string ListId { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public DateTime AddedAtUtc { get; set; } = DateTime.UtcNow;
}

public class SuppressionEntryEntity
{
    public string UserEmail { get; set; } = string.Empty;
    public string EmailNormalized { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Reason { get; set; } = "Unsubscribed";
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class SegmentEntity
{
    public string SegmentId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FilterJson { get; set; } = "{}";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CampaignTemplateEntity
{
    public string TemplateId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "welcome";
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string? DesignJson { get; set; }
    public string AllowedTokensJson { get; set; } = "[]";
    public int Version { get; set; } = 1;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CampaignEntity
{
    public string CampaignId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TemplateId { get; set; }
    public string? ListId { get; set; }
    public string? SegmentId { get; set; }
    public decimal? CampaignCost { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? ScheduledAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class JourneyEntity
{
    public string JourneyId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TriggerType { get; set; } = "list_joined";
    public string? TriggerRefId { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class JourneyStepEntity
{
    public string JourneyId { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    public string StepType { get; set; } = "send_email";
    public int DelayMinutes { get; set; }
    public string? TemplateId { get; set; }
    public string? SubjectOverride { get; set; }
    public string? BodyHtmlOverride { get; set; }
    public string? ConditionEventType { get; set; }
    public int? ConditionWindowHours { get; set; }
    public string? ToLeadStage { get; set; }
}

public class JourneyEnrollmentEntity
{
    public string EnrollmentId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string JourneyId { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string? TriggerEventId { get; set; }
    public int LastProcessedStepOrder { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class MessageEventEntity
{
    public string EventId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string? CampaignId { get; set; }
    public string? JourneyId { get; set; }
    public string? MessageId { get; set; }
    public string? SourceEventId { get; set; }
    public string MetadataJson { get; set; } = "{}";
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class LeadStageHistoryEntity
{
    public string HistoryId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string? FromStage { get; set; }
    public string ToStage { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? EventType { get; set; }
    public string? EventId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CrmNoteEntity
{
    public string NoteId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CrmTaskEntity
{
    public string TaskId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Open";
    public string Priority { get; set; } = "Medium";
    public string? OwnerEmail { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class PlatformUpdateEntity
{
    public string UpdateId { get; set; } = Guid.NewGuid().ToString("N");
    public string Source { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Url { get; set; }
    public bool IsCritical { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime PublishedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime RetrievedAtUtc { get; set; } = DateTime.UtcNow;
}

public class NotificationEntity
{
    public string NotificationId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;        // "bulk_complete", "bulk_failed", "journey_complete"
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
