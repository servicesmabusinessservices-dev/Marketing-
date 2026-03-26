# ── GmailManager.Email Dockerfile ────────────────────────────────────────────
# Build context: repository root
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/shared/GmailManager.Shared/GmailManager.Shared.csproj backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Email/GmailManager.Email.csproj backend/services/GmailManager.Email/
RUN dotnet restore backend/services/GmailManager.Email/GmailManager.Email.csproj

COPY backend/shared/GmailManager.Shared/ backend/shared/GmailManager.Shared/
COPY backend/services/GmailManager.Email/ backend/services/GmailManager.Email/
RUN dotnet publish backend/services/GmailManager.Email/GmailManager.Email.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "GmailManager.Email.dll"]
