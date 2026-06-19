/**
 * 로그인 요청
 */
export interface LoginRequest {
  loginId: string;
  password: string;
}

/**
 * SSOO 앱 식별자
 */
export type SsooAppKey = 'pms' | 'sns' | 'dms' | 'admin' | 'crm';

/**
 * 인증 토큰 묶음
 */
export interface AuthTokens {
  accessToken: string;
}

/**
 * 공용 인증 사용자 식별자
 */
export interface AuthIdentity {
  userId: string;
  loginId: string;
  userName?: string;
}

/**
 * 사람 표시/프로필 링크에 필요한 최소 profile projection.
 *
 * 로그인/세션 식별자인 AuthIdentity와 분리해 유지하며, 현재 owner는 SNS Profile surface다.
 * 여러 도메인 앱이 사람 링크/표시를 공통 소비할 때 common projection으로 사용한다.
 */
export interface ProfileSummary {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  organizationName?: string | null;
  departmentName?: string | null;
  positionName?: string | null;
  profilePath?: string | null;
}

/**
 * AuthIdentity에 붙일 수 있는 profile 표시 projection.
 *
 * 인증 여부/세션 식별은 AuthIdentity가 담당하고, 표시명/아바타 같은 사람 표시 데이터는
 * ProfileSummary에서 필요한 필드만 투영해 사용한다.
 */
export interface AuthProfileDisplayProjection {
  displayName?: ProfileSummary['displayName'] | null;
  avatarUrl?: ProfileSummary['avatarUrl'];
}

/**
 * 인증 사용자 snapshot에 profile 표시 필드가 필요한 surface 전용 타입.
 */
export type AuthIdentityProfileProjection = AuthIdentity & AuthProfileDisplayProjection;

/**
 * 인증 세션 상태
 */
export type AuthSessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/**
 * 서버 세션에서 앱이 부팅할 때 받는 공통 payload
 */
export interface AuthSessionBootstrap<TUser extends AuthIdentity = AuthIdentity> {
  accessToken: string;
  user: TUser;
}

/**
 * 로그아웃 결과
 */
export interface AuthLogoutResult {
  loggedOut: boolean;
  clearedSharedSession: boolean;
}

/**
 * 인증 사용자 별칭
 */
export type AuthUser = AuthIdentity;

export type AuthIdentityProviderKey = 'sso' | 'microsoft';

export type AuthRegistrationRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type AuthEmailDeliveryMode = 'outbox' | 'disabled';

export interface AuthPublicActionLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface AuthPublicIdentityProvider {
  key: AuthIdentityProviderKey;
  href: string;
  label: string;
  external?: boolean;
}

export interface AuthPublicLoginConfig {
  passwordLoginEnabled: boolean;
  passwordResetHref?: string;
  registrationLink?: AuthPublicActionLink;
  identityProviders: AuthPublicIdentityProvider[];
}

export interface AuthProviderSettings {
  settingKey: string;
  passwordLoginEnabled: boolean;
  passwordResetEnabled: boolean;
  passwordChangeEnabled: boolean;
  resetCodeTtlMinutes: number;
  resetCodeLength: number;
  internalSsoEnabled: boolean;
  internalSsoLoginUrl?: string | null;
  microsoftLoginEnabled: boolean;
  microsoftSignupRequestEnabled: boolean;
  microsoftTenantId?: string | null;
  microsoftClientId?: string | null;
  microsoftClientSecretConfigured: boolean;
  microsoftRedirectUri?: string | null;
  microsoftScopes: string[];
  allowedTenantIds: string[];
  allowedEmailDomains: string[];
  selfSignupEnabled: boolean;
  emailDeliveryMode: AuthEmailDeliveryMode;
  emailFromAddress?: string | null;
  updatedAt: string;
}

export interface UpdateAuthProviderSettingsRequest {
  passwordLoginEnabled?: boolean;
  passwordResetEnabled?: boolean;
  passwordChangeEnabled?: boolean;
  resetCodeTtlMinutes?: number;
  resetCodeLength?: number;
  internalSsoEnabled?: boolean;
  internalSsoLoginUrl?: string | null;
  microsoftLoginEnabled?: boolean;
  microsoftSignupRequestEnabled?: boolean;
  microsoftTenantId?: string | null;
  microsoftClientId?: string | null;
  microsoftClientSecret?: string | null;
  microsoftRedirectUri?: string | null;
  microsoftScopes?: string[];
  allowedTenantIds?: string[];
  allowedEmailDomains?: string[];
  selfSignupEnabled?: boolean;
  emailDeliveryMode?: AuthEmailDeliveryMode;
  emailFromAddress?: string | null;
}

export interface AuthRegistrationRequestItem {
  registrationRequestId: string;
  providerCode: AuthIdentityProviderKey;
  tenantId: string;
  subjectId: string;
  email: string;
  userPrincipalName?: string | null;
  displayName?: string | null;
  statusCode: AuthRegistrationRequestStatus;
  requestedAt: string;
  decidedAt?: string | null;
  decidedByUserId?: string | null;
  decisionMemo?: string | null;
  createdUserId?: string | null;
}

export interface AuthRegistrationRequestListResult {
  data: AuthRegistrationRequestItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthAssignableRole {
  roleCode: string;
  roleName: string;
  roleScopeCode: string;
  description?: string | null;
}

export interface DecideAuthRegistrationRequest {
  roleCode?: string;
  memo?: string | null;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResult {
  accepted: boolean;
}

export interface ConfirmPasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ConfirmPasswordResetResult {
  reset: boolean;
}
