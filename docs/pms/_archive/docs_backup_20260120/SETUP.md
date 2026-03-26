# 개발 환경 설정 가이드

> SSOO 프로젝트 로컬 개발 환경 구성 방법

**마지막 업데이트**: 2026-01-19

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [저장소 클론](#저장소-클론)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [의존성 설치](#의존성-설치)
6. [개발 서버 실행](#개발-서버-실행)
7. [문제 해결](#문제-해결)

---

## 사전 요구사항

### 필수 설치

| 도구 | 버전 | 확인 명령어 | 설치 방법 |
|------|------|------------|----------|
| **Node.js** | v20.x 이상 | `node --version` | [nodejs.org](https://nodejs.org/) |
| **pnpm** | v8.x 이상 | `pnpm --version` | `npm install -g pnpm` |
| **PostgreSQL** | v14 이상 | `psql --version` | [postgresql.org](https://www.postgresql.org/) |
| **Git** | 최신 버전 | `git --version` | [git-scm.com](https://git-scm.com/) |

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
cp .env.example .env
```

**필수 환경 변수:**

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/ssoo"

# JWT Secret
JWT_ACCESS_SECRET="your-access-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
```

### 2. 웹 애플리케이션 환경 변수

`apps/web-pms/.env.local` 생성:

```env
# API 엔드포인트
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 데이터베이스 설정

### 1. PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE ssoo;

# 사용자 생성 (옵션)
CREATE USER ssoo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ssoo TO ssoo_user;

# 종료
\q
```

### 2. Prisma 마이그레이션

```bash
# Prisma Client 생성
cd packages/database
pnpm prisma generate

# 데이터베이스 푸시
pnpm prisma db push

# 히스토리 트리거 설치
pnpm run apply-triggers
```

### 3. 초기 데이터 Seed

```bash
# 관리자 계정 생성
cd apps/server
pnpm run seed

# 메뉴 데이터 입력 (SQL)
psql -U postgres -d ssoo -f ../../docs/database/tables/seeds/menu_data.sql
psql -U postgres -d ssoo -f ../../docs/database/tables/seeds/role_menu_permission.sql
psql -U postgres -d ssoo -f ../../docs/database/tables/seeds/user_code.sql
psql -U postgres -d ssoo -f ../../docs/database/tables/seeds/user_initial_admin.sql
```

**기본 관리자 계정:**
- ID: `admin`
- Password: `admin123!`

---

## 의존성 설치

### Monorepo 전체 설치

```bash
# 루트 디렉토리에서 실행
pnpm install
```

이 명령어는 모든 workspace의 의존성을 자동으로 설치합니다:
- `apps/web-pms` (Next.js)
- `apps/server` (NestJS)
- `packages/database` (Prisma)
- `packages/types` (TypeScript Types)

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
cd apps/web-pms
pnpm dev
```

서버가 정상 실행되면:
```
▲ Next.js 15.5.9
- Local:        http://localhost:3000
```

---

## 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| **프론트엔드** | 3000 | http://localhost:3000 |
| **백엔드 API** | 4000 | http://localhost:4000 |
| **PostgreSQL** | 5432 | localhost:5432 |

---

## 문제 해결

### 1. 포트 충돌

**증상**: `Error: listen EADDRINUSE: address already in use :::4000`

**해결**:
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

### 2. Prisma Client 오류

**증상**: `@prisma/client did not initialize yet`

**해결**:
```bash
cd packages/database
pnpm prisma generate
cd ../..
pnpm install
```

### 3. 데이터베이스 연결 실패

**확인사항**:
1. PostgreSQL 서비스 실행 중인지 확인
2. `.env`의 `DATABASE_URL` 정확한지 확인
3. 데이터베이스 `ssoo`가 생성되었는지 확인

```bash
# PostgreSQL 실행 확인
psql -U postgres -c "SELECT version();"

# 데이터베이스 존재 확인
psql -U postgres -c "\l" | grep ssoo
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
# 루트에서
pnpm clean
pnpm install
pnpm build
```

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

# 프론트엔드만 실행
pnpm --filter web-pms dev

# 특정 앱 빌드
pnpm --filter server build
```

---

## 다음 단계

개발 환경 설정이 완료되었습니다! 이제:

1. **로그인 테스트**: http://localhost:3000 접속
   - ID: `admin` / PW: `admin123!`

2. **문서 확인**:
   - [backlog.md](../../common/backlog.md) - 진행 상황
   - [UI Design](./docs/pms/ui-design/README.md) - UI 가이드
   - [Design System](./docs/pms/ui-design/design-system.md) - 디자인 표준

3. **개발 시작**:
   - 새 기능 개발 전 BACKLOG 확인
   - 디자인 시스템 따르기
   - 컴포넌트 재사용 우선

---

## 지원

문제가 계속되면:
- GitHub Issues: https://github.com/hwista/sooo/issues
- 내부 문의: 개발팀
