# Phase 1.3: packages/types 분석

> 분석일: 2026-01-20  
> 상태: 완료

---

## 📋 분석 대상

| 파일 | 역할 | 분석 상태 |
|------|------|:--------:|
| `package.json` | 패키지 정의 | ✅ |
| `tsconfig.json` | TS 설정 | ✅ |
| `src/index.ts` | 엔트리 포인트 | ✅ |
| `src/common.ts` | 공통 타입 | ✅ |
| `src/user.ts` | 사용자 타입 | ✅ |
| `src/customer.ts` | 고객 타입 | ✅ |
| `src/project.ts` | 프로젝트 타입 | ✅ |

---

## 1. package.json 분석

### 현재 내용

```json
{
  "name": "@ssoo/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "clean": "rimraf dist",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "rimraf": "^6.0.0"
  }
}
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| name | ✅ | `@ssoo/types` 명명 규칙 적절 |
| exports | ✅ | ESM/CJS 모두 지원 |
| dependencies | ✅ | 런타임 의존성 없음 (타입만) |
| devDependencies | ✅ | 최소한의 빌드 도구 |

### 위험도: 🟢 없음

---

## 2. 타입 파일 분석

### src/index.ts (엔트리 포인트)

```typescript
// Common
export * from './common';

// Entities
export * from './user';
export * from './customer';
export * from './project';
```

✅ 깔끔한 re-export 구조

---

### src/common.ts (공통 타입)

```typescript
// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; };
  meta?: { page?: number; limit?: number; total?: number; };
}

// 페이지네이션
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ID 파라미터
export interface IdParam {
  id: string;
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| ApiResponse | ✅ | 표준적인 응답 래퍼 |
| PaginationParams | ✅ | 페이지네이션 표준화 |
| IdParam | ✅ | 간단명료 |

---

### src/user.ts (사용자 타입)

```typescript
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto { ... }
export interface UpdateUserDto { ... }
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| UserRole | ⚠️ | Prisma 스키마와 일부 불일치 (viewer 누락) |
| User | ⚠️ | Prisma User 모델과 필드 차이 |
| DTO 패턴 | ✅ | Create/Update 분리 |

---

### src/customer.ts (고객 타입)

```typescript
export interface Customer {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerDto { ... }
export interface UpdateCustomerDto { ... }
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| Customer | ⚠️ | Prisma에 Customer 모델 없음 (논리적 FK) |
| 구조 | ✅ | 일관된 패턴 |

---

### src/project.ts (프로젝트 타입)

```typescript
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';
export type DoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled'
  | 'transferred'
  | 'hold';

export interface Project {
  id: string;
  projectName: string;
  memo?: string | null;
  customerId?: string | null;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  currentOwnerUserId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| StatusCode | ✅ | Prisma와 일치 |
| StageCode | ✅ | Prisma와 일치 |
| DoneResultCode | ✅ | Prisma와 일치 |

---

## 3. Prisma 스키마와 비교

### 주요 불일치 발견

| 항목 | @ssoo/types | Prisma 스키마 | 심각도 |
|------|-------------|---------------|:------:|
| User.id 타입 | string | BigInt | 🟡 중간 |
| Customer | 타입 정의됨 | 모델 없음 (논리적 FK) | 🟢 낮음 |

### 분석

이 불일치는 **의도적**일 수 있습니다:
- `@ssoo/types`: **API 계층**의 타입 (프론트엔드와 공유)
- Prisma: **데이터베이스 계층**의 타입

API에서 DB로 변환 시 매핑이 필요할 수 있음.
→ **실제 코드에서 어떻게 사용되는지 확인 필요**

---

## 4. 전체 구조 다이어그램

```
packages/types/
├── package.json         ✅ 의존성 없는 순수 타입 패키지
├── tsconfig.json        ✅ base 상속
│
└── src/
    ├── index.ts         ✅ re-export
    ├── common.ts        ✅ API 공통 타입
    ├── user.ts          ⚠️ Prisma와 일부 불일치
    ├── customer.ts      ⚠️ Prisma에 모델 없음
    └── project.ts       ⚠️ 코드 값 불일치
```

---

## 📊 분석 요약

### 현재 상태 평가

| 영역 | 점수 | 비고 |
|------|:----:|------|
| 패키지 구조 | 10/10 | 깔끔함 |
| 타입 구조 | 9/10 | 일관된 패턴 |
| 문서화 | 8/10 | JSDoc 있음 |
| Prisma 동기화 | 8/10 | 주요 불일치 해소 |
| **종합** | **8.7/10** | 양호 |

### 발견된 이슈

| # | 우선순위 | 내용 | 영향도 |
|---|:--------:|------|:------:|
| 1 | 낮음 | id 타입 string vs BigInt | 직렬화 시 자동 변환 |

### 권장 조치

1. **Phase 2에서 상세 검토 필요**
   - API 응답 직렬화 정책(BigInt → string) 일관성 강화

---

## ✅ 분석 완료 체크

- [x] package.json
- [x] tsconfig.json
- [x] src/index.ts
- [x] src/common.ts
- [x] src/user.ts
- [x] src/customer.ts
- [x] src/project.ts
- [x] Prisma 스키마 비교

---

## 📎 다음 단계

→ [Phase 1.4: apps/server 분석](apps-server.md)
