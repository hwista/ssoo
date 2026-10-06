---
applyTo: "packages/database/**"
---

# Database 패키지 개발 규칙

> 이 규칙은 `packages/database/` 경로의 파일 작업 시 적용됩니다.

---

## 패키지 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `@ssoo/database` |
| 용도 | Prisma ORM 및 DB 스키마 관리 |
| DBMS | PostgreSQL 15+ |
| ORM | Prisma 6.x |

---

## 멀티스키마 구조

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["common", "crm", "pms", "dms", "sns"]
}
```

| 스키마 | 테이블 접두사 | 용도 |
|--------|--------------|------|
| `common` | `cm_*` | 공통코드·사용자·인증·권한 (전체 공유) |
| `crm` | `crm_*` | CRM 영업·계약·원가 계획 |
| `pms` | `cm_*`, `pr_*` | PMS 전용 (메뉴, 프로젝트) |
| `dms` | `dm_*` | DMS 전용 (문서, 설정, 대화 세션) |
| `sns` | `sns_*` | SNS 게시물·댓글·반응 |

---

## 공통코드 소유권

- 공통코드 저장·이력은 `common.cm_code_m`/`common.cm_code_h`, 기본 API는 `modules/common/code`가 소유한다.
- 도메인별 코드 의미·검증·특화 관리 기능은 해당 서비스가 소유한다. 다른 서비스의 조회·참조가 공동 변경 책임을 뜻하지 않는다.
- 기존 서비스 화면·API 계약을 유지하고 도메인 기능을 공용 화면으로 임의 흡수하지 않는다. 사업연도는 CRM 전용 저장소/API를 유지한다.
- 스키마 이동은 기존 ID·이력·시퀀스를 보존하는 launch migration과 populated 이전 검증으로 수행한다.

## 테이블 네이밍 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| 마스터 | `{스키마접두사}_{도메인}_m` | `cm_user_m`, `pr_project_m` |
| 상세 | `{스키마접두사}_{도메인}_d` | `pr_task_d` |
| 히스토리 | `{원본테이블}_h` | `pr_project_m_h` |
| 관계 | `{테이블1}_{테이블2}_r` | `cm_user_role_r` |

### 스키마별 접두사

| 스키마 | 접두사 | 설명 |
|--------|--------|------|
| common | `cm_` | Common 도메인 |
| pms | `pr_` | Project 도메인 |
| pms | `cm_` | PMS 메뉴·메뉴 권한 |
| dms | `dm_` | Document 도메인 |

---

## 컬럼 네이밍 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| PK | `{테이블명}_id` | `user_id`, `project_id` |
| FK | `{참조테이블}_id` | `created_by_id` → `cm_user_m.user_id` |
| 코드 참조 | `{의미}_cd` | `status_cd`, `priority_cd` |
| 일반 컬럼 | snake_case | `created_at`, `is_active` |

---

## BigInt 처리 규칙

### DB 레벨
- **PK/FK는 BigInt 유지** - Prisma 스키마에서 `BigInt` 타입 사용

### API 레벨
- **요청**: DTO에서 string으로 받아 BigInt로 변환
- **응답**: BigInt를 string으로 직렬화 후 반환

```typescript
// ✅ Controller에서 변환
@Get(':id')
async findOne(@Param('id') id: string) {
  const bigIntId = BigInt(id);
  return this.service.findOne(bigIntId);
}

// ✅ 응답 시 직렬화
return {
  ...entity,
  id: entity.id.toString(),
};
```

### 공통 유틸리티
- `apps/server/src/common/utils/bigint.util.ts` 참조

---

## Prisma 모델 작성 규칙

```prisma
// ✅ 표준 모델 구조
model CmUserM {
  // PK
  userId        BigInt    @id @default(autoincrement()) @map("user_id")
  
  // 비즈니스 필드
  loginId       String    @unique @map("login_id") @db.VarChar(50)
  userName      String    @map("user_name") @db.VarChar(100)
  
  // 상태 필드
  isActive      Boolean   @default(true) @map("is_active")
  
  // 감사 필드 (모든 테이블 필수)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  createdById   BigInt?   @map("created_by_id")
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  updatedById   BigInt?   @map("updated_by_id")
  
  // 관계
  createdBy     CmUserM?  @relation("CreatedUsers", fields: [createdById], references: [userId])
  
  // 테이블 매핑
  @@map("cm_user_m")
  @@schema("common")
}
```

### 필수 감사 필드

모든 마스터/상세 테이블에 포함:

| 필드 | 타입 | 설명 |
|------|------|------|
| `createdAt` | DateTime | 생성 시각 (auto) |
| `createdById` | BigInt? | 생성자 ID |
| `updatedAt` | DateTime | 수정 시각 (auto) |
| `updatedById` | BigInt? | 수정자 ID |

---

## 새 테이블 추가 체크리스트

새 마스터 테이블 추가 시 **9가지 필수 작업**:

| # | 작업 | 파일/위치 |
|---|------|----------|
| 1 | Prisma 마스터 모델 정의 | `prisma/schema.prisma` |
| 2 | Prisma 히스토리 모델 정의 | `prisma/schema.prisma` (같은 파일) |
| 3 | Launch migration 반영 | `prisma/launch-migrations/` |
| 4 | 빈 DB 기준선 검증 | `pnpm db:baseline:verify` |
| 5 | 트리거 SQL 작성 | `prisma/triggers/{스키마}/tr_{테이블명}.sql` |
| 6 | apply-triggers.ts에 등록 | `scripts/apply-triggers.ts` |
| 7 | 트리거 설치 실행 | `pnpm db:triggers` |
| 8 | 문서 업데이트 | `docs/common/reference/db/` |
| 9 | README Changelog 추가 | `packages/database/README.md` |

---

## 히스토리 테이블 패턴

### event_type 값

| 값 | 의미 | 발생 시점 |
|---|------|----------|
| `C` | Create | INSERT 트리거 |
| `U` | Update | UPDATE 트리거 |
| `D` | Delete | DELETE 트리거 |

```prisma
// 원본 테이블의 모든 필드 복사 + 히스토리 전용 필드
model PrProjectMH {
  historyId     BigInt    @id @default(autoincrement()) @map("history_id")
  projectId     BigInt    @map("project_id")  // 원본 PK (더 이상 @id 아님)
  
  // 원본 필드들...
  
  // 히스토리 전용 필드
  eventType     String    @map("event_type") @db.Char(1)  // C/U/D
  historyAt     DateTime  @default(now()) @map("history_at") @db.Timestamptz(6)
  historyById   BigInt?   @map("history_by_id")
  
  @@map("pr_project_m_h")
  @@schema("pms")
}
```

---

## 트리거 작성 규칙

```sql
-- ✅ 표준 히스토리 트리거
CREATE OR REPLACE FUNCTION pms.tr_pr_project_m_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pms.pr_project_m_h (
    project_id, project_name, /* 기타 필드 */
    history_action, history_at, history_by_id
  ) VALUES (
    COALESCE(NEW.project_id, OLD.project_id),
    COALESCE(NEW.project_name, OLD.project_name),
    TG_OP,
    NOW(),
    COALESCE(NEW.updated_by_id, OLD.updated_by_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pr_project_m_history
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_m
  FOR EACH ROW EXECUTE FUNCTION pms.tr_pr_project_m_history();
```

---

## 디렉토리 구조

```
packages/database/
├── prisma/
│   ├── schema.prisma       # 메인 스키마 (단일 파일)
│   ├── seeds/              # 초기 데이터 SQL
│   │   ├── common/         # common 스키마 시드
│   │   └── pms/            # pms 스키마 시드
│   └── triggers/           # 히스토리 트리거 SQL
│       ├── common/
│       └── pms/
├── scripts/
│   ├── apply-triggers.ts   # 트리거 적용 스크립트
│   ├── split-dbml.js       # DBML 분리
│   ├── export-dbml.js      # DBML 내보내기
│   └── render-dbml.js      # ERD 렌더링
└── src/
    └── index.ts            # PrismaClient re-export
```

---

## Export 규칙

```typescript
// src/index.ts - 단순 re-export만
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
```

---

## 주요 명령어

```bash
# 폐기 가능한 로컬 DB 스키마 실험
pnpm --filter @ssoo/database db:push:unsafe-local

# 새 DB/launch-managed DB 마이그레이션 적용·상태 확인
pnpm --filter @ssoo/database db:migrate:deploy
pnpm --filter @ssoo/database db:migrate:status

# launch-managed 개발 DB에서 다음 migration 생성
pnpm --filter @ssoo/database db:migrate -- --name <migration_name>

# 빈 일회용 DB에서 launch baseline 재현성 검증
pnpm --filter @ssoo/database db:baseline:verify

# 실제 DB의 release-ready launch 계약 검증
pnpm --filter @ssoo/database db:runtime:verify

# DB 계약 단위 테스트
pnpm --filter @ssoo/database db:contract:test

# Prisma Client 재생성
pnpm --filter @ssoo/database db:generate

# ERD 생성
pnpm --filter @ssoo/database docs:db
```

---

## 금지 사항

1. **스키마 경계 무시** - common 테이블을 pms 스키마에 만들기 등
2. **네이밍 규칙 무시** - 접두사 없이 테이블 생성
3. **감사 필드 누락** - createdAt, updatedAt 등 필수
4. **BigInt → Number 변환** - 정밀도 손실 위험
5. **이력 밖 직접 SQL 실행** - Prisma로 표현할 수 없는 제약·인덱스는 검토된 launch migration SQL과 검증 스크립트로 관리

## Launch migration 규칙

- 신규 배포 이력 정본은 `prisma.launch.config.ts`와 `prisma/launch-migrations/`입니다.
- `prisma/migrations/`의 기존 SQL은 pre-baseline volume 호환과 protected patch 검증을 위해 보존합니다.
- 기존 DB baseline resolve는 자동화하지 않습니다. 백업 후 schema drift가 0인 경우에만 `DB_BASELINE_RESOLVE_CONFIRM=0_launch_baseline`을 명시합니다.
- 신규 launch migration 변경은 `pnpm db:baseline:verify`로 빈 DB deploy/status, master seed, schema parity, database-native 계약, source/migration-managed trigger 설치를 검증합니다.
- 운영 `db-init`은 `DB_INIT_BASELINE_MODE=strict`를 사용해 application table은 있지만 launch migration 이력이 없는 DB를 쓰기 전에 거부합니다.
- 배포·리허설은 `DB_INIT_SEED_MODE=upgrade`로 기존 DB의 seed를 재실행하지 않습니다. 빈 DB만 명시적인 `bootstrap` 기준정보 또는 local/disposable `demo` 초기화를 허용하며, 필수 기준정보 변경은 versioned migration으로 관리합니다. 계정/온보딩 준비는 별도 소유 절차입니다.
- `db:runtime:verify -- --phase=schema`는 seed/trigger 쓰기 전에 launch migration 이름/완료 상태/checksum, native constraint/index, pending migration, Prisma schema drift 0을 확인합니다. 기본 full phase는 source 및 migration-managed trigger까지 확인합니다.
- 기존 `db:push` alias는 pre-baseline 호환을 위해 유지합니다. 신규 스키마 실험은 폐기 가능한 로컬 DB에서만 `db:push:unsafe-local`을 명시하고 launch migration으로 승격합니다. 두 명령 모두 local/compose host와 dev/test/local/scratch/tmp/candidate DB 이름만 허용하며 production 또는 strict baseline mode는 거부합니다.

---

## 관련 문서

**가이드**:
- [데이터베이스 가이드](../../docs/common/guides/database-guide.md) - 환경 설정, Prisma 명령어, Seed 데이터
- [BigInt 처리 가이드](../../docs/common/guides/bigint-guide.md) - BigInt 직렬화 상세
- [히스토리 관리 가이드](../../docs/common/guides/history-management.md) - 트리거 동작 상세

**아키텍처**:
- [Database 패키지 스펙](../../docs/common/architecture/database-package-spec.md) - 패키지 구조, API

**레퍼런스 (자동 생성)**:
- [Common ERD](../../docs/common/reference/db/erd.svg)
- [PMS ERD](../../docs/pms/reference/db/erd.svg)
