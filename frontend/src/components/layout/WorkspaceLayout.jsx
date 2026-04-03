import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { clearSession } from '../../utils/session';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceTopbar from './WorkspaceTopbar';
import PageTransition from '../ui/PageTransition';
import CommandPalette from '../ui/CommandPalette';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 768px)';

const getFocusableElements = (container) => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
};

const WorkspaceLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { showFeedback } = useFeedback();
  const currentUserEmail = localStorage.getItem('user_email') || 'Signed in user';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setMobileOpen((value) => !value), []);

  useEffect(() => {
    closeMobileSidebar();
  }, [closeMobileSidebar, location.pathname, location.search]);

  // Global shortcut for command palette (Ctrl/Cmd + K)
  useEffect(() => {
    const handler = (event) => {
      const isMetaK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isMetaK) return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      event.preventDefault();
      setPaletteOpen(true);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleViewportChange = (event) => {
      if (!event.matches) {
        setMobileOpen(false);
      }
    };

    mediaQuery.addEventListener?.('change', handleViewportChange);
    mediaQuery.addListener?.(handleViewportChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleViewportChange);
      mediaQuery.removeListener?.(handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const isMobileViewport = window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    if (!mobileOpen || !isMobileViewport) {
      return undefined;
    }

    const sidebarNode = sidebarRef.current;
    const menuButtonNode = menuButtonRef.current;
    document.documentElement.classList.add('drawer-open');

    window.requestAnimationFrame(() => {
      sidebarNode?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileSidebar();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(sidebarNode);
      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('drawer-open');
      document.removeEventListener('keydown', handleKeyDown);
      menuButtonNode?.focus();
    };
  }, [closeMobileSidebar, mobileOpen]);

  const handleLogout = () => {
    clearSession();
    showFeedback('Signed out successfully.', 'info');
    navigate('/', { replace: true });
  };

  const handlePaletteNavigate = useCallback((path) => {
    setPaletteOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <div className="app">
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
        sidebarRef={sidebarRef}
      />
      <div className="main">
        <WorkspaceTopbar
          isDark={isDark}
          toggleTheme={toggleTheme}
          onMenuToggle={toggleMobileSidebar}
          mobileMenuOpen={mobileOpen}
          menuButtonRef={menuButtonRef}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main role="main" id="main-content" className="page-scroll-area">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={handlePaletteNavigate}
      />
    </div>
  );
};

export default WorkspaceLayout;
