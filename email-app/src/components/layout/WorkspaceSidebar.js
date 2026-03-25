import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeedback } from '../../context/FeedbackContext';
import { useEmailSummary, useJourneySummary } from '../../hooks/useApi';
import Icon from '../ui/Icon';

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'home', label: 'Dashboard', to: '/dashboard' },
  { id: 'inbox', icon: 'inbox', label: 'Inbox', to: '/emails', badgeKey: 'inbox' },
  { id: 'bulk', icon: 'bulk', label: 'Bulk Email', to: '/emails/bulk' },
  { divider: true },
  { id: 'contacts', icon: 'users', label: 'Contacts', to: '/marketing?tab=contacts' },
  { id: 'pipeline', icon: 'pipeline', label: 'Pipeline', to: '/marketing/pipeline' },
  { id: 'campaigns', icon: 'campaign', label: 'Campaigns', to: '/marketing?tab=campaigns' },
  { id: 'templates', icon: 'template', label: 'Templates', to: '/marketing/template-editor' },
  { id: 'journeys', icon: 'journey', label: 'Journeys', to: '/marketing?tab=journeys', badgeKey: 'journeys' },
  { divider: true },
  { id: 'analytics', icon: 'bar', label: 'Analytics', to: '/marketing/analytics' },
  { id: 'suppression', icon: 'shield', label: 'Suppression', to: '/marketing/suppression' }
];

const WorkspaceSidebar = ({ onLogout, userEmail, mobileOpen, onMobileClose, sidebarRef }) => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  const emailSummaryQuery = useEmailSummary();
  const journeySummaryQuery = useJourneySummary();
  const sidebarError = emailSummaryQuery.error || journeySummaryQuery.error;
  const emailSummary = emailSummaryQuery.data;
  const journeySummary = journeySummaryQuery.data;
  const sidebarIsCollapsed = collapsed && !mobileOpen;

  useEffect(() => {
    if (!sidebarError) {
      return undefined;
    }

    showFeedback(sidebarError.response?.data?.error || 'Failed to load workspace metrics.', 'error');
    return undefined;
  }, [showFeedback, sidebarError]);

  const unreadCount = emailSummary?.unreadCount;
  const inboxBadge = unreadCount !== undefined && unreadCount !== null ? String(unreadCount) : null;
  const activeEnrollments = (journeySummary?.journeys || []).reduce(
    (total, journey) => total + (journey.activeEnrollments || 0),
    0
  );
  const journeysBadge = journeySummary ? String(activeEnrollments) : null;

  const navItems = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      if (item.divider) {
        return item;
      }

      if (item.badgeKey === 'inbox') {
        return { ...item, badge: inboxBadge };
      }

      if (item.badgeKey === 'journeys') {
        return { ...item, badge: journeysBadge, badgeColor: activeEnrollments > 0 ? 'green' : '' };
      }

      return item;
    });
  }, [activeEnrollments, inboxBadge, journeysBadge]);

  const handleNavClick = (item) => {
    navigate(item.to);
    onMobileClose?.();
  };

  const isActive = (item) => {
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
    <aside
      id="workspace-sidebar"
      ref={sidebarRef}
      className={`sidebar${sidebarIsCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
      aria-label="Workspace sidebar"
      aria-hidden={isMobile && !mobileOpen ? true : undefined}
      tabIndex={mobileOpen ? -1 : undefined}
    >
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
          aria-label={sidebarIsCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          title={sidebarIsCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarIsCollapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {navItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="sidebar-divider" />;
          }

          return (
            <div key={item.id} className="sidebar-nav-row">
              <button
                type="button"
                className={`nav-item ${isActive(item) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
                aria-current={isActive(item) ? 'page' : undefined}
                title={sidebarIsCollapsed ? item.label : undefined}
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
            <div className="user-name">Admin User</div>
            <div className="user-email">{userEmail || 'signed-in-user'}</div>
          </div>
          <div className="status-dot" />
        </div>
        <div className="sidebar-footer-action">
          <button
            type="button"
            className="nav-item"
            onClick={() => { onLogout(); onMobileClose?.(); }}
            title={sidebarIsCollapsed ? 'Sign out' : undefined}
          >
            <span className="nav-icon">
              <Icon name="logout" size={14} />
            </span>
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
