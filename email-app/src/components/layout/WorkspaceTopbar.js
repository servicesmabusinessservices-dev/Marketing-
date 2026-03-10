import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

const getTitle = (location) => {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');

  if (location.pathname === '/' || location.pathname === '/auth-success' || location.pathname === '/auth-error') {
    return { crumb: 'Welcome', title: 'Sign In' };
  }

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

const WorkspaceTopbar = ({ isDark, toggleTheme, onMenuToggle, isAuthenticated = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = getTitle(location);

  const showInboxAction = isAuthenticated && (location.pathname === '/emails' || location.pathname.startsWith('/email/'));
  const showDashboardAction = isAuthenticated && location.pathname === '/dashboard';

  return (
    <header className="topbar">
      {/* Hamburger — visible only on mobile (CSS controls display) */}
      <button
        type="button"
        className="topbar-hamburger"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <Icon name="menu" size={18} />
      </button>
      <div className="topbar-breadcrumb">
        <span>{meta.crumb}</span>
        <span>/</span>
        <span className="current">{meta.title}</span>
      </div>
      <div className="topbar-right">
        {isAuthenticated && (
          <div className="search-box">
            <Icon name="search" size={13} color="var(--text-3)" />
            <input placeholder="Search contacts, emails" />
          </div>
        )}
        {isAuthenticated && (
          <div className="topbar-btn">
            <Icon name="bell" size={14} />
          </div>
        )}
        {!isAuthenticated && (
          <button
            type="button"
            className="topbar-btn primary"
            onClick={() => navigate('/')}
          >
            <Icon name="mail" size={13} />
            Sign In
          </button>
        )}
        {showInboxAction && (
          <div className="topbar-btn primary">
            <Icon name="bulk" size={13} />
            New Campaign
          </div>
        )}
        {showDashboardAction && (
          <div className="topbar-btn primary">
            <Icon name="plus" size={13} />
            Quick Add
          </div>
        )}
        <button type="button" className="topbar-btn icon-only" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Icon name={isDark ? 'sun' : 'moon'} size={15} />
        </button>
      </div>
    </header>
  );
};

export default WorkspaceTopbar;
