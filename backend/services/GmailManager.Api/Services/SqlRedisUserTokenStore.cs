using System.Text.Json;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using Google.Apis.Auth.OAuth2.Responses;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace GmailManager.Api.Services;

public class SqlRedisUserTokenStore : IUserTokenStore
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(55);
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly IDistributedCache _distributedCache;
    private readonly IDataProtector _protector;

    public SqlRedisUserTokenStore(IDbContextFactory<AppDbContext> dbContextFactory, IDistributedCache distributedCache, IDataProtectionProvider dataProtectionProvider)
    {
        _dbContextFactory = dbContextFactory;
        _distributedCache = distributedCache;
        _protector = dataProtectionProvider.CreateProtector("GmailManager.TokenProtection");
    }

    public async Task SaveAsync(string email, TokenResponse tokenResponse, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildTokenCacheKey(email);
        var tokenJson = JsonSerializer.Serialize(tokenResponse);
        var encryptedJson = _protector.Protect(tokenJson);

        await _distributedCache.SetStringAsync(cacheKey, encryptedJson, new DistributedCacheEntryOptions
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
                TokenJson = encryptedJson,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
        else
        {
            existing.TokenJson = encryptedJson;
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
            try 
            {
                var decrypted = _protector.Unprotect(cachedJson);
                return JsonSerializer.Deserialize<TokenResponse>(decrypted);
            } 
            catch { return null; } // Handle old unencrypted tokens or corrupted data
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

        try 
        {
            var decryptedDb = _protector.Unprotect(tokenEntity.TokenJson);
            return JsonSerializer.Deserialize<TokenResponse>(decryptedDb);
        }
        catch { return null; } // Handle old unencrypted tokens or corrupted data
    }

    private static string BuildTokenCacheKey(string email) => $"tokens_{email}";
}
