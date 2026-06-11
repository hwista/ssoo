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
  refreshToken: string;
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
