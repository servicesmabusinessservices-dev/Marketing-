# Gmail Manager API Reference

## Base URL
```
https://localhost:5001/api
```

---

## 🔐 Authentication Endpoints

### 1. Get Google OAuth URL
```http
GET /auth/login
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Usage:**
```javascript
const response = await axios.get('/api/auth/login');
window.location.href = response.data.authUrl;
```

---

### 2. OAuth Callback (Automatic)
```http
GET /auth/google-callback?code={authorization_code}
```

**Redirects to:**
```
http://localhost:3000/auth-success?token={jwt}&email={user_email}
```

**Frontend handles:**
```javascript
localStorage.setItem('jwt_token', token);
localStorage.setItem('user_email', email);
```

---

## 📧 Email Endpoints (Requires JWT)

### 3. List Emails
```http
GET /email/list?maxResults=20&pageToken={optional}
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
- `maxResults` (optional): Number of emails (default: 20)
- `pageToken` (optional): For pagination

**Response:**
```json
{
  "emails": [
    {
      "id": "18d4f2a1b2c3d4e5",
      "subject": "Project Update",
      "from": "John Doe <john@example.com>",
      "date": "Mon, 22 Feb 2026 10:30:00 +0000",
      "snippet": "Here's the latest update on the project..."
    }
  ],
  "nextPageToken": "NEXT_PAGE_TOKEN_HERE"
}
```

**Usage:**
```javascript
const response = await axios.get('/api/email/list?maxResults=20', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### 4. Get Email Detail
```http
GET /email/{id}
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "id": "18d4f2a1b2c3d4e5",
  "subject": "Project Update",
  "from": "John Doe <john@example.com>",
  "to": "me@example.com",
  "date": "Mon, 22 Feb 2026 10:30:00 +0000",
  "body": "<html><body>Email content here...</body></html>",
  "threadId": "18d4f2a1b2c3d4e5"
}
```

**Usage:**
```javascript
const response = await axios.get(`/api/email/${emailId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### 5. Send Email
```http
POST /email/send
```

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": ["recipient1@example.com", "recipient2@example.com"],
  "subject": "Meeting Tomorrow",
  "body": "<p>Hi team, let's meet tomorrow at 10 AM.</p>"
}
```

**Response:**
```json
{
  "success": true
}
```

**Usage:**
```javascript
await axios.post('/api/email/send', 
  {
    to: ['john@example.com'],
    subject: 'Re: Project Update',
    body: '<p>Thanks for the update!</p>'
  },
  {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

### 6. Queue Bulk Email Job
```http
POST /email/bulk-send
```

**Response (202 Accepted):**
```json
{
  "jobId": "c7ebf4c03f0f4af89d2028cb0f191312",
  "status": "Queued",
  "totalRecipients": 2,
  "statusUrl": "/api/email/bulk-send/c7ebf4c03f0f4af89d2028cb0f191312"
}
```

### 7. Get Bulk Job Status
```http
GET /email/bulk-send/{jobId}
```

## 🔑 JWT Token Structure

**Claims:**
- `email`: User's Gmail address
- `exp`: Expiration time (8 hours from issue)
- `iss`: "GmailManager"
- `aud`: "GmailManagerClient"

**Storage:**
```javascript
// Store after login
localStorage.setItem('jwt_token', token);

// Use in requests
const token = localStorage.getItem('jwt_token');
headers: { Authorization: `Bearer ${token}` }

// Clear on logout
localStorage.clear();
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "status": 401,
  "title": "Unauthorized"
}
```
**Action**: Redirect to login

### 400 Bad Request
```json
{
  "status": 400,
  "title": "Bad Request",
  "errors": { ... }
}
```

### 500 Internal Server Error
```json
{
  "status": 500,
  "title": "Internal Server Error"
}
```

---

## 🔄 Complete Flow Example

```javascript
// 1. Login
const loginResponse = await axios.get('https://localhost:5001/api/auth/login');
window.location.href = loginResponse.data.authUrl;

// 2. After callback, extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
localStorage.setItem('jwt_token', token);

// 3. Fetch emails
const emailsResponse = await axios.get('https://localhost:5001/api/email/list', {
  headers: { Authorization: `Bearer ${token}` }
});

// 4. Get email detail
const emailDetail = await axios.get(`https://localhost:5001/api/email/${emailId}`, {
  headers: { Authorization: `Bearer ${token}` }
});

// 5. Send reply
await axios.post('https://localhost:5001/api/email/send', 
  {
    to: ['recipient@example.com'],
    subject: 'Re: Original Subject',
    body: '<p>Reply content</p>'
  },
  {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## 🧪 Testing with Swagger

1. Run backend: `dotnet run`
2. Open: `https://localhost:5001/swagger`
3. Test endpoints directly

---

## 📝 Notes

- All email endpoints require valid JWT token
- JWT expires after 8 hours
- Tokens are persisted in SQL with distributed cache acceleration
- Email body supports HTML content
- Pagination uses Gmail's pageToken system
- Bulk send is asynchronous and status is available at `GET /email/bulk-send/{jobId}`
