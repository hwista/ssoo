'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { getSsooUserSurfaceTabPath } from '@ssoo/web-auth';
import { SsooSearchInput } from '@ssoo/web-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { EXPERT_CATEGORIES, useExperts, type ExpertSearch } from '@/hooks/queries/useExperts';
import { ApiError } from '@/lib/api/client';
import { useAccessStore, useAuthStore } from '@/stores';

function SearchPermissionState() {
  return (
    <div className="max-w-3xl mx-auto">
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="전문가 검색 권한이 없습니다"
        description="현재 계정에는 SNS 검색 화면에 접근할 권한이 없습니다."
      />
    </div>
  );
}

export function SearchPage() {
  const canReadFeed = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);
  const userId = useAuthStore((state) => state.user?.userId);

  if (!canReadFeed || !userId) return <SearchPermissionState />;
  return <ExpertSearchPage key={userId} userId={userId} />;
}

function ExpertSearchPage({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(0);
  const [search, setSearch] = useState<ExpertSearch | null>(null);
  const results = useExperts(userId, search);
  const total = results.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  function submit(nextCategory = category) {
    const keyword = query.trim();
    setSearch(keyword || nextCategory ? { keyword, category: nextCategory, page: 1 } : null);
  }

  if (results.error instanceof ApiError && results.error.status === 403) {
    return <SearchPermissionState />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">전문가 검색</h1>
      <div role="search" aria-label="SNS 전문가 검색" className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <SsooSearchInput
          id="sns-expert-search-input"
          name="sns-expert-search-query"
          ariaLabel="SNS 전문가 검색"
          intent="entity-lookup"
          placeholder="이름, 스킬, 기술 키워드로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="pl-9"
        />
      </div>

      <div role="group" aria-label="전문가 기술 분류" className="flex flex-wrap gap-2 mb-6">
        {EXPERT_CATEGORIES.map((item, index) => (
          <Button
            key={item.label}
            variant={category === index ? 'default' : 'outline'}
            size="sm"
            aria-pressed={category === index}
            onClick={() => { setCategory(index); submit(index); }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div aria-live="polite" aria-busy={results.isFetching}>
        {!search ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="검색어를 입력하세요"
            description="스킬, 이름, 기술 키워드로 전문가를 찾을 수 있습니다."
          />
        ) : results.isFetching ? (
          <LoadingState message="전문가를 찾고 있습니다..." />
        ) : results.isError ? (
          <EmptyState
            title="전문가 검색을 불러오지 못했습니다"
            description="잠시 후 다시 시도해 주세요."
            action={<Button variant="outline" onClick={() => void results.refetch()}>다시 시도</Button>}
          />
        ) : !results.data?.data.length ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="검색 결과가 없습니다"
            description="검색어나 기술 분류를 변경해 보세요."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">검색 결과 {total}명</p>
            <ul className="space-y-3" aria-label="전문가 검색 결과">
              {results.data.data.map((expert) => {
                const name = expert.displayName || expert.userName;
                return (
                  <li key={expert.userId}>
                    <Card>
                      <CardContent className="p-4">
                        <Link
                          href={getSsooUserSurfaceTabPath('user-profile', expert.userId)}
                          className="flex items-center gap-3 min-w-0 hover:underline"
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={expert.avatarUrl || undefined} alt="" />
                            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-semibold break-words">{name}</span>
                            {expert.departmentCode && (
                              <p className="text-sm text-muted-foreground break-words">{expert.departmentCode}</p>
                            )}
                          </div>
                        </Link>
                        {expert.userSkills.length > 0 && (
                          <ul className="flex flex-wrap gap-2 mt-3" aria-label={`${name} 보유 기술`}>
                            {expert.userSkills.map((skill) => (
                              <li key={skill.id}><Badge variant="outline">{skill.skill.skillName}</Badge></li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
            {pageCount > 1 && (
              <nav aria-label="전문가 검색 페이지" className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={search.page <= 1}
                  onClick={() => setSearch({ ...search, page: search.page - 1 })}>이전</Button>
                <span className="text-sm">{search.page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={search.page >= pageCount}
                  onClick={() => setSearch({ ...search, page: search.page + 1 })}>다음</Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
