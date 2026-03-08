using System.Text.Json;
using GmailManager.Api.Data;
using GmailManager.Api.Data.Entities;
using GmailManager.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace GmailManager.Api.Services;

public class SqlRedisBulkEmailJobStore : IBulkEmailJobStore
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(2);
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly IDistributedCache _distributedCache;

    public SqlRedisBulkEmailJobStore(IDbContextFactory<AppDbContext> dbContextFactory, IDistributedCache distributedCache)
    {
        _dbContextFactory = dbContextFactory;
        _distributedCache = distributedCache;
    }

    public async Task UpsertAsync(BulkEmailJob job, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildCacheKey(job.JobId);
        var cacheJson = JsonSerializer.Serialize(job);

        await _distributedCache.SetStringAsync(cacheKey, cacheJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, cancellationToken);

        await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        var existing = await db.BulkEmailJobs.FirstOrDefaultAsync(x => x.JobId == job.JobId, cancellationToken);

        if (existing == null)
        {
            db.BulkEmailJobs.Add(MapToEntity(job));
        }
        else
        {
            ApplyToEntity(job, existing);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<BulkEmailJob?> GetAsync(string jobId, CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildCacheKey(jobId);
        var cachedJson = await _distributedCache.GetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedJson))
        {
            return JsonSerializer.Deserialize<BulkEmailJob>(cachedJson);
        }

        await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        var entity = await db.BulkEmailJobs.FirstOrDefaultAsync(x => x.JobId == jobId, cancellationToken);
        if (entity == null)
        {
            return null;
        }

        var job = MapToDomain(entity);
        await _distributedCache.SetStringAsync(cacheKey, JsonSerializer.Serialize(job), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        }, cancellationToken);

        return job;
    }

    private static string BuildCacheKey(string jobId) => $"bulk_job_{jobId}";

    private static BulkEmailJobEntity MapToEntity(BulkEmailJob job)
    {
        return new BulkEmailJobEntity
        {
            JobId = job.JobId,
            UserEmail = job.UserEmail,
            RecipientsJson = JsonSerializer.Serialize(job.Recipients),
            Subject = job.Subject,
            Body = job.Body,
            DelaySeconds = job.DelaySeconds,
            ProcessedCount = job.ProcessedCount,
            SuccessCount = job.SuccessCount,
            FailureCount = job.FailureCount,
            Status = (int)job.Status,
            Error = job.Error,
            CreatedAtUtc = job.CreatedAtUtc,
            StartedAtUtc = job.StartedAtUtc,
            CompletedAtUtc = job.CompletedAtUtc
        };
    }

    private static void ApplyToEntity(BulkEmailJob job, BulkEmailJobEntity entity)
    {
        entity.UserEmail = job.UserEmail;
        entity.RecipientsJson = JsonSerializer.Serialize(job.Recipients);
        entity.Subject = job.Subject;
        entity.Body = job.Body;
        entity.DelaySeconds = job.DelaySeconds;
        entity.ProcessedCount = job.ProcessedCount;
        entity.SuccessCount = job.SuccessCount;
        entity.FailureCount = job.FailureCount;
        entity.Status = (int)job.Status;
        entity.Error = job.Error;
        entity.CreatedAtUtc = job.CreatedAtUtc;
        entity.StartedAtUtc = job.StartedAtUtc;
        entity.CompletedAtUtc = job.CompletedAtUtc;
    }

    private static BulkEmailJob MapToDomain(BulkEmailJobEntity entity)
    {
        return new BulkEmailJob
        {
            JobId = entity.JobId,
            UserEmail = entity.UserEmail,
            Recipients = JsonSerializer.Deserialize<List<string>>(entity.RecipientsJson) ?? new List<string>(),
            Subject = entity.Subject,
            Body = entity.Body,
            DelaySeconds = entity.DelaySeconds,
            ProcessedCount = entity.ProcessedCount,
            SuccessCount = entity.SuccessCount,
            FailureCount = entity.FailureCount,
            Status = (BulkEmailJobStatus)entity.Status,
            Error = entity.Error,
            CreatedAtUtc = entity.CreatedAtUtc,
            StartedAtUtc = entity.StartedAtUtc,
            CompletedAtUtc = entity.CompletedAtUtc
        };
    }
}
