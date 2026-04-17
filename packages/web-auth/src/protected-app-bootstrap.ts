import { useEffect, useRef } from 'react';

export interface UseProtectedAppBootstrapOptions {
  hasHydrated: boolean;
  isAuthenticated: boolean;
  authIsLoading: boolean;
  accessHasLoaded: boolean;
  accessIsLoading: boolean;
  checkAuth: () => Promise<void>;
  hydrateAccess: () => Promise<void>;
  resetAccess: () => void;
  onUnauthenticated: () => void;
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
  } = options;

  const initCalled = useRef(false);

  useEffect(() => {
    if (!hasHydrated || initCalled.current) {
      return;
    }

    initCalled.current = true;
    void checkAuth();
  }, [checkAuth, hasHydrated]);

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
    onUnauthenticated();
  }, [hasHydrated, isAuthenticated, onUnauthenticated, resetAccess]);

  return {
    showLoading: !hasHydrated || authIsLoading || (isAuthenticated && !accessHasLoaded),
    shouldRender: hasHydrated && isAuthenticated && accessHasLoaded,
  };
}
