using System.Text.Json;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using Google.Apis.Auth.OAuth2.Responses;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace GmailManager.Api.Services;

public class SqlRedisUserTokenStore : IUserTokenStore
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(55);
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly IDistributedCache _distributedCache;

    public SqlRedisUserTokenStore(IDbContextFactory<AppDbContext> dbContextFactory, IDistributedCache distributedCache)
    {
        _dbContextFactory = dbContextFactory;
        _distributedCache = distributedCache;
    }

    public async Task SaveAsync(string email, TokenResponse tokenResponse, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildTokenCacheKey(email);
        var tokenJson = JsonSerializer.Serialize(tokenResponse);

        await _distributedCache.SetStringAsync(cacheKey, tokenJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, cancellationToken);

        await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        var existing = await db.UserTokens.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (existing == null)
        {
            db.UserTokens.Add(new UserTokenEntity
            {
                Email = email,
                TokenJson = tokenJson,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
        else
        {
            existing.TokenJson = tokenJson;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<TokenResponse?> GetAsync(string email, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildTokenCacheKey(email);
        var cachedJson = await _distributedCache.GetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedJson))
        {
            return JsonSerializer.Deserialize<TokenResponse>(cachedJson);
        }

        await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        var tokenEntity = await db.UserTokens.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (tokenEntity == null)
        {
            return null;
        }

        await _distributedCache.SetStringAsync(cacheKey, tokenEntity.TokenJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, cancellationToken);

        return JsonSerializer.Deserialize<TokenResponse>(tokenEntity.TokenJson);
    }

    private static string BuildTokenCacheKey(string email) => $"tokens_{email}";
}
