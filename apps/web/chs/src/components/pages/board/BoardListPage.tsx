'use client';

import { LayoutGrid, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/StateDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoards } from '@/hooks/queries/useBoards';
import { useRouter } from 'next/navigation';

const boardTypeLabels: Record<string, string> = {
  notice: '공지사항',
  qna: 'Q&A',
  general: '일반',
  recruit: '인력 모집',
};

export function BoardListPage() {
  const { data, isLoading } = useBoards();
  const router = useRouter();
  const boards = data?.data?.data || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">게시판</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          새 게시판
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-12 w-12" />}
          title="게시판이 없습니다"
          description="관리자에게 문의하세요."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{board.boardName}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {boardTypeLabels[board.boardType] || board.boardType}
                  </Badge>
                </div>
                {board.description && (
                  <CardDescription className="text-xs">{board.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">코드: {board.boardCode}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
