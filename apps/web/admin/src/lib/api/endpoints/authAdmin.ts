import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type {
  AuthAssignableRole,
  AuthEmailDeliveryStatus,
  AuthEmailDeliveryMessageSummary,
  ParticipationPage,
  AuthProviderSettings,
  AuthRegistrationRequestListResult,
  DecideAuthRegistrationRequest,
  UpdateAuthProviderSettingsRequest,
} from '@ssoo/types/common';

export interface RegistrationRequestListParams {
  page?: number;
  limit?: number;
  statusCode?: string;
}

export interface AuthAdminSessionItem {
  sessionId: string;
  issuedApp: string;
  userAgent?: string | null;
  lastSeenAt?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  createdAt: string;
  active: boolean;
}

export interface AuthAdminAccountSnapshot {
  userId: string;
  userName: string;
  email: string;
  isActive: boolean;
  authAccount: {
    loginId: string;
    accountStatusCode: string;
    loginFailCount: number;
    lockedUntil?: string | null;
    lastLoginAt?: string | null;
  } | null;
  externalIdentities: Array<{
    providerCode: string;
    tenantId: string;
    lastLoginAt?: string | null;
  }>;
  sessionSummary: { active: number; revoked: number; expired: number };
  sessions: AuthAdminSessionItem[];
}

export const authAdminApi = {
  getSettings: () =>
    apiClient.get<ApiResponse<AuthProviderSettings>>('/auth/admin/settings').then((response) => response.data),

  updateSettings: (data: UpdateAuthProviderSettingsRequest) =>
    apiClient.put<ApiResponse<AuthProviderSettings>>('/auth/admin/settings', data).then((response) => response.data),

  listRegistrationRequests: (params?: RegistrationRequestListParams) =>
    apiClient
      .get<ApiResponse<AuthRegistrationRequestListResult>>('/auth/admin/registration-requests', { params })
      .then((response) => response.data),

  listAssignableRoles: () =>
    apiClient.get<ApiResponse<AuthAssignableRole[]>>('/auth/admin/roles').then((response) => response.data),

  approveRegistrationRequest: (id: string, data: DecideAuthRegistrationRequest) =>
    apiClient
      .post<ApiResponse<unknown>>(`/auth/admin/registration-requests/${id}/approve`, data)
      .then((response) => response.data),

  rejectRegistrationRequest: (id: string, data: DecideAuthRegistrationRequest) =>
    apiClient
      .post<ApiResponse<unknown>>(`/auth/admin/registration-requests/${id}/reject`, data)
      .then((response) => response.data),

  getUserAccount: (userId: string) =>
    apiClient
      .get<ApiResponse<AuthAdminAccountSnapshot>>(`/auth/admin/users/${userId}/account`)
      .then((response) => response.data),

  revokeUserSessions: (userId: string, reason?: string) =>
    apiClient
      .post<ApiResponse<{ revokedCount: number }>>(`/auth/admin/users/${userId}/sessions/revoke`, { reason })
      .then((response) => response.data),

  unlockUser: (userId: string) =>
    apiClient
      .post<ApiResponse<{ unlocked: boolean }>>(`/auth/admin/users/${userId}/unlock`)
      .then((response) => response.data),

  requestUserPasswordReset: (userId: string) =>
    apiClient
      .post<ApiResponse<{ accepted: boolean }>>(`/auth/admin/users/${userId}/password-reset`)
      .then((response) => response.data),

  getEmailDeliveryStatus: () =>
    apiClient
      .get<ApiResponse<AuthEmailDeliveryStatus>>('/auth/admin/email-delivery/status')
      .then((response) => response.data),

  runEmailDelivery: () =>
    apiClient
      .post<ApiResponse<AuthEmailDeliveryStatus>>('/auth/admin/email-delivery/run')
      .then((response) => response.data),

  listEmailMessages: (params: { page: number; pageSize: number; status?: string }) => apiClient.get<ApiResponse<ParticipationPage<AuthEmailDeliveryMessageSummary>>>('/auth/admin/email-delivery/messages', { params }).then(response => response.data.data!),

  retryEmailDelivery: (messageId: string, reason: string, expectedUpdatedAt: string) =>
    apiClient
      .post<ApiResponse<AuthEmailDeliveryStatus>>(`/auth/admin/email-delivery/${messageId}/retry`, { reason, expectedUpdatedAt })
      .then((response) => response.data),
};
