using System.Net;
using System.Text.Json;

namespace GmailManager.Api.Middleware;

/// <summary>
/// Catches all unhandled exceptions, logs them via structured logging,
/// and returns a consistent JSON error envelope so internal details are
/// never leaked to callers in production.
/// </summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Normal client disconnect — no log noise needed.
            context.Response.StatusCode = 499;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await WriteErrorAsync(context, HttpStatusCode.Unauthorized, "Unauthorized.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);

            var detail = _env.IsDevelopment() ? ex.ToString() : null;
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError,
                "An unexpected error occurred.", detail);
        }
    }

    private static async Task WriteErrorAsync(
        HttpContext context,
        HttpStatusCode statusCode,
        string message,
        string? detail = null)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var body = new Dictionary<string, object?> { ["error"] = message };
        if (detail is not null)
        {
            body["detail"] = detail;
        }

        await context.Response.WriteAsync(JsonSerializer.Serialize(body));
    }
}
