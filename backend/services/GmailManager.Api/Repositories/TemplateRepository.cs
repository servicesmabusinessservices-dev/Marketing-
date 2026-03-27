using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class TemplateRepository : ITemplateRepository
{
    public async Task<(List<CampaignTemplateEntity> templates, int totalCount)> GetTemplatesPagedAsync(
        AppDbContext db, string userEmail, string? normalizedCategory, int page, int pageSize)
    {
        var query = db.CampaignTemplates.Where(x => x.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(normalizedCategory))
            query = query.Where(x => x.Category == normalizedCategory);

        var totalCount = await query.CountAsync();
        var templates = await query.OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (templates, totalCount);
    }

    public Task<CampaignTemplateEntity?> GetByIdAsync(AppDbContext db, string userEmail, string templateId)
        => db.CampaignTemplates.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.TemplateId == templateId);

    public Task AddAsync(AppDbContext db, CampaignTemplateEntity template)
    {
        db.CampaignTemplates.Add(template);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(AppDbContext db, CampaignTemplateEntity template)
    {
        db.CampaignTemplates.Remove(template);
        return Task.CompletedTask;
    }

    public Task<bool> AnyAsync(AppDbContext db, string userEmail)
        => db.CampaignTemplates.AnyAsync(x => x.UserEmail == userEmail);

    public async Task AddRangeAsync(AppDbContext db, IEnumerable<CampaignTemplateEntity> templates)
    {
        db.CampaignTemplates.AddRange(templates);
        await Task.CompletedTask;
    }

    public Task<List<CampaignTemplateEntity>> SearchAsync(AppDbContext db, string userEmail, string term, int limit)
        => db.CampaignTemplates
            .Where(x => x.UserEmail == userEmail && (x.Name.ToLower().Contains(term) || x.Subject.ToLower().Contains(term)))
            .OrderByDescending(x => x.UpdatedAtUtc).Take(limit).ToListAsync();

    public Task<List<string>> GetExistingCategoriesAsync(AppDbContext db, string userEmail)
        => db.CampaignTemplates.Where(x => x.UserEmail == userEmail).Select(x => x.Category).Distinct().ToListAsync();
}
