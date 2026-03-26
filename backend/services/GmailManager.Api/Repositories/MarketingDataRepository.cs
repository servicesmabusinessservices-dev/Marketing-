using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class MarketingDataRepository : IMarketingDataRepository
{
    // ── Suppressions ──

    public Task<List<SuppressionEntryEntity>> GetSuppressionsAsync(AppDbContext db, string userEmail)
        => db.Suppressions.Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.CreatedAtUtc).ToListAsync();

    public Task<SuppressionEntryEntity?> FindSuppressionAsync(AppDbContext db, string userEmail, string normalizedEmail)
        => db.Suppressions.FindAsync(userEmail, normalizedEmail).AsTask();

    public Task AddSuppressionAsync(AppDbContext db, SuppressionEntryEntity suppression)
    {
        db.Suppressions.Add(suppression);
        return Task.CompletedTask;
    }

    public Task RemoveSuppressionAsync(AppDbContext db, SuppressionEntryEntity suppression)
    {
        db.Suppressions.Remove(suppression);
        return Task.CompletedTask;
    }

    public async Task<List<(string Reason, int Count)>> GetSuppressionSummaryAsync(AppDbContext db, string userEmail)
    {
        var grouped = await db.Suppressions
            .Where(x => x.UserEmail == userEmail)
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Reason) ? "Unspecified" : x.Reason)
            .Select(g => new { reason = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).ToListAsync();
        return grouped.Select(x => (x.reason, x.count)).ToList();
    }

    public Task<int> GetSuppressionCountInRangeAsync(AppDbContext db, string userEmail, DateTime from, DateTime to)
        => db.Suppressions.Where(x => x.UserEmail == userEmail && x.CreatedAtUtc >= from && x.CreatedAtUtc <= to).CountAsync();

    public async Task<HashSet<string>> GetSuppressedEmailsAsync(AppDbContext db, string userEmail)
    {
        var emails = await db.Suppressions
            .Where(x => x.UserEmail == userEmail)
            .Select(x => x.EmailNormalized)
            .ToListAsync();
        return emails.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    // ── Segments ──

    public Task<List<SegmentEntity>> GetSegmentsAsync(AppDbContext db, string userEmail)
        => db.Segments.Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.UpdatedAtUtc).ToListAsync();

    public Task AddSegmentAsync(AppDbContext db, SegmentEntity segment)
    {
        db.Segments.Add(segment);
        return Task.CompletedTask;
    }

    // ── Message Events ──

    public Task AddEventAsync(AppDbContext db, MessageEventEntity evt)
    {
        db.MessageEvents.Add(evt);
        return Task.CompletedTask;
    }

    public async Task<(List<MessageEventEntity> events, int totalCount)> GetEventsPagedAsync(
        AppDbContext db, string userEmail, string? contactId, string? eventType, int page, int pageSize)
    {
        var query = db.MessageEvents.Where(x => x.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(contactId)) query = query.Where(x => x.ContactId == contactId);
        if (!string.IsNullOrWhiteSpace(eventType)) query = query.Where(x => x.EventType == eventType.Trim().ToLowerInvariant());

        var totalCount = await query.CountAsync();
        var events = await query.OrderByDescending(x => x.OccurredAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (events, totalCount);
    }

    public Task<List<MessageEventEntity>> GetEventsInRangeAsync(
        AppDbContext db, string userEmail, DateTime from, DateTime to, HashSet<string>? contactIds = null)
    {
        var query = db.MessageEvents
            .Where(x => x.UserEmail == userEmail && x.OccurredAtUtc >= from && x.OccurredAtUtc <= to);
        if (contactIds != null)
            query = query.Where(x => contactIds.Contains(x.ContactId));
        return query.ToListAsync();
    }

    public Task<bool> HasEventInWindowAsync(
        AppDbContext db, string userEmail, string contactId, string eventType, DateTime windowStart)
        => db.MessageEvents.AnyAsync(x =>
            x.UserEmail == userEmail && x.ContactId == contactId
            && x.EventType == eventType && x.OccurredAtUtc >= windowStart);

    // ── Lead Stage Transitions ──

    public async Task<List<object>> GetTransitionCountsInRangeAsync(
        AppDbContext db, string userEmail, DateTime from, DateTime to, HashSet<string> contactIds)
    {
        var rows = await db.LeadStageHistory
            .Where(x => x.UserEmail == userEmail && x.CreatedAtUtc >= from && x.CreatedAtUtc <= to && contactIds.Contains(x.ContactId))
            .GroupBy(x => new { x.FromStage, x.ToStage })
            .Select(g => new { fromStage = g.Key.FromStage, toStage = g.Key.ToStage, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return rows.Select(x => (object)new { x.fromStage, x.toStage, x.count }).ToList();
    }

    // ── Worker-specific ──

    public Task<List<MessageEventEntity>> GetEventsByTypeBeforeAsync(
        AppDbContext db, string eventType, DateTime threshold, int limit)
        => db.MessageEvents
            .Where(x => x.EventType == eventType && x.OccurredAtUtc <= threshold)
            .OrderBy(x => x.OccurredAtUtc)
            .Take(limit)
            .ToListAsync();

    public Task<bool> HasEventBySourceAsync(
        AppDbContext db, string userEmail, string eventType, string sourceEventId)
        => db.MessageEvents.AnyAsync(x =>
            x.UserEmail == userEmail && x.EventType == eventType && x.SourceEventId == sourceEventId);

    public Task<bool> HasContactEventSinceAsync(
        AppDbContext db, string userEmail, string contactId, string eventType, DateTime since)
        => db.MessageEvents.AnyAsync(x =>
            x.UserEmail == userEmail && x.ContactId == contactId
            && x.EventType == eventType && x.OccurredAtUtc >= since);
}
