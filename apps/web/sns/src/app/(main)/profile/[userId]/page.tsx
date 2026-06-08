'use client';

import { use } from 'react';
import { ProfilePage } from '@/components/pages/profile/ProfilePage';

export default function ProfileDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  return <ProfilePage userId={userId} />;
}
