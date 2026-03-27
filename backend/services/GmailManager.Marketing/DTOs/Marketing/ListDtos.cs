using System.ComponentModel.DataAnnotations;

namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateListRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }
}

public sealed class CreateSegmentRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string FilterJson { get; set; } = "{}";
}

public sealed class CreateSuppressionRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Reason { get; set; } = "Unsubscribed";

    [MaxLength(500)]
    public string? Notes { get; set; }
}
