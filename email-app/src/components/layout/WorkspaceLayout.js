import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { clearSession } from '../../utils/session';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceTopbar from './WorkspaceTopbar';

const WorkspaceLayout = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { showFeedback } = useFeedback();
  const currentUserEmail = localStorage.getItem('user_email') || 'Signed in user';

  const handleLogout = () => {
    clearSession();
    showFeedback('Signed out successfully.', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="app">
      <WorkspaceSidebar onLogout={handleLogout} userEmail={currentUserEmail} />
      <div className="main">
        <WorkspaceTopbar isDark={isDark} toggleTheme={toggleTheme} />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
