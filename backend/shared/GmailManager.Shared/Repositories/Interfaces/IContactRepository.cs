using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface IContactRepository
{
    Task<(List<ContactEntity> contacts, int totalCount)> GetContactsAsync(
        AppDbContext db, string userEmail, string? searchTerm, string? tag,
        string? leadStage, string? ownerEmail, int page, int pageSize);

    Task<ContactEntity?> GetByIdAsync(AppDbContext db, string userEmail, string contactId);
    Task<ContactEntity?> GetByNormalizedEmailAsync(AppDbContext db, string userEmail, string normalizedEmail);
    Task<bool> ExistsAsync(AppDbContext db, string userEmail, string contactId);
    Task AddAsync(AppDbContext db, ContactEntity contact);

    Task<List<ContactEntity>> GetContactsByIdsAsync(AppDbContext db, string userEmail, List<string> contactIds);
    Task<List<ContactEntity>> GetContactsForPipelineAsync(
        AppDbContext db, string userEmail, string? ownerEmail, string? search, string? normalizedStage, int pageSize);
    Task<List<ContactEntity>> GetContactsForExportAsync(
        AppDbContext db, string userEmail, string? search, string? normalizedLeadStage, string? ownerEmail, int maxRows);

    Task<List<CrmNoteEntity>> GetNotesAsync(AppDbContext db, string userEmail, string contactId);
    Task AddNoteAsync(AppDbContext db, CrmNoteEntity note);

    Task<(List<CrmTaskEntity> tasks, int totalCount)> GetTasksPagedAsync(
        AppDbContext db, string userEmail, string? contactId, string? ownerEmail,
        string? status, string? due, int page, int pageSize);
    Task<CrmTaskEntity?> GetTaskByIdAsync(AppDbContext db, string userEmail, string contactId, string taskId);
    Task AddTaskAsync(AppDbContext db, CrmTaskEntity task);

    Task<List<LeadStageHistoryEntity>> GetLeadStageHistoryAsync(AppDbContext db, string userEmail, string contactId);
    Task AddLeadStageHistoryAsync(AppDbContext db, LeadStageHistoryEntity history);

    // Analytics / search
    Task<List<ContactEntity>> GetAllAsync(AppDbContext db, string userEmail, string? ownerEmail = null);
    Task<List<CrmTaskEntity>> GetTasksByContactIdsAsync(AppDbContext db, string userEmail, HashSet<string> contactIds);
    Task<List<ContactEntity>> SearchAsync(AppDbContext db, string userEmail, string term, int limit);
}
