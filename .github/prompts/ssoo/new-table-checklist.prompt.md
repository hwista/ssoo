# 새 테이블 추가 체크리스트

새 마스터 테이블 추가 요청 시 이 체크리스트를 따르세요.

---

## 필수 8단계

다음 8가지 작업을 **모두** 완료해야 새 테이블 추가가 완료됩니다:

### 1. Prisma 마스터 모델 정의
- 파일: `packages/database/prisma/schema.prisma`
- 네이밍: `{스키마접두사}_{도메인}_m` (예: `pr_project_m`)
- 필수 필드: PK, 비즈니스 필드, **감사 필드 4개**

```prisma
model PrProjectM {
  projectId     BigInt    @id @default(autoincrement()) @map("project_id")
  projectName   String    @map("project_name") @db.VarChar(100)
  
  // 감사 필드 (필수)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  createdById   BigInt?   @map("created_by_id")
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  updatedById   BigInt?   @map("updated_by_id")
  
  @@map("pr_project_m")
  @@schema("pms")
}
```

### 2. Prisma 히스토리 모델 정의
- 같은 파일에 히스토리 모델 추가
- 네이밍: `{원본모델}H` (예: `PrProjectMH`)
- 테이블명: `{원본테이블}_h` (예: `pr_project_m_h`)

```prisma
model PrProjectMH {
  historyId     BigInt    @id @default(autoincrement()) @map("history_id")
  projectId     BigInt    @map("project_id")  // 원본 PK (unique 아님!)
  
  // 원본 필드들 전부 복사...
  
  // 히스토리 전용 필드
  eventType     String    @map("event_type") @db.Char(1)  // C/U/D
  historyAt     DateTime  @default(now()) @map("history_at") @db.Timestamptz(6)
  historyById   BigInt?   @map("history_by_id")
  
  @@map("pr_project_m_h")
  @@schema("pms")
}
```

### 3. DB 스키마 적용
```bash
pnpm --filter @ssoo/database db:push
```

### 4. 트리거 SQL 작성
- 파일: `packages/database/prisma/triggers/{번호}_{테이블명}_h_trigger.sql`
- 번호는 순차적으로 할당 (기존 파일 확인 후 다음 번호 사용)

```sql
CREATE OR REPLACE FUNCTION pms.tr_pr_project_m_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pms.pr_project_m_h (...)
  VALUES (..., TG_OP, NOW(), ...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pr_project_m_history
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_m
  FOR EACH ROW EXECUTE FUNCTION pms.tr_pr_project_m_history();
```

### 5. apply-triggers.ts에 등록
- 파일: `packages/database/scripts/apply-triggers.ts`
- 새 트리거 파일 경로 추가

### 6. 트리거 설치 실행
```bash
pnpm --filter @ssoo/database db:triggers
```

### 7. 문서 업데이트
- `docs/common/reference/db/` 에 ERD 또는 테이블 명세 업데이트
- 또는 `pnpm --filter @ssoo/database docs:db` 실행

### 8. README Changelog 추가
- `packages/database/README.md` Changelog 섹션에 기록

---

## event_type 값 정의

| 값 | 의미 | 트리거 |
|---|------|--------|
| `C` | Create | INSERT |
| `U` | Update | UPDATE |
| `D` | Delete | DELETE |

---

## 체크리스트 확인

작업 완료 전 확인:
- [ ] 마스터 모델 생성됨
- [ ] 히스토리 모델 생성됨
- [ ] 감사 필드 4개 포함 (createdAt, createdById, updatedAt, updatedById)
- [ ] db:push 성공
- [ ] 트리거 SQL 작성됨
- [ ] 트리거 설치됨
- [ ] 문서 업데이트됨
- [ ] Changelog 추가됨
