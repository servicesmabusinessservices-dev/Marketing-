# GmailManager Marketing Platform
## Microservices Transformation Plan
### Full Architecture Audit & Refactoring Roadmap

| Date | Status | Version | Prepared By |
|------|--------|---------|-------------|
| March 2026 | Draft — For Review | 1.0 | Senior Architect Review |

---

## Table of Contents

1. [Codebase Issues Report](#1-codebase-issues-report)
2. [Files to Delete / Refactor / Keep](#2-files-to-delete--refactor--keep)
3. [Proposed Architecture Diagram](#3-proposed-architecture-diagram)
4. [New Folder Structure](#4-new-folder-structure)
5. [Refactoring Steps (Ordered)](#5-refactoring-steps-ordered)
6. [Deployment Plan](#6-deployment-plan)
7. [Risks & Improvements](#7-risks--improvements)

---

## 1. Codebase Issues Report

The following audit covers the full-stack codebase: .NET 9 ASP.NET Core API (`GmailManager.Api`) and a React 19 frontend (`email-app`). The application is currently deployed as a monolith — both frontend and backend bundled inside a single Docker container on Render — despite being designed as if they are separate services.

---

### 1.1 Architecture & Structural Issues

- **MONOLITH DEPLOYMENT**: The `Dockerfile` builds the React SPA into `wwwroot/` and serves it via ASP.NET's static file middleware. Frontend and backend share one container, one port (8080), one process.

- **MASSIVE CONTROLLER FILES**: `MarketingController.cs` is a single 1,500+ line file handling CRM contacts, pipeline, lists, suppressions, segments, templates, campaigns, journeys, events, analytics, export, tracking pixel, and global search. This is a textbook **God Object** anti-pattern.

- **BUSINESS LOGIC IN CONTROLLERS**: Template rendering, token validation, CSV parsing, ROI calculation, send-time suggestion generation, and journey enrollment logic are all embedded directly inside controller action methods — zero service layer.

- **VIOLATION OF SINGLE RESPONSIBILITY**: `EmailController` handles email listing, classification, send, forward, bulk-send, bulk-send SSE streaming, and Gmail token management in one class.

- **NO SERVICE LAYER**: There is no intermediate service/business-logic layer. Controllers call `DbContext` directly. The only "services" are infrastructure concerns (`BulkEmailWorker`, `SqlRedisBulkEmailJobStore`, etc.).

- **REQUEST MODELS INSIDE CONTROLLER**: All request DTOs (`UpsertContactRequest`, `CreateCampaignRequest`, etc.) are defined as `sealed` inner classes inside `MarketingController` — a maintenance and discoverability nightmare.

- **GLOBAL SEARCH IN WRONG CONTROLLER**: The `/api/search` endpoint is declared on `MarketingController` but uses `[HttpGet("/api/search")]`, bypassing the controller route prefix — confusing and fragile.

- **MISSING REPOSITORY PATTERN**: All data-access queries are inline in controllers. There is no abstraction between business logic and EF Core, making testing and future DB migration impossible.

- **MISSING API VERSIONING ON ROUTES**: API versioning is configured in `Program.cs` but no controller uses `[ApiVersion("1.0")]` or `/api/v1/` URL segments. The infrastructure is wired but completely unused.

- **HARDCODED VALUES IN PRODUCTION CONFIG**: `appsettings.json` contains a hardcoded production `RedirectUri` (`https://marketing-1um3.onrender.com`) and hardcoded `Cors:AllowedOrigins`. These must be environment-variable driven.

- **SQLITE FILE COMMITTED**: `gmailmanager.db` is committed to the repository — a production database binary in source control. Must be deleted and gitignored immediately.

- **EMAIL SESSION SQL FILE**: `EmailApp-FreeDB.session.sql` is committed — an ad-hoc SQL session file with no business purpose in the repo.

- **DEVELOPMENT DEMO STORE IS FRAGILE**: `DevelopmentDemoEmailStore` is a singleton injected into `EmailController`. The `ShouldUseDevelopmentEmailFallbackAsync()` check is duplicated **8+ times** in `EmailController`. This should be an environment-based strategy pattern.

- **NO INPUT SANITIZATION ON HTML BODY**: Email bodies (`SendEmail`, `BulkSendEmail`, `ForwardEmail`) accept raw HTML from the frontend with no server-side sanitization. This is a **stored XSS risk**.

- **INFINITE LOOP RISK IN EMAIL LIST**: The `while (collected.Count < maxResults && safety < 10)` loop in `GetEmails()` can over-fetch from the Gmail API. The `safety` counter of 10 is arbitrary with no backpressure.

- **MSAL/AZURE DEPENDENCIES UNUSED**: `package.json` includes `@azure/msal-browser` and `@azure/msal-react`, and `src/services/graphService.js` exists — but the app uses Google OAuth only. These are dead code.

- **REACT-EMAIL-EDITOR UNUSED**: `react-email-editor` (Unlayer) is listed in `package.json` but there is no evidence of it being imported or used in any component.

- **INCONSISTENT PAGINATION**: Some endpoints use `limit/page`, others use `pageSize/page`, and some have both simultaneously. The `NormalizePage/NormalizePageSize` helpers exist but are not consistently applied.

- **NO FOREIGN KEY CONSTRAINTS**: The data model has logical relationships (`CrmTask.ContactId` references `Contact`) but the EF Core model defines no navigation properties or FK constraints.

---

### 1.2 Frontend Issues

- **TIGHT COUPLING TO BACKEND**: Frontend code calls `/api/...` URLs directly from multiple components. No consistent API abstraction layer beyond the base `apiClient.js`.

- **LARGE MONOLITHIC COMPONENTS**: `Marketing.js`, `AnalyticsDashboard.js`, and `JourneyBuilder.js` each contain 500–1000+ lines with state, business logic, and UI mixed together.

- **CSS-PER-COMPONENT PATTERN**: Every component has a dedicated `.css` file. With no CSS modules or Tailwind, there will be global class name collisions at scale. 15+ CSS files total.

- **UNUSED AZURE/GRAPH SERVICE**: `src/services/graphService.js` provides Microsoft Graph API integration. It is not imported or used anywhere in the app. Dead code.

- **`reportWebVitals.js`**: CRA boilerplate, imported in `index.js` but the callback is unused. No vitals are reported anywhere.

- **`logo.svg`**: Default CRA logo asset, not used in the app.

- **`App.test.js`**: Default CRA smoke test ("renders learn react link"). Not updated for the actual app.

- **MISSING GRANULAR ERROR BOUNDARIES**: `ErrorBoundary` wraps the root `Outlet` but individual routes lack granular error handling.

- **NO ENV VAR VALIDATION**: `authConfig.js` reads `REACT_APP_API_URL` but doesn't validate or log a warning when it's undefined.

---

## 2. Files to Delete / Refactor / Keep

| File / Component | Action | Reason |
|---|---|---|
| `gmailmanager.db` | 🔴 DELETE | Production DB binary committed to source; must never be in git |
| `EmailApp-FreeDB.session.sql` | 🔴 DELETE | Ad-hoc SQL session file; no business purpose in repo |
| `email-app/src/services/graphService.js` | 🔴 DELETE | Azure/Microsoft Graph service — never imported, dead code |
| `email-app/src/logo.svg` | 🔴 DELETE | Default CRA asset, not used anywhere in the app |
| `email-app/src/App.test.js` | 🔴 DELETE | Default CRA smoke test referencing "learn react link" |
| `email-app/src/reportWebVitals.js` | 🔴 DELETE | CRA boilerplate, callback never actually used |
| `GmailManager.Api/GmailManager.Api.http` | 🔴 DELETE | VS REST client test file; superseded by proper API docs |
| `GmailManager.Api/Controllers/MarketingController.cs` | 🟡 REFACTOR | Split into 5 targeted controllers + service layer |
| `GmailManager.Api/Controllers/EmailController.cs` | 🟡 REFACTOR | Extract Gmail, classification, and bulk-send to services |
| `GmailManager.Api/Controllers/AuthController.cs` | 🟡 REFACTOR | Move JWT and OAuth flows to AuthService |
| `GmailManager.Api/Services/DevelopmentDemoEmailStore.cs` | 🟡 REFACTOR | Replace with environment-strategy pattern; remove 8 duplicated checks |
| `GmailManager.Api/Data/AppDbContext.cs` | 🟡 REFACTOR | Split entity registrations per domain context or partial classes |
| `GmailManager.Api/appsettings.json` | 🟡 REFACTOR | Remove all hardcoded URLs/secrets; use env var placeholders only |
| `email-app/src/components/Marketing.js` | 🟡 REFACTOR | Decompose into feature-level sub-components |
| `email-app/src/components/AnalyticsDashboard.js` | 🟡 REFACTOR | Extract chart widgets and data-fetching hooks |
| `email-app/src/components/JourneyBuilder.js` | 🟡 REFACTOR | Extract step editor and canvas components |
| `email-app/src/index.js` | 🟡 REFACTOR | Remove `reportWebVitals` import |
| `email-app/package.json` | 🟡 REFACTOR | Remove `@azure/msal-*`, `react-email-editor` (unused) |
| `Dockerfile` | 🟡 REFACTOR | Split into `/frontend/Dockerfile` and `/backend/Dockerfile` |
| `.vscode/` | 🟢 KEEP | Useful team-shared VS Code settings and tasks |
| `GmailManager.Api/Middleware/GlobalExceptionMiddleware.cs` | 🟢 KEEP | Production-grade exception handler |
| `GmailManager.Api/Services/BulkEmailWorker.cs` | 🟢 KEEP | Background worker for async email dispatch |
| `GmailManager.Api/Services/MarketingAutomationWorker.cs` | 🟢 KEEP | Journey automation worker |
| `GmailManager.Api/Migrations/` | 🟢 KEEP | Required for schema management |
| `email-app/src/services/apiClient.js` | 🟢 KEEP | Centralized axios client; well-structured |
| `email-app/src/context/` | 🟢 KEEP | `ThemeContext` and `FeedbackContext` are clean |
| `email-app/src/hooks/` | 🟢 KEEP | `useApi`, `useSSE`, `useHotkeys`, `useInboxData` are reusable |
| `email-app/src/components/ui/` | 🟢 KEEP | UI component library is well-organized |
| `email-app/src/components/layout/` | 🟢 KEEP | Layout system is clean and reusable |
| `email-app/src/styles/tokens.css` | 🟢 KEEP | Design token system is production-grade |
| `SETUP.md`, `README.md`, `API_REFERENCE.md` | 🟢 KEEP | Useful documentation; consolidate into `/docs/` |
| `REDESIGN_CONTEXT.md`, `DESIGN_TOKEN_IMPLEMENTATION.md` | 🟢 KEEP | Architecture context for the team |

---

## 3. Proposed Architecture Diagram

> **Architecture Philosophy**: The existing codebase has clean domain boundaries in its data model (CRM, Campaign, Journey, Email, Notification). The transformation splits these into independently deployable microservices while retaining the shared MySQL + Redis infrastructure. A Gateway/BFF pattern is added to reduce frontend complexity.

```
                        INTERNET
                            |
               [React SPA on Vercel]
                            |  HTTPS
          [API Gateway / Reverse Proxy on Render]
          /auth   /email  /marketing  /notifications  /analytics
            |        |          |               |              |
         [Auth]  [Email]  [Marketing]  [Notification]  [Analytics]
                               |
                      [Background Workers]
                   BulkEmailWorker | AutomationWorker
          ___________________________________________________
         |           Shared Infrastructure                   |
         |  MySQL (PlanetScale/Railway)  Redis (Upstash)     |
         |___________________________________________________|
```

### Service Responsibilities

| Service | Domain | Communication |
|---------|--------|---------------|
| **auth-service** | Google OAuth, JWT issuance/validation | REST |
| **email-service** | Gmail API, inbox, send, forward, bulk-send, SSE stream | REST + SSE |
| **marketing-service** | Contacts, CRM, campaigns, templates, journeys, lists, pipeline | REST |
| **notification-service** | In-app notifications, read/unread state | REST |
| **analytics-service** | ROI analytics, funnel metrics, send-time suggestions | REST |

---

## 4. New Folder Structure

### 4.1 Repository Root (Monorepo)

```
project-root/
├── frontend/                        # React SPA → deploy to Vercel
├── backend/
│   ├── services/
│   │   ├── auth-service/            # Google OAuth + JWT issuance
│   │   ├── email-service/           # Gmail API + classification + bulk-send
│   │   ├── marketing-service/       # CRM, campaigns, templates, journeys, segments
│   │   ├── notification-service/    # In-app notifications
│   │   └── analytics-service/       # Analytics, ROI, pipeline metrics
│   └── shared/
│       ├── DbContext/               # Shared EF Core context + migrations
│       ├── Models/                  # Shared DTOs and domain entities
│       └── Infrastructure/          # Redis, JWT helpers, shared middleware
├── infra/
│   ├── docker-compose.yml
│   ├── nginx.conf                   # API gateway config
│   └── github-actions/
└── docs/
    ├── API_REFERENCE.md
    ├── SETUP.md
    ├── GMAIL_SETUP_GUIDE.md
    └── END_USER_GUIDE.md
```

### 4.2 Backend Service Structure

Each microservice follows the same internal structure:

```
auth-service/
├── Controllers/
│   └── AuthController.cs
├── Services/
│   ├── IAuthService.cs
│   └── GoogleAuthService.cs
├── Repositories/                    # (where DB access is needed)
│   └── IUserTokenRepository.cs
├── DTOs/                            # Request/Response models (no inner classes)
│   ├── LoginResponseDto.cs
│   └── CallbackRequestDto.cs
├── Models/                          # Domain entities for this service
├── Middleware/
│   └── GlobalExceptionMiddleware.cs
├── Config/
│   ├── appsettings.json             # Env-var references only, no secrets
│   └── appsettings.Example.json
├── Dockerfile
└── Program.cs
```

### 4.3 Frontend Structure

Reorganize from component-centric to feature-centric architecture:

```
frontend/src/
├── features/                        # Feature-level modules
│   ├── auth/
│   │   ├── components/              # AccountSelection.js, AuthLayout.js
│   │   └── hooks/                   # useAuth.js
│   ├── email/
│   │   ├── components/              # EmailList.js, EmailDetail.js, BulkEmail.js
│   │   └── hooks/                   # useInboxData.js
│   ├── marketing/
│   │   ├── components/              # campaigns, contacts, journeys, templates, lists
│   │   └── hooks/                   # useContacts.js, useCampaigns.js, etc.
│   ├── analytics/
│   └── pipeline/
├── components/                      # Shared/reusable UI only
│   ├── ui/                          # Button, Input, DataTable, KPICard...
│   └── layout/                      # WorkspaceLayout, WorkspaceTopbar...
├── services/                        # API client layer
│   ├── apiClient.js                 # axios instance — keep as-is
│   ├── authApi.js
│   ├── emailApi.js
│   ├── marketingApi.js
│   └── analyticsApi.js
├── hooks/                           # Shared hooks only (useSSE, useHotkeys...)
├── context/                         # ThemeContext, FeedbackContext
├── utils/                           # chartTheme, exportData, session...
├── styles/
│   ├── tokens.css                   # Design tokens (keep as-is)
│   └── global.css
└── constants/
```

---

## 5. Refactoring Steps (Ordered)

### Step 1 — Repository Cleanup
> ⏱ Estimated time: **2–4 hours** | No functional changes

1. Delete `gmailmanager.db` from repo history using **BFG Repo Cleaner** or `git filter-repo`.
2. Delete `EmailApp-FreeDB.session.sql`.
3. Delete `email-app/src/services/graphService.js`.
4. Delete `email-app/src/logo.svg`, `App.test.js`, `reportWebVitals.js`.
5. Remove `@azure/msal-browser` and `@azure/msal-react` from `package.json`.
6. Remove `react-email-editor` from `package.json` (confirm unused — search all `.js` files for `'email-editor'`).
7. Delete `GmailManager.Api/GmailManager.Api.http`.
8. Update `.gitignore` to include `*.db`, `*.sqlite`, `*.session.sql`.
9. Move all `*.md` docs into `/docs/`.

---

### Step 2 — Backend: Extract Service Layer
> ⏱ Estimated time: **2–3 days** | Core architectural change

1. Create `GmailManager.Api/Services/IMarketingService.cs` and `MarketingService.cs`. Move all marketing business logic (contacts, campaigns, templates, journeys) out of `MarketingController`.
2. Create `GmailManager.Api/Services/IEmailService.cs` and `GmailEmailService.cs`. Move Gmail API calls, email parsing, and classification logic out of `EmailController`.
3. Create `GmailManager.Api/Services/IAuthService.cs` and `GoogleAuthService.cs`. Move JWT generation and Google OAuth exchange out of `AuthController`.
4. Create `GmailManager.Api/Services/IAnalyticsService.cs` and `AnalyticsService.cs`. Move the 200+ lines of analytics calculation from `MarketingController.GetAnalytics()`.
5. Register all new services in `Program.cs` as `Scoped` (not `Singleton` unless stateless).
6. Controllers become thin: validate input, call service, return result. **Maximum 20–30 lines per action.**

---

### Step 3 — Backend: Extract DTOs
> ⏱ Estimated time: **1 day**

1. Create `GmailManager.Api/DTOs/` directory.
2. Move all inner request classes from `MarketingController` (`UpsertContactRequest`, `CreateCampaignRequest`, `CreateJourneyRequest`, etc.) to `DTOs/` as standalone public classes.
3. Add `FluentValidation` or `DataAnnotation` attributes for all required fields.
4. Create response DTOs for common patterns:
   ```csharp
   public class PaginatedResult<T>
   {
       public List<T> Items { get; set; }
       public int Page { get; set; }
       public int PageSize { get; set; }
       public int TotalCount { get; set; }
       public int TotalPages { get; set; }
   }

   public class ApiResponse<T>
   {
       public bool Success { get; set; }
       public T? Data { get; set; }
       public string? Error { get; set; }
       public string? TraceId { get; set; }
   }
   ```

---

### Step 4 — Backend: Standardize API Routes
> ⏱ Estimated time: **4 hours**

1. Add `[ApiVersion("1.0")]` to all controllers.
2. Change all routes from `[Route("api/[controller]")]` to `[Route("api/v{version:apiVersion}/[controller]")]`.
3. Fix the misplaced `/api/search` endpoint — move to `SearchController` with the correct route prefix.
4. Standardize all error responses to a consistent shape:
   ```json
   {
     "success": false,
     "error": "Contact not found",
     "traceId": "00-abc123-def456-00"
   }
   ```

---

### Step 5 — Backend: Add Repository Pattern
> ⏱ Estimated time: **2 days** | Enables testability

1. Create `GmailManager.Api/Repositories/` directory.
2. Create interfaces: `IContactRepository`, `ICampaignRepository`, `ITemplateRepository`, `IJourneyRepository`, `IEmailClassificationRepository`.
3. Implement repositories that wrap `IDbContextFactory<AppDbContext>`.
4. Update service layer to depend on repository interfaces rather than `DbContext` directly.
5. This makes unit testing services possible via mocks without a real database.

Example:
```csharp
public interface IContactRepository
{
    Task<ContactEntity?> GetByIdAsync(string userEmail, string contactId);
    Task<ContactEntity?> GetByEmailAsync(string userEmail, string normalizedEmail);
    Task<PaginatedResult<ContactEntity>> GetPagedAsync(string userEmail, ContactFilter filter, int page, int pageSize);
    Task UpsertAsync(ContactEntity contact);
}
```

---

### Step 6 — Backend: Security & Config Hardening
> ⏱ Estimated time: **4 hours**

1. Remove the hardcoded `RedirectUri` from `appsettings.json`. Use `GOOGLE_REDIRECT_URI` environment variable.
2. Remove hardcoded CORS origins from `appsettings.json`. Use `CORS_ALLOWED_ORIGINS` env var.
3. Add HTML sanitization to `SendEmail`, `BulkSendEmail`, and `ForwardEmail`:
   ```csharp
   // Use HtmlAgilityPack or AntiXssLibrary
   var sanitized = HtmlSanitizer.Sanitize(request.Body);
   ```
4. Remove the development JWT fallback secret from `Program.cs`. Force developers to configure secrets even locally using `dotnet user-secrets`.

---

### Step 7 — Frontend: Feature-Based Reorganization
> ⏱ Estimated time: **1–2 days** | Rename/move files only — no logic changes

1. Create `src/features/` directory with `auth/`, `email/`, `marketing/`, `analytics/`, `pipeline/` subdirectories.
2. Move `EmailList.js`, `EmailDetail.js`, `BulkEmail.js` and their CSS into `src/features/email/components/`.
3. Move `Marketing.js`, `JourneyBuilder.js`, `TemplateEditor.js` and `marketing/*` into `src/features/marketing/components/`.
4. Move `AnalyticsDashboard.js` into `src/features/analytics/components/`.
5. Move `PipelineBoard.js` into `src/features/pipeline/components/`.
6. Update all import paths throughout the codebase.

---

### Step 8 — Frontend: API Service Layer
> ⏱ Estimated time: **1 day**

1. Create `src/services/emailApi.js` — extract all `/api/email/...` calls from components into typed functions.
2. Create `src/services/marketingApi.js` — extract all `/api/marketing/...` calls.
3. Create `src/services/analyticsApi.js` — extract `/api/marketing/analytics` calls.
4. Create `src/services/authApi.js` — extract `/api/auth/...` calls.

Example:
```js
// src/services/marketingApi.js
import apiClient from './apiClient';

export const getContacts = (params) =>
  apiClient.get('/api/v1/marketing/contacts', { params });

export const upsertContact = (data) =>
  apiClient.post('/api/v1/marketing/contacts', data);

export const getCampaigns = (params) =>
  apiClient.get('/api/v1/marketing/campaigns', { params });
```

All components use only the typed API service functions — never `apiClient.get()` directly.

---

### Step 9 — Repository Split (Monorepo to Multi-Service)
> ⏱ Estimated time: **1 day** | Infrastructure change

1. Create `project-root/frontend/` — move `email-app/` contents here.
2. Create `project-root/backend/services/auth-service/` — copy `AuthController` + `AuthService` + DTOs.
3. Create `project-root/backend/services/email-service/` — email controller/service/repositories.
4. Create `project-root/backend/services/marketing-service/` — marketing controller/service/repositories.
5. Create `project-root/backend/services/notification-service/` — notification controller.
6. Create `project-root/backend/services/analytics-service/` — analytics service.
7. Create `project-root/backend/shared/` — `DbContext`, shared entities, infrastructure.

---

### Step 10 — Docker & Deployment
> ⏱ Estimated time: **1 day**

1. Create `/frontend/Dockerfile` for standalone React build (nginx-based).
2. Create `/backend/services/<n>/Dockerfile` for each .NET service.
3. Create `/infra/docker-compose.yml` for local development (all services + MySQL + Redis).
4. Create `/infra/nginx.conf` as API gateway routing `/api/auth/*`, `/api/email/*`, etc. to appropriate services.

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```dockerfile
# backend/services/marketing-service/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "MarketingService.dll"]
```

---

## 6. Deployment Plan

### 6.1 Git Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Active development — feature branches merge here |
| `staging` | Integration testing — mirrors production config |
| `deploy` | Production-ready builds — CI/CD deploys from here |
| `feature/*` | Individual feature branches |
| `hotfix/*` | Emergency production fixes |

---

### 6.2 Frontend — Vercel

- **Root Directory**: `/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Framework**: Create React App

**Required environment variables:**
```
REACT_APP_AUTH_API_URL=https://auth.yourdomain.com
REACT_APP_EMAIL_API_URL=https://email.yourdomain.com
REACT_APP_MARKETING_API_URL=https://marketing.yourdomain.com
REACT_APP_ANALYTICS_API_URL=https://analytics.yourdomain.com
REACT_APP_NOTIFICATION_API_URL=https://notifications.yourdomain.com
```

---

### 6.3 Backend Services — Render

| Service | Render Service Type |
|---------|---------------------|
| `auth-service` | Web Service — Docker (port 8080) |
| `email-service` | Web Service — Docker (port 8081) |
| `marketing-service` | Web Service — Docker (port 8082) |
| `notification-service` | Web Service — Docker (port 8083) |
| `analytics-service` | Web Service — Docker (port 8084) |
| `BulkEmailWorker` | Background Worker (within email-service) |
| `AutomationWorker` | Background Worker (within marketing-service) |

**Required environment variables per service (example: email-service):**
```
ASPNETCORE_ENVIRONMENT=Production
JWT_SECRET=<secret from Render secrets manager>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://auth.yourdomain.com/api/v1/auth/google-callback
MYSQL_CONNECTION_STRING=<PlanetScale connection string>
REDIS_CONNECTION_STRING=<Upstash Redis URL>
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
```

---

### 6.4 GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [deploy]

jobs:
  build-and-test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - name: Build and test marketing-service
        run: |
          cd backend/services/marketing-service
          dotnet build
          dotnet test

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

  deploy:
    needs: [build-and-test-backend, build-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_MARKETING }}
      - name: Vercel Deploy
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

### 6.5 Recommended Free Tier Infrastructure

| Service | Recommended Provider |
|---------|---------------------|
| MySQL Database | PlanetScale (5 GB free) or Railway ($5/mo credit) |
| Redis Cache | Upstash (10,000 req/day free) |
| Backend Services | Render (750 hrs/mo free per service) |
| Frontend | Vercel (unlimited on Hobby plan) |
| CI/CD | GitHub Actions (2,000 min/mo free) |
| Monitoring | Render built-in logs + Serilog file sink |

---

## 7. Risks & Improvements

### 7.1 Critical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stored XSS via HTML email body | 🔴 CRITICAL | Add server-side HTML sanitization (HtmlAgilityPack) before storing/sending any email body |
| `gmailmanager.db` in git history | 🔴 HIGH | Run BFG Repo Cleaner or `git-filter-repo` to purge the binary from all historical commits |
| JWT secret fallback in development | 🔴 HIGH | Remove the fallback secret; require developers to configure `dotnet user-secrets` even locally |
| No HTML sanitization on bulk email | 🔴 HIGH | Implement an allowlist HTML sanitizer before any email is dispatched |
| Microservice migration breaks active sessions | 🟡 MEDIUM | Route `/api/v1/` to new services; keep `/api/` prefix on monolith as fallback during transition |
| Email over-fetching from Gmail API | 🟡 MEDIUM | Replace the `while/safety-counter` pattern with a single page fetch + explicit pagination UI |
| MSAL library increases bundle size | 🟢 LOW | Remove unused `@azure/msal-*` packages — saves ~180 KB from the JS bundle |

---

### 7.2 Recommended Improvements

- **Add integration tests** using xUnit + EF Core InMemory or Testcontainers (MySQL). Currently **zero tests** exist in the backend.
- **Add React Testing Library tests** for key features (account selection, bulk email, campaign creation).
- **Implement DKIM/SPF validation checks** before any email is sent via the Gmail API.
- **Add suppression list check as middleware** in `BulkEmailWorker` before each individual send.
- **Introduce OpenTelemetry tracing** across all services for distributed request tracing.
- **Add rate limiting per-user** (not just per-IP) on email send endpoints to prevent abuse.
- **Replace `TagsJson`** (serialized JSON string) with a proper many-to-many `Tag` entity in the database.
- **Add keyset pagination** instead of `OFFSET/TAKE` for large contact lists (10,000+ records).
- **Add EF Core navigation properties** between `Contact` → `CrmTasks`, `Contact` → `CrmNotes`, etc. for cleaner queries.
- **Introduce a proper segment evaluation engine** — the current `SegmentEntity.FilterJson` is stored but **never evaluated anywhere**.
- **Add email preview rendering** that applies a safe iframe-sandboxed HTML preview rather than raw HTML output.
- **Consider migrating from Create React App to Vite** for dramatically faster development builds and a supported build tool (CRA is unmaintained as of 2024).

---

### 7.3 Immediate Action Items (Week 1)

Before any structural refactoring, these security and hygiene issues must be addressed:

1. **🔴 URGENT** — Remove `gmailmanager.db` from git history and add to `.gitignore`.
2. **🔴 URGENT** — Add HTML sanitization to all email send/forward/bulk-send endpoints.
3. **🔴 HIGH** — Move all secrets to Render environment variables. Verify no secrets remain in `appsettings.json`.
4. **🔴 HIGH** — Remove the dev JWT secret fallback from `Program.cs`.
5. **🟡 HIGH** — Delete the 3 unused npm packages and rebuild to reduce bundle size (~180 KB savings).
6. **🟡 MEDIUM** — Add `/api/v1/` versioning prefix to all routes.

---

> **Summary**: The codebase is functionally complete and has good infrastructure foundations (Serilog, rate limiting, health checks, JWT, EF Core migrations). The primary issues are architectural — a God-Object controller, missing service layer, and monolith deployment — rather than fundamental code quality problems. The refactoring path is well-defined and can be executed incrementally over **2–3 weeks** without breaking existing functionality.
