'use client';

import type { ReactNode } from 'react';
import { SsooErrorNotice, SsooErrorPanel } from './error-recovery';

/** Access lookup outages are distinct from a successfully loaded permission denial. */
export function SsooAccessRecovery({ error, hasSnapshot, retrying, onRetry, children }: {
  error: string | null;
  hasSnapshot: boolean;
  retrying: boolean;
  onRetry: () => Promise<unknown>;
  children: ReactNode;
}) {
  // Keep both the parent and the child's position stable when a refresh fails.
  // Switching between a fragment and a div would remount unsaved editors.
  return <div className="flex min-h-0 flex-1 flex-col">
    {error && hasSnapshot ? <SsooErrorNotice message="최신 접근 권한을 확인하지 못했습니다. 이전에 확인한 화면을 유지하고 있습니다."
      actions={[{ label: retrying ? '확인 중...' : '접근 권한 다시 확인', onClick: onRetry, disabled: retrying }, { label: '다른 서비스·계정으로 이동', href: '/recovery' }]} /> : null}
    {error && !hasSnapshot ? <SsooErrorPanel kind="unavailable" title="접근 권한을 확인하지 못했습니다"
      description="권한 정보를 불러오는 중 연결 문제가 발생했습니다. 다시 확인하거나 다른 서비스로 이동해 주세요."
      onRetry={onRetry} retrying={retrying} actions={[{ label: '다른 서비스·계정으로 이동', href: '/recovery' }]} /> : children}
  </div>;
}
