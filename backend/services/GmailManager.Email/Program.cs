using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Email.Services;
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
       .Enrich.WithProperty("Application", "GmailManager.Email")
       .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);
});

builder.Services.AddControllers();
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
}).AddApiExplorer(o => { o.GroupNameFormat = "'v'VVV"; o.SubstituteApiVersionInUrl = true; });

var allowedOrigins = DbConfigHelper.BuildAllowedOrigins(
    builder.Configuration,
    Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS"),
    builder.Environment.IsDevelopment());

builder.Services.AddCors(options =>

{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
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

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();

    // ── MySQL ─────────────────────────────────────────────────────────────────
    var databaseConfig = DbConfigHelper.ResolveDatabaseConfiguration(builder.Configuration, builder.Environment);

    if (!string.IsNullOrWhiteSpace(databaseConfig.Warning))
    {
        Log.Warning("{DatabaseWarning}", databaseConfig.Warning);
    }

    builder.Services.AddDbContextFactory<AppDbContext>(options =>
    {
        if (databaseConfig.UseInMemory)
        {
            options.UseInMemoryDatabase("GmailManagerLocalDev");
            return;
        }

        options.UseMySql(databaseConfig.ConnectionString!, databaseConfig.ServerVersion!, mySqlOptions =>
        {
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
            mySqlOptions.CommandTimeout(30);
        });
    });

    // ── Redis or in-memory distributed cache ──────────────────────────────────
    var redisConnection = builder.Configuration.GetConnectionString("Redis")
                          ?? Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");

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
    builder.Services.AddSingleton<IDevelopmentDemoEmailStore, DevelopmentDemoEmailStore>();
    builder.Services.AddSingleton<IBulkEmailJobQueue, BulkEmailJobQueue>();
    builder.Services.AddSingleton<IBulkEmailJobStore, SqlRedisBulkEmailJobStore>();
    builder.Services.AddHostedService<BulkEmailWorker>();


    var app = builder.Build();

    // ── Run EF migrations on startup ──────────────────────────────────────────
    await DbConfigHelper.RunMigrationsAsync<AppDbContext>(app);

    app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
