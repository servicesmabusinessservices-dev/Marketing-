import './PageLayouts.css';

const TwoColumnPage = ({ aside, children, className = '' }) => (
  <div className={`page-two-col ${className}`}>
    <div className="page-two-col__aside">{aside}</div>
    <div className="page-two-col__main">{children}</div>
  </div>
);

export default TwoColumnPage;
