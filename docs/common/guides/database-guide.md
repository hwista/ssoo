# 데이터베이스 가이드

> 최종 업데이트: 2026-02-02

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
| 스키마 관리 | Multi-Schema (common, pms, dms) |

---

## 2. PostgreSQL 스키마 구조

### 스키마 분리 (Multi-Schema)

| 스키마 | 접두사 | 설명 | 테이블 수 |
|--------|--------|------|-----------|
| `common` | `cm_` | 공통 사용자 (모든 시스템 공유) | 2개 |
| `pms` | `cm_`, `pr_` | PMS 전용 (코드, 메뉴, 프로젝트) | 27개 |
| `dms` | `dm_` | 문서 관리 시스템 (미래 확장) | 0개 |

### Prisma multiSchema 설정

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["common", "pms", "dms"]
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

### Step 3: Prisma로 테이블 생성

```powershell
cd packages/database
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
node ./node_modules/prisma/build/index.js db push
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
# SSL 우회 (개발 환경)
$env:NODE_TLS_REJECT_UNAUTHORIZED=0

# 테이블 동기화
cd packages/database
node ./node_modules/prisma/build/index.js db push

# Client 생성
node ./node_modules/prisma/build/index.js generate

# 마이그레이션
node ./node_modules/prisma/build/index.js migrate dev --name <migration_name>
```

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
| 2026-01-25 | ERD 링크 추가, 테이블 상세 문서 삭제 (ERD로 대체) |
| 2026-01-24 | Multi-Schema 분리 완료 (common/pms) |
| 2026-01-21 | 즐겨찾기 soft delete 적용 |
| 2026-01-20 | 최초 작성 |
