using GmailManager.Api.Data;
using GmailManager.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Services;

public class MarketingAutomationWorker : BackgroundService
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly ILogger<MarketingAutomationWorker> _logger;

    public MarketingAutomationWorker(
        IDbContextFactory<AppDbContext> dbContextFactory,
        ILogger<MarketingAutomationWorker> logger)
    {
        _dbContextFactory = dbContextFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var db = await _dbContextFactory.CreateDbContextAsync(stoppingToken);
                var now = DateTime.UtcNow;

                await CreateNoReplyEventsAsync(db, now, stoppingToken);
                await ProcessActiveEnrollmentsAsync(db, now, stoppingToken);

                await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Marketing automation worker cycle failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task CreateNoReplyEventsAsync(AppDbContext db, DateTime now, CancellationToken cancellationToken)
    {
        var threshold = now.AddHours(-72);

        var proposalEvents = await db.MessageEvents
            .Where(x => x.EventType == "proposal_sent" && x.OccurredAtUtc <= threshold)
            .OrderBy(x => x.OccurredAtUtc)
            .Take(500)
            .ToListAsync(cancellationToken);

        foreach (var proposalEvent in proposalEvents)
        {
            var alreadyMarked = await db.MessageEvents.AnyAsync(x =>
                    x.UserEmail == proposalEvent.UserEmail
                    && x.EventType == "no_reply_3d"
                    && x.SourceEventId == proposalEvent.EventId,
                cancellationToken);

            if (alreadyMarked)
            {
                continue;
            }

            var replied = await db.MessageEvents.AnyAsync(x =>
                    x.UserEmail == proposalEvent.UserEmail
                    && x.ContactId == proposalEvent.ContactId
                    && x.EventType == "replied"
                    && x.OccurredAtUtc >= proposalEvent.OccurredAtUtc,
                cancellationToken);

            if (replied)
            {
                continue;
            }

            var noReplyEvent = new MessageEventEntity
            {
                UserEmail = proposalEvent.UserEmail,
                EventType = "no_reply_3d",
                ContactId = proposalEvent.ContactId,
                CampaignId = proposalEvent.CampaignId,
                JourneyId = proposalEvent.JourneyId,
                MessageId = proposalEvent.MessageId,
                SourceEventId = proposalEvent.EventId,
                OccurredAtUtc = now,
                CreatedAtUtc = now
            };

            db.MessageEvents.Add(noReplyEvent);

            await EnrollForTriggerAsync(db, proposalEvent.UserEmail, "no_reply_3d", proposalEvent.ContactId, noReplyEvent.EventId, cancellationToken);
        }
    }

    private async Task ProcessActiveEnrollmentsAsync(AppDbContext db, DateTime now, CancellationToken cancellationToken)
    {
        var enrollments = await db.JourneyEnrollments
            .Where(x => x.Status == "Active" && (x.NextRunAtUtc == null || x.NextRunAtUtc <= now))
            .OrderBy(x => x.NextRunAtUtc)
            .Take(300)
            .ToListAsync(cancellationToken);

        foreach (var enrollment in enrollments)
        {
            var journey = await db.Journeys.FirstOrDefaultAsync(x => x.JourneyId == enrollment.JourneyId && x.UserEmail == enrollment.UserEmail, cancellationToken);
            if (journey == null || !string.Equals(journey.Status, "Published", StringComparison.OrdinalIgnoreCase))
            {
                enrollment.Status = "Paused";
                enrollment.UpdatedAtUtc = now;
                continue;
            }

            var steps = await db.JourneySteps
                .Where(x => x.JourneyId == enrollment.JourneyId)
                .OrderBy(x => x.StepOrder)
                .ToListAsync(cancellationToken);

            var currentStep = steps.FirstOrDefault(x => x.StepOrder > enrollment.LastProcessedStepOrder);
            if (currentStep == null)
            {
                enrollment.Status = "Completed";
                enrollment.NextRunAtUtc = null;
                enrollment.UpdatedAtUtc = now;
                continue;
            }

            if (!string.IsNullOrWhiteSpace(currentStep.ConditionEventType))
            {
                var hours = Math.Clamp(currentStep.ConditionWindowHours ?? 72, 1, 720);
                var conditionWindowStart = now.AddHours(-hours);

                var conditionMet = await db.MessageEvents.AnyAsync(x =>
                        x.UserEmail == enrollment.UserEmail
                        && x.ContactId == enrollment.ContactId
                        && x.EventType == currentStep.ConditionEventType
                        && x.OccurredAtUtc >= conditionWindowStart,
                    cancellationToken);

                if (!conditionMet)
                {
                    enrollment.NextRunAtUtc = now.AddMinutes(15);
                    enrollment.UpdatedAtUtc = now;
                    continue;
                }
            }

            await ExecuteStepAsync(db, enrollment, currentStep, now, cancellationToken);

            enrollment.LastProcessedStepOrder = currentStep.StepOrder;
            enrollment.UpdatedAtUtc = now;

            var nextStep = steps.FirstOrDefault(x => x.StepOrder > currentStep.StepOrder);
            if (nextStep == null)
            {
                enrollment.Status = "Completed";
                enrollment.NextRunAtUtc = null;
            }
            else
            {
                enrollment.NextRunAtUtc = now.AddMinutes(Math.Max(nextStep.DelayMinutes, 1));
            }
        }
    }

    private async Task ExecuteStepAsync(
        AppDbContext db,
        JourneyEnrollmentEntity enrollment,
        JourneyStepEntity step,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == enrollment.UserEmail && x.ContactId == enrollment.ContactId, cancellationToken);
        if (contact == null)
        {
            enrollment.Status = "Failed";
            return;
        }

        if (string.Equals(step.StepType, "advance_stage", StringComparison.OrdinalIgnoreCase)
            || string.Equals(step.StepType, "mark_client", StringComparison.OrdinalIgnoreCase))
        {
            var targetStage = string.Equals(step.StepType, "mark_client", StringComparison.OrdinalIgnoreCase)
                ? "Won"
                : step.ToLeadStage;

            if (!string.IsNullOrWhiteSpace(targetStage)
                && !string.Equals(contact.LeadStage ?? string.Empty, targetStage, StringComparison.OrdinalIgnoreCase))
            {
                var from = contact.LeadStage;
                contact.LeadStage = targetStage;
                contact.UpdatedAtUtc = now;

                db.LeadStageHistory.Add(new LeadStageHistoryEntity
                {
                    UserEmail = enrollment.UserEmail,
                    ContactId = contact.ContactId,
                    FromStage = from,
                    ToStage = targetStage,
                    Reason = "Automation step",
                    EventType = step.ConditionEventType,
                    EventId = enrollment.TriggerEventId,
                    CreatedAtUtc = now
                });
            }
        }

        if (string.Equals(step.StepType, "emit_event", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(step.ConditionEventType))
        {
            db.MessageEvents.Add(new MessageEventEntity
            {
                UserEmail = enrollment.UserEmail,
                ContactId = enrollment.ContactId,
                EventType = step.ConditionEventType,
                JourneyId = enrollment.JourneyId,
                SourceEventId = enrollment.TriggerEventId,
                MetadataJson = "{}",
                OccurredAtUtc = now,
                CreatedAtUtc = now
            });
        }
    }

    private async Task EnrollForTriggerAsync(
        AppDbContext db,
        string userEmail,
        string triggerType,
        string contactId,
        string eventId,
        CancellationToken cancellationToken)
    {
        var journeys = await db.Journeys
            .Where(x => x.UserEmail == userEmail && x.Status == "Published" && x.TriggerType == triggerType)
            .ToListAsync(cancellationToken);

        foreach (var journey in journeys)
        {
            var exists = await db.JourneyEnrollments.AnyAsync(x =>
                x.UserEmail == userEmail
                && x.JourneyId == journey.JourneyId
                && x.ContactId == contactId
                && x.Status == "Active", cancellationToken);

            if (exists)
            {
                continue;
            }

            db.JourneyEnrollments.Add(new JourneyEnrollmentEntity
            {
                UserEmail = userEmail,
                JourneyId = journey.JourneyId,
                ContactId = contactId,
                Status = "Active",
                TriggerEventId = eventId,
                LastProcessedStepOrder = 0,
                NextRunAtUtc = DateTime.UtcNow,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
    }
}
