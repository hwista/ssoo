export interface TokenPayload {
  userId: string;  // BigInt를 JSON 직렬화할 수 없어 string으로 저장
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean; // 관리자 여부
  type?: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload extends TokenPayload {
  iat: number;
  exp: number;
}
