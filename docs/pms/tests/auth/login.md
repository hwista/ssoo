# 테스트 케이스 — 로그인 (Login)

**관련 액션**: [user-login.md](../../explanation/domain/actions/user-login.md)  
**마지막 업데이트**: 2026-02-02  
**테스트 상태**: ✅ 수동 테스트 완료

---

## 1. 테스트 환경

| 항목 | 값 |
|------|-----|
| API Endpoint | `POST /api/auth/login` |
| 테스트 계정 | `admin` / `admin123!` |
| 필수 서비스 | PostgreSQL, NestJS Server |

---

## 2. 테스트 케이스

### TC-LOGIN-01: 정상 로그인 ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | 활성 사용자 존재 (`userStatusCode = 'active'`) |
| **입력** | `{ "loginId": "admin", "password": "admin123!" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 200 OK, accessToken + refreshToken 반환 |
| **검증 항목** | |
| | ☑️ accessToken이 JWT 형식 |
| | ☑️ refreshToken이 JWT 형식 |
| | ☑️ user 객체에 password_hash 미포함 |
| | ☑️ DB: last_login_at 업데이트됨 |
| | ☑️ DB: login_fail_count = 0 |
| | ☑️ DB: refresh_token_hash 저장됨 |
| **자동화** | ✅ 가능 |

**응답 예시:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "1",
    "loginId": "admin",
    "userName": "시스템관리자",
    "roleCode": "admin"
  }
}
```

---

### TC-LOGIN-02: 잘못된 비밀번호 ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | 활성 사용자 존재 |
| **입력** | `{ "loginId": "admin", "password": "wrongpassword" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☑️ 에러 메시지: "아이디 또는 비밀번호가 일치하지 않습니다" |
| | ☑️ DB: login_fail_count 증가 |
| | ☑️ 토큰 미발급 |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-03: 존재하지 않는 사용자 ⭐ P0

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 (Critical) |
| **전제조건** | - |
| **입력** | `{ "loginId": "nonexistent", "password": "any" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☑️ 에러 메시지: "아이디 또는 비밀번호가 일치하지 않습니다" |
| | ☑️ 존재 여부 노출하지 않음 (보안) |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-04: 비활성 계정 로그인 시도 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | 사용자의 `userStatusCode = 'inactive'` |
| **입력** | `{ "loginId": "inactive_user", "password": "correct" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☑️ 에러 메시지: "비활성화된 계정입니다" |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-05: 계정 잠금 (5회 실패) ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | `login_fail_count = 4` (4회 실패 상태) |
| **입력** | `{ "loginId": "admin", "password": "wrong" }` (5번째 실패) |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 401 Unauthorized, 계정 잠금 |
| **검증 항목** | |
| | ☑️ DB: login_fail_count = 5 |
| | ☑️ DB: locked_until = now() + 30분 |
| | ☑️ 에러 메시지에 잠금 시간 포함 |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-06: 잠긴 계정 로그인 시도 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | `locked_until > now()` |
| **입력** | `{ "loginId": "locked_user", "password": "correct" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 401 Unauthorized |
| **검증 항목** | |
| | ☑️ 에러 메시지: "계정이 잠겨있습니다. X분 후 다시 시도하세요" |
| | ☑️ 올바른 비밀번호여도 차단 |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-07: 잠금 해제 후 로그인 ⭐ P2

| 항목 | 내용 |
|------|------|
| **우선순위** | P2 (Medium) |
| **전제조건** | `locked_until < now()` (잠금 시간 만료) |
| **입력** | `{ "loginId": "admin", "password": "admin123!" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 200 OK, 정상 로그인 |
| **검증 항목** | |
| | ☑️ login_fail_count = 0 으로 초기화 |
| | ☑️ locked_until = null |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-08: 빈 입력값 ⭐ P2

| 항목 | 내용 |
|------|------|
| **우선순위** | P2 (Medium) |
| **전제조건** | - |
| **입력** | `{ "loginId": "", "password": "" }` |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 400 Bad Request |
| **검증 항목** | |
| | ☑️ 유효성 검증 에러 반환 |
| | ☑️ DB 조회 없이 즉시 반환 |
| **자동화** | ✅ 가능 |

---

### TC-LOGIN-09: 대시보드 리다이렉트 ⭐ P1

| 항목 | 내용 |
|------|------|
| **우선순위** | P1 (High) |
| **전제조건** | 브라우저에서 테스트 |
| **입력** | UI에서 로그인 |
| **실행 단계** | 1. / 페이지 접속 → 2. 로그인 폼 제출 |
| **예상 결과** | /로 리다이렉트 |
| **검증 항목** | |
| | ☑️ URL이 /로 변경 |
| | ☑️ localStorage에 토큰 저장 |
| | ☑️ Zustand 상태에 user 정보 저장 |
| **자동화** | ✅ Playwright |

---

### TC-LOGIN-10: 로그인 상태에서 / 접근 ⭐ P2

| 항목 | 내용 |
|------|------|
| **우선순위** | P2 (Medium) |
| **전제조건** | 이미 로그인된 상태 |
| **입력** | 브라우저에서 / 직접 접근 |
| **실행 단계** | 1. / URL 직접 입력 |
| **예상 결과** | /로 자동 리다이렉트 |
| **검증 항목** | |
| | ☑️ 로그인 페이지 표시 안됨 |
| **자동화** | ✅ Playwright |

---

## 3. 테스트 데이터

### 3.1 테스트 계정

| Login ID | Password | 상태 | 용도 |
|----------|----------|------|------|
| `admin` | `admin123!` | active | 정상 로그인 |
| `inactive_user` | `test123!` | inactive | 비활성 계정 테스트 |
| `locked_user` | `test123!` | active + locked | 계정 잠금 테스트 |

### 3.2 시드 스크립트

```bash
# 테스트 계정 생성
cd apps/server
npx ts-node scripts/seed-admin.ts

# 테스트용 추가 계정 (TODO)
npx ts-node scripts/seed-test-users.ts
```

---

## 4. 자동화 코드 (예정)

### 4.1 Jest + Supertest

```typescript
// apps/server/test/auth/login.e2e-spec.ts
describe('POST /api/auth/login', () => {
  it('TC-LOGIN-01: 정상 로그인', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginId: 'admin', password: 'admin123!' });
    
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('TC-LOGIN-02: 잘못된 비밀번호', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginId: 'admin', password: 'wrong' });
    
    expect(response.status).toBe(401);
  });
});
```

### 4.2 Playwright (E2E)

```typescript
// apps/web/pms/e2e/auth/login.spec.ts
test('TC-LOGIN-09: 대시보드 리다이렉트', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="loginId"]', 'admin');
  await page.fill('[name="password"]', 'admin123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/');
});
```

---

## 5. 히스토리

| 날짜 | 변경 내용 | 담당자 |
|------|----------|--------|
| 2026-01-17 | 최초 작성, TC-01~10 정의 | - |
| 2026-01-17 | BigInt 직렬화 이슈 해결 확인 | - |
