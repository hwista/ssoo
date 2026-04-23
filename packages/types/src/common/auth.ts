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
export type SsooAppKey = 'pms' | 'cms' | 'dms';

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
