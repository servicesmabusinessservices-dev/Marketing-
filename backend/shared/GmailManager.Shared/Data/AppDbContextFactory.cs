using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace GmailManager.Shared.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    public AppDbContext CreateDbContext(string[] args)
    {
        var basePath = ResolveBasePath();
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var directConnection = FirstNonEmpty(
            configuration["MYSQL_CONNECTION_STRING"],
            Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING"));
        var raw = !string.IsNullOrWhiteSpace(directConnection)
            ? directConnection
            : configuration.GetConnectionString("MySql");

        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException("ConnectionStrings:MySql is required for design-time DbContext creation.");
        }

        var connectionBuilder = new MySqlConnectionStringBuilder(raw);
        var passwordOverride = FirstNonEmpty(
            configuration["MYSQL_PASSWORD"],
            Environment.GetEnvironmentVariable("MYSQL_PASSWORD"));
        if (!string.IsNullOrWhiteSpace(passwordOverride)
            && (string.IsNullOrWhiteSpace(connectionBuilder.Password)
                || string.Equals(connectionBuilder.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase)))
        {
            connectionBuilder.Password = passwordOverride;
        }

        if (string.IsNullOrWhiteSpace(connectionBuilder.Password)
            || string.Equals(connectionBuilder.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "MySQL password is not configured. Set MYSQL_PASSWORD via environment variable or user-secrets.");
        }

        var connectionString = connectionBuilder.ConnectionString;

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        var mySqlServerVersion = ServerVersion.AutoDetect(connectionString);

        optionsBuilder.UseMySql(connectionString, mySqlServerVersion);
        return new AppDbContext(optionsBuilder.Options);
    }

    private static string ResolveBasePath()
    {
        var currentDirectory = Directory.GetCurrentDirectory();

        // Support running from project directory or solution root
        if (File.Exists(Path.Combine(currentDirectory, "appsettings.json")))
        {
            return currentDirectory;
        }

        var apiProject = Path.Combine(currentDirectory, "backend", "services", "GmailManager.Api");
        if (Directory.Exists(apiProject))
        {
            return apiProject;
        }

        return currentDirectory;
    }
}
