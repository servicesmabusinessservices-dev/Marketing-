@echo off
title Gmail Manager - Full Stack Launcher
echo.
echo ========================================
echo   Gmail Manager - Starting Full Stack
echo ========================================
echo.
echo Starting Backend API...
start "Backend API" cmd /k "cd /d %~dp0backend\services\GmailManager.Api && dotnet run"
timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "Frontend React" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo   Both services are starting!
echo ========================================
echo.
echo Backend API:  http://localhost:5049
echo Frontend:     http://localhost:3000
echo Swagger:      http://localhost:5049/swagger
echo.
echo Press any key to close this window...
pause >nul
