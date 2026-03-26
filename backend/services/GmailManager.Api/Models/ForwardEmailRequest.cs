using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.Models;

public class ForwardEmailRequest
{
    [Required]
    public string MessageId { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public List<string> To { get; set; } = new();

    [MaxLength(2000)]
    public string? Note { get; set; }
}
