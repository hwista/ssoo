# Action — 사용자 초대 (User Invitation)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 초대 관련 API/화면/서비스 전체 미구현
  - 이메일 발송 미구현


## 1. 개요
프로젝트 리소스/이해관계자로 등록된 사용자를 시스템 사용자로 전환하기 위해 초대하는 플로우.

---

## 2. 전제 조건 (Preconditions)
- 대상 사용자가 `cm_user_m`에 존재
- 대상 사용자의 `is_system_user = false`
- 대상 사용자의 `user_status_code = registered`
- 초대자가 `admin` 또는 `manager` 권한 보유

---

## 3. 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 초대 시작 (관리자/매니저)                                         │
│     - 대상 사용자 선택                                                │
│     - 부여할 role_code 지정 (기본: viewer)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. 시스템 처리                                                      │
│     - 초대 토큰 생성 (랜덤 UUID 또는 crypto.randomBytes)              │
│     - cm_user_m 업데이트:                                            │
│       · is_system_user = true                                       │
│       · user_status_code = 'invited'                                │
│       · invited_at = now()                                          │
│       · invited_by = 초대자 user_id                                  │
│       · invitation_token_hash = hash(token)                         │
│       · invitation_expires_at = now() + 72h                         │
│       · role_code = 지정된 역할                                      │
│     - 히스토리 기록 (event_type = 'U')                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. 초대 이메일 발송                                                  │
│     - 수신: 대상 사용자 email                                         │
│     - 내용: 초대 링크 (token 포함)                                    │
│     - 링크 형식: /auth/accept-invite?token={token}                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. 초대 수락 (대상 사용자)                                           │
│     - 링크 클릭 → 초대 수락 페이지                                    │
│     - 토큰 검증:                                                     │
│       · invitation_token_hash 일치 확인                              │
│       · invitation_expires_at > now() 확인                           │
│     - 계정 설정:                                                     │
│       · login_id 입력 (기본값: email)                                │
│       · password 입력 (bcrypt 해시 후 저장)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. 초대 완료 처리                                                    │
│     - cm_user_m 업데이트:                                            │
│       · user_status_code = 'active'                                 │
│       · login_id = 입력값                                            │
│       · password_hash = hash(password)                              │
│       · invitation_token_hash = null (토큰 무효화)                   │
│       · invitation_expires_at = null                                │
│     - 히스토리 기록 (event_type = 'U')                               │
│     - (선택) 환영 이메일 발송                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. 로그인 가능                                                       │
│     - 정상적인 로그인 플로우 진입 가능                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 상태 전이

```
registered ──(초대)──▶ invited ──(초대 수락/계정 설정)──▶ active
                           │
                           └──(초대 만료)──▶ registered (재초대 필요)
```

---

## 5. 예외 처리

### 5.1 초대 토큰 만료
- `invitation_expires_at < now()` 인 경우
- 처리: "초대가 만료되었습니다. 관리자에게 재초대를 요청하세요."
- 재초대 시: 새 토큰 발급, `invited_at` 갱신

### 5.2 이미 초대된 사용자
- `user_status_code = 'invited'` 인 경우
- 처리: 기존 토큰 무효화 후 새 토큰 발급 (재초대)

### 5.3 이미 활성 사용자
- `user_status_code = 'active'` 인 경우
- 처리: "이미 시스템을 사용 중인 사용자입니다."

### 5.4 login_id 중복
- 이미 존재하는 login_id로 설정 시도
- 처리: "이미 사용 중인 아이디입니다. 다른 아이디를 입력하세요."

---

## 6. API Endpoints (예시)

### 6.1 초대 요청
```
POST /api/users/{userId}/invite
Authorization: Bearer {token}
Body: {
  "roleCode": "user"
}
Response: {
  "success": true,
  "message": "초대 이메일이 발송되었습니다."
}
```

### 6.2 초대 수락
```
POST /api/auth/accept-invite
Body: {
  "token": "{invitation_token}",
  "loginId": "user@company.com",
  "password": "securePassword123!"
}
Response: {
  "success": true,
  "message": "계정이 활성화되었습니다. 로그인해주세요."
}
```

---

## 7. 관련 문서
- [데이터베이스 스키마](../../../common/reference/db/schema.dbml) - cm_user 테이블 참조
- [사용자 로그인](./user-login.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

