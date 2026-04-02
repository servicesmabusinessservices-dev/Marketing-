# 🚀 Render Deployment - Automatic Setup Guide

Your application is already configured for automated deployment! Here's what you have and what might need adjustment:

## ✅ What's Already Set Up

### Docker Configuration
- ✅ **Backend Dockerfile** at `backend/services/GmailManager.Api/Dockerfile`
- ✅ **Frontend Dockerfile** at `frontend/Dockerfile`
- ✅ **Docker Compose** for local development at `infra/docker-compose.yml`

### Vercel (Frontend)
- ✅ **Configuration file** at `frontend/vercel.json`
- ✅ **SPA routing** configured

---

## 🔧 What Needs to Be Configured

### 1. Render (Backend) - One-Time Setup

**Create a Web Service on Render:**

1. Go to [https://render.com/](https://render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `gmailmanager-api` |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` or your production branch |
   | **Root Directory** | _(leave empty - repo root)_ |
   | **Environment** | `Docker` |
   | **Dockerfile Path** | `backend/services/GmailManager.Api/Dockerfile` |
   | **Docker Build Context** | `.` (root directory) |
   | **Instance Type** | Free (for testing) or Starter |

5. **Add Environment Variables** (in Render dashboard):

```bash
# Required
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

# Database (Get from your MySQL provider)
MYSQL_CONNECTION_STRING=Server=your-db-host;Port=3306;Database=gmailmanager;User=user;Password=pwd;SslMode=Required

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://YOUR-RENDER-URL.onrender.com/api/v1/auth/google-callback

# JWT (Generate a secure random string, min 32 chars)
JWT_SECRET=your-secure-random-secret-key-minimum-32-characters
JWT_ISSUER=GmailManager
JWT_AUDIENCE=GmailManagerClient
JWT_EXPIRY_HOURS=1

# CORS (Update with your actual frontend URL)
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Frontend URL (Update with your actual frontend URL)
FRONTEND_URL=https://your-frontend.vercel.app
```

6. Click **"Create Web Service"**

**✨ After first deploy, Render will give you a URL like:**
`https://gmailmanager-api.onrender.com`

---

### 2. Vercel (Frontend) - One-Time Setup

**Deploy to Vercel:**

1. Go to [https://vercel.com/](https://vercel.com/)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
   | **Install Command** | `npm install` |

5. **Add Environment Variable:**

```bash
VITE_API_URL=https://YOUR-RENDER-URL.onrender.com/api/v1
```

Replace `YOUR-RENDER-URL` with the actual URL from Render (step 1).

6. Click **"Deploy"**

**✨ Vercel will give you a URL like:**
`https://your-app.vercel.app`

---

### 3. Update CORS & Frontend URL

**After both are deployed:**

1. Go back to **Render dashboard** → Your service → **Environment**
2. Update these variables with actual URLs:

```bash
CORS_ALLOWED_ORIGINS=https://your-actual-vercel-url.vercel.app
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```

3. Render will automatically redeploy

---

### 4. Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add **Authorized redirect URI:**
   ```
   https://YOUR-ACTUAL-RENDER-URL.onrender.com/api/v1/auth/google-callback
   ```
4. Save

---

## 🔄 Automatic Deployments

### After Initial Setup:

✅ **Backend (Render):**
- Push to GitHub → Render automatically builds and deploys
- No manual steps needed!

✅ **Frontend (Vercel):**
- Push to GitHub → Vercel automatically builds and deploys
- No manual steps needed!

---

## 📝 Configuration Checklist

Before deploying, make sure you have:

- [ ] **Database:** MySQL 8.0+ instance (PlanetScale, Railway, or AWS RDS)
- [ ] **Google OAuth:** Client ID & Secret from Google Cloud Console
- [ ] **JWT Secret:** Generated secure random string (min 32 chars)
- [ ] **Render Account:** Connected to GitHub
- [ ] **Vercel Account:** Connected to GitHub

---

## 🐛 Common Issues & Solutions

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution:** Update `CORS_ALLOWED_ORIGINS` in Render with your actual Vercel URL

### Issue: "Google OAuth fails"
**Solution:** 
1. Verify `GOOGLE_REDIRECT_URI` matches the one in Google Cloud Console
2. Ensure redirect URI includes your actual Render URL

### Issue: "Database connection failed"
**Solution:** 
1. Check `MYSQL_CONNECTION_STRING` format
2. Add `;SslMode=Required` if using managed MySQL
3. Verify database accepts connections from Render's IP range

### Issue: "Frontend shows 'Failed to fetch'"
**Solution:** Update `VITE_API_URL` in Vercel to match your Render backend URL

---

## 🎯 Quick Start Commands

Generate a secure JWT secret:
```bash
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | % {[char]$_})

# Bash/Linux
openssl rand -base64 32
```

Test your backend:
```bash
curl https://YOUR-RENDER-URL.onrender.com/health/live
curl https://YOUR-RENDER-URL.onrender.com/health/ready
```

---

## 📚 Additional Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Full Deployment Guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Docker Details:** See [DOCKER_DEPLOYMENT_GUIDE.md](docs/DOCKER_DEPLOYMENT_GUIDE.md)

---

## ✨ Summary

### What Works Automatically:
- ✅ Docker builds (configured)
- ✅ GitHub auto-deploy (once connected)
- ✅ Frontend routing (Vercel config exists)
- ✅ Backend health checks (already in code)

### What You Need to Do Once:
- 🔧 Create Render Web Service (5 minutes)
- 🔧 Create Vercel Project (3 minutes)
- 🔧 Add environment variables (5 minutes)
- 🔧 Update Google OAuth redirect URI (2 minutes)

**Total Setup Time:** ~15 minutes

After that, **every `git push` deploys automatically!** 🚀
