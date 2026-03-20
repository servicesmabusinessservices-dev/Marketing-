using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Services;
using System.Security.Claims;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using GmailManager.Api.Models;
using GmailManager.Api.Services;
using GmailManager.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;

namespace GmailManager.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private sealed class EmailListItem
    {
        public string Id { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string From { get; set; } = string.Empty;
        public string? Date { get; set; }
        public string? Snippet { get; set; }
        public bool IsRead { get; set; }
        public bool IsImportant { get; set; }
        public string Classification { get; set; } = "None";
    }

    private readonly IConfiguration _config;
    private readonly IUserTokenStore _userTokenStore;
    private readonly IDevelopmentDemoEmailStore _developmentDemoEmailStore;
    private readonly IBulkEmailJobQueue _bulkEmailJobQueue;
    private readonly IBulkEmailJobStore _bulkEmailJobStore;
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly ILogger<EmailController> _logger;
    private readonly IWebHostEnvironment _env;

    public EmailController(
        IConfiguration config,
        IUserTokenStore userTokenStore,
        IDevelopmentDemoEmailStore developmentDemoEmailStore,
        IBulkEmailJobQueue bulkEmailJobQueue,
        IBulkEmailJobStore bulkEmailJobStore,
        IDbContextFactory<AppDbContext> dbContextFactory,
        ILogger<EmailController> logger,
        IWebHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _userTokenStore = userTokenStore;
        _developmentDemoEmailStore = developmentDemoEmailStore;
        _bulkEmailJobQueue = bulkEmailJobQueue;
        _bulkEmailJobStore = bulkEmailJobStore;
        _dbContextFactory = dbContextFactory;
        _env = env;
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetEmails(
        [FromQuery] int maxResults = 50,
        [FromQuery] string? pageToken = null,
        [FromQuery] string? classification = null,
        [FromQuery] string? sortBy = "date",
        [FromQuery] string? sortDir = "desc",
        [FromQuery] string? q = null)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        var allowedClassifications = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "None", "Lead", "Potential Client", "Client", "Follow Up", "Not Relevant"
        };

        if (!string.IsNullOrWhiteSpace(classification) && !allowedClassifications.Contains(classification.Trim()))
        {
            return BadRequest(new { error = "Invalid classification value." });
        }

        var allowedSortBy = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "date", "classification", "from", "subject"
        };

        if (!string.IsNullOrWhiteSpace(sortBy) && !allowedSortBy.Contains(sortBy.Trim()))
        {
            return BadRequest(new { error = "Invalid sortBy value." });
        }

        if (!string.IsNullOrWhiteSpace(sortDir) &&
            !sortDir.Equals("asc", StringComparison.OrdinalIgnoreCase) &&
            !sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Invalid sortDir value." });
        }

        maxResults = Math.Clamp(maxResults, 1, 100);

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var (demoEmails, nextToken) = await _developmentDemoEmailStore.GetEmailsAsync(
                userEmail,
                maxResults,
                pageToken,
                classification,
                sortBy,
                sortDir,
                q);

            return Ok(new
            {
                emails = demoEmails.Select(MapDemoListItem).ToList(),
                nextPageToken = nextToken,
                mode = "development-bypass"
            });
        }

        var service = await GetGmailService();

        var collected = new List<EmailListItem>();
        var cursor = pageToken;
        var safety = 0;

        while (collected.Count < maxResults && safety < 10)
        {
            var request = service.Users.Messages.List("me");
            request.MaxResults = maxResults;
            request.PageToken = cursor;

            if (!string.IsNullOrWhiteSpace(q))
            {
                request.Q = q;
            }

            var response = await request.ExecuteAsync();
            cursor = response.NextPageToken;

            if (response.Messages == null || response.Messages.Count == 0)
            {
                break;
            }

            var pageItems = new List<EmailListItem>();

            foreach (var msg in response.Messages)
            {
                var detail = await service.Users.Messages.Get("me", msg.Id).ExecuteAsync();
                pageItems.Add(new EmailListItem
                {
                    Id = detail.Id,
                    Subject = detail.Payload?.Headers?.FirstOrDefault(h => h.Name == "Subject")?.Value ?? "(No Subject)",
                    From = detail.Payload?.Headers?.FirstOrDefault(h => h.Name == "From")?.Value ?? "Unknown",
                    Date = detail.Payload?.Headers?.FirstOrDefault(h => h.Name == "Date")?.Value,
                    Snippet = detail.Snippet,
                    IsRead = !(detail.LabelIds?.Contains("UNREAD") ?? false),
                    IsImportant = detail.LabelIds?.Contains("IMPORTANT") ?? false,
                    Classification = "None"
                });
            }

            var messageIds = pageItems.Select(e => e.Id).ToList();
            if (messageIds.Count > 0)
            {
                await using var dbContext = await _dbContextFactory.CreateDbContextAsync();
                var classifications = await dbContext.EmailClassifications
                    .Where(x => x.UserEmail == userEmail && messageIds.Contains(x.MessageId))
                    .ToDictionaryAsync(x => x.MessageId, x => x.Classification);

                foreach (var email in pageItems)
                {
                    if (classifications.TryGetValue(email.Id, out var cls))
                    {
                        email.Classification = cls;
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(classification))
            {
                pageItems = pageItems
                    .Where(x => x.Classification.Equals(classification.Trim(), StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            collected.AddRange(pageItems);

            if (string.IsNullOrWhiteSpace(cursor))
            {
                break;
            }

            safety++;
        }

        var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        IEnumerable<EmailListItem> sorted = (sortBy ?? "date").Trim().ToLowerInvariant() switch
        {
            "classification" => desc
                ? collected.OrderByDescending(x => x.Classification).ThenByDescending(x => ParseEmailDate(x.Date))
                : collected.OrderBy(x => x.Classification).ThenBy(x => ParseEmailDate(x.Date)),
            "from" => desc
                ? collected.OrderByDescending(x => x.From).ThenByDescending(x => ParseEmailDate(x.Date))
                : collected.OrderBy(x => x.From).ThenBy(x => ParseEmailDate(x.Date)),
            "subject" => desc
                ? collected.OrderByDescending(x => x.Subject).ThenByDescending(x => ParseEmailDate(x.Date))
                : collected.OrderBy(x => x.Subject).ThenBy(x => ParseEmailDate(x.Date)),
            _ => desc
                ? collected.OrderByDescending(x => ParseEmailDate(x.Date))
                : collected.OrderBy(x => ParseEmailDate(x.Date))
        };

        return Ok(new
        {
            emails = sorted.Take(maxResults).ToList(),
            nextPageToken = cursor
        });
    }

    [HttpPost("{id}/classification")]
    public async Task<IActionResult> UpdateClassification(string id, [FromBody] UpdateEmailClassificationRequest request)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        var allowed = new[] { "None", "Lead", "Potential Client", "Client", "Follow Up", "Not Relevant" };
        var classification = string.IsNullOrWhiteSpace(request.Classification) ? "None" : request.Classification.Trim();
        if (!allowed.Contains(classification))
        {
            return BadRequest(new { error = "Invalid classification value" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var updated = await _developmentDemoEmailStore.UpdateClassificationAsync(userEmail, id, classification);
            if (!updated)
            {
                return NotFound(new { error = "Email not found" });
            }

            return Ok(new { messageId = id, classification, mode = "development-bypass" });
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();
        var existing = await dbContext.EmailClassifications.FindAsync(userEmail, id);

        if (existing == null)
        {
            existing = new Data.Entities.EmailClassificationEntity
            {
                UserEmail = userEmail,
                MessageId = id,
                Classification = classification,
                UpdatedAtUtc = DateTime.UtcNow
            };
            dbContext.EmailClassifications.Add(existing);
        }
        else
        {
            existing.Classification = classification;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync();
        return Ok(new { messageId = id, classification });
    }

    [HttpPatch("{id}/classification")]
    public Task<IActionResult> PatchClassification(string id, [FromBody] UpdateEmailClassificationRequest request)
        => UpdateClassification(id, request);

    [HttpGet("classification-summary")]
    public async Task<IActionResult> GetClassificationSummary()
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var demoGrouped = await _developmentDemoEmailStore.GetClassificationSummaryAsync(userEmail);
            return Ok(new { classifications = demoGrouped, mode = "development-bypass" });
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();
        var grouped = await dbContext.EmailClassifications
            .Where(x => x.UserEmail == userEmail)
            .GroupBy(x => x.Classification)
            .Select(x => new { classification = x.Key, count = x.Count() })
            .ToListAsync();

        return Ok(new { classifications = grouped });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetEmailSummary()
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var summary = await _developmentDemoEmailStore.GetSummaryAsync(userEmail);
            return Ok(new
            {
                totalCount = summary.TotalCount,
                unreadCount = summary.UnreadCount,
                classificationSummary = summary.ClassificationSummary,
                mode = "development-bypass"
            });
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();
        var grouped = await dbContext.EmailClassifications
            .Where(x => x.UserEmail == userEmail)
            .GroupBy(x => x.Classification)
            .Select(x => new { classification = x.Key, count = x.Count() })
            .ToListAsync();

        var service = await GetGmailService();
        var totalRequest = service.Users.Messages.List("me");
        totalRequest.MaxResults = 1;
        var totalResponse = await totalRequest.ExecuteAsync();

        var unreadRequest = service.Users.Messages.List("me");
        unreadRequest.MaxResults = 1;
        unreadRequest.Q = "is:unread";
        var unreadResponse = await unreadRequest.ExecuteAsync();

        return Ok(new
        {
            totalCount = totalResponse.ResultSizeEstimate,
            unreadCount = unreadResponse.ResultSizeEstimate,
            classificationSummary = grouped
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmail(string id)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var demoEmail = await _developmentDemoEmailStore.GetEmailAsync(userEmail!, id);
            if (demoEmail == null)
            {
                return NotFound(new { error = "Email not found" });
            }

            return Ok(new
            {
                id = demoEmail.MessageId,
                subject = demoEmail.Subject,
                from = demoEmail.From,
                to = demoEmail.To,
                date = demoEmail.ReceivedAtUtc,
                body = demoEmail.Body,
                threadId = demoEmail.ThreadId,
                mode = "development-bypass"
            });
        }

        var service = await GetGmailService();
        var message = await service.Users.Messages.Get("me", id).ExecuteAsync();
        
        var body = GetEmailBody(message.Payload);
        
        return Ok(new
        {
            id = message.Id,
            subject = message.Payload.Headers.FirstOrDefault(h => h.Name == "Subject")?.Value,
            from = message.Payload.Headers.FirstOrDefault(h => h.Name == "From")?.Value,
            to = message.Payload.Headers.FirstOrDefault(h => h.Name == "To")?.Value,
            date = message.Payload.Headers.FirstOrDefault(h => h.Name == "Date")?.Value,
            body,
            threadId = message.ThreadId
        });
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendEmail([FromBody] SendEmailRequest request)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            if (request.To == null || request.To.Count == 0 || request.To.All(string.IsNullOrWhiteSpace))
            {
                return BadRequest(new { error = "At least one recipient is required" });
            }

            var email = await _developmentDemoEmailStore.CreateSentEmailAsync(userEmail, request.To, request.Subject, request.Body);
            return Ok(new { success = true, messageId = email.MessageId, mode = "development-bypass" });
        }

        try
        {
            var service = await GetGmailService();
            
            var message = new StringBuilder();
            message.AppendLine($"To: {string.Join(", ", request.To)}");
            message.AppendLine($"Subject: {request.Subject}");
            message.AppendLine("Content-Type: text/html; charset=utf-8");
            message.AppendLine();
            message.AppendLine(request.Body);
            
            var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(message.ToString()))
                .Replace('+', '-').Replace('/', '_').Replace("=", "");
            
            var gmailMessage = new Message { Raw = encoded };
            await service.Users.Messages.Send(gmailMessage, "me").ExecuteAsync();
            
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email");
            return StatusCode(500, new { error = "Failed to send email." });
        }
    }

    [HttpPost("forward")]
    public async Task<IActionResult> ForwardEmail([FromBody] ForwardEmailRequest request)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            if (string.IsNullOrWhiteSpace(request.MessageId))
            {
                return BadRequest(new { error = "MessageId is required" });
            }

            if (request.To == null || request.To.Count == 0 || request.To.All(string.IsNullOrWhiteSpace))
            {
                return BadRequest(new { error = "At least one recipient is required" });
            }

            var email = await _developmentDemoEmailStore.CreateForwardEmailAsync(userEmail, request.MessageId, request.To, request.Note);
            if (email == null)
            {
                return NotFound(new { error = "Email not found" });
            }

            return Ok(new { success = true, messageId = email.MessageId, mode = "development-bypass" });
        }

        if (string.IsNullOrWhiteSpace(request.MessageId))
        {
            return BadRequest(new { error = "MessageId is required" });
        }

        if (request.To == null || request.To.Count == 0 || request.To.All(string.IsNullOrWhiteSpace))
        {
            return BadRequest(new { error = "At least one recipient is required" });
        }

        try
        {
            var service = await GetGmailService();
            var message = await service.Users.Messages.Get("me", request.MessageId).ExecuteAsync();

            var subject = message.Payload?.Headers?.FirstOrDefault(h => h.Name == "Subject")?.Value ?? "(No Subject)";
            if (!subject.StartsWith("Fwd:", StringComparison.OrdinalIgnoreCase))
            {
                subject = $"Fwd: {subject}";
            }

            var from = message.Payload?.Headers?.FirstOrDefault(h => h.Name == "From")?.Value ?? "Unknown";
            var to = message.Payload?.Headers?.FirstOrDefault(h => h.Name == "To")?.Value ?? string.Empty;
            var date = message.Payload?.Headers?.FirstOrDefault(h => h.Name == "Date")?.Value ?? string.Empty;

            var originalBody = message.Payload != null ? GetEmailBody(message.Payload) : string.Empty;
            var noteHtml = string.IsNullOrWhiteSpace(request.Note)
                ? string.Empty
                : $"<p>{WebUtility.HtmlEncode(request.Note).Replace("\n", "<br />")}</p>";

                        var headerBlock = $@"
<div style=""font-size:12px;color:#6b7280;"">
    <div><strong>From:</strong> {WebUtility.HtmlEncode(from)}</div>
    <div><strong>To:</strong> {WebUtility.HtmlEncode(to)}</div>
    <div><strong>Date:</strong> {WebUtility.HtmlEncode(date)}</div>
    <div><strong>Subject:</strong> {WebUtility.HtmlEncode(subject)}</div>
</div>";

            var originalHtml = LooksLikeHtml(originalBody)
                ? originalBody
                : $"<pre style=\"white-space:pre-wrap;\">{WebUtility.HtmlEncode(originalBody)}</pre>";

            var forwardBody = $@"{noteHtml}
<hr style=""margin:16px 0;border:none;border-top:1px solid #e5e7eb;"" />
{headerBlock}
<div style=""margin-top:12px;"">{originalHtml}</div>";

            var raw = new StringBuilder();
            raw.AppendLine($"To: {string.Join(", ", request.To.Where(r => !string.IsNullOrWhiteSpace(r)))}");
            raw.AppendLine($"Subject: {subject}");
            raw.AppendLine("Content-Type: text/html; charset=utf-8");
            raw.AppendLine();
            raw.AppendLine(forwardBody);

            var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw.ToString()))
                .Replace('+', '-')
                .Replace('/', '_')
                .Replace("=", "");

            var gmailMessage = new Message { Raw = encoded };
            await service.Users.Messages.Send(gmailMessage, "me").ExecuteAsync();

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to forward email {MessageId}", Request.RouteValues["messageId"]);
            return StatusCode(500, new { error = "Failed to forward email." });
        }
    }

    [HttpPost("bulk-send")]
    public async Task<IActionResult> BulkSendEmail([FromBody] BulkEmailRequest request)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (request.Recipients == null || request.Recipients.Count == 0)
        {
            return BadRequest(new { error = "At least one recipient is required" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var demoJob = await _developmentDemoEmailStore.CreateBulkSendJobAsync(userEmail, request);
            return Accepted(new
            {
                jobId = demoJob.JobId,
                status = demoJob.Status.ToString(),
                totalRecipients = demoJob.TotalRecipients,
                statusUrl = $"/api/email/bulk-send/{demoJob.JobId}",
                mode = "development-bypass"
            });
        }

        var job = new BulkEmailJob
        {
            UserEmail = userEmail,
            Subject = request.Subject,
            Body = request.Body,
            Recipients = request.Recipients.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList(),
            DelaySeconds = Math.Max(2, request.DelaySeconds)
        };

        await _bulkEmailJobStore.UpsertAsync(job);
        await _bulkEmailJobQueue.QueueAsync(job.JobId);

        return Accepted(new
        {
            jobId = job.JobId,
            status = job.Status.ToString(),
            totalRecipients = job.TotalRecipients,
            statusUrl = $"/api/email/bulk-send/{job.JobId}"
        });
    }

    [HttpGet("bulk-send/{jobId}")]
    public async Task<IActionResult> GetBulkSendStatus(string jobId)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { error = "User email not found in token" });
        }

        if (await ShouldUseDevelopmentEmailFallbackAsync(userEmail))
        {
            var demoJob = await _developmentDemoEmailStore.GetBulkSendJobAsync(userEmail, jobId);
            if (demoJob == null)
            {
                return NotFound(new { error = "Bulk job not found" });
            }

            return Ok(MapBulkJobStatus(demoJob, true));
        }

        var job = await _bulkEmailJobStore.GetAsync(jobId);
        if (job == null)
        {
            return NotFound(new { error = "Bulk job not found" });
        }

        // IDOR protection — only the owning user may view their job status
        if (!string.Equals(job.UserEmail, userEmail, StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new { error = "Bulk job not found" });
        }

        return Ok(MapBulkJobStatus(job, false));
    }

    private static EmailListItem MapDemoListItem(DevelopmentDemoEmail email)
        => new()
        {
            Id = email.MessageId,
            Subject = email.Subject,
            From = email.From,
            Date = email.ReceivedAtUtc.ToString("o"),
            Snippet = email.Snippet,
            IsRead = email.IsRead,
            IsImportant = email.IsImportant,
            Classification = email.Classification
        };

    private static object MapBulkJobStatus(BulkEmailJob job, bool isDevelopmentBypass)
        => new
        {
            jobId = job.JobId,
            status = job.Status.ToString(),
            totalRecipients = job.TotalRecipients,
            processedCount = job.ProcessedCount,
            successCount = job.SuccessCount,
            failureCount = job.FailureCount,
            error = job.Error,
            createdAtUtc = job.CreatedAtUtc,
            startedAtUtc = job.StartedAtUtc,
            completedAtUtc = job.CompletedAtUtc,
            mode = isDevelopmentBypass ? "development-bypass" : null
        };

    private async Task<GmailService> GetGmailService()
    {
        try
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(email))
            {
                throw new UnauthorizedAccessException("User email not found in token");
            }
            
            var tokenResponse = await _userTokenStore.GetAsync(email);
            if (tokenResponse == null)
            {
                throw new UnauthorizedAccessException("Token not found or expired");
            }
            
            var credential = new UserCredential(new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = new ClientSecrets
                    {
                        ClientId = _config["GoogleAuth:ClientId"],
                        ClientSecret = _config["GoogleAuth:ClientSecret"]
                    },
                    Scopes = new[] { "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose" }
                }), "user", tokenResponse);
            
            return new GmailService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Gmail Manager"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialise GmailService");
            throw;
        }
    }

    private bool IsDevelopmentBypassUser(string? email)
        => _env.IsDevelopment() && string.Equals(email, "dev@localhost", StringComparison.OrdinalIgnoreCase);

    private async Task<bool> ShouldUseDevelopmentEmailFallbackAsync(string? email)
    {
        if (!IsDevelopmentBypassUser(email))
        {
            return false;
        }

        var tokenResponse = await _userTokenStore.GetAsync(email!);
        return tokenResponse == null;
    }

    private string GetEmailBody(MessagePart payload)
    {
        if (payload.Body?.Data != null)
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(
                payload.Body.Data.Replace('-', '+').Replace('_', '/')));
        }
        
        if (payload.Parts != null)
        {
            foreach (var part in payload.Parts)
            {
                if (part.MimeType == "text/html" || part.MimeType == "text/plain")
                {
                    if (part.Body?.Data != null)
                    {
                        return Encoding.UTF8.GetString(Convert.FromBase64String(
                            part.Body.Data.Replace('-', '+').Replace('_', '/')));
                    }
                }
            }
        }
        
        return "No content";
    }

    private static bool LooksLikeHtml(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Regex.IsMatch(value, "<\\/?[a-z][\\s\\S]*>", RegexOptions.IgnoreCase);
    }

    private static DateTimeOffset ParseEmailDate(string? rawDate)
    {
        return DateTimeOffset.TryParse(rawDate, out var dt) ? dt : DateTimeOffset.MinValue;
    }
}
