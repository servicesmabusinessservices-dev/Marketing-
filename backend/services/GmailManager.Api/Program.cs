using System.Threading.RateLimiting;
using Asp.Versioning;
using GmailManager.Api.Services;
using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Data;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Repositories;
using GmailManager.Shared.Repositories.Interfaces;
using GmailManager.Shared.Services;
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
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
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

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowReact", policy =>
        {
            if (builder.Environment.IsDevelopment())
            {
                policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            }
            else
            {
                if (allowedOrigins.Length > 0)
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials()
                          .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                }
                else
                {
                    // Fallback for production if not explicitly configured
                    policy.WithOrigins("https://marketing.mabusinessservices.com", "https://dashboard.mabusinessservices.com")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                }
            }
        });
    });

    // ── JWT Authentication ────────────────────────────────────────────────────
    var jwtSecret = builder.Configuration["Jwt:Secret"]
                    ?? Environment.GetEnvironmentVariable("JWT_SECRET");

    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        throw new InvalidOperationException("JWT_SECRET is missing");
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
            
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (context.Request.Cookies.TryGetValue("auth_token", out var token))
                    {
                        context.Token = token;
                    }
                    return Task.CompletedTask;
                }
            };
        });

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(limiterOptions =>
    {
        limiterOptions.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "anon";
            return RateLimitPartition.GetSlidingWindowLimiter(ip, _ =>
                new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = 1000,
                    Window = TimeSpan.FromSeconds(60),
                    SegmentsPerWindow = 6,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 20
                });
        });

        limiterOptions.AddSlidingWindowLimiter("auth", opts =>
        {
            opts.PermitLimit = 50;
            opts.Window = TimeSpan.FromSeconds(60);
            opts.SegmentsPerWindow = 6;
        });

        limiterOptions.AddSlidingWindowLimiter("email-send", opts =>
        {
            opts.PermitLimit = 100;
            opts.Window = TimeSpan.FromSeconds(60);
            opts.SegmentsPerWindow = 6;
        });

        limiterOptions.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            await context.HttpContext.Response.WriteAsJsonAsync(new { error = "Too many requests" }, cancellationToken);
        };
    });

    // ── MySQL + DB ───────────────────────────────────────────────────────────
    var databaseConfig = DbConfigHelper.ResolveDatabaseConfiguration(builder.Configuration, builder.Environment);
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddMemoryCache();
    builder.Services.AddDataProtection();

    builder.Services.AddDbContextFactory<AppDbContext>(options =>
    {
        if (databaseConfig.UseInMemory)
        {
            options.UseInMemoryDatabase("GmailManagerLocalDev");
        }
        else
        {
            options.UseMySql(databaseConfig.ConnectionString!, databaseConfig.ServerVersion!, mySqlOptions =>
            {
                mySqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
            });
        }
    });

    // ── Distributed Cache ─────────────────────────────────────────────────────
    var redisConnection = builder.Configuration.GetConnectionString("Redis")
                          ?? Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");

    if (!string.IsNullOrWhiteSpace(redisConnection))
    {
        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnection;
            options.InstanceName = "gmailmanager:api:";
        });
    }
    else
    {
        builder.Services.AddDistributedMemoryCache();
    }

    // ── Repositories ──────────────────────────────────────────────────────────
    builder.Services.AddScoped<IContactRepository, GmailManager.Api.Repositories.ContactRepository>();
    builder.Services.AddScoped<IEmailClassificationRepository, GmailManager.Api.Repositories.EmailClassificationRepository>();
    builder.Services.AddScoped<INotificationRepository, GmailManager.Api.Repositories.NotificationRepository>();
    builder.Services.AddScoped<ICampaignRepository, GmailManager.Api.Repositories.CampaignRepository>();
    builder.Services.AddScoped<ITemplateRepository, GmailManager.Api.Repositories.TemplateRepository>();
    builder.Services.AddScoped<IJourneyRepository, GmailManager.Api.Repositories.JourneyRepository>();
    builder.Services.AddScoped<IListRepository, GmailManager.Api.Repositories.ListRepository>();
    builder.Services.AddScoped<IMarketingDataRepository, GmailManager.Api.Repositories.MarketingDataRepository>();
    builder.Services.AddScoped<IUnitOfWork, GmailManager.Shared.Repositories.UnitOfWork>();

    // ── Application Services ──────────────────────────────────────────────────
    builder.Services.AddSingleton<IUserTokenStore, SqlRedisUserTokenStore>();
    builder.Services.AddSingleton<IDevelopmentDemoEmailStore, DevelopmentDemoEmailStore>();
    builder.Services.AddSingleton<IBulkEmailJobQueue, BulkEmailJobQueue>();
    builder.Services.AddSingleton<IBulkEmailJobStore, SqlRedisBulkEmailJobStore>();
    builder.Services.AddHostedService<BulkEmailWorker>();
    builder.Services.AddHostedService<MarketingAutomationWorker>();
    builder.Services.AddScoped<GmailManager.Api.Services.Interfaces.IMarketingService, MarketingService>();

    // ── Health Checks ─────────────────────────────────────────────────────────
    var hcBuilder = builder.Services.AddHealthChecks();
    if (!databaseConfig.UseInMemory)
    {
        hcBuilder.AddMySql(databaseConfig.ConnectionString!, name: "mysql", tags: new[] { "db", "ready" });
    }
    if (!string.IsNullOrWhiteSpace(redisConnection))
    {
        hcBuilder.AddRedis(redisConnection, name: "redis", tags: new[] { "cache", "ready" });
    }

    var app = builder.Build();

    // ── Pipeline ──────────────────────────────────────────────────────────────
    await DbConfigHelper.RunMigrationsAsync<AppDbContext>(app);

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "GmailManager API v1"));
        
        using var scope = app.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
        await using var dbContext = await dbFactory.CreateDbContextAsync();
        await GmailManager.Api.Data.DevelopmentDataSeeder.SeedAsync(dbContext);
    }

    app.UseCors("AllowReact");
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseSerilogRequestLogging();

    app.UseDefaultFiles();
    app.UseStaticFiles();

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
    app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });

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
