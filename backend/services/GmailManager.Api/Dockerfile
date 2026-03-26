# ── GmailManager.Api Dockerfile ──────────────────────────────────────────────
# Build context: repository root (docker build -f backend/services/GmailManager.Api/Dockerfile .)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files for restore
COPY backend/shared/GmailManager.Shared/GmailManager.Shared.csproj backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Api/GmailManager.Api.csproj backend/services/GmailManager.Api/
RUN dotnet restore backend/services/GmailManager.Api/GmailManager.Api.csproj

# Copy source and publish
COPY backend/shared/GmailManager.Shared/ backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Api/ backend/services/GmailManager.Api/
RUN dotnet publish backend/services/GmailManager.Api/GmailManager.Api.csproj -c Release -o /app/publish --no-restore

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "GmailManager.Api.dll"]
