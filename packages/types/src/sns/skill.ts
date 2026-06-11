export interface Skill {
  id: string;
  skillName: string;
  skillCategory: string;
  parentSkillId: string | null;
  description: string | null;
  synonyms: string[];
  isActive: boolean;
}

export interface UserSkill {
  id: string;
  profileId: string;
  skillId: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
  skill?: Skill;
  endorsementCount?: number;
}

export interface Endorsement {
  id: string;
  endorserUserId: string;
  endorseeProfileId: string;
  userSkillId: string;
  skillId: string;
  comment: string | null;
  createdAt: string;
}

export interface CreateSkillDto {
  skillName: string;
  skillCategory: string;
  parentSkillId?: string;
  description?: string;
  synonyms?: string[];
}

export interface AddUserSkillDto {
  skillId: string;
  proficiencyLevel?: number;
  yearsOfExperience?: number;
}

export interface EndorseSkillDto {
  userSkillId: string;
  comment?: string;
}

export interface SearchExpertsDto {
  skillIds?: string[];
  keyword?: string;
  page?: number;
  pageSize?: number;
}
