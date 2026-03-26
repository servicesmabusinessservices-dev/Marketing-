namespace GmailManager.Shared.Models;

/// <summary>
/// Internal service-layer result.  Controllers translate this into ApiResponse{T}.
/// </summary>
public class ServiceResult
{
    public bool Success { get; init; } = true;
    public int StatusCode { get; init; } = 200;
    public object? Data { get; init; }
    public string? Error { get; init; }

    public static ServiceResult Ok(object? data = null) => new() { Data = data };

    public static ServiceResult Created(object? data = null) =>
        new() { StatusCode = 201, Data = data };

    public static ServiceResult BadRequest(string error) =>
        new() { Success = false, StatusCode = 400, Error = error };

    public static ServiceResult NotFound(string error) =>
        new() { Success = false, StatusCode = 404, Error = error };

    public static ServiceResult ServerError(string error) =>
        new() { Success = false, StatusCode = 500, Error = error };
}
