namespace GmailManager.Shared.Models;

/// <summary>
/// Standard API response envelope used by all controllers.
/// Ensures consistent JSON shape across every endpoint.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Error { get; set; }
    public string? TraceId { get; set; }

    public static ApiResponse<T> Ok(T data, string? traceId = null) =>
        new() { Success = true, Data = data, TraceId = traceId };

    public static ApiResponse<T> Fail(string error, string? traceId = null) =>
        new() { Success = false, Error = error, TraceId = traceId };
}

/// <summary>Non-generic version for endpoints that have no payload.</summary>
public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string? traceId = null) =>
        new() { Success = true, TraceId = traceId };

    public new static ApiResponse Fail(string error, string? traceId = null) =>
        new() { Success = false, Error = error, TraceId = traceId };
}
