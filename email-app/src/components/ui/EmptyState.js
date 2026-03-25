import React from 'react';
import Icon from './Icon';
import './EmptyState.css';

/** Known Icon names from Icon.js — if the icon prop matches one, render <Icon> */
const ICON_NAMES = new Set([
  'inbox', 'users', 'zap', 'mail', 'list', 'template', 'campaign',
  'journey', 'shield', 'search', 'plus', 'pipeline', 'bar', 'bulk',
  'bell', 'sun', 'moon', 'menu', 'chevron', 'check',
]);

/**
 * @param {string}   title
 * @param {string}   [subtitle]
 * @param {string}   [icon]   - Icon name (e.g. 'users') OR emoji/character
 * @param {{ label: string, onClick: () => void }} [action]
 * @param {'sm'|'md'|'lg'|'top'} [size='md']
 */
const EmptyState = ({ icon, title, subtitle, action, size = 'md' }) => (
  <div className={`empty-state empty-state-${size}`}>
    {icon && (
      <div className="empty-state-icon">
        {ICON_NAMES.has(icon) ? (
          <Icon name={icon} size={size === 'sm' ? 24 : 32} color="var(--text-3)" decorative />
        ) : (
          icon
        )}
      </div>
    )}
    {title && <p className="empty-state-title">{title}</p>}
    {subtitle && <small className="empty-state-subtitle">{subtitle}</small>}
    {action && (
      <button
        type="button"
        className="btn btn--secondary btn--sm empty-state-action"
        onClick={action.onClick}
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
