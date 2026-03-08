using System.Text;
using GmailManager.Api.Models;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;

namespace GmailManager.Api.Services;

public class BulkEmailWorker : BackgroundService
{
    private readonly IBulkEmailJobQueue _queue;
    private readonly IBulkEmailJobStore _jobStore;
    private readonly IUserTokenStore _userTokenStore;
    private readonly IConfiguration _config;
    private readonly ILogger<BulkEmailWorker> _logger;

    public BulkEmailWorker(
        IBulkEmailJobQueue queue,
        IBulkEmailJobStore jobStore,
        IUserTokenStore userTokenStore,
        IConfiguration config,
        ILogger<BulkEmailWorker> logger)
    {
        _queue = queue;
        _jobStore = jobStore;
        _userTokenStore = userTokenStore;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var jobId = await _queue.DequeueAsync(stoppingToken);
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

            for (var i = 0; i < job.Recipients.Count; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var recipient = job.Recipients[i];
                try
                {
                    var message = new StringBuilder();
                    message.AppendLine($"To: {recipient}");
                    message.AppendLine($"Subject: {job.Subject}");
                    message.AppendLine("Content-Type: text/html; charset=utf-8");
                    message.AppendLine();
                    message.AppendLine(job.Body);

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
