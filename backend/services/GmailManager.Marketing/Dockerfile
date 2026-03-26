# ── GmailManager.Marketing Dockerfile ────────────────────────────────────────
# Build context: repository root
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/shared/GmailManager.Shared/GmailManager.Shared.csproj backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Marketing/GmailManager.Marketing.csproj backend/services/GmailManager.Marketing/
RUN dotnet restore backend/services/GmailManager.Marketing/GmailManager.Marketing.csproj

COPY backend/shared/GmailManager.Shared/ backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Marketing/ backend/services/GmailManager.Marketing/
RUN dotnet publish backend/services/GmailManager.Marketing/GmailManager.Marketing.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "GmailManager.Marketing.dll"]
