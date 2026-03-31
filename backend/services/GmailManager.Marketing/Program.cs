using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Marketing.Services;
using GmailManager.Marketing.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Formatting.Compact;
using System.Text;
using Asp.Versioning;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new CompactJsonFormatter())
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.WithProperty("Application", "GmailManager.Marketing")
       .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);
});

builder.Services.AddControllers();
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
}).AddApiExplorer(o => { o.GroupNameFormat = "'v'VVV"; o.SubstituteApiVersionInUrl = true; });

var allowedOrigins = BuildAllowedOrigins(
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>(),
    Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS"),
    builder.Environment.IsDevelopment());

if (allowedOrigins.Length == 0)
{
    Log.Warning("No CORS origins configured; using AllowAnyOrigin fallback.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        var containsWildcard = allowedOrigins.Any(o => o == "*");
        if (allowedOrigins.Length > 0 && !containsWildcard)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            Log.Warning("CORS origins are empty or wildcard. Falling back to AllowAnyOrigin without credentials.");
        }
    });
});

var jwtSecret = builder.Configuration["Jwt:Secret"]
                ?? Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? throw new InvalidOperationException("Jwt:Secret is required.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.UseInMemoryDatabase("GmailManagerLocalDev");
        return;
    }
    var connStr = builder.Configuration.GetConnectionString("MySql")
                  ?? Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING")
                  ?? throw new InvalidOperationException("MySQL connection string is required.");
    var serverVersion = ServerVersion.AutoDetect(connStr);
    options.UseMySql(connStr, serverVersion);
});

var redisConnection = builder.Configuration.GetConnectionString("Redis")
                      ?? Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");
if (!string.IsNullOrWhiteSpace(redisConnection))
    builder.Services.AddStackExchangeRedisCache(o => { o.Configuration = redisConnection; o.InstanceName = "gmailmanager:"; });
else
    builder.Services.AddDistributedMemoryCache();

builder.Services.AddScoped<IMarketingService, MarketingService>();
builder.Services.AddHostedService<MarketingAutomationWorker>();

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();

static string[] BuildAllowedOrigins(string[]? configuredOrigins, string? envOriginsCsv, bool isDevelopment)
{
    var envOrigins = string.IsNullOrWhiteSpace(envOriginsCsv)
        ? Array.Empty<string>()
        : envOriginsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    var merged = (configuredOrigins ?? Array.Empty<string>())
        .Concat(envOrigins)
        .Select(NormalizeOrigin)
        .Where(static o => !string.IsNullOrWhiteSpace(o))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    if (merged.Length > 0)
        return merged;

    return isDevelopment ? new[] { "http://localhost:3000" } : Array.Empty<string>();
}

static string NormalizeOrigin(string origin)
{
    var trimmed = origin.Trim();
    if (trimmed == "*")
        return trimmed;

    return trimmed.TrimEnd('/');
}
