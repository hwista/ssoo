'use client';

import { useMemo, useState } from 'react';
import { FileText, LayoutGrid, MessageSquare, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useBoardDetail } from '@/hooks/queries/useBoards';
import { useBoardPosts } from '@/hooks/queries/useBoardPosts';
import { getTimeAgo } from '@/lib/utils';

interface BoardDetailPageProps {
  boardId: string;
}

const boardTypeLabels: Record<string, string> = {
  notice: '공지사항',
  qna: 'Q&A',
  general: '일반',
  recruit: '인력 모집',
};

export function BoardDetailPage({ boardId }: BoardDetailPageProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const boardQuery = useBoardDetail(boardId);
  const postQuery = useBoardPosts(boardId, page, pageSize);

  const board = boardQuery.data?.data?.data;
  const posts = postQuery.data?.data?.data ?? [];
  const meta = postQuery.data?.data?.meta;
  const totalPages = useMemo(() => {
    if (!meta) return 1;
    return Math.max(1, Math.ceil(meta.total / meta.limit));
  }, [meta]);

  if (boardQuery.isLoading) {
    return <LoadingState fullHeight message="게시판 정보를 불러오는 중..." />;
  }

  if (!board) {
    return (
      <EmptyState
        className="min-h-[400px]"
        icon={<LayoutGrid className="h-12 w-12" />}
        title="게시판을 찾을 수 없습니다"
        description="삭제되었거나 접근할 수 없는 게시판입니다."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{board.boardName}</CardTitle>
                <Badge variant="outline">
                  {boardTypeLabels[board.boardType] ?? board.boardType}
                </Badge>
              </div>
              <CardDescription>
                {board.description || '게시판 설명이 아직 등록되지 않았습니다.'}
              </CardDescription>
            </div>
            <Badge variant="secondary">코드: {board.boardCode}</Badge>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">게시물</h2>
            <p className="text-sm text-muted-foreground">
              총 {meta?.total ?? posts.length}개의 게시물
            </p>
          </div>
        </div>

        {postQuery.isLoading ? (
          <LoadingState message="게시물을 불러오는 중..." />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="게시물이 없습니다"
            description="이 게시판의 첫 번째 게시물을 기다리고 있습니다."
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {post.title || '제목 없는 게시물'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                    {post.isPinned && <Badge>고정</Badge>}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>{getTimeAgo(post.createdAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      게시판 글
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      조회 {post.viewCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              다음
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
