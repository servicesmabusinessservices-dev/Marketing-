# 📧 Gmail Multi-Account Manager

A full-stack application for managing multiple Gmail accounts with a modern, intuitive interface.

## 🚀 Tech Stack

- **Backend**: ASP.NET Core Web API (.NET 9)
- **Frontend**: React 19
- **Authentication**: Google OAuth 2.0
- **Email API**: Gmail API v1
- **Security**: JWT Bearer Tokens

## ✨ Features

- ✅ Google OAuth 2.0 authentication
- ✅ View Gmail inbox with pagination
- ✅ Read email details with full HTML support
- ✅ Reply to emails
- ✅ Send emails to multiple recipients
- ✅ Dark/Light theme toggle
- ✅ Responsive design
- ✅ Secure JWT authentication

## 📁 Project Structure

```
EmailMultiAccountApp/
├── GmailManager.Api/          # ASP.NET Core Backend
│   ├── Controllers/           # API endpoints
│   ├── Models/               # Data models
│   └── Program.cs            # App configuration
│
├── email-app/                # React Frontend
│   └── src/
│       ├── components/       # UI components
│       ├── services/         # API integration
│       └── config/           # Configuration
│
├── GMAIL_SETUP_GUIDE.md      # Complete setup instructions
├── API_REFERENCE.md          # API documentation
├── PROJECT_SUMMARY.md        # Project overview
└── START.bat                 # Quick start script
```

## 🎯 Quick Start

### Prerequisites
- .NET 9 SDK
- Node.js (v16+)
- Google Cloud account

### 1. Google Cloud Setup
1. Create project at https://console.cloud.google.com
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `https://localhost:5001/api/auth/google-callback`
5. Copy Client ID & Secret

### 2. Configure Backend
Edit `GmailManager.Api/appsettings.json`:
```json
{
  "GoogleAuth": {
    "ClientId": "YOUR_CLIENT_ID_HERE",
    "ClientSecret": "YOUR_CLIENT_SECRET_HERE"
  }
}
```

### 3. Run Application

**Option A - Automatic (Windows):**
```bash
START.bat
```

**Backend only (prevents port conflict on 5001):**
```bash
RUN_API_CLEAN.bat
```

**Option B - Manual:**
```bash
# Terminal 1 - Backend
cd GmailManager.Api
dotnet run

# Terminal 2 - Frontend
cd email-app
npm install
npm start
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend: https://localhost:5001
- Swagger: https://localhost:5001/swagger

## 📚 Documentation

- **[End User Guide](END_USER_GUIDE.md)** - How to use the app day-to-day
- **[Complete Setup Guide](GMAIL_SETUP_GUIDE.md)** - Step-by-step setup instructions
- **[API Reference](API_REFERENCE.md)** - API endpoints documentation
- **[Project Summary](PROJECT_SUMMARY.md)** - Features and architecture overview

## 🔐 Security

- JWT token-based authentication
- Secure OAuth 2.0 flow
- HTTPS enforcement
- CORS protection
- Token expiration (8 hours)

## 🎨 Screenshots

### Login Screen
Simple Google OAuth login

### Email List
Paginated inbox with 20 emails per page

### Email Detail
Full email view with reply functionality

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | GET | Get Google OAuth URL |
| `/api/auth/google-callback` | GET | OAuth callback handler |
| `/api/email/list` | GET | List emails (paginated) |
| `/api/email/{id}` | GET | Get email details |
| `/api/email/send` | POST | Send email |

## 🧪 Testing

1. Run backend: `dotnet run` in `GmailManager.Api/`
2. Run frontend: `npm start` in `email-app/`
3. Open http://localhost:3000
4. Click "Sign in with Google"
5. Test features:
   - View inbox
   - Read emails
   - Send replies
   - Pagination
   - Theme toggle

## 🚀 Deployment

### Backend (Azure App Service)
```bash
cd GmailManager.Api
dotnet publish -c Release
```

### Frontend (Static Hosting)
```bash
cd email-app
npm run build
```

**Remember to:**
- Update redirect URI in Google Console
- Update `API_BASE_URL` in frontend
- Use environment variables for secrets

## 📝 Environment Variables

### Backend (appsettings.json)
```json
{
  "GoogleAuth": {
    "ClientId": "...",
    "ClientSecret": "..."
  },
  "Jwt": {
    "Secret": "...",
    "Issuer": "GmailManager",
    "Audience": "GmailManagerClient"
  }
}
```

### Frontend (authConfig.js)
```javascript
export const API_BASE_URL = 'https://localhost:5001/api';
```

## 🐛 Troubleshooting

**Redirect URI mismatch**
→ Verify Google Console redirect URI matches exactly

**Access blocked**
→ Add your email to test users in Google Console

**Backend won't start**
→ Run `dotnet dev-certs https --trust`

**401 Unauthorized**
→ Token expired, login again

## 🔄 Future Enhancements

- [ ] Multiple account switching
- [ ] Email search
- [ ] Attachment support
- [ ] Email compose (new email)
- [ ] Labels/folders
- [ ] Draft saving
- [ ] Real-time notifications

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📞 Support

For issues and questions:
1. Check documentation files
2. Review Google Cloud Console settings
3. Verify all prerequisites installed
4. Check browser console for errors

## ✅ Success Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth credentials configured
- [ ] Backend running (https://localhost:5001)
- [ ] Frontend running (http://localhost:3000)
- [ ] Can login with Google
- [ ] Can view emails
- [ ] Can send replies

---

**Built with ❤️ using ASP.NET Core and React**

**Ready to manage your Gmail like a pro! 🚀**
