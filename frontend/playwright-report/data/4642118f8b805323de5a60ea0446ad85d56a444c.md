# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation & Core Features >> should load security/privacy page if linked
- Location: e2e\navigation.spec.ts:33:7

# Error details

```
Error: locator.isVisible: Error: strict mode violation: getByRole('link', { name: /View security|Security/i }) resolved to 4 elements:
    1) <a href="/security" data-discover="true" class="landing-cta landing-cta--secondary">View security</a> aka getByRole('link', { name: 'View security' })
    2) <a href="/privacy" data-discover="true" class="landing-feature-card">…</a> aka getByRole('link', { name: 'Legal-ready Privacy Policy,' })
    ...

Call log:
    - checking visibility of getByRole('link', { name: /View security|Security/i })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to main content" [ref=e3] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - main [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - paragraph [ref=e9]: MA Business Services
            - 'heading "Gmail Manager: Multi-account control with compliant OAuth and real product proof." [level=1] [ref=e10]'
            - paragraph [ref=e11]: Connect inboxes securely, automate triage, and launch outreach from one workspace. Built for teams that need privacy-first email automation.
            - generic [ref=e12]:
              - link "Connect Gmail" [ref=e13] [cursor=pointer]:
                - /url: /connect
              - link "View security" [ref=e14] [cursor=pointer]:
                - /url: /security
            - generic [ref=e15]:
              - generic [ref=e18]: Verified Gmail OAuth scopes (readonly, modify, send) with zero body storage.
              - generic [ref=e21]: Multi-account inbox control with shared labels and guardrails.
              - generic [ref=e24]: Bulk unsubscribe and outreach actions with audit trails.
          - generic [ref=e25]:
            - generic [ref=e26]: Preview
            - generic [ref=e27]:
              - generic [ref=e28]:
                - generic [ref=e29]: Inbox Control
                - generic [ref=e30]: Protected
              - generic [ref=e31]:
                - generic [ref=e32]:
                  - generic [ref=e33]: Account status
                  - generic [ref=e34]: Connected
                - generic [ref=e35]:
                  - generic [ref=e36]: Scopes
                  - generic [ref=e37]: readonly · modify · send
                - generic [ref=e38]:
                  - generic [ref=e39]: Storage
                  - generic [ref=e40]: No email bodies persisted
              - generic [ref=e41]: OAuth verification ready · 24h deletion SLA
        - generic [ref=e42]:
          - generic [ref=e43]:
            - generic [ref=e44]: MA
            - generic [ref=e45]:
              - heading "Who We Are" [level=2] [ref=e46]
              - paragraph [ref=e47]: MA Business Services - Professional Business Solutions
          - generic [ref=e48]:
            - generic [ref=e49]:
              - paragraph [ref=e50]:
                - strong [ref=e51]: MA Business Services
                - text: is a professional business solutions provider specializing in email management, CRM systems, and marketing automation. We help businesses streamline their operations with secure, privacy-first tools that enhance productivity without compromising data security.
              - paragraph [ref=e52]:
                - text: "Our Gmail Manager platform was created with full transparency: we use verified Gmail OAuth scopes, never persist email body content, and provide 24-hour deletion SLAs for all metadata. Every action is audited, every scope is documented, and every user maintains full control. Learn more at"
                - link "mabusinessservices.com" [ref=e53] [cursor=pointer]:
                  - /url: https://mabusinessservices.com
            - generic [ref=e54]:
              - generic [ref=e55]:
                - generic [ref=e56]: 🔒
                - generic [ref=e57]:
                  - generic [ref=e58]: Privacy Commitment
                  - generic [ref=e59]: We never store your email content. Only metadata (sender, subject, labels) is temporarily cached and deleted within 24 hours.
              - generic [ref=e60]:
                - generic [ref=e61]: 📧
                - generic [ref=e62]:
                  - generic [ref=e63]: Get in Touch
                  - generic [ref=e64]:
                    - text: Questions, feedback, or security concerns?
                    - link "services@mabusinessservices.com" [ref=e65] [cursor=pointer]:
                      - /url: mailto:services@mabusinessservices.com
              - generic [ref=e66]:
                - generic [ref=e67]: 🛡️
                - generic [ref=e68]:
                  - generic [ref=e69]: Security Disclosure
                  - generic [ref=e70]:
                    - text: Found a vulnerability? We take security seriously. Report issues to
                    - link "services@mabusinessservices.com" [ref=e71] [cursor=pointer]:
                      - /url: mailto:services@mabusinessservices.com
        - generic [ref=e72]:
          - heading "What's inside" [level=2] [ref=e73]
          - generic [ref=e74]:
            - link "Legal-ready Privacy Policy, Terms of Service, and Security pages with full transparency." [ref=e75] [cursor=pointer]:
              - /url: /privacy
              - generic [ref=e76]: Legal-ready
              - generic [ref=e77]: Privacy Policy, Terms of Service, and Security pages with full transparency.
            - link "Privacy-first Zero email body storage with 24-hour metadata deletion SLA." [ref=e78] [cursor=pointer]:
              - /url: /security
              - generic [ref=e79]: Privacy-first
              - generic [ref=e80]: Zero email body storage with 24-hour metadata deletion SLA.
            - link "One real feature Bulk unsubscribe action wired to Gmail API with audit trail." [ref=e81] [cursor=pointer]:
              - /url: /connect
              - generic [ref=e82]: One real feature
              - generic [ref=e83]: Bulk unsubscribe action wired to Gmail API with audit trail.
    - contentinfo [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e88]:
            - generic [ref=e89]: MA
            - generic [ref=e90]:
              - generic [ref=e91]: MA Business Services
              - generic [ref=e92]: Professional Business Solutions
          - generic [ref=e93]:
            - heading "Legal & Security" [level=3] [ref=e94]
            - navigation "Legal navigation" [ref=e95]:
              - link "Privacy Policy" [ref=e96] [cursor=pointer]:
                - /url: /privacy
              - link "Terms of Service" [ref=e97] [cursor=pointer]:
                - /url: /terms
              - link "Security" [ref=e98] [cursor=pointer]:
                - /url: /security
          - generic [ref=e99]:
            - heading "Contact" [level=3] [ref=e100]
            - generic [ref=e101]:
              - link "Support" [ref=e102] [cursor=pointer]:
                - /url: mailto:services@mabusinessservices.com
              - link "Security Disclosure" [ref=e103] [cursor=pointer]:
                - /url: mailto:services@mabusinessservices.com
              - link "Visit Website" [ref=e104] [cursor=pointer]:
                - /url: https://mabusinessservices.com
        - paragraph [ref=e106]: © 2026 MA Business Services. All rights reserved.
  - status
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Navigation & Core Functionality Tests
  5   |  * Testing basic app navigation and P0 fixes
  6   |  */
  7   | 
  8   | test.describe('Navigation & Core Features', () => {
  9   |   
  10  |   test('should navigate between landing page and login', async ({ page }) => {
  11  |     // Start at home
  12  |     await page.goto('/');
  13  |     await expect(page).toHaveURL('/');
  14  |     
  15  |     // Navigate to connect page
  16  |     await page.getByRole('link', { name: /Connect Gmail/i }).click();
  17  |     await expect(page).toHaveURL(/.*\/connect/);
  18  |     
  19  |     // Check for back navigation (if exists)
  20  |     // Some pages might not have explicit back buttons at landing level
  21  |   });
  22  | 
  23  |   test('should have working footer links on landing page', async ({ page }) => {
  24  |     await page.goto('/');
  25  |     
  26  |     // Scroll to footer
  27  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  28  |     
  29  |     // Check for company info
  30  |     await expect(page.locator('text=/MA Business Services/i').first()).toBeVisible();
  31  |   });
  32  | 
  33  |   test('should load security/privacy page if linked', async ({ page }) => {
  34  |     await page.goto('/');
  35  |     
  36  |     // Try to find and click security link
  37  |     const securityLink = page.getByRole('link', { name: /View security|Security/i });
  38  |     
> 39  |     if (await securityLink.isVisible()) {
      |                            ^ Error: locator.isVisible: Error: strict mode violation: getByRole('link', { name: /View security|Security/i }) resolved to 4 elements:
  40  |       await securityLink.click();
  41  |       await page.waitForLoadState('networkidle');
  42  |       
  43  |       // Should navigate successfully
  44  |       await expect(page.locator('body')).toBeVisible();
  45  |     }
  46  |   });
  47  | 
  48  |   test('P0-5: 401 redirects should go to /connect (not /)', async ({ page }) => {
  49  |     // Try to access protected endpoint directly
  50  |     const response = await page.goto('/dashboard');
  51  |     
  52  |     await page.waitForLoadState('networkidle');
  53  |     
  54  |     // Should redirect to /connect or / (landing)
  55  |     const url = page.url();
  56  |     
  57  |     // P0-5 fix: should prefer /connect for better UX
  58  |     const validRedirect = url.includes('/connect') || url.endsWith('/');
  59  |     expect(validRedirect).toBeTruthy();
  60  |   });
  61  | 
  62  |   test('should handle 404 pages gracefully', async ({ page }) => {
  63  |     const response = await page.goto('/this-page-does-not-exist-12345');
  64  |     
  65  |     // Should either show 404 page or redirect
  66  |     await expect(page.locator('body')).toBeVisible();
  67  |     
  68  |     // App should still be functional
  69  |     await page.goto('/');
  70  |     await expect(page.locator('.landing-page')).toBeVisible();
  71  |   });
  72  | 
  73  |   test('should have consistent navigation structure', async ({ page }) => {
  74  |     await page.goto('/');
  75  |     
  76  |     // Landing page should have clear CTAs
  77  |     const connectButton = page.getByRole('link', { name: /Connect Gmail/i });
  78  |     await expect(connectButton).toBeVisible();
  79  |     
  80  |     // Click and verify navigation works
  81  |     await connectButton.click();
  82  |     await expect(page).toHaveURL(/.*\/connect/);
  83  |     
  84  |     // Check login page has proper structure
  85  |     await expect(page.locator('.login-screen')).toBeVisible();
  86  |     await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  87  |   });
  88  | 
  89  |   test('should load without console errors', async ({ page }) => {
  90  |     const consoleErrors: string[] = [];
  91  |     
  92  |     page.on('console', msg => {
  93  |       if (msg.type() === 'error') {
  94  |         consoleErrors.push(msg.text());
  95  |       }
  96  |     });
  97  |     
  98  |     await page.goto('/');
  99  |     await page.waitForLoadState('networkidle');
  100 |     
  101 |     // Filter out expected errors (like network errors in dev mode)
  102 |     const criticalErrors = consoleErrors.filter(err => 
  103 |       !err.includes('net::ERR_') && 
  104 |       !err.includes('Failed to fetch') &&
  105 |       !err.includes('404')
  106 |     );
  107 |     
  108 |     // Should have no critical errors
  109 |     expect(criticalErrors.length).toBe(0);
  110 |   });
  111 | 
  112 |   test('should load CSS and assets correctly', async ({ page }) => {
  113 |     await page.goto('/');
  114 |     
  115 |     // Check that styled elements render
  116 |     const body = page.locator('body');
  117 |     const backgroundColor = await body.evaluate(el => 
  118 |       window.getComputedStyle(el).backgroundColor
  119 |     );
  120 |     
  121 |     // Should have background color set (not default white/transparent)
  122 |     expect(backgroundColor).toBeTruthy();
  123 |     expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  124 |   });
  125 | });
  126 | 
```