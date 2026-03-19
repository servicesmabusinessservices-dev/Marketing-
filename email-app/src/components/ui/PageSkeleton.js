import './PageSkeleton.css';

/**
 * Skeleton loading screen shown while a lazy-loaded page chunk is fetching.
 * Matches the overall layout chrome so there's no jarring flash.
 */
export default function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading page content">
      {/* Fake page header */}
      <div className="page-skeleton__header">
        <div className="skeleton-block page-skeleton__block--title" />
        <div className="skeleton-block page-skeleton__block--action" />
      </div>

      {/* Fake stats row */}
      <div className="page-skeleton__stats">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="page-skeleton__stat-card">
            <div className="skeleton-block page-skeleton__block--stat-label" />
            <div className="skeleton-block page-skeleton__block--stat-value" />
          </div>
        ))}
      </div>

      {/* Fake content rows */}
      <div className="page-skeleton__rows">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="page-skeleton__row">
            <div className="skeleton-block page-skeleton__block--avatar" />
            <div className="page-skeleton__grow">
              <div className="skeleton-block page-skeleton__line--primary" style={{ width: `${50 + i * 8}%` }} />
              <div className="skeleton-block page-skeleton__line--secondary" style={{ width: `${30 + i * 5}%` }} />
            </div>
            <div className="skeleton-block page-skeleton__block--meta" />
          </div>
        ))}
      </div>
    </div>
  );
}
