using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface ITemplateRepository
{
    Task<(List<CampaignTemplateEntity> templates, int totalCount)> GetTemplatesPagedAsync(
        AppDbContext db, string userEmail, string? normalizedCategory, int page, int pageSize);
    Task<CampaignTemplateEntity?> GetByIdAsync(AppDbContext db, string userEmail, string templateId);
    Task AddAsync(AppDbContext db, CampaignTemplateEntity template);
    Task RemoveAsync(AppDbContext db, CampaignTemplateEntity template);
    Task<bool> AnyAsync(AppDbContext db, string userEmail);
    Task AddRangeAsync(AppDbContext db, IEnumerable<CampaignTemplateEntity> templates);
    Task<List<CampaignTemplateEntity>> SearchAsync(AppDbContext db, string userEmail, string term, int limit);
    Task<List<string>> GetExistingCategoriesAsync(AppDbContext db, string userEmail);
}
