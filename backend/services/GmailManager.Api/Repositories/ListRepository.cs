using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class ListRepository : IListRepository
{
    public async Task<(List<ContactListEntity> lists, int totalCount)> GetListsPagedAsync(
        AppDbContext db, string userEmail, int page, int pageSize)
    {
        var baseQuery = db.ContactLists.Where(x => x.UserEmail == userEmail);
        var totalCount = await baseQuery.CountAsync();
        var lists = await baseQuery.OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (lists, totalCount);
    }

    public Task<ContactListEntity?> GetByIdAsync(AppDbContext db, string userEmail, string listId)
        => db.ContactLists.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.ListId == listId);

    public Task AddAsync(AppDbContext db, ContactListEntity list)
    {
        db.ContactLists.Add(list);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(AppDbContext db, ContactListEntity list)
    {
        db.ContactLists.Remove(list);
        return Task.CompletedTask;
    }

    public async Task<Dictionary<string, int>> GetMemberCountsAsync(AppDbContext db, string userEmail, List<string> listIds)
    {
        return await db.ContactListMembers
            .Where(x => x.UserEmail == userEmail && listIds.Contains(x.ListId))
            .GroupBy(x => x.ListId)
            .Select(g => new { listId = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.listId, x => x.count);
    }

    public Task<List<string>> GetMemberContactIdsAsync(AppDbContext db, string userEmail, string listId)
        => db.ContactListMembers
            .Where(x => x.UserEmail == userEmail && x.ListId == listId)
            .Select(x => x.ContactId).ToListAsync();

    public Task<bool> IsMemberAsync(AppDbContext db, string userEmail, string listId, string contactId)
        => db.ContactListMembers.AnyAsync(x => x.UserEmail == userEmail && x.ListId == listId && x.ContactId == contactId);

    public Task AddMemberAsync(AppDbContext db, ContactListMemberEntity member)
    {
        db.ContactListMembers.Add(member);
        return Task.CompletedTask;
    }

    public async Task RemoveMembersByListIdAsync(AppDbContext db, string userEmail, string listId)
    {
        var members = db.ContactListMembers.Where(x => x.UserEmail == userEmail && x.ListId == listId);
        db.ContactListMembers.RemoveRange(members);
        await Task.CompletedTask;
    }
}
