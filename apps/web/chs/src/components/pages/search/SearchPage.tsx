'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchExperts, useSkills } from '@/hooks/queries/useSearch';

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedCategory, selectedSkillIds]);

  const allSkillsQuery = useSkills();
  const filteredSkillsQuery = useSkills(
    selectedCategory === 'all' ? undefined : selectedCategory
  );
  const expertQuery = useSearchExperts({
    keyword: debouncedQuery,
    skillIds: selectedSkillIds,
    page,
    pageSize: 12,
  });

  const categories = useMemo(() => {
    const skills = allSkillsQuery.data?.data?.data ?? [];
    return ['all', ...new Set(skills.map((skill) => skill.skillCategory))];
  }, [allSkillsQuery.data?.data?.data]);

  const filteredSkills = filteredSkillsQuery.data?.data?.data ?? [];
  const experts = expertQuery.data?.data?.data ?? [];
  const meta = expertQuery.data?.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  const hasCriteria = debouncedQuery.trim().length > 0 || selectedSkillIds.length > 0;

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((current) => current !== skillId)
        : [...prev, skillId]
    );
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSkillIds([]);
  };

  const handleExpertClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-bold mb-4">전문가 검색</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 스킬, 기술 키워드로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = selectedCategory === category;
            const label = category === 'all' ? '전체' : category;
            return (
              <Badge
                key={category}
                variant={selected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCategoryChange(category)}
              >
                {label}
              </Badge>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredSkills.map((skill) => {
            const selected = selectedSkillIds.includes(skill.id);
            return (
              <Badge
                key={skill.id}
                variant={selected ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => toggleSkill(skill.id)}
              >
                {skill.skillName}
              </Badge>
            );
          })}
        </div>
      </div>

      {!hasCriteria ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="검색어를 입력하세요"
          description="스킬, 이름, 기술 키워드로 전문가를 찾을 수 있습니다."
        />
      ) : expertQuery.isLoading ? (
        <LoadingState message="전문가를 찾는 중..." />
      ) : experts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="검색 결과가 없습니다"
          description="다른 키워드나 스킬 조합으로 다시 검색해 보세요."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => {
              const initials =
                expert.displayName?.slice(0, 2) ||
                expert.userName.slice(0, 2);
              return (
                <Card
                  key={expert.userId}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleExpertClick(expert.userId)}
                >
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={expert.avatarUrl || undefined} />
                        <AvatarFallback className="bg-ssoo-primary text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {expert.displayName || expert.userName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {expert.departmentCode || '부서 정보 없음'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {expert.skills.slice(0, 3).map((skill) => (
                        <div key={`${expert.userId}-${skill.skillName}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{skill.skillName}</span>
                            <span className="text-muted-foreground">
                              추천 {skill.endorsementCount}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-ssoo-primary"
                              style={{ width: `${(skill.proficiencyLevel / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
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
        </>
      )}
    </div>
  );
}
