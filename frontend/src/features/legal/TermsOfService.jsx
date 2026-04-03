import { Helmet } from 'react-helmet-async';
import FullWidthPage from '../../components/layout/FullWidthPage';
import '../../styles/legal.css';

const TermsOfService = () => (
  <>
    <Helmet>
      <title>Terms of Service - Gmail Manager</title>
      <meta name="description" content="Read the terms of service that govern using Gmail Manager for multi-account email management and automation." />
      <meta property="og:title" content="Terms of Service - Gmail Manager" />
      <meta property="og:description" content="Read the terms of service for using Gmail Manager for email management and automation." />
      <meta property="og:url" content="https://marketing-zeta-flame.vercel.app/terms" />
      <link rel="canonical" href="https://marketing-zeta-flame.vercel.app/terms" />
    </Helmet>
    <FullWidthPage
      title="Terms of Service"
      subtitle="The rules that govern using Gmail Manager."
      className="legal-page"
    >
    <section>
      <h2>1. Acceptance</h2>
      <p>By creating an account you agree to these Terms and our Privacy Policy.</p>
    </section>

    <section>
      <h2>2. Account & Eligibility</h2>
      <ul>
        <li>You must be 18+ and authorized to connect the Gmail accounts you add.</li>
        <li>You are responsible for keeping credentials secure and access limited.</li>
      </ul>
    </section>

    <section>
      <h2>3. Permitted Use</h2>
      <ul>
        <li>No sending spam, phishing, or violating Google Workspace policies.</li>
        <li>No reverse-engineering or misuse of Gmail APIs.</li>
        <li>Use only within the scopes disclosed in the product UI.</li>
      </ul>
    </section>

    <section>
      <h2>4. Service Availability</h2>
      <p>
        We operate on a best-effort basis with planned maintenance windows. We may pause access to
        investigate abuse or security concerns.
      </p>
    </section>

    <section>
      <h2>5. Fees & Refunds</h2>
      <p>
        If paid plans launch, billing will be monthly with a 7-day grace period. Refunds are handled
        case-by-case for outages exceeding 24 hours in a billing cycle.
      </p>
    </section>

    <section>
      <h2>6. Data Handling</h2>
      <p>
        We never sell customer data. Gmail content is processed transiently to perform the actions you
        request. See the Privacy Policy for full details.
      </p>
    </section>

    <section>
      <h2>7. Termination</h2>
      <p>
        You may cancel anytime. We may terminate accounts that violate these Terms or Google policies.
        Access tokens and cached data are deleted within 24 hours of termination.
      </p>
    </section>

    <section>
      <h2>8. Liability</h2>
      <p>
        The service is provided “as is” without warranties. To the maximum extent permitted by law, our
        aggregate liability is limited to fees paid in the last 3 months.
      </p>
    </section>

    <section>
      <h2>9. Changes</h2>
      <p>We may update these Terms and will post the effective date on this page.</p>
    </section>

    <section className="legal-meta">
      <p><strong>Last Updated:</strong> April 2, 2026</p>
      <p><strong>Effective Date:</strong> April 2, 2026</p>
    </section>
  </FullWidthPage>
  </>
);

export default TermsOfService;
