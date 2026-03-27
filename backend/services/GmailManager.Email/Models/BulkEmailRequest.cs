namespace GmailManager.Email.Models;

public class BulkEmailRequest
{
    public List<string> Recipients { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DelaySeconds { get; set; } = 3;
}