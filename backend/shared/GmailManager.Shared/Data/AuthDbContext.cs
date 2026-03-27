using GmailManager.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace GmailManager.Shared.Data;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<UserTokenEntity> UserTokens => Set<UserTokenEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var userTokens = modelBuilder.Entity<UserTokenEntity>();
        userTokens.HasKey(x => x.Email);
        userTokens.Property(x => x.Email).HasMaxLength(320).HasCharSet("ascii");
    }
}
