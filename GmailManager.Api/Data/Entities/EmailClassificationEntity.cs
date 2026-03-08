namespace GmailManager.Api.Data.Entities;

public class EmailClassificationEntity
{
    public string UserEmail { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string Classification { get; set; } = "None";
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
