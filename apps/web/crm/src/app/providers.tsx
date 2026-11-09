'use client';

import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';
import { SsooToaster } from '@ssoo/web-shell';
import { SharedAuthStateSync, SharedPlatformAccessBoundary } from '@ssoo/web-auth';
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
      <SharedPlatformAccessBoundary authStore={useAuthStore} app="crm" pathname={pathname ?? '/'}>{children}</SharedPlatformAccessBoundary>
      <SsooToaster position="top-right" richColors closeButton duration={4000} />
    </>
  );
}
