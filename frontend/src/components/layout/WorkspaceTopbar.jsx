import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import NotificationPanel from '../ui/NotificationPanel';

const getTitle = (location) => {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');

  if (location.pathname === '/dashboard') {
    return { crumb: 'Home', title: 'Dashboard' };
  }

  if (location.pathname.startsWith('/emails/bulk')) {
    return { crumb: 'Email', title: 'Bulk Email' };
  }

  if (location.pathname === '/emails' || location.pathname.startsWith('/email/')) {
    return { crumb: 'Email', title: 'Inbox' }; 
  }

  if (location.pathname.startsWith('/marketing/pipeline')) {
    return { crumb: 'CRM', title: 'Pipeline Board' };
  }

  if (location.pathname.startsWith('/marketing/analytics')) {
    return { crumb: 'Insights', title: 'Analytics' };
  }

  if (location.pathname.startsWith('/marketing/template-editor')) {
    return { crumb: 'Marketing', title: 'Templates' };
  }

  if (location.pathname.startsWith('/marketing/suppression')) {
    return { crumb: 'Marketing', title: 'Suppression List' };
  }

  if (location.pathname.match(/^\/marketing\/contacts\/.+/)) {
    return { crumb: 'CRM', title: 'Contact Profile' };
  }

  if (location.pathname.match(/^\/marketing\/journeys\/.+/)) {
    return { crumb: 'Marketing', title: 'Journey Builder' };
  }

  if (location.pathname === '/marketing' && tab === 'contacts') {
    return { crumb: 'CRM', title: 'Contacts' };
  }

  if (location.pathname === '/marketing' && tab === 'journeys') {
    return { crumb: 'Marketing', title: 'Journeys' };
  }

  if (location.pathname === '/marketing') {
    return { crumb: 'Marketing', title: 'Campaigns' };
  }

  return { crumb: 'Home', title: 'Workspace' };
};

const WorkspaceTopbar = ({ isDark, toggleTheme, onMenuToggle, mobileMenuOpen = false, menuButtonRef, onOpenPalette }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = getTitle(location);

  const showInboxAction = location.pathname === '/emails' || location.pathname.startsWith('/email/');
  const showDashboardAction = location.pathname === '/dashboard';
  const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="topbar" role="banner">
      <button
        ref={menuButtonRef}
        type="button"
        className="topbar-hamburger"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
        aria-expanded={mobileMenuOpen}
        aria-controls="workspace-sidebar"
      >
        <Icon name="menu" size={18} decorative />
      </button>
      <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
        <span>{meta.crumb}</span>
        <span aria-hidden="true">/</span>
        <span className="current">{meta.title}</span>
      </nav>
      <div className="topbar-right">
        <button
          type="button"
          className="search-box topbar-search"
          onClick={onOpenPalette}
          aria-label="Open command palette (Ctrl+K)"
          style={{ cursor: 'pointer' }}
        >
          <Icon name="search" size={13} color="var(--text-3)" decorative />
          <span style={{ color: 'var(--text-4)', fontSize: 'var(--text-sm)' }}>Search... ⌘K</span>
        </button>
        <NotificationPanel />
        {showInboxAction && (
          <button
            type="button"
            className="topbar-btn primary topbar-btn-mobile-preserve"
            onClick={() => navigate('/emails/bulk')}
            aria-label="Create new bulk email campaign"
            title="Create new bulk email campaign"
          >
            <Icon name="bulk" size={13} decorative />
            <span className="topbar-btn-text">New Campaign</span>
          </button>
        )}
        {showDashboardAction && (
          <button
            type="button"
            className="topbar-btn primary topbar-btn-mobile-preserve"
            onClick={() => navigate('/marketing?tab=contacts')}
            aria-label="Open contacts workspace"
            title="Open contacts workspace"
          >
            <Icon name="plus" size={13} decorative />
            <span className="topbar-btn-text">Quick Add</span>
          </button>
        )}
        <button type="button" className="topbar-btn icon-only" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
          <Icon name={isDark ? 'sun' : 'moon'} size={15} decorative />
        </button>
      </div>
    </header>
  );
};

export default WorkspaceTopbar;
