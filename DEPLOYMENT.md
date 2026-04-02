# Gmail Manager - Production Deployment Guide

## 📦 Build Production Artifacts

### Option 1: Standard Build (Recommended for most deployments)

**Windows:**
```batch
BUILD.bat
```

**Linux/Mac:**
```bash
chmod +x BUILD.ps1
./BUILD.ps1
```

**Build Options:**
- `BUILD.bat` or `.\BUILD.ps1` - Build both frontend and backend
- `BUILD.bat --frontend-only` or `.\BUILD.ps1 -FrontendOnly` - Build frontend only
- `BUILD.bat --backend-only` or `.\BUILD.ps1 -BackendOnly` - Build backend only
- `.\BUILD.ps1 -Docker` - Build Docker images

### Option 2: Docker Build

```bash
# Build Docker images
./BUILD.ps1 -Docker

# Or manually
docker build -t gmailmanager-api:latest -f backend/services/GmailManager.Api/Dockerfile .
docker build -t gmailmanager-frontend:latest -f frontend/Dockerfile frontend/
```

---

## 🌐 Frontend Deployment

### Build Output
- **Location:** `frontend/dist/`
- **Type:** Static files (HTML, CSS, JS)
- **Server:** Any static file server (Nginx, Apache, Vercel, Netlify, Cloudflare Pages)

### Environment Variables

Create `.env.production` in `frontend/` directory:

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
```

Or set during build:
```bash
cd frontend
VITE_API_URL=https://api.yourdomain.com/api/v1 npm run build
```

### Deployment Options

#### 1. Nginx (Recommended)

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/gmail-manager;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Deployment:**
```bash
# Copy build files
scp -r frontend/dist/* server:/var/www/gmail-manager/

# Restart Nginx
ssh server "sudo systemctl restart nginx"
```

#### 2. Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
```

**vercel.json** (already included):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "env": {
    "VITE_API_URL": "https://api.yourdomain.com/api/v1"
  }
}
```

#### 3. Netlify

```bash
cd frontend
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**netlify.toml:**
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_API_URL = "https://api.yourdomain.com/api/v1"
```

---

## 🚀 Backend Deployment

### Build Output
- **Location:** `publish/api/`
- **Type:** .NET 9.0 application
- **Runtime:** .NET 9.0 Runtime or Docker

### Required Environment Variables

```bash
# Database
MYSQL_CONNECTION_STRING="Server=your-db;Port=3306;Database=gmailmanager;User=user;Password=pwd;SslMode=Required"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="https://api.yourdomain.com/api/v1/auth/google-callback"

# JWT Authentication
JWT_SECRET="your-secure-random-secret-minimum-32-chars"
JWT_ISSUER="GmailManager"
JWT_AUDIENCE="GmailManagerClient"
JWT_EXPIRY_HOURS="1"

# CORS
CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Frontend URL
FRONTEND_URL="https://yourdomain.com"

# Optional: Redis Cache
REDIS_CONNECTION_STRING="your-redis-host:6379,password=your-password,ssl=True"

# ASP.NET Core
ASPNETCORE_ENVIRONMENT="Production"
ASPNETCORE_URLS="http://+:8080"
```

### Deployment Options

#### 1. Docker (Recommended)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    image: gmailmanager-api:latest
    ports:
      - "8080:8080"
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      MYSQL_CONNECTION_STRING: "${MYSQL_CONNECTION_STRING}"
      GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID}"
      GOOGLE_CLIENT_SECRET: "${GOOGLE_CLIENT_SECRET}"
      GOOGLE_REDIRECT_URI: "${GOOGLE_REDIRECT_URI}"
      JWT_SECRET: "${JWT_SECRET}"
      CORS_ALLOWED_ORIGINS: "${CORS_ALLOWED_ORIGINS}"
      FRONTEND_URL: "${FRONTEND_URL}"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    image: gmailmanager-frontend:latest
    ports:
      - "80:80"
    restart: unless-stopped
```

**Deploy:**
```bash
# Build images
./BUILD.ps1 -Docker

# Create .env file with your variables
vi .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### 2. Linux Server (systemd)

**Setup:**
```bash
# Install .NET 9.0 Runtime
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --runtime aspnetcore --version 9.0

# Copy application files
scp -r publish/api/* server:/var/www/gmailmanager-api/

# Create systemd service
sudo nano /etc/systemd/system/gmailmanager-api.service
```

**/etc/systemd/system/gmailmanager-api.service:**
```ini
[Unit]
Description=Gmail Manager API
After=network.target

[Service]
Type=notify
WorkingDirectory=/var/www/gmailmanager-api
ExecStart=/usr/bin/dotnet /var/www/gmailmanager-api/GmailManager.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=gmailmanager-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://+:8080
EnvironmentFile=/var/www/gmailmanager-api/.env

[Install]
WantedBy=multi-user.target
```

**Start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable gmailmanager-api
sudo systemctl start gmailmanager-api
sudo systemctl status gmailmanager-api
```

#### 3. Render.com

1. Create new **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `dotnet publish backend/services/GmailManager.Api/GmailManager.Api.csproj -c Release -o publish`
   - **Start Command:** `dotnet publish/GmailManager.Api.dll`
   - **Environment:** Add all required environment variables
   - **Port:** 8080

#### 4. Azure App Service

```bash
# Install Azure CLI
az login

# Create resource group
az group create --name gmail-manager --location eastus

# Create App Service plan
az appservice plan create --name gmail-manager-plan --resource-group gmail-manager --sku B1 --is-linux

# Create web app
az webapp create --name gmail-manager-api --resource-group gmail-manager --plan gmail-manager-plan --runtime "DOTNETCORE:9.0"

# Deploy
cd publish/api
zip -r app.zip .
az webapp deployment source config-zip --resource-group gmail-manager --name gmail-manager-api --src app.zip

# Configure environment variables
az webapp config appsettings set --resource-group gmail-manager --name gmail-manager-api --settings GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..." # ... add all vars
```

---

## 🗄️ Database Setup

### MySQL Production Setup

```sql
-- Create database
CREATE DATABASE gmailmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'gmailmanager'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON gmailmanager.* TO 'gmailmanager'@'%';
FLUSH PRIVILEGES;
```

### Managed Database Providers

- **PlanetScale:** Free tier, auto-scaling
- **AWS RDS:** MySQL 8.0+
- **Azure Database for MySQL:** Flexible Server
- **DigitalOcean Managed MySQL:** $15/month

Connection string format:
```
Server=host;Port=3306;Database=gmailmanager;User=user;Password=pwd;SslMode=Required
```

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   ```
   https://api.yourdomain.com/api/v1/auth/google-callback
   ```
4. Save Client ID and Client Secret
5. Set environment variables:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-secret
   GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/google-callback
   ```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Liveness (process is running)
curl http://api.yourdomain.com/health/live

# Readiness (database & cache are available)
curl http://api.yourdomain.com/health/ready
```

### Logs

Backend logs are structured JSON (Serilog):
- **Console:** JSON format
- **Files:** `logs/app-{Date}.log` (rotated daily, kept for 14 days)

**View logs:**
```bash
# Docker
docker-compose logs -f api

# Systemd
journalctl -u gmailmanager-api -f

# Files
tail -f /var/www/gmailmanager-api/logs/app-$(date +%Y%m%d).log
```

---

## 🔄 Updates & Rollback

### Update Application

```bash
# Pull latest code
git pull

# Build new version
./BUILD.ps1

# Docker: Rebuild and restart
docker-compose down
./BUILD.ps1 -Docker
docker-compose up -d

# Systemd: Copy files and restart
scp -r publish/api/* server:/var/www/gmailmanager-api/
ssh server "sudo systemctl restart gmailmanager-api"
```

### Rollback

```bash
# Docker: Use previous image tag
docker-compose down
docker run gmailmanager-api:previous-tag

# Systemd: Restore from backup
ssh server "sudo systemctl stop gmailmanager-api"
scp -r backup/api/* server:/var/www/gmailmanager-api/
ssh server "sudo systemctl start gmailmanager-api"
```

---

## 🛡️ Security Checklist

- [ ] Use HTTPS for all endpoints (frontend + backend)
- [ ] Set strong JWT_SECRET (minimum 32 characters, random)
- [ ] Enable CORS only for your domains
- [ ] Use secure database credentials
- [ ] Enable SSL for database connection
- [ ] Set ASPNETCORE_ENVIRONMENT=Production
- [ ] Review and configure rate limiting settings
- [ ] Keep .NET runtime and packages updated
- [ ] Use Redis in production (not in-memory cache)
- [ ] Regular database backups
- [ ] Monitor logs for security incidents

---

## 📞 Support & Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure CORS_ALLOWED_ORIGINS matches your frontend domain
- Include protocol (https://) and no trailing slash

**2. Database Connection**
- Check connection string format
- Verify firewall rules allow connection
- Enable SSL if required by provider

**3. JWT Authentication Fails**
- Verify JWT_SECRET is set and matches across deployments
- Check JWT_ISSUER and JWT_AUDIENCE match configuration
- Ensure time sync on server (JWT expiry depends on time)

**4. Google OAuth Fails**
- Verify redirect URI matches Google Console exactly
- Check Client ID and Secret are correct
- Ensure OAuth consent screen is published

### Get Help

- Check logs: `docker-compose logs -f` or `journalctl -u gmailmanager-api -f`
- Health check: `curl http://api.yourdomain.com/health/ready`
- Swagger UI: `https://api.yourdomain.com/swagger`
- Review configuration in `appsettings.Production.json`

---

## 📝 Production Checklist

- [ ] Frontend built and deployed with correct VITE_API_URL
- [ ] Backend built and deployed
- [ ] Database created and connection string configured
- [ ] Google OAuth credentials configured
- [ ] JWT secret set (strong random string)
- [ ] CORS configured with production domains
- [ ] Frontend URL configured in backend
- [ ] SSL/TLS certificates installed
- [ ] Health checks responding
- [ ] Logs configured and rotating
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Performance tested

---

**🎉 Your Gmail Manager application is now production-ready!**
