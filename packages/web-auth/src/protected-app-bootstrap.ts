import { useEffect, useRef, useState } from 'react';
import type { CheckAuthOptions } from './store';

export interface UseProtectedAppBootstrapOptions {
  hasHydrated: boolean;
  isAuthenticated: boolean;
  authIsLoading: boolean;
  sessionError?: string | null;
  accessHasLoaded: boolean;
  accessIsLoading: boolean;
  checkAuth: (options?: CheckAuthOptions) => Promise<void>;
  hydrateAccess: () => Promise<void>;
  resetAccess: () => void;
  onUnauthenticated: (currentPath: string) => void;
  shouldSkipLifecycleCheck?: () => boolean;
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
    sessionError,
    accessHasLoaded,
    accessIsLoading,
    checkAuth,
    hydrateAccess,
    resetAccess,
    onUnauthenticated,
    shouldSkipLifecycleCheck,
    checkOnFocus = true,
    checkOnVisible = true,
    lifecycleCheckDebounceMs = 1000,
  } = options;

  const initialAuthCheckRef = useRef<Promise<void> | null>(null);
  const lastLifecycleCheckAt = useRef(0);
  const [initialAuthCheckCompleted, setInitialAuthCheckCompleted] = useState(false);

  const getCurrentPathname = () => {
    if (typeof window === 'undefined') {
      return '/';
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  };

  useEffect(() => {
    if (!hasHydrated || initialAuthCheckCompleted) {
      return;
    }

    if (!initialAuthCheckRef.current) {
      initialAuthCheckRef.current = checkAuth({ mode: 'blocking' }).then(
        () => undefined,
        () => undefined,
      );
    }

    const initialAuthCheck = initialAuthCheckRef.current;
    let cancelled = false;
    void initialAuthCheck.then(() => {
      if (!cancelled) {
        setInitialAuthCheckCompleted(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [checkAuth, hasHydrated, initialAuthCheckCompleted]);

  useEffect(() => {
    if (!hasHydrated || !initialAuthCheckCompleted || authIsLoading || !isAuthenticated) {
      return undefined;
    }

    const runLifecycleCheck = () => {
      if (shouldSkipLifecycleCheck?.()) {
        return;
      }

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
    initialAuthCheckCompleted,
    isAuthenticated,
    lifecycleCheckDebounceMs,
    shouldSkipLifecycleCheck,
  ]);

  useEffect(() => {
    if (
      !hasHydrated
      || !initialAuthCheckCompleted
      || authIsLoading
      || !isAuthenticated
      || sessionError
      || accessHasLoaded
      || accessIsLoading
    ) {
      return;
    }

    void hydrateAccess();
  }, [
    accessHasLoaded,
    accessIsLoading,
    authIsLoading,
    hasHydrated,
    hydrateAccess,
    sessionError,
    initialAuthCheckCompleted,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!hasHydrated || !initialAuthCheckCompleted || isAuthenticated || sessionError) {
      return;
    }

    resetAccess();
    onUnauthenticated(getCurrentPathname());
  }, [hasHydrated, initialAuthCheckCompleted, isAuthenticated, sessionError, onUnauthenticated, resetAccess]);

  return {
    showLoading: !hasHydrated
      || !initialAuthCheckCompleted
      || authIsLoading
      || (isAuthenticated && !accessHasLoaded && !sessionError),
    shouldRender: hasHydrated && initialAuthCheckCompleted && isAuthenticated && accessHasLoaded,
  };
}
