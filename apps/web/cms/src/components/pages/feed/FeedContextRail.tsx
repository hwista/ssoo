'use client';

import Link from 'next/link';
import { BellRing, MessageSquareText, Search, Sparkles, UserPlus } from 'lucide-react';
import { useUnreadCount } from '@/hooks/queries/useNotifications';
import { useAccessStore } from '@/stores';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FeedContextRail() {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const unreadCountQuery = useUnreadCount();
  const unreadCount = unreadCountQuery.data?.data?.data?.count ?? 0;
  const enabledFeatures = [
    { enabled: accessSnapshot?.features.canCreatePost ?? false, label: '게시물 작성' },
    { enabled: accessSnapshot?.features.canComment ?? false, label: '댓글 참여' },
    { enabled: accessSnapshot?.features.canReact ?? false, label: '반응 남기기' },
    { enabled: accessSnapshot?.features.canManageBoards ?? false, label: '게시판 관리' },
    { enabled: accessSnapshot?.features.canManageSkills ?? false, label: '스킬 관리' },
  ].filter((feature) => feature.enabled);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">오늘의 CMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 font-medium">
              <BellRing className="h-4 w-4 text-ssoo-primary" />
              읽지 않은 알림 {unreadCount}건
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              팔로우, 댓글, 게시물 반응이 쌓이면 여기서 바로 확인할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2">
            <Link
              href="/search"
              className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted"
            >
              <Search className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">전문가 탐색</div>
                <div className="text-xs text-muted-foreground">이름, 스킬, 기술 키워드로 사람을 찾습니다.</div>
              </div>
            </Link>
            <Link
              href="/board"
              className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted"
            >
              <MessageSquareText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">게시판 둘러보기</div>
                <div className="text-xs text-muted-foreground">공지, Q&A, 인력 모집 흐름을 빠르게 확인합니다.</div>
              </div>
            </Link>
            <Link
              href="/profile/me"
              className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted"
            >
              <UserPlus className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">프로필 다듬기</div>
                <div className="text-xs text-muted-foreground">스킬, 소개, 이력을 채워 추천과 검색 노출을 높입니다.</div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-ssoo-primary" />
            활용 가능한 기능
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {enabledFeatures.length > 0 ? (
            enabledFeatures.map((feature) => (
              <Badge key={feature.label} variant="secondary" className="text-xs">
                {feature.label}
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">현재 계정에서 활성화된 CMS 기능이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
