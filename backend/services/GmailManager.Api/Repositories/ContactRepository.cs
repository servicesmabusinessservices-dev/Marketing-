using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GmailManager.Api.Repositories;

public class ContactRepository : IContactRepository
{
    public async Task<(List<ContactEntity> contacts, int totalCount)> GetContactsAsync(
        AppDbContext db, string userEmail, string? searchTerm, string? tag,
        string? leadStage, string? ownerEmail, int page, int pageSize)
    {
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(x => x.EmailNormalized.Contains(term)
                                     || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                                     || (x.LastName ?? string.Empty).ToLower().Contains(term)
                                     || (x.Company ?? string.Empty).ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(leadStage))
            query = query.Where(x => x.LeadStage == leadStage);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == ownerEmail);

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var normalizedTag = tag.Trim();
            var allCandidates = await query.OrderByDescending(x => x.UpdatedAtUtc).ToListAsync();
            var filtered = allCandidates.Where(x =>
            {
                var tags = JsonSerializer.Deserialize<List<string>>(x.TagsJson) ?? new List<string>();
                return tags.Any(t => string.Equals(t, normalizedTag, StringComparison.OrdinalIgnoreCase));
            }).ToList();

            var totalCount = filtered.Count;
            var contacts = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return (contacts, totalCount);
        }

        var count = await query.CountAsync();
        var results = await query.OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (results, count);
    }

    public Task<ContactEntity?> GetByIdAsync(AppDbContext db, string userEmail, string contactId)
        => db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);

    public Task<ContactEntity?> GetByNormalizedEmailAsync(AppDbContext db, string userEmail, string normalizedEmail)
        => db.Contacts.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.EmailNormalized == normalizedEmail);

    public Task<bool> ExistsAsync(AppDbContext db, string userEmail, string contactId)
        => db.Contacts.AnyAsync(x => x.UserEmail == userEmail && x.ContactId == contactId);

    public Task AddAsync(AppDbContext db, ContactEntity contact)
    {
        db.Contacts.Add(contact);
        return Task.CompletedTask;
    }

    public Task<List<ContactEntity>> GetContactsByIdsAsync(AppDbContext db, string userEmail, List<string> contactIds)
        => db.Contacts.Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId)).ToListAsync();

    public async Task<List<ContactEntity>> GetContactsForPipelineAsync(
        AppDbContext db, string userEmail, string? ownerEmail, string? search, string? normalizedStage, int pageSize)
    {
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == ownerEmail);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.EmailNormalized.Contains(term)
                || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                || (x.LastName ?? string.Empty).ToLower().Contains(term)
                || (x.Company ?? string.Empty).ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(normalizedStage))
            query = query.Where(x => x.LeadStage == normalizedStage);

        return await query.OrderByDescending(x => x.UpdatedAtUtc).Take(pageSize).ToListAsync();
    }

    public async Task<List<ContactEntity>> GetContactsForExportAsync(
        AppDbContext db, string userEmail, string? search, string? normalizedLeadStage, string? ownerEmail, int maxRows)
    {
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.EmailNormalized.Contains(term)
                || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                || (x.LastName ?? string.Empty).ToLower().Contains(term)
                || (x.Company ?? string.Empty).ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(normalizedLeadStage))
            query = query.Where(x => x.LeadStage == normalizedLeadStage);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == ownerEmail);

        return await query.OrderByDescending(x => x.UpdatedAtUtc).Take(maxRows).ToListAsync();
    }

    // Notes
    public Task<List<CrmNoteEntity>> GetNotesAsync(AppDbContext db, string userEmail, string contactId)
        => db.CrmNotes.Where(x => x.UserEmail == userEmail && x.ContactId == contactId)
            .OrderByDescending(x => x.CreatedAtUtc).ToListAsync();

    public Task AddNoteAsync(AppDbContext db, CrmNoteEntity note)
    {
        db.CrmNotes.Add(note);
        return Task.CompletedTask;
    }

    // Tasks
    public async Task<(List<CrmTaskEntity> tasks, int totalCount)> GetTasksPagedAsync(
        AppDbContext db, string userEmail, string? contactId, string? ownerEmail,
        string? status, string? due, int page, int pageSize)
    {
        var query = db.CrmTasks.Where(x => x.UserEmail == userEmail);

        if (!string.IsNullOrWhiteSpace(contactId))
            query = query.Where(x => x.ContactId == contactId);

        if (!string.IsNullOrWhiteSpace(ownerEmail))
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == ownerEmail);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => (x.Status ?? string.Empty).ToLower() == status.Trim().ToLowerInvariant());

        var normalizedDue = (due ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedDue == "overdue") query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc < DateTime.UtcNow);
        else if (normalizedDue == "upcoming") query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc >= DateTime.UtcNow);
        else if (normalizedDue == "today")
        {
            var todayStart = DateTime.UtcNow.Date;
            query = query.Where(x => x.DueAtUtc != null && x.DueAtUtc >= todayStart && x.DueAtUtc < todayStart.AddDays(1));
        }
        else if (normalizedDue == "none") query = query.Where(x => x.DueAtUtc == null);

        var totalCount = await query.CountAsync();
        var tasks = await query.OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (tasks, totalCount);
    }

    public Task<CrmTaskEntity?> GetTaskByIdAsync(AppDbContext db, string userEmail, string contactId, string taskId)
        => db.CrmTasks.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ContactId == contactId && x.TaskId == taskId);

    public Task AddTaskAsync(AppDbContext db, CrmTaskEntity task)
    {
        db.CrmTasks.Add(task);
        return Task.CompletedTask;
    }

    // Lead Stage History
    public Task<List<LeadStageHistoryEntity>> GetLeadStageHistoryAsync(AppDbContext db, string userEmail, string contactId)
        => db.LeadStageHistory.Where(x => x.UserEmail == userEmail && x.ContactId == contactId)
            .OrderByDescending(x => x.CreatedAtUtc).ToListAsync();

    public Task AddLeadStageHistoryAsync(AppDbContext db, LeadStageHistoryEntity history)
    {
        db.LeadStageHistory.Add(history);
        return Task.CompletedTask;
    }

    // Analytics / search
    public async Task<List<ContactEntity>> GetAllAsync(AppDbContext db, string userEmail, string? ownerEmail = null)
    {
        var query = db.Contacts.Where(x => x.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(ownerEmail))
            query = query.Where(x => (x.OwnerEmail ?? string.Empty) == ownerEmail);
        return await query.ToListAsync();
    }

    public Task<List<CrmTaskEntity>> GetTasksByContactIdsAsync(AppDbContext db, string userEmail, HashSet<string> contactIds)
        => db.CrmTasks.Where(x => x.UserEmail == userEmail && contactIds.Contains(x.ContactId)).ToListAsync();

    public Task<List<ContactEntity>> SearchAsync(AppDbContext db, string userEmail, string term, int limit)
        => db.Contacts
            .Where(x => x.UserEmail == userEmail &&
                (x.EmailNormalized.Contains(term) || (x.FirstName ?? string.Empty).ToLower().Contains(term)
                 || (x.LastName ?? string.Empty).ToLower().Contains(term) || (x.Company ?? string.Empty).ToLower().Contains(term)))
            .OrderByDescending(x => x.UpdatedAtUtc).Take(limit).ToListAsync();
}
