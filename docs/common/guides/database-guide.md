# 데이터베이스 가이드

> 최종 업데이트: 2026-07-20

SSOO 데이터베이스 구조 및 사용 가이드입니다.

---

## 📚 데이터베이스 레퍼런스

> **상세 테이블 구조는 자동 생성된 문서를 참조하세요:**

| 문서 | 설명 |
|------|------|
| **[Common ERD](../reference/db/erd.svg)** | common 스키마 ER 다이어그램 (`cm_` 접두사 테이블) |
| **[PMS ERD](../../pms/reference/db/erd.svg)** | pms 스키마 ER 다이어그램 (`pr_` 접두사 테이블) |
| **[DMS ERD](../../dms/reference/db/erd.svg)** | dms 스키마 ER 다이어그램 (`dm_` 접두사 테이블) |
| **[Prisma Schema](../../../packages/database/prisma/schema.prisma)** | 원본 스키마 정의 |

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| Service Name | `SSOT` (임시 플랫폼 표기; repository slug는 `ssoo`) |
| DBMS | PostgreSQL 15+ |
| ORM | Prisma 6.x |
| 스키마 관리 | Multi-Schema (common, crm, pms, dms, sns) |

### Launch migration 기준선

- 새 DB와 `_prisma_migrations`에 launch baseline 기록이 있는 DB의 정식 경로는 `packages/database/prisma.launch.config.ts`와 `packages/database/prisma/launch-migrations/`입니다.
- `pnpm db:migrate:deploy`는 pending launch migration을 적용하고 `pnpm db:migrate:status`는 적용 상태를 확인합니다.
- `pnpm db:baseline:verify`는 일회용 DB를 만들고 launch migration 전체를 적용한 뒤 master seed 35개, database-native CHECK/부분 인덱스/CRM 계약 trigger, source trigger 78개, Prisma schema parity를 검증하고 DB를 제거합니다.
- `pnpm db:runtime:verify -- --phase=schema`는 seed/trigger 쓰기 전에 실제 대상 DB의 launch migration/native/schema 계약을 읽기 전용으로 확인합니다. 기본 `pnpm db:runtime:verify`는 설치된 전체 79개 trigger까지 확인합니다.
- 기존 pre-baseline DB는 자동으로 baseline 처리하지 않습니다. 백업 후 schema drift가 0임을 확인한 경우에만 `DATABASE_URL=... DB_BASELINE_RESOLVE_CONFIRM=0_launch_baseline pnpm db:baseline:resolve`를 실행합니다. drift가 있으면 명령은 쓰기 전에 실패합니다.
- `packages/database/prisma/migrations/`의 기존 SQL은 pre-baseline volume 호환과 protected patch 검증을 위해 보존합니다. 신규 배포 이력의 정본은 `prisma/launch-migrations/`입니다.
- 운영 compose는 `DB_INIT_BASELINE_MODE=strict`를 고정해 application table은 있지만 launch 이력이 없는 DB를 seed/trigger 적용 전에 거부합니다. 로컬 기본 `compat` 경로는 기존 volume의 비파괴 복구 동선을 보존하지만 release-ready 증거로 사용하지 않습니다.

---

## 2. PostgreSQL 스키마 구조

### 스키마 분리 (Multi-Schema)

| 스키마 | 접두사 | 설명 |
|--------|--------|------|
| `common` | `cm_` | 공통 사용자, 인증, AI/RAG projection |
| `crm` | `crm_` | 영업·계약·원가 계획 |
| `pms` | `cm_`, `pr_` | 코드, 메뉴, 프로젝트 실행 |
| `dms` | `dm_` | 문서, 설정, 대화 세션 |
| `sns` | `sns_` | 게시물·댓글·반응 |

### Prisma multiSchema 설정

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["common", "crm", "pms", "dms", "sns"]
}
```

> **Note**: Prisma 6.x부터 `multiSchema`가 stable 기능으로 `previewFeatures` 불필요

---

## 3. 연결 정보

### 개발 환경 (Local)

| 항목 | 값 |
|------|-----|
| Host | `localhost` |
| Port | `5432` |
| Database | `appdb` |
| User | `appuser` |
| Password | `app_pw` |
| Schemas | `common`, `pms`, `dms` |

### Connection String

```
postgresql://appuser:app_pw@localhost:5432/appdb
```

---

## 4. 새 환경 셋업

### Step 1: PostgreSQL DB/User 생성

```sql
-- 사용자 생성
CREATE USER appuser WITH PASSWORD 'app_pw';
ALTER ROLE appuser CREATEDB;

-- DB 생성
CREATE DATABASE appdb 
  WITH OWNER = appuser
       ENCODING = 'UTF8';

GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
```

### Step 2: 스키마 권한 부여

```sql
-- 스키마 생성 및 권한
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS pms;
CREATE SCHEMA IF NOT EXISTS dms;

GRANT ALL ON SCHEMA common TO appuser;
GRANT ALL ON SCHEMA pms TO appuser;
GRANT ALL ON SCHEMA dms TO appuser;

-- search_path 설정
ALTER DATABASE appdb SET search_path TO common, pms, dms, public;
```

### Step 3: Launch migration으로 테이블 생성

```powershell
cd packages/database
$env:NODE_EXTRA_CA_CERTS='C:\secure\company-root-ca.pem'
pnpm config set cafile 'C:\secure\company-root-ca.pem'
pnpm db:migrate:deploy
pnpm db:migrate:status
```

### Step 4: 히스토리 트리거 설치

```powershell
cd packages/database
npx ts-node scripts/apply-triggers.ts
```

### Step 5: Seed 데이터 삽입

```powershell
# DBeaver에서 seeds/*.sql 실행 또는
cd packages/database
npx ts-node scripts/run-sql.ts --file ../../docs/pms/database/tables/seeds/menu_data.sql
```

---

## 5. Prisma 명령어

### .env 파일 위치

- 루트: `/.env`
- 패키지: `/packages/database/.env`

### 주요 명령어

```powershell
# 사내 TLS 프록시 사용 시 승인된 root CA 신뢰 설정
$env:NODE_EXTRA_CA_CERTS='C:\secure\company-root-ca.pem'
pnpm config set cafile 'C:\secure\company-root-ca.pem'

# 새 DB/launch-managed DB migration 적용 및 상태 확인
pnpm db:migrate:deploy
pnpm db:migrate:status

# 빈 일회용 DB에서 launch baseline 재현성 검증
pnpm db:baseline:verify

# Client 생성
pnpm db:generate

# 폐기 가능한 로컬 DB에서만 사용하는 스키마 실험(배포 이력 대체 금지)
pnpm db:push:unsafe-local

# 실제 대상 DB의 release-ready 계약 확인
pnpm db:runtime:verify
```

`db:push`와 `db:push:unsafe-local`은 기존 로컬 개발 동작을 유지하되 localhost/compose host와 dev/test/local/scratch/tmp/candidate 이름의 DB만 허용합니다. `NODE_ENV=production` 또는 `DB_INIT_BASELINE_MODE=strict`, 원격 호스트, 운영 DB 이름에서는 URL/credential을 출력하지 않고 실패합니다.

---

## 6. 히스토리 관리

SSOO는 **하이브리드 히스토리 관리**를 사용합니다:

- **DB 트리거**: INSERT/UPDATE/DELETE 시 자동 히스토리 기록
- **Prisma Extension**: 공통 컬럼 자동 세팅

### 트리거 동작

| 이벤트 | event_type | 설명 |
|--------|------------|------|
| INSERT | `C` | 생성 스냅샷 |
| UPDATE | `U` | 변경 스냅샷 |
| DELETE | `D` | 삭제 전 스냅샷 |

### 관련 파일

| 위치 | 설명 |
|------|------|
| `packages/database/prisma/triggers/` | 트리거 SQL 파일들 |
| `packages/database/src/extensions/` | Prisma Extension |
| `apps/server/src/common/interceptors/` | Request Context 인터셉터 |

상세 내용: [히스토리 관리 가이드](./history-management.md)

---

## 7. Seed 데이터

Seed 파일 위치: `packages/database/prisma/seeds/`

배포 `db-init`은 전체 개발 seed를 재실행하지 않습니다. `DB_INIT_SEED_MODE`를 다음과 같이 구분합니다.

| 모드 | 허용 대상 | 실행 내용 |
|---|---|---|
| `upgrade` (기본) | 기존 DB. 운영은 launch-managed DB만 | migration → schema 검사 → trigger → full 검사. seed 실행 없음 |
| `bootstrap` | application table이 하나도 없는 신규 DB | migration 후 `apply_reference_seeds.sql`의 20개 기준정보 파일. 계정·데모 업무 행 생성 없음 |
| `demo` | 비어 있는 local/compose host의 dev/test/local/scratch/tmp/candidate DB, compat 모드 | 기존 `apply_all_seeds.sql` 개발 fixture. strict/production에서는 거부 |

운영 Compose와 CI의 release/rehearsal runtime은 `upgrade`를 고정합니다. 빈 DB의 첫 준비는 배포 전에 별도로 수행합니다. 이미 준비된 DB에 `bootstrap`/`demo`를 지정하면 migration 이전에 거부합니다. 실패한 첫 준비를 `upgrade`로 바꾸어 계속 진행하지 말고, 원인 검토 후 빈 DB 또는 검증된 백업에서 다시 시작합니다.

```bash
# 대상 PostgreSQL이 실행 중이고 빈 DB임을 확인한 뒤, 검토한 db-init 이미지로 실행
docker compose --env-file .env.production -f compose.yaml -f compose.production.yaml \
  run --rm --no-deps -e DB_INIT_SEED_MODE=bootstrap db-init
```

`bootstrap`은 메뉴·역할/권한·공통코드·기본 앱 설정·SNS 게시판/스킬·PMS 템플릿을 준비합니다. 기본 공급자 표시는 실제 법인/CI 확인을 대신하지 않습니다. **최초 관리자·플랫폼 가입/서비스 승인·실제 공급자/템플릿 준비는 별도 계정/온보딩·앱 소유 절차가 필요합니다.** 기본 암호를 가진 관리자를 배포에서 만들지 않습니다. readiness 검사는 그대로 유지합니다.

기존 DB에 필요한 신규 코드/권한/backfill은 사용자 수정값 보존 조건을 포함한 버전별 launch migration으로 추가합니다. seed 파일을 수정하는 것만으로 기존 DB에 반영되지 않습니다. `.codex/scripts/db-seed.sh`/`db:setup`과 직접 psql seed 실행은 기존 개발 도구이며 운영 배포에 사용하지 않습니다.

검증: `node automation/tests/ci/db-init-docker.test.mjs --run --image <검토한-db-init-image> [--dump <managed-dump>]`. 전용 Docker network/volume에서 실행하고 자체 자원만 정리합니다. DB 보존 검증이며 전체 앱 출시 준비 판정은 아닙니다.

| 파일명 | 설명 |
|--------|------|
| `user_code.sql` | 사용자 관련 코드 |
| `user_initial_admin.sql` | 초기 관리자 계정 |
| `project_status_code.sql` | 프로젝트 상태 코드 |
| `menu_data.sql` | 초기 메뉴 구조 |
| `role_menu_permission.sql` | 역할별 메뉴 권한 |

---

## 8. 설계 규칙

| 규칙 | 설명 |
|------|------|
| 테이블 네이밍 | `{prefix}_{entity}_{type}` (예: `pr_project_m`) |
| 접미사 `_m` | 마스터 테이블 |
| 접미사 `_h` | 히스토리 테이블 |
| 접미사 `_r` | 관계 테이블 |
| PK | `{entity}_id` (bigserial) |
| 공통 컬럼 | `transaction_id`, `created_by`, `updated_at` 등 |

상세 내용: [데이터베이스 설계 규칙](./rules.md)

---

## 관련 문서

- [히스토리 관리 가이드](../../pms/guides/history-management.md) - PMS 트리거 가이드
- [데이터베이스 설계 규칙](./rules.md)
- [Prisma Schema](../../../packages/database/prisma/schema.prisma)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-22 | 운영 strict baseline mode와 실제 DB release-ready 검증 명령, local-only db push 경계 추가 |
| 2026-01-25 | ERD 링크 추가, 테이블 상세 문서 삭제 (ERD로 대체) |
| 2026-01-24 | Multi-Schema 분리 완료 (common/pms) |
| 2026-01-21 | 즐겨찾기 soft delete 적용 |
| 2026-01-20 | 최초 작성 |
