@echo off
echo.
echo Running local setup...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP_LOCAL.ps1"
pause
