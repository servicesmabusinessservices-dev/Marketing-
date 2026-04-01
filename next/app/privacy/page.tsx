import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Gmail Manager",
  description: "How Gmail Manager collects, uses, and protects your data.",
};

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-slate-900">
      <header className="mb-8">
        <p className="text-sm text-slate-500">Updated April 2026</p>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-slate-600">
          How Gmail Manager collects, uses, and protects your data.
        </p>
      </header>

      <div className="prose prose-slate max-w-none">
        <h2>1. Who We Are</h2>
        <p>
          Gmail Manager is operated by the team behind marketing-zeta-flame.vercel.app. You can
          reach us at <a href="mailto:support@gmailmanager.app">support@gmailmanager.app</a>.
        </p>

        <h2>2. Data We Collect</h2>
        <ul>
          <li>Email address for account creation and notifications.</li>
          <li>OAuth tokens to connect to Gmail with the minimum required scopes.</li>
          <li>Telemetry (performance/errors) to keep the service reliable.</li>
        </ul>

        <h2>3. How We Use Data</h2>
        <ul>
          <li>Provide core product features such as inbox actions and automations.</li>
          <li>Send essential account communication (onboarding, security notices).</li>
          <li>Improve reliability and security through anonymized analytics.</li>
        </ul>

        <h2>4. Gmail API Scopes</h2>
        <p>We request the smallest scopes needed for the selected feature set:</p>
        <ul>
          <li><code>https://www.googleapis.com/auth/gmail.readonly</code> — read metadata.</li>
          <li><code>https://www.googleapis.com/auth/gmail.modify</code> — apply labels or archive.</li>
          <li><code>https://www.googleapis.com/auth/gmail.send</code> — send messages you initiate.</li>
        </ul>
        <p>We never request full mail access unless a feature explicitly needs it.</p>

        <h2>5. Storage & Retention</h2>
        <ul>
          <li>Access tokens are stored encrypted at rest.</li>
          <li>Email content is not persisted on our servers; processing streams from Gmail.</li>
          <li>Telemetry is retained for 30 days; access logs for 90 days.</li>
        </ul>

        <h2>6. Data Deletion</h2>
        <p>
          You can revoke Gmail access anytime from Google Security settings or by emailing
          support@gmailmanager.app. We delete related tokens and cached data within 24 hours of
          request.
        </p>

        <h2>7. Subprocessors</h2>
        <p>We use Vercel for hosting and Sentry for error tracking. Each meets SOC 2 or equivalent standards.</p>

        <h2>8. Contact</h2>
        <p>Email <a href="mailto:support@gmailmanager.app">support@gmailmanager.app</a>.</p>
      </div>
    </main>
  );
}
