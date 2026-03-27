using GmailManager.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Shared.Repositories;

public class UnitOfWork : IUnitOfWork
{
    public AppDbContext Context { get; }
    private bool _disposed;

    public UnitOfWork(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        Context = dbContextFactory.CreateDbContext();
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => Context.SaveChangesAsync(cancellationToken);

    public async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            await Context.DisposeAsync();
            _disposed = true;
        }
        GC.SuppressFinalize(this);
    }
}
