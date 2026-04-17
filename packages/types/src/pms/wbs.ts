// WBS — 프로젝트 작업 분해 구조

export interface Wbs {
  id: string;
  projectId: string;
  objectiveId: string | null;
  parentWbsId: string | null;
  wbsCode: string;
  wbsName: string;
  description: string | null;
  statusCode: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWbsDto {
  objectiveId?: string | null;
  parentWbsId?: string | null;
  wbsCode: string;
  wbsName: string;
  description?: string;
  statusCode?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateWbsDto {
  objectiveId?: string | null;
  parentWbsId?: string | null;
  wbsName?: string;
  description?: string | null;
  statusCode?: string;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}
