using System.ComponentModel.DataAnnotations;

namespace GmailManager.Api.DTOs.Marketing;

public sealed class UpsertContactRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(200)]
    public string? Company { get; set; }

    [MaxLength(200)]
    public string? ServiceInterest { get; set; }

    [MaxLength(50)]
    public string? Timezone { get; set; }

    [Range(0, 100_000_000)]
    public decimal? DealValue { get; set; }

    [MaxLength(200)]
    public string? Location { get; set; }

    [MaxLength(50)]
    public string? LeadStage { get; set; }

    [EmailAddress]
    [MaxLength(254)]
    public string? OwnerEmail { get; set; }

    [MaxLength(100)]
    public string? Source { get; set; }

    public List<string>? Tags { get; set; }
}

public sealed class UpdateLeadStageRequest
{
    [Required]
    [MaxLength(50)]
    public string ToLeadStage { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Reason { get; set; } = "Manual update";
}

public sealed class AssignOwnerRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string OwnerEmail { get; set; } = string.Empty;
}

public sealed class AddNoteRequest
{
    [Required]
    [MaxLength(5000)]
    public string Body { get; set; } = string.Empty;
}

public sealed class CreateTaskRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    public DateTime? DueAtUtc { get; set; }

    [EmailAddress]
    [MaxLength(254)]
    public string? OwnerEmail { get; set; }
}

public sealed class UpdateTaskRequest
{
    [MaxLength(20)]
    public string? Status { get; set; }

    [MaxLength(20)]
    public string? Priority { get; set; }

    public DateTime? DueAtUtc { get; set; }

    [EmailAddress]
    [MaxLength(254)]
    public string? OwnerEmail { get; set; }
}

public sealed class ImportCsvRequest
{
    [Required]
    public string CsvContent { get; set; } = string.Empty;

    public char Delimiter { get; set; } = ',';

    public bool HasHeader { get; set; } = true;

    [MaxLength(100)]
    public string Source { get; set; } = "CSV Import";
}

public sealed class BulkAddMembersRequest
{
    [Required]
    [MinLength(1)]
    public List<string> ContactIds { get; set; } = new();
}
