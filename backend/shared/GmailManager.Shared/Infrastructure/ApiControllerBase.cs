using System.Security.Claims;
using GmailManager.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GmailManager.Shared.Infrastructure;

/// <summary>
/// Base controller that all API controllers inherit from.
/// Provides standardized <see cref="ApiResponse{T}"/> wrapping and common helpers.
/// </summary>
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>
    /// Extracts the authenticated user's email from the JWT claims.
    /// </summary>
    protected string? GetUserEmail() => User.FindFirst(ClaimTypes.Email)?.Value;

    /// <summary>
    /// Converts an internal <see cref="ServiceResult"/> into a standardized
    /// <see cref="ApiResponse{T}"/> HTTP response.
    /// </summary>
    protected IActionResult ToApiResult(ServiceResult result)
    {
        var traceId = HttpContext.TraceIdentifier;

        if (result.Success)
        {
            return StatusCode(result.StatusCode,
                new ApiResponse<object> { Success = true, Data = result.Data, TraceId = traceId });
        }

        return StatusCode(result.StatusCode,
            ApiResponse<object>.Fail(result.Error ?? "Unknown error", traceId));
    }

    /// <summary>
    /// Returns 401 with a standard error envelope when the user email claim is missing.
    /// </summary>
    protected IActionResult UnauthorizedMissingEmail() =>
        Unauthorized(ApiResponse.Fail("User email not found in token", HttpContext.TraceIdentifier));

    /// <summary>
    /// Wraps <paramref name="data"/> in a 200 OK ApiResponse envelope.
    /// </summary>
    protected IActionResult OkResponse<T>(T data) =>
        Ok(ApiResponse<T>.Ok(data, HttpContext.TraceIdentifier));

    /// <summary>
    /// Returns a 201 Created ApiResponse envelope.
    /// </summary>
    protected IActionResult CreatedResponse<T>(T data) =>
        StatusCode(201, ApiResponse<T>.Ok(data, HttpContext.TraceIdentifier));

    /// <summary>
    /// Returns a 404 Not Found ApiResponse envelope.
    /// </summary>
    protected IActionResult NotFoundResponse(string error) =>
        NotFound(ApiResponse.Fail(error, HttpContext.TraceIdentifier));

    /// <summary>
    /// Returns a 400 Bad Request ApiResponse envelope.
    /// </summary>
    protected IActionResult BadRequestResponse(string error) =>
        BadRequest(ApiResponse.Fail(error, HttpContext.TraceIdentifier));
}
