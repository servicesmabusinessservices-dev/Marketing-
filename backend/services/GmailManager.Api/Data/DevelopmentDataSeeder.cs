using GmailManager.Shared.Data;
using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GmailManager.Api.Data;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var userEmail = "dev@localhost";

        if (await db.Contacts.AnyAsync(x => x.UserEmail == userEmail))
            return;

        var now = DateTime.UtcNow;

        // 1. Seed Contacts
        var contacts = new List<ContactEntity>
        {
            new() { ContactId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, Email = "sarah.jones@example.com", EmailNormalized = "sarah.jones@example.com", FirstName = "Sarah", LastName = "Jones", Company = "Jones Tech", LeadStage = "Won", DealValue = 5000, CreatedAtUtc = now.AddDays(-60), UpdatedAtUtc = now.AddDays(-10), OwnerEmail = userEmail },
            new() { ContactId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, Email = "mike.smith@example.com", EmailNormalized = "mike.smith@example.com", FirstName = "Mike", LastName = "Smith", Company = "Smith & Co", LeadStage = "Proposal", DealValue = 12000, CreatedAtUtc = now.AddDays(-45), UpdatedAtUtc = now.AddDays(-5), OwnerEmail = userEmail },
            new() { ContactId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, Email = "alex.rivera@example.com", EmailNormalized = "alex.rivera@example.com", FirstName = "Alex", LastName = "Rivera", Company = "Rivera Design", LeadStage = "Qualified", DealValue = 3500, CreatedAtUtc = now.AddDays(-30), UpdatedAtUtc = now.AddDays(-2), OwnerEmail = userEmail },
            new() { ContactId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, Email = "jane.doe@example.com", EmailNormalized = "jane.doe@example.com", FirstName = "Jane", LastName = "Doe", Company = "Doe Ventures", LeadStage = "New", DealValue = 1500, CreatedAtUtc = now.AddDays(-5), UpdatedAtUtc = now.AddDays(-5), OwnerEmail = userEmail },
            new() { ContactId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, Email = "robert.brown@example.com", EmailNormalized = "robert.brown@example.com", FirstName = "Robert", LastName = "Brown", Company = "Brown Logistics", LeadStage = "Lost", DealValue = 8000, CreatedAtUtc = now.AddDays(-40), UpdatedAtUtc = now.AddDays(-20), OwnerEmail = userEmail }
        };
        db.Contacts.AddRange(contacts);

        // 2. Seed Campaigns
        var campaign = new CampaignEntity
        {
            CampaignId = Guid.NewGuid().ToString("N").Substring(0, 32),
            UserEmail = userEmail,
            Name = "Q2 Growth Outreach",
            Status = "Sent",
            CampaignCost = 500,
            CreatedAtUtc = now.AddDays(-30),
            UpdatedAtUtc = now.AddDays(-30)
        };
        db.Campaigns.Add(campaign);

        // 3. Seed Events (Engagement)
        var events = new List<MessageEventEntity>();
        foreach (var contact in contacts.Take(3))
        {
            events.Add(new MessageEventEntity { EventId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, ContactId = contact.ContactId, EventType = "delivered", OccurredAtUtc = now.AddDays(-25), CreatedAtUtc = now.AddDays(-25), CampaignId = campaign.CampaignId });
            events.Add(new MessageEventEntity { EventId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, ContactId = contact.ContactId, EventType = "opened", OccurredAtUtc = now.AddDays(-24), CreatedAtUtc = now.AddDays(-24), CampaignId = campaign.CampaignId });
            if (contact.FirstName == "Sarah")
                events.Add(new MessageEventEntity { EventId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, ContactId = contact.ContactId, EventType = "clicked", OccurredAtUtc = now.AddDays(-23), CreatedAtUtc = now.AddDays(-23), CampaignId = campaign.CampaignId, MetadataJson = "{\"url\":\"https://example.com/proposal\"}" });
        }
        db.MessageEvents.AddRange(events);

        // 4. Seed Tasks
        var tasks = new List<CrmTaskEntity>
        {
            new() { TaskId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, ContactId = contacts[1].ContactId, Title = "Follow up on proposal", Status = "Open", Priority = "High", DueAtUtc = now.AddDays(2), CreatedAtUtc = now.AddDays(-5), UpdatedAtUtc = now.AddDays(-5), OwnerEmail = userEmail },
            new() { TaskId = Guid.NewGuid().ToString("N").Substring(0, 32), UserEmail = userEmail, ContactId = contacts[2].ContactId, Title = "Schedule discovery call", Status = "Open", Priority = "Medium", DueAtUtc = now.AddDays(-1), CreatedAtUtc = now.AddDays(-3), UpdatedAtUtc = now.AddDays(-3), OwnerEmail = userEmail }
        };
        db.CrmTasks.AddRange(tasks);

        await db.SaveChangesAsync();
    }
}
