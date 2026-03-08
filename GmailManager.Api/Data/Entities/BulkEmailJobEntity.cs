namespace GmailManager.Api.Data.Entities;

public class BulkEmailJobEntity
{
    public string JobId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string RecipientsJson { get; set; } = "[]";
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DelaySeconds { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int Status { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
