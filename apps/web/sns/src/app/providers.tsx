'use client';

import { usePathname } from 'next/navigation';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SharedAuthStateSync, SharedOnboardingBoundary } from '@ssoo/web-auth';
import { SsooToaster as Toaster } from '@ssoo/web-shell';
import { useSnsUserScopeQueryCacheReset } from '@/lib/user-scope';
import { useAuthStore } from '@/stores/auth.store';

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

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();
  const [queryClient] = useState(() => getQueryClient());
  useSnsUserScopeQueryCacheReset(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SharedAuthStateSync authStore={useAuthStore} />
      <SharedOnboardingBoundary authStore={useAuthStore} app="sns" pathname={pathname ?? '/'}>{children}</SharedOnboardingBoundary>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
