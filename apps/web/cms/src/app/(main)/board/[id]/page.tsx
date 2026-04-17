'use client';

import { use } from 'react';
import { BoardListPage } from '@/components/pages/board/BoardListPage';

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = use(params);
  // TODO: Board detail view with posts list
  return <BoardListPage />;
}
