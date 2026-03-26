using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface IListRepository
{
    Task<(List<ContactListEntity> lists, int totalCount)> GetListsPagedAsync(
        AppDbContext db, string userEmail, int page, int pageSize);
    Task<ContactListEntity?> GetByIdAsync(AppDbContext db, string userEmail, string listId);
    Task AddAsync(AppDbContext db, ContactListEntity list);
    Task RemoveAsync(AppDbContext db, ContactListEntity list);

    Task<Dictionary<string, int>> GetMemberCountsAsync(AppDbContext db, string userEmail, List<string> listIds);
    Task<List<string>> GetMemberContactIdsAsync(AppDbContext db, string userEmail, string listId);
    Task<bool> IsMemberAsync(AppDbContext db, string userEmail, string listId, string contactId);
    Task AddMemberAsync(AppDbContext db, ContactListMemberEntity member);
    Task RemoveMembersByListIdAsync(AppDbContext db, string userEmail, string listId);
}
