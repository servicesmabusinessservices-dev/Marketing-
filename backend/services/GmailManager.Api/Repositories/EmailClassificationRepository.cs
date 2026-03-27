using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class EmailClassificationRepository : IEmailClassificationRepository
{
    public async Task<Dictionary<string, string>> GetClassificationsAsync(
        AppDbContext db, string userEmail, List<string> messageIds)
    {
        return await db.EmailClassifications
            .Where(x => x.UserEmail == userEmail && messageIds.Contains(x.MessageId))
            .ToDictionaryAsync(x => x.MessageId, x => x.Classification);
    }

    public Task<EmailClassificationEntity?> FindAsync(AppDbContext db, string userEmail, string messageId)
        => db.EmailClassifications.FindAsync(userEmail, messageId).AsTask();

    public async Task UpsertAsync(AppDbContext db, string userEmail, string messageId, string classification)
    {
        var existing = await db.EmailClassifications.FindAsync(userEmail, messageId);
        if (existing == null)
        {
            db.EmailClassifications.Add(new EmailClassificationEntity
            {
                UserEmail = userEmail,
                MessageId = messageId,
                Classification = classification,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
        else
        {
            existing.Classification = classification;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    public async Task<List<(string Classification, int Count)>> GetClassificationSummaryAsync(
        AppDbContext db, string userEmail)
    {
        var grouped = await db.EmailClassifications
            .Where(x => x.UserEmail == userEmail)
            .GroupBy(x => x.Classification)
            .Select(x => new { classification = x.Key, count = x.Count() })
            .ToListAsync();

        return grouped.Select(x => (x.classification, x.count)).ToList();
    }
}
