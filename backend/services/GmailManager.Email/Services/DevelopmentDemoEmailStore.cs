using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using GmailManager.Shared.Models;
using GmailManager.Email.Models;
using Microsoft.Extensions.Hosting;

namespace GmailManager.Email.Services;

public interface IDevelopmentDemoEmailStore
{
    Task<(IReadOnlyList<DevelopmentDemoEmail> Emails, string? NextPageToken)> GetEmailsAsync(
        string userEmail,
        int maxResults,
        string? pageToken,
        string? classification,
        string? sortBy,
        string? sortDir,
        string? query,
        CancellationToken cancellationToken = default);

    Task<DevelopmentDemoEmail?> GetEmailAsync(string userEmail, string messageId, CancellationToken cancellationToken = default);
    Task<DevelopmentDemoEmailSummary> GetSummaryAsync(string userEmail, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<object>> GetClassificationSummaryAsync(string userEmail, CancellationToken cancellationToken = default);
    Task<bool> UpdateClassificationAsync(string userEmail, string messageId, string classification, CancellationToken cancellationToken = default);
    Task<DevelopmentDemoEmail> CreateSentEmailAsync(string userEmail, IReadOnlyCollection<string> recipients, string subject, string body, CancellationToken cancellationToken = default);
    Task<DevelopmentDemoEmail?> CreateForwardEmailAsync(string userEmail, string sourceMessageId, IReadOnlyCollection<string> recipients, string? note, CancellationToken cancellationToken = default);
    Task<BulkEmailJob> CreateBulkSendJobAsync(string userEmail, BulkEmailRequest request, CancellationToken cancellationToken = default);
    Task<BulkEmailJob?> GetBulkSendJobAsync(string userEmail, string jobId, CancellationToken cancellationToken = default);
}

public sealed class DevelopmentDemoEmail
{
    public string UserEmail { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string ThreadId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public bool IsImportant { get; set; }
    public string Classification { get; set; } = "None";
    public DateTime ReceivedAtUtc { get; set; }
}

public sealed class DevelopmentDemoEmailSummary
{
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
    public IReadOnlyList<object> ClassificationSummary { get; set; } = Array.Empty<object>();
}

public sealed class DevelopmentDemoEmailStore : IDevelopmentDemoEmailStore
{
    private static readonly Regex HtmlTagRegex = new("<[^>]+>", RegexOptions.Compiled);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _storePath;
    private readonly ILogger<DevelopmentDemoEmailStore> _logger;

    public DevelopmentDemoEmailStore(IHostEnvironment env, ILogger<DevelopmentDemoEmailStore> logger)
    {
        _logger = logger;
        _storePath = Path.Combine(env.ContentRootPath, "App_Data", "development-demo-inbox.json");
    }

    public async Task<(IReadOnlyList<DevelopmentDemoEmail> Emails, string? NextPageToken)> GetEmailsAsync(
        string userEmail,
        int maxResults,
        string? pageToken,
        string? classification,
        string? sortBy,
        string? sortDir,
        string? query,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var filtered = FilterEmails(state, userEmail, classification, query);
            var sorted = SortEmails(filtered, sortBy, sortDir).ToList();
            var offset = ParseOffset(pageToken);
            var page = sorted.Skip(offset).Take(maxResults).Select(CloneEmail).ToList();
            var nextOffset = offset + page.Count;
            var nextPageToken = nextOffset < sorted.Count ? nextOffset.ToString() : null;
            return (page, nextPageToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<DevelopmentDemoEmail?> GetEmailAsync(string userEmail, string messageId, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var email = state.Emails.FirstOrDefault(x => MatchesUser(x, userEmail) && x.MessageId == messageId);
            return email == null ? null : CloneEmail(email);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<DevelopmentDemoEmailSummary> GetSummaryAsync(string userEmail, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var emails = state.Emails.Where(x => MatchesUser(x, userEmail)).ToList();
            return new DevelopmentDemoEmailSummary
            {
                TotalCount = emails.Count,
                UnreadCount = emails.Count(x => !x.IsRead),
                ClassificationSummary = BuildClassificationSummary(emails)
            };
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyList<object>> GetClassificationSummaryAsync(string userEmail, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            return BuildClassificationSummary(state.Emails.Where(x => MatchesUser(x, userEmail)).ToList());
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<bool> UpdateClassificationAsync(string userEmail, string messageId, string classification, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var email = state.Emails.FirstOrDefault(x => MatchesUser(x, userEmail) && x.MessageId == messageId);
            if (email == null)
            {
                return false;
            }

            email.Classification = classification;
            await SaveStateAsync(state, cancellationToken);
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<DevelopmentDemoEmail> CreateSentEmailAsync(string userEmail, IReadOnlyCollection<string> recipients, string subject, string body, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var email = BuildOutgoingEmail(userEmail, recipients, subject, body, null, false);
            state.Emails.Add(email);
            await SaveStateAsync(state, cancellationToken);
            return CloneEmail(email);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<DevelopmentDemoEmail?> CreateForwardEmailAsync(string userEmail, string sourceMessageId, IReadOnlyCollection<string> recipients, string? note, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var source = state.Emails.FirstOrDefault(x => MatchesUser(x, userEmail) && x.MessageId == sourceMessageId);
            if (source == null)
            {
                return null;
            }

            var subject = source.Subject.StartsWith("Fwd:", StringComparison.OrdinalIgnoreCase)
                ? source.Subject
                : $"Fwd: {source.Subject}";
            var body = BuildForwardBody(source, note);
            var email = BuildOutgoingEmail(userEmail, recipients, subject, body, source.ThreadId, true);
            state.Emails.Add(email);
            await SaveStateAsync(state, cancellationToken);
            return CloneEmail(email);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<BulkEmailJob> CreateBulkSendJobAsync(string userEmail, BulkEmailRequest request, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var recipients = request.Recipients
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var now = DateTime.UtcNow;
            var job = new BulkEmailJob
            {
                UserEmail = userEmail,
                Recipients = recipients,
                Subject = request.Subject,
                Body = request.Body,
                DelaySeconds = Math.Max(1, request.DelaySeconds),
                Status = BulkEmailJobStatus.Completed,
                ProcessedCount = recipients.Count,
                SuccessCount = recipients.Count,
                FailureCount = 0,
                StartedAtUtc = now,
                CompletedAtUtc = now
            };

            var createdEmails = recipients.Select((recipient, index) =>
                BuildOutgoingEmail(userEmail, new[] { recipient }, request.Subject, request.Body, null, false, now.AddSeconds(index))).ToList();

            state.Emails.AddRange(createdEmails);
            state.BulkJobs.RemoveAll(x => x.JobId == job.JobId);
            state.BulkJobs.Add(job);
            await SaveStateAsync(state, cancellationToken);
            return job;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<BulkEmailJob?> GetBulkSendJobAsync(string userEmail, string jobId, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var state = await LoadSeededStateAsync(userEmail, cancellationToken);
            var job = state.BulkJobs.FirstOrDefault(x => x.JobId == jobId && string.Equals(x.UserEmail, userEmail, StringComparison.OrdinalIgnoreCase));
            return job == null ? null : CloneJob(job);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<DevelopmentDemoStoreState> LoadSeededStateAsync(string userEmail, CancellationToken cancellationToken)
    {
        var state = await LoadStateAsync(cancellationToken);
        if (state.Emails.Any(x => MatchesUser(x, userEmail)))
        {
            return state;
        }

        state.Emails.AddRange(BuildSeedEmails(userEmail));
        await SaveStateAsync(state, cancellationToken);
        return state;
    }

    private async Task<DevelopmentDemoStoreState> LoadStateAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_storePath))
        {
            return new DevelopmentDemoStoreState();
        }

        try
        {
            await using var stream = File.OpenRead(_storePath);
            var state = await JsonSerializer.DeserializeAsync<DevelopmentDemoStoreState>(stream, JsonOptions, cancellationToken);
            return state ?? new DevelopmentDemoStoreState();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load development demo inbox store. Recreating it.");
            return new DevelopmentDemoStoreState();
        }
    }

    private async Task SaveStateAsync(DevelopmentDemoStoreState state, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(_storePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(_storePath);
        await JsonSerializer.SerializeAsync(stream, state, JsonOptions, cancellationToken);
    }

    private static IEnumerable<DevelopmentDemoEmail> FilterEmails(DevelopmentDemoStoreState state, string userEmail, string? classification, string? query)
    {
        var emails = state.Emails.Where(x => MatchesUser(x, userEmail));

        if (!string.IsNullOrWhiteSpace(classification) && !classification.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            emails = emails.Where(x => string.Equals(x.Classification, classification.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            emails = emails.Where(x =>
                x.Subject.Contains(term, StringComparison.OrdinalIgnoreCase)
                || x.From.Contains(term, StringComparison.OrdinalIgnoreCase)
                || x.Snippet.Contains(term, StringComparison.OrdinalIgnoreCase)
                || x.Body.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        return emails;
    }

    private static IEnumerable<DevelopmentDemoEmail> SortEmails(IEnumerable<DevelopmentDemoEmail> emails, string? sortBy, string? sortDir)
    {
        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        return (sortBy ?? "date").Trim().ToLowerInvariant() switch
        {
            "classification" => descending
                ? emails.OrderByDescending(x => x.Classification).ThenByDescending(x => x.ReceivedAtUtc)
                : emails.OrderBy(x => x.Classification).ThenBy(x => x.ReceivedAtUtc),
            "from" => descending
                ? emails.OrderByDescending(x => x.From).ThenByDescending(x => x.ReceivedAtUtc)
                : emails.OrderBy(x => x.From).ThenBy(x => x.ReceivedAtUtc),
            "subject" => descending
                ? emails.OrderByDescending(x => x.Subject).ThenByDescending(x => x.ReceivedAtUtc)
                : emails.OrderBy(x => x.Subject).ThenBy(x => x.ReceivedAtUtc),
            _ => descending
                ? emails.OrderByDescending(x => x.ReceivedAtUtc)
                : emails.OrderBy(x => x.ReceivedAtUtc)
        };
    }

    private static DevelopmentDemoEmail BuildOutgoingEmail(
        string userEmail,
        IReadOnlyCollection<string> recipients,
        string subject,
        string body,
        string? threadId,
        bool isForward,
        DateTime? receivedAtUtc = null)
    {
        var normalizedRecipients = recipients.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
        return new DevelopmentDemoEmail
        {
            UserEmail = userEmail,
            MessageId = $"msg_demo_{Guid.NewGuid():N}",
            ThreadId = string.IsNullOrWhiteSpace(threadId) ? $"thread_demo_{Guid.NewGuid():N}" : threadId,
            Subject = string.IsNullOrWhiteSpace(subject) ? "(No Subject)" : subject,
            From = "MA Business CRM <dev@localhost>",
            To = string.Join(", ", normalizedRecipients),
            Body = body,
            Snippet = BuildSnippet(body),
            IsRead = true,
            IsImportant = false,
            Classification = isForward ? "Follow Up" : "None",
            ReceivedAtUtc = receivedAtUtc ?? DateTime.UtcNow
        };
    }

    private static string BuildForwardBody(DevelopmentDemoEmail source, string? note)
    {
        var noteHtml = string.IsNullOrWhiteSpace(note)
            ? string.Empty
            : $"<p>{WebUtility.HtmlEncode(note).Replace("\n", "<br />")}</p>";
        var sourceBody = ContainsHtml(source.Body)
            ? source.Body
            : $"<pre style=\"white-space:pre-wrap;\">{WebUtility.HtmlEncode(source.Body)}</pre>";
        return $"{noteHtml}<hr style=\"margin:16px 0;border:none;border-top:1px solid #d1d5db;\" /><div style=\"font-size:12px;color:#6b7280;\"><div><strong>From:</strong> {WebUtility.HtmlEncode(source.From)}</div><div><strong>To:</strong> {WebUtility.HtmlEncode(source.To)}</div><div><strong>Subject:</strong> {WebUtility.HtmlEncode(source.Subject)}</div></div><div style=\"margin-top:12px;\">{sourceBody}</div>";
    }

    private static IReadOnlyList<object> BuildClassificationSummary(IEnumerable<DevelopmentDemoEmail> emails)
        => emails
            .GroupBy(x => x.Classification)
            .OrderBy(x => x.Key)
            .Select(x => (object)new { classification = x.Key, count = x.Count() })
            .ToList();

    private static DevelopmentDemoEmail CloneEmail(DevelopmentDemoEmail email)
        => new()
        {
            UserEmail = email.UserEmail,
            MessageId = email.MessageId,
            ThreadId = email.ThreadId,
            Subject = email.Subject,
            From = email.From,
            To = email.To,
            Body = email.Body,
            Snippet = email.Snippet,
            IsRead = email.IsRead,
            IsImportant = email.IsImportant,
            Classification = email.Classification,
            ReceivedAtUtc = email.ReceivedAtUtc
        };

    private static BulkEmailJob CloneJob(BulkEmailJob job)
        => new()
        {
            JobId = job.JobId,
            UserEmail = job.UserEmail,
            Recipients = new List<string>(job.Recipients),
            Subject = job.Subject,
            Body = job.Body,
            DelaySeconds = job.DelaySeconds,
            ProcessedCount = job.ProcessedCount,
            SuccessCount = job.SuccessCount,
            FailureCount = job.FailureCount,
            Status = job.Status,
            Error = job.Error,
            CreatedAtUtc = job.CreatedAtUtc,
            StartedAtUtc = job.StartedAtUtc,
            CompletedAtUtc = job.CompletedAtUtc
        };

    private static bool MatchesUser(DevelopmentDemoEmail email, string userEmail)
        => string.Equals(email.UserEmail, userEmail, StringComparison.OrdinalIgnoreCase);

    private static int ParseOffset(string? pageToken)
        => int.TryParse(pageToken, out var offset) && offset >= 0 ? offset : 0;

    private static string BuildSnippet(string body)
    {
        var text = WebUtility.HtmlDecode(HtmlTagRegex.Replace(body, " "))
            .Replace("\r", " ")
            .Replace("\n", " ")
            .Trim();
        return text.Length <= 160 ? text : text[..157].TrimEnd() + "...";
    }

    private static bool ContainsHtml(string value) => value.Contains('<') && value.Contains('>');

    private static List<DevelopmentDemoEmail> BuildSeedEmails(string userEmail)
    {
        var now = DateTime.UtcNow;
        return new List<DevelopmentDemoEmail>
        {
            CreateSeedEmail(userEmail, "msg_demo_001", "thread_demo_001", "John Mercer <john.mercer@acme-industries.com>", "dev@localhost", "Following up on the multi-region rollout timeline and the API ownership split for next quarter", "<p>Hi team,</p><p>I pulled together the rollout blockers, owners, and a revised delivery window. Could we review the API ownership split before Friday?</p><table style=\"width:100%;border-collapse:collapse;\"><tr><th align=\"left\">Workstream</th><th align=\"left\">Owner</th></tr><tr><td>CRM import</td><td>Operations</td></tr><tr><td>Gmail handoff</td><td>Product</td></tr></table>", false, true, "Lead", now.AddHours(-2)),
            CreateSeedEmail(userEmail, "msg_demo_002", "thread_demo_001", "John Mercer <john.mercer@acme-industries.com>", "dev@localhost", "Re: Following up on the multi-region rollout timeline and the API ownership split for next quarter", "Just adding the legal review timeline here as well. We can probably keep the pilot launch if procurement signs off by Tuesday.", true, false, "Follow Up", now.AddHours(-1)),
            CreateSeedEmail(userEmail, "msg_demo_003", "thread_demo_002", "Sophia Nguyen <sophia@northstarcapital.io>", "dev@localhost", "Intro deck for the investor briefing", "<p>Hello,</p><p>Attached is the polished investor deck. The section on revenue expansion now includes the churn assumptions you asked for.</p><p><a href=\"https://example.com/deck\">Open presentation</a></p>", false, false, "Potential Client", now.AddHours(-5)),
            CreateSeedEmail(userEmail, "msg_demo_004", "thread_demo_003", "support@contoso.com", "dev@localhost", "", "We noticed you have not verified the secondary sender domain. Once it is verified, SPF and DKIM checks will pass automatically.", true, false, "None", now.AddDays(-1)),
            CreateSeedEmail(userEmail, "msg_demo_005", "thread_demo_004", "\"Avery Stone\" <avery.stone@blueharbor.dev>", "dev@localhost", "Need a refreshed pricing proposal before tomorrow", "<p>Could you send an updated pricing table with the annual discount included?</p><ul><li>Three seats</li><li>Email automation</li><li>Managed onboarding</li></ul>", false, true, "Lead", now.AddDays(-1).AddHours(-3)),
            CreateSeedEmail(userEmail, "msg_demo_006", "thread_demo_005", "events@communitybuilders.org", "dev@localhost", "Invitation: regional founders breakfast", "Plain-text invite with venue details, parking notes, and a short agenda for the breakfast meetup next Wednesday.", true, false, "Not Relevant", now.AddDays(-2)),
            CreateSeedEmail(userEmail, "msg_demo_007", "thread_demo_006", "finance@elmstreet.co", "dev@localhost", "Quarterly renewal approved", "<p>Your renewal is approved.</p><p>We will countersign the paperwork today and wire the remaining balance tomorrow morning.</p>", false, false, "Client", now.AddDays(-2).AddHours(-6)),
            CreateSeedEmail(userEmail, "msg_demo_008", "thread_demo_007", "marina@riverpointstudio.com", "dev@localhost", "Design handoff for campaign landing page", "Sharing the landing page handoff. Please check the mobile spacing around the hero, the testimonial grid, and the footer CTA. Assets are in the shared drive.", true, false, "Follow Up", now.AddDays(-3)),
            CreateSeedEmail(userEmail, "msg_demo_009", "thread_demo_008", "newsletter@dailyops.io", "dev@localhost", "Daily Ops Digest: five shortcuts for pipeline cleanup", "<p>This week's digest covers pipeline cleanup, unsubscribe handling, and email health checks.</p>", true, false, "Not Relevant", now.AddDays(-4)),
            CreateSeedEmail(userEmail, "msg_demo_010", "thread_demo_009", "ops@silverlinehealth.com", "dev@localhost", "Warm handoff from customer success", "<p>We think your team would be a strong fit for our outreach automation package.</p><p>Happy to arrange a technical deep dive this week.</p>", false, false, "Potential Client", now.AddDays(-4).AddHours(-4)),
            CreateSeedEmail(userEmail, "msg_demo_011", "thread_demo_010", "leah@oakandpine.consulting", "dev@localhost", "Contract signed and kickoff confirmed", "<p>Great news: the contract is signed and kickoff is confirmed for Monday.</p><p>I've also included a checklist for the implementation workshop.</p>", false, true, "Client", now.AddDays(-5)),
            CreateSeedEmail(userEmail, "msg_demo_012", "thread_demo_011", "noreply@crmvendor.com", "dev@localhost", "System maintenance notification", "Scheduled maintenance window this Saturday from 01:00 to 03:00 UTC. No action required.", true, false, "None", now.AddDays(-5).AddHours(-2)),
            CreateSeedEmail(userEmail, "msg_demo_013", "thread_demo_012", "founders@brightlaunch.ai", "dev@localhost", "Could your team support white-label outreach for our spring launch campaign across multiple regions and partner audiences?", "<p>We are considering a white-label outreach program and need support for partner segmentation, reply handling, and reporting.</p>", false, false, "Lead", now.AddDays(-6)),
            CreateSeedEmail(userEmail, "msg_demo_014", "thread_demo_013", "alexis@meridianventures.com", "dev@localhost", "Revisiting the proposal from January", "I've looped back internally and want to revisit the January proposal. Can you resend the scope with onboarding split out as a separate line item?", true, false, "Follow Up", now.AddDays(-7)),
            CreateSeedEmail(userEmail, "msg_demo_015", "thread_demo_014", "dev@somewhere.test", "dev@localhost", "Build pipeline notes", "<p>Build passed on desktop, but mobile overflow still needs review for the inbox detail pane and journey cards.</p>", true, false, "None", now.AddDays(-8)),
            CreateSeedEmail(userEmail, "msg_demo_016", "thread_demo_015", "Camila Reyes <camila@orchidpartners.co>", "dev@localhost", "Proposal feedback with markup", "<p>We liked the proposal overall.</p><blockquote>Could you tighten the scope for the reporting workstream and keep the onboarding team to two sessions?</blockquote>", false, false, "Potential Client", now.AddDays(-10)),
            CreateSeedEmail(userEmail, "msg_demo_017", "thread_demo_016", "legal@westbridgeholdings.com", "dev@localhost", "Requested edits to the MSA", "Attached are the requested edits to the MSA. The indemnity section is unchanged; only the data retention clause was modified.", true, false, "Client", now.AddDays(-12)),
            CreateSeedEmail(userEmail, "msg_demo_018", "thread_demo_017", "samir@atlaslogistics.io", "dev@localhost", "Quick question about CRM ownership rules", "<p>Can a lead automatically inherit the owner from the source list, or does the first manual touch still win?</p>", false, false, "Lead", now.AddDays(-14))
        };
    }

    private static DevelopmentDemoEmail CreateSeedEmail(
        string userEmail,
        string messageId,
        string threadId,
        string from,
        string to,
        string subject,
        string body,
        bool isRead,
        bool isImportant,
        string classification,
        DateTime receivedAtUtc)
        => new()
        {
            UserEmail = userEmail,
            MessageId = messageId,
            ThreadId = threadId,
            Subject = string.IsNullOrWhiteSpace(subject) ? "(No Subject)" : subject,
            From = from,
            To = to,
            Body = body,
            Snippet = BuildSnippet(body),
            IsRead = isRead,
            IsImportant = isImportant,
            Classification = classification,
            ReceivedAtUtc = receivedAtUtc
        };

    private sealed class DevelopmentDemoStoreState
    {
        public List<DevelopmentDemoEmail> Emails { get; set; } = new();
        public List<BulkEmailJob> BulkJobs { get; set; } = new();
    }
}