# Render Configuration Quick Reference

Fast reference for deploying GmailManager to Render.

## 🎯 Backend Service Configuration

### Service Settings

```yaml
Name: gmailmanager-api
Environment: Docker
Region: Oregon (US West) or closest to your users
Branch: main
Root Directory: backend
Dockerfile Path: Dockerfile
Docker Build Context: backend
```

### Build & Deploy

| Setting | Value |
|---------|-------|
| **Build Command** | _(leave empty - handled by Docker)_ |
| **Start Command** | _(leave empty - handled by Docker)_ |
| **Auto-Deploy** | ✅ Yes |

### Instance Type

| Tier | RAM | CPU | Price | Recommendation |
|------|-----|-----|-------|----------------|
| Free | 512 MB | 0.1 CPU | $0 | Testing only |
| Starter | 512 MB | 0.5 CPU | $7/mo | Small production |
| Standard | 2 GB | 1 CPU | $25/mo | Production |

**Recommendation:** Start with **Starter** for production

---

## 🔐 Environment Variables (Backend)

Copy-paste ready configuration:

```bash
# ═══════════════════════════════════════════════════════════════
# REQUIRED - Core Configuration
# ═══════════════════════════════════════════════════════════════

ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

# ═══════════════════════════════════════════════════════════════
# REQUIRED - Database (MySQL)
# ═══════════════════════════════════════════════════════════════
# Get from: PlanetScale, Railway, or Render PostgreSQL
# Format: Server=HOST;Port=3306;Database=DB;User=USER;Password=PASS;SslMode=Required;

ConnectionStrings__DefaultConnection=Server=YOUR_HOST;Port=3306;Database=gmailmanager;User=YOUR_USER;Password=YOUR_PASSWORD;SslMode=Required;

# ═══════════════════════════════════════════════════════════════
# REQUIRED - Redis Cache
# ═══════════════════════════════════════════════════════════════
# Get from: Upstash (free tier available)
# Format: redis://default:PASSWORD@HOST:PORT

ConnectionStrings__Redis=redis://default:YOUR_PASSWORD@YOUR_HOST:PORT

# ═══════════════════════════════════════════════════════════════
# REQUIRED - JWT Authentication
# ═══════════════════════════════════════════════════════════════
# Generate: openssl rand -base64 32

JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MINIMUM_32_CHARACTERS_LONG

# ═══════════════════════════════════════════════════════════════
# REQUIRED - Google OAuth
# ═══════════════════════════════════════════════════════════════
# Get from: Google Cloud Console > APIs & Services > Credentials

GoogleAuth__ClientId=YOUR_CLIENT_ID.apps.googleusercontent.com
GoogleAuth__ClientSecret=YOUR_CLIENT_SECRET
GoogleAuth__RedirectUri=https://gmailmanager-api.onrender.com/api/v1/auth/google-callback

# ═══════════════════════════════════════════════════════════════
# REQUIRED - CORS & Frontend
# ═══════════════════════════════════════════════════════════════
# Comma-separated list of allowed origins (no trailing slash)

CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
FrontendUrl=https://your-frontend.vercel.app

# ═══════════════════════════════════════════════════════════════
# OPTIONAL - Logging
# ═══════════════════════════════════════════════════════════════

Serilog__MinimumLevel__Default=Information
Serilog__MinimumLevel__Override__Microsoft=Warning
Serilog__MinimumLevel__Override__System=Warning

# ═══════════════════════════════════════════════════════════════
# OPTIONAL - Rate Limiting
# ═══════════════════════════════════════════════════════════════

RateLimiting__PermitLimit=100
RateLimiting__Window=60

# ═══════════════════════════════════════════════════════════════
# OPTIONAL - Email Settings
# ═══════════════════════════════════════════════════════════════

Email__MaxBulkSize=100
Email__DefaultPageSize=50
```

---

## 🎨 Frontend Service Configuration (Docker Option)

### Service Settings

```yaml
Name: gmailmanager-frontend
Environment: Docker
Region: Same as backend
Branch: main
Root Directory: frontend
Dockerfile Path: Dockerfile
Docker Build Context: frontend
```

### Environment Variables (Frontend)

```bash
# Build-time variable (embedded in bundle)
REACT_APP_API_URL=https://gmailmanager-api.onrender.com
```

**⚠️ Important:** Changing this requires a rebuild!

---

## 🚀 Vercel Configuration (Recommended for Frontend)

### Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Create React App |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |
| **Install Command** | `npm ci` |
| **Node Version** | 20.x |

### Environment Variables

```bash
REACT_APP_API_URL=https://gmailmanager-api.onrender.com
```

### Custom Domain Setup

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `app.yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. Update backend `CORS_ALLOWED_ORIGINS` with new domain

---

## 🗄️ Database Setup

### Option 1: PlanetScale (Recommended)

**Pros:** MySQL-compatible, generous free tier, automatic backups

1. Sign up at [planetscale.com](https://planetscale.com)
2. Create database: `gmailmanager`
3. Create branch: `main`
4. Get connection string:
   - Format: `mysql://USER:PASSWORD@HOST/DATABASE?sslaccept=strict`
   - Convert to: `Server=HOST;Database=DATABASE;User=USER;Password=PASSWORD;SslMode=Required;`
5. Run migrations:
   ```bash
   # From local machine with connection string
   dotnet ef database update --project backend/services/GmailManager.Api
   ```

### Option 2: Railway

**Pros:** Simple setup, MySQL included

1. Sign up at [railway.app](https://railway.app)
2. New Project → Add MySQL
3. Copy connection string from Variables tab
4. Format for .NET: `Server=HOST;Port=PORT;Database=railway;User=root;Password=PASSWORD;SslMode=Required;`

### Option 3: Render PostgreSQL

**Cons:** Requires switching from MySQL to PostgreSQL

1. Render Dashboard → New → PostgreSQL
2. Update code to use Npgsql instead of Pomelo.EntityFrameworkCore.MySql
3. Update connection string format

---

## 🔴 Redis Setup (Upstash)

1. Sign up at [upstash.com](https://upstash.com)
2. Create Redis database
3. Select region closest to Render service
4. Copy connection string:
   - Format: `redis://default:PASSWORD@HOST:PORT`
5. Paste into `ConnectionStrings__Redis`

---

## 🔑 Google OAuth Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Gmail API**:
   - APIs & Services → Library → Search "Gmail API" → Enable
4. Create OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: `GmailManager Production`

### 2. Configure Authorized Redirect URIs

Add these URIs:

```
https://gmailmanager-api.onrender.com/api/v1/auth/google-callback
https://your-frontend.vercel.app/auth/callback
```

### 3. Copy Credentials

- **Client ID**: `xxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxx`

### 4. Add to Render Environment Variables

```bash
GoogleAuth__ClientId=YOUR_CLIENT_ID.apps.googleusercontent.com
GoogleAuth__ClientSecret=YOUR_CLIENT_SECRET
GoogleAuth__RedirectUri=https://gmailmanager-api.onrender.com/api/v1/auth/google-callback
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Database created and connection string obtained
- [ ] Redis instance created and connection string obtained
- [ ] Google OAuth credentials created
- [ ] JWT secret generated (`openssl rand -base64 32`)
- [ ] All environment variables prepared

### Backend Deployment

- [ ] Create Render Web Service
- [ ] Set Root Directory to `backend`
- [ ] Set Environment to `Docker`
- [ ] Add all environment variables
- [ ] Deploy and wait for "Live" status
- [ ] Test health endpoint: `https://YOUR-SERVICE.onrender.com/health`
- [ ] Test API: `https://YOUR-SERVICE.onrender.com/api/v1/info`

### Frontend Deployment (Vercel)

- [ ] Import project to Vercel
- [ ] Set Root Directory to `frontend`
- [ ] Add `REACT_APP_API_URL` environment variable
- [ ] Deploy
- [ ] Test frontend loads correctly
- [ ] Test API calls work (check browser console)

### Post-Deployment

- [ ] Update backend `CORS_ALLOWED_ORIGINS` with frontend URL
- [ ] Update Google OAuth redirect URIs with production URLs
- [ ] Test complete authentication flow
- [ ] Test email sending functionality
- [ ] Set up monitoring/alerts
- [ ] Configure custom domains (optional)

---

## 🔧 Common Commands

### Generate JWT Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Test Backend Locally

```bash
cd backend
docker build -t gmailmanager-api -f Dockerfile .
docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development gmailmanager-api
```

### Test Frontend Locally

```bash
cd frontend
docker build -t gmailmanager-frontend --build-arg REACT_APP_API_URL=http://localhost:8080 -f Dockerfile .
docker run -p 3000:80 gmailmanager-frontend
```

### View Render Logs

```bash
# Install Render CLI
npm install -g @render-com/cli

# Login
render login

# View logs
render logs -s gmailmanager-api
```

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails with "project not found" | Check Root Directory is `backend`, not root |
| Container starts but crashes | Check logs for missing env vars |
| CORS errors | Add frontend URL to `CORS_ALLOWED_ORIGINS` |
| 500 errors | Check database connection string |
| OAuth fails | Verify redirect URI matches exactly |
| Slow performance | Upgrade from Free to Starter tier |

---

## 📞 Support Resources

- **Render Status**: [status.render.com](https://status.render.com)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [Render Community](https://community.render.com)

---

**Quick Start:** Follow the [Complete Deployment Guide](./DOCKER_DEPLOYMENT_GUIDE.md) for detailed instructions.
