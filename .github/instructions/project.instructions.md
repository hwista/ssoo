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
| **아키텍처** | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms/sns/crm/admin) |

---

## 빌드 및 검증 명령어

> 코어 문서의 `[PROJECT_BUILD_COMMAND]` 플레이스홀더에 대응

| 용도 | 명령어 |
|------|--------|
| **타입 체크** | `npx tsc --noEmit` (앱별) 또는 `pnpm build` (전체) |
| **린트** | `pnpm lint` |
| **테스트** | 자동 테스트 명령 없음 (`pnpm test` 미구성) |
| **전체 빌드** | `pnpm build` |

---

## 패키지 경계

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/admin ─→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/crm ───→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/pms ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/sns ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/dms ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
```

### 참조 규칙

- `apps/` → `packages/` 방향만 허용
- 역방향 참조 절대 금지
- 웹 앱은 공유 계약을 `@ssoo/types`, 공용 인증/세션/알림센터 상태를 `@ssoo/web-auth`, 공용 shell/frame/알림센터 panel surface를 `@ssoo/web-shell`, 공용 디자인 토큰/Tailwind preset/UI primitive를 `@ssoo/web-ui`로 관리
- DMS는 pnpm workspace 앱이며 파일/Git/스토리지 런타임은 `src/app/api/* -> server/*` 경계를 유지

### 패키지 목록

| 패키지 | 역할 |
|--------|------|
| `@ssoo/database` | Prisma 스키마, 트리거, 시드 |
| `@ssoo/types` | 공유 타입 정의 |
| `@ssoo/web-auth` | 공용 로그인/세션/bootstrap/auth store adapter, 알림센터 상태/API adapter |
| `@ssoo/web-shell` | 공용 앱 shell / frame / shared layout surface / 알림센터 panel surface |
| `@ssoo/web-ui` | 공용 Tailwind preset, semantic typography/spacing/radius token, 원자 UI primitive inventory |

---

## UI 공용화 강제 기준

- `@ssoo/web-ui`는 기본 UI primitive의 variant, size, typography, radius, focus ring, control height를 소유합니다.
- 원자 UI inventory 정본은 `packages/web-ui/primitive-inventory.json`입니다. inventory에 등록된 모든 원자는 `platform` 상태여야 하며, `@ssoo/web-ui`만 구현할 수 있습니다.
- 앱 `components/ui/*`는 기존 import 호환을 위한 thin re-export adapter만 허용합니다.
- inventory 밖 앱 로컬 `components/ui/*` 파일 추가, 중간/local-only 상태, 앱 로컬 재정의는 `pnpm run verify:ui-primitives`에서 실패합니다.
- inventory export는 `packages/web-ui/src/index.ts`의 named/type re-export와 AST로 대조합니다. 문자열 포함만으로는 통과하지 않습니다.
- 앱 `components/ui/*` adapter는 `@ssoo/web-ui`에서 inventory에 선언된 export만 named re-export할 수 있으며 wildcard re-export, 다른 import source, JSX markup, variant/class recipe를 둘 수 없습니다.
- 각 웹 앱의 `components/ui/*`는 앱별 Button/Badge/Card/Input/Table/Dialog/Select 등 primitive recipe를 새로 정의하지 않습니다.
- `apps/web`, `packages/web-shell`, `packages/web-auth`의 TSX surface는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 `@ssoo/web-ui` primitive 또는 앱 thin adapter를 소비합니다.
- 정적 intrinsic 태그에 `role=button/tab/checkbox/...`, `onClick+tabIndex`, `onClick+onKeyDown`을 붙여 interactive primitive처럼 쓰는 pseudo-control은 금지합니다.
- `@ssoo/web-ui` 원자 컴포넌트 사용처의 `className`에는 배치/간격 같은 문맥 override만 허용합니다. Button/Input/NativeSelect/SelectTrigger/Textarea/Checkbox의 색상, 높이, radius, border, typography, focus recipe를 다시 조합하면 `pnpm run verify:ui-consumption`에서 실패합니다.
- 이 전역 소비 기준은 `pnpm run verify:ui-consumption`에서 실패 처리되며, `build`, `codex:preflight`, `codex:push-guard`에 묶입니다.
- 내부 페이지 recipe는 `@ssoo/web-shell`의 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`를 통해 `contentPage` 단일 route contract로 조립합니다.
- 앱 TS/TSX 소스는 저수준 `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooMdiTabbedContentArea`를 직접 소비하지 않습니다.
- `legacyException`, `shellPage`, app-local page recipe clone, 저수준 MDI content primitive 우회는 `pnpm run verify:ssoo-frame`에서 실패 처리되며, `codex:preflight`, `codex:push-guard`, PR validation에 묶입니다.

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

### 프론트엔드 - Admin/CRM/PMS/SNS

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
| Next.js | 15.x | 프레임워크 (App Router + keep-alive layout) |
| React | 19.x | UI 라이브러리 |
| Tailwind CSS | 3.x | 스타일링 |
| Radix UI | - | low-level UI primitive |
| Zustand | 5.x | 상태 관리 |
| CodeMirror | 6.x | 블록 에디터 런타임 |

> **DMS 특이사항**: pnpm workspace 앱이며 파일/Git/스토리지 런타임은 앱 내부 `src/app/api/* -> server/*` 경계로 유지

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
├── sns/              # SNS 도메인 모듈
└── dms/              # DMS 도메인 모듈
```

---

## 레포 특화 금지 사항

> 코어 문서의 범용 금지 사항에 추가

1. **DMS에서 `@ssoo/database` 직접 import** - DMS는 웹 앱이며 DB 접근은 서버/플랫폼 경계를 통해 관리
2. **스키마 간 직접 참조** - common ↔ pms 간 FK 금지, 애플리케이션 레벨 조인 사용

---

## 경로별 상세 규칙

| 경로 | 인스트럭션 파일 | 설명 |
|------|----------------|------|
| `apps/server/**` | `server.instructions.md` | NestJS 백엔드 규칙 |
| `apps/web/admin/**` | `pms.instructions.md` 준용 | Admin 앱 shell/API/store 패턴 |
| `apps/web/crm/**` | `project.instructions.md` + frame system | CRM 앱 shell/API/store 패턴 |
| `apps/web/pms/**` | `pms.instructions.md` | PMS 프론트엔드 규칙 |
| `apps/web/sns/**` | `sns.instructions.md` | SNS 프론트엔드 규칙 |
| `apps/web/dms/**` | `dms.instructions.md` | DMS 프론트엔드 규칙 |
| `packages/database/**` | `database.instructions.md` | 데이터베이스/Prisma 규칙 |
| `packages/types/**` | `types.instructions.md` | 타입 패키지 규칙 |
| `packages/web-ui/**` | `project.instructions.md` | 공용 디자인 토큰/UI primitive 규칙 |
| `**/*.test.*`, `**/*.spec.*` | `testing.instructions.md` | 테스트 작성 규칙 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-19 | 원자 UI export/adapter AST 검증, pseudo-control 금지, primitive recipe className 중복 차단 기준 추가 |
| 2026-06-18 | 원자 UI raw 태그 소비를 `apps/web`, `web-shell`, `web-auth` 전역에서 금지하는 `verify:ui-consumption` 추가 |
| 2026-06-18 | 원자 UI inventory 중간 상태를 제거하고 모든 등록 원자를 `platform` 단일 상태로 정리 |
| 2026-06-18 | 원자 UI inventory 정본과 `verify:ui-primitives` 빌드/preflight/push guard 강제 기준 추가 |
| 2026-06-22 | 내부 페이지 `contentPage` route contract와 `verify:ssoo-frame` preflight/push/PR validation 강제 기준 추가 |
| 2026-06-17 | DMS 확정 화면과 PMS DataGrid/요청 목록을 선별 UI 기준선으로 정의하고 `selected-web-ui-primitives` 검증 기준 추가 |
| 2026-06-17 | `@ssoo/web-ui`를 공용 디자인 토큰/Tailwind preset/UI primitive 경계로 추가 |
| 2026-06-17 | Admin/CRM과 `@ssoo/web-auth`/`@ssoo/web-shell` 공유 경계를 현재 모노레포 기준으로 보정 |
| 2026-02-06 | 초기 버전 - copilot-instructions.md에서 레포 특화 내용 분리 |
