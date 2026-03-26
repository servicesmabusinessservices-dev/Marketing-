using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.Models;

public class SendEmailRequest
{
    [Required]
    [MinLength(1)]
    public required List<string> To { get; set; }

    [Required]
    [MaxLength(500)]
    public required string Subject { get; set; }

    [Required]
    public required string Body { get; set; }
}
