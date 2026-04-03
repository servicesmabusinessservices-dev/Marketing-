# 🔍 Troubleshooting Guide - Backend Connection Issues

## ✅ Your Configuration (VERIFIED)

**Backend (Render):** `https://marketing-api-38a1.onrender.com`
**Frontend (Vercel):** `https://marketing-zeta-flame.vercel.app`

Environment variables are correctly set! ✅

---

## 🚨 Next Steps to Fix

### Step 1: Redeploy Frontend on Vercel

The `VITE_API_URL` is a **build-time** variable, not runtime. You need to redeploy:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: `servicesmabusinessservices-2847`
3. Click **"Deployments"** tab
4. Click **"..."** menu on latest deployment
5. Click **"Redeploy"**
6. ✅ Check **"Use existing Build Cache"** → **OFF** (important!)
7. Click **"Redeploy"**

**Why?** Vite bakes environment variables into the build at compile time. Changing the variable doesn't update existing builds.

---

### Step 2: Wake Up Backend (Render Free Tier)

Render free tier sleeps after 15 minutes of inactivity. Wake it up:

**Option A: Health Check**
```bash
curl https://marketing-api-38a1.onrender.com/health/live
```

Expected response: `Healthy`

**Option B: Browser**
Open in browser: `https://marketing-api-38a1.onrender.com/swagger`

Wait 30-60 seconds on first load (cold start).

---

### Step 3: Test CORS

Open browser console (F12) and run:

```javascript
fetch('https://marketing-api-38a1.onrender.com/health/live')
  .then(res => res.text())
  .then(console.log)
  .catch(console.error)
```

**Expected:** Logs `Healthy`

**If CORS error:** The backend might not have restarted after you added the environment variables.

---

### Step 4: Force Backend Restart on Render

1. Go to [Render Dashboard](https://render.com/dashboard)
2. Find your service: `marketing-api-38a1`
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deploy to complete (~2-3 minutes)

---

### Step 5: Check Render Logs

1. In Render Dashboard → Your service
2. Click **"Logs"** tab
3. Look for:

**✅ Good signs:**
```
Now listening on: http://[::]:8080
```

**❌ Bad signs:**
```
Failed to connect to database
Could not load file or assembly
CORS policy blocked
```

---

### Step 6: Test API Endpoints

After backend is awake and frontend is redeployed:

**Test 1: Health Check**
```bash
curl https://marketing-api-38a1.onrender.com/health/live
```

**Test 2: Dev Login (bypass Google OAuth)**
Open in browser:
```
https://marketing-api-38a1.onrender.com/api/v1/auth/dev-login
```

This should redirect to your frontend with a JWT token.

**Test 3: Frontend Login**
1. Go to: `https://marketing-zeta-flame.vercel.app/connect`
2. Click "Continue with Google" (will show error)
3. Click "🔧 Dev Login (skip Google)" button
4. Should redirect to dashboard

---

## 🐛 Common Issues & Solutions

### Issue 1: "VITE_API_URL is not defined"

**Solution:** Redeploy frontend (Step 1 above) without build cache.

### Issue 2: CORS Error in Browser Console

**Solution:** 
1. Verify `CORS_ALLOWED_ORIGINS` in Render includes: `https://marketing-zeta-flame.vercel.app`
2. No trailing slash
3. Manual deploy on Render to restart with new env vars

### Issue 3: "Unable to reach backend"

**Solution:**
1. Check if backend is awake (cold start takes 30-60 seconds)
2. Check Render logs for errors
3. Test health endpoint directly

### Issue 4: Database Connection Error

**Check TiDB Connection String:**
```bash
Server=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;Port=4000;Database=test;User=2JUhVQwT6yu4EtL.root;Password=iaEuVWXQtz6CJ7st;SslMode=Required;
```

Verify:
- Username format: `2JUhVQwT6yu4EtL.root` ✅
- Password is correct
- TiDB cluster is running
- No IP restrictions on TiDB

### Issue 5: Google OAuth Fails

Update Google Cloud Console:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. Add Authorized Redirect URI:
   ```
   https://marketing-api-38a1.onrender.com/api/v1/auth/google-callback
   ```
4. Add Authorized JavaScript Origins:
   ```
   https://marketing-zeta-flame.vercel.app
   https://marketing-api-38a1.onrender.com
   ```

---

## ✅ Quick Checklist

Run through this checklist:

- [ ] Frontend redeployed on Vercel (without build cache)
- [ ] Backend manually redeployed on Render
- [ ] Backend health check responds: `curl https://marketing-api-38a1.onrender.com/health/live`
- [ ] Swagger UI loads: `https://marketing-api-38a1.onrender.com/swagger`
- [ ] No CORS errors in browser console (F12)
- [ ] Render logs show: "Now listening on: http://[::]:8080"
- [ ] TiDB database is accessible
- [ ] Google OAuth redirect URI is configured

---

## 🔧 Debug Commands

**Check if API responds:**
```bash
# Health check
curl https://marketing-api-38a1.onrender.com/health/live

# API version check
curl https://marketing-api-38a1.onrender.com/api/v1/auth/login

# Swagger documentation
curl https://marketing-api-38a1.onrender.com/swagger/v1/swagger.json
```

**Check CORS from browser console:**
```javascript
fetch('https://marketing-api-38a1.onrender.com/health/live', {
  mode: 'cors',
  credentials: 'include'
}).then(r => r.text()).then(console.log)
```

---

## 📊 Expected Timeline

After deploying fixes:
- **Vercel redeploy:** 2-3 minutes
- **Render redeploy:** 3-5 minutes
- **Cold start (if sleeping):** 30-60 seconds first request
- **Warm requests:** <1 second

---

## 🎯 Most Likely Solution

Based on your config, the issue is probably one of these:

1. **Frontend not redeployed** → VITE_API_URL not baked into build
2. **Backend sleeping** → First request takes 60 seconds (Render free tier)
3. **Database connection** → Check TiDB cluster is running

**Do this now:**
1. Redeploy frontend on Vercel (no cache)
2. Wait 3 minutes
3. Open `https://marketing-zeta-flame.vercel.app/connect`
4. Wait 60 seconds if backend is cold
5. Click "🔧 Dev Login"

Should work! 🎉

---

## 📞 Still Having Issues?

1. Check Render logs for specific errors
2. Check browser console (F12) for CORS or network errors
3. Test health endpoint: `https://marketing-api-38a1.onrender.com/health/live`
4. Verify TiDB database is accessible

Share the error messages and I can help further!
