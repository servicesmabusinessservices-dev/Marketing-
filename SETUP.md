# Email Multi-Account App Setup

## Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Configure:
   - Name: `Email Multi-Account App`
   - Supported account types: `Accounts in any organizational directory and personal Microsoft accounts`
   - Redirect URI: `Single-page application (SPA)` - `http://localhost:3000`
4. Click **Register**
5. Copy the **Application (client) ID**
6. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**
7. Add: `User.Read`, `Mail.Read`, `Mail.Send`
8. Click **Grant admin consent**

## App Configuration

1. Open `src/config/authConfig.js`
2. Replace `YOUR_CLIENT_ID` with your Application (client) ID

## Run the App

```bash
cd email-app
npm install
npm start
```

## Usage

1. Select an account from the login screen
2. Authenticate with Microsoft
3. View your emails with pagination
4. Click an email to view details
5. Reply to emails directly from the detail view
