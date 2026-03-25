import './PageLayouts.css';

const FullWidthPage = ({ title, subtitle, actions, children, className = '' }) => (
  <div className={`page-full ${className}`}>
    {(title || actions) && (
      <div className="page-full__header">
        <div>
          {title && <h1 className="page-full__title">{title}</h1>}
          {subtitle && <p className="page-full__subtitle">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

export default FullWidthPage;
