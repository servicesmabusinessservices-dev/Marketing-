@echo off
echo ========================================
echo Gmail Multi-Account Manager
echo ========================================
echo.

echo [1/3] Checking prerequisites...
where dotnet >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: .NET SDK not found. Please install .NET 8 or 9.
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js.
    pause
    exit /b 1
)

echo ✓ .NET SDK found
echo ✓ Node.js found
echo.

echo [2/3] Starting Backend (ASP.NET Core)...
cd GmailManager.Api
start "Gmail Manager Backend" cmd /k "dotnet run --launch-profile https"
timeout /t 3 >nul
cd ..
echo ✓ Backend starting at https://localhost:5001
echo.

echo [3/3] Starting Frontend (React)...
cd email-app
start "Gmail Manager Frontend" cmd /k "npm start"
cd ..
echo ✓ Frontend starting at http://localhost:3000
echo.

echo ========================================
echo ✅ Application Started!
echo ========================================
echo.
echo Backend:  https://localhost:5001
echo Frontend: http://localhost:3000
echo Swagger:  https://localhost:5001/swagger
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping services...
taskkill /FI "WindowTitle eq Gmail Manager Backend*" /T /F >nul 2>nul
taskkill /FI "WindowTitle eq Gmail Manager Frontend*" /T /F >nul 2>nul
echo ✓ Services stopped
pause
