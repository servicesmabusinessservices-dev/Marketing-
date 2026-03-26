namespace GmailManager.Marketing.DTOs.Marketing;

public sealed class CreateListRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public sealed class CreateSegmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string FilterJson { get; set; } = "{}";
}

public sealed class CreateSuppressionRequest
{
    public string Email { get; set; } = string.Empty;
    public string Reason { get; set; } = "Unsubscribed";
    public string? Notes { get; set; }
}
