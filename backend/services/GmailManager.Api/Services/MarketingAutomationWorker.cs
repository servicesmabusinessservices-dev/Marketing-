using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Services;

public class MarketingAutomationWorker : BackgroundService
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly ILogger<MarketingAutomationWorker> _logger;
    private readonly IMarketingDataRepository _marketingDataRepo;
    private readonly IJourneyRepository _journeyRepo;
    private readonly IContactRepository _contactRepo;
    private readonly INotificationRepository _notificationRepo;

    public MarketingAutomationWorker(
        IDbContextFactory<AppDbContext> dbContextFactory,
        ILogger<MarketingAutomationWorker> logger,
        IMarketingDataRepository marketingDataRepo,
        IJourneyRepository journeyRepo,
        IContactRepository contactRepo,
        INotificationRepository notificationRepo)
    {
        _dbContextFactory = dbContextFactory;
        _logger = logger;
        _marketingDataRepo = marketingDataRepo;
        _journeyRepo = journeyRepo;
        _contactRepo = contactRepo;
        _notificationRepo = notificationRepo;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MarketingAutomationWorker started");

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
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown — exit the loop
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Marketing automation worker cycle failed");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("MarketingAutomationWorker stopped");
    }

    private async Task CreateNoReplyEventsAsync(AppDbContext db, DateTime now, CancellationToken cancellationToken)
    {
        var threshold = now.AddHours(-72);

        var proposalEvents = await _marketingDataRepo.GetEventsByTypeBeforeAsync(db, "proposal_sent", threshold, 500);

        foreach (var proposalEvent in proposalEvents)
        {
            var alreadyMarked = await _marketingDataRepo.HasEventBySourceAsync(
                db, proposalEvent.UserEmail, "no_reply_3d", proposalEvent.EventId);

            if (alreadyMarked)
            {
                continue;
            }

            var replied = await _marketingDataRepo.HasContactEventSinceAsync(
                db, proposalEvent.UserEmail, proposalEvent.ContactId, "replied", proposalEvent.OccurredAtUtc);

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

            await _marketingDataRepo.AddEventAsync(db, noReplyEvent);

            await EnrollForTriggerAsync(db, proposalEvent.UserEmail, "no_reply_3d", proposalEvent.ContactId, noReplyEvent.EventId, cancellationToken);
        }
    }

    private async Task ProcessActiveEnrollmentsAsync(AppDbContext db, DateTime now, CancellationToken cancellationToken)
    {
        var enrollments = await _journeyRepo.GetAllActiveEnrollmentsDueAsync(db, now, 300);

        foreach (var enrollment in enrollments)
        {
            var journey = await _journeyRepo.GetByIdAsync(db, enrollment.UserEmail, enrollment.JourneyId);
            if (journey == null || !string.Equals(journey.Status, "Published", StringComparison.OrdinalIgnoreCase))
            {
                enrollment.Status = "Paused";
                enrollment.UpdatedAtUtc = now;
                continue;
            }

            var steps = await _journeyRepo.GetStepsAsync(db, enrollment.JourneyId);

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

                var conditionMet = await _marketingDataRepo.HasContactEventSinceAsync(
                    db, enrollment.UserEmail, enrollment.ContactId,
                    currentStep.ConditionEventType, conditionWindowStart);

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

                // Write notification for journey completion
                await _notificationRepo.AddAsync(db, new NotificationEntity
                {
                    UserEmail = enrollment.UserEmail,
                    Type = "journey_complete",
                    Title = $"Journey completed for contact",
                    Message = $"Journey \"{journey.Name}\" finished for contact {enrollment.ContactId}.",
                    LinkUrl = $"/marketing?tab=journeys",
                });
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
        var contact = await _contactRepo.GetByIdAsync(db, enrollment.UserEmail, enrollment.ContactId);
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

                await _contactRepo.AddLeadStageHistoryAsync(db, new LeadStageHistoryEntity
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
            await _marketingDataRepo.AddEventAsync(db, new MessageEventEntity
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
        var journeys = await _journeyRepo.GetPublishedByTriggerTypeAsync(db, userEmail, triggerType);

        foreach (var journey in journeys)
        {
            var exists = await _journeyRepo.HasActiveEnrollmentAsync(db, userEmail, journey.JourneyId, contactId);

            if (exists)
            {
                continue;
            }

            await _journeyRepo.AddEnrollmentAsync(db, new JourneyEnrollmentEntity
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
