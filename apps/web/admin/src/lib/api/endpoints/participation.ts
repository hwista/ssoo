import type { ApprovalCandidatePage, CreateOnboardingRequest, DecideOnboardingRequest, OnboardingRequest, OnboardingRequestKind, OnboardingRequestStatus, OnboardingRoleCode, OnboardingServiceCode } from '@ssoo/types/common';
import { apiClient } from '../client';

export interface ApprovalAuthority {
  id: string; userId: string; userName: string; organizationId: string | null;
  organizationName: string | null; authorityKind: 'organization' | 'service';
  serviceCode: OnboardingServiceCode | ''; maxRoleCode: OnboardingRoleCode; isActive: boolean;
  expiresAt: string | null; updatedAt: string; reason: string | null;
  effective: boolean; inactiveReason: string | null; pendingCount: number;
}
export interface SetApprovalAuthority {
  userId: string; authorityKind: 'organization' | 'service'; organizationId?: string;
  serviceCode?: OnboardingServiceCode; maxRoleCode: OnboardingRoleCode;
  expiresAt: string | null; reason: string; expectedUpdatedAt?: string;
}
export interface ReviewQuery { status: OnboardingRequestStatus; kind?: OnboardingRequestKind; page: number }
export interface ReviewPage { data: OnboardingRequest[]; meta: { page: number; limit: number; total: number } }

export const participationApi = {
  createRequest: (data: CreateOnboardingRequest) => apiClient.post('/onboarding/requests', data),
  cancelRequest: (id: string) => apiClient.delete(`/onboarding/requests/${id}`),
  reviews: (params: ReviewQuery) => apiClient.get<ReviewPage>('/onboarding/reviews', { params }).then((result) => result.data),
  decide: ({ id, ...decision }: DecideOnboardingRequest & { id: string }) => apiClient.post(`/onboarding/requests/${id}/decision`, decision),
  authorities: () => apiClient.get<{ data: ApprovalAuthority[] }>('/onboarding/authorities').then((result) => result.data.data),
  candidates: (params: { organizationId?: string; search?: string; page: number }) => apiClient
    .get<{ data: ApprovalCandidatePage }>('/onboarding/approval-candidates', { params }).then((result) => result.data.data),
  delegate: (data: SetApprovalAuthority) => apiClient.post('/onboarding/authorities', data),
  revokeAuthority: ({ id, ...data }: { id: string; reason: string; expectedUpdatedAt: string }) => apiClient.delete(`/onboarding/authorities/${id}`, { data }),
};
