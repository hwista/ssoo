import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface OrganizationItem {
  orgId: string;
  orgCode: string;
  orgName: string;
  orgType: string;
  orgClass: string;
  scope: string;
  levelType?: string | null;
  parentOrgId?: string | null;
  parent?: { orgId: string; orgCode: string; orgName: string } | null;
  activeChildCount: number;
  activeMemberCount: number;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  orgCode: string;
  orgName: string;
  orgType: string;
  scope?: 'internal' | 'external';
  levelType?: string;
  parentOrgId?: string | null;
  memo?: string;
}

export type UpdateOrganizationRequest = Omit<Partial<CreateOrganizationRequest>, 'orgCode'> & {
  isActive?: boolean;
};

export interface OrganizationImpact {
  organizationId: string;
  children: Array<{ id: string; name: string }>;
  memberships: number;
  grants: number;
  authorities: number;
  permissions: number;
  requests: number;
  canDeactivate: boolean;
}

export const organizationsApi = {
  impact: (id: string) => apiClient.get<ApiResponse<OrganizationImpact>>(`/organizations/${id}/impact`).then(response => response.data.data!),
  list: (includeInactive = false) =>
    apiClient
      .get<ApiResponse<OrganizationItem[]>>('/organizations', { params: { includeInactive } })
      .then((response) => response.data),
  create: (data: CreateOrganizationRequest) =>
    apiClient.post<ApiResponse<OrganizationItem>>('/organizations', data).then((response) => response.data),
  update: (id: string, data: UpdateOrganizationRequest) =>
    apiClient.put<ApiResponse<OrganizationItem>>(`/organizations/${id}`, data).then((response) => response.data),
  deactivate: (id: string) =>
    apiClient.delete<ApiResponse<OrganizationItem>>(`/organizations/${id}`).then((response) => response.data),
};
