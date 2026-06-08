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
