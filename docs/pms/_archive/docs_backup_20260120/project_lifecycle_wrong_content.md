# Table Spec — pr_project_deliverable_r_m / pr_project_deliverable_r_h (Project-Status Deliverables)

## 1. Purpose
프로젝트가 관리해야 할 산출물 목록과 제출 상태, 업로드 파일 식별 정보를 관리한다.  
키는 `(project_id, status_code, deliverable_code)`로 구성하여 프로젝트의 “기회/실행” 상태별 산출물 관리를 지원한다.  
산출물 제출 상태는 3단계(제출 전/제출/확정)로 관리하며, 종료 조건 검증(Validation)에 활용한다.

---

## 2. Tables
- Master(Relation): `pr_project_deliverable_r_m`
- History(Relation): `pr_project_deliverable_r_h`

---

## 3. Master Table — pr_project_deliverable_r_m

### 3.1 Primary Key
- composite PK: `(project_id, status_code, deliverable_code)`

### 3.2 Columns

#### Identity
- `project_id` (bigint, required) — 프로젝트 ID(논리 FK)
- `status_code` (varchar(30), required)
  - values: `opportunity`, `execution`
- `deliverable_code` (varchar(50), required)
  - 논리 FK: `pr_deliverable_m.deliverable_code`

#### Submission Status (3-stage)
- `submission_status_code` (varchar(30), required)
  - code_group: `PROJECT_DELIVERABLE_SUBMISSION_STATUS`
  - values (권장):
    - `before_submit` : 제출 전
    - `submitted` : 제출
    - `confirmed` : 확정(고객 검수/확정 반영)
- `submitted_at` (timestamptz, optional)
- `submitted_by` (bigint, optional) — 내부 사용자 ID(논리 FK)

#### File Reference (storage key based)
- `storage_object_key` (text, optional) — 업로드 파일 식별 키(스토리지 추상화)
- `original_file_name` (text, optional)
- `mime_type` (varchar(100), optional)
- `file_size_bytes` (bigint, optional)

#### Common Columns
- `is_active`, `memo`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_source`, `last_activity`, `transaction_id`

---

## 4. History Table — pr_project_deliverable_r_h
- PK: `(project_id, status_code, deliverable_code, history_seq)`
- `history_seq`, `event_type`, `event_at` 포함
- 스냅샷 규칙: 원본 컬럼 전체 복사

---

## 5. Validation Rules (Logical)
- 산출물 제출 완료 판단 기준(초기): `submission_status_code='confirmed'`
- 종료조건(`pr_project_close_condition_r_m`)이 `requires_deliverable=true`이면,
  해당 프로젝트/상태의 산출물이 “확정(confirmed)” 상태가 충족되어야 종료조건 체크를 허용한다.
  - (MVP 기준) “확정 상태인 산출물이 1개 이상 존재” 또는 “필수 산출물 목록이 모두 확정” 등은 UI/정책으로 선택 가능

---

## 6. Indexing (initial)
- `(project_id, status_code, submission_status_code)`
- `deliverable_code`
- `updated_at`

---
