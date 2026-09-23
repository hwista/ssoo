'use client';

import { use } from 'react';
import { PostDetailPage } from '@/components/pages/feed/PostDetailPage';

export default function PostDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PostDetailPage postId={id} />;
}
