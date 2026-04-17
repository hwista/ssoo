// Milestone — 프로젝트 마일스톤

export interface Milestone {
  id: string;
  projectId: string;
  objectiveId: string | null;
  milestoneCode: string;
  milestoneName: string;
  description: string | null;
  statusCode: string;
  dueAt: string | null;
  achievedAt: string | null;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneDto {
  objectiveId?: string | null;
  milestoneCode: string;
  milestoneName: string;
  description?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateMilestoneDto {
  objectiveId?: string | null;
  milestoneName?: string;
  description?: string;
  statusCode?: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string;
}
