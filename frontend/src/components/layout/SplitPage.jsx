import './PageLayouts.css';

const SplitPage = ({ left, right, className = '' }) => (
  <div className={`page-split ${className}`}>
    <div className="page-split__left">{left}</div>
    <div className="page-split__right">{right}</div>
  </div>
);

export default SplitPage;
