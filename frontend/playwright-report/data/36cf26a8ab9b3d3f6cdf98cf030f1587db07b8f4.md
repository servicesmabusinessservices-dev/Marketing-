# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> Authentication & Security >> should navigate to /connect login page
- Location: e2e\auth-flow.spec.ts:24:7

# Error details

```
Test timeout of 30000ms exceeded.
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