# Google OAuth Verification Status

**Last Updated:** April 2, 2026  
**Status:** ⏳ Pending/Not Started  
**Tracking ID:** TBD

---

## Overview

This document tracks the Google OAuth app verification process for Gmail Manager. Google requires verification for any app that requests access to sensitive Gmail scopes in production.

**Why this matters:** Without verification, users will see a warning screen saying "This app hasn't been verified by Google" which causes ~90% abandonment.

---

## Required Gmail API Scopes

The following scopes are requested by Gmail Manager:

1. **`https://www.googleapis.com/auth/gmail.readonly`**
   - **Purpose:** Read email metadata (sender, subject, labels, timestamps)
   - **Used for:** Inbox display, email classification, analytics
   - **Does NOT access:** Email body content

2. **`https://www.googleapis.com/auth/gmail.modify`**
   - **Purpose:** Apply labels, archive emails, mark as read/unread
   - **Used for:** Bulk unsubscribe, email organization, automation
   - **Does NOT:** Delete emails or send on behalf of user

3. **`https://www.googleapis.com/auth/gmail.send`**
   - **Purpose:** Send emails via Gmail API
   - **Used for:** Outreach campaigns, reply automation
   - **User-initiated only:** All sends require explicit user action

---

## Verification Requirements

To complete Google OAuth verification, we need:

### 1. Live URLs
- [x] Privacy Policy: https://mabusinessservices.com/privacy
- [x] Terms of Service: https://mabusinessservices.com/terms
- [x] Homepage: https://mabusinessservices.com
- [ ] Demo Video: TBD (60-90 seconds showing OAuth flow)

### 2. Scope Justification
For each scope, we must document:
- Why it's needed
- What feature uses it
- How data is handled
- Retention policy

*Note: All justifications are documented in the Privacy Policy and Security page.*

### 3. Brand Assets
- [ ] App logo (512x512px)
- [ ] App icon (192x192px)
- [ ] Brand color hex code
- [ ] Support email address: services@mabusinessservices.com ✅

### 4. Video Demonstration
Google requires a YouTube video showing:
- User logs in
- OAuth consent screen appears
- User grants permissions
- Feature works as described
- Data handling is clear

**Video Status:** Not yet created

---

## Verification Submit ion Process

### Step 1: Prepare OAuth Consent Screen
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Navigate to APIs & Services > OAuth consent screen
- [ ] Fill out all required fields:
  - App name: "Gmail Manager"
  - User support email: services@mabusinessservices.com
  - App logo: Upload 512x512px
  - App domain: mabusinessservices.com
  - Authorized domains: mabusinessservices.com, vercel.app
  - Developer contact: services@mabusinessservices.com

### Step 2: Add Scopes
- [ ] Add all three scopes listed above
- [ ] Provide justification for each scope
- [ ] Link to Privacy Policy and Terms

### Step 3: Test Users (Before Verification)
During development, add test users:
- [ ] Your own email
- [ ] 2-3 beta tester emails

### Step 4: Submit for Verification
- [ ] Record and upload demo video to YouTube (unlisted)
- [ ] Submit verification request in Console
- [ ] Wait for Google review (1-4 weeks typical)

---

## Verification Status Tracking

| Date | Action | Status | Notes |
|------|--------|--------|-------|
| April 2, 2026 | Document created | 📝 | Initial setup |
| TBD | OAuth consent screen configured | ⏳ | Pending |
| TBD | Demo video created | ⏳ | Pending |
| TBD | Verification submitted | ⏳ | Pending |
| TBD | Verification approved | ⏳ | Typically 1-4 weeks |

---

## Common Rejection Reasons (To Avoid)

1. **Incomplete documentation:** All links must be live and accessible
2. **Scope overreach:** Only request scopes you actually use
3. **Poor video quality:** Must clearly show OAuth flow and data handling
4. **Missing privacy policy:** Must cover all requested scopes
5. **No clear product:** Must have working feature, not just mockups

---

## Next Actions

### Immediate (This Week):
1. [ ] Create demo video showing OAuth flow
2. [ ] Upload video to YouTube (unlisted)
3. [ ] Configure OAuth consent screen in Google Cloud Console
4. [ ] Add all required scope justifications

### Week 2:
5. [ ] Test with test users (no verification needed for <100 users)
6. [ ] Submit verification request
7. [ ] Monitor Google Cloud Console for feedback

### Week 3-4:
8. [ ] Respond to any Google feedback/requests
9. [ ] Re-submit if needed
10. [ ] Receive approval (hopefully!)

---

## Contacts & Resources

- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Verification Guide:** https://support.google.com/cloud/answer/9110914
- **Gmail API Scopes:** https://developers.google.com/gmail/api/auth/scopes
- **Support Email:** services@mabusinessservices.com

---

## Notes

- Test users (<100) don't need verified app, so development can continue
- Verification is ONLY needed before public launch
- Once approved, re-verification only needed if scopes change
- Keep this document updated with any changes to scopes or verification status

