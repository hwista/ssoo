# 개발 환경 설정 가이드

> SSOO 프로젝트 로컬 개발 환경 구성 방법

**마지막 업데이트**: 2026-04-07

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [저장소 클론](#저장소-클론)
3. [환경 변수 설정](#환경-변수-설정)
4. [의존성 설치](#의존성-설치)
5. [데이터베이스 설정](#데이터베이스-설정)
6. [개발 서버 실행](#개발-서버-실행)
7. [포트 설정](#포트-설정)
8. [개발 명령어](#개발-명령어)
9. [코드 품질 보장](#코드-품질-보장)
10. [문제 해결](#문제-해결)
11. [다음 단계](#다음-단계)
12. [관련 문서 / 지원](#관련-문서--지원)
13. [Changelog](#changelog)

---

## 사전 요구사항

### 필수 설치

| 도구 | 버전 | 확인 명령어 | 설치 방법 |
|------|------|------------|----------|
| **Node.js** | v24.x (Active LTS) | `node --version` | [nodejs.org](https://nodejs.org/) 또는 `nvm use` |
| **pnpm** | v9.x 이상 | `pnpm --version` | `npm install -g pnpm` |
| **Git** | 최신 버전 | `git --version` | [git-scm.com](https://git-scm.com/) |

### PostgreSQL (택 1)

| 방식 | 설명 | 권장 환경 |
|------|------|----------|
| **Docker** | 컨테이너로 실행 | 로컬 개발 (권장) |
| **로컬 설치** | OS에 직접 설치 | Docker 미사용 환경 |
| **원격 서버** | 외부 DB 서버 연결 | 팀/운영 환경 |

### 권장 도구

- **VS Code** - 에디터
- **DBeaver** 또는 **pgAdmin** - 데이터베이스 GUI
- **Postman** - API 테스트

---

## 저장소 클론

```bash
# 저장소 클론
git clone https://github.com/hwista/sooo.git

# 프로젝트 디렉토리 이동
cd sooo

# Node 버전 확인 (nvm 사용 시)
nvm use
```

---

## 환경 변수 설정

### 1. 루트 환경 변수

`.env.example`을 복사하여 `.env` 생성:

```bash
# Linux / macOS / WSL
cp .env.example .env

# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

루트 `.env` 내용:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

Docker compose는 이 `DATABASE_URL`을 그대로 재사용하지 않고, 내부 컨테이너 연결용
`DOCKER_DATABASE_URL` / `DOCKER_DMS_DATABASE_URL` 기본값을 사용합니다.

### 2. 서버 환경 변수 (필수)

`apps/server/.env` 생성 **(mis설정 시 서버 부팅 실패 - Joi 검증 적용)**:

```bash
# Linux / macOS / WSL
cp apps/server/.env.example apps/server/.env

# Windows (CMD)
copy apps\server\.env.example apps\server\.env

# Windows (PowerShell)
Copy-Item apps/server/.env.example apps/server/.env
```

필요시 내용 수정:

```env
# Server Configuration
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"

# JWT Configuration (필수)
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=development
```

### 3. 웹 애플리케이션 환경 변수

#### PMS (`apps/web/pms/.env.local`)

```bash
# Linux / macOS / WSL
cp apps/web/pms/.env.example apps/web/pms/.env.local

# Windows (CMD)
copy apps\web\pms\.env.example apps\web\pms\.env.local

# Windows (PowerShell)
Copy-Item apps/web/pms/.env.example apps/web/pms/.env.local
```

필요시 내용 수정:

```env
# API 엔드포인트
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

#### DMS (`apps/web/dms/.env.local`)

```bash
# Linux / macOS / WSL
cp apps/web/dms/.env.example apps/web/dms/.env.local

# Windows (CMD)
copy apps\web\dms\.env.example apps\web\dms\.env.local

# Windows (PowerShell)
Copy-Item apps/web/dms/.env.example apps/web/dms/.env.local
```

필요시 내용 수정:

```env
# 서버 검색 브리지 (기본값은 http://localhost:4000/api)
DMS_SERVER_API_URL=http://localhost:4000/api

# 공용 DB URL (권장)
DATABASE_URL=postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public

# 호환용 별도 키 (선택)
DMS_DATABASE_URL=
```

### 4. 데이터베이스 환경 변수

`packages/database/.env` 생성:

```bash
# Linux / macOS / WSL
cp packages/database/.env.example packages/database/.env

# Windows (CMD)
copy packages\database\.env.example packages\database\.env

# Windows (PowerShell)
Copy-Item packages/database/.env.example packages/database/.env
```

또는 직접 생성:

```env
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"
```

---

## 의존성 설치

### Monorepo 전체 설치

```bash
# 루트 디렉토리에서 실행
pnpm install

# 전체 Docker 스택 빌드 + 실행
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup
```

이 명령어는 모든 workspace의 의존성을 자동으로 설치합니다:
- `apps/web/pms` (Next.js)
- `apps/web/dms` (Next.js)
- `apps/web/cms` (Next.js)
- `apps/server` (NestJS)
- `packages/database` (Prisma)
- `packages/types` (TypeScript Types)

> ⚠️ **중요**: Prisma 명령어(`prisma generate`, `prisma db push` 등)는 의존성 설치 후에만 사용 가능합니다.
> 로컬 기능 검증은 개별 `pnpm dev:*`보다 root `compose.yaml` 기반 Docker 스택을 기본 경로로 사용합니다.

### DB 서버 옵션 (택 1)

| 방식 | 설명 | 권장 환경 |
|------|------|----------|
| **옵션 A: Docker** | 컨테이너로 실행 | 로컬 개발 (권장) |
| **옵션 B: 로컬 설치** | OS에 직접 설치 | Docker 미사용 환경 |
| **옵션 C: 원격 서버** | 외부 DB 서버 연결 | 팀/운영 환경 |

### DB 서버 옵션 (택 1)

```
postgresql://[사용자]:[비밀번호]@[호스트]:[포트]/[데이터베이스]?schema=public
```

| 환경 | DATABASE_URL 예시 |
|------|-------------------|
| Docker (로컬) | `postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public` |
| 로컬 설치 | `postgresql://postgres:mypassword@localhost:5432/ssoo_dev?schema=public` |
| 원격 서버 | `postgresql://dbuser:dbpass@db.example.com:5432/ssoo_prod?schema=public` |

---

### 옵션 A: Docker PostgreSQL (권장 - 로컬 개발)

```bash
# 프로젝트용 PostgreSQL 컨테이너 생성
docker run -d \
  --name ssoo-postgres \
  -e POSTGRES_USER=ssoo \
  -e POSTGRES_PASSWORD=ssoo_dev_pw \
  -e POSTGRES_DB=ssoo_dev \
  -v ssoo-pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:16
```

| 옵션 | 설명 |
|--------|------|
| `-v ssoo-pgdata:/var/lib/postgresql/data` | 데이터 영속성 (컨테이너 재시작해도 유지) |
| `--restart unless-stopped` | 시스템 재부팅 시 자동 실행 |

**컨테이너 관리:**
```bash
docker ps | grep ssoo-postgres          # 상태 확인
docker exec -it ssoo-postgres psql -U ssoo -d ssoo_dev  # psql 접속
docker stop ssoo-postgres               # 중지
docker start ssoo-postgres              # 시작
```

---

### 옵션 B: 로컬 설치 PostgreSQL

PostgreSQL이 로컬에 설치된 경우:

```bash
# psql 접속
psql -U postgres

# 데이터베이스 및 사용자 생성
CREATE DATABASE ssoo_dev;
CREATE USER ssoo WITH PASSWORD 'ssoo_dev_pw';
GRANT ALL PRIVILEGES ON DATABASE ssoo_dev TO ssoo;
\q
```

`.env` 파일의 DATABASE_URL을 로컬 설정에 맞게 수정하세요.

---

### 옵션 C: 원격 PostgreSQL 서버

원격 서버(클라우드, 사내 DB 서버 등)를 사용하는 경우:

1. 관리자로부터 접속 정보 확인 (호스트, 포트, 사용자, 비밀번호, DB명)
2. `.env` 파일의 DATABASE_URL 수정:

```env
DATABASE_URL="postgresql://[사용자]:[비밀번호]@[호스트]:[포트]/[DB명]?schema=public"
```

> ⚠️ 원격 서버 사용 시 방화벽/보안그룹에서 접속 IP가 허용되어 있는지 확인하세요.

---

### Prisma 마이그레이션

```bash
# Prisma Client 생성
cd packages/database
pnpm prisma generate

# 데이터베이스 푸시
pnpm prisma db push
```

### 히스토리 트리거 설치

```bash
cd packages/database/prisma/triggers

# Docker 사용 시
docker exec -i ssoo-postgres psql -U ssoo -d ssoo_dev < apply_all_triggers.sql

# 로컬/원격 psql 사용 시
psql -U ssoo -d ssoo_dev -h localhost -f apply_all_triggers.sql
```

### 초기 데이터 Seed

시드 파일 위치: `packages/database/prisma/seeds/`

#### 방법 1: 로컬/원격 psql (권장)

```bash
cd packages/database/prisma/seeds

# psql 클라이언트가 설치된 경우 (마스터 스크립트 사용 가능)
psql -U ssoo -d ssoo_dev -h localhost -f apply_all_seeds.sql
```

#### 방법 2: Docker (개별 파일 실행)

> ⚠️ Docker stdin으로 실행 시 `\i` 명령어가 작동하지 않으므로 개별 파일을 순서대로 실행해야 합니다.

```bash
cd packages/database/prisma/seeds

# 시드 파일 순서대로 실행 (99번은 07번 전에 실행해야 함)
for f in 00_user_code.sql 01_project_status_code.sql 02_project_deliverable_status.sql \
         03_project_close_condition.sql 04_project_handoff_type.sql 05_menu_data.sql \
         06_role_menu_permission.sql 99_user_initial_admin.sql 07_user_menu_permission.sql; do
  echo "Applying $f..."
  cat "$f" | docker exec -i ssoo-postgres psql -U ssoo -d ssoo_dev
done
```

**⚠️ 관리자 비밀번호 규칙:**

비밀번호는 **8자 이상, 대소문자/숫자/특수문자 각 1개 이상** 포함해야 합니다.

`99_user_initial_admin.sql`의 `PLACEHOLDER_HASH`를 실제 bcrypt 해시로 교체해야 합니다:

```bash
# bcrypt 해시 생성 (Admin123@ 기준 - 특수문자 포함 필수)
cd apps/server && node -e "console.log(require('bcryptjs').hashSync('Admin123@', 12))"
```

생성된 해시값을 SQL 파일의 `password_hash` 컴럼에 입력 후 실행하세요.

**기본 관리자 계정:**
- ID: `admin`
- Password: `Admin123@` (해시 설정 후)

---

## 개발 서버 실행

### 방법 1: Turborepo로 전체 실행

```bash
# 루트 디렉토리에서
pnpm dev
```

이 명령어는 다음을 동시에 실행합니다:
- 백엔드 서버 (port 4000)
- 프론트엔드 서버 (port 3000)
- DMS 서버 (port 3001)

### 방법 2: 개별 실행

#### 백엔드 서버

```bash
cd apps/server
pnpm dev
```

서버가 정상 실행되면:
```
🚀 Server is running on http://localhost:4000
```

#### 프론트엔드 서버

```bash
cd apps/web/pms
pnpm dev
```

서버가 정상 실행되면:
```
▲ Next.js 15.5.9
- Local:        http://localhost:3000
```

#### DMS 서버

```bash
cd apps/web/dms
pnpm dev
```

서버가 정상 실행되면:
```
▲ Next.js 15.x
- Local:        http://localhost:3001
```

---

## 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| **프론트엔드** | 3000 | http://localhost:3000 |
| **DMS** | 3001 | http://localhost:3001 |
| **백엔드 API** | 4000 | http://localhost:4000 |
| **PostgreSQL** | 5432 | localhost:5432 |

---

## 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 (전체) |
| `pnpm build` | 프로덕션 빌드 (전체) |
| `pnpm lint` | ESLint 실행 |
| `pnpm clean` | 빌드 산출물 삭제 |
| `pnpm test` | 테스트 실행 |

### 개별 앱 명령어

```bash
# 백엔드만 실행
pnpm --filter server dev

# PMS만 실행
pnpm --filter web-pms dev

# DMS만 실행
pnpm --filter web-dms dev

# 특정 앱 빌드
pnpm --filter server build
```

---

## 코드 품질 보장

이 프로젝트는 일관된 코드 품질을 위해 **자동화된 검증 시스템**을 사용합니다.

### 작업 순서 (필수)

```
┌─────────────────────────────────────────────────────────┐
│  1. 코드 작업      →  기능 구현 / 버그 수정 / 리팩토링   │
├─────────────────────────────────────────────────────────┤
│  2. 문서 업데이트  →  관련 문서 Changelog 추가          │
├─────────────────────────────────────────────────────────┤
│  3. 검증          →  린트, 타입체크, 빌드 확인          │
├─────────────────────────────────────────────────────────┤
│  4. 커밋          →  컨벤션에 맞는 커밋 메시지           │
└─────────────────────────────────────────────────────────┘
```

> ⚠️ **중요**: 코드만 변경하고 문서 업데이트 없이 커밋하는 것은 금지됩니다.

### 자동 검증 체계

```
┌─────────────────────────────────────────────────────────────┐
│  Pre-commit Hook (husky + lint-staged)                      │
│  → 커밋 시점에 린트 + 패턴 검증                               │
├─────────────────────────────────────────────────────────────┤
│  ESLint 규칙                                                 │
│  → any 타입 금지, 와일드카드 export 금지                      │
├─────────────────────────────────────────────────────────────┤
│  Commitlint                                                  │
│  → 커밋 메시지 형식 검증                                      │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions                                              │
│  → PR 생성 시 자동 빌드/린트/타입체크                         │
└─────────────────────────────────────────────────────────────┘
```

### 강제되는 규칙

| 규칙 | 위반 시 |
|------|--------|
| 와일드카드 export (`export * from`) | ❌ 커밋 차단 |
| any 타입 사용 | ❌ ESLint 오류 |
| console.log 잔류 | ⚠️ 경고 |
| 커밋 메시지 형식 | ❌ 커밋 차단 |

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

# 예시
feat(server): 프로젝트 멤버 API 추가
fix(web-pms): 로그인 폼 유효성 검사 수정
docs(common): getting-started 업데이트
```

**Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`  
**Scope**: `server`, `web-pms`, `web-dms`, `database`, `types`, `docs`, `config`

### 수동 검증 명령어

```bash
# 린트 검사
pnpm lint

# 타입 체크
pnpm --filter server exec tsc --noEmit
pnpm --filter web-pms exec tsc --noEmit

# 패턴 검증 (특정 파일)
node .github/scripts/check-patterns.js apps/server/src/modules/pms/project/project.service.ts
```

### AI와 협업 시 가이드

GitHub Copilot 또는 AI 에이전트와 작업할 때:

1. **문서 참조**: `.github/` 폴더의 가이드라인 확인
2. **기존 패턴 따르기**: 유사 기능의 기존 코드 참조
3. **검증 실행**: 커밋 전 `pnpm lint` 실행

👉 **AI 에이전트 가이드**: [.github/README.md](../.github/README.md)  
👉 **개발 표준**: [development-standards.md](./common/explanation/architecture/development-standards.md)

---

## 문제 해결

### 1. 포트 충돌

**증상**: `Error: listen EADDRINUSE: address already in use :::4000`

**해결**:
```bash
# Linux / macOS / WSL
lsof -ti:4000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force

# Windows (CMD)
for /f "tokens=5" %a in ('netstat -ano ^| findstr :4000') do taskkill /PID %a /F
```

### 2. Prisma Client 오류

**증상**: `@prisma/client did not initialize yet`

**해결**:
```bash
# 모든 OS 공통
cd packages/database
pnpm prisma generate
cd ../..          # Linux / macOS / WSL
cd ..\..          # Windows (CMD/PowerShell)
pnpm install
```

### 3. 데이터베이스 연결 실패

**확인사항**:
1. 데이터베이스 서버 실행 중인지 확인
2. `.env`의 `DATABASE_URL` 정확한지 확인
3. 네트워크/방화벽 설정 확인 (원격인 경우)

```bash
# Docker 사용 시
docker ps | grep ssoo-postgres
docker exec ssoo-postgres psql -U ssoo -d ssoo_dev -c "SELECT version();"

# 로컬/원격 psql 사용 시
psql -U ssoo -d ssoo_dev -h localhost -c "SELECT version();"
```

### 4. pnpm install 느림

**해결**:
```bash
# 캐시 정리
pnpm store prune

# 다시 설치
pnpm install
```

### 5. TypeScript 오류

**해결**:
```bash
# 모든 OS 공통 (루트에서 실행)
pnpm clean
pnpm install
pnpm build
```

수동으로 빌드 산출물 삭제가 필요한 경우:
```bash
# Linux / macOS / WSL
rm -rf node_modules .turbo apps/*/dist apps/*/.next packages/*/dist

# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules, .turbo, apps/*/dist, apps/*/.next, packages/*/dist -ErrorAction SilentlyContinue

# Windows (CMD)
rmdir /s /q node_modules .turbo 2>nul
```

### 6. SSL 인증서 오류 (회사 네트워크/프록시 환경)

**증상**: `self-signed certificate in certificate chain` 또는 Prisma 엔진 다운로드 실패

**해결 (명령어별 임시 적용)**:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm prisma generate
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm prisma db push
```

**해결 (영구 적용)** - `~/.bashrc` 또는 `~/.zshrc`에 추가:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

> ⚠️ 이 설정은 보안을 약화시키므로 개발 환경에서만 사용하세요.

### 7. pnpm dev 실행 시 exit code -2 오류 (WSL 환경)

**증상**: `pnpm dev` 또는 `turbo dev` 실행 시 `ELIFECYCLE Command failed with exit code -2`

**원인**: pnpm의 `script-shell` 설정이 현재 OS와 맞지 않음 (Windows 설정이 WSL에 적용된 경우 등)

**해결**: 프로젝트 루트의 `.npmrc` 파일 확인 및 수정

```bash
# .npmrc 내용 확인
cat .npmrc

# WSL/Linux/macOS 환경이면 아래 내용이어야 함
# script-shell=/bin/bash

# Windows 환경이면 아래 중 하나
# script-shell=cmd.exe
# script-shell=powershell
```

**환경별 올바른 설정**:

| 환경 | script-shell 값 |
|------|-----------------|
| WSL | `/bin/bash` |
| Linux | `/bin/bash` |
| macOS | `/bin/bash` 또는 `/bin/zsh` |
| Windows (CMD) | `cmd.exe` |
| Windows (PowerShell) | `powershell` |

> ⚠️ `.npmrc` 파일은 Git에 커밋되므로, 팀원들과 환경이 다르면 로컬에서만 수정하거나  
> `.npmrc.local` 등을 사용하는 방법을 고려하세요.

---

## 관련 문서 / 지원

### 관련 문서

- [README.md](../README.md) - 프로젝트 개요
- [AGENTS.md](./common/AGENTS.md) - 에이전트 학습 가이드
- [tech-stack.md](./common/explanation/architecture/tech-stack.md) - 기술 스택
- [development-standards.md](./common/explanation/architecture/development-standards.md) - 개발 표준

### 지원

문제가 계속되면:
- GitHub Issues: https://github.com/hwista/sooo/issues
- 내부 문의: 개발팀

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-07 | DMS workspace env/runtime (`.env.local`, `dev:web-dms`, port 3001) 안내를 현재 구조 기준으로 추가 |
| 2026-02-05 | **코드 품질 보장** 섹션 추가 (자동 검증 체계, 커밋 규칙, AI 협업 가이드) |
| 2026-02-04 | **WSL 문제 해결**: `.npmrc` script-shell 설정 가이드 추가, exit code -2 해결법 문서화 |
| 2026-02-04 | **ESM 통일**: server, database 패키지 ESM 마이그레이션 (`module: NodeNext`), 비밀번호 규칙 안내 추가 (`Admin123@`) |
| 2026-02-04 | 의존성 설치 순서 조정, SSL 오류 해결 추가, packages/database/.env 안내 |
| 2026-02-04 | OS별 CLI 명령어 구분, 문서 구조 표준화 |
| 2026-02-04 | PostgreSQL 설정 옵션화 (Docker/로컬/원격) |
| 2026-02-04 | Node.js 24 버전 지원, Docker 기반 DB 설정 추가 |
| 2026-02-03 | 초기 문서 작성 |

---

## 다음 단계

개발 환경 설정이 완료되었습니다! 이제:

1. **로그인 테스트**: http://localhost:3000 접속
   - ID: `admin` / PW: `Admin123@`

2. **문서 확인**:
   - [backlog.md](./pms/planning/backlog.md) - 진행 상황
   - [Design System](./pms/explanation/design/design-system.md) - 디자인 표준
   - [UI Components](./pms/explanation/design/ui-components.md) - UI 컴포넌트

3. **개발 시작**:
   - 새 기능 개발 전 BACKLOG 확인
   - 디자인 시스템 따르기
   - 컴포넌트 재사용 우선

---

## Appendix: Backend Snapshot (2026-01-23)

- Module boundaries: common only for cross-domain sharing; pms domain isolated; cross-domain imports are forbidden (code review/lint).
- Env validation: Joi requires DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN.
- Global error policy: GlobalHttpExceptionFilter + ApiError/ApiSuccess envelope; Swagger documents 401/403/404/429/500 for auth/user/menu/project/health.
- Throttling: default 100/min; auth login 5/min; refresh 10/min (Throttler v6).
- Auth policy: password >=8 chars incl. upper/lower/number/special; 5 failed logins -> 30m lock; refresh-token hash stored/invalidated on logout.
- BigInt: DB keeps bigint; API responses stringify; use common/utils/bigint.util.ts; Prisma client typed bigint.
- Seed default: admin/Admin123@ (change for non-dev).

## To keep docs in sync
1) After backend changes, update this snapshot section with new policy values.
2) Run pnpm --filter server lint and Swagger build to ensure docs/examples match code.
3) Record history in changelog; keep this file as current-state snapshot.
