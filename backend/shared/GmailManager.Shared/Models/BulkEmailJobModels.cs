namespace GmailManager.Shared.Models;

public enum BulkEmailJobStatus
{
    Queued,
    InProgress,
    Completed,
    Failed
}

public class BulkEmailJob
{
    public string JobId { get; set; } = Guid.NewGuid().ToString("N");
    public string UserEmail { get; set; } = string.Empty;
    public List<string> Recipients { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DelaySeconds { get; set; } = 1;
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int TotalRecipients => Recipients.Count;
    public BulkEmailJobStatus Status { get; set; } = BulkEmailJobStatus.Queued;
    public string? Error { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
