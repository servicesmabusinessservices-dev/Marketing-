# ── Local Development Setup ──────────────────────────────────────────────────
# Run this ONCE before starting the app locally for the first time.
# Stores your Google OAuth credentials in .NET User Secrets — never in source control.
#
# Usage (from the workspace root):
#   .\SETUP_LOCAL.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$project = ".\GmailManager.Api\GmailManager.Api.csproj"

Write-Host ""
Write-Host "=== MA Business Services - Local Dev Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEP 1 - Add a localhost redirect URI in Google Cloud Console" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Open:  https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "  2. Click your OAuth 2.0 Client ID" -ForegroundColor White
Write-Host "  3. Under 'Authorized redirect URIs' click 'ADD URI'" -ForegroundColor White
Write-Host "  4. Paste exactly:" -ForegroundColor White
Write-Host ""
Write-Host "       http://localhost:5049/api/auth/google-callback" -ForegroundColor Green
Write-Host ""
Write-Host "  5. Click SAVE" -ForegroundColor White
Write-Host ""
$ready = Read-Host "Have you saved that redirect URI in Google Console? (y/n)"
if ($ready -notmatch "^[yY]$") {
    Write-Host ""
    Write-Host "Please complete Step 1 first, then re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "STEP 2 - Enter your Google OAuth credentials" -ForegroundColor Yellow
Write-Host "(Copy them from https://console.cloud.google.com/apis/credentials)" -ForegroundColor Gray
Write-Host ""
$clientId     = Read-Host "Google Client ID"
$clientSecret = Read-Host "Google Client Secret"

if (-not $clientId -or -not $clientSecret) {
    Write-Host ""
    Write-Host "Both Client ID and Client Secret are required." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Saving to .NET User Secrets (local only, never committed)..." -ForegroundColor Cyan
dotnet user-secrets set "GoogleAuth:ClientId"     $clientId     --project $project
dotnet user-secrets set "GoogleAuth:ClientSecret" $clientSecret --project $project

Write-Host ""
Write-Host "All done! Start the app with two terminals:" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 1 (API):" -ForegroundColor Cyan
Write-Host "    dotnet run --project .\GmailManager.Api\GmailManager.Api.csproj" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "    cd email-app" -ForegroundColor White
Write-Host "    npm start" -ForegroundColor White
Write-Host ""
Write-Host "  Then open http://localhost:3000 and click 'Continue with Google'." -ForegroundColor White
Write-Host ""
