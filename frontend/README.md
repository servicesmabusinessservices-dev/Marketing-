# Email Multi-Account React Application

## Setup Instructions

### 1. Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations > New registration
3. Register your application:
   - Name: Email Multi-Account App
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: Single-page application (SPA) - http://localhost:3000
4. Copy the **Application (client) ID**
5. Go to API permissions > Add permission > Microsoft Graph > Delegated permissions
6. Add: User.Read, Mail.Read, Mail.Send
7. Grant admin consent

### 2. Update Configuration

Edit `src/config/authConfig.js` and replace `YOUR_CLIENT_ID` with your Azure AD client ID.

### 3. Install and Run

```bash
cd C:\EmailMultiAccountApp\email-app
npm start
```

The app will open at http://localhost:3000

## Features

- Multi-account authentication with Azure AD
- Email list with pagination (20 emails per page)
- Email detail view with full content
- Reply functionality
- Responsive design
- Secure token management with MSAL

## Project Structure

```
src/
├── components/
│   ├── AccountSelection.js    # Login screen
│   ├── EmailList.js           # Email inbox with pagination
│   └── EmailDetail.js         # Email detail with reply
├── services/
│   └── graphService.js        # Microsoft Graph API calls
├── config/
│   └── authConfig.js          # Azure AD configuration
└── App.js                     # Main app with routing
```

## API Endpoints Used

- GET /me/messages - Fetch emails
- GET /me/messages/{id} - Fetch email detail
- POST /me/messages/{id}/reply - Send reply
