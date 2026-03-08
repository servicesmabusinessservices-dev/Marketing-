# 🚀 QUICK START GUIDE - Gmail Multi-Account Manager

## ⚡ 3 SIMPLE STEPS TO GET STARTED

---

## 📋 STEP 1: Google Cloud Setup (5 minutes)

### 1.1 Create Google Cloud Project
1. Open browser and go to: **https://console.cloud.google.com**
2. Click **"Select a project"** (top left)
3. Click **"NEW PROJECT"**
4. Enter project name: **Gmail Manager**
5. Click **"CREATE"**
6. Wait for project to be created (30 seconds)

### 1.2 Enable Gmail API
1. In the search bar at top, type: **Gmail API**
2. Click on **"Gmail API"** result
3. Click **"ENABLE"** button
4. Wait for it to enable (10 seconds)

### 1.3 Configure OAuth Consent Screen
1. Click hamburger menu (☰) → **APIs & Services** → **OAuth consent screen**
2. Select **"External"**
3. Click **"CREATE"**
4. Fill in:
   - App name: **Gmail Manager**
   - User support email: **Your email**
   - Developer contact: **Your email**
5. Click **"SAVE AND CONTINUE"**
6. On Scopes page: Click **"SAVE AND CONTINUE"** (skip)
7. On Test users page: Click **"+ ADD USERS"**
8. Enter **your Gmail address**
9. Click **"ADD"**
10. Click **"SAVE AND CONTINUE"**

### 1.4 Create OAuth Credentials
1. Click **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: Select **"Web application"**
4. Name: **Gmail Manager Web**
5. Under **"Authorized redirect URIs"**:
   - Click **"+ ADD URI"**
   - Paste: `https://localhost:5001/api/auth/google-callback`
6. Click **"CREATE"**
7. **IMPORTANT**: Copy and save:
   - ✅ **Client ID** (looks like: 123456789-abc.apps.googleusercontent.com)
   - ✅ **Client Secret** (looks like: GOCSPX-abc123...)

---

## 🔧 STEP 2: Configure Backend

### 2.1 Open Configuration File
1. Open folder: `c:\EmailMultiAccountApp\GmailManager.Api`
2. Open file: **appsettings.json**

### 2.2 Paste Your Credentials
Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with values from Step 1.4:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "GoogleAuth": {
    "ClientId": "PASTE_YOUR_CLIENT_ID_HERE",
    "ClientSecret": "PASTE_YOUR_CLIENT_SECRET_HERE",
    "RedirectUri": "https://localhost:5001/api/auth/google-callback"
  },
  "Jwt": {
    "Secret": "YourSuperSecretKeyMinimum32Characters!",
    "Issuer": "GmailManager",
    "Audience": "GmailManagerClient"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

### 2.3 Save the File
Press **Ctrl + S** to save

---

## ▶️ STEP 3: Run the Application

### 3.1 Start Backend Server

**Option A - Using Command Prompt:**
1. Press **Windows Key + R**
2. Type: `cmd` and press Enter
3. Copy and paste:
```bash
cd c:\EmailMultiAccountApp\GmailManager.Api
dotnet run --launch-profile https
```
4. Wait for: **"Now listening on: https://localhost:5001"**
5. **Keep this window open!**

**Option B - Using Visual Studio Code:**
1. Open folder: `c:\EmailMultiAccountApp\GmailManager.Api`
2. Open Terminal (Ctrl + `)
3. Type: `dotnet run --launch-profile https`
4. Wait for: **"Now listening on: https://localhost:5001"**

### 3.2 Start Frontend (React)

**Open a NEW Command Prompt:**
1. Press **Windows Key + R**
2. Type: `cmd` and press Enter
3. Copy and paste:
```bash
cd c:\EmailMultiAccountApp\email-app
npm install
npm start
```
4. Wait for browser to open automatically at **http://localhost:3000**

---

## ✅ TESTING THE APP

### What You Should See:

**1. Login Page** (http://localhost:3000)
- Beautiful gradient background (purple/blue)
- "Welcome to Gmail Hub" heading
- "🔐 Sign in with Google" button

**2. Click "Sign in with Google"**
- Redirects to Google login page
- Select your Gmail account
- Click "Allow" to grant permissions

**3. Email List Page**
- See your Gmail inbox
- Beautiful glassmorphism cards
- Email count badge
- Theme toggle button
- Logout button

**4. Click Any Email**
- View full email content
- Click "Reply" button
- Type message and send

---

## 🐛 TROUBLESHOOTING

### Problem: Backend won't start
**Solution:**
```bash
cd c:\EmailMultiAccountApp\GmailManager.Api
dotnet dev-certs https --trust
```
Click "Yes" when prompted, then run `dotnet run` again

### Problem: "Redirect URI mismatch" error
**Solution:**
1. Go to Google Cloud Console
2. Check redirect URI is exactly: `https://localhost:5001/api/auth/google-callback`
3. No extra spaces or characters

### Problem: "Access blocked: This app's request is invalid"
**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to "Test users"
3. Make sure your Gmail is added
4. Try logging in again

### Problem: Frontend shows "Network Error"
**Solution:**
1. Make sure backend is running (check Terminal 1)
2. Run backend with HTTPS profile:
```bash
cd c:\EmailMultiAccountApp\GmailManager.Api
dotnet run --launch-profile https
```
3. If HTTPS certificate is not trusted, run:
```bash
dotnet dev-certs https --trust
```
4. Restart backend and try login again

### Problem: npm install fails
**Solution:**
```bash
cd c:\EmailMultiAccountApp\email-app
npm cache clean --force
npm install
```

---

## 📞 NEED MORE HELP?

### Check These Files:
- **Full Setup Guide**: `GMAIL_SETUP_GUIDE.md`
- **API Documentation**: `API_REFERENCE.md`
- **Project Summary**: `PROJECT_SUMMARY.md`

### Verify Setup:
1. ✅ Backend running on https://localhost:5001
2. ✅ Frontend running on http://localhost:3000
3. ✅ Google credentials in appsettings.json
4. ✅ Your Gmail added as test user

---

## 🎉 SUCCESS!

If you can:
- ✅ See the login page
- ✅ Click "Sign in with Google"
- ✅ Login with your Gmail
- ✅ See your inbox

**YOU'RE DONE! Enjoy your Gmail Manager! 🚀**

---

## 📝 QUICK COMMANDS REFERENCE

**Start Backend:**
```bash
cd c:\EmailMultiAccountApp\GmailManager.Api
dotnet run
```

**Start Frontend:**
```bash
cd c:\EmailMultiAccountApp\email-app
npm start
```

**Trust HTTPS Certificate:**
```bash
dotnet dev-certs https --trust
```

**Clean Install Frontend:**
```bash
cd c:\EmailMultiAccountApp\email-app
npm cache clean --force
npm install
npm start
```

---

**Need help? Tell me which step you're stuck on!**
