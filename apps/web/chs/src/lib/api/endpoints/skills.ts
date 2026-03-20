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
  skills: Array<{
    skillName: string;
    proficiencyLevel: number;
    endorsementCount: number;
  }>;
}

export const skillsApi = {
  list: (params?: { category?: string }) =>
    apiClient.get<ApiResponse<SkillItem[]>>('/chs/skills', { params }),

  search: (params: {
    skillIds?: string[];
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<ExpertItem>>('/chs/skills/search', {
      params,
    }),

  endorse: (data: { userSkillId: string; comment?: string }) =>
    apiClient.post<ApiResponse<void>>('/chs/endorsements', data),
};
