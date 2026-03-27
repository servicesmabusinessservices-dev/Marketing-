using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.Models;

public class BulkEmailRequest
{
    [Required]
    [MinLength(1)]
    public List<string> Recipients { get; set; } = new();

    [Required]
    [MaxLength(500)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Body { get; set; } = string.Empty;

    [Range(1, 60)]
    public int DelaySeconds { get; set; } = 3;
}