using System.Globalization;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Security.Claims;
using System.Text.Json;
using System.Xml.Linq;
using GmailManager.Api.Data;
using GmailManager.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MarketingController : ControllerBase
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private static readonly HttpClient PlatformFeedClient = new() { Timeout = TimeSpan.FromSeconds(8) };
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 200;
    private static readonly string[] PipelineStages = { "New", "Qualified", "Proposal", "Won", "Lost" };
    private static readonly HashSet<string> PipelineStageSet = new(PipelineStages, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> AllowedTemplateCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "welcome",
        "follow-up",
        "proposal",
        "reminder"
    };
    private static readonly HashSet<string> AllowedTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "firstName",
        "lastName",
        "company",
        "email"
    };
    private static readonly HashSet<string> AllowedEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "new_lead",
        "proposal_sent",
        "opened",
        "clicked",
        "replied",
        "no_reply_3d",
        "delivered",
        "bounced",
        "unsubscribed"
    };
    private static readonly Regex TokenPattern = new("{{\\s*([a-zA-Z0-9_]+)\\s*}}", RegexOptions.Compiled);

    public MarketingController(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    private string? GetUserEmail() => User.FindFirst(ClaimTypes.Email)?.Value;

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static string NormalizeCategory(string? category)
    {
        var normalized = (category ?? string.Empty).Trim().ToLowerInvariant();
        return AllowedTemplateCategories.Contains(normalized) ? normalized : "welcome";
    }

    private static string? NormalizeLeadStage(string? stage)
    {
        var value = (stage ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var lower = value.ToLowerInvariant();

        return lower switch
        {
            "lead" => "New",
            "potential client" => "Qualified",
            "follow up" => "Proposal",
            "client" => "Won",
            _ => PipelineStageSet.Contains(value) ? CultureInfo.InvariantCulture.TextInfo.ToTitleCase(lower) : null
        };
    }

    private static string NormalizeOwnerEmail(string? ownerEmail, string fallback)
    {
        var normalized = NormalizeEmail(ownerEmail ?? string.Empty);
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static HashSet<string> ExtractTokens(string text)
    {
        var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(text))
        {
            return tokens;
        }

        var matches = TokenPattern.Matches(text);
        foreach (Match match in matches)
        {
            if (match.Groups.Count > 1)
            {
                tokens.Add(match.Groups[1].Value);
            }
        }

        return tokens;
    }

    private static string RenderTokens(string input, ContactEntity contact)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return input;
        }

        return TokenPattern.Replace(input, m =>
        {
            var token = m.Groups[1].Value;
            return token.ToLowerInvariant() switch
            {
                "firstname" => contact.FirstName ?? string.Empty,
                "lastname" => contact.LastName ?? string.Empty,
                "company" => contact.Company ?? string.Empty,
                "email" => contact.Email,
                _ => m.Value
            };
        });
    }

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

    public sealed class CreateListRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public sealed class CreateSuppressionRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Reason { get; set; } = "Unsubscribed";
        public string? Notes { get; set; }
    }

    public sealed class CreateSegmentRequest
    {
        public string Name { get; set; } = string.Empty;
        public string FilterJson { get; set; } = "{}";
    }

    public sealed class CreateTemplateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = "welcome";
        public string Subject { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;
        public string? DesignJson { get; set; }
        public List<string>? AllowedTokens { get; set; }
    }

    public sealed class CreateCampaignRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? TemplateId { get; set; }
        public string? ListId { get; set; }
        public string? SegmentId { get; set; }
        public decimal? CampaignCost { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTime? ScheduledAtUtc { get; set; }
    }

    public sealed class TemplatePreviewRequest
    {
        public string? TemplateId { get; set; }
        public string? Subject { get; set; }
        public string? BodyHtml { get; set; }
        public string? ContactId { get; set; }
    }

    public sealed class CreateJourneyRequest
    {
        public string Name { get; set; } = string.Empty;
        public string TriggerType { get; set; } = "list_joined";
        public string? TriggerRefId { get; set; }
    }

    public sealed class UpsertJourneyStepRequest
    {
        public int StepOrder { get; set; }
        public string StepType { get; set; } = "send_email";
        public int DelayMinutes { get; set; }
        public string? TemplateId { get; set; }
        public string? SubjectOverride { get; set; }
        public string? BodyHtmlOverride { get; set; }
        public string? ConditionEventType { get; set; }
        public int? ConditionWindowHours { get; set; }
        public string? ToLeadStage { get; set; }
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

    public sealed class CreateEventRequest
    {
        public string EventType { get; set; } = string.Empty;
        public string ContactId { get; set; } = string.Empty;
        public string? CampaignId { get; set; }
        public string? JourneyId { get; set; }
        public string? MessageId { get; set; }
        public string? SourceEventId { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public DateTime? OccurredAtUtc { get; set; }
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

    private static int NormalizePage(int? page)
    {
        return page.GetValueOrDefault(1) < 1 ? 1 : page.GetValueOrDefault(1);
    }

    private static int NormalizePageSize(int? pageSize)
    {
        var raw = pageSize.GetValueOrDefault(DefaultPageSize);
        if (raw < 1)
        {
            return DefaultPageSize;
        }

        return Math.Clamp(raw, 1, MaxPageSize);
    }

    private static int CalculateTotalPages(int totalCount, int pageSize)
    {
        if (totalCount <= 0)
        {
            return 0;
        }

        return (int)Math.Ceiling(totalCount / (double)pageSize);
    }

    private static DateTime ConvertUtcToTimezone(DateTime utc, string? timezoneId)
    {
        if (string.IsNullOrWhiteSpace(timezoneId))
        {
            return utc;
        }

        try
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);
        }
        catch
        {
            return utc;
        }
    }

    private static bool IsPositiveSignal(string eventType)
    {
        return string.Equals(eventType, "replied", StringComparison.OrdinalIgnoreCase)
               || string.Equals(eventType, "clicked", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<MessageEventEntity> RecordEventAndEnrollAsync(
        AppDbContext db,
        string userEmail,
        string eventType,
        string contactId,
        string? campaignId = null,
        string? journeyId = null,
        string? messageId = null,
        string? sourceEventId = null,
        Dictionary<string, string>? metadata = null,
        DateTime? occurredAtUtc = null)
    {
        var evt = new MessageEventEntity
        {
            UserEmail = userEmail,
            EventType = eventType.Trim().ToLowerInvariant(),
            ContactId = contactId,
            CampaignId = campaignId,
            JourneyId = journeyId,
            MessageId = messageId,
            SourceEventId = sourceEventId,
            MetadataJson = JsonSerializer.Serialize(metadata ?? new Dictionary<string, string>()),
            OccurredAtUtc = occurredAtUtc ?? DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.MessageEvents.Add(evt);

        var matchingJourneys = await db.Journeys
            .Where(x => x.UserEmail == userEmail
                        && x.Status == "Published"
                        && x.TriggerType == evt.EventType)
            .ToListAsync();

        foreach (var journey in matchingJourneys)
        {
            var exists = await db.JourneyEnrollments.AnyAsync(x =>
                x.UserEmail == userEmail &&
                x.JourneyId == journey.JourneyId &&
                x.ContactId == contactId &&
                x.Status == "Active");

            if (exists)
            {
                continue;
            }

            db.JourneyEnrollments.Add(new JourneyEnrollmentEntity
            {
                UserEmail = userEmail,
                JourneyId = journey.JourneyId,
                ContactId = contactId,
                Status = "Active",
                TriggerEventId = evt.EventId,
                LastProcessedStepOrder = 0,
                NextRunAtUtc = DateTime.UtcNow,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }

        return evt;
    }

    private bool SetLeadStageAsync(
        AppDbContext db,
        string userEmail,
        ContactEntity contact,
        string toLeadStage,
        string reason,
        string? eventType = null,
        string? eventId = null)
    {
        var normalized = NormalizeLeadStage(toLeadStage);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        var currentNormalized = NormalizeLeadStage(contact.LeadStage) ?? contact.LeadStage?.Trim();

        if (string.Equals(currentNormalized ?? string.Empty, normalized, StringComparison.OrdinalIgnoreCase)
            && string.Equals(contact.LeadStage ?? string.Empty, normalized, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var from = contact.LeadStage;
        contact.LeadStage = normalized;
        contact.UpdatedAtUtc = DateTime.UtcNow;

        db.LeadStageHistory.Add(new LeadStageHistoryEntity
        {
            UserEmail = userEmail,
            ContactId = contact.ContactId,
            FromStage = from,
            ToStage = normalized,
            Reason = reason,
            EventType = eventType,
            EventId = eventId,
            CreatedAtUtc = DateTime.UtcNow
        });

        return true;
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts(
        [FromQuery] string? search = null,
        [FromQuery] string? q = null,
        [FromQuery] string? tag = null,
        [FromQuery] string? leadStage = null,
        [FromQuery] string? ownerEmail = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);

        var searchTerm = string.IsNullOrWhiteSpace(search) ? q : search;

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(x => x.EmailNormalized.Contains(term)
                                     || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                                     || (x.LastName ?? string.Empty).ToLower().Contains(term)
                                     || (x.Company ?? string.Empty).ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(leadStage))
        {
            var normalizedLeadStage = NormalizeLeadStage(leadStage);
            if (!string.IsNullOrWhiteSpace(normalizedLeadStage))
            {
                query = query.Where(x => x.LeadStage == normalizedLeadStage);
            }
        }

        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var normalizedOwner = NormalizeEmail(ownerEmail);
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == normalizedOwner);
        }

        var resolvedPageSize = NormalizePageSize(pageSize ?? limit);
        var resolvedPage = NormalizePage(page);

        int totalCount;
        List<ContactEntity> contacts;

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var normalizedTag = tag.Trim();
            var allCandidates = await query
                .OrderByDescending(x => x.UpdatedAtUtc)
                .ToListAsync();

            var filtered = allCandidates.Where(x =>
            {
                var tags = JsonSerializer.Deserialize<List<string>>(x.TagsJson) ?? new List<string>();
                return tags.Any(t => string.Equals(t, normalizedTag, StringComparison.OrdinalIgnoreCase));
            }).ToList();

            totalCount = filtered.Count;
            var totalPagesForTag = CalculateTotalPages(totalCount, resolvedPageSize);
            if (totalPagesForTag > 0 && resolvedPage > totalPagesForTag)
            {
                resolvedPage = totalPagesForTag;
            }

            contacts = filtered
                .Skip((resolvedPage - 1) * resolvedPageSize)
                .Take(resolvedPageSize)
                .ToList();
        }
        else
        {
            totalCount = await query.CountAsync();
            var totalPagesForQuery = CalculateTotalPages(totalCount, resolvedPageSize);
            if (totalPagesForQuery > 0 && resolvedPage > totalPagesForQuery)
            {
                resolvedPage = totalPagesForQuery;
            }

            contacts = await query
                .OrderByDescending(x => x.UpdatedAtUtc)
                .Skip((resolvedPage - 1) * resolvedPageSize)
                .Take(resolvedPageSize)
                .ToListAsync();
        }

        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);

        return Ok(new
        {
            contacts = contacts.Select(x => new
            {
                x.ContactId,
                x.Email,
                x.FirstName,
                x.LastName,
                x.Company,
                x.ServiceInterest,
                x.Timezone,
                x.DealValue,
                x.Location,
                x.LeadStage,
                x.OwnerEmail,
                x.Source,
                tags = JsonSerializer.Deserialize<List<string>>(x.TagsJson) ?? new List<string>(),
                x.UpdatedAtUtc
            }),
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpGet("contacts/{contactId}")]
    public async Task<IActionResult> GetContactById(string contactId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        return Ok(new
        {
            contact.ContactId,
            contact.Email,
            contact.FirstName,
            contact.LastName,
            contact.Company,
            contact.ServiceInterest,
            contact.Timezone,
            contact.DealValue,
            contact.Location,
            contact.LeadStage,
            contact.OwnerEmail,
            contact.Source,
            tags = JsonSerializer.Deserialize<List<string>>(contact.TagsJson) ?? new List<string>(),
            contact.CreatedAtUtc,
            contact.UpdatedAtUtc
        });
    }

    [HttpPost("contacts")]
    public async Task<IActionResult> UpsertContact([FromBody] UpsertContactRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest(new { error = "Email is required" });

        var normalized = NormalizeEmail(request.Email);
        var normalizedLeadStage = NormalizeLeadStage(request.LeadStage) ?? "New";
        var normalizedOwner = NormalizeOwnerEmail(request.OwnerEmail, userEmail);

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.EmailNormalized == normalized);

        if (contact == null)
        {
            contact = new ContactEntity
            {
                UserEmail = userEmail,
                Email = request.Email.Trim(),
                EmailNormalized = normalized,
                FirstName = request.FirstName?.Trim(),
                LastName = request.LastName?.Trim(),
                Company = request.Company?.Trim(),
                ServiceInterest = request.ServiceInterest?.Trim(),
                Timezone = string.IsNullOrWhiteSpace(request.Timezone) ? null : request.Timezone.Trim(),
                DealValue = request.DealValue,
                Location = request.Location?.Trim(),
                LeadStage = null,
                OwnerEmail = normalizedOwner,
                Source = request.Source?.Trim(),
                TagsJson = JsonSerializer.Serialize((request.Tags ?? new List<string>()).Distinct(StringComparer.OrdinalIgnoreCase)),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            db.Contacts.Add(contact);

            SetLeadStageAsync(db, userEmail, contact, normalizedLeadStage, "Contact created");
        }
        else
        {
            contact.FirstName = request.FirstName?.Trim() ?? contact.FirstName;
            contact.LastName = request.LastName?.Trim() ?? contact.LastName;
            contact.Company = request.Company?.Trim() ?? contact.Company;
            contact.ServiceInterest = request.ServiceInterest?.Trim() ?? contact.ServiceInterest;
            if (!string.IsNullOrWhiteSpace(request.Timezone))
            {
                contact.Timezone = request.Timezone.Trim();
            }
            if (request.DealValue.HasValue)
            {
                contact.DealValue = request.DealValue.Value;
            }
            contact.Location = request.Location?.Trim() ?? contact.Location;
            contact.Source = request.Source?.Trim() ?? contact.Source;
            contact.TagsJson = JsonSerializer.Serialize((request.Tags ?? JsonSerializer.Deserialize<List<string>>(contact.TagsJson) ?? new List<string>()).Distinct(StringComparer.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(request.OwnerEmail))
            {
                contact.OwnerEmail = normalizedOwner;
            }
            contact.UpdatedAtUtc = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.LeadStage))
            {
                SetLeadStageAsync(db, userEmail, contact, normalizedLeadStage, "Contact updated");
            }
        }

        var shouldEmitNewLead = !string.IsNullOrWhiteSpace(contact.LeadStage)
                                && (string.Equals(contact.LeadStage, "New", StringComparison.OrdinalIgnoreCase)
                                    || string.Equals(contact.LeadStage, "Qualified", StringComparison.OrdinalIgnoreCase));

        if (shouldEmitNewLead)
        {
            await RecordEventAndEnrollAsync(db, userEmail, "new_lead", contact.ContactId, metadata: new Dictionary<string, string>
            {
                ["leadStage"] = contact.LeadStage ?? string.Empty
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { contactId = contact.ContactId, deduped = contact.EmailNormalized == normalized });
    }

    [HttpPost("contacts/{contactId}/lead-stage")]
    public async Task<IActionResult> UpdateLeadStage(string contactId, [FromBody] UpdateLeadStageRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.ToLeadStage)) return BadRequest(new { error = "ToLeadStage is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        var normalizedLeadStage = NormalizeLeadStage(request.ToLeadStage);
        if (string.IsNullOrWhiteSpace(normalizedLeadStage)) return BadRequest(new { error = "Invalid lead stage" });

        var changed = SetLeadStageAsync(db, userEmail, contact, normalizedLeadStage, request.Reason);

        if (changed && (string.Equals(contact.LeadStage, "New", StringComparison.OrdinalIgnoreCase)
                        || string.Equals(contact.LeadStage, "Qualified", StringComparison.OrdinalIgnoreCase)))
        {
            await RecordEventAndEnrollAsync(db, userEmail, "new_lead", contact.ContactId, metadata: new Dictionary<string, string>
            {
                ["leadStage"] = contact.LeadStage ?? string.Empty
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { updated = changed, leadStage = contact.LeadStage });
    }

    [HttpPost("contacts/{contactId}/owner")]
    public async Task<IActionResult> AssignContactOwner(string contactId, [FromBody] AssignOwnerRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.OwnerEmail)) return BadRequest(new { error = "OwnerEmail is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        contact.OwnerEmail = NormalizeOwnerEmail(request.OwnerEmail, userEmail);
        contact.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { updated = true, ownerEmail = contact.OwnerEmail });
    }

    [HttpGet("contacts/{contactId}/notes")]
    public async Task<IActionResult> GetContactNotes(string contactId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var notes = await db.CrmNotes
            .Where(x => x.UserEmail == userEmail && x.ContactId == contactId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(new { notes });
    }

    [HttpPost("contacts/{contactId}/notes")]
    public async Task<IActionResult> AddContactNote(string contactId, [FromBody] AddNoteRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Body)) return BadRequest(new { error = "Body is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contactExists = await db.Contacts.AnyAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);
        if (!contactExists) return NotFound(new { error = "Contact not found" });

        var note = new CrmNoteEntity
        {
            UserEmail = userEmail,
            ContactId = contactId,
            Body = request.Body.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.CrmNotes.Add(note);
        await db.SaveChangesAsync();
        return Ok(new { noteId = note.NoteId });
    }

    [HttpGet("contacts/{contactId}/tasks")]
    public async Task<IActionResult> GetContactTasks(string contactId, [FromQuery] string? status = null, [FromQuery] bool onlyOverdue = false)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var query = db.CrmTasks.Where(x => x.UserEmail == userEmail && x.ContactId == contactId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.Status == status);
        }

        if (onlyOverdue)
        {
            query = query.Where(x => x.Status != "Completed" && x.DueAtUtc != null && x.DueAtUtc < DateTime.UtcNow);
        }

        var tasks = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(new { tasks });
    }

    [HttpPost("contacts/{contactId}/tasks")]
    public async Task<IActionResult> CreateContactTask(string contactId, [FromBody] CreateTaskRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest(new { error = "Title is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contactExists = await db.Contacts.AnyAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);
        if (!contactExists) return NotFound(new { error = "Contact not found" });

        var normalizedPriority = string.IsNullOrWhiteSpace(request.Priority)
            ? "Medium"
            : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(request.Priority.Trim().ToLowerInvariant());

        var task = new CrmTaskEntity
        {
            UserEmail = userEmail,
            ContactId = contactId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = normalizedPriority,
            OwnerEmail = string.IsNullOrWhiteSpace(request.OwnerEmail) ? userEmail : NormalizeEmail(request.OwnerEmail),
            DueAtUtc = request.DueAtUtc,
            Status = "Open",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.CrmTasks.Add(task);
        await db.SaveChangesAsync();
        return Ok(new { taskId = task.TaskId });
    }

    [HttpPatch("contacts/{contactId}/tasks/{taskId}")]
    public async Task<IActionResult> UpdateContactTask(string contactId, string taskId, [FromBody] UpdateTaskRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var task = await db.CrmTasks.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId && x.TaskId == taskId);
        if (task == null) return NotFound(new { error = "Task not found" });

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var normalizedStatus = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(request.Status.Trim().ToLowerInvariant());
            task.Status = normalizedStatus;
            task.CompletedAtUtc = string.Equals(normalizedStatus, "Completed", StringComparison.OrdinalIgnoreCase)
                ? DateTime.UtcNow
                : null;
        }

        if (!string.IsNullOrWhiteSpace(request.Priority))
        {
            task.Priority = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(request.Priority.Trim().ToLowerInvariant());
        }

        if (request.DueAtUtc.HasValue)
        {
            task.DueAtUtc = request.DueAtUtc;
        }

        if (!string.IsNullOrWhiteSpace(request.OwnerEmail))
        {
            task.OwnerEmail = NormalizeEmail(request.OwnerEmail);
        }

        task.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { updated = true });
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(
        [FromQuery] string? ownerEmail = null,
        [FromQuery] string? status = null,
        [FromQuery] string? due = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var query = db.CrmTasks.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var normalizedOwner = NormalizeEmail(ownerEmail);
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == normalizedOwner);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = query.Where(x => (x.Status ?? string.Empty).ToLower() == normalizedStatus);
        }

        var normalizedDue = (due ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedDue == "overdue")
        {
            query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc < DateTime.UtcNow);
        }
        else if (normalizedDue == "upcoming")
        {
            query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc >= DateTime.UtcNow);
        }
        else if (normalizedDue == "today")
        {
            var todayStart = DateTime.UtcNow.Date;
            var tomorrow = todayStart.AddDays(1);
            query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc >= todayStart && x.DueAtUtc < tomorrow);
        }
        else if (normalizedDue == "none")
        {
            query = query.Where(x => x.DueAtUtc == null);
        }

        var resolvedPage = NormalizePage(page);
        var resolvedPageSize = NormalizePageSize(pageSize ?? limit);
        var totalCount = await query.CountAsync();
        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);
        if (totalPages > 0 && resolvedPage > totalPages)
        {
            resolvedPage = totalPages;
        }

        var tasks = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync();

        var contactIds = tasks.Select(x => x.ContactId).Distinct().ToList();
        var contacts = await db.Contacts
            .Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId))
            .ToListAsync();
        var contactMap = contacts.ToDictionary(x => x.ContactId, x => x, StringComparer.OrdinalIgnoreCase);

        return Ok(new
        {
            tasks = tasks.Select(task => new
            {
                task.TaskId,
                task.ContactId,
                task.Title,
                task.Description,
                task.Status,
                task.Priority,
                task.OwnerEmail,
                task.DueAtUtc,
                task.CompletedAtUtc,
                task.CreatedAtUtc,
                task.UpdatedAtUtc,
                contact = contactMap.TryGetValue(task.ContactId, out var contact)
                    ? new
                    {
                        contact.ContactId,
                        contact.Email,
                        contact.FirstName,
                        contact.LastName,
                        contact.Company,
                        contact.LeadStage
                    }
                    : null
            }),
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpGet("pipeline")]
    public async Task<IActionResult> GetPipeline([FromQuery] string? ownerEmail = null, [FromQuery] string? search = null, [FromQuery] string? stage = null, [FromQuery] int pageSize = DefaultPageSize)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var normalizedOwner = NormalizeEmail(ownerEmail);
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == normalizedOwner);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.EmailNormalized.Contains(term)
                                     || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                                     || (x.LastName ?? string.Empty).ToLower().Contains(term)
                                     || (x.Company ?? string.Empty).ToLower().Contains(term));
        }

        var normalizedStage = NormalizeLeadStage(stage);
        if (!string.IsNullOrWhiteSpace(normalizedStage))
        {
            query = query.Where(x => x.LeadStage == normalizedStage);
        }

        var safePageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var contacts = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Take(safePageSize)
            .ToListAsync();

        var grouped = contacts
            .GroupBy(x => string.IsNullOrWhiteSpace(x.LeadStage) ? "New" : x.LeadStage!)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        var ownerOptions = contacts
            .Select(x => x.OwnerEmail)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();

        return Ok(new
        {
            columns = PipelineStages.Select(stageName => new
            {
                stage = stageName,
                items = (grouped.TryGetValue(stageName, out var list) ? list : new List<ContactEntity>())
                    .Select(x => new
                    {
                        x.ContactId,
                        x.Email,
                        x.FirstName,
                        x.LastName,
                        x.Company,
                        leadStage = string.IsNullOrWhiteSpace(x.LeadStage) ? "New" : x.LeadStage,
                        x.OwnerEmail,
                        x.UpdatedAtUtc
                    })
            }),
            ownerOptions
        });
    }

    [HttpPost("contacts/import-csv")]
    public async Task<IActionResult> ImportContactsFromCsv([FromBody] ImportCsvRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.CsvContent)) return BadRequest(new { error = "CsvContent is required" });

        var lines = request.CsvContent
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        if (lines.Count == 0) return BadRequest(new { error = "CSV content is empty" });

        var startIndex = request.HasHeader ? 1 : 0;
        var imported = 0;
        var deduped = 0;

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        for (var index = startIndex; index < lines.Count; index++)
        {
            var parts = lines[index].Split(request.Delimiter);
            if (parts.Length == 0) continue;

            var email = parts[0].Trim();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) continue;

            var normalized = NormalizeEmail(email);
            var existing = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.EmailNormalized == normalized);

            if (existing != null)
            {
                deduped++;
                continue;
            }

            var firstName = parts.Length > 1 ? parts[1].Trim() : null;
            var lastName = parts.Length > 2 ? parts[2].Trim() : null;
            var company = parts.Length > 3 ? parts[3].Trim() : null;
            var serviceInterest = parts.Length > 4 ? parts[4].Trim() : null;
            var location = parts.Length > 5 ? parts[5].Trim() : null;

            db.Contacts.Add(new ContactEntity
            {
                UserEmail = userEmail,
                Email = email,
                EmailNormalized = normalized,
                FirstName = firstName,
                LastName = lastName,
                Company = company,
                ServiceInterest = serviceInterest,
                Location = location,
                LeadStage = "New",
                OwnerEmail = userEmail,
                Source = request.Source,
                TagsJson = "[]",
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
            imported++;
        }

        await db.SaveChangesAsync();
        return Ok(new { imported, deduped, total = lines.Count - startIndex });
    }

    [HttpGet("lists")]
    public async Task<IActionResult> GetLists([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var resolvedPage = NormalizePage(page);
        var resolvedPageSize = NormalizePageSize(pageSize);

        var baseQuery = db.ContactLists.Where(x => x.UserEmail == userEmail);
        var totalCount = await baseQuery.CountAsync();
        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);
        if (totalPages > 0 && resolvedPage > totalPages)
        {
            resolvedPage = totalPages;
        }

        var lists = await baseQuery
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync();

        var listIds = lists.Select(x => x.ListId).ToList();
        var counts = await db.ContactListMembers
            .Where(x => x.UserEmail == userEmail && listIds.Contains(x.ListId))
            .GroupBy(x => x.ListId)
            .Select(g => new { listId = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.listId, x => x.count);

        return Ok(new
        {
            lists = lists.Select(x => new
            {
                x.ListId,
                x.Name,
                x.Description,
                x.CreatedAtUtc,
                x.UpdatedAtUtc,
                memberCount = counts.TryGetValue(x.ListId, out var count) ? count : 0
            }),
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpPost("lists")]
    public async Task<IActionResult> CreateList([FromBody] CreateListRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "List name is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var list = new ContactListEntity
        {
            UserEmail = userEmail,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.ContactLists.Add(list);
        await db.SaveChangesAsync();
        return Ok(new { listId = list.ListId });
    }

    [HttpPost("lists/{listId}/members/{contactId}")]
    public async Task<IActionResult> AddListMember(string listId, string contactId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var exists = await db.ContactListMembers.AnyAsync(x => x.UserEmail == userEmail && x.ListId == listId && x.ContactId == contactId);
        if (exists) return Ok(new { added = false });

        db.ContactListMembers.Add(new ContactListMemberEntity
        {
            UserEmail = userEmail,
            ListId = listId,
            ContactId = contactId,
            AddedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(new { added = true });
    }

    [HttpPost("lists/{listId}/members/bulk")]
    public async Task<IActionResult> AddListMembersBulk(string listId, [FromBody] BulkAddMembersRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (request.ContactIds == null || request.ContactIds.Count == 0) return BadRequest(new { error = "ContactIds required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var added = 0;
        foreach (var contactId in request.ContactIds)
        {
            var exists = await db.ContactListMembers.AnyAsync(x =>
                x.UserEmail == userEmail && x.ListId == listId && x.ContactId == contactId);
            if (exists) continue;
            db.ContactListMembers.Add(new ContactListMemberEntity
            {
                UserEmail = userEmail,
                ListId = listId,
                ContactId = contactId,
                AddedAtUtc = DateTime.UtcNow
            });
            added++;
        }
        await db.SaveChangesAsync();
        return Ok(new { added });
    }

    [HttpGet("suppressions")]
    public async Task<IActionResult> GetSuppressions()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var suppressions = await db.Suppressions
            .Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(new { suppressions });
    }

    [HttpGet("suppressions/summary")]
    public async Task<IActionResult> GetSuppressionSummary()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var grouped = await db.Suppressions
            .Where(x => x.UserEmail == userEmail)
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Reason) ? "Unspecified" : x.Reason)
            .Select(g => new { reason = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var total = grouped.Sum(x => x.count);

        return Ok(new
        {
            total,
            byReason = grouped
        });
    }

    [HttpPost("suppressions")]
    public async Task<IActionResult> AddSuppression([FromBody] CreateSuppressionRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest(new { error = "Email is required" });

        var normalized = NormalizeEmail(request.Email);
        var reason = string.IsNullOrWhiteSpace(request.Reason) ? "Unsubscribed" : request.Reason.Trim();

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var changed = false;
        var existing = await db.Suppressions.FindAsync(userEmail, normalized);
        if (existing == null)
        {
            existing = new SuppressionEntryEntity
            {
                UserEmail = userEmail,
                EmailNormalized = normalized,
                Email = request.Email.Trim(),
                Reason = reason,
                Notes = request.Notes?.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Suppressions.Add(existing);
            changed = true;
        }

        var contact = await db.Contacts
            .FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.EmailNormalized == normalized);

        if (contact != null)
        {
            await RecordEventAndEnrollAsync(
                db,
                userEmail,
                "unsubscribed",
                contact.ContactId,
                metadata: new Dictionary<string, string>
                {
                    ["reason"] = reason
                });
            changed = true;
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }

        return Ok(new { suppressed = true });
    }

    [HttpDelete("suppressions/{email}")]
    public async Task<IActionResult> RemoveSuppression(string email)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        var normalized = NormalizeEmail(Uri.UnescapeDataString(email));

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var existing = await db.Suppressions.FindAsync(userEmail, normalized);
        if (existing == null) return NotFound(new { error = "Suppression entry not found" });

        db.Suppressions.Remove(existing);
        await db.SaveChangesAsync();
        return Ok(new { removed = true });
    }

    [HttpGet("segments")]
    public async Task<IActionResult> GetSegments()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var segments = await db.Segments.Where(x => x.UserEmail == userEmail).OrderByDescending(x => x.UpdatedAtUtc).ToListAsync();
        return Ok(new { segments });
    }

    [HttpPost("segments")]
    public async Task<IActionResult> CreateSegment([FromBody] CreateSegmentRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Segment name is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var segment = new SegmentEntity
        {
            UserEmail = userEmail,
            Name = request.Name.Trim(),
            FilterJson = string.IsNullOrWhiteSpace(request.FilterJson) ? "{}" : request.FilterJson,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Segments.Add(segment);
        await db.SaveChangesAsync();
        return Ok(new { segmentId = segment.SegmentId });
    }

    [HttpGet("tokens")]
    public IActionResult GetAllowedTokens()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        return Ok(new
        {
            tokens = AllowedTokens.OrderBy(x => x).ToList()
        });
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] string? category = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        await EnsureDefaultTemplatesAsync(db, userEmail);

        var resolvedPage = NormalizePage(page);
        var resolvedPageSize = NormalizePageSize(pageSize);

        var normalizedCategory = string.IsNullOrWhiteSpace(category) ? null : NormalizeCategory(category);
        var query = db.CampaignTemplates.Where(x => x.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(normalizedCategory))
        {
            query = query.Where(x => x.Category == normalizedCategory);
        }

        var totalCount = await query.CountAsync();
        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);
        if (totalPages > 0 && resolvedPage > totalPages)
        {
            resolvedPage = totalPages;
        }

        var templates = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync();

        return Ok(new
        {
            templates,
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpGet("templates/{templateId}")]
    public async Task<IActionResult> GetTemplateById(string templateId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var template = await db.CampaignTemplates.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.TemplateId == templateId);
        if (template == null) return NotFound(new { error = "Template not found" });

        return Ok(template);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Template name is required" });
        if (string.IsNullOrWhiteSpace(request.Subject)) return BadRequest(new { error = "Template subject is required" });
        if (string.IsNullOrWhiteSpace(request.BodyHtml)) return BadRequest(new { error = "Template body is required" });

        var category = NormalizeCategory(request.Category);
        if (!AllowedTemplateCategories.Contains(category)) return BadRequest(new { error = "Invalid template category" });

        var extractedTokens = ExtractTokens($"{request.Subject}\n{request.BodyHtml}");
        var disallowedTokens = extractedTokens.Where(x => !AllowedTokens.Contains(x)).ToList();
        if (disallowedTokens.Count > 0)
        {
            return BadRequest(new { error = $"Unsupported personalization token(s): {string.Join(", ", disallowedTokens)}" });
        }

        var normalizedAllowedTokens = (request.AllowedTokens ?? extractedTokens.ToList())
            .Where(x => AllowedTokens.Contains(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var template = new CampaignTemplateEntity
        {
            UserEmail = userEmail,
            Name = request.Name.Trim(),
            Category = category,
            Subject = request.Subject,
            BodyHtml = request.BodyHtml,
            DesignJson = request.DesignJson,
            AllowedTokensJson = JsonSerializer.Serialize(normalizedAllowedTokens),
            Version = 1,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.CampaignTemplates.Add(template);
        await db.SaveChangesAsync();
        return Ok(new { templateId = template.TemplateId });
    }

    [HttpPut("templates/{templateId}")]
    public async Task<IActionResult> UpdateTemplate(string templateId, [FromBody] CreateTemplateRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Template name is required" });
        if (string.IsNullOrWhiteSpace(request.Subject)) return BadRequest(new { error = "Template subject is required" });
        if (string.IsNullOrWhiteSpace(request.BodyHtml)) return BadRequest(new { error = "Template body is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var template = await db.CampaignTemplates.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.TemplateId == templateId);
        if (template == null) return NotFound(new { error = "Template not found" });

        var category = NormalizeCategory(request.Category);
        var extractedTokens = ExtractTokens($"{request.Subject}\n{request.BodyHtml}");
        var disallowedTokens = extractedTokens.Where(x => !AllowedTokens.Contains(x)).ToList();
        if (disallowedTokens.Count > 0)
        {
            return BadRequest(new { error = $"Unsupported personalization token(s): {string.Join(", ", disallowedTokens)}" });
        }

        var normalizedAllowedTokens = (request.AllowedTokens ?? extractedTokens.ToList())
            .Where(x => AllowedTokens.Contains(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();

        template.Name = request.Name.Trim();
        template.Category = category;
        template.Subject = request.Subject;
        template.BodyHtml = request.BodyHtml;
        template.DesignJson = request.DesignJson;
        template.AllowedTokensJson = JsonSerializer.Serialize(normalizedAllowedTokens);
        template.Version += 1;
        template.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { updated = true, templateId = template.TemplateId, version = template.Version });
    }

    [HttpPost("templates/preview")]
    public async Task<IActionResult> PreviewTemplate([FromBody] TemplatePreviewRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        string subject;
        string bodyHtml;

        if (!string.IsNullOrWhiteSpace(request.TemplateId))
        {
            var template = await db.CampaignTemplates.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.TemplateId == request.TemplateId);
            if (template == null) return NotFound(new { error = "Template not found" });
            subject = template.Subject;
            bodyHtml = template.BodyHtml;
        }
        else
        {
            subject = request.Subject ?? string.Empty;
            bodyHtml = request.BodyHtml ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(bodyHtml))
        {
            return BadRequest(new { error = "Subject and bodyHtml are required for preview" });
        }

        ContactEntity sampleContact;
        if (!string.IsNullOrWhiteSpace(request.ContactId))
        {
            var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == request.ContactId);
            if (contact == null) return NotFound(new { error = "Contact not found" });
            sampleContact = contact;
        }
        else
        {
            sampleContact = new ContactEntity
            {
                UserEmail = userEmail,
                Email = userEmail,
                EmailNormalized = NormalizeEmail(userEmail),
                FirstName = "Friend",
                LastName = "",
                Company = "Your Company"
            };
        }

        var unresolvedTokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var token in ExtractTokens($"{subject}\n{bodyHtml}"))
        {
            if (!AllowedTokens.Contains(token))
            {
                unresolvedTokens.Add(token);
            }
        }

        var renderedSubject = RenderTokens(subject, sampleContact);
        var renderedBody = RenderTokens(bodyHtml, sampleContact);

        foreach (var token in ExtractTokens($"{renderedSubject}\n{renderedBody}"))
        {
            unresolvedTokens.Add(token);
        }

        if (unresolvedTokens.Count > 0)
        {
            return BadRequest(new { error = "Unresolved personalization tokens", unresolvedTokens = unresolvedTokens.OrderBy(x => x).ToList() });
        }

        return Ok(new
        {
            subject = renderedSubject,
            bodyHtml = renderedBody,
            contact = new { sampleContact.ContactId, sampleContact.Email, sampleContact.FirstName, sampleContact.Company }
        });
    }

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns([FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var resolvedPage = NormalizePage(page);
        var resolvedPageSize = NormalizePageSize(pageSize);

        var query = db.Campaigns.Where(x => x.UserEmail == userEmail);
        var totalCount = await query.CountAsync();
        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);
        if (totalPages > 0 && resolvedPage > totalPages)
        {
            resolvedPage = totalPages;
        }

        var campaigns = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync();

        return Ok(new
        {
            campaigns,
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Campaign name is required" });

        var allowedStatus = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Draft", "Scheduled", "Paused" };
        var status = string.IsNullOrWhiteSpace(request.Status) ? "Draft" : request.Status.Trim();
        if (!allowedStatus.Contains(status)) return BadRequest(new { error = "Invalid campaign status" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var campaign = new CampaignEntity
        {
            UserEmail = userEmail,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            TemplateId = request.TemplateId,
            ListId = request.ListId,
            SegmentId = request.SegmentId,
            CampaignCost = request.CampaignCost,
            Status = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(status.ToLowerInvariant()),
            ScheduledAtUtc = request.ScheduledAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();
        return Ok(new { campaignId = campaign.CampaignId });
    }

    [HttpGet("contacts/{contactId}/lead-stage-history")]
    public async Task<IActionResult> GetLeadStageHistory(string contactId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var history = await db.LeadStageHistory
            .Where(x => x.UserEmail == userEmail && x.ContactId == contactId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(new { history });
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] string? contactId = null, [FromQuery] string? eventType = null, [FromQuery] int limit = 100, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var query = db.MessageEvents.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(contactId))
        {
            query = query.Where(x => x.ContactId == contactId);
        }

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            query = query.Where(x => x.EventType == eventType.Trim().ToLowerInvariant());
        }

        var resolvedPage = NormalizePage(page);
        var resolvedPageSize = NormalizePageSize(pageSize ?? limit);
        var totalCount = await query.CountAsync();
        var totalPages = CalculateTotalPages(totalCount, resolvedPageSize);
        if (totalPages > 0 && resolvedPage > totalPages)
        {
            resolvedPage = totalPages;
        }

        var events = await query
            .OrderByDescending(x => x.OccurredAtUtc)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync();

        return Ok(new
        {
            events,
            page = resolvedPage,
            pageSize = resolvedPageSize,
            totalCount,
            totalPages,
            hasPreviousPage = resolvedPage > 1,
            hasNextPage = totalPages > 0 && resolvedPage < totalPages
        });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(
        [FromQuery] int days = 30,
        [FromQuery] string? ownerEmail = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        static string PairKey(string segment, string service) => $"{segment}\u001F{service}";
        static (string segment, string service) ParsePairKey(string key)
        {
            var parts = key.Split('\u001F');
            return parts.Length == 2 ? (parts[0], parts[1]) : ("Unsegmented", "Unspecified");
        }

        static string SuggestionKey(string segment, string service, string day, int hour) => $"{segment}\u001F{service}\u001F{day}\u001F{hour}";

        var safeDays = Math.Clamp(days, 1, 365);
        var rangeEndUtc = toUtc?.ToUniversalTime() ?? DateTime.UtcNow;
        var rangeStartUtc = fromUtc?.ToUniversalTime() ?? rangeEndUtc.AddDays(-safeDays);
        if (rangeStartUtc > rangeEndUtc)
        {
            (rangeStartUtc, rangeEndUtc) = (rangeEndUtc, rangeStartUtc);
        }

        await using var db = await _dbContextFactory.CreateDbContextAsync();

        var contactsQuery = db.Contacts.Where(x => x.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var normalizedOwner = NormalizeEmail(ownerEmail);
            contactsQuery = contactsQuery.Where(x => (x.OwnerEmail ?? string.Empty) == normalizedOwner);
        }

        var contacts = await contactsQuery.ToListAsync();
        var contactIds = contacts.Select(x => x.ContactId).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var contactMap = contacts.ToDictionary(x => x.ContactId, x => x, StringComparer.OrdinalIgnoreCase);

        var campaigns = await db.Campaigns
            .Where(x => x.UserEmail == userEmail)
            .ToListAsync();
        var campaignMap = campaigns.ToDictionary(x => x.CampaignId, x => x, StringComparer.OrdinalIgnoreCase);

        var stageFunnel = PipelineStages.ToDictionary(
            stage => stage,
            stage => contacts.Count(x => string.Equals(x.LeadStage ?? "New", stage, StringComparison.OrdinalIgnoreCase)),
            StringComparer.OrdinalIgnoreCase);

        var conversionRates = new
        {
            newToQualified = stageFunnel["New"] == 0 ? 0d : Math.Round((double)stageFunnel["Qualified"] / stageFunnel["New"] * 100d, 2),
            qualifiedToProposal = stageFunnel["Qualified"] == 0 ? 0d : Math.Round((double)stageFunnel["Proposal"] / stageFunnel["Qualified"] * 100d, 2),
            proposalToWon = stageFunnel["Proposal"] == 0 ? 0d : Math.Round((double)stageFunnel["Won"] / stageFunnel["Proposal"] * 100d, 2),
            proposalToLost = stageFunnel["Proposal"] == 0 ? 0d : Math.Round((double)stageFunnel["Lost"] / stageFunnel["Proposal"] * 100d, 2)
        };

        var tasks = await db.CrmTasks
            .Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId))
            .ToListAsync();

        var overdueTasks = tasks.Count(x => !string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                                           && x.DueAtUtc != null
                                           && x.DueAtUtc < DateTime.UtcNow);

        var ownerWorkload = contacts
            .GroupBy(x => string.IsNullOrWhiteSpace(x.OwnerEmail) ? userEmail : x.OwnerEmail!, StringComparer.OrdinalIgnoreCase)
            .Select(g => new
            {
                ownerEmail = g.Key,
                contacts = g.Count(),
                openTasks = tasks.Count(t => string.Equals(t.OwnerEmail ?? userEmail, g.Key, StringComparison.OrdinalIgnoreCase)
                                             && !string.Equals(t.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
                overdueTasks = tasks.Count(t => string.Equals(t.OwnerEmail ?? userEmail, g.Key, StringComparison.OrdinalIgnoreCase)
                                                && !string.Equals(t.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                                                && t.DueAtUtc != null
                                                && t.DueAtUtc < DateTime.UtcNow)
            })
            .OrderByDescending(x => x.contacts)
            .ToList();

        var eventRows = await db.MessageEvents
            .Where(x => x.UserEmail == userEmail
                        && x.OccurredAtUtc >= rangeStartUtc
                        && x.OccurredAtUtc <= rangeEndUtc
                        && contactIds.Contains(x.ContactId))
            .ToListAsync();

        var transitionCounts = await db.LeadStageHistory
            .Where(x => x.UserEmail == userEmail
                        && x.CreatedAtUtc >= rangeStartUtc
                        && x.CreatedAtUtc <= rangeEndUtc
                        && contactIds.Contains(x.ContactId))
            .GroupBy(x => new { x.FromStage, x.ToStage })
            .Select(g => new { fromStage = g.Key.FromStage, toStage = g.Key.ToStage, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var enrollments = await db.JourneyEnrollments
            .Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId))
            .ToListAsync();

        var journeyPerformance = new
        {
            active = enrollments.Count(x => string.Equals(x.Status, "Active", StringComparison.OrdinalIgnoreCase)),
            completed = enrollments.Count(x => string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
            failed = enrollments.Count(x => string.Equals(x.Status, "Failed", StringComparison.OrdinalIgnoreCase)),
            paused = enrollments.Count(x => string.Equals(x.Status, "Paused", StringComparison.OrdinalIgnoreCase))
        };

        var engagementEventTypes = new[]
        {
            "opened",
            "clicked",
            "replied",
            "proposal_sent",
            "no_reply_3d",
            "new_lead",
            "delivered",
            "bounced",
            "unsubscribed"
        };

        var engagement = engagementEventTypes.ToDictionary(
            eventType => eventType,
            eventType => eventRows.Count(x => string.Equals(x.EventType, eventType, StringComparison.OrdinalIgnoreCase)),
            StringComparer.OrdinalIgnoreCase);

        var suppressionCount = await db.Suppressions
            .Where(x => x.UserEmail == userEmail && x.CreatedAtUtc >= rangeStartUtc && x.CreatedAtUtc <= rangeEndUtc)
            .CountAsync();

        var deliveredCount = engagement["delivered"];
        var openedCount = engagement["opened"];
        var clickedCount = engagement["clicked"];
        var repliedCount = engagement["replied"];
        var bouncedCount = engagement["bounced"];
        var unsubscribedCount = engagement["unsubscribed"] + suppressionCount;

        var deliverability = new
        {
            delivered = deliveredCount,
            opened = openedCount,
            clicked = clickedCount,
            replied = repliedCount,
            unsubscribed = unsubscribedCount,
            bounced = bouncedCount,
            openRate = deliveredCount == 0 ? 0d : Math.Round((double)openedCount / deliveredCount * 100d, 2),
            clickRate = deliveredCount == 0 ? 0d : Math.Round((double)clickedCount / deliveredCount * 100d, 2),
            replyRate = deliveredCount == 0 ? 0d : Math.Round((double)repliedCount / deliveredCount * 100d, 2),
            unsubscribeRate = deliveredCount == 0 ? 0d : Math.Round((double)unsubscribedCount / deliveredCount * 100d, 2),
            bounceRate = deliveredCount == 0 ? 0d : Math.Round((double)bouncedCount / deliveredCount * 100d, 2)
        };

        var attributedCampaignsByContact = eventRows
            .Where(x => !string.IsNullOrWhiteSpace(x.CampaignId))
            .GroupBy(x => x.ContactId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.CampaignId!).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                StringComparer.OrdinalIgnoreCase);

        var revenueByPair = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var costsByPair = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var campaignTouchServices = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var campaignCountByPair = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var wonContactsByPair = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var contact in contacts)
        {
            if (!string.Equals(contact.LeadStage, "Won", StringComparison.OrdinalIgnoreCase) || !contact.DealValue.HasValue || contact.DealValue <= 0)
            {
                continue;
            }

            if (!attributedCampaignsByContact.TryGetValue(contact.ContactId, out var campaignIds) || campaignIds.Count == 0)
            {
                continue;
            }

            var service = string.IsNullOrWhiteSpace(contact.ServiceInterest) ? "Unspecified" : contact.ServiceInterest.Trim();
            var revenueShare = contact.DealValue.Value / campaignIds.Count;

            foreach (var campaignId in campaignIds)
            {
                if (!campaignMap.TryGetValue(campaignId, out var campaign))
                {
                    continue;
                }

                var segment = string.IsNullOrWhiteSpace(campaign.SegmentId) ? "Unsegmented" : campaign.SegmentId!;
                var key = PairKey(segment, service);

                if (!revenueByPair.ContainsKey(key))
                {
                    revenueByPair[key] = 0m;
                }
                revenueByPair[key] += revenueShare;

                if (!wonContactsByPair.TryGetValue(key, out var wonContactSet))
                {
                    wonContactSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    wonContactsByPair[key] = wonContactSet;
                }
                wonContactSet.Add(contact.ContactId);

                if (!campaignTouchServices.TryGetValue(campaignId, out var serviceSet))
                {
                    serviceSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    campaignTouchServices[campaignId] = serviceSet;
                }
                serviceSet.Add(service);
            }
        }

        foreach (var campaign in campaigns)
        {
            var segment = string.IsNullOrWhiteSpace(campaign.SegmentId) ? "Unsegmented" : campaign.SegmentId!;
            var cost = campaign.CampaignCost ?? 0m;
            var touchedServices = campaignTouchServices.TryGetValue(campaign.CampaignId, out var serviceSet) && serviceSet.Count > 0
                ? serviceSet
                : new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Unspecified" };

            var splitCost = touchedServices.Count == 0 ? 0m : cost / touchedServices.Count;
            foreach (var service in touchedServices)
            {
                var key = PairKey(segment, service);
                if (!costsByPair.ContainsKey(key))
                {
                    costsByPair[key] = 0m;
                }
                costsByPair[key] += splitCost;

                if (!campaignCountByPair.TryGetValue(key, out var campaignSet))
                {
                    campaignSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    campaignCountByPair[key] = campaignSet;
                }
                campaignSet.Add(campaign.CampaignId);
            }
        }

        var roiKeys = revenueByPair.Keys.Union(costsByPair.Keys, StringComparer.OrdinalIgnoreCase).ToList();
        var roiBySegmentService = roiKeys
            .Select(key =>
            {
                var parts = ParsePairKey(key);
                var revenue = revenueByPair.TryGetValue(key, out var rev) ? rev : 0m;
                var cost = costsByPair.TryGetValue(key, out var cst) ? cst : 0m;
                var roiPercent = cost <= 0m ? (double?)null : Math.Round((double)((revenue - cost) / cost) * 100d, 2);
                return new
                {
                    segment = parts.segment,
                    service = parts.service,
                    campaigns = campaignCountByPair.TryGetValue(key, out var campaignSet) ? campaignSet.Count : 0,
                    wonContacts = wonContactsByPair.TryGetValue(key, out var wonSet) ? wonSet.Count : 0,
                    attributedRevenue = Math.Round(revenue, 2),
                    campaignCost = Math.Round(cost, 2),
                    netRevenue = Math.Round(revenue - cost, 2),
                    roiPercent
                };
            })
            .OrderByDescending(x => x.roiPercent ?? double.MinValue)
            .ThenByDescending(x => x.attributedRevenue)
            .ToList();

        var roiSummary = new
        {
            totalRevenue = Math.Round(roiBySegmentService.Sum(x => x.attributedRevenue), 2),
            totalCost = Math.Round(roiBySegmentService.Sum(x => x.campaignCost), 2),
            netRevenue = Math.Round(roiBySegmentService.Sum(x => x.netRevenue), 2)
        };

        var suggestionScores = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var evt in eventRows.Where(x => string.Equals(x.EventType, "opened", StringComparison.OrdinalIgnoreCase)
                                                 || string.Equals(x.EventType, "replied", StringComparison.OrdinalIgnoreCase)))
        {
            if (!contactMap.TryGetValue(evt.ContactId, out var contact))
            {
                continue;
            }

            var service = string.IsNullOrWhiteSpace(contact.ServiceInterest) ? "Unspecified" : contact.ServiceInterest.Trim();
            var segment = "Unsegmented";
            if (!string.IsNullOrWhiteSpace(evt.CampaignId) && campaignMap.TryGetValue(evt.CampaignId, out var campaign))
            {
                segment = string.IsNullOrWhiteSpace(campaign.SegmentId) ? "Unsegmented" : campaign.SegmentId!;
            }

            var localEventTime = ConvertUtcToTimezone(evt.OccurredAtUtc, contact.Timezone);
            var dayOfWeek = localEventTime.DayOfWeek.ToString();
            var hour = localEventTime.Hour;
            var scoreWeight = string.Equals(evt.EventType, "replied", StringComparison.OrdinalIgnoreCase) ? 2 : 1;

            var suggestionKey = SuggestionKey(segment, service, dayOfWeek, hour);
            if (!suggestionScores.ContainsKey(suggestionKey))
            {
                suggestionScores[suggestionKey] = 0;
            }
            suggestionScores[suggestionKey] += scoreWeight;
        }

        var sendTimeSuggestions = suggestionScores
            .GroupBy(x =>
            {
                var parts = x.Key.Split('\u001F');
                return new { segment = parts[0], service = parts[1] };
            })
            .Select(group => new
            {
                segment = group.Key.segment,
                service = group.Key.service,
                recommendations = group
                    .Select(item =>
                    {
                        var parts = item.Key.Split('\u001F');
                        return new
                        {
                            dayOfWeek = parts[2],
                            hour = int.Parse(parts[3]),
                            score = item.Value
                        };
                    })
                    .OrderByDescending(x => x.score)
                    .Take(3)
                    .ToList()
            })
            .OrderByDescending(x => x.recommendations.Sum(r => r.score))
            .ThenBy(x => x.segment)
            .ToList();

        if (sendTimeSuggestions.Count == 0)
        {
            sendTimeSuggestions = new[]
            {
                new
                {
                    segment = "Unsegmented",
                    service = "Unspecified",
                    recommendations = new[]
                    {
                        new { dayOfWeek = "Tuesday", hour = 10, score = 1 },
                        new { dayOfWeek = "Wednesday", hour = 11, score = 1 },
                        new { dayOfWeek = "Thursday", hour = 9, score = 1 }
                    }.ToList()
                }
            }.ToList();
        }

        await EnsurePlatformUpdatesSeedAsync(db);
        var criticalUpdates = await GetCriticalPlatformUpdatesAsync(db);

        return Ok(new
        {
            windowDays = safeDays,
            fromUtc = rangeStartUtc,
            toUtc = rangeEndUtc,
            stageFunnel,
            conversionRates,
            ownerWorkload,
            taskStats = new
            {
                total = tasks.Count,
                open = tasks.Count(x => !string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
                completed = tasks.Count(x => string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
                overdue = overdueTasks
            },
            engagement,
            journeyPerformance,
            transitions = transitionCounts,
            deliverability,
            roiSummary,
            roiBySegmentService,
            sendTimeSuggestions,
            criticalUpdates
        });
    }

    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.EventType)) return BadRequest(new { error = "EventType is required" });
        if (string.IsNullOrWhiteSpace(request.ContactId)) return BadRequest(new { error = "ContactId is required" });

        var normalizedType = request.EventType.Trim().ToLowerInvariant();
        if (!AllowedEventTypes.Contains(normalizedType)) return BadRequest(new { error = "Unsupported event type" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == request.ContactId);
        if (contact == null) return NotFound(new { error = "Contact not found" });

        var evt = await RecordEventAndEnrollAsync(
            db,
            userEmail,
            normalizedType,
            request.ContactId,
            request.CampaignId,
            request.JourneyId,
            request.MessageId,
            request.SourceEventId,
            request.Metadata,
            request.OccurredAtUtc);

        if (IsPositiveSignal(normalizedType)
            && string.Equals(contact.LeadStage, "Qualified", StringComparison.OrdinalIgnoreCase))
        {
            SetLeadStageAsync(db, userEmail, contact, "Won", "Auto-promoted from engagement", normalizedType, evt.EventId);
        }

        await db.SaveChangesAsync();
        return Ok(new { eventId = evt.EventId, enrolled = true });
    }

    [AllowAnonymous]
    [HttpGet("track/open")]
    public async Task<IActionResult> TrackOpen([FromQuery] string userEmail, [FromQuery] string contactId, [FromQuery] string? campaignId = null, [FromQuery] string? journeyId = null, [FromQuery] string? messageId = null)
    {
        var normalizedUser = NormalizeEmail(userEmail);
        if (!string.IsNullOrWhiteSpace(contactId) && !string.IsNullOrWhiteSpace(normalizedUser))
        {
            await using var db = await _dbContextFactory.CreateDbContextAsync();
            var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == normalizedUser && x.ContactId == contactId);
            if (contact != null)
            {
                await RecordEventAndEnrollAsync(db, normalizedUser, "opened", contactId, campaignId, journeyId, messageId);
                await db.SaveChangesAsync();
            }
        }

        var gifBytes = Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
        return File(gifBytes, "image/gif");
    }

    [AllowAnonymous]
    [HttpGet("track/click")]
    public async Task<IActionResult> TrackClick([FromQuery] string userEmail, [FromQuery] string contactId, [FromQuery] string url, [FromQuery] string? campaignId = null, [FromQuery] string? journeyId = null, [FromQuery] string? messageId = null)
    {
        var target = string.IsNullOrWhiteSpace(url) ? "https://example.com" : Uri.UnescapeDataString(url);

        var normalizedUser = NormalizeEmail(userEmail);

        if (!string.IsNullOrWhiteSpace(contactId) && !string.IsNullOrWhiteSpace(normalizedUser))
        {
            await using var db = await _dbContextFactory.CreateDbContextAsync();
            var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == normalizedUser && x.ContactId == contactId);
            if (contact != null)
            {
                var evt = await RecordEventAndEnrollAsync(db, normalizedUser, "clicked", contactId, campaignId, journeyId, messageId, metadata: new Dictionary<string, string>
                {
                    ["url"] = target
                });

                if (string.Equals(contact.LeadStage, "Qualified", StringComparison.OrdinalIgnoreCase))
                {
                    SetLeadStageAsync(db, normalizedUser, contact, "Won", "Auto-promoted from click", "clicked", evt.EventId);
                }

                await db.SaveChangesAsync();
            }
        }

        return Redirect(target);
    }

        [HttpGet("journeys/summary")]
        public async Task<IActionResult> GetJourneySummary()
        {
            var userEmail = GetUserEmail();
            if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

            await using var db = await _dbContextFactory.CreateDbContextAsync();
            var journeys = await db.Journeys
                .Where(x => x.UserEmail == userEmail)
                .OrderByDescending(x => x.UpdatedAtUtc)
                .ToListAsync();

            var enrollments = await db.JourneyEnrollments
                .Where(x => x.UserEmail == userEmail)
                .ToListAsync();

            var enrollmentMap = enrollments
                .GroupBy(x => x.JourneyId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        active = g.Count(x => string.Equals(x.Status, "Active", StringComparison.OrdinalIgnoreCase)),
                        completed = g.Count(x => string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
                        total = g.Count()
                    },
                    StringComparer.OrdinalIgnoreCase);

            return Ok(new
            {
                journeys = journeys.Select(journey =>
                {
                    var hasCounts = enrollmentMap.TryGetValue(journey.JourneyId, out var counts);
                    return new
                    {
                        journey.JourneyId,
                        journey.Name,
                        journey.TriggerType,
                        journey.TriggerRefId,
                        journey.Status,
                        activeEnrollments = hasCounts ? counts!.active : 0,
                        completedEnrollments = hasCounts ? counts!.completed : 0,
                        totalEnrollments = hasCounts ? counts!.total : 0,
                        journey.UpdatedAtUtc
                    };
                })
            });
        }

    [HttpGet("journeys")]
    public async Task<IActionResult> GetJourneys()
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journeys = await db.Journeys
            .Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ToListAsync();

        var stepsCount = await db.JourneySteps
            .Where(x => journeys.Select(j => j.JourneyId).Contains(x.JourneyId))
            .GroupBy(x => x.JourneyId)
            .Select(g => new { journeyId = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.journeyId, x => x.count);

        return Ok(new
        {
            journeys = journeys.Select(x => new
            {
                x.JourneyId,
                x.Name,
                x.TriggerType,
                x.TriggerRefId,
                x.Status,
                stepsCount = stepsCount.TryGetValue(x.JourneyId, out var count) ? count : 0,
                x.UpdatedAtUtc
            })
        });
    }

    [HttpPost("journeys")]
    public async Task<IActionResult> CreateJourney([FromBody] CreateJourneyRequest request)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Journey name is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journey = new JourneyEntity
        {
            UserEmail = userEmail,
            Name = request.Name.Trim(),
            TriggerType = string.IsNullOrWhiteSpace(request.TriggerType) ? "list_joined" : request.TriggerType.Trim(),
            TriggerRefId = request.TriggerRefId,
            Status = "Draft",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Journeys.Add(journey);
        await db.SaveChangesAsync();
        return Ok(new { journeyId = journey.JourneyId });
    }

    [HttpGet("journeys/{journeyId}")]
    public async Task<IActionResult> GetJourneyById(string journeyId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journey = await db.Journeys.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.JourneyId == journeyId);
        if (journey == null) return NotFound(new { error = "Journey not found" });

        var steps = await db.JourneySteps
            .Where(x => x.JourneyId == journeyId)
            .OrderBy(x => x.StepOrder)
            .ToListAsync();

        return Ok(new { journey, steps });
    }

    [HttpPut("journeys/{journeyId}/steps")]
    public async Task<IActionResult> UpsertJourneySteps(string journeyId, [FromBody] List<UpsertJourneyStepRequest> steps)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });
        if (steps == null || steps.Count == 0) return BadRequest(new { error = "At least one step is required" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journey = await db.Journeys.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.JourneyId == journeyId);
        if (journey == null) return NotFound(new { error = "Journey not found" });

        var duplicateOrder = steps.GroupBy(x => x.StepOrder).Any(g => g.Count() > 1);
        if (duplicateOrder) return BadRequest(new { error = "StepOrder must be unique" });

        var invalid = steps.FirstOrDefault(x => x.StepOrder < 1 || x.DelayMinutes < 0);
        if (invalid != null) return BadRequest(new { error = "Invalid step order or delay" });

        var existing = await db.JourneySteps.Where(x => x.JourneyId == journeyId).ToListAsync();
        db.JourneySteps.RemoveRange(existing);

        var entities = steps
            .OrderBy(x => x.StepOrder)
            .Select(x => new JourneyStepEntity
            {
                JourneyId = journeyId,
                StepOrder = x.StepOrder,
                StepType = string.IsNullOrWhiteSpace(x.StepType) ? "send_email" : x.StepType.Trim(),
                DelayMinutes = x.DelayMinutes,
                TemplateId = x.TemplateId,
                SubjectOverride = x.SubjectOverride,
                BodyHtmlOverride = x.BodyHtmlOverride,
                ConditionEventType = string.IsNullOrWhiteSpace(x.ConditionEventType) ? null : x.ConditionEventType.Trim().ToLowerInvariant(),
                ConditionWindowHours = x.ConditionWindowHours,
                ToLeadStage = x.ToLeadStage
            })
            .ToList();

        db.JourneySteps.AddRange(entities);
        journey.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { updated = true, steps = entities.Count });
    }

    [HttpPost("journeys/{journeyId}/publish")]
    public async Task<IActionResult> PublishJourney(string journeyId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journey = await db.Journeys.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.JourneyId == journeyId);
        if (journey == null) return NotFound(new { error = "Journey not found" });

        var stepsCount = await db.JourneySteps.CountAsync(x => x.JourneyId == journeyId);
        if (stepsCount == 0) return BadRequest(new { error = "Journey requires at least one step" });

        journey.Status = "Published";
        journey.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { published = true });
    }

    [HttpPost("journeys/{journeyId}/pause")]
    public async Task<IActionResult> PauseJourney(string journeyId)
    {
        var userEmail = GetUserEmail();
        if (string.IsNullOrWhiteSpace(userEmail)) return Unauthorized(new { error = "User email not found in token" });

        await using var db = await _dbContextFactory.CreateDbContextAsync();
        var journey = await db.Journeys.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.JourneyId == journeyId);
        if (journey == null) return NotFound(new { error = "Journey not found" });

        journey.Status = "Paused";
        journey.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { paused = true });
    }

    private static async Task EnsurePlatformUpdatesSeedAsync(AppDbContext db)
    {
        if (await db.PlatformUpdates.AnyAsync())
        {
            return;
        }

        var now = DateTime.UtcNow;
        var seeds = new List<PlatformUpdateEntity>
        {
            new()
            {
                Source = "Microsoft",
                Category = "Security",
                Severity = "High",
                Title = "Review OAuth consent and app secrets regularly",
                Summary = "Rotate secrets and review permissions at least monthly.",
                Url = "https://learn.microsoft.com/",
                IsCritical = true,
                IsActive = true,
                PublishedAtUtc = now.AddDays(-7),
                RetrievedAtUtc = now
            },
            new()
            {
                Source = "Google",
                Category = "Deliverability",
                Severity = "Medium",
                Title = "Monitor sender reputation and bounce handling",
                Summary = "Track bounce and complaint trends to protect deliverability.",
                Url = "https://support.google.com/",
                IsCritical = false,
                IsActive = true,
                PublishedAtUtc = now.AddDays(-4),
                RetrievedAtUtc = now
            },
            new()
            {
                Source = "Platform",
                Category = "Reliability",
                Severity = "High",
                Title = "Verify automation retry and dead-letter behavior",
                Summary = "Ensure journey retries do not duplicate sends under failure.",
                Url = null,
                IsCritical = true,
                IsActive = true,
                PublishedAtUtc = now.AddDays(-2),
                RetrievedAtUtc = now
            }
        };

        db.PlatformUpdates.AddRange(seeds);
        await db.SaveChangesAsync();
    }

    private static async Task<List<object>> GetCriticalPlatformUpdatesAsync(AppDbContext db)
    {
        var items = await db.PlatformUpdates
            .Where(x => x.IsActive && x.IsCritical)
            .OrderByDescending(x => x.PublishedAtUtc)
            .Take(10)
            .Select(x => new
            {
                x.UpdateId,
                x.Source,
                x.Category,
                x.Severity,
                x.Title,
                x.Summary,
                x.Url,
                x.PublishedAtUtc,
                x.RetrievedAtUtc
            })
            .ToListAsync();

        return items.Cast<object>().ToList();
    }

    private async Task EnsureDefaultTemplatesAsync(AppDbContext db, string userEmail)
    {
        var existing = await db.CampaignTemplates
            .Where(x => x.UserEmail == userEmail)
            .Select(x => x.Category)
            .Distinct()
            .ToListAsync();

        var needed = AllowedTemplateCategories
            .Where(x => !existing.Contains(x, StringComparer.OrdinalIgnoreCase))
            .ToList();

        if (needed.Count == 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var defaults = new List<CampaignTemplateEntity>();

        if (needed.Contains("welcome", StringComparer.OrdinalIgnoreCase))
        {
            defaults.Add(new CampaignTemplateEntity
            {
                UserEmail = userEmail,
                Name = "Welcome Starter",
                Category = "welcome",
                Subject = "Welcome {{firstName}}",
                BodyHtml = "<p>Hi {{firstName}},</p><p>Welcome to our community at {{company}}.</p>",
                AllowedTokensJson = JsonSerializer.Serialize(new[] { "firstName", "company" }),
                Version = 1,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        if (needed.Contains("follow-up", StringComparer.OrdinalIgnoreCase))
        {
            defaults.Add(new CampaignTemplateEntity
            {
                UserEmail = userEmail,
                Name = "Follow-up Starter",
                Category = "follow-up",
                Subject = "Following up with {{firstName}}",
                BodyHtml = "<p>Hi {{firstName}},</p><p>Just checking in from {{company}}.</p>",
                AllowedTokensJson = JsonSerializer.Serialize(new[] { "firstName", "company" }),
                Version = 1,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        if (needed.Contains("proposal", StringComparer.OrdinalIgnoreCase))
        {
            defaults.Add(new CampaignTemplateEntity
            {
                UserEmail = userEmail,
                Name = "Proposal Starter",
                Category = "proposal",
                Subject = "Proposal for {{company}}",
                BodyHtml = "<p>Hello {{firstName}},</p><p>Sharing a proposal tailored for {{company}}.</p>",
                AllowedTokensJson = JsonSerializer.Serialize(new[] { "firstName", "company" }),
                Version = 1,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        if (needed.Contains("reminder", StringComparer.OrdinalIgnoreCase))
        {
            defaults.Add(new CampaignTemplateEntity
            {
                UserEmail = userEmail,
                Name = "Reminder Starter",
                Category = "reminder",
                Subject = "Reminder for {{firstName}}",
                BodyHtml = "<p>Hi {{firstName}},</p><p>This is a quick reminder from {{company}}.</p>",
                AllowedTokensJson = JsonSerializer.Serialize(new[] { "firstName", "company" }),
                Version = 1,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        if (defaults.Count > 0)
        {
            db.CampaignTemplates.AddRange(defaults);
            await db.SaveChangesAsync();
        }
    }
}
