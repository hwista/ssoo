'use client';

import { use } from 'react';
import { BoardDetailPage } from '@/components/pages/board/BoardDetailPage';

export default function BoardDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BoardDetailPage boardId={id} />;
}
