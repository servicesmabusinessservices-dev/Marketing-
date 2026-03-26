using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface IJourneyRepository
{
    Task<List<JourneyEntity>> GetJourneysAsync(AppDbContext db, string userEmail);
    Task<JourneyEntity?> GetByIdAsync(AppDbContext db, string userEmail, string journeyId);
    Task AddAsync(AppDbContext db, JourneyEntity journey);

    Task<List<JourneyStepEntity>> GetStepsAsync(AppDbContext db, string journeyId);
    Task<int> GetStepsCountAsync(AppDbContext db, string journeyId);
    Task<Dictionary<string, int>> GetStepsCountByJourneyIdsAsync(AppDbContext db, List<string> journeyIds);
    Task ReplaceStepsAsync(AppDbContext db, string journeyId, List<JourneyStepEntity> newSteps);

    Task<List<JourneyEnrollmentEntity>> GetEnrollmentsAsync(AppDbContext db, string userEmail);
    Task<List<JourneyEnrollmentEntity>> GetEnrollmentsByContactIdsAsync(AppDbContext db, string userEmail, HashSet<string> contactIds);
    Task<bool> HasActiveEnrollmentAsync(AppDbContext db, string userEmail, string journeyId, string contactId);
    Task AddEnrollmentAsync(AppDbContext db, JourneyEnrollmentEntity enrollment);

    Task<List<JourneyEntity>> GetPublishedByTriggerTypeAsync(AppDbContext db, string userEmail, string triggerType);

    // Worker-specific
    Task<List<JourneyEnrollmentEntity>> GetActiveEnrollmentsDueAsync(AppDbContext db, string userEmail);
    Task<List<JourneyEnrollmentEntity>> GetAllActiveEnrollmentsDueAsync(AppDbContext db, DateTime now, int limit);
}
