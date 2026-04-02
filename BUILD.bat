@echo off
title Gmail Manager - Production Build
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Gmail Manager - Production Build
echo ========================================
echo.

:: Check if we should skip frontend build
set SKIP_FRONTEND=0
if "%1"=="--backend-only" set SKIP_FRONTEND=1

:: Check if we should skip backend build
set SKIP_BACKEND=0
if "%1"=="--frontend-only" set SKIP_BACKEND=1

:: Build Frontend
if %SKIP_FRONTEND%==0 (
    echo [1/2] Building Frontend...
    echo.
    cd /d "%~dp0frontend"
    call npm run build
    if errorlevel 1 (
        echo.
        echo [ERROR] Frontend build failed!
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Frontend built to: frontend\dist
    echo.
)

:: Build Backend
if %SKIP_BACKEND%==0 (
    echo [2/2] Building Backend API...
    echo.
    cd /d "%~dp0backend\services\GmailManager.Api"
    dotnet publish -c Release -o ../../../publish/api --nologo
    if errorlevel 1 (
        echo.
        echo [ERROR] Backend build failed!
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Backend built to: publish\api
    echo.
)

echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Production artifacts:
echo   - Frontend: %~dp0frontend\dist
echo   - Backend:  %~dp0publish\api
echo.
echo Next steps:
echo   1. Configure environment variables in production
echo   2. Deploy frontend static files to web server
echo   3. Deploy backend API to server or container
echo   4. See DEPLOYMENT.md for detailed instructions
echo.
pause
