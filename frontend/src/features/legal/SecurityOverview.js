import FullWidthPage from '../../components/layout/FullWidthPage';
import '../../styles/legal.css';

const SecurityOverview = () => (
  <FullWidthPage
    title="Security & Compliance"
    subtitle="Our commitments for handling Gmail data safely."
    className="legal-page"
  >
    <section>
      <h2>Security Principles</h2>
      <ul>
        <li>Least privilege: only the scopes needed for the feature you use.</li>
        <li>Encryption: TLS in transit, encrypted tokens at rest.</li>
        <li>Separation: app secrets stored outside the codebase; no tokens in logs.</li>
      </ul>
    </section>

    <section>
      <h2>Data Practices</h2>
      <ul>
        <li>We avoid storing email bodies; processing is streamed from Gmail where possible.</li>
        <li>Access logs retained 90 days for security investigations.</li>
        <li>Data deletion honored within 24 hours of a request or account closure.</li>
      </ul>
    </section>

    <section>
      <h2>Customer Controls</h2>
      <ul>
        <li>Revoke access anytime via Google Security or in-app disconnect.</li>
        <li>Export available data by emailing support@gmailmanager.app.</li>
        <li>Role-based access planned for multi-seat accounts.</li>
      </ul>
    </section>

    <section>
      <h2>Incident Response</h2>
      <p>
        Security incidents are triaged within 24 hours. Affected users are notified with impact,
        remediation steps, and required user actions.
      </p>
    </section>
  </FullWidthPage>
);

export default SecurityOverview;
