namespace GmailManager.Shared.Models;

/// <summary>
/// Standardized paginated result wrapper.
/// Always uses page/pageSize for offset-based pagination.
/// </summary>
public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => TotalPages > 0 && Page < TotalPages;
}
