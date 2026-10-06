'use client';

import { SharedAppRecovery } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export function AccessRecovery({ accessDenied, isRetrying, onRetry }: {
  accessDenied: boolean;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return <SharedAppRecovery
    authStore={useAuthStore}
    excludeApp="admin"
    kind={accessDenied ? 'forbidden' : 'unavailable'}
    title={accessDenied ? 'Admin 접근 권한이 없습니다' : 'Admin 접근 권한을 확인하지 못했습니다'}
    description={accessDenied
      ? '로그인은 완료되었지만, 현재 계정은 관리자 화면을 이용할 수 없습니다. 이용 가능한 서비스로 이동하거나 다른 계정으로 로그인해 주세요.'
      : '일시적인 연결 문제일 수 있습니다. 다시 확인하거나 다른 서비스로 이동할 수 있습니다.'}
    retrying={isRetrying}
    onRetry={onRetry}
  />;
}
