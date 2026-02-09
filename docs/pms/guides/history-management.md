# History Management Guide

## 개요

SSOO는 **하이브리드 방식**으로 데이터 변경 이력을 관리합니다.
이 문서는 히스토리 관리 아키텍처와 구현 세부사항을 설명합니다.

---

## 1. 아키텍처

### 1.1 하이브리드 방식 선택 이유

| 방식 | 장점 | 단점 |
|------|------|------|
| DB 트리거만 | 누락 없음, 원자성 보장 | 요청 컨텍스트(userId 등) 접근 어려움 |
| API 레이어만 | 컨텍스트 접근 용이 | 직접 SQL 시 누락 가능, 실수 위험 |
| **하이브리드** | 두 방식의 장점 결합 | 초기 구현 복잡도 약간 증가 |

### 1.2 책임 분담

```
┌─────────────────────────────────────────────────────────────────┐
│ NestJS Application                                              │
│                                                                 │
│  1. RequestContextInterceptor (Global)                          │
│     - 요청마다 transactionId(UUID) 생성                         │
│     - JWT에서 userId 추출                                       │
│     - AsyncLocalStorage에 컨텍스트 저장                         │
│                                                                 │
│  2. Prisma Extension (commonColumnsExtension)                │
│     - CREATE 시: createdBy, createdAt, lastSource 등 세팅       │
│     - UPDATE 시: updatedBy, updatedAt, lastSource 등 세팅       │
│     - Prisma 6.x: $use() → $extends() 변경                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                             │
│                                                                 │
│  AFTER Trigger (INSERT/UPDATE/DELETE)                           │
│     - history_seq 계산 (MAX+1)                                  │
│     - event_type 결정 (C/U/D)                                   │
│     - 히스토리 테이블에 전체 row 스냅샷 INSERT                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 구현 상세

### 2.1 Prisma Extension (Prisma 6.x)

**파일 위치**: `packages/database/src/extensions/common-columns.extension.ts`

> **Note**: Prisma 6.x부터 `$use()` 미들웨어가 deprecated되어 `$extends()` Client Extension으로 변경됨

```typescript
// RequestContext 인터페이스
export interface RequestContext {
  userId?: bigint;
  source?: 'API' | 'BATCH' | 'IMPORT' | 'SYNC' | 'SYSTEM';
  transactionId?: string;
}

// AsyncLocalStorage로 요청 스코프 격리
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// 컨텍스트 내에서 코드 실행
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

// Prisma Client Extension - 공통 컬럼 자동 세팅
export const commonColumnsExtension = Prisma.defineExtension({
  name: 'common-columns',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (model.endsWith('History')) return query(args);
        args.data = prepareCreateData(args.data, model);
        return query(args);
      },
      async update({ model, args, query }) {
        if (model.endsWith('History')) return query(args);
        args.data = prepareUpdateData(args.data, model);
        return query(args);
      },
      // ... upsert, updateMany 등
    },
  },
});
```

### 2.2 NestJS 인터셉터

**파일 위치**: `apps/server/src/common/interceptors/request-context.interceptor.ts`

```typescript
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT에서 추출된 사용자 정보
    
    const ctx: RequestContext = {
      userId: user?.userId || user?.sub,
      source: 'API',
      transactionId: randomUUID(),
      activity: `${request.method} ${request.path}`,
    };
    
    return new Observable((subscriber) => {
      runWithContext(ctx, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
```

### 2.3 DB 트리거

**파일 위치**: `packages/database/prisma/triggers/`

#### 트리거 함수 템플릿
```sql
CREATE OR REPLACE FUNCTION fn_{entity}_history()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq INTEGER;
  v_event_type CHAR(1);
  v_record RECORD;
BEGIN
  -- event_type 결정
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'C';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'U';
    v_record := NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'D';
    v_record := OLD;
  END IF;
  
  -- history_seq 계산 (동일 PK 내에서 MAX+1)
  SELECT COALESCE(MAX(history_seq), 0) + 1
  INTO v_history_seq
  FROM {history_table}
  WHERE {pk_column} = v_record.{pk_column};
  
  -- 히스토리 테이블에 INSERT
  INSERT INTO {history_table} (
    {pk_column},
    history_seq,
    event_type,
    event_at,
    -- 나머지 모든 컬럼...
  ) VALUES (
    v_record.{pk_column},
    v_history_seq,
    v_event_type,
    NOW(),
    -- 나머지 모든 값...
  );
  
  RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trg_{entity}_h
  AFTER INSERT OR UPDATE OR DELETE ON {master_table}
  FOR EACH ROW EXECUTE FUNCTION fn_{entity}_history();
```

---

## 3. 설치된 트리거 목록

| 마스터 테이블 | 히스토리 테이블 | 트리거 함수 | 트리거명 |
|---------------|-----------------|-------------|----------|
| `cm_code_m` | `cm_code_h` | `fn_cm_code_history()` | `trg_cm_code_h` |
| `cm_user_m` | `cm_user_h` | `fn_cm_user_history()` | `trg_cm_user_h` |
| `pr_project_m` | `pr_project_h` | `fn_pr_project_history()` | `trg_pr_project_h` |
| `pr_project_status_m` | `pr_project_status_h` | `fn_pr_project_status_history()` | `trg_pr_project_status_h` |
| `pr_deliverable_m` | `pr_deliverable_h` | `fn_pr_deliverable_history()` | `trg_pr_deliverable_h` |
| `pr_deliverable_group_m` | `pr_deliverable_group_h` | `fn_pr_deliverable_group_history()` | `trg_pr_deliverable_group_h` |
| `pr_deliverable_group_item_r_m` | `pr_deliverable_group_item_r_h` | `fn_pr_deliverable_group_item_r_history()` | `trg_pr_deliverable_group_item_r_h` |
| `pr_close_condition_group_m` | `pr_close_condition_group_h` | `fn_pr_close_condition_group_history()` | `trg_pr_close_condition_group_h` |
| `pr_close_condition_group_item_r_m` | `pr_close_condition_group_item_r_h` | `fn_pr_close_condition_group_item_r_history()` | `trg_pr_close_condition_group_item_r_h` |
| `pr_project_deliverable_r_m` | `pr_project_deliverable_r_h` | `fn_pr_project_deliverable_r_history()` | `trg_pr_project_deliverable_r_h` |
| `pr_project_close_condition_r_m` | `pr_project_close_condition_r_h` | `fn_pr_project_close_condition_r_history()` | `trg_pr_project_close_condition_r_h` |

---

## 4. 트리거 관리

### 4.1 트리거 설치/재설치

```powershell
cd packages/database
npx ts-node scripts/apply-triggers.ts
```

### 4.2 트리거 상태 확인 (SQL)

```sql
-- 설치된 트리거 목록 조회
SELECT 
  tgname AS trigger_name,
  c.relname AS table_name,
  CASE tgenabled 
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE tgenabled::text
  END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE tgname LIKE 'trg_%_h'
ORDER BY c.relname;
```

### 4.3 트리거 비활성화 (필요 시)

```sql
-- 특정 트리거 비활성화
ALTER TABLE pr_project_m DISABLE TRIGGER trg_pr_project_h;

-- 특정 트리거 활성화
ALTER TABLE pr_project_m ENABLE TRIGGER trg_pr_project_h;
```

### 4.4 트리거 삭제 (필요 시)

```sql
-- 트리거 삭제
DROP TRIGGER IF EXISTS trg_pr_project_h ON pr_project_m;

-- 트리거 함수 삭제
DROP FUNCTION IF EXISTS fn_pr_project_history();
```

---

## 5. 새 테이블 추가 시 체크리스트

> **원칙**: 새 테이블 = 마스터 + 히스토리 + 트리거 + 문서화 **세트**
> 하나라도 누락 시 미완료 상태이다.

| # | 항목 | 파일/위치 | 필수 |
|---|------|-----------|------|
| 1 | 마스터 모델 정의 | `schema.prisma` | ✅ |
| 2 | 히스토리 모델 정의 | `schema.prisma` | ✅ |
| 3 | DB 동기화 | `prisma db push` | ✅ |
| 4 | 트리거 SQL 작성 | `prisma/triggers/{nn}_{entity}_h_trigger.sql` | ✅ |
| 5 | apply-triggers.ts 업데이트 | 파일 목록에 추가 | ✅ |
| 6 | 트리거 설치 | `npx ts-node scripts/apply-triggers.ts` | ✅ |
| 7 | 테이블 정의서 문서화 | `docs/pms/database/tables/{entity}.md` | ✅ |
| 8 | README 테이블 목록 업데이트 | `docs/pms/database/README.md` | ✅ |

### 상세 단계

1. **Prisma 스키마에 마스터 모델 추가**
   - `packages/database/prisma/schema.prisma`
   - 공통 컬럼 포함 (isActive, createdBy, updatedBy, transactionId 등)

2. **Prisma 스키마에 히스토리 모델 추가**
   - 마스터 모델의 모든 컬럼 + historySeq, eventType, eventAt
   - 복합 PK 설정: `@@id([{entity_id}, historySeq])`

3. **Prisma db push 실행**
   ```powershell
   cd packages/database
   npx prisma db push
   ```

4. **트리거 SQL 파일 생성**
   - `packages/database/prisma/triggers/{nn}_{entity}_h_trigger.sql`
   - 기존 템플릿(00_history_trigger_template.sql) 참고하여 컬럼 목록 작성

5. **apply-triggers.ts에 파일 추가**
   - `triggerFiles` 배열에 새 파일명 추가

6. **트리거 설치 실행**
   ```powershell
   npx ts-node scripts/apply-triggers.ts
   ```

7. **테이블 정의서 작성**
   - `docs/pms/database/tables/{entity}.md`
   - 컬럼, 인덱스, 관계, 비즈니스 규칙 등 문서화

8. **README 테이블 목록 업데이트**
   - `docs/pms/database/README.md`의 테이블 목록에 새 테이블 추가

---

## 6. 참고 자료

- [Database Design Rules](../../common/guides/rules.md) - 새 테이블 작업 세트 체크리스트 포함 (공용)
- [Database Guide](../../common/guides/database-guide.md) - DB 구조 가이드 (공용)
- [Prisma Schema](../../../packages/database/prisma/schema.prisma)
- [Trigger Template](../../../packages/database/prisma/triggers/00_history_trigger_template.sql)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

