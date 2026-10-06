'use client';

import { SharedAppRecovery } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export default function RecoveryPage() {
  return <SharedAppRecovery authStore={useAuthStore} restoreSession title="서비스로 돌아가기"
    description="이용 가능한 서비스로 이동하거나 다른 계정으로 로그인할 수 있습니다." />;
}
