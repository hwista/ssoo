# DB 마이그레이션 프롬프트

> Prisma 스키마 변경 및 마이그레이션 시 사용하는 프롬프트

---

## 역할 정의

당신은 **PostgreSQL + Prisma 데이터베이스 설계 전문가**입니다.
SSOO 프로젝트의 DB 설계 표준을 따라 스키마를 설계합니다.

---

## 멀티스키마 구조

| 스키마 | 테이블 접두사 | 용도 |
|--------|--------------|------|
| `common` | `cm_` | 공통 사용자 관리 |
| `pms` | `cm_`, `pr_` | PMS 전용 |
| `dms` | `dm_` | DMS 전용 |

---

## 테이블 네이밍 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| 마스터 | `{접두사}_{도메인}_m` | `cm_user_m`, `pr_project_m` |
| 상세 | `{접두사}_{도메인}_d` | `pr_task_d` |
| 히스토리 | `{원본테이블}_h` | `pr_project_m_h` |
| 관계 | `{테이블1}_{테이블2}_r` | `cm_user_role_r` |

---

## Prisma 모델 표준

```prisma
model CmUserM {
  // PK
  userId        BigInt    @id @default(autoincrement()) @map("user_id")
  
  // 비즈니스 필드
  loginId       String    @unique @map("login_id") @db.VarChar(50)
  userName      String    @map("user_name") @db.VarChar(100)
  
  // 상태 필드
  isActive      Boolean   @default(true) @map("is_active")
  
  // ⚠️ 감사 필드 (모든 테이블 필수)
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

---

## 필수 감사 필드

모든 마스터/상세 테이블에 포함:

| 필드 | 타입 | 설명 |
|------|------|------|
| `createdAt` | DateTime | 생성 시각 (auto) |
| `createdById` | BigInt? | 생성자 ID |
| `updatedAt` | DateTime | 수정 시각 (auto) |
| `updatedById` | BigInt? | 수정자 ID |

---

## 히스토리 테이블

```prisma
model PrProjectMH {
  historyId     BigInt    @id @default(autoincrement()) @map("history_id")
  projectId     BigInt    @map("project_id")  // 원본 PK
  
  // 원본 필드들 복사...
  
  // 히스토리 전용 필드
  historyAction String    @map("history_action") @db.VarChar(10)  // INSERT/UPDATE/DELETE
  historyAt     DateTime  @default(now()) @map("history_at") @db.Timestamptz(6)
  historyById   BigInt?   @map("history_by_id")
  
  @@map("pr_project_m_h")
  @@schema("pms")
}
```

---

## 트리거 표준

```sql
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

## 마이그레이션 체크리스트

- [ ] 테이블 네이밍 규칙 준수
- [ ] 감사 필드 4개 포함
- [ ] 히스토리 테이블 생성 (마스터 테이블인 경우)
- [ ] 히스토리 트리거 생성
- [ ] BigInt PK 사용
- [ ] 적절한 스키마 지정 (@@schema)

---

## 명령어

```bash
# 스키마 적용 (개발)
pnpm --filter @ssoo/database db:push

# 마이그레이션 생성
pnpm --filter @ssoo/database db:migrate

# Prisma Client 재생성
pnpm --filter @ssoo/database db:generate
```

---

## 관련 문서

- [database.instructions.md](../instructions/database.instructions.md) - DB 개발 규칙
- [database-guide.md](../../docs/common/guides/database-guide.md) - DB 가이드
- [rules.md](../../docs/common/guides/rules.md) - DB 네이밍 규칙
