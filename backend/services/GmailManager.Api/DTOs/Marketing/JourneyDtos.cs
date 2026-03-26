namespace GmailManager.Api.DTOs.Marketing;

public sealed class CreateJourneyRequest
{
    public string Name { get; set; } = string.Empty;
    public string TriggerType { get; set; } = "list_joined";
    public string? TriggerRefId { get; set; }
}

public sealed class UpsertJourneyStepRequest
{
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
