# 테스트 케이스 — 세션 복원 (HttpOnly Session Cookie)

**관련 액션**: [user-login.md](../../explanation/domain/actions/user-login.md)  
**마지막 업데이트**: 2026-02-02  
**테스트 상태**: ✅ 수동 테스트 완료 (AuthService.refreshTokens + `/api/auth/session` 구현됨)

---

## 1. 테스트 환경

| 항목 | 값 |
|------|-----|
| API Endpoint | `POST /api/auth/session` |
| 입력 | HttpOnly `ssoo-session` Cookie |
| 필수 서비스 | PostgreSQL, NestJS Server |

---

## 2. 테스트 케이스

### TC-REFRESH-01: 정상 세션 복원 ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | 유효한 `ssoo-session` HttpOnly cookie 보유 |
| **입력** | Cookie only |
| **실행 단계** | 1. POST /api/auth/session 요청 |
| **예상 결과** | 200 OK, 새 accessToken + user payload |
| **검증 항목** | |
| | ☐ 새 accessToken 발급 |
| | ☐ session cookie 회전 |
| | ☐ DB: 새 session_token_hash 저장 |
| | ☐ 이전 session token 무효화 |
| **자동화** | ✅ 가능 |

---

### TC-REFRESH-02: 만료된 Refresh Token ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | Session cookie 만료됨 (7일 경과) |
| **입력** | 만료된 `ssoo-session` cookie |
| **실행 단계** | 1. POST /api/auth/session 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ 에러 메시지: 토큰 만료 |
| | ☐ 재로그인 필요 |
| **자동화** | ✅ 가능 |

---

### TC-REFRESH-03: 잘못된 Session Cookie ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | - |
| **입력** | 잘못된 `ssoo-session` cookie |
| **실행 단계** | 1. POST /api/auth/session 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ 토큰 형식 검증 실패 |
| **자동화** | ✅ 가능 |

---

### TC-REFRESH-04: DB와 불일치하는 Session Cookie ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | 유효하지만 DB에 저장된 해시와 다른 session cookie |
| **입력** | 이전에 발급받았지만 이미 갱신된 session cookie |
| **실행 단계** | 1. POST /api/auth/session 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ 토큰 재사용 공격 방지 |
| | ☐ 에러 메시지 반환 |
| **자동화** | ✅ 가능 |

---

### TC-REFRESH-05: 로그아웃 후 Session Cookie 사용 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | 로그아웃 완료된 상태 |
| **입력** | 로그아웃 전 발급받은 `ssoo-session` cookie |
| **실행 단계** | 1. POST /api/auth/session 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ DB session row revoked |
| | ☐ session token 비교 실패 |
| **자동화** | ✅ 가능 |

---

### TC-REFRESH-06: 자동 토큰 갱신 (프론트엔드) ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | Access Token 만료, 유효한 `ssoo-session` cookie |
| **입력** | 인증이 필요한 API 호출 |
| **실행 단계** | 1. API 호출 → 2. 401 응답 → 3. 자동 session bootstrap → 4. 재시도 |
| **예상 결과** | 자동으로 토큰 갱신 후 원래 요청 성공 |
| **검증 항목** | |
| | ☐ apiClient 인터셉터 동작 |
| | ☐ runtime access token 업데이트 |
| | ☐ 사용자 경험 끊김 없음 |
| **자동화** | ✅ Playwright |

---

### TC-REFRESH-07: 자동 갱신 실패 시 로그인 리다이렉트 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | Access Token + session cookie 모두 만료 |
| **입력** | 인증이 필요한 API 호출 |
| **실행 단계** | 1. API 호출 → 2. 401 → 3. session bootstrap 시도 → 4. bootstrap도 401 |
| **예상 결과** | /login으로 리다이렉트 |
| **검증 항목** | |
| | ☐ localStorage 사용자 snapshot 정리 |
| | ☐ Zustand 상태 초기화 |
| | ☐ /login으로 이동 |
| **자동화** | ✅ Playwright |

---

## 3. 히스토리

| 날짜 | 변경 내용 | 담당자 |
|------|----------|--------|
| 2026-01-17 | 최초 작성, TC-01~07 정의 | - |
