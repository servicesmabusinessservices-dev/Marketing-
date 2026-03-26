namespace GmailManager.Api.DTOs.Email;

public sealed class SendEmailRequest
{
    public List<string> To { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public sealed class ForwardEmailRequest
{
    public string MessageId { get; set; } = string.Empty;
    public List<string> To { get; set; } = new();
    public string? Note { get; set; }
}

public sealed class BulkEmailRequest
{
    public List<string> Recipients { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DelaySeconds { get; set; } = 3;
}

public sealed class UpdateEmailClassificationRequest
{
    public string Classification { get; set; } = "None";
}
