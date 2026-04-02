import { Link } from 'react-router-dom';
import FullWidthPage from '../../components/layout/FullWidthPage';
import '../../styles/legal.css';
import { hasSession } from '../../utils/session';

const NotFound = () => {
  const homeHref = hasSession() ? '/dashboard' : '/';
  return (
    <FullWidthPage
      title="Page not found"
      subtitle="The link you followed doesn’t exist or has moved."
      className="legal-page"
    >
      <p>Try one of these options:</p>
      <ul>
        <li>
          <Link to={homeHref}>Go back to the home workspace</Link>
        </li>
        <li>
          <Link to="/privacy">Read our Privacy Policy</Link>
        </li>
        <li>
          <Link to="/terms">Review the Terms of Service</Link>
        </li>
        <li>
          <Link to="/security">See our Security commitments</Link>
        </li>
      </ul>
    </FullWidthPage>
  );
};

export default NotFound;
