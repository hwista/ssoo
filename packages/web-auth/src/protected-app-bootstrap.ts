import { useEffect, useRef } from 'react';
import type { CheckAuthOptions } from './store';

export interface UseProtectedAppBootstrapOptions {
  hasHydrated: boolean;
  isAuthenticated: boolean;
  authIsLoading: boolean;
  accessHasLoaded: boolean;
  accessIsLoading: boolean;
  checkAuth: (options?: CheckAuthOptions) => Promise<void>;
  hydrateAccess: () => Promise<void>;
  resetAccess: () => void;
  onUnauthenticated: (currentPath: string) => void;
  checkOnFocus?: boolean;
  checkOnVisible?: boolean;
  lifecycleCheckDebounceMs?: number;
}

export interface UseProtectedAppBootstrapResult {
  showLoading: boolean;
  shouldRender: boolean;
}

export function useProtectedAppBootstrap(
  options: UseProtectedAppBootstrapOptions,
): UseProtectedAppBootstrapResult {
  const {
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    accessHasLoaded,
    accessIsLoading,
    checkAuth,
    hydrateAccess,
    resetAccess,
    onUnauthenticated,
    checkOnFocus = true,
    checkOnVisible = true,
    lifecycleCheckDebounceMs = 1000,
  } = options;

  const initCalled = useRef(false);
  const lastLifecycleCheckAt = useRef(0);

  const getCurrentPathname = () => {
    if (typeof window === 'undefined') {
      return '/';
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  };

  useEffect(() => {
    if (!hasHydrated || initCalled.current) {
      return;
    }

    initCalled.current = true;
    void checkAuth({ mode: 'blocking' });
  }, [checkAuth, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || authIsLoading || !isAuthenticated) {
      return undefined;
    }

    const runLifecycleCheck = () => {
      const now = Date.now();
      if (now - lastLifecycleCheckAt.current < lifecycleCheckDebounceMs) {
        return;
      }

      lastLifecycleCheckAt.current = now;
      void checkAuth({ mode: 'background' });
    };

    const handleFocus = () => {
      if (checkOnFocus) {
        runLifecycleCheck();
      }
    };

    const handleVisibilityChange = () => {
      if (checkOnVisible && document.visibilityState === 'visible') {
        runLifecycleCheck();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    authIsLoading,
    checkAuth,
    checkOnFocus,
    checkOnVisible,
    hasHydrated,
    isAuthenticated,
    lifecycleCheckDebounceMs,
  ]);

  useEffect(() => {
    if (!hasHydrated || authIsLoading || !isAuthenticated || accessHasLoaded || accessIsLoading) {
      return;
    }

    void hydrateAccess();
  }, [
    accessHasLoaded,
    accessIsLoading,
    authIsLoading,
    hasHydrated,
    hydrateAccess,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!hasHydrated || isAuthenticated) {
      return;
    }

    resetAccess();
    onUnauthenticated(getCurrentPathname());
  }, [hasHydrated, isAuthenticated, onUnauthenticated, resetAccess]);

  return {
    showLoading: !hasHydrated || authIsLoading || (isAuthenticated && !accessHasLoaded),
    shouldRender: hasHydrated && isAuthenticated && accessHasLoaded,
  };
}
