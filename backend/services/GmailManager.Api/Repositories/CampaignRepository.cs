using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Api.Repositories;

public class CampaignRepository : ICampaignRepository
{
    public async Task<(List<CampaignEntity> campaigns, int totalCount)> GetCampaignsPagedAsync(
        AppDbContext db, string userEmail, int page, int pageSize)
    {
        var query = db.Campaigns.Where(x => x.UserEmail == userEmail);
        var totalCount = await query.CountAsync();
        var campaigns = await query.OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (campaigns, totalCount);
    }

    public Task<CampaignEntity?> GetByIdAsync(AppDbContext db, string userEmail, string campaignId)
        => db.Campaigns.FirstOrDefaultAsync(x => x.UserEmail == userEmail && x.CampaignId == campaignId);

    public Task AddAsync(AppDbContext db, CampaignEntity campaign)
    {
        db.Campaigns.Add(campaign);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(AppDbContext db, CampaignEntity campaign)
    {
        db.Campaigns.Remove(campaign);
        return Task.CompletedTask;
    }

    public Task<List<CampaignEntity>> GetAllAsync(AppDbContext db, string userEmail)
        => db.Campaigns.Where(x => x.UserEmail == userEmail).ToListAsync();

    public Task<List<CampaignEntity>> GetForExportAsync(AppDbContext db, string userEmail, int maxRows)
        => db.Campaigns.Where(x => x.UserEmail == userEmail)
            .OrderByDescending(x => x.UpdatedAtUtc).Take(maxRows).ToListAsync();
}
