import React from 'react';

/**
 * @param {string}   title
 * @param {string}   [subtitle]
 * @param {string}   [icon]   - emoji or character to display above title
 * @param {{ label: string, onClick: () => void }} [action]
 * @param {'sm'|'md'|'lg'|'top'} [size='md']
 */
const EmptyState = ({ icon, title, subtitle, action, size = 'md' }) => (
  <div className={`empty-state empty-state-${size}`}>
    {icon && <div className="empty-state-icon">{icon}</div>}
    <p>{title}</p>
    {subtitle && <small>{subtitle}</small>}
    {action && (
      <button
        type="button"
        className="topbar-btn empty-state-action"
        onClick={action.onClick}
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
