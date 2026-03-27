# Render Deployment Guide

## Services to Create on Render

Each microservice = separate **Web Service** on Render.

| Service | Root Directory | Dockerfile Path | Port |
|---------|---------------|-----------------|------|
| `gmailmanager-gateway` | `infra/gateway` | `Dockerfile` | 80 |
| `gmailmanager-auth` | _(repo root)_ | `backend/services/GmailManager.Auth/Dockerfile` | 8080 |
| `gmailmanager-email` | _(repo root)_ | `backend/services/GmailManager.Email/Dockerfile` | 8080 |
| `gmailmanager-marketing` | _(repo root)_ | `backend/services/GmailManager.Marketing/Dockerfile` | 8080 |
| `gmailmanager-notification` | _(repo root)_ | `backend/services/GmailManager.Notification/Dockerfile` | 8080 |
| `gmailmanager-analytics` | _(repo root)_ | `backend/services/GmailManager.Analytics/Dockerfile` | 8080 |

## Per-Service ENV Variables (Render Dashboard)

### All backend services need:
```
JWT_SECRET=<your-production-jwt-secret>
ConnectionStrings__MySql=Server=<host>;Database=<db>;User=<user>;Password=<pass>;SslMode=Required;
ASPNETCORE_ENVIRONMENT=Production
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Auth + Email + Marketing also need:
```
ConnectionStrings__Redis=<your-upstash-redis-url>
```

### Auth + Email also need:
```
GoogleAuth__ClientId=<your-google-client-id>
GoogleAuth__ClientSecret=<your-google-client-secret>
GoogleAuth__RedirectUri=https://gmailmanager-gateway.onrender.com/api/v1/auth/google-callback
FrontendUrl=https://your-frontend.vercel.app
```

### Gateway needs:
```
AUTH_SERVICE_URL=gmailmanager-auth.onrender.com:443
EMAIL_SERVICE_URL=gmailmanager-email.onrender.com:443
MARKETING_SERVICE_URL=gmailmanager-marketing.onrender.com:443
NOTIFICATION_SERVICE_URL=gmailmanager-notification.onrender.com:443
ANALYTICS_SERVICE_URL=gmailmanager-analytics.onrender.com:443
```

## Deploy Branch

Set each service to deploy from the **`deploy`** branch.

## Database

Use a managed MySQL provider:
- **PlanetScale** (MySQL-compatible, free tier)
- **Railway** (MySQL, free tier)
- **Render PostgreSQL** (requires switching from MySQL to PostgreSQL)

## Redis

Use **Upstash** (serverless Redis, free tier) for session/token caching.

## Vercel (Frontend)

1. Import this Git repo into Vercel
2. Set **Root Directory** to `frontend`
3. Set environment variable:
   ```
   REACT_APP_API_URL=https://gmailmanager-gateway.onrender.com
   ```
4. Deploy from `deploy` branch
