using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.DTOs.Marketing;

public sealed class CreateCampaignRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public string? TemplateId { get; set; }

    public string? ListId { get; set; }

    public string? SegmentId { get; set; }

    [Range(0, 100_000_000)]
    public decimal? CampaignCost { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Draft";

    public DateTime? ScheduledAtUtc { get; set; }
}
