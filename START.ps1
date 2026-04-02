# Gmail Manager - Full Stack Launcher
# Run this to start both backend and frontend in separate windows

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gmail Manager - Starting Full Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend API..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend\services\GmailManager.Api"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend API' -ForegroundColor Green; dotnet run"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend React' -ForegroundColor Green; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Both services are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:5049" -ForegroundColor White
Write-Host "Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "Swagger:      http://localhost:5049/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
