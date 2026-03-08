using System.Threading.Channels;

namespace GmailManager.Api.Services;

public class BulkEmailJobQueue : IBulkEmailJobQueue
{
    private readonly Channel<string> _queue = Channel.CreateUnbounded<string>();

    public ValueTask QueueAsync(string jobId, CancellationToken cancellationToken = default)
    {
        return _queue.Writer.WriteAsync(jobId, cancellationToken);
    }

    public ValueTask<string> DequeueAsync(CancellationToken cancellationToken)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
