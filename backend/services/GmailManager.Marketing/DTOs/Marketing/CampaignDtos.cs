namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateCampaignRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TemplateId { get; set; }
    public string? ListId { get; set; }
    public string? SegmentId { get; set; }
    public decimal? CampaignCost { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? ScheduledAtUtc { get; set; }
}
