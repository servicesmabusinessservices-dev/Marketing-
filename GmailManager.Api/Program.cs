using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GmailManager.Api.Data;
using GmailManager.Api.Services;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

static string ResolveMySqlConnectionString(IConfiguration configuration)
{
    static string? FirstNonEmpty(params string?[] values)
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

    // Convert mysql:// URI format to ADO.NET key=value format if needed
    static string NormalizeConnectionString(string raw)
    {
        if (!raw.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
            return raw;

        var uri = new Uri(raw);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 3306;
        var database = uri.AbsolutePath.TrimStart('/');
        return $"Server={host};Port={port};Database={database};User={user};Password={password};SslMode=Required;";
    }

    var directConnection = FirstNonEmpty(
        configuration["MYSQL_CONNECTION_STRING"],
        Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING"));
    var raw = !string.IsNullOrWhiteSpace(directConnection)
        ? directConnection
        : configuration.GetConnectionString("MySql");

    if (string.IsNullOrWhiteSpace(raw))
    {
        throw new InvalidOperationException("ConnectionStrings:MySql is required.");
    }

    raw = NormalizeConnectionString(raw);

    var builder = new MySqlConnectionStringBuilder(raw);
    var passwordOverride = FirstNonEmpty(
        configuration["MYSQL_PASSWORD"],
        Environment.GetEnvironmentVariable("MYSQL_PASSWORD"));

    if (!string.IsNullOrWhiteSpace(passwordOverride)
        && (string.IsNullOrWhiteSpace(builder.Password)
            || string.Equals(builder.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase)))
    {
        builder.Password = passwordOverride;
    }

    if (string.IsNullOrWhiteSpace(builder.Password)
        || string.Equals(builder.Password, "CHANGE_ME", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "MySQL password is not configured. Set MYSQL_PASSWORD via environment variable or user-secrets.");
    }

    return builder.ConnectionString;
}

var mySqlConnection = ResolveMySqlConnectionString(builder.Configuration);
var mySqlServerVersion = ServerVersion.AutoDetect(mySqlConnection);

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    options.UseMySql(mySqlConnection, mySqlServerVersion, mySqlOptions =>
    {
        mySqlOptions.EnableRetryOnFailure();
    });
});

var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "gmailmanager:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddSingleton<IUserTokenStore, SqlRedisUserTokenStore>();
builder.Services.AddSingleton<IBulkEmailJobQueue, BulkEmailJobQueue>();
builder.Services.AddSingleton<IBulkEmailJobStore, SqlRedisBulkEmailJobStore>();
builder.Services.AddHostedService<BulkEmailWorker>();
builder.Services.AddHostedService<MarketingAutomationWorker>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
    await using var dbContext = await dbFactory.CreateDbContextAsync();

    var hasMigrations = dbContext.Database.GetMigrations().Any();
    if (hasMigrations)
    {
        await dbContext.Database.MigrateAsync();
    }
    else
    {
        await dbContext.Database.EnsureCreatedAsync();
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();

// Only redirect to HTTPS in development; in production, the reverse proxy handles it
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();
