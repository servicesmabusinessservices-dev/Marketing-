using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.Models;

public class UpdateEmailClassificationRequest
{
    [Required]
    [MaxLength(50)]
    public string Classification { get; set; } = "None";
}
