'use client';

import { ReactNode, useEffect, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FloatingAssistant } from '@/components/common/assistant';
import { DocumentAccessRequestDialogHost } from '@/features/access';
import { AuthStateSync } from '@/components/common/auth/StateSync';
import { AssistantSessionSync } from '@/components/common/assistant/session/AssistantSessionSync';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore } from '@/stores';

interface ProvidersProps {
  children: ReactNode;
}

const TOAST_OFFSET = {
  top: LAYOUT_SIZES.header.height,
  right: LAYOUT_SIZES.rightPanel.inset,
} as const;
const TOAST_MOBILE_OFFSET = {
  top: LAYOUT_SIZES.header.height,
  right: LAYOUT_SIZES.rightPanel.inset,
  left: LAYOUT_SIZES.rightPanel.inset,
} as const;
const TOAST_WIDTH = `min(420px, calc(100vw - ${LAYOUT_SIZES.rightPanel.inset * 2}px))`;
const TOASTER_STYLE = {
  '--width': TOAST_WIDTH,
} as CSSProperties;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

function QueryCacheUserScopeSync({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    let lastUserId = useAuthStore.getState().user?.userId ?? null;
    let lastAccessToken = useAuthStore.getState().accessToken ?? null;

    return useAuthStore.subscribe((state) => {
      const nextUserId = state.user?.userId ?? null;
      const nextAccessToken = state.accessToken ?? null;
      if (nextUserId === lastUserId && nextAccessToken === lastAccessToken) {
        return;
      }

      queryClient.clear();
      lastUserId = nextUserId;
      lastAccessToken = nextAccessToken;
    });
  }, [queryClient]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => getQueryClient());
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const showAuthenticatedUi = pathname !== LOGIN_PATH && hasHydrated && isAuthenticated;
  const showAssistantUi = showAuthenticatedUi && accessSnapshot?.features.canUseAssistant === true;

  return (
    <QueryClientProvider client={queryClient}>
      <QueryCacheUserScopeSync queryClient={queryClient} />
      <AuthStateSync />
      {children}
      {showAssistantUi && (
        <>
          <FloatingAssistant />
          <AssistantSessionSync />
        </>
      )}
      <DocumentAccessRequestDialogHost />
      <ConfirmDialog />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
        offset={TOAST_OFFSET}
        mobileOffset={TOAST_MOBILE_OFFSET}
        style={TOASTER_STYLE}
      />
    </QueryClientProvider>
  );
}
