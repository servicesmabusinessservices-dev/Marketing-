import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { clearSession } from '../../utils/session';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceTopbar from './WorkspaceTopbar';
import PageTransition from '../ui/PageTransition';

const WorkspaceLayout = ({ isAuthenticated = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { showFeedback } = useFeedback();
  const currentUserEmail = isAuthenticated
    ? (localStorage.getItem('user_email') || 'Signed in user')
    : 'Guest user';
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  const handleLogout = () => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    clearSession();
    showFeedback('Signed out successfully.', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className={`app${isAuthenticated ? '' : ' app-public'}`}>
      {/* Mobile backdrop — closes sidebar when tapped */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      <WorkspaceSidebar
        onLogout={handleLogout}
        userEmail={currentUserEmail}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileSidebar}
        isAuthenticated={isAuthenticated}
      />
      <div className="main">
        <WorkspaceTopbar
          isDark={isDark}
          toggleTheme={toggleTheme}
          onMenuToggle={() => setMobileOpen(v => !v)}
          isAuthenticated={isAuthenticated}
        />
        <div className="page-scroll-area">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname + location.search}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
