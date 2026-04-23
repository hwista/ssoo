'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, FileText, Hash, LayoutGrid } from 'lucide-react';
import type { CmsVisibilityScopeCode } from '@ssoo/types/cms';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBoardDetail } from '@/hooks/queries/useBoards';
import { usePostList } from '@/hooks/queries/usePosts';
import { useAccessStore } from '@/stores';

const boardTypeLabels: Record<string, string> = {
  notice: '공지사항',
  qna: 'Q&A',
  general: '일반',
  recruit: '인력 모집',
};

const visibilityLabels: Partial<Record<CmsVisibilityScopeCode, string>> = {
  public: '전체 공개',
  organization: '내 조직',
  followers: '팔로워',
  self: '나만 보기',
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncateText(value: string, maxLength = 180) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

interface BoardDetailPageProps {
  boardId: string;
}

export function BoardDetailPage({ boardId }: BoardDetailPageProps) {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;
  const boardQuery = useBoardDetail(boardId);
  const postsQuery = usePostList(
    { boardId, page: 1, pageSize: 20 },
    canReadFeed && !!boardId,
  );

  const board = boardQuery.data?.data?.data;
  const posts = postsQuery.data?.data?.data ?? [];
  const postMeta = postsQuery.data?.data?.meta;

  if (!canReadFeed) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={<LayoutGrid className="h-12 w-12" />}
          title="게시판 접근 권한이 없습니다"
          description="현재 계정에는 CMS 게시판을 조회할 권한이 없습니다."
        />
      </div>
    );
  }

  if (boardQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingState message="게시판 정보를 불러오는 중입니다." fullHeight />
      </div>
    );
  }

  if (!board || boardQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={<LayoutGrid className="h-12 w-12" />}
          title="게시판을 찾을 수 없습니다"
          description={boardQuery.error?.message || '요청한 게시판이 없거나 더 이상 사용할 수 없습니다.'}
          action={(
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 목록으로</Link>
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/board">
            <ArrowLeft className="mr-1 h-4 w-4" />
            게시판 목록
          </Link>
        </Button>
        <Badge variant="outline">
          {boardTypeLabels[board.boardType] || board.boardType}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{board.boardName}</CardTitle>
          <CardDescription>
            {board.description || '이 게시판에 속한 게시물만 모아서 보여줍니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>코드: {board.boardCode}</span>
          <span>정렬 순서: {board.sortOrder}</span>
          <span>게시물: {postMeta?.total ?? posts.length}개</span>
          {board.isDefault && <Badge>기본 게시판</Badge>}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">게시물</h2>
            <p className="text-sm text-muted-foreground">
              이 게시판에 연결된 최신 게시물입니다.
            </p>
          </div>
          {postsQuery.isFetching && !postsQuery.isLoading && (
            <span className="text-xs text-muted-foreground">새로고침 중...</span>
          )}
        </div>

        {postsQuery.isLoading ? (
          <LoadingState message="게시물을 불러오는 중입니다." />
        ) : postsQuery.isError ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="게시물을 불러오지 못했습니다"
            description={postsQuery.error?.message || '잠시 후 다시 시도해 주세요.'}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="게시물이 없습니다"
            description="아직 이 게시판에 등록된 게시물이 없습니다."
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {post.title?.trim() || '제목 없음'}
                        </h3>
                        {visibilityLabels[post.visibilityScopeCode] && (
                          <Badge variant="outline" className="text-[10px]">
                            {visibilityLabels[post.visibilityScopeCode]}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {truncateText(post.content)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{formatDate(post.createdAt)}</p>
                      <p className="mt-1">작성자 ID: {post.authorUserId}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      조회 {post.viewCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      게시물 ID {post.id}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
