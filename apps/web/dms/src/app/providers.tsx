'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FloatingAssistant } from '@/components/common/assistant';
import { DocumentAccessRequestDialogHost } from '@/components/common/document-access/DocumentAccessRequestDialogHost';
import { AuthStateSync } from '@/components/common/auth/StateSync';
import { AssistantSessionSync } from '@/components/common/assistant/session/AssistantSessionSync';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore } from '@/stores';

interface ProvidersProps {
  children: ReactNode;
}

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
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const showAuthenticatedUi = pathname !== LOGIN_PATH && hasHydrated && isAuthenticated;
  const showAssistantUi = showAuthenticatedUi && accessSnapshot?.features.canUseAssistant === true;

  return (
    <QueryClientProvider client={queryClient}>
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
      />
    </QueryClientProvider>
  );
}
