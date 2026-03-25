import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useApi';
import './NotificationPanel.css';

const formatRelativeTime = (dateString) => {
  const d = new Date(dateString);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const NotificationPanel = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleItemClick = useCallback((notification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.notificationId);
    }
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
    setOpen(false);
  }, [markRead, navigate]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button
        type="button"
        className="topbar-btn icon-only"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Icon name="bell" size={14} decorative />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="np-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" className="np-mark-all" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="np-empty">No notifications yet</div>
          ) : (
            <ul className="np-list">
              {notifications.map((n) => (
                <li
                  key={n.notificationId}
                  className={`np-item${!n.isRead ? ' unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="np-item-body">
                    <div className="np-item-title">{n.title}</div>
                    <div className="np-item-message">{n.message}</div>
                  </div>
                  <span className="np-item-time">{formatRelativeTime(n.createdAtUtc)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
