# Action — 사용자 로그인 (User Login)

## 구현 상태

- 상태: ✅ 구현 완료
- 현재 기준:
  - AuthController/Service 기준 로그인, 토큰 갱신/로그아웃 구현됨
  - 계정 잠금 정책: 5회 실패 시 30분 잠금 (UserService.incrementLoginFailCount에서 구현)
  - 최종 검증일: 2026-02-02


## 1. 개요

시스템 사용자(`status_code = 'active'`)가 로그인하여 JWT 토큰을 발급받는 플로우입니다.

**워크플로우:** [user_authentication.md](../workflows/user_authentication.md)

---

## 2. 전제 조건 (Preconditions)

- 사용자가 `cm_user_m`에 존재
- `status_code = 'active'`
- `locked_until`이 null이거나 현재 시간보다 과거

---

## 3. 코드 아키텍처

### 3.1 전체 흐름

```
[Web] LoginPage → [Zustand] login() → [API] authApi.login()
         ↓                                      ↓
[HTTP POST] /api/auth/login ─────────────────────→
                                                   ↓
                          [NestJS] AuthController.login()
                                                   ↓
                          [NestJS] AuthService.login()
                                                   ↓
                          [NestJS] UserService.findByLoginId()
                                                   ↓
                          [Prisma] User 조회
                                                   ↓
                          [bcryptjs] 비밀번호 검증
                                                   ↓
                          [JwtService] 토큰 생성
                                                   ↓
[Response] ← ────────────────────────────────────────
```

---

## 4. 파일 구조

### 4.1 Frontend (Next.js)

| 파일 | 역할 |
|------|------|
| `apps/web/pms/src/app/(auth)/login/page.tsx` | 로그인 폼 UI (공용 `AuthStandardLoginCard`) |
| `apps/web/pms/src/app/(main)/layout.tsx` | 인증된 PMS shell 진입 전 bootstrap gate |
| `apps/web/pms/src/app/(main)/page.tsx` | 로그인 후 루트 shell entry |
| `apps/web/pms/src/stores/auth.store.ts` | Zustand 인증 상태 관리 |
| `apps/web/pms/src/lib/api/client.ts` | Axios 클라이언트 (자동 토큰 갱신) |
| `apps/web/pms/src/lib/api/auth.ts` | 인증 API 호출 함수 |

### 4.2 Backend (NestJS)

| 파일 | 역할 |
|------|------|
| `apps/server/src/modules/common/auth/auth.module.ts` | 인증 모듈 정의 |
| `apps/server/src/modules/common/auth/auth.service.ts` | 로그인/토큰 갱신/로그아웃 로직 |
| `apps/server/src/modules/common/auth/auth.controller.ts` | API 엔드포인트 |
| `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts` | JWT 검증 전략 |
| `apps/server/src/modules/common/auth/guards/jwt-auth.guard.ts` | 인증 가드 |
| `apps/server/src/modules/common/auth/dto/login.dto.ts` | 로그인 DTO |
| `apps/server/src/modules/common/user/user.service.ts` | 사용자 조회/업데이트 |

---

## 5. 상세 플로우

### 5.1 로그인 요청 처리

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 로그인 요청                                                       │
│     - 입력: login_id, password                                       │
│     - 클라이언트: react-hook-form + zod 검증                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. 사용자 조회 (UserService.findByLoginId)                          │
│     - login_id로 cm_user_m 조회                                       │
│     - 없으면: "아이디 또는 비밀번호가 일치하지 않습니다."                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. 시스템 사용자 및 계정 상태 확인                                    │
│     - isSystemUser === false → "시스템 접근 권한이 없습니다."          │
│     - userStatusCode !== 'active' → "비활성화된 계정입니다."           │
│     - lockedUntil > now() → "계정이 잠겨있습니다."                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. 비밀번호 검증 (bcryptjs.compare)                                  │
│     - 실패 시:                                                        │
│       · UserService.incrementLoginFailCount()                        │
│       · 5회 초과: 30분 잠금                                           │
│       · 응답: "아이디 또는 비밀번호가 일치하지 않습니다."                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. 로그인 성공 처리                                                  │
│     - UserService.resetLoginFailCount()                              │
│     - UserService.updateLastLogin()                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────────────────────────────┐
│  6. JWT 토큰 발급 (AuthService.generateTokens)                        │
│     - Access Token: 15분 만료                                         │
│       · payload: userId, loginId, roleCode, isAdmin                  │
│     - Refresh Token: 7일 만료                                         │
│       · DB에 해시로 저장 (UserService.updateRefreshToken)             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. 클라이언트 처리                                                   │
│     - Zustand store에 토큰 저장                                       │
│     - LocalStorage 영속화 (ssoo-auth 키)                              │
│     - /로 리다이렉트                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 토큰 갱신 (Refresh)

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 토큰 갱신 요청                                                    │
│     - 401 응답 시 자동 호출 (apiClient 인터셉터)                       │
│     - 또는 명시적 호출                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Refresh Token 검증 (AuthService.refreshTokens)                   │
│     - JWT 디코딩으로 userId 추출                                      │
│     - DB의 해시와 비교 검증                                           │
│     - 사용자 상태 재확인                                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. 새 토큰 발급                                                      │
│     - 새 Access Token + Refresh Token 발급 (Rotation)                │
│     - DB의 Refresh Token 갱신                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 로그아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│  로그아웃 처리 (AuthService.logout)                                   │
│  - DB에서 refresh_token = null                                       │
│  - 클라이언트: Zustand store 초기화                                   │
│  - LocalStorage 클리어                                               │
│  - /로 리다이렉트                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. 주요 코드 스니펫

### 6.1 AuthService.login() (핵심 로직)

```typescript
// apps/server/src/modules/common/auth/auth.service.ts
async login(loginDto: LoginDto): Promise<AuthTokens> {
  const { loginId, password } = loginDto;
  
  // 1. 사용자 조회
  const user = await this.userService.findByLoginId(loginId);
  if (!user) {
    throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
  }
  
  // 2. 시스템 사용자 여부 확인
  if (!user.isSystemUser) {
    throw new UnauthorizedException('시스템 접근 권한이 없습니다.');
  }
  
  // 3. 계정 상태 확인
  if (user.userStatusCode !== 'active') {
    throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
  }
  
  // 4. 계정 잠금 확인
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
  }
  
  // 5. 비밀번호 검증
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
  if (!isPasswordValid) {
    // 로그인 실패 횟수 증가 (5회 초과 시 30분 잠금 - incrementLoginFailCount 내부 로직)
    await this.userService.incrementLoginFailCount(user.id);
    throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
  }
  
  // 6. 성공 처리
  await this.userService.resetLoginFailCount(user.id);
  await this.userService.updateLastLogin(user.id);
  
  // 7. 토큰 생성 및 Refresh Token DB 저장
  const tokens = await this.generateTokens({
    userId: user.id.toString(),
    loginId: user.loginId!,
    roleCode: user.roleCode,
    isAdmin: user.isAdmin,
  });
  
  return tokens;
}
```

### 6.2 Zustand login 액션

```typescript
// apps/web/pms/src/stores/auth.store.ts
login: async (loginId: string, password: string) => {
  set({ isLoading: true });
  try {
    const tokens = await authApi.login({ loginId, password });
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    const user = await authApi.me();
    set({ user, isAuthenticated: true });
  } catch (error) {
    set({ accessToken: null, refreshToken: null, user: null });
    throw error;
  } finally {
    set({ isLoading: false });
  }
};
```

---

## 7. API 엔드포인트

### 7.1 로그인
```
POST /api/auth/login
Body: {
  "loginId": "admin",
  "password": "admin123!"
}
Response: {
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "로그인 성공"
}
```

### 7.2 토큰 갱신
```
POST /api/auth/refresh
Body: {
  "refreshToken": "eyJhbG..."
}
Response: {
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "토큰 갱신 성공"
}
```

### 7.3 로그아웃
```
POST /api/auth/logout
Authorization: Bearer {accessToken}
Response: {
  "success": true,
  "data": null,
  "message": "로그아웃 성공"
}
```

### 7.4 현재 사용자 정보
```
POST /api/auth/me
Authorization: Bearer {accessToken}
Response: {
  "success": true,
    "data": {
      "userId": "1",
      "loginId": "admin"
    },
    "message": "사용자 정보 조회 성공"
}
```

---

## 8. 보안 고려사항

### 8.1 비밀번호
- bcryptjs로 해싱 (salt rounds: 12)
- 원본 비밀번호는 서버에서도 저장하지 않음

### 8.2 JWT 토큰
- Access Token: 15분 만료
- Refresh Token: 7일 만료
- Refresh Token은 DB에 해시로 저장

### 8.3 BigInt 직렬화 주의사항

> **중요**: JavaScript의 `JSON.stringify()`는 `BigInt`를 직렬화할 수 없습니다.
> JWT 토큰은 JSON 기반이므로 `userId`를 `string`으로 변환하여 저장합니다.

```typescript
// 토큰 생성 시 - BigInt를 string으로 변환
const tokens = await this.generateTokens({
  userId: user.id.toString(),  // BigInt → string
  loginId: user.loginId,
  roleCode: user.roleCode,
  isAdmin: user.isAdmin,
});

// 토큰 사용 시 - string을 BigInt로 변환
const user = await this.userService.findById(BigInt(payload.userId));  // string → BigInt
```

**TokenPayload 인터페이스:**
```typescript
// apps/server/src/modules/common/auth/interfaces/auth.interface.ts
export interface TokenPayload {
  userId: string;     // BigInt를 JSON 직렬화할 수 없어 string으로 저장
  loginId: string;
  roleCode: string;
  isAdmin: boolean;   // 관리자 여부
  type?: 'access' | 'refresh';
}
```

### 8.4 Brute-force 방지
- 로그인 실패 5회 → 30분 잠금
- `login_fail_count`, `locked_until` 컬럼으로 관리

### 8.5 자동 토큰 갱신
- apiClient 인터셉터에서 401 응답 시 자동 refresh
- 갱신 실패 시 /로 리다이렉트

---

## 9. 테스트 계정

| 항목 | 값 |
|------|-----|
| Login ID | `admin` |
| Password | `admin123!` |
| Role | `admin` |
| 생성 스크립트 | `apps/server/scripts/seed-admin.ts` |

---

## 10. 환경 변수

### Server (.env)
```dotenv
JWT_SECRET=ssoo-jwt-secret-key-change-in-production-2026
JWT_REFRESH_SECRET=ssoo-jwt-refresh-secret-key-change-in-production-2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Web (.env.local)
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 11. 테스트 케이스 (Quick Check)

> 상세 테스트 시나리오: [login.test.md](../../tests/auth/login.md)

| ID | 테스트 케이스 | 우선순위 | 상태 |
|----|--------------|---------|------|
| TC-01 | 정상 로그인 (토큰 발급) | P0 | ✅ |
| TC-02 | 잘못된 비밀번호 (401) | P0 | ✅ |
| TC-03 | 존재하지 않는 사용자 | P0 | ✅ |
| TC-04 | 비활성 계정 로그인 차단 | P1 | ✅ 구현됨 |
| TC-05 | 5회 실패 시 계정 잠금 | P1 | ✅ 구현됨 |
| TC-06 | 잠긴 계정 로그인 차단 | P1 | ✅ 구현됨 |
| TC-07 | 잠금 해제 후 로그인 | P2 | ✅ 구현됨 |
| TC-08 | 빈 입력값 검증 | P2 | ✅ |
| TC-09 | 대시보드 리다이렉트 | P1 | ✅ |
| TC-10 | 로그인 상태에서 / 접근 | P2 | ✅ |

---

## 12. 관련 문서

- [사용자 인증 워크플로우](../workflows/user-authentication.md)
- [데이터베이스 스키마](../../../common/reference/db/schema.dbml) - cm_user 테이블 참조
- [사용자 초대 플로우](./user-invitation.md)
- [로그인 테스트 상세](../../tests/auth/login.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | 로그인 UI/entry 책임을 `(auth)/login` + `(main) shell gate/page` 구조에 맞춰 갱신 |
| 2026-02-09 | Add changelog section. |
