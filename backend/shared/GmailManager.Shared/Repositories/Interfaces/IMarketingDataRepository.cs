using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface IMarketingDataRepository
{
    // Suppressions
    Task<List<SuppressionEntryEntity>> GetSuppressionsAsync(AppDbContext db, string userEmail);
    Task<SuppressionEntryEntity?> FindSuppressionAsync(AppDbContext db, string userEmail, string normalizedEmail);
    Task AddSuppressionAsync(AppDbContext db, SuppressionEntryEntity suppression);
    Task RemoveSuppressionAsync(AppDbContext db, SuppressionEntryEntity suppression);
    Task<List<(string Reason, int Count)>> GetSuppressionSummaryAsync(AppDbContext db, string userEmail);
    Task<int> GetSuppressionCountInRangeAsync(AppDbContext db, string userEmail, DateTime from, DateTime to);
    Task<HashSet<string>> GetSuppressedEmailsAsync(AppDbContext db, string userEmail);

    // Segments
    Task<List<SegmentEntity>> GetSegmentsAsync(AppDbContext db, string userEmail);
    Task AddSegmentAsync(AppDbContext db, SegmentEntity segment);

    // Message Events
    Task AddEventAsync(AppDbContext db, MessageEventEntity evt);
    Task<(List<MessageEventEntity> events, int totalCount)> GetEventsPagedAsync(
        AppDbContext db, string userEmail, string? contactId, string? eventType, int page, int pageSize);
    Task<List<MessageEventEntity>> GetEventsInRangeAsync(
        AppDbContext db, string userEmail, DateTime from, DateTime to, HashSet<string>? contactIds = null);
    Task<bool> HasEventInWindowAsync(
        AppDbContext db, string userEmail, string contactId, string eventType, DateTime windowStart);

    // Lead Stage History
    Task<List<object>> GetTransitionCountsInRangeAsync(
        AppDbContext db, string userEmail, DateTime from, DateTime to, HashSet<string> contactIds);

    // Worker-specific
    Task<List<MessageEventEntity>> GetEventsByTypeBeforeAsync(AppDbContext db, string eventType, DateTime threshold, int limit);
    Task<bool> HasEventBySourceAsync(AppDbContext db, string userEmail, string eventType, string sourceEventId);
    Task<bool> HasContactEventSinceAsync(AppDbContext db, string userEmail, string contactId, string eventType, DateTime since);
}
