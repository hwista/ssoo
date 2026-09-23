import { useQuery } from '@tanstack/react-query';
import { skillsApi } from '@/lib/api/endpoints/skills';

export const EXPERT_CATEGORIES = [
  { label: '전체', skills: [] },
  { label: '프로그래밍', skills: ['language'] },
  { label: '프레임워크', skills: ['framework'] },
  { label: '인프라', skills: ['infra', 'database'] },
  { label: '관리', skills: ['management'] },
  { label: '설계', skills: ['architecture', 'design'] },
] as const;

export interface ExpertSearch {
  keyword: string;
  category: number;
  page: number;
}

export function useExperts(userId: string, search: ExpertSearch | null) {
  return useQuery({
    queryKey: ['sns', 'experts', userId, search],
    enabled: Boolean(userId && search),
    retry: false,
    queryFn: async ({ signal }) => {
      const categories: readonly string[] = EXPERT_CATEGORIES[search?.category ?? 0].skills;
      let skillIds: string[] | undefined;
      if (categories.length) {
        const response = await skillsApi.list(undefined, signal);
        skillIds = (response.data.data ?? [])
          .filter((skill) => categories.includes(skill.skillCategory))
          .map((skill) => skill.id);
        if (!skillIds.length) {
          return { data: [], meta: { page: 1, limit: 20, total: 0 } };
        }
      }
      const response = await skillsApi.search({
        keyword: search?.keyword || undefined,
        skillIds,
        page: search?.page ?? 1,
        pageSize: 20,
      }, signal);
      return response.data;
    },
  });
}
