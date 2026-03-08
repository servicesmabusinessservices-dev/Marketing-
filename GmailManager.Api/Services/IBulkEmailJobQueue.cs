using System.Threading.Channels;

namespace GmailManager.Api.Services;

public interface IBulkEmailJobQueue
{
    ValueTask QueueAsync(string jobId, CancellationToken cancellationToken = default);
    ValueTask<string> DequeueAsync(CancellationToken cancellationToken);
}
