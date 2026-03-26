using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface IEmailClassificationRepository
{
    Task<Dictionary<string, string>> GetClassificationsAsync(AppDbContext db, string userEmail, List<string> messageIds);
    Task<EmailClassificationEntity?> FindAsync(AppDbContext db, string userEmail, string messageId);
    Task UpsertAsync(AppDbContext db, string userEmail, string messageId, string classification);
    Task<List<(string Classification, int Count)>> GetClassificationSummaryAsync(AppDbContext db, string userEmail);
}
