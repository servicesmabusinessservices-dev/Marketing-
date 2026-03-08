namespace GmailManager.Api.Models;

public class SendEmailRequest
{
    public required List<string> To { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
}
