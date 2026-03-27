using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.DTOs.Marketing;

public sealed class CreateJourneyRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string TriggerType { get; set; } = "list_joined";

    public string? TriggerRefId { get; set; }
}

public sealed class UpsertJourneyStepRequest
{
    [Range(0, 1000)]
    public int StepOrder { get; set; }

    [Required]
    [MaxLength(50)]
    public string StepType { get; set; } = "send_email";

    [Range(0, 525_600)]
    public int DelayMinutes { get; set; }

    public string? TemplateId { get; set; }

    [MaxLength(500)]
    public string? SubjectOverride { get; set; }

    public string? BodyHtmlOverride { get; set; }

    [MaxLength(100)]
    public string? ConditionEventType { get; set; }

    [Range(0, 8760)]
    public int? ConditionWindowHours { get; set; }

    [MaxLength(50)]
    public string? ToLeadStage { get; set; }
}
