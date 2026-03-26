# SSOO (삼삼오오)

> SI/SM 조직의 **Opportunity–Project–System** 통합 업무 허브

**"삼삼오오(3355) 모여서 일한다"** — 핸드오프에 의한 맥락 단절과 수작업 보고 비용을 최소화하는 사내 업무 허브

---

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [개발 명령어](#-개발-명령어)
- [디자인 시스템](#-디자인-시스템)
- [아키텍처 결정](#-아키텍처-결정)
- [문서](#-문서)

---

## 🎯 프로젝트 개요

### 해결하려는 문제

1. **영업/AM → PM 인계 시 히스토리 단절** — PM이 "왜/무엇/누가/전제/리스크"를 모르고 시작
2. **기회(파이프라인) 가시성 부족** — PM은 다음 프로젝트를 사전에 알기 어려움
3. **수작업 보고 비용** — 각자 PPT 작성 → 취합 → 보고 반복

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **Opportunity** | 계약 전 기회 (Project의 `status_code=opportunity`로 표현) |
| **Project** | 단일 엔티티로 기회+실행 통합 (`status_code` + `stage_code`) |
| **Handoff** | 역할 간 인계 트랙 (영업→PM, PM→SM 등) |
| **System** | 운영 자산 (프로젝트와 독립적으로도 존재 가능) |
| **Customer** | 고객 및 플랜트/사이트 |

---

## 🛠 기술 스택

### 왜 이 스택인가?

| 선택 | 이유 |
|------|------|
| **TypeScript 풀스택** | 단일 언어로 Server/Web/Mobile/Desktop 전체 커버, 타입 공유 가능 |
| **Monorepo (pnpm + Turborepo)** | 코드 재사용, 통합 버전 관리, 독립 배포 가능 |
| **NestJS** | 엔터프라이즈급 구조, 모듈화, 테스트 용이 |
| **Next.js** | SSR/SSG 지원, React 생태계, Vercel 배포 최적화 |
| **Prisma** | 타입 안전 ORM, 마이그레이션 관리, 다양한 DB 지원 |
| **PostgreSQL** | 안정성, JSON 지원, 확장성 |

### 상세 스택

```
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript (단일 언어)                    │
├─────────────┬─────────────┬──────────────┬──────────────────┤
│ apps/server │  apps/web-pms       │ apps/mobile  │   apps/desktop   │
│   NestJS    │  Next.js    │ React Native │    Electron      │
│  (백엔드)    │ (프론트엔드) │   (나중에)    │     (나중에)      │
├─────────────┴─────────────┴──────────────┴──────────────────┤
│                      packages/ (공유)                        │
│  @ssoo/types (타입) │ @ssoo/database (Prisma) │ @ssoo/ui    │
└─────────────────────────────────────────────────────────────┘
```

| 패키지 | 버전 | 용도 |
|--------|------|------|
| Node.js | ≥20.0.0 | 런타임 |
| pnpm | 9.x | 패키지 매니저 |
| Turborepo | 2.x | 빌드 오케스트레이션 |
| NestJS | 10.x | 백엔드 프레임워크 |
| Next.js | 15.x | 프론트엔드 프레임워크 |
| Prisma | 6.x | ORM |
| PostgreSQL | 15+ | 데이터베이스 |

---

## 📁 프로젝트 구조

```
sooo/
│
├── apps/                        # 실행 가능한 애플리케이션
│   ├── server/                  # NestJS 백엔드 API
│   │   ├── src/
│   │   │   ├── main.ts          # 엔트리포인트
│   │   │   ├── app.module.ts    # 루트 모듈
│   │   │   └── modules/         # 도메인 모듈 (auth, user, menu 등)
│   │   └── package.json
│   │
│   └── web/                     # 프론트엔드 애플리케이션
│       ├── pms/                 # PMS 프론트엔드 (Next.js 15)
│       │   ├── src/
│       │   │   ├── app/         # App Router
│       │   │   ├── components/  # 컴포넌트
│       │   │   └── stores/      # 상태 관리 (Zustand)
│       │   └── package.json
│       │
│       └── dms/                 # DMS 프론트엔드 (독립 프로젝트)
│           ├── src/             # 소스 코드
│           ├── docs/            # DMS 정본 문서
│           └── package.json     # npm 사용 (pnpm 아님)
│
├── packages/                    # 공유 패키지
│   ├── types/                   # @ssoo/types - 공통 타입 정의
│   │   └── src/
│   │       ├── index.ts         # 엔트리포인트
│   │       ├── project.ts       # Project 타입/DTO
│   │       ├── user.ts          # User 타입/DTO
│   │       ├── customer.ts      # Customer 타입/DTO
│   │       └── common.ts        # 공통 타입 (ApiResponse 등)
│   │
│   └── database/                # @ssoo/database - Prisma 클라이언트
│       ├── prisma/
│       │   └── schema.prisma    # DB 스키마 정의
│       └── src/
│           └── index.ts         # Prisma 클라이언트 export
│
├── docs/                        # 프로젝트 문서
│   ├── README.md                # 문서 허브 인덱스
│   ├── common/                  # 공통 문서 (아키텍처, 표준)
│   │   ├── AGENTS.md            # 에이전트 가이드
│   │   └── architecture/        # 개발 표준, 보안, 패키지 명세
│   ├── pms/                     # PMS 도메인 문서
│   └── dms/                     # DMS 통합 관련 (정본은 apps/web/dms/docs)
│
├── package.json                 # 루트 워크스페이스 설정
├── pnpm-workspace.yaml          # pnpm 워크스페이스 정의
├── turbo.json                   # Turborepo 태스크 설정
├── tsconfig.base.json           # 공통 TypeScript 설정
├── .env.example                 # 환경변수 예시
└── .gitignore
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0
- **PostgreSQL** ≥ 15 (또는 Docker)

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone https://github.com/hwista/sooo.git
cd sooo

# pnpm 설치 (없는 경우)
npm install -g pnpm

# 의존성 설치
pnpm install
```

### 2. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집 (DATABASE_URL 등 설정)
```

`.env` 파일 예시:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ssoo_dev?schema=public"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. 데이터베이스 설정

```bash
# PostgreSQL 실행 (Docker 사용 시)
docker run --name ssoo-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ssoo_dev -p 5432:5432 -d postgres:15

# Prisma 클라이언트 생성
pnpm --filter @ssoo/database db:generate

# DB 스키마 적용
pnpm --filter @ssoo/database db:push
```

### 4. 개발 서버 실행

```bash
# 전체 실행 (server + web-pms 동시)
pnpm dev

# 또는 개별 실행
pnpm dev:server   # 백엔드: http://localhost:4000
pnpm dev:web-pms      # 프론트엔드: http://localhost:3000
```

### 5. 동작 확인

```bash
# Health Check API
curl http://localhost:4000/api/health

# 웹 브라우저에서 확인
open http://localhost:3000
```

---

## ⚠️ 보안 프로그램 환경에서의 설치

사내 보안 프로그램(DLP, EDR 등)이 설치 과정에서 다양한 문제를 일으킬 수 있습니다.

### 문제 1: spawn EPERM 에러

`pnpm`, `npx` 명령어 실행 시 프로세스 생성이 차단되는 경우:

```
Error: spawn EPERM
    at ChildProcess.spawn (node:internal/child_process:420:11)
```

**해결**: `node`로 직접 스크립트 실행

### 문제 2: SSL 인증서 에러

사내 프록시/방화벽이 SSL을 가로채는 경우:

```
Error: self-signed certificate in certificate chain
```

**해결**: SSL 검증 임시 비활성화
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

### 🔧 보안 환경 전체 설치 가이드

아래는 보안 프로그램 환경에서 테스트된 전체 설치 과정입니다:

```powershell
# 1. 프로젝트 폴더로 이동
cd c:\WorkSpace\dev\source\sooo

# 2. 의존성 설치 (빌드 스크립트 무시)
pnpm install --ignore-scripts

# 3. 환경변수 파일 생성
copy .env.example .env

# 4. SSL 검증 비활성화 (사내 프록시 환경)
$env:NODE_TLS_REJECT_UNAUTHORIZED=0

# 5. Prisma 클라이언트 생성
cd packages/database
node ./node_modules/prisma/build/index.js generate

# 6. 공유 패키지 빌드 (types)
cd ../types
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json

# 7. database 패키지 빌드
cd ../database
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json

# 8. 서버 빌드 및 실행
cd ../../apps/server
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json
node dist/main.js

# 9. 웹 실행 (새 터미널에서)
cd c:\WorkSpace\dev\source\sooo\apps\web-pms
node ./node_modules/next/dist/bin/next dev --port 3000
```

### 실행 확인

```
✅ Server: http://localhost:4000/api/health
   → {"success":true,"data":{"status":"ok","service":"ssoo-server","version":"0.0.1"}}

✅ Web PMS: http://localhost:3000
   → SSOO 메인 페이지 + Server Status 연동 확인
```

### 주의사항

- `NODE_TLS_REJECT_UNAUTHORIZED=0`은 **개발 환경에서만** 사용하세요.
- 관리자 권한 PowerShell로 실행하면 일부 문제가 해결되기도 합니다.
- 보안팀에 Node.js 개발 도구 예외 등록을 요청하는 것이 근본적인 해결책입니다.
- `--watch` 모드가 EPERM 에러를 발생시키면, 빌드 후 `node dist/main.js`로 실행하세요.

---

## 📦 개발 명령어

### 루트 레벨 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm install` | 전체 의존성 설치 |
| `pnpm dev` | 전체 개발 서버 실행 |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` | 전체 린트 검사 |
| `pnpm clean` | 빌드 결과물 삭제 |

### 앱별 명령어

```bash
# Server만 실행/빌드
pnpm dev:server
pnpm build:server

# Web만 실행/빌드
pnpm dev:web-pms
pnpm build:web-pms

# 특정 앱 + 의존 패키지만 빌드
pnpm build --filter=server...
```

### Database 명령어

```bash
# Prisma 클라이언트 생성
pnpm --filter @ssoo/database db:generate

# 스키마를 DB에 반영 (개발용)
pnpm --filter @ssoo/database db:push

# 마이그레이션 생성 및 적용
pnpm --filter @ssoo/database db:migrate

# Prisma Studio (DB GUI)
pnpm --filter @ssoo/database db:studio
```

### 패키지별 빌드

```bash
# 공통 타입 빌드
pnpm --filter @ssoo/types build

# 데이터베이스 패키지 빌드
pnpm --filter @ssoo/database build
```

---

## 🏗 아키텍처 결정

### Monorepo를 선택한 이유

| 장점 | 설명 |
|------|------|
| **타입 공유** | Server ↔ Web PMS 간 DTO/Entity 타입 100% 동기화 |
| **원자적 변경** | API 변경 시 Server + Web PMS를 하나의 PR로 처리 |
| **의존성 통일** | 모든 앱이 같은 버전의 라이브러리 사용 |
| **독립 배포** | 각 앱별로 필요할 때만 개별 배포 가능 |

### 코드 공유 흐름

```
┌──────────────────┐
│  @ssoo/types     │ ◄── 모든 앱에서 import
│  (공통 타입)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ server │  │ web-pms │
│ NestJS │  │ Next.js │
└────────┘  └────────┘
```

### 배포 전략

| 앱 | 빌드 결과 | 배포 대상 |
|-----|----------|----------|
| server | Docker Image | Cloud Run, ECS, EC2 |
| web-pms | Static/SSR | Vercel, Netlify, S3+CloudFront |
| mobile (예정) | APK/IPA | App Store, Play Store |
| desktop (예정) | .exe/.dmg | GitHub Releases |

---

## 📚 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| **개발 가이드** | [docs/pms/getting-started.md](docs/pms/getting-started.md) | 개발 환경 설정 가이드 |
| **진행 상황** | [docs/pms/planning/backlog.md](docs/pms/planning/backlog.md) | Phase별 태스크 및 완료 현황 |
| **UI 설계** | [docs/pms/design/README.md](docs/pms/design/README.md) | 페이지 레이아웃, 보안, 디자인 시스템 |
| **디자인 시스템** | [docs/pms/design/design-system.md](docs/pms/design/design-system.md) | 타이포그래피, 색상, 버튼 표준 |
| 서비스 정의 | [docs/README.md](docs/README.md) | 서비스 컨셉, 핵심 개념, MVP 로드맵 |
| DB 설계 규칙 | [docs/pms/guides/rules.md](docs/pms/guides/rules.md) | 테이블 네이밍, 컬럼 규칙 |
| DB 가이드 | [docs/pms/guides/database-guide.md](docs/pms/guides/database-guide.md) | 데이터베이스 사용 가이드 |
| 업무 흐름 | [docs/pms/domain/workflows/](docs/pms/domain/workflows/) | 프로젝트 라이프사이클, 인증 흐름 등 |
| 액션 명세 | [docs/pms/domain/actions/](docs/pms/domain/actions/) | 로그인, 프로젝트 관리 등 상세 명세 |

---

## 🎨 디자인 시스템

> 일관된 UI/UX를 위한 디자인 표준

### 타이포그래피

| 레벨 | 크기 | 가중치 | 용도 | 클래스명 |
|------|------|----------|------|----------|
| **H1** | 28px | Bold | 페이지 제목 | `heading-1` |
| **H2** | 24px | Semibold | 섹션 제목 | `heading-2` |
| **H3** | 20px | Semibold | 하위 제목 | `heading-3` |
| **Body** | 14px | Regular | 본문 | `body-text` |

### 아이콘 크기

각 텍스트 레벨에 맞는 아이콘 크기를 사용합니다:
- H1용: `icon-h1` (28px)
- H2용: `icon-h2` (24px)
- H3용: `icon-h3` (20px)
- Body용: `icon-body` (16px)

### 버튼 색상 체계

| 변형 | 색상 | 용도 |
|------|------|------|
| **Primary** | 파란색 | 생성, 저장, 확인 등 주요 액션 |
| **Secondary** | 회색 | 취소, 닫기, 일반 작업 |
| **Outline** | 테두리 | 필터, 정렬 등 보조 액션 |
| **Destructive** | 빨간색 | 삭제, 위험한 작업 |

**표준 버튼 높이**: 40px (`h-button-h`)

### 관련 문서

- [디자인 시스템 가이드](docs/pms/ui-design/design-system.md) - 상세 가이드 및 코드 예시
- [UI Design 문서](docs/pms/ui-design/README.md) - 전체 UI 설계 문서

---

## 🔐 인증 시스템

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **로그인** | ID/Password 기반 JWT 인증 | ✅ 완료 |
| **토큰 갱신** | Access Token 만료 시 자동 Refresh | ✅ 완료 |
| **로그아웃** | 서버/클라이언트 토큰 초기화 | ✅ 완료 |
| **계정 잠금** | 5회 로그인 실패 시 30분 잠금 | ✅ 완료 |

### 토큰 설정

| 토큰 | 만료 시간 | 용도 |
|------|----------|------|
| Access Token | 15분 | API 요청 인증 |
| Refresh Token | 7일 | Access Token 갱신 |

### 테스트 계정

```
ID: admin
PW: admin123!
Role: admin
```

### 관련 문서

- [사용자 인증 워크플로우](docs/pms/domain/workflows/user_authentication.md)
- [로그인 액션 상세](docs/pms/domain/actions/user_login.md)

---

## 🔮 로드맵

| 단계 | 목표 | 상태 |
|------|------|------|
| **MVP-0** | 마스터 허브 (Customer/Project/User) | 🔄 진행 중 |
| **MVP-1** | 상태/단계 + 전환/종료 이벤트 | ⏳ 예정 |
| **MVP-2** | 핸드오프 트랙/로그 | ⏳ 예정 |
| **MVP-3** | 산출물/종료조건 | ⏳ 예정 |
| **MVP-4** | 태스크/이슈/리스크 + 자동 리포트 | ⏳ 예정 |

---

## 📝 라이센스

Private - 내부 사용 전용
