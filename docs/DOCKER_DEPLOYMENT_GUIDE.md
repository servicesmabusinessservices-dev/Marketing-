# Docker Deployment Guide - Production Ready

Complete guide for deploying the GmailManager monorepo using Docker with proper separation of concerns.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Backend Deployment (Render)](#backend-deployment-render)
- [Frontend Deployment Options](#frontend-deployment-options)
- [Environment Variables](#environment-variables)
- [Local Testing](#local-testing)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │────────▶│   Backend    │                  │
│  │   (Vercel)   │  HTTPS  │   (Render)   │                  │
│  │  React SPA   │         │  .NET 9 API  │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│                          ┌────────┴────────┐                │
│                          │                 │                │
│                    ┌─────▼─────┐    ┌─────▼─────┐          │
│                    │   MySQL   │    │   Redis   │          │
│                    │(PlanetScale)│  │ (Upstash) │          │
│                    └───────────┘    └───────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- ✅ Separate deployment for frontend and backend
- ✅ Optimized Docker images with multi-stage builds
- ✅ Non-root user for security
- ✅ Health checks for monitoring
- ✅ Proper layer caching for fast builds

---

## 🚀 Backend Deployment (Render)

### Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Database**: MySQL instance (PlanetScale, Railway, or Render PostgreSQL)
3. **Redis**: Upstash Redis instance (free tier available)
4. **Google OAuth**: Client ID and Secret from Google Cloud Console

### Step 1: Prepare Your Repository

Ensure these files exist in your repository:
- ✅ [`backend/Dockerfile`](../backend/Dockerfile)
- ✅ [`backend/.dockerignore`](../backend/.dockerignore)

### Step 2: Create Web Service on Render

1. **Go to Render Dashboard** → Click "New +" → Select "Web Service"

2. **Connect Repository**
   - Connect your GitHub/GitLab repository
   - Select the repository containing your monorepo

3. **Configure Service**

   | Setting | Value |
   |---------|-------|
   | **Name** | `gmailmanager-api` |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` or `deploy` |
   | **Root Directory** | `backend` |
   | **Environment** | `Docker` |
   | **Dockerfile Path** | `Dockerfile` |
   | **Docker Build Context Directory** | `backend` |

4. **Instance Type**
   - Start with **Free** tier for testing
   - Upgrade to **Starter** ($7/month) for production

### Step 3: Configure Environment Variables

In Render Dashboard → Your Service → Environment:

#### Required Variables

```bash
# ─── ASP.NET Core Configuration ───────────────────────────────────
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

# ─── Database Connection ──────────────────────────────────────────
ConnectionStrings__DefaultConnection=Server=YOUR_MYSQL_HOST;Port=3306;Database=gmailmanager;User=YOUR_USER;Password=YOUR_PASSWORD;SslMode=Required;

# ─── Redis Cache ──────────────────────────────────────────────────
ConnectionStrings__Redis=YOUR_UPSTASH_REDIS_URL

# ─── JWT Authentication ───────────────────────────────────────────
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MIN_32_CHARS

# ─── Google OAuth ─────────────────────────────────────────────────
GoogleAuth__ClientId=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GoogleAuth__ClientSecret=YOUR_GOOGLE_CLIENT_SECRET
GoogleAuth__RedirectUri=https://gmailmanager-api.onrender.com/api/v1/auth/google-callback

# ─── CORS Configuration ───────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com

# ─── Frontend URL (for redirects) ─────────────────────────────────
FrontendUrl=https://your-frontend.vercel.app
```

#### Optional Variables

```bash
# ─── Logging ──────────────────────────────────────────────────────
Serilog__MinimumLevel__Default=Information
Serilog__MinimumLevel__Override__Microsoft=Warning

# ─── Rate Limiting ────────────────────────────────────────────────
RateLimiting__PermitLimit=100
RateLimiting__Window=60

# ─── Email Settings ───────────────────────────────────────────────
Email__MaxBulkSize=100
Email__DefaultPageSize=50
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Build the Docker image using [`backend/Dockerfile`](../backend/Dockerfile)
   - Deploy the container
   - Assign a URL: `https://gmailmanager-api.onrender.com`

3. **Monitor Deployment**
   - Check "Logs" tab for build progress
   - Wait for "Live" status (first build takes 5-10 minutes)

### Step 5: Verify Deployment

Test your API endpoints:

```bash
# Health check
curl https://gmailmanager-api.onrender.com/health

# API info
curl https://gmailmanager-api.onrender.com/api/v1/info
```

---

## 🎨 Frontend Deployment Options

### Option A: Vercel (Recommended) ⭐

**Advantages:**
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Instant deployments
- ✅ Free tier generous

#### Steps:

1. **Go to [vercel.com](https://vercel.com)** → Sign up/Login

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your Git repository

3. **Configure Project**

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Create React App |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `build` |
   | **Install Command** | `npm ci` |

4. **Environment Variables**

   ```bash
   VITE_API_URL=https://gmailmanager-api.onrender.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel assigns URL: `https://your-project.vercel.app`
   - Configure custom domain in Settings

6. **Update Backend CORS**
   - Go back to Render
   - Update `CORS_ALLOWED_ORIGINS` with your Vercel URL
   - Update `GoogleAuth__RedirectUri` if needed

---

### Option B: Docker on Render

**Use when:**
- You need more control over the web server
- You want to serve from the same platform as backend
- You need custom Nginx configuration

#### Steps:

1. **Create New Web Service** on Render

2. **Configure Service**

   | Setting | Value |
   |---------|-------|
   | **Name** | `gmailmanager-frontend` |
   | **Root Directory** | `frontend` |
   | **Environment** | `Docker` |
   | **Dockerfile Path** | `Dockerfile` |

3. **Environment Variables**

   ```bash
   VITE_API_URL=https://gmailmanager-api.onrender.com
   ```

   **Note:** Build-time variable, requires rebuild to change

4. **Deploy**
   - Render builds using [`frontend/Dockerfile`](../frontend/Dockerfile)
   - Serves via Nginx on port 80
   - URL: `https://gmailmanager-frontend.onrender.com`

---

## 🔐 Environment Variables

### Backend Environment Variables Explained

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `ASPNETCORE_ENVIRONMENT` | Runtime environment | `Production` | ✅ |
| `ASPNETCORE_URLS` | Binding URLs | `http://+:8080` | ✅ |
| `ConnectionStrings__DefaultConnection` | MySQL connection | `Server=...;Database=...` | ✅ |
| `ConnectionStrings__Redis` | Redis connection | `redis://...` | ✅ |
| `JWT_SECRET` | JWT signing key | Min 32 chars | ✅ |
| `GoogleAuth__ClientId` | OAuth client ID | `xxx.apps.googleusercontent.com` | ✅ |
| `GoogleAuth__ClientSecret` | OAuth secret | From Google Console | ✅ |
| `GoogleAuth__RedirectUri` | OAuth callback | `https://api.../auth/callback` | ✅ |
| `CORS_ALLOWED_ORIGINS` | Allowed origins | Comma-separated URLs | ✅ |
| `FrontendUrl` | Frontend URL | For redirects | ✅ |

### Frontend Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com` | ✅ |

**Important Notes:**
- Frontend env vars are **build-time** only
- Must start with `VITE_`
- Embedded in JavaScript bundle
- Requires rebuild to change

---

## 🧪 Local Testing

### Test Backend Docker Build

```bash
# Navigate to project root
cd c:/EmailMultiAccountApp

# Build backend image
docker build -t gmailmanager-api -f backend/Dockerfile backend/

# Run with environment variables
docker run -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e ConnectionStrings__DefaultConnection="Server=localhost;Database=test;User=root;Password=pass;" \
  -e JWT_SECRET="your-local-jwt-secret-min-32-characters" \
  gmailmanager-api

# Test
curl http://localhost:8080/health
```

### Test Frontend Docker Build

```bash
# Build frontend image
docker build -t gmailmanager-frontend \
  --build-arg VITE_API_URL=http://localhost:8080 \
  -f frontend/Dockerfile frontend/

# Run
docker run -p 3000:80 gmailmanager-frontend

# Open browser
start http://localhost:3000
```

### Test with Docker Compose (Optional)

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Server=mysql;Database=gmailmanager;User=root;Password=password;
      - JWT_SECRET=local-development-secret-key-min-32-chars
    depends_on:
      - mysql
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=http://localhost:8080
    ports:
      - "3000:80"
    depends_on:
      - backend

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=gmailmanager
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

Run: `docker-compose up`

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **Build Fails: "Project reference not found"**

**Problem:** Missing project reference in Dockerfile

**Solution:** Ensure [`backend/Dockerfile`](../backend/Dockerfile) copies all referenced projects:
```dockerfile
COPY services/GmailManager.Marketing/ services/GmailManager.Marketing/
```

#### 2. **Build Fails: "COPY failed: no such file or directory"**

**Problem:** Incorrect build context or paths

**Solution:** 
- Verify Root Directory is set to `backend` in Render
- Check paths in Dockerfile are relative to `backend/`
- Ensure `.dockerignore` doesn't exclude needed files

#### 3. **Container Starts but API Returns 500**

**Problem:** Missing or incorrect environment variables

**Solution:**
- Check all required env vars are set in Render
- Verify database connection string is correct
- Check logs: Render Dashboard → Logs tab

#### 4. **CORS Errors in Frontend**

**Problem:** Backend not allowing frontend origin

**Solution:**
- Add frontend URL to `CORS_ALLOWED_ORIGINS`
- Format: `https://your-app.vercel.app` (no trailing slash)
- Restart backend service after changing

#### 5. **Frontend Shows "API URL undefined"**

**Problem:** Environment variable not set during build

**Solution:**
- Vercel: Set `VITE_API_URL` in project settings
- Docker: Pass `--build-arg VITE_API_URL=...`
- Rebuild/redeploy frontend

#### 6. **Health Check Fails**

**Problem:** Health endpoint not responding

**Solution:**
- Check if app is listening on correct port (8080)
- Verify `ASPNETCORE_URLS=http://+:8080`
- Check database connectivity in health check

#### 7. **Slow Build Times**

**Problem:** Docker not caching layers efficiently

**Solution:**
- Ensure `.dockerignore` excludes `bin/`, `obj/`, `node_modules/`
- Don't change `.csproj` files unnecessarily
- Use Render's build cache (automatic)

---

## 📊 Performance Optimization

### Backend Optimization

1. **Enable Response Compression**
   - Already configured in [`Program.cs`](../backend/services/GmailManager.Api/Program.cs)

2. **Use Redis Caching**
   - Configure Redis connection string
   - Cache frequently accessed data

3. **Database Connection Pooling**
   - MySQL connector handles this automatically
   - Adjust `MaxPoolSize` if needed

### Frontend Optimization

1. **Nginx Caching** (Docker deployment)
   - Static assets cached for 1 year
   - Configured in [`frontend/Dockerfile`](../frontend/Dockerfile)

2. **Vercel Edge Network** (Vercel deployment)
   - Automatic global CDN
   - Zero configuration needed

---

## 🔒 Security Best Practices

### ✅ Implemented

- Non-root user in Docker containers
- HTTPS enforced (Render/Vercel automatic)
- Security headers in Nginx config
- Environment variables for secrets
- `.dockerignore` excludes sensitive files

### 🔐 Additional Recommendations

1. **Rotate Secrets Regularly**
   - JWT_SECRET
   - Database passwords
   - OAuth secrets

2. **Enable Render's DDoS Protection**
   - Available on paid plans

3. **Use Render's Private Networking**
   - Connect services without exposing to internet

4. **Monitor Logs**
   - Set up log aggregation (Datadog, Sentry)
   - Alert on errors

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [ASP.NET Core Deployment](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/)

---

## 🆘 Support

If you encounter issues:

1. Check logs in Render/Vercel dashboard
2. Verify all environment variables are set
3. Test Docker build locally first
4. Review this guide's troubleshooting section

---

**Last Updated:** 2026-03-27  
**Version:** 1.0.0
