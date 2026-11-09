import { useEffect, useRef } from 'react';

export interface UseLoginPageBootstrapOptions {
  hasHydrated: boolean;
  isAuthenticated: boolean;
  authIsLoading: boolean;
  checkAuth: () => Promise<void>;
  onAuthenticated: () => void;
}

export interface UseLoginPageBootstrapResult {
  showLoading: boolean;
  shouldRenderLogin: boolean;
}

export function useLoginPageBootstrap(
  options: UseLoginPageBootstrapOptions,
): UseLoginPageBootstrapResult {
  const {
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    checkAuth,
    onAuthenticated,
  } = options;
  const restoreCalled = useRef(false);
  const navigated = useRef(false);

  useEffect(() => {
    if (!hasHydrated || isAuthenticated || authIsLoading || restoreCalled.current) {
      return;
    }

    restoreCalled.current = true;
    void checkAuth();
  }, [authIsLoading, checkAuth, hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) navigated.current = false;
    if (!hasHydrated || authIsLoading || !isAuthenticated || navigated.current) {
      return;
    }

    navigated.current = true;
    onAuthenticated();
  }, [authIsLoading, hasHydrated, isAuthenticated, onAuthenticated]);

  return {
    showLoading: !hasHydrated || authIsLoading || isAuthenticated,
    shouldRenderLogin: hasHydrated && !authIsLoading && !isAuthenticated,
  };
}
