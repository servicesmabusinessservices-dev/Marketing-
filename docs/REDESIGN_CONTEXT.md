# EmailMultiAccountApp — Complete Redesign Context & Handoff Document

> **Purpose:** This document provides every detail needed by a design/development agent to redesign the entire application flow from scratch. It covers the product vision, business context, current architecture, every screen in detail, all backend capabilities, data models, current UX pain points, and design preferences.

---

## 1. PRODUCT VISION & BUSINESS CONTEXT

### What This App Is
A **cold emailing + monitoring CRM/dashboard** built around Gmail. The core idea is a tool that helps a business solutions consultancy automate outreach, track client relationships, and minimize manual work in the lead-to-client lifecycle.

### Business Context
- This is a **flagship project** for [MA Business Services](https://mabusinessservices.com/), a company that provides business solutions to clients
- It will be showcased on the company website as a demonstration of their capability
- The target users are business professionals who need to manage cold email outreach at scale

### Core Philosophy
> "The aim is to make sure that I do least amount of work to gather client information and a lot of to-and-fro can be reduced."

### Key Goals
1. **Cold emailing at scale** — Send personalized bulk emails through Gmail with throttling
2. **Monitoring & tracking** — Track opens, clicks, replies, bounces with pixel/redirect tracking
3. **CRM pipeline** — Kanban-style board to move leads through stages (New → Qualified → Proposal → Won/Lost)
4. **Automation** — Journey-based automation that auto-follows-up, auto-promotes lead stages, and detects no-reply windows
5. **Analytics** — Conversion funnels, ROI attribution, engagement metrics, send-time optimization
6. **Minimal manual work** — Auto-classify emails, auto-enroll contacts in journeys, auto-detect engagement signals

---

## 2. TECH STACK

### Frontend
- **Framework:** React 19.2.4
- **Routing:** react-router-dom 7.13.0
- **HTTP Client:** axios
- **Email template builder:** react-email-editor (Unlayer drag-and-drop)
- **State management:** React hooks only (useState/useEffect) — no Redux, no Zustand, no global store
- **Theming:** CSS custom properties (light/dark toggle via React context)
- **Build:** Create React App (react-scripts 5.0.1)

### Backend
- **Framework:** ASP.NET Core (.NET 9.0) — C#
- **Database:** MySQL via Pomelo EF Core provider with auto-retry
- **Caching:** Redis (optional, falls back to in-memory DistributedMemoryCache)
- **Auth:** Google OAuth 2.0 → custom JWT (HMAC-SHA256, 8-hour TTL)
- **Background workers:** 2 hosted BackgroundService instances (BulkEmailWorker, MarketingAutomationWorker)
- **Email sending:** Gmail API via google-apis NuGet package

### Legacy/Dead Code (still in package.json but unused)
- `@azure/msal-browser`, `@azure/msal-react` — Microsoft auth libraries, not used
- `graphService.js` — Microsoft Graph service file, completely unused
- These should be removed in a redesign

---

## 3. AUTHENTICATION FLOW

1. User lands on the **Account Selection** screen (route: `/`)
2. Clicks "Sign in with Google"
3. Frontend calls `GET /api/auth/login` → receives a Google OAuth URL
4. Browser redirects to Google consent screen (scopes: gmail.readonly, gmail.send, gmail.compose, userinfo.email)
5. Google redirects back to `GET /api/auth/google-callback?code=...`
6. Backend exchanges code for tokens, resolves user email, stores tokens in DB, generates JWT
7. Backend redirects to `http://localhost:3000/auth-success?token=...&email=...`
8. Frontend grabs token + email from URL params, stores in `localStorage`, navigates to `/emails`
9. All subsequent API calls attach `Authorization: Bearer <jwt>` header
10. On 401, user is redirected back to `/` with session cleared

### Token Storage
- `localStorage.jwt_token` — the JWT for API calls
- `localStorage.user_email` — the authenticated user's email address
- Backend stores Google OAuth tokens per user in MySQL (cached in Redis, 55-min TTL)

---

## 4. CURRENT ROUTING STRUCTURE

```
/                          → AccountSelection (login page)
/auth-success              → AccountSelection (handles OAuth callback params)

── Protected Workspace Shell (WorkspaceLayout) ──
  /emails                  → EmailList (inbox with sidebar)
  /emails/bulk             → BulkEmail (standalone page mode)
  /email/:emailId          → EmailDetail (single email viewer + reply)
  /marketing               → Marketing (overview: contacts, lists, templates, campaigns, journeys)
  /marketing/template-editor → TemplateEditor (Unlayer block editor)
  /marketing/pipeline      → PipelineBoard (kanban board)
  /marketing/analytics     → AnalyticsDashboard (metrics + charts)

/*                         → Redirect to /
```

All routes under the "Protected Workspace Shell" require a valid session (JWT + email in localStorage). If missing, user is redirected to `/`.

---

## 5. CURRENT SCREEN-BY-SCREEN UI DETAILS

### 5.1 Account Selection (Login) — Route: `/`

**Layout:** Full-screen centered card on a gradient background
**Elements:**
- Theme toggle button (top-right corner) — switches light/dark
- Welcome card containing:
  - Heading: "Welcome to Gmail Hub"
  - Subtitle: "Manage your Gmail inbox in one clean workspace."
  - "Sign in with Google" button (primary action)
  - Error message area (shown on login failure)
  - Footer note: "Secure OAuth 2.0 sign-in • No password stored"

**Visual style:** Glassmorphism card with backdrop blur, gradient background (dark blues/purples in dark mode, light grays in light mode)

**UX issues:**
- No branding for MA Business Services
- "Gmail Hub" name doesn't reflect the CRM/cold-email vision
- No feature preview or value proposition before login
- No multi-account support despite the app name "EmailMultiAccountApp"

---

### 5.2 Workspace Layout Shell (wraps all protected routes)

**Layout:** Vertical stack — topbar → horizontal nav bar → main content area
**Topbar contains:**
- Left side: eyebrow label ("Inbox Module" or "Marketing Module") + title ("Email Workspace")
- Right side: user email display + "Light Mode"/"Dark Mode" button + "Logout" button (red accent)

**Navigation bar:**
- Displayed as a horizontal row of buttons below the topbar
- Context-sensitive: shows different items based on which module you're in
  - **Inbox Module** (when on `/emails`, `/emails/bulk`, `/email/:id`):
    - Inbox, Bulk Email, Marketing
  - **Marketing Module** (when on `/marketing/*`):
    - Overview, Pipeline, Analytics, Templates, Inbox (link back)
- Active item is visually highlighted

**UX issues:**
- Navigation is flat — no hierarchy, no icons, no visual grouping
- "Email Workspace" title is generic — doesn't reflect the tool's actual purpose
- The eyebrow label ("Inbox Module" / "Marketing Module") is functional but not intuitive for new users
- No breadcrumbs
- No notification indicators or badge counts
- No search in the shell — search only exists inside the inbox sidebar

---

### 5.3 Email Inbox — Route: `/emails`

**Layout:** Two-column layout — left sidebar + right email list
**Left Sidebar (Sidebar component) contains:**
- Brand area: "Mail Workspace" heading + "Single account inbox" subtitle
- **Search section:** Text input with magnifying glass icon, searches by subject/from
- **Status chips:** "Total: X" and "Selected: X" badges
- **Classification filter dropdown:** All, Lead, Potential Client, Client, Follow Up, Not Relevant, None
- **Sort By dropdown:** Date, Classification, From, Subject
- **Sort Direction dropdown:** Default, A to Z, Z to A
- **Page Size dropdown:** 20, 50, 100
- **Load More Emails button** (shown when more pages available)
- **Classification Summary:** Shows count of each classification tag saved in the database
- **Action buttons:** "Quick Bulk Modal", "Bulk Email Page", "Refresh"

**Right Content (email list) contains:**
- **Header row:** "Inbox" heading + email count + two buttons ("Quick Bulk Modal", "Open Bulk Page")
- **Email items:** Each email row shows:
  - Checkbox (for batch selection — but no batch actions are implemented yet)
  - Star icon (★/☆ for importance, display-only)
  - Sender name (decoded HTML entities)
  - Date (relative format: Today, Yesterday, X days ago, or full date)
  - Subject line
  - Snippet (preview text)
  - Classification dropdown (inline, per-email — can change classification directly)
- Clicking an email row navigates to `/email/:emailId`
- Loading state: "Loading emails..." text
- Empty state: "No emails found" with "Try adjusting your search keyword"

**Data flow:**
- Emails come from Gmail API via `GET /api/email/list` (server-side search, pagination, filtering)
- Classifications are stored in MySQL and merged with Gmail data
- Client-side filtering also applies  the search term against subject/from
- Page tokens for Gmail pagination (cursor-based, not offset-based)

**UX issues:**
- Sidebar is heavy — lots of controls crammed into a narrow column
- Search is duplicated conceptually — server-side `q` param AND client-side `searchTerm` filter
- Checkboxes exist but no batch operations (no "Mark all as Lead," no "Delete selected," etc.)
- No email preview pane — you must click through to see the full email
- Classification dropdown per row is fine but there's no visual color coding for different classifications
- "Quick Bulk Modal" and "Open Bulk Page" buttons appear in BOTH the header and the sidebar — redundant
- No contact linking — you can't see if a sender is already a known contact in the CRM
- No threading — emails are shown as individual messages, not grouped by thread

---

### 5.4 Email Detail — Route: `/email/:emailId`

**Layout:** Full-width single-column view
**Elements:**
- **Top bar:** "← Back" button (navigates to `/emails`)
- **Email container:**
  - Subject heading
  - Metadata area: From, Date, To fields
  - Email body: rendered in a sandboxed iframe (supports HTML email content with responsive styles) or as plain text
  - Reply section (toggleable):
    - "Reply" button toggles a textarea
    - Reply textarea + "Send Reply" / "Cancel" buttons
    - Sends reply via Gmail API as `Re: <subject>` to the original sender

**UX issues:**
- No forward capability — only reply
- No classification display or change on this screen (must go back to list)
- No "Add to CRM" action — can't create a contact from the email sender
- No thread view — just the single message
- No attachment handling shown (the API supports full message, but UI doesn't show attachments separately)
- The iframe approach for HTML email bodies works but takes up variable height
- No "Reply All" option

---

### 5.5 Bulk Email — Route: `/emails/bulk` (page mode) or modal overlay from inbox

**Layout:** Centered card (page mode) or modal overlay (modal mode)
**Elements:**
- **Header:** "Bulk Email Workspace" (page) or "Bulk Email Scheduler" (modal) + close/back button
- **Form fields:**
  - Email Addresses textarea (one per line, manual entry)
  - Subject text input
  - Content textarea (plain text/HTML)
  - Delay between emails (number input, minutes, min 1, max 300)
- **Job Status section** (appears after sending):
  - Status indicator (Queued / InProgress / Completed / Failed) with color coding
  - Progress: X/Y processed
  - Success count
  - Failure count
- **Action buttons:** "Schedule Emails" (primary) + "Cancel"

**Behavior:**
- Submits to `POST /api/email/bulk-send` which returns 202 with a job ID
- Polls `GET /api/email/bulk-send/{jobId}` every 1.5 seconds (up to 600 attempts = 15 minutes)
- Updates progress counters in real-time
- Shows toast notification on completion/failure

**UX issues:**
- No contact list integration — can't select from saved contact lists, must manually paste emails
- No template integration — can't select a saved template, must manually write content
- No personalization — `{{firstName}}`, `{{company}}` tokens aren't supported in this view
- No CSV upload option (the backend supports CSV import for contacts, but bulk email doesn't use it)
- No suppression list checking shown in UI (backend does deduplicate but user doesn't see it)
- No preview before send
- No scheduling for future time — it starts immediately
- Content is just a textarea — no rich text/WYSIWYG editor

---

### 5.6 Marketing Overview — Route: `/marketing`

**Layout:** Header + responsive CSS grid of cards
**Header:** "Marketing Workspace" + subtitle + "Refresh Data" button

**Cards (sections):**

#### 5.6.1 Contacts Card
- Shows contact count
- **Create Contact form:** Email, First name, Last name, Company, Lead Stage dropdown (New/Qualified/Proposal/Won/Lost)
- **Contact list:** Shows first 8 contacts (firstName or email + email address)
- No pagination, no inline editing, no delete, no expand

#### 5.6.2 Lists Card
- Shows list count
- **Create List form:** Name + Description
- **List display:** Shows first 8 lists (name + member count)
- No ability to add contacts to lists from this view
- No delete or edit

#### 5.6.3 Templates Card
- Shows template count
- **Category filter dropdown:** All, Welcome, Follow-up, Proposal, Reminder (triggers refetch)
- **Create Template form:**
  - Template name
  - Category dropdown
  - Subject with tokens (text input)
  - Body HTML with tokens (textarea, NOT WYSIWYG)
- **Action buttons:** "Create Template", "Preview Tokens", "Block Editor" (navigates to Unlayer editor)
- **Preview area:** Shows rendered template preview as monospace text
- **Template list:** First 8 templates (name + category)

#### 5.6.4 Campaign Drafts Card
- Shows campaign count
- **Create Campaign form:**
  - Campaign name
  - Description
  - Select list target (dropdown of existing lists)
  - Select template (dropdown of existing templates)
- **Campaign list:** First 8 campaigns (name + status)
- No ability to schedule, send, or manage campaigns beyond creating drafts

#### 5.6.5 Automation Journeys Card (wider card, spans 2 columns)
- Shows journey count
- **Create Journey form:**
  - Journey name
  - Trigger type dropdown: New Lead, Proposal Sent, No Reply in 3 Days, Email Opened, Email Clicked, Replied
  - Trigger list (dropdown of existing lists — confusing label)
- **Journey list:** Each journey shows name + status + Publish/Pause buttons
- **Behavior Event Tester:** (below journeys)
  - Select contact dropdown
  - Select event type dropdown (proposal_sent, opened, clicked, replied)
  - "Log Event" button — manually fires an event for testing automation

**UX issues:**
- This page is a wall of forms — overwhelming and dense
- No clear visual hierarchy — all cards look the same
- Only shows first 8 items per section — no pagination or "view all"
- No way to edit or delete any entity (contact, list, template, campaign, journey) from this view
- No journey step builder — can only create a journey shell, can't add steps from this screen (API supports it via `PUT /journeys/{id}/steps` but no UI)
- "Behavior Event Tester" is a developer tool exposed in the main UI — confusing for end users
- CSV import exists in the API but has no UI
- Contact lists can't be populated (add members) from this screen
- Campaigns can't be sent/scheduled — only drafted
- No visual differentiation between draft/published/paused journeys beyond text label
- Templates section mixes inline text editing with the external block editor link — unclear workflow

---

### 5.7 Template Editor (Unlayer) — Route: `/marketing/template-editor`

**Layout:** Full-height layout with metadata bar at top and Unlayer canvas below
**Elements:**
- **Header:** "Template Block Editor" + "Back" button + "Save Template" button
- **Form bar:** Template name input + Category dropdown + Subject input (with token hint)
- **Token reference note:** Shows allowed tokens: `{{firstName}}`, `{{lastName}}`, `{{company}}`, `{{email}}`
- **Unlayer canvas:** Full drag-and-drop email builder (embedded via react-email-editor)
  - 70vh minimum height
  - Exports both HTML and design JSON on save

**Behavior:**
- On save: exports HTML + design JSON from Unlayer, sends to `POST /api/marketing/templates`
- Navigates back to `/marketing` on success

**UX issues:**
- Can't edit existing templates — only create new ones (no template ID in the route)
- Can't load a previously saved design JSON back into Unlayer
- The subject field here is separate from the Unlayer editor — could be confusing
- No send/preview flow — after saving, user must go back to marketing overview
- No integration with campaign creation flow

---

### 5.8 Pipeline Board — Route: `/marketing/pipeline`

**Layout:** Header + filter bar + two-panel layout (board + sidebar)

**Filter bar:**
- Search input (name, email, company)
- Owner filter dropdown (populated from data)
- Stage filter dropdown (New, Qualified, Proposal, Won, Lost)
- "Apply Filters" button

**Board (left panel):**
- CSS Grid with auto-fit columns (one per stage)
- Each column has:
  - Stage name heading + item count
  - Cards for each contact in that stage:
    - Contact name (or email fallback)
    - Email address
    - Company (or "No company")
    - Stage move dropdown (can change stage inline)
    - Owner assignment: text input + "Assign" button

**Detail Sidebar (right panel):**
- Appears when a contact card is clicked
- Shows: name, email, stage, owner
- **Notes section:**
  - "Add note" textarea + "Add Note" button
  - List of existing notes
- **Tasks section:**
  - Create task form: title, priority (Low/Medium/High), due date, task owner email
  - "Add Task" button
  - List of existing tasks with "Complete" button on each

**UX issues:**
- No drag-and-drop — stage changes are via dropdown only
- Board doesn't auto-refresh after filter changes — requires clicking "Apply Filters"
- The detail sidebar doesn't have a close button — it stays open once a contact is selected
- No deal value displayed on cards (the field exists in the data model)
- No lead stage history view (API supports it but no UI)
- No visual indicators for overdue tasks or high-priority items
- Contact cards are small and don't show enough context at a glance
- No activity timeline for a contact (events, emails sent, stage changes)
- Owner assignment is a raw text input — no autocomplete or validation

---

### 5.9 Analytics Dashboard — Route: `/marketing/analytics`

**Layout:** Header + filter bar + grid of metric cards + table panels

**Filter bar:**
- Time range dropdown: Last 7 / 30 / 90 / 180 days
- Owner email filter input
- "Refresh" button

**Metric cards (CSS grid):**

1. **Stage Funnel:** New / Qualified / Proposal / Won / Lost counts (plain numbers, no visual funnel)
2. **Conversion Rates:** New→Qualified, Qualified→Proposal, Proposal→Won, Proposal→Lost (percentages)
3. **Task Health:** Total / Open / Completed / Overdue counts
4. **Engagement:** New Lead / Proposal Sent / Opened / Clicked / Replied counts
5. **Journey Performance:** Active / Completed / Failed / Paused counts

**Table panels (full-width):**

1. **Owner Workload table:** Owner email, Contacts count, Open Tasks, Overdue Tasks
2. **Stage Transitions table:** From stage, To stage, Count

**UX issues:**
- No charts or visual graphs — everything is plain numbers in boxes
- No funnel visualization
- No time-series trends (no line charts showing engagement over time)
- The API returns much more data than the UI displays:
  - ROI by segment × service (attributed revenue, campaign cost, net revenue, ROI%) — NOT SHOWN
  - Deliverability metrics (open rate, click rate, reply rate, unsubscribe rate, bounce rate) — NOT SHOWN
  - Send-time suggestions (best day-of-week and hour for engagement) — NOT SHOWN
  - Platform updates (critical changes from providers) — NOT SHOWN
- No export capability (CSV, PDF)
- No comparison view (this period vs. previous period)
- No drill-down — can't click a metric to see the underlying data

---

## 6. BACKEND API CAPABILITIES (Full Reference)

### 6.1 Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/login` | Returns Google OAuth2 URL |
| GET | `/api/auth/google-callback` | Handles OAuth callback, issues JWT |

### 6.2 Email Operations (`/api/email`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email/list` | Lists Gmail messages with filtering, sorting, classification merge, pagination |
| GET | `/api/email/{id}` | Single email detail (HTML body, metadata) |
| POST | `/api/email/{id}/classification` | Set/update email classification |
| PATCH | `/api/email/{id}/classification` | Alias for above |
| GET | `/api/email/classification-summary` | Grouped classification counts |
| POST | `/api/email/send` | Send single HTML email via Gmail |
| POST | `/api/email/bulk-send` | Queue async bulk email job (returns 202 + job ID) |
| GET | `/api/email/bulk-send/{jobId}` | Poll bulk job status/progress |

**Email Classifications:** None, Lead, Potential Client, Client, Follow Up, Not Relevant

### 6.3 Marketing - Contacts & CRM (`/api/marketing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/contacts` | Paginated contact search (by text, tag, lead stage, owner) |
| POST | `/api/marketing/contacts` | Create/update contact (deduplicates by normalized email) |
| POST | `/api/marketing/contacts/import-csv` | Bulk import from CSV (email, firstName, lastName, company, serviceInterest, location) |
| POST | `/api/marketing/contacts/{id}/lead-stage` | Update lead stage with history tracking |
| GET | `/api/marketing/contacts/{id}/lead-stage-history` | Chronological stage transition history |
| POST | `/api/marketing/contacts/{id}/owner` | Assign owner to contact |
| GET | `/api/marketing/contacts/{id}/notes` | List CRM notes |
| POST | `/api/marketing/contacts/{id}/notes` | Add CRM note |
| GET | `/api/marketing/contacts/{id}/tasks` | List tasks (filterable by status, overdue) |
| POST | `/api/marketing/contacts/{id}/tasks` | Create task |
| PATCH | `/api/marketing/contacts/{id}/tasks/{taskId}` | Update task (status, priority, due date, owner) |

### 6.4 Marketing - Pipeline & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/pipeline` | Contacts grouped by stage + owner options |
| GET | `/api/marketing/analytics` | **Comprehensive:** funnel, conversion rates, owner workload, task stats, engagement events, journey performance, stage transitions, deliverability metrics, ROI by segment × service, send-time suggestions, platform updates |

### 6.5 Marketing - Lists, Segments, Suppressions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/lists` | Paginated contact lists with member counts |
| POST | `/api/marketing/lists` | Create list |
| POST | `/api/marketing/lists/{listId}/members/{contactId}` | Add contact to list |
| GET | `/api/marketing/segments` | List segments |
| POST | `/api/marketing/segments` | Create segment with JSON filter |
| GET | `/api/marketing/suppressions` | List suppression entries |
| POST | `/api/marketing/suppressions` | Add email to suppression list |
| DELETE | `/api/marketing/suppressions/{email}` | Remove suppression |

### 6.6 Marketing - Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/templates` | List templates (filterable by category, paginated). Auto-seeds defaults on first access |
| GET | `/api/marketing/templates/{id}` | Get single template |
| POST | `/api/marketing/templates` | Create template (validates personalization tokens) |
| PUT | `/api/marketing/templates/{id}` | Update template (increments version) |
| POST | `/api/marketing/templates/preview` | Render template against real contact or sample data |

**Template categories:** welcome, follow-up, proposal, reminder
**Allowed tokens:** `{{firstName}}`, `{{lastName}}`, `{{company}}`, `{{email}}`

### 6.7 Marketing - Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/campaigns` | List campaigns (paginated) |
| POST | `/api/marketing/campaigns` | Create campaign draft (links to template, list, segment; tracks campaign cost) |

**Campaign statuses:** Draft, Scheduled, Paused
**Note:** No campaign execution/send endpoint exists yet — campaigns are draft-only in the API too.

### 6.8 Marketing - Events (Engagement Tracking)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/events` | Paginated event log (filterable by contact, event type) |
| POST | `/api/marketing/events` | Record engagement event (auto-enrolls in journeys, auto-promotes stages) |
| GET | `/api/marketing/track/open` | **Anonymous** tracking pixel — records "opened", returns 1×1 GIF |
| GET | `/api/marketing/track/click` | **Anonymous** click redirect — records "clicked", 302 redirects to target URL |

**Event types:** new_lead, proposal_sent, opened, clicked, replied, no_reply_3d, delivered, bounced, unsubscribed

**Auto-behaviors:**
- Recording any event auto-enrolls the contact into published journeys with matching trigger type
- "replied" or "clicked" events auto-promote contacts from Qualified → Won

### 6.9 Marketing - Journeys (Automation)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/journeys` | List all journeys with step counts |
| POST | `/api/marketing/journeys` | Create journey (Draft status) |
| GET | `/api/marketing/journeys/{id}` | Journey detail with ordered steps |
| PUT | `/api/marketing/journeys/{id}/steps` | Replace all steps (defines the automation flow) |
| POST | `/api/marketing/journeys/{id}/publish` | Publish journey (requires ≥1 step) |
| POST | `/api/marketing/journeys/{id}/pause` | Pause journey |

**Journey step types:**
- `send_email` — sends an email using a template
- `advance_stage` — moves contact to a specified lead stage
- `mark_client` — marks contact as client
- `emit_event` — creates a new engagement event

**Each step can have:**
- Delay (in minutes) before execution
- Condition event type (e.g., "only proceed if opened")
- Condition window (hours — check within X hours)
- Template reference (for send_email steps)
- Target lead stage (for advance_stage/mark_client steps)

---

## 7. BACKGROUND AUTOMATION (runs server-side)

### 7.1 BulkEmailWorker
- Processes queued bulk email jobs
- Sends emails sequentially via Gmail API with configurable delay between sends
- Tracks progress (processed/success/failure counts) — persisted to DB after each send
- Individual failures don't abort the full job

### 7.2 MarketingAutomationWorker (runs every 60 seconds)
**Two responsibilities:**
1. **No-reply detection:** Scans for `proposal_sent` events older than 72 hours. If the contact hasn't replied since the proposal, emits a `no_reply_3d` event and auto-enrolls in matching journeys
2. **Journey processing:** Finds active enrollments due for next step, validates journey is still Published, checks condition events (time windowed), executes steps (send email, advance stage, mark client, emit event), advances to next step or completes enrollment

---

## 8. DATA MODEL SUMMARY

### Contact
Core CRM record. Fields: email, firstName, lastName, company, serviceInterest, timezone, dealValue, location, leadStage, ownerEmail, source, tags (JSON array). Deduplicated by normalized email per user.

**Pipeline stages:** New → Qualified → Proposal → Won | Lost

### Email Classification
Links a Gmail message ID to a classification label per user.

### Contact List & Members
Named lists of contacts. Many-to-many via ContactListMemberEntity.

### Suppression List
Emails that should not receive outreach. Checked during operations.

### Segment
Named filter set (JSON filter definition) for targeting subsets of contacts.

### Campaign Template
Email templates with category, subject (tokenizable), HTML body, optional Unlayer design JSON, version tracking.

### Campaign
Links a template to a list/segment with status tracking and cost field. Currently draft-only.

### Journey & Steps
Automation sequences: trigger type + ordered steps with delays, conditions, and actions.

### Journey Enrollment
Tracks a specific contact's progress through a journey (which step they're on, next run time, status).

### Message Event
Engagement log: event type, contact, campaign/journey linkage, metadata JSON, timestamps. Central to all tracking.

### Lead Stage History
Audit trail of every lead stage transition with reason, triggering event, and timestamp.

### CRM Note
Free-text notes attached to a contact.

### CRM Task
Actionable items with title, description, status (Open/Completed), priority (Low/Medium/High), owner, due date.

### Platform Update
System-wide announcements (source, category, severity, title, summary, URL, critical flag).

---

## 9. FEATURES THE BACKEND SUPPORTS BUT THE UI DOESN'T EXPOSE

This is a critical section for the redesign — significant backend functionality has NO UI:

1. **CSV contact import** — `/api/marketing/contacts/import-csv` supports bulk importing contacts from CSV. No UI exists.
2. **Segments** — Can create segments with JSON filters. No UI for creating, viewing, or using segments.
3. **Suppression management** — Full CRUD for suppression lists. No UI at all.
4. **Journey step builder** — API supports full step definition (delays, conditions, templates, stage changes). No UI for adding/editing steps — only creating the journey shell.
5. **Journey enrollment monitoring** — Enrollments exist in DB but aren't shown anywhere.
6. **Contact list member management** — Can add contacts to lists via API. No UI for it.
7. **Template editing** — API supports `PUT` to update templates. UI only creates new ones.
8. **Template design JSON load/edit** — Unlayer design JSON is stored but never loaded back for editing.
9. **Contact detail view** — No dedicated contact profile page (only pipeline card sidebar).
10. **Lead stage history** — API returns chronological transition history. Not shown in any view.
11. **Event log viewer** — Full event log with filtering exists. No UI to browse events.
12. **ROI analytics** — Backend computes ROI by segment × service interest with attributed revenue. Not displayed.
13. **Deliverability metrics** — Open rate, click rate, reply rate, bounce rate, unsubscribe rate. Not displayed.
14. **Send-time optimization** — Backend recommends best day-of-week and hour. Not displayed.
15. **Platform updates** — Backend tracks critical platform changes. Not displayed.
16. **Contact tags** — TagsJson field exists on contacts. No UI to add/remove tags.
17. **Contact fields** — serviceInterest, timezone, dealValue, location, source fields exist but have no input UI (except location via CSV import).
18. **Task filtering** — API supports filtering by status and overdue flag. UI shows all tasks unfiltered.
19. **Campaign cost tracking** — Field exists on campaigns. No UI input.
20. **Contact owner autocomplete** — Owner assignment is a raw text input with no suggestions.

---

## 10. CURRENT CSS/DESIGN SYSTEM

### Theming
Two themes via CSS classes on `<body>`: `.light-theme` (default) and `.dark-theme`
Toggle managed by React context (`ThemeContext.js`)

### CSS Token System (variables)
**Panel-level tokens (for surfaces/containers):**
- `--panel-bg` — card/panel background
- `--panel-border` — card/panel border
- `--panel-text` — primary text color
- `--panel-text-muted` — secondary/subtle text

**Control-level tokens (for inputs/buttons):**
- `--control-bg` — input/dropdown background
- `--control-border` — input/dropdown border
- `--control-text` — input text color

**Bridge tokens (backward compatibility):**
- `--background-primary`, `--background-card`, `--background-secondary`, `--border-color`, `--primary-color`

**Accent colors:** `--accent`, `--accent-hover`, `--danger`, `--danger-hover`

### Visual Style
- Glassmorphism: backdrop-filter blur, semi-transparent backgrounds
- Subtle gradients on backgrounds
- Border-radius: mostly 12px for cards, 8px for inputs
- Box shadows with subtle elevation layers
- Font: Inter, system fallbacks

### Responsive Approach
Current CSS uses some `@media` queries but is primarily desktop-focused. Mobile experience is not refined.

---

## 11. DESIGN PREFERENCES (from product owner)

These preferences were gathered and should guide the redesign:

1. **Module structure:** Separate modules — inbox/email section is distinct from marketing/CRM section (not a single navigation tree)
2. **Device priority:** Balanced responsive — should work well on both desktop and mobile
3. **Bulk Email access:** Both modal access (quick send from inbox) AND dedicated full page
4. **Visual style:** Hybrid — mostly flat/clean design with subtle premium accents (glass effects, gentle gradients on key surfaces)

---

## 12. KEY UX PAIN POINTS SUMMARY

1. **Information architecture:** Marketing Overview is a wall of forms with no visual hierarchy
2. **Missing CRUD:** Can create entities but rarely edit or delete them
3. **No data visualization:** Analytics shows raw numbers, no charts or graphs
4. **Broken workflows:** Creating a campaign requires bouncing between templates, lists, and campaign form — no guided flow
5. **No contact profile:** No dedicated page to see everything about a contact (emails, events, notes, tasks, stage history)
6. **Disconnected email + CRM:** Viewing an email doesn't show if the sender is a known contact or which pipeline stage they're in
7. **Developer tools in production UI:** The "Behavior Event Tester" on the marketing page is confusing for end users
8. **No onboarding:** After login, user lands in empty inbox with no guidance on what to do next
9. **No campaign execution:** Campaigns can be drafted but never sent — dead-end workflow
10. **No journey builder:** Journeys can be created but steps can't be configured through the UI
11. **Duplicate navigation elements:** Bulk email buttons appear in both sidebar and header
12. **No real-time indicators:** No unread counts, no notification badges, no activity feed
13. **No data export:** Can't export contacts, analytics, or reports
14. **Search is limited:** Only works within inbox — no global search across contacts, templates, campaigns

---

## 13. SUGGESTED REDESIGN PRIORITIES

Based on the vision of a cold emailing + monitoring CRM dashboard:

### Must-Have for Flagship Quality
1. **Dashboard home page** — After login, show a summary: recent activity, key metrics, pending tasks, upcoming journey steps
2. **Contact profile page** — A dedicated view showing everything about a contact: emails exchanged, events, notes, tasks, stage history, deal value
3. **Journey builder UI** — Visual step builder for automation sequences
4. **Campaign send workflow** — End-to-end: pick template → pick list/segment → preview → schedule or send
5. **Data visualizations** — Charts for funnel, engagement trends, conversion rates, ROI
6. **Contact import UI** — CSV upload with preview/mapping
7. **Suppression list management** — View, add, remove suppressed emails

### Nice-to-Have
8. **Drag-and-drop pipeline** — Kanban with drag between columns
9. **Email-CRM linking** — When viewing an email, show the contact card if sender is known
10. **Global search** — Search across contacts, emails, templates, campaigns
11. **Notification center** — Surface overdue tasks, failed journeys, bounced emails
12. **Mobile optimized views** — Especially for pipeline and inbox

---

## 14. FILE REFERENCE MAP

### Frontend Source Files
| File | Purpose |
|------|---------|
| `email-app/src/App.js` | Root component, routing, providers |
| `email-app/src/App.css` | Global styles, feedback toast styles |
| `email-app/src/index.css` | CSS reset, theme variables, token definitions |
| `email-app/src/context/ThemeContext.js` | Light/dark theme toggle context |
| `email-app/src/context/FeedbackContext.js` | Toast notification system |
| `email-app/src/utils/session.js` | Auth helpers (hasSession, clearSession, handleUnauthorized) |
| `email-app/src/config/authConfig.js` | API base URL, auth header builder |
| `email-app/src/services/gmailService.js` | All API call methods (40+ methods) |
| `email-app/src/services/graphService.js` | **DEAD CODE** — Microsoft Graph, unused |
| `email-app/src/components/layout/WorkspaceLayout.js` | Shared shell (topbar + nav + outlet) |
| `email-app/src/components/AccountSelection.js` | Login page |
| `email-app/src/components/EmailList.js` | Inbox with sidebar |
| `email-app/src/components/EmailDetail.js` | Single email viewer + reply |
| `email-app/src/components/Sidebar.js` | Inbox left sidebar (search, filters, actions) |
| `email-app/src/components/BulkEmail.js` | Bulk email form (modal + page modes) |
| `email-app/src/components/Marketing.js` | Marketing overview (contacts, lists, templates, campaigns, journeys) |
| `email-app/src/components/TemplateEditor.js` | Unlayer drag-and-drop template builder |
| `email-app/src/components/PipelineBoard.js` | Kanban pipeline board + contact sidebar |
| `email-app/src/components/AnalyticsDashboard.js` | Analytics metrics display |

### Backend Source Files
| File | Purpose |
|------|---------|
| `GmailManager.Api/Program.cs` | Service registration, middleware, startup |
| `GmailManager.Api/Controllers/AuthController.cs` | OAuth2 + JWT issuance |
| `GmailManager.Api/Controllers/EmailController.cs` | Gmail operations + bulk email |
| `GmailManager.Api/Controllers/MarketingController.cs` | Full CRM + marketing API (~40 endpoints) |
| `GmailManager.Api/Data/AppDbContext.cs` | EF Core DB context, entity configs |
| `GmailManager.Api/Data/Entities/` | 18 entity classes |
| `GmailManager.Api/Services/BulkEmailWorker.cs` | Async bulk send processor |
| `GmailManager.Api/Services/MarketingAutomationWorker.cs` | Journey processor + no-reply detector |

---

*Document generated for redesign handoff. All details reflect the current state of the codebase as of the generation date.* 
