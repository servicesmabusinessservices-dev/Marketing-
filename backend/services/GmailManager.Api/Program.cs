  using System.Threading.RateLimiting;
using Asp.Versioning;
using GmailManager.Api.Services;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Repositories;
using GmailManager.Shared.Repositories.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
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
    var allowedOrigins = DbConfigHelper.BuildAllowedOrigins(
        builder.Configuration,
        Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS"),
        builder.Environment.IsDevelopment());


    if (allowedOrigins.Length == 0 && !builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "CORS AllowedOrigins must be configured in production. Set Cors:AllowedOrigins in appsettings or CORS_ALLOWED_ORIGINS environment variable.");
    }

    if (allowedOrigins.Length == 0)
    {
        Log.Warning("No CORS origins configured in Development mode — using default localhost:3000");
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
            else if (containsWildcard)
            {
                // Wildcard support for development/testing only
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
                Log.Warning("CORS wildcard (*) detected. This should only be used in development.");
            }
            else
            {
                // Development fallback only
                if (builder.Environment.IsDevelopment())
                {
                    policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                    Log.Information("CORS: Using development fallback to localhost:3000/3001/3002/5173");
                }
                else
                {
                    // This should never be reached due to earlier validation, but adding for safety
                    throw new InvalidOperationException("CORS origins must be explicitly configured in production");
                }
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
            
            // SECURITY: Read JWT from httpOnly cookie (preferred) or Authorization header (fallback)
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    // First, try to read from httpOnly cookie
                    if (context.Request.Cookies.TryGetValue("auth_token", out var token))
                    {
                        context.Token = token;
                    }
                    // Fallback to Authorization header for backwards compatibility
                    // This allows gradual migration and supports non-browser clients
                    
                    return Task.CompletedTask;
                }
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
                    PermitLimit = rateLimitSection.GetValue("GlobalPermitLimit", 1000),
                    Window = TimeSpan.FromSeconds(rateLimitSection.GetValue("GlobalWindowSeconds", 60)),
                    SegmentsPerWindow = 6,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 20
                });
        });

        // Policy for auth endpoints
        limiterOptions.AddSlidingWindowLimiter("auth", opts =>
        {
            opts.PermitLimit = rateLimitSection.GetValue("AuthPermitLimit", 50);
            opts.Window = TimeSpan.FromSeconds(rateLimitSection.GetValue("AuthWindowSeconds", 60));
            opts.SegmentsPerWindow = 6;
        });

        // Policy for email-send endpoints
        limiterOptions.AddSlidingWindowLimiter("email-send", opts =>
        {
            opts.PermitLimit = rateLimitSection.GetValue("EmailSendPermitLimit", 100);
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
    var databaseConfig = DbConfigHelper.ResolveDatabaseConfiguration(builder.Configuration, builder.Environment);

    if (!string.IsNullOrWhiteSpace(databaseConfig.Warning))
    {
        Log.Warning("{DatabaseWarning}", databaseConfig.Warning);
    }

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddMemoryCache();
    builder.Services.AddDataProtection();

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


    var app = builder.Build();

    // ── Run EF migrations on startup ──────────────────────────────────────────
    await DbConfigHelper.RunMigrationsAsync<AppDbContext>(app);

    // Seed development data if in development mode
    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
        await using var dbContext = await dbFactory.CreateDbContextAsync();
        await GmailManager.Api.Data.DevelopmentDataSeeder.SeedAsync(dbContext);
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


    // Swagger: Only enable in development
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "GmailManager API v1");
            c.RoutePrefix = "swagger";
        });
    }

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

