namespace GmailManager.Api.DTOs.Marketing;

public sealed class UpsertContactRequest
{
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Company { get; set; }
    public string? ServiceInterest { get; set; }
    public string? Timezone { get; set; }
    public decimal? DealValue { get; set; }
    public string? Location { get; set; }
    public string? LeadStage { get; set; }
    public string? OwnerEmail { get; set; }
    public string? Source { get; set; }
    public List<string>? Tags { get; set; }
}

public sealed class UpdateLeadStageRequest
{
    public string ToLeadStage { get; set; } = string.Empty;
    public string Reason { get; set; } = "Manual update";
}

public sealed class AssignOwnerRequest
{
    public string OwnerEmail { get; set; } = string.Empty;
}

public sealed class AddNoteRequest
{
    public string Body { get; set; } = string.Empty;
}

public sealed class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Medium";
    public DateTime? DueAtUtc { get; set; }
    public string? OwnerEmail { get; set; }
}

public sealed class UpdateTaskRequest
{
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public string? OwnerEmail { get; set; }
}

public sealed class ImportCsvRequest
{
    public string CsvContent { get; set; } = string.Empty;
    public char Delimiter { get; set; } = ',';
    public bool HasHeader { get; set; } = true;
    public string Source { get; set; } = "CSV Import";
}

public sealed class BulkAddMembersRequest
{
    public List<string> ContactIds { get; set; } = new();
}
