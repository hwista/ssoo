# Phase 1.2: packages/database 분석

> 분석일: 2026-01-20  
> 상태: 완료

---

## 📋 분석 대상

| 파일/폴더 | 역할 | 분석 상태 |
|-----------|------|:--------:|
| `package.json` | 패키지 정의 | ✅ |
| `tsconfig.json` | TS 설정 | ✅ |
| `prisma/schema.prisma` | DB 스키마 | ✅ |
| `prisma/seeds/` | 초기 데이터 | ✅ |
| `prisma/triggers/` | DB 트리거 | ✅ |
| `src/index.ts` | 엔트리 포인트 | ✅ |
| `src/extensions/` | Prisma 확장 | ✅ |
| `scripts/` | 유틸리티 스크립트 | ✅ |
| `README.md` | 문서 | ✅ |

---

## 1. package.json 분석

### 현재 내용

```json
{
  "name": "@ssoo/database",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "clean": "rimraf dist",
    "dev": "tsc --watch",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.16.0",
    "dotenv": "^17.2.3",
    "pg": "^8.17.1",
    "prisma": "^6.2.0",
    "rimraf": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| name | ✅ | `@ssoo/database` 명명 규칙 적절 |
| exports | ✅ | ESM/CJS 모두 지원 |
| scripts | ✅ | DB 관련 스크립트 완비 |
| dependencies | ✅ | @prisma/client만 런타임 의존성 |
| devDependencies | ✅ | prisma, pg 등 적절 |

### 개선 제안
- 없음. 현재 상태 적절

### 위험도: 🟢 없음

---

## 2. prisma/schema.prisma 분석

### 스키마 구조 (1078줄)

| 모델 | 테이블명 | 역할 | 히스토리 |
|------|----------|------|:--------:|
| **공통 (cm_)** |
| CmCode | cm_code_m | 공통 코드 | ✅ CmCodeHistory |
| Menu | cm_menu_m | 메뉴 정의 | ✅ MenuHistory |
| RoleMenu | cm_role_menu_r | 역할별 메뉴 권한 | ✅ RoleMenuHistory |
| UserMenu | cm_user_menu_r | 사용자별 메뉴 예외 | ✅ UserMenuHistory |
| UserFavorite | cm_user_favorite_r | 즐겨찾기 | ❌ |
| User | cm_user_m | 사용자 | ✅ (트리거) |
| **프로젝트 (pr_)** |
| Project | pr_project_m | 프로젝트 | ✅ (트리거) |
| ProjectStatus | pr_project_status_m | 프로젝트 상태 | ✅ (트리거) |
| Deliverable | pr_deliverable_m | 산출물 마스터 | ✅ (트리거) |
| DeliverableGroup | pr_deliverable_group_m | 산출물 그룹 | ✅ (트리거) |
| DeliverableGroupItem | pr_deliverable_group_item_r_m | 그룹-산출물 매핑 | ✅ (트리거) |
| CloseConditionGroup | pr_close_condition_group_m | 종료조건 그룹 | ✅ (트리거) |
| CloseConditionGroupItem | pr_close_condition_group_item_r_m | 그룹-조건 매핑 | ✅ (트리거) |
| ProjectDeliverable | pr_project_deliverable_r_m | 프로젝트 산출물 | ✅ (트리거) |
| ProjectCloseCondition | pr_project_close_condition_r_m | 프로젝트 종료조건 | ✅ (트리거) |

### 공통 컬럼 패턴

모든 주요 모델에 일관된 공통 컬럼 적용:

```prisma
// Common columns
isActive        Boolean  @default(true) @map("is_active")
memo            String?
createdBy       BigInt?  @map("created_by")
createdAt       DateTime @default(now()) @map("created_at")
updatedBy       BigInt?  @map("updated_by")
updatedAt       DateTime @updatedAt @map("updated_at")
lastSource      String?  @map("last_source")
lastActivity    String?  @map("last_activity")
transactionId   String?  @map("transaction_id") @db.Uuid
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 네이밍 규칙 | ✅ | cm_, pr_ prefix + _m/_r/_h suffix 일관성 |
| 공통 컬럼 | ✅ | 모든 모델에 일관되게 적용 |
| 히스토리 패턴 | ✅ | 하이브리드 (트리거 + Extension) |
| 인덱스 전략 | ✅ | 필요한 인덱스 적절히 정의 |
| 관계 정의 | ✅ | Cascade/SetNull 적절 |

### 위험도: 🟢 없음

---

## 3. src/index.ts 분석

### 현재 내용

```typescript
import { PrismaClient } from '@prisma/client';
import { commonColumnsExtension } from './extensions/common-columns.extension';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  return client.$extends(commonColumnsExtension);
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Extension exports
export {
  commonColumnsExtension,
  softDeleteExtension,
  activeFilterExtension,
} from './extensions/common-columns.extension';

export {
  RequestContext,
  requestContextStorage,
  getRequestContext,
  runWithContext,
} from './extensions/common-columns.extension';

export * from '@prisma/client';
export default prisma;
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 싱글톤 패턴 | ✅ | globalForPrisma로 핫 리로드 대응 |
| Extension 통합 | ✅ | commonColumnsExtension 적용 |
| Export 구조 | ✅ | Prisma Client + Extension 모두 export |
| 로깅 설정 | ✅ | 환경별 분기 |

### 개선 제안
- 없음. 현재 구조 우수

### 위험도: 🟢 없음

---

## 4. src/extensions/common-columns.extension.ts 분석

### 핵심 기능

```typescript
// 요청 컨텍스트 (AsyncLocalStorage 사용)
export interface RequestContext {
  userId?: bigint;
  source?: 'API' | 'BATCH' | 'IMPORT' | 'SYNC' | 'SYSTEM';
  transactionId?: string;
}

// 공통 컬럼 자동 세팅
- createdBy, createdAt (create 시)
- updatedBy, updatedAt (update 시)  
- lastSource, lastActivity
- transactionId (요청별 UUID)
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| AsyncLocalStorage | ✅ | Node.js 16+ 표준 방식 |
| 자동 컬럼 세팅 | ✅ | create/update 분리 |
| transactionId | ✅ | 요청 추적 가능 |
| Prisma 6.x 호환 | ✅ | $extends 사용 |

### 위험도: 🟢 없음

---

## 5. prisma/seeds/ 분석

### 시드 파일 목록

| 순서 | 파일 | 역할 |
|:----:|------|------|
| 00 | 00_user_code.sql | 사용자 관련 코드 |
| 01 | 01_project_status_code.sql | 프로젝트 상태 코드 |
| 02 | 02_project_deliverable_status.sql | 산출물 상태 코드 |
| 03 | 03_project_close_condition.sql | 종료조건 코드 |
| 04 | 04_project_handoff_type.sql | 핸드오프 타입 |
| 05 | 05_menu_data.sql | 메뉴 데이터 |
| 06 | 06_role_menu_permission.sql | 역할별 권한 |
| 07 | 07_user_menu_permission.sql | 사용자별 권한 |
| 99 | 99_user_initial_admin.sql | 초기 관리자 |
| - | apply_all_seeds.sql | 전체 실행 스크립트 |

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 순서 네이밍 | ✅ | 00~99 prefix로 실행 순서 명확 |
| 분리 전략 | ✅ | 역할별로 파일 분리 |
| apply_all | ✅ | 일괄 실행 스크립트 |

### 위험도: 🟢 없음

---

## 6. prisma/triggers/ 분석

### 트리거 파일 목록

| 순서 | 파일 | 대상 테이블 |
|:----:|------|------------|
| 00 | 00_history_trigger_template.sql | 템플릿 |
| 01 | 01_cm_code_h_trigger.sql | cm_code_m → cm_code_h |
| 02 | 02_cm_user_h_trigger.sql | cm_user_m → cm_user_h |
| 03 | 03_pr_project_h_trigger.sql | pr_project_m → pr_project_h |
| ... | ... | ... |
| 14 | 14_cm_user_menu_h_trigger.sql | cm_user_menu_r → cm_user_menu_h |
| - | apply_all_triggers.sql | 전체 실행 |

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 템플릿 패턴 | ✅ | 00번에 템플릿 제공 |
| 순서 네이밍 | ✅ | 일관된 prefix |
| 커버리지 | ✅ | 주요 테이블 모두 커버 |

### 위험도: 🟢 없음

---

## 7. scripts/ 분석

### 스크립트 목록

| 파일 | 역할 |
|------|------|
| run-sql.ts | SQL 파일/쿼리 실행 |
| apply-triggers.ts | 트리거 일괄 적용 |
| seed-admin.ts | 관리자 계정 시딩 |
| check-user.js | 사용자 확인 (JS) |

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 역할 분리 | ✅ | 목적별로 스크립트 분리 |
| run-sql.ts | ✅ | 범용 SQL 실행 도구 |

### 개선 제안

| 항목 | 현재 | 제안 | 위험도 |
|------|------|------|:------:|
| check-user.js | JS | TS로 통일 | 🟢 낮음 |

---

## 8. 전체 구조 다이어그램

```
packages/database/
├── package.json           ✅ 패키지 정의
├── tsconfig.json          ✅ TS 설정 (base 상속)
├── README.md              ✅ 문서화
│
├── prisma/
│   ├── schema.prisma      ✅ 1078줄, 잘 구조화됨
│   ├── seeds/             ✅ 9개 시드 파일
│   │   ├── 00~07_*.sql
│   │   ├── 99_*.sql
│   │   └── apply_all_seeds.sql
│   └── triggers/          ✅ 15개 트리거 파일
│       ├── 00~14_*.sql
│       └── apply_all_triggers.sql
│
├── scripts/               ✅ 유틸리티 스크립트
│   ├── run-sql.ts
│   ├── apply-triggers.ts
│   ├── seed-admin.ts
│   └── check-user.js      ⚠️ JS → TS 권장
│
└── src/
    ├── index.ts           ✅ 엔트리 포인트
    └── extensions/
        └── common-columns.extension.ts  ✅ Prisma Extension
```

---

## 📊 분석 요약

### 현재 상태 평가

| 영역 | 점수 | 비고 |
|------|:----:|------|
| 패키지 구조 | 10/10 | 표준적 |
| Prisma 스키마 | 10/10 | 우수한 설계 |
| 네이밍 규칙 | 10/10 | 일관성 |
| 히스토리 관리 | 10/10 | 하이브리드 방식 |
| 시드/트리거 관리 | 10/10 | 체계적 |
| 문서화 | 9/10 | README 존재 |
| **종합** | **9.8/10** | 우수 |

### 발견된 이슈

| # | 우선순위 | 내용 | 영향도 |
|---|:--------:|------|:------:|
| 1 | 매우 낮음 | check-user.js가 JS로 작성됨 | 일관성 |

### 권장 조치

1. **즉시 조치 불필요** - 현재 구조 매우 우수
2. check-user.js → check-user.ts 전환은 선택적

---

## ✅ 분석 완료 체크

- [x] package.json
- [x] tsconfig.json
- [x] prisma/schema.prisma
- [x] prisma/seeds/
- [x] prisma/triggers/
- [x] src/index.ts
- [x] src/extensions/
- [x] scripts/
- [x] README.md

---

## 📎 다음 단계

→ [Phase 1.3: packages/types 분석](packages-types.md)
