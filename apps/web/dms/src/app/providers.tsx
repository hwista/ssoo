'use client';

import { ReactNode, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SharedAuthStateSync } from '@ssoo/web-auth';
import { SSOO_SHELL_METRICS } from '@ssoo/web-shell';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FloatingAssistant } from '@/components/common/assistant';
import { DocumentAccessRequestDialogHost } from '@/features/access';
import { AssistantSessionSync } from '@/components/common/assistant/session/AssistantSessionSync';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useDmsUserScopeQueryCacheReset } from '@/lib/user-scope';
import { useAccessStore, useAuthStore } from '@/stores';

interface ProvidersProps {
  children: ReactNode;
}

const TOAST_OFFSET = {
  top: SSOO_SHELL_METRICS.header.height,
  right: SSOO_SHELL_METRICS.overlay.inset,
} as const;
const TOAST_MOBILE_OFFSET = {
  top: SSOO_SHELL_METRICS.header.height,
  right: SSOO_SHELL_METRICS.overlay.inset,
  left: SSOO_SHELL_METRICS.overlay.inset,
} as const;
const TOAST_WIDTH = `min(420px, calc(100vw - ${SSOO_SHELL_METRICS.overlay.inset * 2}px))`;
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

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => getQueryClient());
  useDmsUserScopeQueryCacheReset(queryClient);
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const showAuthenticatedUi = pathname !== LOGIN_PATH && hasHydrated && isAuthenticated;
  const showAssistantUi = showAuthenticatedUi && accessSnapshot?.features.canUseAssistant === true;

  return (
    <QueryClientProvider client={queryClient}>
      <SharedAuthStateSync authStore={useAuthStore} />
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
