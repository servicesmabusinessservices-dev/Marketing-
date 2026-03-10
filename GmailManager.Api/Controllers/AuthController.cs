using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using GmailManager.Api.Services;

namespace GmailManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IUserTokenStore _userTokenStore;

    public AuthController(IConfiguration config, IUserTokenStore userTokenStore)
    {
        _config = config;
        _userTokenStore = userTokenStore;
    }

    [HttpGet("login")]
    public IActionResult Login()
    {
        var clientId = _config["GoogleAuth:ClientId"];
        var redirectUri = _config["GoogleAuth:RedirectUri"];

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(redirectUri))
        {
            return StatusCode(500, new { error = "GoogleAuth configuration is missing" });
        }

        var scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email";
        
        var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={Uri.EscapeDataString(redirectUri)}&response_type=code&scope={Uri.EscapeDataString(scope)}&access_type=offline&prompt=consent";
        
        return Ok(new { authUrl });
    }

    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code)
    {
        try
        {
            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = _config["GoogleAuth:ClientId"],
                    ClientSecret = _config["GoogleAuth:ClientSecret"]
                },
                Scopes = new[] { "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/userinfo.email" }
            });

            var tokenResponse = await flow.ExchangeCodeForTokenAsync("user", code, _config["GoogleAuth:RedirectUri"], CancellationToken.None);
            
            var userEmail = await GetUserEmail(tokenResponse.AccessToken);
            
            await _userTokenStore.SaveAsync(userEmail, tokenResponse);
            
            var jwt = GenerateJwt(userEmail);
            
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";
            return Redirect($"{frontendUrl}/auth-success?token={jwt}&email={userEmail}");
        }
        catch (Exception ex)
        {
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";
            return Redirect($"{frontendUrl}/auth-error?message={Uri.EscapeDataString(ex.Message)}");
        }
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
