---
applyTo: "packages/types/**"
---

# Types 패키지 개발 규칙

> 이 규칙은 `packages/types/` 경로의 파일 작업 시 적용됩니다.

---

## 패키지 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `@ssoo/types` |
| 용도 | Server ↔ Web 공유 타입 정의 |
| 모듈 타입 | CommonJS |
| 런타임 의존성 | 없음 (순수 타입 패키지) |

---

## 디렉토리 구조

```
packages/types/
├── src/
│   ├── index.ts            # 메인 엔트리 (re-export)
│   ├── common/
│   │   ├── index.ts        # common 엔트리
│   │   ├── user.ts         # User, UserRole 등
│   │   └── api.ts          # ApiResponse, Pagination
│   └── pms/
│       ├── index.ts        # pms 엔트리
│       ├── project.ts      # Project 타입
│       ├── menu.ts         # Menu 타입
│       └── code.ts         # Code 타입
├── dist/                   # 빌드 결과물
└── package.json
```

---

## Export 구조

```typescript
// ✅ 명시적 re-export (index.ts)
export { User, UserRole, UserType, UserStatus } from './user';
export { ApiResponse, Pagination, PaginatedResponse } from './api';

// ❌ 와일드카드 금지
export * from './user';
```

---

## Import 패턴

```typescript
// ✅ 서브패스 import 권장
import { User, UserRole } from '@ssoo/types/common';
import { Project, Menu } from '@ssoo/types/pms';

// ✅ 전체 import도 가능
import { User, Project } from '@ssoo/types';
```

---

## 타입 정의 규칙

### 1. 기본 타입 구조

```typescript
// ✅ 인터페이스 사용 (확장 가능)
export interface User {
  id: string;           // BigInt → string (API 전송용)
  loginId: string;
  userName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;    // ISO 8601 형식
  updatedAt: string;
}

// ✅ enum 사용 (제한된 값)
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

// ✅ type alias (유니온, 유틸리티)
export type UserStatus = 'active' | 'inactive' | 'pending';
```

### 2. ID 필드 규칙

| 레이어 | 타입 | 이유 |
|--------|------|------|
| DB (Prisma) | `BigInt` | 정밀도 유지 |
| API Response | `string` | JSON 직렬화 안전 |
| @ssoo/types | `string` | API 전송용 |

```typescript
// ✅ 올바른 타입 정의
export interface User {
  id: string;  // BigInt가 아닌 string
}
```

### 3. 날짜 필드 규칙

```typescript
// ✅ API 전송용: ISO 8601 문자열
export interface User {
  createdAt: string;  // "2026-02-04T10:30:00.000Z"
  updatedAt: string;
}

// ❌ Date 객체 사용 금지 (JSON 직렬화 문제)
createdAt: Date;
```

---

## API 응답 타입

```typescript
// ✅ 표준 API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ✅ 페이지네이션 응답
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ✅ 페이지네이션 요청
export interface Pagination {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 도메인별 타입 분류

### common (공통)

| 타입 | 설명 |
|------|------|
| `User` | 사용자 정보 |
| `UserRole` | 사용자 역할 enum |
| `UserType` | 사용자 유형 (INTERNAL/EXTERNAL) |
| `ApiResponse<T>` | API 응답 래퍼 |
| `Pagination` | 페이지네이션 파라미터 |
| `PaginatedResponse<T>` | 페이지네이션 응답 |

### pms (프로젝트 관리)

| 타입 | 설명 |
|------|------|
| `Project` | 프로젝트 정보 |
| `ProjectStatus` | 프로젝트 상태 |
| `Menu` | 메뉴 구조 |
| `Customer` | 고객사 정보 |
| `Code` | 코드 마스터 |

---

## 네이밍 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 인터페이스 | PascalCase | `User`, `Project` |
| enum | PascalCase | `UserRole`, `ProjectStatus` |
| type alias | PascalCase | `UserStatus` |
| 파일명 | kebab-case 또는 단일 단어 | `user.ts`, `api-response.ts` |

---

## 타입 추가 시 체크리스트

1. **도메인 분류** - common인지 pms인지 확인
2. **ID 타입** - string으로 정의 (BigInt → string)
3. **날짜 타입** - string으로 정의 (ISO 8601)
4. **index.ts 업데이트** - 명시적 re-export 추가
5. **빌드 확인** - `pnpm --filter @ssoo/types build`

---

## 금지 사항

1. **와일드카드 export** - `export * from` 금지
2. **any 타입 사용** - unknown 또는 구체적 타입 사용
3. **런타임 코드 포함** - 순수 타입만 정의
4. **ID를 number/BigInt로 정의** - string 사용
5. **Date 객체 사용** - ISO 8601 문자열 사용
6. **순환 참조** - common ↔ pms 상호 참조 금지

---

## 사용처

| 프로젝트 | Import |
|----------|--------|
| apps/server | `@ssoo/types` (workspace:*) |
| apps/web/pms | `@ssoo/types` (workspace:*) |
| apps/web/dms | ❌ 사용 금지 (독립 프로젝트) |

---

## 관련 문서

**아키텍처**:
- [Types 패키지 명세서](../../docs/common/architecture/types-package-spec.md) - Export 구조, 의존성, 스크립트
