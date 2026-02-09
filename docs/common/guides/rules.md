
---

```markdown
# rules.md

# Database Design Rules (ssoo)

## 1) Table Naming Convention

### 1.1 Format
`{module_prefix}_{entity_name}_{table_kind_suffix}`

- PostgreSQL에서 대문자 식별자는 따옴표 이슈가 있으므로 **소문자 snake_case**를 기본으로 사용한다.
- 테이블명만 보고도 **모듈 / 의미 / 테이블 성격**이 드러나도록 한다.

### 1.2 Suffix (table kind)
- `_m` : Master (현재/최신 상태 테이블)
- `_h` : History (스냅샷 누적 히스토리 테이블)
- `_c` : Current/Fact (실적/계획/로그성 대량 테이블 필요 시)
- `_r` : Relation/Mapping (N:M 매핑 테이블 등 관계 테이블)

### 1.3 Module Prefix (initial draft)
- `cm` : common (공통/코드/첨부 등)
- `ac` : account/customer (고객/플랜트 등)
- `sy` : system/asset (시스템 카탈로그/인스턴스 등)
- `pr` : project (프로젝트/후보 등)
- `if` : interface/integration (시스템 간 인터페이스)
- `wf` : workflow (phase/handoff 등)
- `wk` : work (task/issue/risk 등)

---

## 2) Common Columns (for ALL master tables)

> 목적: 데이터 추적성 확보 및 운영/감사(Audit) 기반 마련  
> 원칙: 모든 원본 테이블(`*_m`)에 동일 스키마로 포함하여 CUD 처리 시 공통으로 핸들링한다.

### 2.1 Common column list
- `is_active` : 해당 row 실효 여부(활성/비활성)
- `memo` : 해당 row 메모(설명)
- `created_by` : 생성자(내부 user id 등, 추후 FK 가능)
- `created_at` : 생성일시
- `updated_by` : 수정자
- `updated_at` : 수정일시
- `last_source` : 마지막 변경 발생 출처(UI/API/IMPORT/SYNC/BATCH 등)
- `last_activity` : 마지막 CUD 이벤트(메서드/클래스/엔드포인트 식별자)
- `transaction_id` : 트랜잭션 ID(UUID, 단일/벌크 포함, 서버 로그 연결용)

### 2.2 PK naming
- PK 컬럼명은 테이블마다 의미 있는 명칭을 사용한다.
  - 예: `project_id`, `user_id`, `customer_id` …

---

## 3) History Table Rules (for ALL tables)

> 원칙: 원본 테이블(row)은 최신 상태 1개 유지, 변경 이력은 히스토리 테이블에 **전체 스냅샷**으로 누적한다.  
> 방식: CUD 발생 시마다 “최종 데이터 row 전체”를 히스토리 테이블에 복사하여 저장.

### 3.1 History table structure
- 히스토리 테이블(`*_h`)은 원본 테이블의 **전체 컬럼을 동일 명칭으로 그대로 포함**한다.
- 추가로 아래 3개 컬럼을 포함한다:
  - `history_seq` : 동일 PK 범위 내에서 1부터 증가하는 시퀀스
  - `event_type` : 변경 이벤트 타입 (`C`/`U`/`D`)
  - `event_at` : 이벤트 발생 시각

> 예: 원본 컬럼이 15개면 히스토리 컬럼은 18개(+3)

### 3.2 PK / Constraints
- 히스토리 테이블의 PK는 **복합 PK**:
  - `PRIMARY KEY ({entity_id}, history_seq)`
  - 예: `PRIMARY KEY (project_id, history_seq)`
- 동일 `{entity_id}` 내에서 `history_seq`는 중복 없이 증가해야 한다.

### 3.3 event_type definition
- `C` : Create
- `U` : Update
- `D` : Deactivate/Delete
  - 물리 삭제 대신 `is_active=false` 처리를 기본으로 하며, 이 경우 `D`로 기록한다.

### 3.4 event_at / updated_at rule (recommended)
- `event_at`은 원본 테이블의 해당 변경 시점 `updated_at`과 **동일 값**으로 세팅하는 것을 기본 규칙으로 한다.

---

## 4) History Implementation (Hybrid Approach)

> SSOO는 **하이브리드 방식**으로 히스토리를 관리합니다.
> 이 방식은 DB 트리거와 애플리케이션 미들웨어의 장점을 결합합니다.

### 4.1 Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│ Application Layer (NestJS)                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RequestContextInterceptor                                   │ │
│ │ - transactionId 생성 (UUID)                                 │ │
│ │ - userId 추출 (JWT)                                         │ │
│ │ - AsyncLocalStorage에 컨텍스트 저장                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                           ↓                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Prisma Extension (commonColumnsExtension)                   │ │
│ │ - CREATE: createdBy, createdAt, transactionId 등 자동 세팅  │ │
│ │ - UPDATE: updatedBy, updatedAt, transactionId 등 자동 세팅  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Database Layer (PostgreSQL)                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AFTER INSERT/UPDATE/DELETE Trigger                          │ │
│ │ - history_seq 계산 (동일 PK 내 증가)                        │ │
│ │ - event_type 결정 (C/U/D)                                   │ │
│ │ - 히스토리 테이블에 전체 스냅샷 INSERT                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 책임 분담

| 계층 | 담당 항목 | 이유 |
|------|----------|------|
| **Application** | `transactionId`, `lastSource`, `lastActivity` | 요청 컨텍스트 정보 (DB에서 알 수 없음) |
| **Application** | `createdBy`, `updatedBy` | 인증된 사용자 정보 |
| **Database** | `history_seq` 증가 | 원자적 시퀀스 처리 보장 |
| **Database** | `event_type` (C/U/D) | 정확한 이벤트 타입 판단 |
| **Database** | 히스토리 INSERT | 누락 없는 이력 보장 (bypass 방지) |

### 4.3 장점
1. **누락 방지**: DB 트리거로 모든 변경 포착 (직접 SQL 실행도 포함)
2. **컨텍스트 유지**: 미들웨어로 요청 정보 추적 가능
3. **원자성**: 트리거 내에서 동일 트랜잭션으로 히스토리 기록
4. **유지보수**: 각 계층의 역할이 명확하여 관리 용이

### 4.4 트리거 파일 위치
`packages/database/prisma/triggers/`

### 4.5 Extension 파일 위치
`packages/database/src/extensions/common-columns.extension.ts`

> **Note**: Prisma 6.x부터 `$use()` 미들웨어가 deprecated되어 `$extends()` Extension으로 변경됨

---

## 5) Implementation Notes (non-binding)
- `history_seq` 증가 로직은 트리거에서 원자적으로 처리한다.
- 서버 로그 연계를 위해 `transaction_id`는 원본/히스토리 모두 동일 컬럼명으로 유지한다.
- 새 테이블 추가 시 해당 히스토리 테이블과 트리거도 함께 생성해야 한다.

---

## 6) 새 테이블 작업 세트 (New Table Checklist)

> **원칙**: 새 테이블 모델링 시 아래 항목을 **세트로 완료**해야 작업 종료로 간주한다.
> 하나라도 누락 시 미완료 상태이다.

### 6.1 작업 세트 체크리스트

| # | 항목 | 파일/위치 | 필수 |
|---|------|-----------|------|
| 1 | **마스터 모델 정의** | `schema.prisma` | ✅ |
| 2 | **히스토리 모델 정의** | `schema.prisma` | ✅ |
| 3 | **DB 동기화** | `prisma db push` 실행 | ✅ |
| 4 | **트리거 SQL 작성** | `prisma/triggers/{nn}_{entity}_h_trigger.sql` | ✅ |
| 5 | **apply-triggers.ts 업데이트** | `scripts/apply-triggers.ts` 파일 목록에 추가 | ✅ |
| 6 | **트리거 설치** | `npx ts-node scripts/apply-triggers.ts` 실행 | ✅ |
| 7 | **테이블 정의서 문서화** | `docs/pms/database/tables/{entity}.md` | ✅ |
| 8 | **README 테이블 목록 업데이트** | `docs/pms/database/README.md` 테이블 목록 반영 | ✅ |

### 6.2 작업 순서 (권장)

```
1. Prisma 스키마에 마스터 모델 추가
   ↓
2. Prisma 스키마에 히스토리 모델 추가
   - 마스터의 모든 컬럼 + historySeq, eventType, eventAt
   - 복합 PK: @@id([{pk}, historySeq])
   ↓
3. prisma db push 실행
   ↓
4. 트리거 SQL 파일 생성
   - 기존 템플릿(00_history_trigger_template.sql) 참고
   ↓
5. apply-triggers.ts의 triggerFiles 배열에 추가
   ↓
6. 트리거 설치 스크립트 실행
   ↓
7. 테이블 정의서 작성 (docs/pms/database/tables/)
   ↓
8. README.md 테이블 목록 업데이트
```

### 6.3 주의사항
- 마스터 모델 없이 히스토리 모델만 추가하지 않는다.
- 트리거 없이 히스토리 테이블만 생성하지 않는다 (히스토리 기록 누락 발생).
- 문서화 없이 작업 완료로 간주하지 않는다.

---

## 7) 관련 문서
- [Database Guide](./database-guide.md)
- [History Management Guide](../../pms/guides/history-management.md) - PMS 히스토리 트리거
- [Prisma Schema](../../../packages/database/prisma/schema.prisma)
- [Trigger Template](../../../packages/database/prisma/triggers/00_history_trigger_template.sql)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

