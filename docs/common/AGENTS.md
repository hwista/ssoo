# SSOO 모노레포 에이전트 가이드 (AGENTS)

> 최종 업데이트: 2026-04-13  
> 범위: SSOO 모노레포 전체 (`sooo/`)

---

## 이 문서의 목적

새로운 에이전트(AI 또는 개발자)가 SSOO 모노레포 작업을 시작할 때 **반드시 먼저 읽어야 하는 온보딩 가이드**입니다.

**이 문서의 역할**:
- 📋 **온보딩** - 프로젝트 구조와 문서 위치 안내
- 🔗 **규칙 참조** - Copilot/Codex 규칙 파일로 연결

> 📌 **코드 작성 시 적용되는 규칙 참조 경로**:
> - Codex 진입점: [`AGENTS.md`](../../AGENTS.md)
> - Codex 전역/경로별 규칙: [`.codex/instructions/`](../../.codex/instructions/)
> - 전역 규칙: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
> - 경로별 규칙: [.github/instructions/](../../.github/instructions/)

---

## 🏗️ 모노레포 구조

```
sooo/
├── apps/
│   ├── server/              # NestJS 백엔드 API 서버
│   └── web/
│       ├── pms/             # PMS 프론트엔드 (Next.js 15)
│       ├── cms/             # CMS 프론트엔드 (Next.js 15)
│       └── dms/             # DMS 프론트엔드 (pnpm workspace 앱)
├── packages/
│   ├── database/            # Prisma ORM, DB 스키마
│   ├── types/               # 공유 TypeScript 타입
│   ├── web-auth/            # 공용 브라우저 auth/session/bootstrap
│   └── web-shell/           # 공용 웹 shell/layout surface
├── docs/                    # 문서
└── .github/                 # Copilot 규칙
    ├── copilot-instructions.md
    ├── instructions/
    ├── prompts/
    └── agents/
```

---

## 📁 AI 규칙 파일 (정본)

| 파일 | 적용 대상 | 내용 |
|------|----------|------|
| [`../../AGENTS.md`](../../AGENTS.md) | Codex 진입점 | 참조 순서, 스킬, 실행 루틴 |
| [`../../.codex/instructions/codex-instructions.md`](../../.codex/instructions/codex-instructions.md) | Codex 전역 | Codex 프로토콜/검증 순서 |
| [`../../.codex/instructions/project.instructions.md`](../../.codex/instructions/project.instructions.md) | Codex 전역 | 레포 특화 규칙 |
| [copilot-instructions.md](../../.github/copilot-instructions.md) | 전역 | 핵심 원칙, 패키지 경계, 네이밍 |
| [server.instructions.md](../../.github/instructions/server.instructions.md) | `apps/server/**` | NestJS 패턴, 보안, API |
| [pms.instructions.md](../../.github/instructions/pms.instructions.md) | `apps/web/pms/**` | 컴포넌트, 스토어, 색상 |
| [cms.instructions.md](../../.github/instructions/cms.instructions.md) | `apps/web/cms/**` | 인증, feed/board visibility, 공용 auth shell |
| [dms.instructions.md](../../.github/instructions/dms.instructions.md) | `apps/web/dms/**` | Tiptap, 파일시스템 |
| [database.instructions.md](../../.github/instructions/database.instructions.md) | `packages/database/**` | Prisma, 히스토리, 트리거 |
| [types.instructions.md](../../.github/instructions/types.instructions.md) | `packages/types/**` | 타입 정의 규칙 |
| [testing.instructions.md](../../.github/instructions/testing.instructions.md) | 테스트 파일 | Jest, E2E 패턴 |

---

## 📚 상세 참조 문서

### 아키텍처/표준

| 문서 | 경로 | 내용 |
|------|------|------|
| 개발 표준 | [development-standards.md](explanation/architecture/development-standards.md) | 계층 구조, 코드 재사용 |
| 작업 프로세스 | [workflow-process.md](explanation/architecture/workflow-process.md) | 커밋, 브랜치, PR |
| 보안 표준 | [security-standards.md](explanation/architecture/security-standards.md) | 인증, 암호화 상세 |
| 인증 시스템 | [auth-system.md](explanation/architecture/auth-system.md) | JWT, 토큰 갱신 |
| 모듈러 모놀리스 | [modular-monolith.md](explanation/architecture/modular-monolith.md) | 모듈 분리 원칙 |

### 가이드

| 문서 | 경로 | 내용 |
|------|------|------|
| API 가이드 | [api-guide.md](guides/api-guide.md) | 응답 형식, 에러 코드 |
| DB 가이드 | [database-guide.md](guides/database-guide.md) | 셋업, 마이그레이션 |
| DB 규칙 | [rules.md](guides/rules.md) | 테이블/히스토리 상세 |
| BigInt 가이드 | [bigint-guide.md](guides/bigint-guide.md) | BigInt 직렬화 |

### 도메인별 문서

| 도메인 | 위치 | 설명 |
|--------|------|------|
| **PMS** | `docs/pms/` | PMS 설계, 디자인, 도메인 |
| **DMS** | `docs/dms/` | DMS 정본 |
| **DMS 런타임 자산** | `apps/web/dms/data/documents/` | 런타임 파일 시스템/Git 데이터 |

---

## 🚀 빠른 시작

### 1. 개발 환경 실행

```bash
# 루트에서 전체 빌드
pnpm install
pnpm build

# 개별 서비스 실행
cd apps/server && pnpm dev        # 백엔드 :4000
cd apps/web/pms && pnpm dev       # PMS :3000
pnpm dev:web-dms                  # DMS :3001
```

### 2. DMS 작업 시 주의

> ⚠️ **PMS/CMS/DMS는 공통 `@ssoo/web-auth` surface 를 사용하고, DMS는 추가로 pnpm workspace 앱 기준을 따릅니다. DMS에서 `@ssoo/database` 직접 import는 금지입니다.**  
> DMS 작업 시: [docs/dms/AGENTS.md](../../docs/dms/AGENTS.md)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-13 | DMS를 pnpm workspace 앱 기준으로 현행화하고 quick start / 주의사항을 공통 auth-access 구조에 맞게 갱신 |
| 2026-02-22 | Codex 정본 진입점(`AGENTS.md`) 및 `.codex/instructions` 참조 경로 추가 |
| 2026-02-04 | **리팩토링**: 중복 내용 삭제, Copilot 규칙 링크로 대체, 온보딩 가이드로 단순화 |
| 2026-02-03 | typecheck 명령어 삭제 (스크립트 미존재) |
| 2026-02-02 | 모노레포 AGENTS 최초 작성 |
