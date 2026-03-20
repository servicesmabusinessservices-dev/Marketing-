using System.Threading.RateLimiting;
using Asp.Versioning;
using GmailManager.Api.Data;
using GmailManager.Api.Middleware;
using GmailManager.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
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

    // ── JWT Authentication ────────────────────────────────────────────────────
    var jwtSecret = builder.Configuration["Jwt:Secret"]
                    ?? Environment.GetEnvironmentVariable("JWT_SECRET");

    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        if (builder.Environment.IsDevelopment())
        {
            jwtSecret = "LocalDevelopmentJwtSecretKeyMinimum32Chars!";
            Log.Warning("Jwt:Secret is not configured. Using development-only fallback secret.");
        }
        else
        {
            throw new InvalidOperationException("Jwt:Secret configuration is required.");
        }
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

    // ── Application services ──────────────────────────────────────────────────
    builder.Services.AddSingleton<IUserTokenStore, SqlRedisUserTokenStore>();
    builder.Services.AddSingleton<IDevelopmentDemoEmailStore, DevelopmentDemoEmailStore>();
    builder.Services.AddSingleton<IBulkEmailJobQueue, BulkEmailJobQueue>();
    builder.Services.AddSingleton<IBulkEmailJobStore, SqlRedisBulkEmailJobStore>();
    builder.Services.AddHostedService<BulkEmailWorker>();
    builder.Services.AddHostedService<MarketingAutomationWorker>();

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

    app.UseDefaultFiles();
    app.UseStaticFiles();

    if (!app.Environment.IsDevelopment())
        app.UseHttpsRedirection();

    app.UseRateLimiter();
    app.UseCors("AllowReact");
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
