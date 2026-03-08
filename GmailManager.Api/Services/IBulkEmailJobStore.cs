using GmailManager.Api.Models;

namespace GmailManager.Api.Services;

public interface IBulkEmailJobStore
{
    Task UpsertAsync(BulkEmailJob job, CancellationToken cancellationToken = default);
    Task<BulkEmailJob?> GetAsync(string jobId, CancellationToken cancellationToken = default);
}
