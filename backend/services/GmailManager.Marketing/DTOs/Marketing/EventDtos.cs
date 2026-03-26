namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateEventRequest
{
    public string EventType { get; set; } = string.Empty;
    public string ContactId { get; set; } = string.Empty;
    public string? CampaignId { get; set; }
    public string? JourneyId { get; set; }
    public string? MessageId { get; set; }
    public string? SourceEventId { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
    public DateTime? OccurredAtUtc { get; set; }
}
