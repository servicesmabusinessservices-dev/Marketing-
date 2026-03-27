namespace GmailManager.Shared.Abstractions;

public interface IBulkEmailJobQueue
{
    ValueTask QueueAsync(string jobId, CancellationToken cancellationToken = default);
    ValueTask<string> DequeueAsync(CancellationToken cancellationToken);
}
