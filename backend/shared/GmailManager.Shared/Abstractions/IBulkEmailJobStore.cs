using GmailManager.Shared.Models;

namespace GmailManager.Shared.Abstractions;

public interface IBulkEmailJobStore
{
    Task UpsertAsync(BulkEmailJob job, CancellationToken cancellationToken = default);
    Task<BulkEmailJob?> GetAsync(string jobId, CancellationToken cancellationToken = default);
}
