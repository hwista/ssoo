'use client';

import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';
import { SsooToaster } from '@ssoo/web-shell';
import { SharedAuthStateSync, SharedOnboardingBoundary } from '@ssoo/web-auth';
import { crmUserScopeLifecycle } from '@/lib/user-scope';
import { useAuthStore } from '@/stores/auth.store';

function CrmUserScopeLifecycleSync() {
  void crmUserScopeLifecycle;
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <SharedAuthStateSync authStore={useAuthStore} />
      <CrmUserScopeLifecycleSync />
      <SharedOnboardingBoundary authStore={useAuthStore} app="crm" pathname={pathname ?? '/'}>{children}</SharedOnboardingBoundary>
      <SsooToaster position="top-right" richColors closeButton duration={4000} />
    </>
  );
}
