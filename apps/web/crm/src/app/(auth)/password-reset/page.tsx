'use client';

import { useRouter } from 'next/navigation';
import { SharedPasswordResetPage } from '@ssoo/web-auth';

export default function PasswordResetPage() {
  const router = useRouter();

  return <SharedPasswordResetPage navigate={(path) => router.replace(path)} />;
}
