@echo off
setlocal

echo ========================================
echo GmailManager API (Clean Start)
echo ========================================
echo.

echo [1/2] Stopping stale backend instances...
taskkill /IM GmailManager.Api.exe /F /T >nul 2>nul

echo [2/2] Starting backend...
cd /d "%~dp0GmailManager.Api"
dotnet run --launch-profile https

endlocal
