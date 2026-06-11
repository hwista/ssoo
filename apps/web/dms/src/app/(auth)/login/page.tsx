'use client';

import { useRouter } from 'next/navigation';
import { SharedAuthLoginPage } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { resetDmsFileTreeSession } from '@/lib/file-tree-session';

export default function LoginPage() {
  const router = useRouter();

  return (
    <SharedAuthLoginPage
      homePath={APP_HOME_PATH}
      authStore={useAuthStore}
      navigate={(path) => router.replace(path)}
      beforeSubmit={resetDmsFileTreeSession}
    />
  );
}
