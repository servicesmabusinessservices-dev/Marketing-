using System.Net;
using GmailManager.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GmailManager.Shared.Infrastructure;

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

            var message = _env.IsDevelopment() ? ex.Message : "An unexpected error occurred.";
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError, message);
        }
    }

    private static async Task WriteErrorAsync(
        HttpContext context,
        HttpStatusCode statusCode,
        string message)
    {
        // Preserve CORS headers that the CorsMiddleware already added to the response.
        // Without this, the browser blocks the error response due to missing CORS headers,
        // which hides the real underlying error from the client.
        var corsHeaders = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>(StringComparer.OrdinalIgnoreCase);
        foreach (var header in context.Response.Headers)
        {
            if (header.Key.StartsWith("Access-Control-", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("Vary", StringComparison.OrdinalIgnoreCase))
            {
                corsHeaders[header.Key] = header.Value;
            }
        }

        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Re-apply CORS headers after Clear() removed them
        foreach (var (key, value) in corsHeaders)
        {
            context.Response.Headers[key] = value;
        }

        var response = ApiResponse.Fail(message, context.TraceIdentifier);
        await context.Response.WriteAsJsonAsync(response);
    }
}
