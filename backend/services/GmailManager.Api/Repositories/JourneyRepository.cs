using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class JourneyRepository : IJourneyRepository
{
    public Task<List<JourneyEntity>> GetJourneysAsync(AppDbContext db, string userEmail)
        => db.Journeys.Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.UpdatedAtUtc).ToListAsync();

    public Task<JourneyEntity?> GetByIdAsync(AppDbContext db, string userEmail, string journeyId)
        => db.Journeys.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.JourneyId == journeyId);

    public Task AddAsync(AppDbContext db, JourneyEntity journey)
    {
        db.Journeys.Add(journey);
        return Task.CompletedTask;
    }

    public Task<List<JourneyStepEntity>> GetStepsAsync(AppDbContext db, string journeyId)
        => db.JourneySteps.Where(x => x.JourneyId == journeyId)
            .OrderBy(x => x.StepOrder).ToListAsync();

    public Task<int> GetStepsCountAsync(AppDbContext db, string journeyId)
        => db.JourneySteps.CountAsync(x => x.JourneyId == journeyId);

    public async Task<Dictionary<string, int>> GetStepsCountByJourneyIdsAsync(AppDbContext db, List<string> journeyIds)
    {
        return await db.JourneySteps
            .Where(x => journeyIds.Contains(x.JourneyId))
            .GroupBy(x => x.JourneyId)
            .Select(g => new { journeyId = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.journeyId, x => x.count);
    }

    public async Task ReplaceStepsAsync(AppDbContext db, string journeyId, List<JourneyStepEntity> newSteps)
    {
        var existing = await db.JourneySteps.Where(x => x.JourneyId == journeyId).ToListAsync();
        db.JourneySteps.RemoveRange(existing);
        db.JourneySteps.AddRange(newSteps);
    }

    public Task<List<JourneyEnrollmentEntity>> GetEnrollmentsAsync(AppDbContext db, string userEmail)
        => db.JourneyEnrollments.Where(x => x.UserEmail == userEmail).ToListAsync();

    public Task<List<JourneyEnrollmentEntity>> GetEnrollmentsByContactIdsAsync(
        AppDbContext db, string userEmail, HashSet<string> contactIds)
        => db.JourneyEnrollments
            .Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId))
            .ToListAsync();

    public Task<bool> HasActiveEnrollmentAsync(AppDbContext db, string userEmail, string journeyId, string contactId)
        => db.JourneyEnrollments.AnyAsync(x =>
            x.UserEmail == userEmail && x.JourneyId == journeyId
            && x.ContactId == contactId && x.Status == "Active");

    public Task AddEnrollmentAsync(AppDbContext db, JourneyEnrollmentEntity enrollment)
    {
        db.JourneyEnrollments.Add(enrollment);
        return Task.CompletedTask;
    }

    public Task<List<JourneyEntity>> GetPublishedByTriggerTypeAsync(AppDbContext db, string userEmail, string triggerType)
        => db.Journeys.Where(x => x.UserEmail == userEmail && x.Status == "Published" && x.TriggerType == triggerType)
            .ToListAsync();

    public Task<List<JourneyEnrollmentEntity>> GetActiveEnrollmentsDueAsync(AppDbContext db, string userEmail)
        => db.JourneyEnrollments
            .Where(x => x.UserEmail == userEmail && x.Status == "Active" && x.NextRunAtUtc <= DateTime.UtcNow)
            .ToListAsync();

    public Task<List<JourneyEnrollmentEntity>> GetAllActiveEnrollmentsDueAsync(AppDbContext db, DateTime now, int limit)
        => db.JourneyEnrollments
            .Where(x => x.Status == "Active" && (x.NextRunAtUtc == null || x.NextRunAtUtc <= now))
            .OrderBy(x => x.NextRunAtUtc)
            .Take(limit)
            .ToListAsync();
}
