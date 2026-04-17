// Objective — 프로젝트 목표 계층

export interface Objective {
  id: string;
  projectId: string;
  parentObjectiveId: string | null;
  objectiveCode: string;
  objectiveName: string;
  description: string | null;
  statusCode: string;
  dueAt: string | null;
  achievedAt: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectiveDto {
  parentObjectiveId?: string | null;
  objectiveCode: string;
  objectiveName: string;
  description?: string;
  statusCode?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateObjectiveDto {
  parentObjectiveId?: string | null;
  objectiveName?: string;
  description?: string | null;
  statusCode?: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}
