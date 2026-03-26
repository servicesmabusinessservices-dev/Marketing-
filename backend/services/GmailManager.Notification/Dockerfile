# ── GmailManager.Notification Dockerfile ─────────────────────────────────────
# Build context: repository root
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/shared/GmailManager.Shared/GmailManager.Shared.csproj backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Notification/GmailManager.Notification.csproj backend/services/GmailManager.Notification/
RUN dotnet restore backend/services/GmailManager.Notification/GmailManager.Notification.csproj

COPY backend/shared/GmailManager.Shared/ backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Notification/ backend/services/GmailManager.Notification/
RUN dotnet publish backend/services/GmailManager.Notification/GmailManager.Notification.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "GmailManager.Notification.dll"]
