import type { FollowStats } from './follow';

export interface ProfileUserSummary {
  id: string;
  userName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  departmentCode: string | null;
  positionCode: string | null;
}

export interface ProfileSkill {
  id: string;
  profileId: string;
  skillId: string;
  skillName: string;
  skillCategory: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
  endorsementCount: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio: string | null;
  coverImageUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileSurface extends UserProfile {
  user: ProfileUserSummary;
  skills: ProfileSkill[];
  careers: UserCareer[];
  followStats: FollowStats;
  isOwnProfile: boolean;
  profilePath: string;
}

export interface UserCareer {
  id: string;
  profileId: string;
  projectId: string | null;
  companyName: string | null;
  projectName: string;
  roleName: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
}

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  coverImageUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

export interface CreateCareerDto {
  projectName: string;
  roleName: string;
  startDate: string;
  endDate?: string;
  description?: string;
  companyName?: string;
  projectId?: string;
}
