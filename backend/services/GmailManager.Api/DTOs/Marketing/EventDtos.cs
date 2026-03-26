using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.DTOs.Marketing;

public sealed class CreateEventRequest
{
    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;

    [Required]
    public string ContactId { get; set; } = string.Empty;

    public string? CampaignId { get; set; }

    public string? JourneyId { get; set; }

    public string? MessageId { get; set; }

    public string? SourceEventId { get; set; }

    public Dictionary<string, string>? Metadata { get; set; }

    public DateTime? OccurredAtUtc { get; set; }
}
