---
applyTo: "packages/types/**"
---

# Codex Types Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/types.instructions.md`

## 패키지 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `@ssoo/types` |
| 용도 | Server ↔ Web 공유 타입 정의 |
| 런타임 의존성 | 없음 (순수 타입 패키지) |

## 디렉토리 구조

```
packages/types/src/
├── index.ts            # 메인 엔트리 (re-export)
├── common/             # 공통 (User, ApiResponse, Pagination)
└── pms/                # PMS (Project, Menu, Code)
```

## 타입 정의 규칙

- **인터페이스** 사용 (확장 가능), **type alias**는 유니온/유틸리티용
- **ID 필드**: `string` (BigInt → JSON 직렬화 안전)
- **날짜 필드**: `string` (ISO 8601, Date 객체 금지)
- **enum**: PascalCase, 값은 대문자 문자열

```typescript
export interface User {
  id: string;           // BigInt → string
  loginId: string;
  createdAt: string;    // ISO 8601
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

## Export 규칙

```typescript
// ✅ 명시적 re-export
export { User, UserRole } from './user';
// ❌ 와일드카드 금지
export * from './user';
```

## Import 패턴

```typescript
// 서브패스 import 권장
import { User } from '@ssoo/types/common';
import { Project } from '@ssoo/types/pms';
```

## 사용처

| 프로젝트 | 사용 가능 |
|----------|----------|
| apps/server | ✅ |
| apps/web/pms | ✅ |
| apps/web/dms | ❌ (독립 프로젝트) |

## 금지 사항

1. **와일드카드 export**
2. **any 타입 사용**
3. **런타임 코드 포함** - 순수 타입만
4. **ID를 number/BigInt로 정의** - string 사용
5. **Date 객체 사용** - ISO 8601 문자열
6. **순환 참조** - common ↔ pms 상호 참조 금지

## 검증

- 빌드: `pnpm --filter @ssoo/types build`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-27 | 타입정의규칙/Export/Import/사용처/금지사항 추가 |
| 2026-02-22 | Codex Types 정본 신설 |
