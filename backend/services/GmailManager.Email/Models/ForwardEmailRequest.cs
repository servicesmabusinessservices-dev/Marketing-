namespace GmailManager.Email.Models;

public class ForwardEmailRequest
{
    public string MessageId { get; set; } = string.Empty;
    public List<string> To { get; set; } = new();
    public string? Note { get; set; }
}
