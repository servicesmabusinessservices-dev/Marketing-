import React from 'react';
import './Sidebar.css';

const Sidebar = ({
  searchTerm,
  onSearchChange,
  onOpenBulk,
  onOpenBulkPage,
  onRefresh,
  totalEmails,
  selectedCount,
  classificationFilter,
  onClassificationFilterChange,
  classificationSort,
  onClassificationSortChange,
  sortBy,
  onSortByChange,
  pageSize,
  onPageSizeChange,
  onLoadMore,
  canLoadMore,
  isLoadingMore,
  classificationSummary
}) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <h2>Mail Workspace</h2>
        <p>Single account inbox</p>
      </div>

      <div className="sidebar-section">
        <label htmlFor="sidebar-search" className="sidebar-label">Search</label>
        <div className="sidebar-search-wrap">
          <span className="sidebar-search-icon">⌕</span>
          <input
            id="sidebar-search"
            type="text"
            className="sidebar-search-input"
            placeholder="Search emails"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-section sidebar-status">
        <div className="sidebar-chip">Total: {totalEmails}</div>
        <div className="sidebar-chip">Selected: {selectedCount}</div>
      </div>

      <div className="sidebar-section">
        <label htmlFor="classification-filter" className="sidebar-label">Classification Filter</label>
        <select
          id="classification-filter"
          className="sidebar-select"
          value={classificationFilter}
          onChange={(e) => onClassificationFilterChange(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Lead">Lead</option>
          <option value="Potential Client">Potential Client</option>
          <option value="Client">Client</option>
          <option value="Follow Up">Follow Up</option>
          <option value="Not Relevant">Not Relevant</option>
          <option value="None">None</option>
        </select>

        <label htmlFor="sort-by" className="sidebar-label">Sort By</label>
        <select
          id="sort-by"
          className="sidebar-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          <option value="date">Date</option>
          <option value="classification">Classification</option>
          <option value="from">From</option>
          <option value="subject">Subject</option>
        </select>

        <label htmlFor="classification-sort" className="sidebar-label">Sort Direction</label>
        <select
          id="classification-sort"
          className="sidebar-select"
          value={classificationSort}
          onChange={(e) => onClassificationSortChange(e.target.value)}
        >
          <option value="none">Default</option>
          <option value="asc">A to Z</option>
          <option value="desc">Z to A</option>
        </select>
      </div>

      <div className="sidebar-section">
        <label htmlFor="page-size" className="sidebar-label">Page Size</label>
        <select
          id="page-size"
          className="sidebar-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>

        {canLoadMore && (
          <button className="sidebar-btn" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More Emails'}
          </button>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Saved Classification Counts</div>
        <div className="sidebar-summary-list">
          {classificationSummary.length === 0 ? (
            <div className="sidebar-summary-item">No saved tags yet</div>
          ) : (
            classificationSummary.map((item) => (
              <div key={item.classification} className="sidebar-summary-item">
                <span>{item.classification}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section sidebar-actions">
        <button className="sidebar-btn sidebar-btn-primary" onClick={onOpenBulk}>Quick Bulk Modal</button>
        <button className="sidebar-btn" onClick={onOpenBulkPage}>Bulk Email Page</button>
        <button className="sidebar-btn" onClick={onRefresh}>Refresh</button>
      </div>
    </aside>
  );
};

export default Sidebar;
