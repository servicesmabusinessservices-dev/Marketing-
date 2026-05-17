using Asp.Versioning;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using GmailManager.Api.Services;
using GmailManager.Shared.Abstractions;

namespace GmailManager.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ApiControllerBase
{
    private readonly IConfiguration _config;
    private readonly IUserTokenStore _userTokenStore;
    private readonly IWebHostEnvironment _env;

    public AuthController(IConfiguration config, IUserTokenStore userTokenStore, IWebHostEnvironment env)
    {
        _config = config;
        _userTokenStore = userTokenStore;
        _env = env;
    }

    [HttpGet("login")]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        var clientId = _config["GoogleAuth:ClientId"];
        var clientSecret = _config["GoogleAuth:ClientSecret"];
        var redirectUri = _config["GoogleAuth:RedirectUri"];

        var missingSettings = new List<string>();
        if (IsMissingOrPlaceholder(clientId)) missingSettings.Add("GoogleAuth:ClientId");
        if (IsMissingOrPlaceholder(clientSecret)) missingSettings.Add("GoogleAuth:ClientSecret");
        if (IsMissingOrPlaceholder(redirectUri)) missingSettings.Add("GoogleAuth:RedirectUri");

        if (missingSettings.Count > 0)
        {
            if (_env.IsDevelopment())
            {
                var devEmail = "dev@localhost";
                var jwt = GenerateJwt(devEmail);
                return OkResponse(new
                {
                    mode = "development-bypass",
                    token = jwt,
                    email = devEmail
                });
            }

            return StatusCode(500,
                ApiResponse.Fail($"Google OAuth configuration is missing: {string.Join(", ", missingSettings)}", HttpContext.TraceIdentifier));
        }

        var resolvedClientId = clientId!;
        var resolvedRedirectUri = redirectUri!;
        var scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email";
        
        var state = returnUrl ?? (_config["FrontendUrl"] ?? "http://localhost:3000");
        var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={resolvedClientId}&redirect_uri={Uri.EscapeDataString(resolvedRedirectUri)}&response_type=code&scope={Uri.EscapeDataString(scope)}&access_type=offline&prompt=consent&state={Uri.EscapeDataString(state)}";
        
        return OkResponse(new { authUrl });
    }

    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code, [FromQuery] string? state = null)
    {
        try
        {
            var clientId = _config["GoogleAuth:ClientId"];
            var clientSecret = _config["GoogleAuth:ClientSecret"];
            var redirectUri = _config["GoogleAuth:RedirectUri"];

            var missingSettings = new List<string>();
            if (IsMissingOrPlaceholder(clientId)) missingSettings.Add("GoogleAuth:ClientId");
            if (IsMissingOrPlaceholder(clientSecret)) missingSettings.Add("GoogleAuth:ClientSecret");
            if (IsMissingOrPlaceholder(redirectUri)) missingSettings.Add("GoogleAuth:RedirectUri");
            if (missingSettings.Count > 0)
            {
                throw new InvalidOperationException($"Google OAuth configuration is missing: {string.Join(", ", missingSettings)}");
            }

            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = clientId!,
                    ClientSecret = clientSecret!
                },
                Scopes = new[] { "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/userinfo.email" }
            });

            var tokenResponse = await flow.ExchangeCodeForTokenAsync("user", code, redirectUri!, CancellationToken.None);
            
            var userEmail = await GetUserEmail(tokenResponse.AccessToken);
            
            await _userTokenStore.SaveAsync(userEmail, tokenResponse);
            
            var jwt = GenerateJwt(userEmail);
            // Cross-domain: pass token in URL so the frontend can store it in localStorage.
            // httpOnly cookies are blocked as third-party cookies by modern browsers when
            // the frontend and backend are on different domains (mabusinessservices.com vs onrender.com).
            var frontendUrl = state ?? _config["FrontendUrl"] ?? "http://localhost:3000";
            return Redirect($"{frontendUrl}/auth-success?token={Uri.EscapeDataString(jwt)}&email={Uri.EscapeDataString(userEmail)}");
        }
        catch (Exception ex)
        {
            var frontendUrl = state ?? _config["FrontendUrl"] ?? "http://localhost:3000";
            return Redirect($"{frontendUrl}/auth-error?message={Uri.EscapeDataString(ex.Message)}");
        }
    }

    /// <summary>
    /// Development-only bypass: issues a JWT for dev@localhost when Google credentials are not configured.
    /// Returns 404 in any non-Development environment.
    /// </summary>
    [HttpGet("dev-login")]
    public IActionResult DevLogin([FromQuery] string? returnUrl = null)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var clientId = _config["GoogleAuth:ClientId"];
        if (!IsMissingOrPlaceholder(clientId))
            return BadRequestResponse("Dev login is disabled when Google OAuth credentials are configured. Use the normal login flow.");

        var jwt = GenerateJwt("dev@localhost");
        // Cross-domain: pass token in URL so the frontend stores it in localStorage.
        var frontendUrl = returnUrl ?? _config["FrontendUrl"] ?? "http://localhost:3000";
        return Redirect($"{frontendUrl}/auth-success?token={Uri.EscapeDataString(jwt)}&email=dev%40localhost");
    }

    private static bool IsMissingOrPlaceholder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var trimmed = value.Trim();

        return trimmed.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.EndsWith("_HERE", StringComparison.OrdinalIgnoreCase)
            || (trimmed.StartsWith("__") && trimmed.EndsWith("__"));
    }

    private async Task<string> GetUserEmail(string accessToken)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
        var response = await client.GetStringAsync("https://www.googleapis.com/oauth2/v2/userinfo");
        var json = System.Text.Json.JsonDocument.Parse(response);
        return json.RootElement.GetProperty("email").GetString()
               ?? throw new InvalidOperationException("Google user email was not returned");
    }

    private string GenerateJwt(string email)
    {
        var jwtSecret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is missing");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: new[] { new Claim(ClaimTypes.Email, email) },
            expires: DateTime.UtcNow.AddHours(_config.GetValue("Jwt:ExpiryHours", 1.0)),
            signingCredentials: creds
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
