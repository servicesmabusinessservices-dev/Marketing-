using GmailManager.Shared.Data;

namespace GmailManager.Shared.Repositories;

public interface IUnitOfWork : IAsyncDisposable
{
    AppDbContext Context { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
