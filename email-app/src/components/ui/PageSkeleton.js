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
        <div className="skeleton-block" style={{ width: '180px', height: '22px', borderRadius: '6px' }} />
        <div className="skeleton-block" style={{ width: '80px', height: '32px', borderRadius: '8px' }} />
      </div>

      {/* Fake stats row */}
      <div className="page-skeleton__stats">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="page-skeleton__stat-card">
            <div className="skeleton-block" style={{ width: '60%', height: '14px', borderRadius: '4px', marginBottom: '10px' }} />
            <div className="skeleton-block" style={{ width: '40%', height: '28px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Fake content rows */}
      <div className="page-skeleton__rows">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="page-skeleton__row">
            <div className="skeleton-block" style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-block" style={{ width: `${50 + i * 8}%`, height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
              <div className="skeleton-block" style={{ width: `${30 + i * 5}%`, height: '12px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-block" style={{ width: '64px', height: '12px', borderRadius: '4px', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
