export interface CodeGroup {
  codeGroup: string;
  count: number;
  owner: string;
}

export interface CodeItem {
  id: string;
  codeGroup: string;
  codeValue: string;
  parentCode: string | null;
  displayNameKo: string;
  displayNameEn: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CodeMutationRequest {
  reason?: string;
  expectedUpdatedAt?: string;
}

export interface CreateCodeRequest extends CodeMutationRequest {
  codeGroup: string;
  codeValue: string;
  parentCode?: string;
  displayNameKo: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCodeRequest extends CodeMutationRequest {
  codeGroup?: string;
  codeValue?: string;
  parentCode?: string;
  displayNameKo?: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CodeUsage {
  id: string;
  owner: string;
  references: Array<{ name: string; count: number }>;
  total: number;
  coverage: string;
}
