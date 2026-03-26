# 테스트 케이스 — 로그아웃 (Logout)

**관련 액션**: [user-login.md](../../explanation/domain/actions/user-login.md)  
**마지막 업데이트**: 2026-02-02  
**테스트 상태**: ✅ 수동 테스트 완료 (AuthService.logout 구현됨)

---

## 1. 테스트 환경

| 항목 | 값 |
|------|-----|
| API Endpoint | `POST /api/auth/logout` |
| 인증 | Bearer Token 필요 |
| 필수 서비스 | PostgreSQL, NestJS Server |

---

## 2. 테스트 케이스

### TC-LOGOUT-01: 정상 로그아웃 ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | 로그인 상태 (유효한 Access Token) |
| **입력** | Authorization: Bearer {accessToken} |
| **실행 단계** | 1. POST /api/auth/logout 요청 |
| **예상 결과** | 200 OK |
| **검증 항목** | |
| | ☐ DB: refresh_token_hash = null |
| | ☐ DB: refresh_token_expires_at = null |
| | ☐ 이전 Refresh Token으로 갱신 불가 |
| **자동화** | ✅ 가능 |

---

### TC-LOGOUT-02: 토큰 없이 로그아웃 시도 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | - |
| **입력** | Authorization 헤더 없음 |
| **실행 단계** | 1. POST /api/auth/logout 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ 에러 메시지 반환 |
| **자동화** | ✅ 가능 |

---

### TC-LOGOUT-03: 만료된 토큰으로 로그아웃 ⭐ P2

| 항목 | 내용 |
|------|------|
| **우선순위** | P2 (Medium) |
| **전제조건** | 만료된 Access Token |
| **입력** | Authorization: Bearer {expiredToken} |
| **실행 단계** | 1. POST /api/auth/logout 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☐ 토큰 갱신 후 로그아웃 필요 |
| **자동화** | ✅ 가능 |

---

### TC-LOGOUT-04: 이중 로그아웃 시도 ⭐ P3

| 항목 | 내용 |
|------|------|
| **우선순위** | P3 (Low) |
| **전제조건** | 이미 로그아웃된 상태 |
| **입력** | 이전에 사용했던 Access Token |
| **실행 단계** | 1. POST /api/auth/logout 요청 (두 번째) |
| **예상 결과** | 200 OK 또는 401 |
| **검증 항목** | |
| | ☐ 에러 없이 처리되거나 적절한 에러 반환 |
| **자동화** | ✅ 가능 |

---

### TC-LOGOUT-05: 프론트엔드 로그아웃 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | 브라우저에서 로그인 상태 |
| **입력** | 로그아웃 버튼 클릭 |
| **실행 단계** | 1. 로그아웃 버튼 클릭 → 2. API 호출 → 3. 상태 정리 |
| **예상 결과** | /login으로 리다이렉트 |
| **검증 항목** | |
| | ☐ localStorage 토큰 삭제 |
| | ☐ Zustand 상태 초기화 |
| | ☐ /login 페이지로 이동 |
| **자동화** | ✅ Playwright |

---

## 3. 히스토리

| 날짜 | 변경 내용 | 담당자 |
|------|----------|--------|
| 2026-01-17 | 최초 작성, TC-01~05 정의 | - |
