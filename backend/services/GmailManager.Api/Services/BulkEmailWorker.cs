using System.Text;
using System.Text.RegularExpressions;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Models;
using GmailManager.Shared.Repositories.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Services;

public class BulkEmailWorker : BackgroundService
{
    private readonly IBulkEmailJobQueue _queue;
    private readonly IBulkEmailJobStore _jobStore;
    private readonly IUserTokenStore _userTokenStore;
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<BulkEmailWorker> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private static readonly Regex TokenRegex = new(@"\{\{\s*(\w+)\s*\}\}", RegexOptions.Compiled);

    public BulkEmailWorker(
        IBulkEmailJobQueue queue,
        IBulkEmailJobStore jobStore,
        IUserTokenStore userTokenStore,
        IDbContextFactory<AppDbContext> dbContextFactory,
        IConfiguration config,
        ILogger<BulkEmailWorker> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _queue = queue;
        _jobStore = jobStore;
        _userTokenStore = userTokenStore;
        _dbContextFactory = dbContextFactory;
        _config = config;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    private static string ApplyTokens(string template, ContactEntity? contact, string recipientEmail)
    {
        if (!template.Contains("{{" )) return template;
        return TokenRegex.Replace(template, m => m.Groups[1].Value.ToLowerInvariant() switch
        {
            "firstname" => contact?.FirstName ?? "",
            "lastname"  => contact?.LastName  ?? "",
            "company"   => contact?.Company   ?? "",
            "email"     => recipientEmail,
            _           => m.Value
        });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            string jobId;
            try
            {
                jobId = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            var job = await _jobStore.GetAsync(jobId, stoppingToken);

            if (job == null)
            {
                _logger.LogWarning("Bulk job {JobId} not found in store", jobId);
                continue;
            }

            await ProcessJobAsync(job, stoppingToken);
        }
    }

    private async Task ProcessJobAsync(BulkEmailJob job, CancellationToken cancellationToken)
    {
        try
        {
            job.Status = BulkEmailJobStatus.InProgress;
            job.StartedAtUtc = DateTime.UtcNow;
            await _jobStore.UpsertAsync(job, cancellationToken);

            var gmailService = await BuildGmailServiceAsync(job.UserEmail, cancellationToken);
            await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);

            // Create a scope to resolve scoped services
            using var scope = _serviceScopeFactory.CreateScope();
            var marketingDataRepo = scope.ServiceProvider.GetRequiredService<IMarketingDataRepository>();
            var contactRepo = scope.ServiceProvider.GetRequiredService<IContactRepository>();

            // Load suppression list once per job — avoids N+1 queries per recipient.
            var suppressedEmails = await marketingDataRepo.GetSuppressedEmailsAsync(db, job.UserEmail);

            for (var i = 0; i < job.Recipients.Count; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var recipient = job.Recipients[i];
                var normalizedRecipient = recipient.Trim().ToLowerInvariant();

                // Skip suppressed addresses — count as neither success nor failure.
                if (suppressedEmails.Contains(normalizedRecipient))
                {
                    _logger.LogInformation(
                        "Bulk job {JobId}: skipping suppressed recipient {Recipient}", job.JobId, normalizedRecipient);
                    job.ProcessedCount++;
                    await _jobStore.UpsertAsync(job, cancellationToken);
                    continue;
                }

                try
                {
                    var contact = await contactRepo.GetByNormalizedEmailAsync(
                        db, job.UserEmail, normalizedRecipient);

                    var personalizedSubject = ApplyTokens(job.Subject, contact, recipient);
                    var personalizedBody    = EmailBodySanitizer.Sanitize(
                        ApplyTokens(job.Body,    contact, recipient));

                    var message = new StringBuilder();
                    message.AppendLine($"To: {recipient}");
                    message.AppendLine($"Subject: {personalizedSubject}");
                    message.AppendLine("Content-Type: text/html; charset=utf-8");
                    message.AppendLine();
                    message.AppendLine(personalizedBody);

                    var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(message.ToString()))
                        .Replace('+', '-')
                        .Replace('/', '_')
                        .Replace("=", "");

                    var gmailMessage = new Message { Raw = encoded };
                    await gmailService.Users.Messages.Send(gmailMessage, "me").ExecuteAsync(cancellationToken);
                    job.SuccessCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed sending bulk email for job {JobId} to {Recipient}", job.JobId, recipient);
                    job.FailureCount++;
                }

                job.ProcessedCount++;
                await _jobStore.UpsertAsync(job, cancellationToken);

                if (i < job.Recipients.Count - 1)
                {
                    await Task.Delay(TimeSpan.FromSeconds(job.DelaySeconds), cancellationToken);
                }
            }

            job.Status = job.FailureCount == 0 ? BulkEmailJobStatus.Completed : BulkEmailJobStatus.Failed;
            job.CompletedAtUtc = DateTime.UtcNow;
            await _jobStore.UpsertAsync(job, cancellationToken);

            // Write notification
            await WriteJobNotificationAsync(job, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bulk job {JobId} failed", job.JobId);
            job.Status = BulkEmailJobStatus.Failed;
            job.Error = ex.Message;
            job.CompletedAtUtc = DateTime.UtcNow;
            await _jobStore.UpsertAsync(job, cancellationToken);

            // Write notification
            await WriteJobNotificationAsync(job, cancellationToken);
        }
    }

    private async Task WriteJobNotificationAsync(BulkEmailJob job, CancellationToken cancellationToken)
    {
        try
        {
            await using var db = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
            
            // Create a scope to resolve scoped services
            using var scope = _serviceScopeFactory.CreateScope();
            var notificationRepo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
            
            var isSuccess = job.Status == BulkEmailJobStatus.Completed;
            await notificationRepo.AddAsync(db, new NotificationEntity
            {
                UserEmail = job.UserEmail,
                Type = isSuccess ? "bulk_complete" : "bulk_failed",
                Title = isSuccess
                    ? $"Bulk send completed — {job.SuccessCount}/{job.Recipients.Count} sent"
                    : $"Bulk send failed — {job.FailureCount} failures",
                Message = isSuccess
                    ? $"Successfully sent {job.SuccessCount} of {job.Recipients.Count} emails."
                    : $"Job finished with {job.FailureCount} failures. {job.Error ?? string.Empty}".Trim(),
                LinkUrl = "/emails/bulk",
            });
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write notification for bulk job {JobId}", job.JobId);
        }
    }

    private async Task<GmailService> BuildGmailServiceAsync(string userEmail, CancellationToken cancellationToken)
    {
        var tokenResponse = await _userTokenStore.GetAsync(userEmail, cancellationToken);
        if (tokenResponse == null)
        {
            throw new UnauthorizedAccessException($"Token not found for user {userEmail}");
        }

        var credential = new UserCredential(
            new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = _config["GoogleAuth:ClientId"],
                    ClientSecret = _config["GoogleAuth:ClientSecret"]
                },
                Scopes = new[]
                {
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/gmail.send",
                    "https://www.googleapis.com/auth/gmail.compose"
                }
            }),
            "user",
            tokenResponse);

        return new GmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Gmail Manager"
        });
    }
}
