import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks in-app navigation and browser close/refresh when there are unsaved changes.
 * Shows a ConfirmDialog-style prompt for in-app navigation.
 */
const useUnsavedChangesWarning = (isDirty) => {
  // Block in-app navigation via react-router
  const blocker = useBlocker(isDirty);

  // Block browser refresh / close
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') blocker.proceed();
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  return {
    isBlocked: blocker.state === 'blocked',
    confirmNavigation,
    cancelNavigation,
  };
};

export default useUnsavedChangesWarning;
