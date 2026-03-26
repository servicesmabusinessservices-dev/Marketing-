namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "welcome";
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string? DesignJson { get; set; }
    public List<string>? AllowedTokens { get; set; }
}

public sealed class TemplatePreviewRequest
{
    public string? TemplateId { get; set; }
    public string? Subject { get; set; }
    public string? BodyHtml { get; set; }
    public string? ContactId { get; set; }
}
