'use client';

import type { ReactNode } from 'react';
import { SharedAuthStateSync } from '@ssoo/web-auth';
import { crmUserScopeLifecycle } from '@/lib/user-scope';
import { useAuthStore } from '@/stores/auth.store';

function CrmUserScopeLifecycleSync() {
  void crmUserScopeLifecycle;
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <SharedAuthStateSync authStore={useAuthStore} />
      <CrmUserScopeLifecycleSync />
      {children}
    </>
  );
}
