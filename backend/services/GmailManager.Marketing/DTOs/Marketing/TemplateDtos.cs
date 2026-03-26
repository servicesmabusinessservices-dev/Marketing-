using System.ComponentModel.DataAnnotations;

namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateTemplateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = "welcome";

    [Required]
    [MaxLength(500)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string BodyHtml { get; set; } = string.Empty;

    public string? DesignJson { get; set; }

    public List<string>? AllowedTokens { get; set; }
}

public sealed class TemplatePreviewRequest
{
    public string? TemplateId { get; set; }

    [MaxLength(500)]
    public string? Subject { get; set; }

    public string? BodyHtml { get; set; }

    public string? ContactId { get; set; }
}
