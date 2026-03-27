# ══════════════════════════════════════════════════════════════════════════════
# GmailManager.Api - Production Docker Image
# ══════════════════════════════════════════════════════════════════════════════
# Build Context: backend/ directory
# Usage: docker build -t gmailmanager-api -f backend/Dockerfile backend/
# Render: Set "Root Directory" to "backend" and Dockerfile path to "Dockerfile"
# ══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Build Stage ─────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution file for better build context
COPY EmailMultiAccountApp.sln ./

# ── Copy all project files for dependency restore (optimized layer caching) ───
# Shared library
COPY shared/GmailManager.Shared/GmailManager.Shared.csproj shared/GmailManager.Shared/

# All services (needed for solution restore)
COPY services/GmailManager.Api/GmailManager.Api.csproj services/GmailManager.Api/
COPY services/GmailManager.Marketing/GmailManager.Marketing.csproj services/GmailManager.Marketing/
COPY services/GmailManager.Auth/GmailManager.Auth.csproj services/GmailManager.Auth/
COPY services/GmailManager.Email/GmailManager.Email.csproj services/GmailManager.Email/
COPY services/GmailManager.Analytics/GmailManager.Analytics.csproj services/GmailManager.Analytics/
COPY services/GmailManager.Notification/GmailManager.Notification.csproj services/GmailManager.Notification/

# ── Restore dependencies (cached layer unless .csproj files change) ───────────
RUN dotnet restore services/GmailManager.Api/GmailManager.Api.csproj

# ── Copy source code ──────────────────────────────────────────────────────────
# Copy shared library
COPY shared/GmailManager.Shared/ shared/GmailManager.Shared/

# Copy all required services
COPY services/GmailManager.Api/ services/GmailManager.Api/
COPY services/GmailManager.Marketing/ services/GmailManager.Marketing/

# ── Build and publish ─────────────────────────────────────────────────────────
WORKDIR /src/services/GmailManager.Api
RUN dotnet publish \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ─── Stage 2: Runtime Stage ───────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy published application
COPY --from=build /app/publish .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# ── Environment Configuration ─────────────────────────────────────────────────
# Port configuration (Render uses PORT env var, default to 8080)
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port
EXPOSE 8080

# ── Health Check ──────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# ── Entry Point ───────────────────────────────────────────────────────────────
ENTRYPOINT ["dotnet", "GmailManager.Api.dll"]
