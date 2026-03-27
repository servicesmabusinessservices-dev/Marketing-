namespace GmailManager.Shared.Entities;

public class UserTokenEntity
{
    public string Email { get; set; } = string.Empty;
    public string TokenJson { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
