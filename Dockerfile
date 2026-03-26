# ─── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:20-alpine AS node-build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline || npm install

COPY frontend/ .

# REACT_APP_API_URL is /api so all fetch calls resolve to the same container
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ─── Stage 2: Build .NET 9 API ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS dotnet-build
WORKDIR /src

COPY backend/services/GmailManager.Api/GmailManager.Api.csproj backend/services/GmailManager.Api/
RUN dotnet restore backend/services/GmailManager.Api/GmailManager.Api.csproj

COPY backend/services/GmailManager.Api/ backend/services/GmailManager.Api/
WORKDIR /src/backend/services/GmailManager.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# ─── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=dotnet-build /app/publish .
# Place the React build into wwwroot so ASP.NET Core serves it as static files
COPY --from=node-build /app/build wwwroot/

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "GmailManager.Api.dll"]
