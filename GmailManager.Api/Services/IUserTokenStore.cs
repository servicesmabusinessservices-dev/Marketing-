using Google.Apis.Auth.OAuth2.Responses;

namespace GmailManager.Api.Services;

public interface IUserTokenStore
{
    Task SaveAsync(string email, TokenResponse tokenResponse, CancellationToken cancellationToken = default);
    Task<TokenResponse?> GetAsync(string email, CancellationToken cancellationToken = default);
}
