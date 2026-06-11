'use client';

import { useRouter } from 'next/navigation';
import { SharedAuthLoginPage } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();

  return (
    <SharedAuthLoginPage
      homePath='/'
      authStore={useAuthStore}
      navigate={(path) => router.replace(path)}
    />
  );
}
