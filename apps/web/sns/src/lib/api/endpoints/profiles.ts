import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type { UpdateProfileDto, UserProfileSurface } from '@ssoo/types/sns';

export type ProfileItem = UserProfileSurface;

export const profilesApi = {
  me: () => apiClient.get<ApiResponse<ProfileItem>>('/sns/profiles/me'),

  byUser: (userId: string) =>
    apiClient.get<ApiResponse<ProfileItem>>(`/sns/profiles/${userId}`),

  update: (data: UpdateProfileDto) =>
    apiClient.put<ApiResponse<ProfileItem>>('/sns/profiles/me', data),

  addCareer: (data: {
    projectName: string;
    roleName: string;
    startDate: string;
    endDate?: string;
    companyName?: string;
  }) =>
    apiClient.post<ApiResponse<unknown>>('/sns/profiles/me/careers', data),

  addSkill: (data: {
    skillId: string;
    proficiencyLevel?: number;
    yearsOfExperience?: number;
  }) =>
    apiClient.post<ApiResponse<unknown>>('/sns/profiles/me/skills', data),

  removeSkill: (skillId: string) =>
    apiClient.delete<ApiResponse<void>>(
      `/sns/profiles/me/skills/${skillId}`
    ),
};
