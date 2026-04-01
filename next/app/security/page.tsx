import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Compliance | Gmail Manager",
  description: "Our commitments for handling Gmail data safely.",
};

export default function Security() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-slate-900">
      <header className="mb-8">
        <p className="text-sm text-slate-500">Updated April 2026</p>
        <h1 className="text-3xl font-semibold">Security & Compliance</h1>
        <p className="text-slate-600">Our commitments for handling Gmail data safely.</p>
      </header>

      <div className="prose prose-slate max-w-none">
        <h2>Security Principles</h2>
        <ul>
          <li>Least privilege: only the scopes needed for the feature you use.</li>
          <li>Encryption: TLS in transit, encrypted tokens at rest.</li>
          <li>Separation: app secrets stored outside the codebase; no tokens in logs.</li>
        </ul>

        <h2>Data Practices</h2>
        <ul>
          <li>We avoid storing email bodies; processing is streamed from Gmail.</li>
          <li>Access logs retained 90 days for security investigations.</li>
          <li>Data deletion within 24 hours on request or account closure.</li>
        </ul>

        <h2>Customer Controls</h2>
        <ul>
          <li>Revoke access anytime via Google Security or in-app disconnect.</li>
          <li>Export available data by emailing support@gmailmanager.app.</li>
          <li>Role-based access planned for multi-seat accounts.</li>
        </ul>

        <h2>Incident Response</h2>
        <p>
          Security incidents are triaged within 24 hours. Affected users are notified with impact,
          remediation steps, and required user actions.
        </p>
      </div>
    </main>
  );
}
