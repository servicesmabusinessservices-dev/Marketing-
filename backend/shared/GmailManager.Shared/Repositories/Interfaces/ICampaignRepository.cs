using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;

namespace GmailManager.Shared.Repositories.Interfaces;

public interface ICampaignRepository
{
    Task<(List<CampaignEntity> campaigns, int totalCount)> GetCampaignsPagedAsync(
        AppDbContext db, string userEmail, int page, int pageSize);
    Task<CampaignEntity?> GetByIdAsync(AppDbContext db, string userEmail, string campaignId);
    Task AddAsync(AppDbContext db, CampaignEntity campaign);
    Task RemoveAsync(AppDbContext db, CampaignEntity campaign);
    Task<List<CampaignEntity>> GetAllAsync(AppDbContext db, string userEmail);
    Task<List<CampaignEntity>> GetForExportAsync(AppDbContext db, string userEmail, int maxRows);
}
