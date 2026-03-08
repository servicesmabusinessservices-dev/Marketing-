# Gmail Multi-Account Manager - Setup Guide

## 🎯 Project Overview
Full-stack Gmail management system with:
- **Backend**: ASP.NET Core Web API (.NET 9)
- **Frontend**: React
- **Authentication**: Google OAuth 2.0
- **Email API**: Gmail API

---

## 📋 Prerequisites
- .NET 9 SDK
- Node.js (v16+)
- Google Cloud Account

---

## 🔐 STEP 1: Google Cloud Setup

### 1.1 Create Google Cloud Project
1. Go to: https://console.cloud.google.com
2. Click **"New Project"**
3. Name: `Gmail Manager`
4. Click **Create**

### 1.2 Enable Gmail API
1. Go to **APIs & Services** → **Library**
2. Search for **"Gmail API"**
3. Click **Enable**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth Client ID**
3. Configure consent screen (if prompted):
   - User Type: **External**
   - App name: `Gmail Manager`
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Skip for now
   - Test users: Add your Gmail address
   - Click **Save and Continue**

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Gmail Manager Web`
   - Authorized redirect URIs:
     ```
     https://localhost:5001/api/auth/google-callback
     ```
   - Click **Create**

5. **SAVE THESE VALUES**:
   - Client ID: `YOUR_CLIENT_ID`
   - Client Secret: `YOUR_CLIENT_SECRET`

---

## 🏗️ STEP 2: Backend Setup

### 2.1 Configure appsettings.json
Open `GmailManager.Api/appsettings.json` and update:

```json
{
  "GoogleAuth": {
    "ClientId": "YOUR_GOOGLE_CLIENT_ID_HERE",
    "ClientSecret": "YOUR_GOOGLE_CLIENT_SECRET_HERE",
    "RedirectUri": "https://localhost:5001/api/auth/google-callback"
  },
  "Jwt": {
    "Secret": "YourSuperSecretKeyMinimum32Characters!",
    "Issuer": "GmailManager",
    "Audience": "GmailManagerClient"
  }
}
```

### 2.2 Run Backend
```bash
cd GmailManager.Api
dotnet run
```

Backend will start at: `https://localhost:5001`

---

## ⚛️ STEP 3: Frontend Setup

### 3.1 Install Dependencies
```bash
cd email-app
npm install
```

### 3.2 Run Frontend
```bash
npm start
```

Frontend will start at: `http://localhost:3000`

---

## 🚀 STEP 4: Test the Application

### 4.1 Login Flow
1. Open browser: `http://localhost:3000`
2. Click **"Sign in with Google"**
3. You'll be redirected to Google OAuth consent screen
4. Select your Gmail account
5. Grant permissions (Gmail read/send)
6. You'll be redirected back to the app

### 4.2 Features to Test
- ✅ View inbox emails (paginated)
- ✅ Click email to view details
- ✅ Reply to emails
- ✅ Refresh inbox
- ✅ Dark/Light theme toggle
- ✅ Logout

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | GET | Get Google OAuth URL |
| `/api/auth/google-callback` | GET | OAuth callback handler |
| `/api/email/list` | GET | List emails (paginated) |
| `/api/email/{id}` | GET | Get email details |
| `/api/email/send` | POST | Send email |

---

## 🔧 Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the redirect URI in Google Cloud Console exactly matches:
```
https://localhost:5001/api/auth/google-callback
```

### Issue: "Access blocked: This app's request is invalid"
**Solution**: 
1. Go to Google Cloud Console → OAuth consent screen
2. Add your email to **Test users**
3. Make sure Gmail API is enabled

### Issue: Backend CORS error
**Solution**: Check `appsettings.json` has correct frontend URL:
```json
"Cors": {
  "AllowedOrigins": ["http://localhost:3000"]
}
```

### Issue: SSL Certificate error
**Solution**: Trust the development certificate:
```bash
dotnet dev-certs https --trust
```

---

## 🎨 Project Structure

```
EmailMultiAccountApp/
├── GmailManager.Api/              # Backend (.NET)
│   ├── Controllers/
│   │   ├── AuthController.cs     # OAuth login & callback
│   │   └── EmailController.cs    # Email operations
│   ├── Models/
│   │   └── SendEmailRequest.cs
│   ├── Program.cs                # App configuration
│   └── appsettings.json          # Configuration
│
└── email-app/                     # Frontend (React)
    ├── src/
    │   ├── components/
    │   │   ├── AccountSelection.js
    │   │   ├── EmailList.js
    │   │   └── EmailDetail.js
    │   ├── services/
    │   │   └── gmailService.js   # API calls
    │   ├── config/
    │   │   └── authConfig.js     # API config
    │   └── App.js
    └── package.json
```

---

## 🔒 Security Notes

1. **Never commit credentials**: Add to `.gitignore`:
   ```
   appsettings.json
   appsettings.Development.json
   ```

2. **Production deployment**:
   - Use environment variables for secrets
   - Update redirect URI in Google Console
   - Enable HTTPS
   - Use secure JWT secret (32+ characters)

3. **Token storage**: Currently using in-memory cache (development only)
   - For production: Use database or Redis

---

## 📦 Deployment (Optional)

### Azure App Service
1. Publish backend:
   ```bash
   dotnet publish -c Release
   ```

2. Deploy to Azure App Service

3. Update Google Cloud Console redirect URI:
   ```
   https://your-app.azurewebsites.net/api/auth/google-callback
   ```

4. Update frontend `authConfig.js`:
   ```javascript
   export const API_BASE_URL = 'https://your-app.azurewebsites.net/api';
   ```

---

## 💡 Next Steps

- [ ] Add database for token persistence
- [ ] Implement refresh token rotation
- [ ] Add email search functionality
- [ ] Support attachments
- [ ] Add email compose (not just reply)
- [ ] Multi-account switching
- [ ] Email labels/folders

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal for logs
3. Verify Google Cloud Console settings
4. Ensure all packages are installed

---

## ✅ Success Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth credentials created
- [ ] Backend running on https://localhost:5001
- [ ] Frontend running on http://localhost:3000
- [ ] Can login with Google
- [ ] Can view emails
- [ ] Can send replies

---

**🎉 You're all set! Enjoy your Gmail Manager!**
