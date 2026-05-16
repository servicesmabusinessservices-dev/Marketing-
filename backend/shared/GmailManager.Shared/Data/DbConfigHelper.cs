using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MySqlConnector;
using Serilog;

namespace GmailManager.Shared.Data;

public static class DbConfigHelper
{
    public static string ResolveMySqlConnectionString(IConfiguration configuration)
    {
        static string? FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            return null;
        }

        static string NormalizeConnectionString(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw) || !raw.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
                return raw;

            try
            {
                var uri = new Uri(raw);
                var userInfo = uri.UserInfo.Split(':');
                var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 3306;
                var database = uri.AbsolutePath.TrimStart('/');
                return $"Server={host};Port={port};Database={database};User={user};Password={password};SslMode=Required;AllowPublicKeyRetrieval=True;";
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to parse MySQL URI connection string: {Raw}", raw);
                return raw;
            }
        }

        var directConnection = FirstNonEmpty(
            configuration["MYSQL_CONNECTION_STRING"],
            Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING"));

        var raw = !string.IsNullOrWhiteSpace(directConnection)
            ? directConnection
            : configuration.GetConnectionString("MySql");

        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("MySQL connection string is required. Set MYSQL_CONNECTION_STRING or ConnectionStrings:MySql.");

        raw = NormalizeConnectionString(raw);

        var csb = new MySqlConnectionStringBuilder(raw);

        var passwordOverride = FirstNonEmpty(
            configuration["MYSQL_PASSWORD"],
            Environment.GetEnvironmentVariable("MYSQL_PASSWORD"));

        if (!string.IsNullOrWhiteSpace(passwordOverride)
            && (string.IsNullOrWhiteSpace(csb.Password)
                || string.Equals(csb.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase)))
        {
            csb.Password = passwordOverride;
        }

        if (string.IsNullOrWhiteSpace(csb.Password)
            || string.Equals(csb.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            // Only throw if not in dev or if we really need it. 
            // Some connection strings already have the password.
        }

        return csb.ConnectionString;
    }

    public static (bool UseInMemory, string? ConnectionString, ServerVersion? ServerVersion, string? Warning) ResolveDatabaseConfiguration(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        try
        {
            var connectionString = ResolveMySqlConnectionString(configuration);
            // Try auto-detect first
            try 
            {
                var serverVersion = ServerVersion.AutoDetect(connectionString);
                return (false, connectionString, serverVersion, null);
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "MySQL AutoDetect failed. Falling back to default version.");
                // Fallback to a common MySQL version (8.0.x) to allow startup
                var fallbackVersion = new MySqlServerVersion(new Version(8, 0, 32));
                return (false, connectionString, fallbackVersion, "AutoDetect failed; using fallback version.");
            }
        }
        catch (Exception ex)
        {
            if (environment.IsDevelopment())
            {
                return (
                    true,
                    null,
                    null,
                    $"Falling back to in-memory database for local development because MySQL is unavailable: {ex.Message}");
            }
            
            Log.Error(ex, "Failed to resolve database configuration in production.");
            throw;
        }
    }

    public static async Task RunMigrationsAsync<TContext>(IHost app) where TContext : DbContext
    {
        using var scope = app.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<TContext>>();
        await using var dbContext = await dbFactory.CreateDbContextAsync();

        if (dbContext.Database.IsRelational())
        {
            var hasMigrations = dbContext.Database.GetMigrations().Any();
            if (hasMigrations)
            {
                Log.Information("Running migrations for {Context}...", typeof(TContext).Name);
                await dbContext.Database.MigrateAsync();
            }
            else
            {
                await dbContext.Database.EnsureCreatedAsync();
            }
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync();
        }
    }


    public static string[] BuildAllowedOrigins(IConfiguration configuration, string? envOriginsCsv, bool isDevelopment)

    {
        var configuredOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        
        var envOrigins = string.IsNullOrWhiteSpace(envOriginsCsv)
            ? Array.Empty<string>()
            : envOriginsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var merged = configuredOrigins
            .Concat(envOrigins)
            .Concat(new[] 
            { 
                "https://marketing.mabusinessservices.com", 
                "https://www.marketing.mabusinessservices.com",
                "https://marketing-servicesmabusinessservices-2847s-projects.vercel.app"
            })
            .Select(NormalizeOrigin)
            .Where(static o => !string.IsNullOrWhiteSpace(o))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (merged.Length > 0)
            return merged;

        return isDevelopment 
            ? new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173" } 
            : Array.Empty<string>();
    }

    private static string NormalizeOrigin(string origin)
    {
        var trimmed = origin.Trim();
        if (trimmed == "*")
            return trimmed;

        return trimmed.TrimEnd('/');
    }
}

