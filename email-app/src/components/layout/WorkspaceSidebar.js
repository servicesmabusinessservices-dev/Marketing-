import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gmailService } from '../../services/gmailService';
import { useFeedback } from '../../context/FeedbackContext';
import { handleUnauthorized } from '../../utils/session';
import Icon from '../ui/Icon';

const WorkspaceSidebar = ({ onLogout, userEmail }) => {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');
  const [emailSummary, setEmailSummary] = useState(null);
  const [journeySummary, setJourneySummary] = useState(null);

  useEffect(() => {
    const loadSidebarMetrics = async () => {
      try {
        const [emailData, journeyData] = await Promise.all([
          gmailService.getEmailSummary(),
          gmailService.getJourneySummary()
        ]);
        setEmailSummary(emailData);
        setJourneySummary(journeyData);
      } catch (error) {
        if (error.response?.status === 401) {
          handleUnauthorized(navigate, showFeedback);
          return;
        }
        showFeedback(error.response?.data?.error || 'Failed to load workspace metrics.', 'error');
      }
    };

    loadSidebarMetrics();
  }, [navigate, showFeedback]);

  const unreadCount = emailSummary?.unreadCount;
  const inboxBadge = unreadCount !== undefined && unreadCount !== null ? String(unreadCount) : null;
  const activeEnrollments = (journeySummary?.journeys || []).reduce(
    (total, journey) => total + (journey.activeEnrollments || 0),
    0
  );
  const journeysBadge = journeySummary ? String(activeEnrollments) : null;

  const navItems = [
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
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">MA</div>
          <div>
            <div className="logo-text">MA Business</div>
            <div className="logo-sub">CRM Workspace</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="sidebar-divider" />;
          }

          return (
            <div key={item.id} style={{ padding: '0 10px' }}>
              <div
                className={`nav-item ${isActive(item) ? 'active' : ''}`}
                onClick={() => navigate(item.to)}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} size={15} />
                </span>
                {item.label}
                {item.badge && <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">{(userEmail || 'A')[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">Admin User</div>
            <div className="user-email">{userEmail || 'signed-in-user'}</div>
          </div>
          <div className="status-dot" />
        </div>
        <div style={{ marginTop: 8, padding: '0 2px' }}>
          <div className="nav-item" onClick={onLogout}>
            <span className="nav-icon">
              <Icon name="logout" size={14} />
            </span>
            Sign out
          </div>
        </div>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
