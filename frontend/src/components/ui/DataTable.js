import React, { useState, useMemo, useCallback } from 'react';
import './DataTable.css';

const PAGE_SIZES = [10, 25, 50, 100];

const DataTable = ({
  columns,
  data,
  sortable = false,
  filterable = false,
  paginated = false,
  pageSize: initialPageSize = 25,
  onRowClick,
  selectable = false,
  onSelectionChange,
  emptyMessage = 'No data to display.',
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState(new Set());

  const handleSort = useCallback((key) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }, [sortable, sortKey, sortDir]);

  const handleFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((row) =>
      Object.entries(filters).every(([key, val]) => {
        if (!val) return true;
        const cell = row[key];
        if (cell == null) return false;
        return String(cell).toLowerCase().includes(val.toLowerCase());
      })
    );
  }, [data, filters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const paged = paginated ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(next);
      return next;
    });
  }, [onSelectionChange]);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allIds = paged.map((r) => r.id ?? r.contactId ?? r.campaignId);
      const allSelected = allIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      onSelectionChange?.(next);
      return next;
    });
  }, [paged, onSelectionChange]);

  if (!data || data.length === 0) {
    return <div className="data-table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th className="select-col">
                <input type="checkbox" onChange={toggleAll}
                  checked={paged.length > 0 && paged.every((r) => selected.has(r.id ?? r.contactId ?? r.campaignId))} />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key}
                className={sortable && col.sortable !== false ? 'sortable' : ''}
                onClick={() => col.sortable !== false && handleSort(col.key)}>
                {col.label}
                {sortable && col.sortable !== false && sortKey === col.key && (
                  <span className="sort-indicator active">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
          {filterable && (
            <tr className="data-table-filter-row">
              {selectable && <th />}
              {columns.map((col) => (
                <th key={col.key}>
                  {col.filterable !== false ? (
                    <input
                      placeholder={`Filter ${col.label}…`}
                      value={filters[col.key] || ''}
                      onChange={(e) => handleFilter(col.key, e.target.value)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {paged.map((row, i) => {
            const rowId = row.id ?? row.contactId ?? row.campaignId ?? i;
            return (
              <tr key={rowId}
                className={onRowClick ? 'clickable' : ''}
                onClick={() => onRowClick?.(row)}>
                {selectable && (
                  <td className="select-col" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(rowId)} onChange={() => toggleSelect(rowId)} />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {paginated && totalPages > 1 && (
        <div className="data-table-pagination">
          <div>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </div>
          <div className="page-controls">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
