# API 가이드

> 최종 업데이트: 2026-04-14

SSOO 백엔드 서버의 REST API 사용 가이드입니다.

---

## 📚 API 레퍼런스

> **상세 API 명세는 자동 생성된 문서를 참조하세요:**

### 공용 API (Common)

| 문서 | 설명 |
|------|------|
| **[OpenAPI Spec (JSON)](../reference/api/openapi.json)** | 공용 API OpenAPI 3.0 스펙 |
| **[API 문서 (Redoc)](../reference/api/index.html)** | 공용 API 인터랙티브 문서 |

### PMS API

| 문서 | 설명 |
|------|------|
| **[OpenAPI Spec (JSON)](../../pms/reference/api/openapi.json)** | PMS API OpenAPI 3.0 스펙 |
| **[API 문서 (Redoc)](../../pms/reference/api/index.html)** | PMS API 인터랙티브 문서 |

---

## 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `/api` |
| Content-Type | `application/json` |
| 인증 방식 | JWT Bearer Token |
| 런타임 OpenAPI | `/api/openapi.json` |

---

## 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "message": "선택적 메시지"
}
```

### 페이지네이션 응답

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  },
  "timestamp": "2026-01-23T08:00:00.000Z"
}
```

---

## 공통 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | 인증되지 않은 요청 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 400 | 유효성 검사 실패 |
| `TOO_MANY_REQUESTS` | 429 | Rate limit 초과 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

### 에러 응답 예시

```json
// 401 Unauthorized
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid credentials." }
}

// 403 Forbidden
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "You do not have permission." }
}

// 404 Not Found
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Resource not found.", "path": "/api/projects/123" }
}

// 429 Too Many Requests
{
  "success": false,
  "error": { "code": "TOO_MANY_REQUESTS", "message": "Rate limit exceeded." }
}
```

---

## 인증

JWT Bearer Token을 사용합니다. 인증이 필요한 요청에는 `Authorization` 헤더를 포함해야 합니다.

```
Authorization: Bearer <access_token>
```

### 토큰 만료 시 처리 흐름

```
1. API 요청 → 401 Unauthorized 응답
2. Refresh Token으로 POST /auth/refresh 호출
3. 새로운 Access Token 수신
4. 원래 요청 재시도
```

### 토큰 유효기간

| 토큰 | 유효기간 |
|------|----------|
| Access Token | 15분 |
| Refresh Token | 7일 |

---

## 운영 Access Ops API

관리자는 공통 access foundation 상태를 아래 endpoint 로 inspect 할 수 있습니다.

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /api/access/ops/inspect` | 특정 사용자의 action policy + optional object policy + permission exception 확인 |
| `GET /api/access/ops/exceptions` | permission exception 목록 조회 |

주요 query:

- `userId` 또는 `loginId`
- `targetObjectType`, `targetObjectId`
- `domainPermissionCodes` (inspect)
- `exceptionAxis`, `permissionCode`, `includeInactive`, `limit` (exceptions)

관련 문서:

- [인증 시스템 아키텍처](../explanation/architecture/auth-system.md)
- [Access Verification Runbook](./access-verification-runbook.md)
- [Access Cutover Cleanup Plan](../explanation/architecture/access-cutover-cleanup-plan.md)

---

## 관련 문서

- [인증 시스템 아키텍처](../explanation/architecture/auth-system.md) - 인증 흐름 (공용)
- [Access Verification Runbook](./access-verification-runbook.md)
- [Access Cutover Cleanup Plan](../explanation/architecture/access-cutover-cleanup-plan.md)
- [보안 표준](../explanation/architecture/security-standards.md)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-14 | admin-only access ops endpoint(`GET /api/access/ops/inspect`, `GET /api/access/ops/exceptions`)와 관련 운영 문서를 반영 |
| 2026-01-25 | 자동 문서 링크 추가, 개별 API 문서 삭제 (Redoc으로 대체) |
| 2026-01-21 | Project/User/Menu API 명세 정합화 |
| 2026-01-21 | API 명세서 최초 작성 |
