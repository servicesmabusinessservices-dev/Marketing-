using System.Threading.RateLimiting;
using Asp.Versioning;
using GmailManager.Api.Services;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Repositories;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MySqlConnector;
using Serilog;
using Serilog.Formatting.Compact;
using System.Text;

// ─── Bootstrap Serilog early so startup exceptions are captured ──────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new CompactJsonFormatter())
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog structured logging ────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, cfg) =>
    {
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .ReadFrom.Services(services)
           .Enrich.FromLogContext()
           .Enrich.WithProperty("Application", "GmailManager.Api")
           .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);
    });

    // ── Controllers + API explorer ────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "GmailManager API", Version = "v1" });
    });

    // ── API Versioning ────────────────────────────────────────────────────────
    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = ApiVersionReader.Combine(
            new UrlSegmentApiVersionReader(),
            new HeaderApiVersionReader("X-Api-Version"),
            new QueryStringApiVersionReader("api-version"));
    }).AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });

    // ── CORS ──────────────────────────────────────────────────────────────────
    var allowedOrigins = BuildAllowedOrigins(
        builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>(),
        Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS"),
        builder.Environment.IsDevelopment());

    if (allowedOrigins.Length == 0)
    {
        Log.Warning("No CORS origins configured — cross-origin requests will be rejected");
    }

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowReact", policy =>
        {
            var containsWildcard = allowedOrigins.Any(o => o == "*");
            if (allowedOrigins.Length > 0 && !containsWildcard)
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            }
            else
            {
                // Safe fallback: allow any origin (no credentials) to avoid blocking deployments when CORS is unset
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
                Log.Warning("CORS origins are empty or wildcard. Falling back to AllowAnyOrigin without credentials.");
            }
        });
    });

    // ── JWT Authentication ────────────────────────────────────────────────────
    var jwtSecret = builder.Configuration["Jwt:Secret"]
                    ?? Environment.GetEnvironmentVariable("JWT_SECRET");

    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        throw new InvalidOperationException(
            "Jwt:Secret configuration is required. Set it via appsettings, user-secrets, or the JWT_SECRET environment variable.");
    }

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

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    var rateLimitSection = builder.Configuration.GetSection("RateLimiting");

    builder.Services.AddRateLimiter(limiterOptions =>
    {
        // Global sliding-window per IP — default for all routes
        limiterOptions.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "anon";
            return RateLimitPartition.GetSlidingWindowLimiter(ip, _ =>
                new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = rateLimitSection.GetValue("GlobalPermitLimit", 200),
                    Window = TimeSpan.FromSeconds(rateLimitSection.GetValue("GlobalWindowSeconds", 60)),
                    SegmentsPerWindow = 6,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 5
                });
        });

        // Tight policy for auth endpoints
        limiterOptions.AddSlidingWindowLimiter("auth", opts =>
        {
            opts.PermitLimit = rateLimitSection.GetValue("AuthPermitLimit", 10);
            opts.Window = TimeSpan.FromSeconds(rateLimitSection.GetValue("AuthWindowSeconds", 60));
            opts.SegmentsPerWindow = 6;
        });

        // Policy for email-send endpoints
        limiterOptions.AddSlidingWindowLimiter("email-send", opts =>
        {
            opts.PermitLimit = rateLimitSection.GetValue("EmailSendPermitLimit", 20);
            opts.Window = TimeSpan.FromSeconds(rateLimitSection.GetValue("EmailSendWindowSeconds", 60));
            opts.SegmentsPerWindow = 6;
        });

        limiterOptions.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.HttpContext.Response.Headers.RetryAfter = "60";
            await context.HttpContext.Response.WriteAsJsonAsync(
                new { error = "Too many requests. Please slow down." },
                cancellationToken);
        };
    });

    // ── MySQL ─────────────────────────────────────────────────────────────────
    var databaseConfig = ResolveDatabaseConfiguration(builder.Configuration, builder.Environment);

    if (!string.IsNullOrWhiteSpace(databaseConfig.Warning))
    {
        Log.Warning("{DatabaseWarning}", databaseConfig.Warning);
    }

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddMemoryCache();

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

    // ── Repositories ────────────────────────────────────────────────────────
    builder.Services.AddScoped<IContactRepository, GmailManager.Api.Repositories.ContactRepository>();
    builder.Services.AddScoped<IEmailClassificationRepository, GmailManager.Api.Repositories.EmailClassificationRepository>();
    builder.Services.AddScoped<INotificationRepository, GmailManager.Api.Repositories.NotificationRepository>();
    builder.Services.AddScoped<ICampaignRepository, GmailManager.Api.Repositories.CampaignRepository>();
    builder.Services.AddScoped<ITemplateRepository, GmailManager.Api.Repositories.TemplateRepository>();
    builder.Services.AddScoped<IJourneyRepository, GmailManager.Api.Repositories.JourneyRepository>();
    builder.Services.AddScoped<IListRepository, GmailManager.Api.Repositories.ListRepository>();
    builder.Services.AddScoped<IMarketingDataRepository, GmailManager.Api.Repositories.MarketingDataRepository>();
    builder.Services.AddScoped<IUnitOfWork, GmailManager.Shared.Repositories.UnitOfWork>();

    // ── Application services ──────────────────────────────────────────────────
    builder.Services.AddSingleton<IUserTokenStore, SqlRedisUserTokenStore>();
    builder.Services.AddSingleton<IDevelopmentDemoEmailStore, DevelopmentDemoEmailStore>();
    builder.Services.AddSingleton<IBulkEmailJobQueue, BulkEmailJobQueue>();
    builder.Services.AddSingleton<IBulkEmailJobStore, SqlRedisBulkEmailJobStore>();
    builder.Services.AddHostedService<BulkEmailWorker>();
    builder.Services.AddHostedService<MarketingAutomationWorker>();
    builder.Services.AddScoped<GmailManager.Api.Services.Interfaces.IMarketingService, MarketingService>();

    // ── Health checks ─────────────────────────────────────────────────────────
    var hcBuilder = builder.Services.AddHealthChecks();

    if (databaseConfig.UseInMemory)
    {
        hcBuilder.AddCheck(
            "db",
            () => HealthCheckResult.Healthy("Using in-memory database for local development."),
            tags: new[] { "db", "ready" });
    }
    else
    {
        hcBuilder.AddMySql(
            connectionStringFactory: _ => databaseConfig.ConnectionString!,
            name: "mysql",
            tags: new[] { "db", "ready" });
    }

    if (!string.IsNullOrWhiteSpace(redisConnection))
    {
        hcBuilder.AddRedis(
            redisConnectionString: redisConnection,
            name: "redis",
            tags: new[] { "cache", "ready" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── Run EF migrations on startup ──────────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
        await using var dbContext = await dbFactory.CreateDbContextAsync();

        if (dbContext.Database.IsRelational())
        {
            var hasMigrations = dbContext.Database.GetMigrations().Any();
            if (hasMigrations)
                await dbContext.Database.MigrateAsync();
            else
                await dbContext.Database.EnsureCreatedAsync();
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync();
        }
    }

    // ── Middleware pipeline ───────────────────────────────────────────────────
    // Run CORS early so error responses still include CORS headers.
    app.UseCors("AllowReact");
    app.UseMiddleware<GlobalExceptionMiddleware>(); // Always first

    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.EnrichDiagnosticContext = (diag, http) =>
        {
            diag.Set("UserEmail",
                http.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "anon");
            diag.Set("ClientIp", http.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        };
    });

    // Swagger (enabled in all environments for easy access)
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "GmailManager API v1");
        c.RoutePrefix = "swagger";
    });

    app.UseDefaultFiles();
    app.UseStaticFiles();

    if (!app.Environment.IsDevelopment())
        app.UseHttpsRedirection();

    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    // Health endpoints — no auth, no rate limiting
    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate = _ => false  // liveness: process is up
    });
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready")  // db + cache probes
    });

    app.MapControllers();
    app.MapFallbackToFile("index.html");

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// ── Helper: resolve and validate MySQL connection string ──────────────────────
static string ResolveMySqlConnectionString(IConfiguration configuration)
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
        throw new InvalidOperationException("ConnectionStrings:MySql is required.");

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
        throw new InvalidOperationException(
            "MySQL password is not configured. Set MYSQL_PASSWORD via environment variable or user-secrets.");
    }

    return csb.ConnectionString;
}

static (bool UseInMemory, string? ConnectionString, ServerVersion? ServerVersion, string? Warning) ResolveDatabaseConfiguration(
    IConfiguration configuration,
    IHostEnvironment environment)
{
    try
    {
        var connectionString = ResolveMySqlConnectionString(configuration);
        var serverVersion = ServerVersion.AutoDetect(connectionString);
        return (false, connectionString, serverVersion, null);
    }
    catch (Exception ex) when (environment.IsDevelopment())
    {
        return (
            true,
            null,
            null,
            $"Falling back to in-memory database for local development because MySQL is unavailable: {ex.Message}");
    }
}

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
