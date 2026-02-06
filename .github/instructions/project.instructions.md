# SSOO 프로젝트 설정 (레포 특화)

> **이 파일은 SSOO 모노레포에 특화된 설정입니다.**
> 
> 깃헙독스 코어(`copilot-instructions.md`)의 범용 원칙을 이 레포에 맞게 구체화합니다.
> 새 프로젝트 생성 시 이 파일을 프로젝트에 맞게 수정하세요.

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | SSOO (삼삼오오) |
| **목적** | SI/SM 조직의 Opportunity-Project-System 통합 업무 허브 |
| **구조** | 모노레포 (pnpm workspace + Turborepo) |
| **아키텍처** | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms) |

---

## 빌드 및 검증 명령어

> 코어 문서의 `[PROJECT_BUILD_COMMAND]` 플레이스홀더에 대응

| 용도 | 명령어 |
|------|--------|
| **타입 체크** | `npx tsc --noEmit` (앱별) 또는 `pnpm build` (전체) |
| **린트** | `pnpm lint` |
| **테스트** | `pnpm test` |
| **전체 빌드** | `pnpm build` |

---

## 패키지 경계

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/pms ──→ packages/types

apps/web/dms (독립 - @ssoo/* 참조 금지)
```

### 참조 규칙

- `apps/` → `packages/` 방향만 허용
- 역방향 참조 절대 금지
- DMS는 독립 프로젝트 (npm 사용, 모노레포 패키지 미참조)

### 패키지 목록

| 패키지 | 역할 |
|--------|------|
| `@ssoo/database` | Prisma 스키마, 트리거, 시드 |
| `@ssoo/types` | 공유 타입 정의 |

---

## 기술 스택

### 백엔드 (apps/server)

| 기술 | 버전 | 용도 |
|------|------|------|
| NestJS | 10.x | 프레임워크 |
| TypeScript | 5.x | 언어 |
| Prisma | 6.x | ORM |
| PostgreSQL | 15+ | 데이터베이스 (Multi-Schema: common, pms) |
| JWT | - | 인증 |
| bcrypt | - | 비밀번호 해싱 |
| class-validator | - | DTO 검증 |
| Swagger/OpenAPI | - | API 문서화 |

### 프론트엔드 - PMS (apps/web/pms)

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.x | 프레임워크 (App Router) |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 언어 |
| Tailwind CSS | 3.x | 스타일링 |
| shadcn/ui | - | UI 컴포넌트 (Radix primitives) |
| Zustand | 5.x | 상태 관리 |
| TanStack Query | 5.x | 서버 상태 |
| TanStack Table | 8.x | 테이블 |
| React Hook Form + Zod | - | 폼/검증 |

### 프론트엔드 - DMS (apps/web/dms)

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.x | 프레임워크 |
| React | 19.x | UI 라이브러리 |
| Tiptap | - | 에디터 |
| MUI Tree View | - | 트리 네비게이션 |

> **DMS 특이사항**: npm 독립 프로젝트 (모노레포 패키지 미참조)

---

## 레포 특화 네이밍 규칙

### DB 테이블 네이밍

| 스키마 | 접두사 | 예시 |
|--------|--------|------|
| common | `cm_` | `cm_user_m`, `cm_code_m` |
| pms | `pr_` | `pr_project_m`, `pr_task_m` |

### NestJS 클래스 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 서비스 | PascalCase + Service | `UserService`, `ProjectService` |
| 컨트롤러 | PascalCase + Controller | `AuthController` |
| DTO | PascalCase + Dto | `CreateUserDto`, `UpdateProjectDto` |

---

## 백엔드 모듈 구조

```
modules/
├── common/           # 공용 모듈 (auth, user, health)
├── pms/              # PMS 도메인 모듈
│   ├── project/
│   ├── menu/
│   └── pms.module.ts
└── (dms/)            # 미래 확장
```

---

## 레포 특화 금지 사항

> 코어 문서의 범용 금지 사항에 추가

1. **DMS에서 @ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **스키마 간 직접 참조** - common ↔ pms 간 FK 금지, 애플리케이션 레벨 조인 사용

---

## 경로별 상세 규칙

| 경로 | 인스트럭션 파일 | 설명 |
|------|----------------|------|
| `apps/server/**` | `server.instructions.md` | NestJS 백엔드 규칙 |
| `apps/web/pms/**` | `pms.instructions.md` | PMS 프론트엔드 규칙 |
| `apps/web/dms/**` | `dms.instructions.md` | DMS 프론트엔드 규칙 |
| `packages/database/**` | `database.instructions.md` | 데이터베이스/Prisma 규칙 |
| `packages/types/**` | `types.instructions.md` | 타입 패키지 규칙 |
| `**/*.test.*`, `**/*.spec.*` | `testing.instructions.md` | 테스트 작성 규칙 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-06 | 초기 버전 - copilot-instructions.md에서 레포 특화 내용 분리 |

