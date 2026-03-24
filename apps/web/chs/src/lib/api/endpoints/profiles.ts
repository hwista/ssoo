import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface ProfileItem {
  id: string;
  userId: string;
  bio: string | null;
  coverImageUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  user?: {
    id: string;
    userName: string;
    displayName: string | null;
    avatarUrl: string | null;
    departmentCode: string | null;
    positionCode: string | null;
    email: string;
  };
  skills?: Array<{
    id: string;
    skillId: string;
    skillName: string;
    skillCategory: string;
    proficiencyLevel: number;
    yearsOfExperience: number;
    endorsementCount: number;
    isEndorsedByMe: boolean;
  }>;
  careers?: Array<{
    id: string;
    projectName: string;
    roleName: string;
    companyName: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  followStats?: {
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
}

export const profilesApi = {
  me: () => apiClient.get<ApiResponse<ProfileItem>>('/chs/profiles/me'),

  byUser: (userId: string) =>
    apiClient.get<ApiResponse<ProfileItem>>(`/chs/profiles/${userId}`),

  update: (data: {
    bio?: string;
    coverImageUrl?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
  }) => apiClient.put<ApiResponse<ProfileItem>>('/chs/profiles/me', data),

  addCareer: (data: {
    projectName: string;
    roleName: string;
    startDate: string;
    endDate?: string;
    companyName?: string;
  }) =>
    apiClient.post<ApiResponse<unknown>>('/chs/profiles/me/careers', data),

  addSkill: (data: {
    skillId: string;
    proficiencyLevel?: number;
    yearsOfExperience?: number;
  }) =>
    apiClient.post<ApiResponse<unknown>>('/chs/profiles/me/skills', data),

  removeSkill: (skillId: string) =>
    apiClient.delete<ApiResponse<void>>(
      `/chs/profiles/me/skills/${skillId}`
    ),
};
