# @ssoo/database

> SSOO 서비스의 데이터베이스 스키마 및 Prisma 클라이언트 패키지

---

## 📋 개요

`@ssoo/database`는 **Prisma ORM**을 사용하여 데이터베이스 스키마를 정의하고, 타입 안전한 DB 클라이언트를 제공하는 패키지입니다.

### 왜 이렇게 만들어졌나?

```
Prisma를 별도 패키지로 분리한 이유:

1. 스키마 중앙화
   └── DB 스키마 변경이 한 곳에서만 이루어짐

2. 클라이언트 공유
   └── 여러 서비스에서 동일한 Prisma 클라이언트 사용 가능

3. 마이그레이션 관리
   └── DB 버전 관리가 독립적으로 가능
```

---

## 📁 구조

```
packages/database/
├── prisma/
│   ├── schema.prisma    # 데이터베이스 스키마 정의
│   ├── seeds/           # 초기 데이터 SQL
│   └── triggers/        # 히스토리 트리거 SQL
├── scripts/
│   ├── apply-triggers.ts  # 트리거 적용
│   ├── check-data.ts      # 데이터 검증
│   ├── export-dbml.js     # DBML 내보내기
│   ├── render-dbml.js     # DBML 렌더링
│   ├── run-sql.ts         # SQL 실행
│   └── split-dbml.js      # DBML 분리
├── src/
│   └── index.ts         # Prisma 클라이언트 export
├── dist/                # 빌드 결과물
├── package.json
└── tsconfig.json
```

---

## 🗄️ PostgreSQL 멀티스키마 구조

### 스키마 분리 원칙

| 스키마 | 접두사 | 설명 | 테이블 수 |
|--------|--------|------|-----------|
| `common` | `cm_user_*` | 공통 사용자 (모든 시스템 공유) | 2개 |
| `pms` | `cm_*`, `pr_*` | PMS 전용 (코드, 메뉴, 프로젝트) | 27개 |
| `dms` | `dm_*` | 문서 관리 시스템 (미래 확장) | 0개 |

### Prisma 설정

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

> **Note**: Prisma 6.x부터 `multiSchema`가 stable 기능으로 전환되어 `previewFeatures` 설정이 필요 없습니다.

---

## 📊 주요 모델

### common 스키마 (사용자 관련)

| 모델 | 테이블명 | 설명 |
|------|----------|------|
| `User` | `cm_user_m` | 사용자 마스터 |
| `UserHistory` | `cm_user_h` | 사용자 변경 이력 |

```prisma
model User {
  id              BigInt   @id @default(autoincrement()) @map("user_id")
  isSystemUser    Boolean  @default(false) @map("is_system_user")
  loginId         String?  @unique @map("login_id")
  userName        String   @map("user_name")
  email           String   @unique
  roleCode        String   @default("viewer") @map("role_code")
  userTypeCode    String   @default("internal") @map("user_type_code")
  userStatusCode  String   @default("registered") @map("user_status_code")
  // ... 생략
  @@map("cm_user_m")
  @@schema("common")
}
```

### pms 스키마 (PMS 전용)

#### 공통 코드/메뉴
| 모델 | 테이블명 | 설명 |
|------|----------|------|
| `CmCode` | `cm_code_m` | 공통 코드 마스터 |
| `Menu` | `cm_menu_m` | 메뉴 마스터 |
| `RoleMenu` | `cm_role_menu_r` | 역할별 메뉴 권한 |
| `UserMenu` | `cm_user_menu_r` | 사용자별 메뉴 권한 |

#### 프로젝트 관련
| 모델 | 테이블명 | 설명 |
|------|----------|------|
| `Project` | `pr_project_m` | 프로젝트 마스터 |
| `ProjectStatus` | `pr_project_status_m` | 프로젝트 상태별 상세 |
| `Deliverable` | `pr_deliverable_m` | 산출물 마스터 |
| `DeliverableGroup` | `pr_deliverable_group_m` | 산출물 그룹 |
| `CloseConditionGroup` | `pr_close_condition_group_m` | 종료조건 그룹 |

```prisma
model Project {
  id              BigInt   @id @default(autoincrement()) @map("project_id")
  projectName     String   @map("project_name")
  statusCode      String   @map("status_code")  // request, proposal, execution, transition
  stageCode       String   @map("stage_code")   // waiting, in_progress, done
  // ... 생략
  @@map("pr_project_m")
  @@schema("pms")
}
```

---

## 🔧 Prisma 클라이언트

### 싱글톤 패턴

```typescript
// src/index.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
```

---

## 📦 사용 방법

### Server에서 사용

```typescript
// apps/server/src/modules/pms/project/project.service.ts
import { prisma } from '@ssoo/database';

async findAll() {
  return prisma.project.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
}
```

---

## 🛠 개발 명령어

```powershell
# Prisma 클라이언트 생성
pnpm db:generate

# DB 스키마 적용 (개발용 - 마이그레이션 없이)
pnpm db:push

# 마이그레이션 생성 및 적용
pnpm db:migrate

# Prisma Studio (DB GUI)
pnpm db:studio

# TypeScript 빌드
pnpm build
```

### 보안 환경 (SSL 이슈 시)

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
node ./node_modules/prisma/build/index.js generate
node ./node_modules/prisma/build/index.js db push
```

---

## 🌱 Seed 데이터

초기 데이터는 `prisma/seeds/` 폴더에서 관리됩니다.

### 파일 구조

| 파일 | 스키마 | 설명 |
|------|--------|------|
| `00_user_code.sql` | pms | 사용자 유형/상태 코드 |
| `01_project_status_code.sql` | pms | 프로젝트 상태 코드 |
| `02_project_deliverable_status.sql` | pms | 산출물 제출 상태 |
| `03_project_close_condition.sql` | pms | 종료조건 코드 |
| `04_project_handoff_type.sql` | pms | 핸드오프 유형 |
| `05_menu_data.sql` | pms | 메뉴 마스터 데이터 |
| `06_role_menu_permission.sql` | pms | 역할별 메뉴 권한 |
| `07_user_menu_permission.sql` | pms | 사용자별 메뉴 권한 |
| `99_user_initial_admin.sql` | **common** | 초기 관리자 계정 |
| `apply_all_seeds.sql` | - | 전체 실행 스크립트 |

### 실행 방법

```powershell
# 전체 실행
psql -U appuser -d appdb -f prisma/seeds/apply_all_seeds.sql

# 개별 실행
psql -U appuser -d appdb -f prisma/seeds/00_user_code.sql
```

---

## ⚡ 히스토리 트리거

모든 마스터 테이블은 트리거를 통해 변경 이력이 자동 기록됩니다.

### 트리거 파일 구조

| 파일 | 스키마 | 설명 |
|------|--------|------|
| `01_cm_code_h_trigger.sql` | pms | 공통 코드 이력 |
| `02_cm_user_h_trigger.sql` | **common** | 사용자 이력 |
| `03~11_pr_*.sql` | pms | 프로젝트 관련 이력 |
| `12~14_cm_menu_*.sql` | pms | 메뉴/권한 이력 |
| `apply_all_triggers.sql` | - | 전체 설치 스크립트 |

### 실행 방법

```powershell
psql -U appuser -d appdb -f prisma/triggers/apply_all_triggers.sql
```

---

## 🔗 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@prisma/client` | ^6.x | Prisma ORM 클라이언트 |
| `prisma` | ^6.x | Prisma CLI (개발용) |
| `typescript` | ^5.x | TypeScript 컴파일러 |

---

## 📌 스키마 변경 가이드

1. `prisma/schema.prisma` 수정
2. `@@schema("common")` 또는 `@@schema("pms")` 지시어 확인
3. Prisma 클라이언트 재생성: `pnpm db:generate`
4. DB에 적용: `pnpm db:push` (개발) 또는 `pnpm db:migrate` (운영)
5. 필요시 트리거/시드 파일에 스키마 prefix 반영
6. 필요시 `@ssoo/types`에 해당 타입 추가
