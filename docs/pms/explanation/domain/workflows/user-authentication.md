# Workflow — 사용자 인증 (User Authentication)

## 구현 상태

- 상태: ✅ 구현 완료
- 최종 검증일: 2026-02-02
- 현재 기준:
  - AuthController/Service 기준 로그인/토큰/로그아웃/me 구현됨
  - 계정 잠금: 5회 실패 시 30분 잠금 (UserService.incrementLoginFailCount)
  - UI 리다이렉트: (main)/layout.tsx에서 처리


## 1. 개요

사용자 인증 워크플로우는 로그인, 토큰 갱신, 로그아웃을 포함합니다.

**관련 액션:**
- [user-login.md](../actions/user-login.md) - 로그인 상세 로직
- [user-invitation.md](../actions/user-invitation.md) - 초대 플로우

---

## 2. 전체 흐름

```
                    ┌──────────────────┐
                    │   로그인 폼     │
                    │ / (web-pms)      │
                    └────────┬─────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│  로그인 성공     │                    │  로그인 실패     │
│  → /           │                    │  → 에러 표시     │
└────────┬────────┘                    └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Access Token   │
│  (15분 만료)    │
│  Refresh Token  │
│  (7일 만료)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  API 요청 시                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Access Token │ →  │ 401 응답 시   │ →  │ Refresh    │ │
│  │ 헤더 첨부    │    │ 자동 갱신     │    │ 재발급     │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   로그아웃       │
│   → /login      │
└─────────────────┘
```

---

## 3. 주요 컴포넌트

### 3.1 Frontend (Next.js)

| 파일 | 역할 |
|------|------|
| [apps/web/pms/src/app/(auth)/login/page.tsx][pms-login-page] | 로그인 폼 UI |
| [apps/web/pms/src/app/(main)/layout.tsx][pms-main-layout] | 인증된 PMS shell bootstrap gate |
| [apps/web/pms/src/app/(main)/page.tsx][pms-main-page] | 로그인 후 루트 shell entry |
| [apps/web/pms/src/stores/auth.store.ts](../../../../apps/web/pms/src/stores/auth.store.ts) | Zustand 인증 상태 관리 |
| [apps/web/pms/src/lib/api/client.ts](../../../../apps/web/pms/src/lib/api/client.ts) | Axios 클라이언트 (자동 토큰 갱신) |
| [apps/web/pms/src/lib/api/auth.ts](../../../../apps/web/pms/src/lib/api/auth.ts) | 인증 API 호출 함수 |

### 3.2 Backend (NestJS)

| 파일 | 역할 |
|------|------|
| [apps/server/src/modules/common/auth/auth.module.ts](../../../../apps/server/src/modules/common/auth/auth.module.ts) | 인증 모듈 정의 |
| [apps/server/src/modules/common/auth/auth.service.ts](../../../../apps/server/src/modules/common/auth/auth.service.ts) | 로그인/토큰 갱신/로그아웃 로직 |
| [apps/server/src/modules/common/auth/auth.controller.ts](../../../../apps/server/src/modules/common/auth/auth.controller.ts) | API 엔드포인트 |
| [apps/server/src/modules/common/auth/strategies/jwt.strategy.ts](../../../../apps/server/src/modules/common/auth/strategies/jwt.strategy.ts) | JWT 검증 전략 |
| [apps/server/src/modules/common/auth/guards/jwt-auth.guard.ts](../../../../apps/server/src/modules/common/auth/guards/jwt-auth.guard.ts) | 인증 가드 |
| [apps/server/src/modules/common/user/user.service.ts](../../../../apps/server/src/modules/common/user/user.service.ts) | 사용자 조회/업데이트 |

### 3.3 BigInt 처리 주의사항

> **중요**: `user_id`는 DB에서 `BigInt` 타입이지만, JWT 토큰은 JSON 기반이므로 `string`으로 변환하여 저장합니다.

- **토큰 생성**: `user.id.toString()` → JWT payload에 저장
- **토큰 사용**: `BigInt(payload.userId)` → DB 조회 시 변환

---

## 4. API 엔드포인트

### POST /api/auth/login
**로그인**

Request:
```json
{
  "loginId": "admin",
  "password": "admin123!"
}
```

Response (Success):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "로그인 성공"
}
```

Response (Failure):
```json
{
  "success": false,
  "message": "아이디 또는 비밀번호가 일치하지 않습니다."
}
```

---

### POST /api/auth/refresh
**토큰 갱신**

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "토큰 갱신 성공"
}
```

---

### POST /api/auth/logout
**로그아웃** (인증 필요)

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": null,
  "message": "로그아웃 성공"
}
```

---

### POST /api/auth/me
**현재 사용자 정보** (인증 필요)

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "1",
    "loginId": "admin"
  },
  "message": "사용자 정보 조회 성공"
}
```

---

## 5. 상태 관리 (Zustand)

### auth.store.ts 구조

```typescript
interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  clearAuth: () => void;
}
```

[pms-login-page]: ../../../../apps/web/pms/src/app/(auth)/login/page.tsx
[pms-main-layout]: ../../../../apps/web/pms/src/app/(main)/layout.tsx
[pms-main-page]: ../../../../apps/web/pms/src/app/(main)/page.tsx

### 로컬 스토리지 영속화
- 키: `ssoo-auth`
- 저장 항목: `accessToken`, `refreshToken`, `user`, `isAuthenticated`

---

## 6. 보안 고려사항

### 6.1 비밀번호
- bcryptjs로 해싱 (salt rounds: 12)
- 원본 비밀번호는 서버에서도 저장하지 않음

### 6.2 JWT 토큰
- Access Token: 15분 만료
- Refresh Token: 7일 만료
- Refresh Token은 DB에 해시로 저장

### 6.3 로그인 실패 보호
- 5회 연속 실패 시 30분 계정 잠금
- `login_fail_count`, `locked_until` 컬럼으로 관리

### 6.4 자동 토큰 갱신
- API 클라이언트에서 401 응답 시 자동으로 refresh 요청
- 갱신 실패 시 로그인 페이지로 리다이렉트

---

## 7. 테스트 계정

| 항목 | 값 |
|------|-----|
| Login ID | `admin` |
| Password | `admin123!` |
| Role | `admin` |
| 생성 스크립트 | `apps/server/scripts/seed-admin.ts` |

---

## 8. 환경 변수

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

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | 로그인 진입 책임을 `(auth)/login` + protected shell bootstrap 구조에 맞춰 갱신 |
| 2026-02-09 | Add changelog section. |
