export interface TokenPayload {
  userId: string;  // BigInt를 JSON 직렬화할 수 없어 string으로 저장
  loginId: string;
  roleCode?: string;
  organizationIds?: string[];
  teamIds?: string[];
  groupIds?: string[];
  sessionId?: string;
  type?: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserRecord {
  userId: bigint;
  loginId: string;
  passwordHash: string;
  accountStatusCode: string;
  lastLoginAt: Date | null;
  loginFailCount: number;
  lockedUntil: Date | null;
  roleCode: string;
  isActive: boolean;
}

export interface JwtPayload extends TokenPayload {
  iat: number;
  exp: number;
}
