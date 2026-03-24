import { useQuery } from '@tanstack/react-query';
import { skillsApi } from '@/lib/api/endpoints/skills';

const searchKeys = {
  all: ['chs', 'search'] as const,
  skills: (category?: string) =>
    [...searchKeys.all, 'skills', category ?? 'all'] as const,
  experts: (
    keyword: string,
    skillIds: string[],
    page: number,
    pageSize: number
  ) => [...searchKeys.all, 'experts', keyword, skillIds.join(','), page, pageSize] as const,
};

export function useSkills(category?: string) {
  return useQuery({
    queryKey: searchKeys.skills(category),
    queryFn: () => skillsApi.list(category ? { category } : undefined),
  });
}

export function useSearchExperts(params: {
  keyword?: string;
  skillIds?: string[];
  page?: number;
  pageSize?: number;
}) {
  const keyword = params.keyword?.trim() ?? '';
  const skillIds = params.skillIds ?? [];
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 12;

  return useQuery({
    queryKey: searchKeys.experts(keyword, skillIds, page, pageSize),
    queryFn: () =>
      skillsApi.search({
        keyword: keyword || undefined,
        skillIds: skillIds.length > 0 ? skillIds : undefined,
        page,
        pageSize,
      }),
    enabled: keyword.length > 0 || skillIds.length > 0,
  });
}
