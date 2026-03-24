---
applyTo: "**"
---

# SSOO Codex Project Instructions

> 최종 업데이트: 2026-03-23

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | SSOO (삼삼오오) |
| 목적 | SI/SM 조직의 Opportunity-Project-System 통합 업무 허브 |
| 구조 | pnpm workspace + Turborepo |
| 아키텍처 | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/chs/dms) |

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 백엔드 | NestJS, Prisma, PostgreSQL | 10.x, 6.x, 15+ |
| PMS 프론트 | Next.js (App Router), React, shadcn/ui, Zustand, TanStack Query/Table | 15.x, 19.x, 5.x |
| DMS 프론트 | Next.js, React, Tailwind CSS, Radix UI, Zustand, CodeMirror | 15.x, 19.x, 3.x, 1.x, 5.x, 6.x |
| CHS 프론트 | Next.js (App Router), React, shadcn/ui, Zustand, TanStack Query | 15.x, 19.x, 5.x, 5.x, 5.x |
| 공통 | TypeScript, Tailwind CSS | 5.x, 3.x |

## 패키지 경계

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/pms ──→ packages/types
apps/web/chs ──→ packages/types

apps/web/dms (독립 - @ssoo/* 참조 금지)
```

- `apps/` → `packages/` 방향만 허용
- 역방향 참조 절대 금지
- DMS는 독립 프로젝트 (npm 사용, 모노레포 패키지 미참조)

### 패키지 목록

| 패키지 | 역할 |
|--------|------|
| `@ssoo/database` | Prisma 스키마, 트리거, 시드 |
| `@ssoo/types` | 공유 타입 정의 |

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

## 레포 특화 네이밍 규칙

### DB 테이블 네이밍

| 스키마 | 접두사 | 예시 |
|--------|--------|------|
| common | `cm_` | `cm_user_m`, `cm_code_m` |
| pms | `pr_` | `pr_project_m`, `pr_task_m` |
| dms | `dm_` | `dm_document_m` |
| chs | `ch_` | `ch_post_m`, `ch_skill_m` |

### NestJS 클래스 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 서비스 | PascalCase + Service | `UserService`, `ProjectService` |
| 컨트롤러 | PascalCase + Controller | `AuthController` |
| DTO | PascalCase + Dto | `CreateUserDto`, `UpdateProjectDto` |

## 기본 명령

| 용도 | 명령어 |
|------|--------|
| lint | `pnpm lint` |
| build | `pnpm build` |
| test | `pnpm test` |
| codex preflight | `pnpm run codex:preflight` |
| codex sync verify | `pnpm run codex:verify-sync` |

## 경로 → Instruction 매핑

| 경로 | Codex Instruction | GitHub Instruction |
|------|-------------------|-------------------|
| `apps/server/**` | `server.instructions.md` | `server.instructions.md` |
| `apps/web/pms/**` | `pms.instructions.md` | `pms.instructions.md` |
| `apps/web/chs/**` | `chs.instructions.md` | `chs.instructions.md` |
| `apps/web/dms/**` | `dms.instructions.md` | `dms.instructions.md` |
| `packages/database/**` | `database.instructions.md` | `database.instructions.md` |
| `packages/types/**` | `types.instructions.md` | `types.instructions.md` |
| `**/*.test.*` | `testing.instructions.md` | `testing.instructions.md` |

## 문서 동기화

- 코드 변경 시 대응 문서의 backlog/changelog 반영 확인
- 규칙 변경 시 `.github/` (정본) → `.codex/instructions/` → `CLAUDE.md` 순서로 반영

## 레포 특화 금지 사항

1. **DMS에서 @ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **스키마 간 직접 참조** - common ↔ pms 간 FK 금지, 애플리케이션 레벨 조인 사용

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | CHS 경로 매핑, 기술 스택, 패키지 경계, DB 접두사 반영 |
| 2026-02-27 | 기술 스택 테이블, 백엔드 모듈 구조, DB 테이블/NestJS 네이밍, 경로→instruction 매핑 추가 |
| 2026-02-22 | Codex 프로젝트 정본 신설 |
