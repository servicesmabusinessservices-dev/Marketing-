import FullWidthPage from '../../components/layout/FullWidthPage';
import '../../styles/legal.css';

const PrivacyPolicy = () => (
  <FullWidthPage
    title="Privacy Policy"
    subtitle="How Gmail Manager collects, uses, and protects your data."
    className="legal-page"
  >
    <section>
      <h2>1. Who We Are</h2>
      <p>
        Gmail Manager is operated by MA Business Services. Visit us at{" "}
        <a href="https://mabusinessservices.com" target="_blank" rel="noopener noreferrer">mabusinessservices.com</a>.
        You can reach us at services@mabusinessservices.com for any privacy questions.
      </p>
    </section>

    <section>
      <h2>2. Data We Collect</h2>
      <ul>
        <li>Email address for account creation and notifications.</li>
        <li>OAuth tokens to connect to Gmail with the minimum required scopes.</li>
        <li>Product telemetry (performance, errors) to keep the service reliable.</li>
      </ul>
    </section>

    <section>
      <h2>3. How We Use Data</h2>
      <ul>
        <li>Provide core product features such as inbox actions and automations.</li>
        <li>Send essential account communication (onboarding, security notices).</li>
        <li>Improve reliability and security through anonymized analytics.</li>
      </ul>
    </section>

    <section>
      <h2>4. Gmail API Scopes</h2>
      <p>We request the smallest scopes needed for the selected feature set:</p>
      <ul>
        <li><code>https://www.googleapis.com/auth/gmail.readonly</code> — read metadata for listing.</li>
        <li><code>https://www.googleapis.com/auth/gmail.modify</code> — apply labels or archive.</li>
        <li><code>https://www.googleapis.com/auth/gmail.send</code> — send messages or replies you initiate.</li>
      </ul>
      <p>We never request <code>gmail.compose</code> or full mail access unless a feature explicitly needs it.</p>
    </section>

    <section>
      <h2>5. Storage & Retention</h2>
      <ul>
        <li>Access tokens are stored encrypted at rest.</li>
        <li>Email content is not persisted on our servers; we stream from Gmail when needed.</li>
        <li>Telemetry is retained for 30 days; access logs for 90 days.</li>
      </ul>
    </section>

    <section>
      <h2>6. Data Deletion</h2>
      <p>
        You can revoke Gmail access anytime from Google Security settings or by emailing
        services@mabusinessservices.com. We delete related tokens and cached data within 24 hours of request.
      </p>
    </section>

    <section>
      <h2>7. Subprocessors</h2>
      <p>We use Vercel for hosting and Sentry for error tracking. Each meets SOC 2 or equivalent standards.</p>
    </section>

    <section>
      <h2>8. Contact</h2>
      <p>Questions? Email services@mabusinessservices.com. We respond within two business days.</p>
    </section>
  </FullWidthPage>
);

export default PrivacyPolicy;
