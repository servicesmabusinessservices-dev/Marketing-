# End User Guide

This guide explains how to use the MA Business CRM and outreach workspace from sign-in to campaign execution.

## 1. What This App Does

The app combines Gmail inbox management with CRM and marketing tools in one interface. You can:

- read and classify incoming emails
- add email senders to your CRM
- create contact lists and templates
- send bulk campaigns
- build and publish automation journeys
- track pipeline, tasks, and analytics
- manage suppression (do-not-email) addresses

## 2. Sign In and Access

1. Open the web app in your browser.
2. On the sign-in screen, select `Continue with Google`.
3. Complete Google OAuth approval.
4. After successful login, you are redirected to `Dashboard`.

Notes:
- If login fails, an error message appears on the sign-in page.
- If your session expires, protected pages redirect back to sign-in.

## 3. Main Layout

After sign-in, you will see the same workspace shell on every page:

- Sidebar (left): main navigation.
- Top bar (top): page breadcrumb/title, search box, notifications, theme toggle.
- Content area (center): active page tools and data.

### Sidebar navigation

- `Dashboard`
- `Inbox`
- `Bulk Email`
- `Contacts`
- `Pipeline`
- `Campaigns`
- `Templates`
- `Journeys`
- `Analytics`
- `Suppression`

Tips:
- `Inbox` badge shows unread count.
- `Journeys` badge shows current active enrollments.
- Use `Sign out` in the sidebar footer to end your session.
- On mobile/tablet, open navigation with the top-left menu button.

## 4. Dashboard

The dashboard gives a daily operating overview:

- KPI cards: total contacts, total emails, unread emails, average open rate.
- Recent Activity: latest events (opens, clicks, replies, etc.).
- Pipeline Overview: contact counts by stage.
- Task Focus: open tasks sorted for priority/urgency.
- Active Journeys: published journeys with enrollment counts.

Use this page first each day to prioritize work.

## 5. Inbox

Open `Inbox` to manage incoming mail and drive CRM actions.

### What you can do

- Search by sender or subject.
- Filter by classification (`Lead`, `Client`, `Follow Up`, etc.).
- Open any email for full detail view.
- Reply directly.
- Forward to one or more recipients.
- Add sender to CRM (`Add to CRM`).
- Update classification per email.
- Load more results for larger inbox sets.

Recommended flow:
1. Classify important emails.
2. Add new prospects to CRM.
3. Reply or forward where needed.

## 6. Bulk Email

Open `Bulk Email` from the sidebar or inbox flow.

### Campaign setup

1. Build recipient list:
- load recipients from an existing list
- search and select contacts
- type/paste manual email addresses

2. Build message:
- set subject line
- write email body
- optionally load a saved template

3. Configure sending:
- set delay between sends (minimum enforced)
- start campaign with `Send Campaign`

### During send

The right panel shows:
- progress percentage
- processed count
- delivered count
- failed count

A suppression summary is also shown so blocked addresses are respected.

## 7. Marketing Workspace

Open `Campaigns`, `Contacts`, or `Journeys` from the sidebar. The page contains all marketing sections.

### Contacts

- create contacts manually
- search/filter contacts by source
- multi-select contacts
- bulk add selected contacts to a list
- import contacts via CSV
- open a contact profile by clicking a contact row

### Lists

- create contact lists
- view member counts
- delete lists when no longer needed

### Templates

- create templates with subject and HTML body
- use tokens like `{{firstName}}`, `{{company}}`
- preview token rendering
- open block editor for drag-and-drop design
- delete old templates

### Campaign Drafts

- create campaign drafts
- assign list and template
- send immediately using `Send Now`
- track status (`Draft`, `Sent`)
- delete unwanted drafts

### Journeys

- create journeys with trigger type and trigger list
- open `Build Steps` for detailed automation logic
- publish/pause from marketing page
- test behavior events using `Behavior Event Tester`

## 8. Journey Builder

Journey Builder is where you define step-by-step automation.

### Step types

- `Send Email`
- `Advance Stage`
- `Mark as Client`
- `Emit Event`

### Typical setup

1. Add one or more steps.
2. Configure each step (delay, template, stage, event condition).
3. Save with `Save Steps`.
4. Activate with `Publish`.
5. Pause any time with `Pause`.

## 9. Pipeline

Pipeline is a Kanban-style board grouped by lead stage:

- `New`, `Qualified`, `Proposal`, `Won`, `Lost`

### What you can do

- filter by search, stage, owner
- click a contact card to open detail panel
- move stage from the side panel
- assign owner email
- add notes
- create and complete tasks

Use pipeline for daily sales execution and follow-up planning.

## 10. Contact Profile

Contact Profile gives a 360 view of one contact.

Sections include:

- `Details`: company, owner, source, timestamps
- `Activity`: tracked events
- `Notes`: timeline notes and new note form
- `Tasks`: create/manage contact tasks
- `Stage History`: timeline of stage changes

You can also update lead stage with an optional reason.

## 11. Template Block Editor

Open from `Templates` -> `Block Editor`.

1. Enter template name, category, and subject.
2. Design email content in the visual editor.
3. Save template.
4. Return to marketing workspace and use it in campaigns.

## 12. Analytics

Analytics provides performance metrics and conversion insights.

You can:

- switch time windows (`7`, `30`, `90`, `180` days)
- filter by owner email
- refresh analytics data

Reports include:

- engagement metrics (sent, open rate, click rate, reply rate)
- lead funnel
- conversion rates
- journey performance
- owner workload table
- stage transition table

## 13. Suppression List

Suppression protects sender reputation and compliance.

### Manage suppressions

- add an email to suppression list
- set reason (`Unsubscribed`, `Bounced`, `Complained`, etc.)
- add optional notes
- search suppressed addresses
- remove suppression when appropriate

Suppression is used during campaign sends to avoid emailing blocked contacts.

## 14. Scrolling Behavior

The workspace supports two scroll modes together:

- Full-page scroll for normal navigation through each page.
- Internal section scroll in list-heavy areas (tables, activity feeds, contact results, task/history panels).

This keeps the app responsive for large datasets without losing page context.

## 15. Suggested Daily Workflow

1. Start in `Dashboard` to check metrics and priorities.
2. Process `Inbox`: classify, reply, and add new leads to CRM.
3. Update `Pipeline`: assign owners, create tasks, progress stages.
4. Use `Marketing` to maintain lists/templates and queue campaigns.
5. Review `Analytics` for performance and conversion trends.
6. Maintain `Suppression` hygiene before large sends.

## 16. Common Issues

### I cannot open workspace pages

Your session may be expired. Sign in again from the home page.

### Campaign send is blocked or low

Check recipient quality and suppression rules. Ensure lists and templates are assigned.

### Journey not acting on contacts

Confirm steps are saved and journey status is `Published`.

### Contact actions not visible in table/list

Use search and source/stage filters, then refresh data.

---

For technical setup and admin configuration, see:

- `README.md`
- `QUICK_START.md`
- `GMAIL_SETUP_GUIDE.md`
- `API_REFERENCE.md`
