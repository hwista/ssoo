# Types 패키지 명세서

> 📅 기준일: 2026-02-02  
> 📦 패키지명: `@ssoo/types` v0.0.1

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | @ssoo/types |
| **경로** | `packages/types/` |
| **용도** | Server ↔ Web 공유 타입 정의 |
| **모듈 타입** | CommonJS |

---

## 2. 의존성

### 2.1 런타임 의존성

없음 (순수 타입 패키지)

### 2.2 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `typescript` | ^5.7.0 | 타입 시스템 |
| `typedoc` | ^0.28.0 | 타입 문서 생성 |
| `rimraf` | ^6.0.0 | 디렉토리 삭제 유틸 |

---

## 3. Export 구조

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./common": {
      "types": "./dist/common/index.d.ts",
      "default": "./dist/common/index.js"
    },
    "./pms": {
      "types": "./dist/pms/index.d.ts",
      "default": "./dist/pms/index.js"
    }
  }
}
```

### 3.1 Import 예시

```typescript
// 전체 타입
import { User, Project } from '@ssoo/types';

// common 타입만
import { User, UserRole } from '@ssoo/types/common';

// pms 타입만
import { Project, Menu } from '@ssoo/types/pms';
```

---

## 4. 디렉토리 구조

```
packages/types/
├── src/
│   ├── index.ts            # 메인 엔트리 (re-export)
│   ├── common/
│   │   ├── index.ts        # common 엔트리
│   │   └── user.ts         # User, UserRole 등
│   └── pms/
│       ├── index.ts        # pms 엔트리
│       ├── project.ts      # Project 타입
│       ├── menu.ts         # Menu 타입
│       └── ...
├── dist/                   # 빌드 결과물
└── package.json
```

---

## 5. 포함된 타입

### 5.1 common

| 타입 | 설명 |
|------|------|
| `User` | 사용자 정보 |
| `UserRole` | 사용자 역할 enum |
| `UserType` | 사용자 유형 (내부/외부) |
| `UserStatus` | 사용자 상태 (활성/비활성) |
| `ApiResponse<T>` | API 응답 래퍼 |
| `Pagination` | 페이지네이션 파라미터 |
| `PaginatedResponse<T>` | 페이지네이션 응답 |

### 5.2 pms

| 타입 | 설명 |
|------|------|
| `Project` | 프로젝트 정보 |
| `ProjectStatus` | 프로젝트 상태 |
| `Menu` | 메뉴 구조 |
| `Customer` | 고객사 정보 |
| `Code` | 코드 마스터 |

---

## 6. 스크립트

```json
{
  "build": "tsc",
  "clean": "rimraf dist",
  "dev": "tsc --watch",
  "docs:typedoc": "typedoc --options typedoc.json"
}
```

---

## 7. 사용처

| 프로젝트 | 사용 방법 |
|----------|----------|
| `server` | `@ssoo/types`: `workspace:*` |
| `web-pms` | `@ssoo/types`: `workspace:*` |
| `web-dms` | (미연동) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 현행 패키지 기준 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

