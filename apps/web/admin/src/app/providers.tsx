'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SharedAuthStateSync } from '@ssoo/web-auth';
import { Toaster } from 'sonner';
import { useAdminUserScopeQueryCacheReset } from '@/lib/user-scope';
import { useAuthStore } from '@/stores/auth.store';

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

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  useAdminUserScopeQueryCacheReset(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SharedAuthStateSync authStore={useAuthStore} />
      {children}
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </QueryClientProvider>
  );
}
