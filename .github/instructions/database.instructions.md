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
  schemas  = ["common", "pms", "dms"]
}
```

| 스키마 | 테이블 접두사 | 용도 |
|--------|--------------|------|
| `common` | `cm_user_*` | 공통 사용자 관리 (전체 공유) |
| `pms` | `cm_*`, `pr_*` | PMS 전용 (코드, 메뉴, 프로젝트) |
| `dms` | `dm_*` | DMS 전용 (문서 관리, 미래 확장) |

---

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
| pms | `cm_` | PMS 내 공통 코드 |
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

새 마스터 테이블 추가 시 **8가지 필수 작업**:

| # | 작업 | 파일/위치 |
|---|------|----------|
| 1 | Prisma 마스터 모델 정의 | `prisma/schema.prisma` |
| 2 | Prisma 히스토리 모델 정의 | `prisma/schema.prisma` (같은 파일) |
| 3 | DB에 스키마 적용 | `pnpm db:push` |
| 4 | 트리거 SQL 작성 | `prisma/triggers/{스키마}/tr_{테이블명}.sql` |
| 5 | apply-triggers.ts에 등록 | `scripts/apply-triggers.ts` |
| 6 | 트리거 설치 실행 | `pnpm db:triggers` |
| 7 | 문서 업데이트 | `docs/common/reference/db/` |
| 8 | README Changelog 추가 | `packages/database/README.md` |

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
# 스키마 적용 (개발)
pnpm --filter @ssoo/database db:push

# 마이그레이션 생성
pnpm --filter @ssoo/database db:migrate

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
5. **직접 SQL 실행** - 반드시 Prisma 통해 관리

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
