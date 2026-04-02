# Production Build - Quick Reference

## ✅ Build Status

**Frontend:** ✅ Built successfully
- Location: `frontend/dist/`
- Size: ~2.1 MB (gzipped)
- Chunks: Code-split for optimal loading

**Backend:** ✅ Built successfully  
- Location: `publish/api/`
- Runtime: .NET 9.0
- Dependencies: All included

## 🚀 Quick Deploy

### Option 1: Docker (Fastest)

```bash
.\BUILD.ps1 -Docker
docker-compose up -d
```

### Option 2: Manual Build

```bash
# Build everything
.\BUILD.ps1

# Or individually
.\BUILD.ps1 -FrontendOnly
.\BUILD.ps1 -BackendOnly
```

### Option 3: Build via npm/dotnet

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend/services/GmailManager.Api
dotnet publish -c Release -o ../../../publish/api
```

## 📂 Build Artifacts

```
EmailMultiAccountApp/
├── frontend/dist/          # Frontend static files (deploy to CDN/Nginx)
└── publish/api/            # Backend binaries (deploy to server/container)
```

## 🌐 Deployment Targets

| Platform | Frontend | Backend | Difficulty |
|----------|----------|---------|------------|
| **Docker** | ✅ | ✅ | Easy |
| **Vercel** | ✅ | ❌ | Easy |
| **Netlify** | ✅ | ❌ | Easy |
| **Render** | ✅ | ✅ | Medium |
| **Azure** | ✅ | ✅ | Medium |
| **AWS** | ✅ | ✅ | Hard |
| **VPS/Linux** | ✅ | ✅ | Medium |

## ⚙️ Required Environment Variables

**Frontend (build-time):**
```
VITE_API_URL=https://api.yourdomain.com/api/v1
```

**Backend (runtime):**
```
MYSQL_CONNECTION_STRING=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
JWT_SECRET=...
CORS_ALLOWED_ORIGINS=...
FRONTEND_URL=...
```

## 📖 Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Detailed deployment instructions
- Environment variable reference
- Database setup
- SSL/TLS configuration
- Monitoring & troubleshooting
- Security best practices

## 🎯 Next Steps

1. **Configure environment variables** for your production environment
2. **Set up Google OAuth** in Google Cloud Console
3. **Create production database** (MySQL 8.0+)
4. **Deploy frontend** to static hosting (Vercel/Netlify/Nginx)
5. **Deploy backend** to container or server
6. **Test end-to-end** with production URLs
7. **Enable monitoring** and log aggregation

---

**Need help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) or review the logs.
