// ProjectMember — 프로젝트 멤버 매핑

export interface ProjectMember {
  projectId: string;
  userId: string;
  roleCode: string;
  assignedAt: string;
  releasedAt: string | null;
  allocationRate: number;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  // joined fields
  userName?: string;
  displayName?: string | null;
  departmentCode?: string | null;
  positionCode?: string | null;
}

export interface CreateProjectMemberDto {
  userId: string;
  roleCode: string;
  assignedAt?: string;
  allocationRate?: number;
  memo?: string;
}

export interface UpdateProjectMemberDto {
  releasedAt?: string | null;
  allocationRate?: number;
  isActive?: boolean;
  memo?: string;
}
