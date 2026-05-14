using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;

using GmailManager.Shared.Abstractions;
using GmailManager.Shared.Infrastructure;
using GmailManager.Shared.Models;

namespace GmailManager.Auth.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
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
    public IActionResult Login()
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
                
                // SECURITY: Set JWT in httpOnly cookie instead of response body
                SetAuthCookie(jwt);
                
                return Ok(new
                {
                    mode = "development-bypass",
                    email = devEmail
                });
            }

            return StatusCode(500, new
            {
                error = $"Google OAuth configuration is missing: {string.Join(", ", missingSettings)}"
            });
        }

        var resolvedClientId = clientId!;
        var resolvedRedirectUri = redirectUri!;
        var scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email";
        
        var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={resolvedClientId}&redirect_uri={Uri.EscapeDataString(resolvedRedirectUri)}&response_type=code&scope={Uri.EscapeDataString(scope)}&access_type=offline&prompt=consent";
        
        return Ok(new { authUrl });
    }

    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code)
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
            
            // SECURITY: Set JWT in httpOnly cookie instead of URL parameter
            SetAuthCookie(jwt);
            
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";
            // JWT is now in cookie, no longer needed in URL
            return Redirect($"{frontendUrl}/auth-success?email={userEmail}");
        }
        catch (Exception ex)
        {
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";
            return Redirect($"{frontendUrl}/auth-error?message={Uri.EscapeDataString(ex.Message)}");
        }
    }

    /// <summary>
    /// Development-only bypass: issues a JWT for dev@localhost when Google credentials are not configured.
    /// Returns 404 in any non-Development environment.
    /// </summary>
    [HttpGet("dev-login")]
    public IActionResult DevLogin()
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var clientId = _config["GoogleAuth:ClientId"];
        if (!IsMissingOrPlaceholder(clientId))
            return BadRequest(new { error = "Dev login is disabled when Google OAuth credentials are configured. Use the normal login flow." });

        var jwt = GenerateJwt("dev@localhost");
        
        // SECURITY: Set JWT in httpOnly cookie instead of URL parameter
        SetAuthCookie(jwt);
        
        var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";
        return Redirect($"{frontendUrl}/auth-success?email=dev%40localhost");
    }
    
    /// <summary>
    /// Logout endpoint - clears the authentication cookie
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token", new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Required for SameSite=None
            SameSite = SameSiteMode.None,
            Path = "/"
        });
        return Ok(new { message = "Logged out successfully" });
    }

    private static bool IsMissingOrPlaceholder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var trimmed = value.Trim();

        return trimmed.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.EndsWith("_HERE", StringComparison.OrdinalIgnoreCase);
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
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
    
    /// <summary>
    /// Sets the JWT in an httpOnly cookie for security
    /// </summary>
    private void SetAuthCookie(string jwt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true, // Prevents JavaScript access (XSS protection)
            Secure = true, // Required for SameSite=None
            SameSite = SameSiteMode.None, // Required for cross-domain auth
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddHours(8), // Match JWT expiration
            IsEssential = true
        };
        
        Response.Cookies.Append("auth_token", jwt, cookieOptions);
    }
