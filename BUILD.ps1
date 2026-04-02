# Gmail Manager - Production Build Script
# Usage: .\BUILD.ps1 [-FrontendOnly] [-BackendOnly] [-Docker]

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$script:hasErrors = $false

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "===> $Message" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    $script:hasErrors = $true
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gmail Manager - Production Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Build Docker Images
if ($Docker) {
    Write-Step "Building Docker Images..."
    
    try {
        Write-Host "Building Backend Docker Image..." -ForegroundColor Yellow
        docker build -t gmailmanager-api:latest -f backend/services/GmailManager.Api/Dockerfile .
        Write-Success "Backend Docker image built: gmailmanager-api:latest"
        
        Write-Host ""
        Write-Host "Building Frontend Docker Image..." -ForegroundColor Yellow
        docker build -t gmailmanager-frontend:latest -f frontend/Dockerfile frontend/
        Write-Success "Frontend Docker image built: gmailmanager-frontend:latest"
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Docker Images Built Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Docker images:"
        Write-Host "  - gmailmanager-api:latest"
        Write-Host "  - gmailmanager-frontend:latest"
        Write-Host ""
        Write-Host "Run with: docker-compose up -d" -ForegroundColor Yellow
    }
    catch {
        Write-ErrorMsg "Docker build failed: $_"
        exit 1
    }
    
    exit 0
}

# Build Frontend
if (-not $BackendOnly) {
    Write-Step "[1/2] Building Frontend..."
    
    try {
        Push-Location (Join-Path $rootPath "frontend")
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed with exit code $LASTEXITCODE"
        }
        Pop-Location
        
        Write-Success "Frontend built to: frontend\dist\"
    }
    catch {
        Write-ErrorMsg "Frontend build failed: $_"
        Pop-Location
        exit 1
    }
}

# Build Backend
if (-not $FrontendOnly) {
    Write-Step "[2/2] Building Backend API..."
    
    try {
        Push-Location (Join-Path $rootPath "backend\services\GmailManager.Api")
        dotnet publish -c Release -o "..\..\..\publish\api" --nologo
        if ($LASTEXITCODE -ne 0) {
            throw "Backend build failed with exit code $LASTEXITCODE"
        }
        Pop-Location
        
        Write-Success "Backend built to: publish\api\"
    }
    catch {
        Write-ErrorMsg "Backend build failed: $_"
        Pop-Location
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production artifacts:" -ForegroundColor White
Write-Host "  - Frontend: " -NoNewline; Write-Host "$rootPath\frontend\dist" -ForegroundColor Cyan
Write-Host "  - Backend:  " -NoNewline; Write-Host "$rootPath\publish\api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Configure environment variables in production"
Write-Host "  2. Deploy frontend static files to web server (Nginx, Vercel, etc.)"
Write-Host "  3. Deploy backend API to server or container"
Write-Host "  4. See DEPLOYMENT.md for detailed instructions"
Write-Host ""
Write-Host "To build Docker images instead, run:" -ForegroundColor Gray
Write-Host "  .\BUILD.ps1 -Docker" -ForegroundColor Cyan
Write-Host ""
