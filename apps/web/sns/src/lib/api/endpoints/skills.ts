import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface SkillItem {
  id: string;
  skillName: string;
  skillCategory: string;
  description: string | null;
}

export interface ExpertItem {
  userId: string;
  userName: string;
  displayName: string | null;
  avatarUrl: string | null;
  departmentCode: string | null;
  userSkills: Array<{
    id: string;
    proficiencyLevel: number;
    skill: SkillItem;
  }>;
}

export const skillsApi = {
  list: (params?: { category?: string }, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<SkillItem[]>>('/sns/skills', { params, signal }),

  search: (params: {
    skillIds?: string[];
    keyword?: string;
    page?: number;
    pageSize?: number;
  }, signal?: AbortSignal) =>
    apiClient.get<PaginatedResponse<ExpertItem>>('/sns/skills/search', {
      params,
      signal,
      paramsSerializer: { indexes: null },
    }),

  endorse: (data: { userSkillId: string; comment?: string }) =>
    apiClient.post<ApiResponse<void>>('/sns/endorsements', data),
};
