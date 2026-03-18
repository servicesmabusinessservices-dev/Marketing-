import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeedback } from '../../context/FeedbackContext';
import { useEmailSummary, useJourneySummary } from '../../hooks/useApi';
import { handleUnauthorized } from '../../utils/session';
import Icon from '../ui/Icon';

const PUBLIC_NAV_ITEMS = [
  { id: 'welcome', icon: 'home', label: 'Welcome', to: '/' },
  { id: 'signin', icon: 'mail', label: 'Sign In', to: '/' },
  { divider: true },
  { id: 'dashboard', icon: 'home', label: 'Dashboard', to: '/dashboard', requiresAuth: true },
  { id: 'inbox', icon: 'inbox', label: 'Inbox', to: '/emails', requiresAuth: true },
  { id: 'bulk', icon: 'bulk', label: 'Bulk Email', to: '/emails/bulk', requiresAuth: true },
  { divider: true },
  { id: 'contacts', icon: 'users', label: 'Contacts', to: '/marketing?tab=contacts', requiresAuth: true },
  { id: 'journeys', icon: 'journey', label: 'Journeys', to: '/marketing?tab=journeys', requiresAuth: true },
  { id: 'analytics', icon: 'bar', label: 'Analytics', to: '/marketing/analytics', requiresAuth: true }
];

const WorkspaceSidebar = ({ onLogout, userEmail, mobileOpen, onMobileClose, isAuthenticated = true }) => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');
  const [collapsed, setCollapsed] = useState(false);
  const emailSummaryQuery = useEmailSummary(isAuthenticated);
  const journeySummaryQuery = useJourneySummary(isAuthenticated);
  const sidebarError = emailSummaryQuery.error || journeySummaryQuery.error;
  const emailSummary = isAuthenticated ? emailSummaryQuery.data : null;
  const journeySummary = isAuthenticated ? journeySummaryQuery.data : null;

  useEffect(() => {
    if (!isAuthenticated || !sidebarError) {
      return undefined;
    }

    if (sidebarError.response?.status === 401) {
      handleUnauthorized(navigate, showFeedback);
      return undefined;
    }

    showFeedback(sidebarError.response?.data?.error || 'Failed to load workspace metrics.', 'error');
    return undefined;
  }, [isAuthenticated, navigate, showFeedback, sidebarError]);

  const unreadCount = emailSummary?.unreadCount;
  const inboxBadge = unreadCount !== undefined && unreadCount !== null ? String(unreadCount) : null;
  const activeEnrollments = (journeySummary?.journeys || []).reduce(
    (total, journey) => total + (journey.activeEnrollments || 0),
    0
  );
  const journeysBadge = journeySummary ? String(activeEnrollments) : null;

  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      return PUBLIC_NAV_ITEMS;
    }

    return [
      { id: 'dashboard', icon: 'home', label: 'Dashboard', to: '/dashboard' },
      { id: 'inbox', icon: 'inbox', label: 'Inbox', to: '/emails', badge: inboxBadge },
      { id: 'bulk', icon: 'bulk', label: 'Bulk Email', to: '/emails/bulk' },
      { divider: true },
      { id: 'contacts', icon: 'users', label: 'Contacts', to: '/marketing?tab=contacts' },
      { id: 'pipeline', icon: 'pipeline', label: 'Pipeline', to: '/marketing/pipeline' },
      { id: 'campaigns', icon: 'campaign', label: 'Campaigns', to: '/marketing?tab=campaigns' },
      { id: 'templates', icon: 'template', label: 'Templates', to: '/marketing/template-editor' },
      { id: 'journeys', icon: 'journey', label: 'Journeys', to: '/marketing?tab=journeys', badge: journeysBadge, badgeColor: activeEnrollments > 0 ? 'green' : '' },
      { divider: true },
      { id: 'analytics', icon: 'bar', label: 'Analytics', to: '/marketing/analytics' },
      { id: 'suppression', icon: 'shield', label: 'Suppression', to: '/marketing/suppression' }
    ];
  }, [activeEnrollments, inboxBadge, isAuthenticated, journeysBadge]);

  const handleNavClick = (item) => {
    if (item.requiresAuth && !isAuthenticated) {
      showFeedback('Please sign in to open workspace pages.', 'info');
      navigate('/');
      onMobileClose?.();
      return;
    }

    navigate(item.to);
    onMobileClose?.();
  };

  const isActive = (item) => {
    if (item.id === 'welcome' || item.id === 'signin') {
      return location.pathname === '/' || location.pathname === '/auth-success' || location.pathname === '/auth-error';
    }

    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }

    if (item.id === 'bulk') {
      return location.pathname.startsWith('/emails/bulk');
    }

    if (item.id === 'inbox') {
      return location.pathname === '/emails' || location.pathname.startsWith('/email/');
    }

    if (item.id === 'pipeline') {
      return location.pathname.startsWith('/marketing/pipeline');
    }

    if (item.id === 'analytics') {
      return location.pathname.startsWith('/marketing/analytics');
    }

    if (item.id === 'suppression') {
      return location.pathname.startsWith('/marketing/suppression');
    }

    if (item.id === 'templates') {
      return location.pathname.startsWith('/marketing/template-editor');
    }

    if (item.id === 'contacts' || item.id === 'campaigns' || item.id === 'journeys') {
      if (location.pathname !== '/marketing') {
        return false;
      }
      if (!activeTab && item.id === 'campaigns') {
        return true;
      }
      return activeTab === item.id;
    }

    return location.pathname === item.to;
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">MA</div>
          <div>
            <div className="logo-text">MA Business</div>
            <div className="logo-sub">CRM Workspace</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={isAuthenticated ? 'Workspace navigation' : 'Public navigation'}>
        {navItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="sidebar-divider" />;
          }

          return (
            <div key={item.id} className="sidebar-nav-row">
              <button
                type="button"
                className={`nav-item ${isActive(item) ? 'active' : ''}${item.requiresAuth && !isAuthenticated ? ' disabled' : ''}`}
                onClick={() => handleNavClick(item)}
                aria-current={isActive(item) ? 'page' : undefined}
                aria-disabled={item.requiresAuth && !isAuthenticated ? 'true' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">{(userEmail || 'A')[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{isAuthenticated ? 'Admin User' : 'Guest Mode'}</div>
            <div className="user-email">{isAuthenticated ? (userEmail || 'signed-in-user') : 'Sign in to unlock all pages'}</div>
          </div>
          <div className={`status-dot${isAuthenticated ? '' : ' muted'}`} />
        </div>
        <div className="sidebar-footer-action">
          {isAuthenticated ? (
            <button
              type="button"
              className="nav-item"
              onClick={() => { onLogout(); onMobileClose?.(); }}
              title={collapsed ? 'Sign out' : undefined}
            >
              <span className="nav-icon">
                <Icon name="logout" size={14} />
              </span>
              <span className="nav-label">Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              className="nav-item"
              onClick={() => { navigate('/'); onMobileClose?.(); }}
              title={collapsed ? 'Continue with Google' : undefined}
            >
              <span className="nav-icon">
                <Icon name="mail" size={14} />
              </span>
              <span className="nav-label">Continue with Google</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
