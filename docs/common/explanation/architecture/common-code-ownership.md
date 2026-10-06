# 공통코드 저장소와 도메인 소유권

> 변경일: 2026-09-30

공통코드의 저장·이력·기본 관리 API는 플랫폼이 소유한다. 코드의 업무 의미와 업무별 관리 기능은 해당 도메인이 소유한다. 공용 저장소를 사용한다는 이유로 도메인 화면을 Admin으로 합치거나, 서로 다른 서비스에 같은 코드의 변경 책임을 분산하지 않는다.

## 현재 구조

| 항목 | 이전 | 변경 |
|---|---|---|
| 마스터·이력 | `pms.cm_code_m`, `pms.cm_code_h` | `common.cm_code_m`, `common.cm_code_h` |
| NestJS 모듈 | `modules/pms/code`, `PmsModule` 등록 | `modules/common/code`, `CommonModule` 등록 |
| API | `/api/codes` | 동일한 URL·요청·응답·권한 유지 |
| 관리 화면 | Admin `/codes`, PMS 기존 코드관리 | 기존 화면과 동작 유지 |
| CRM 조회 | 사업구분·계열·수금조건 코드 | 기존 proxy/hook을 통해 동일한 API 조회 |

`CmCode`, `CmCodeHistory` 모델명과 Prisma 호출 이름은 유지한다. 조회는 기존 인증 계약을, 변경은 기존 `system.override` 관리자 계약을 따른다. 그룹별 소유권은 아래 도메인 책임 기준이며, 이번 이전에서 새 소유자 필드나 그룹별 권한 체계를 추가하지 않는다.

## 업무 의미의 소유권

- `USER_*`, `UNIT`처럼 플랫폼에서 쓰는 일반 코드는 공통 기준정보로 관리한다.
- `PROJECT_*`, `TASK_*`, `ISSUE_*`, `MILESTONE_STATUS`의 업무 의미와 소비·검증 규칙은 PMS가 소유한다.
- `biz_type`, `group_type`, `payment_term`의 CRM 업무 의미와 소비·검증 규칙은 CRM이 소유한다.
- 다른 서비스가 도메인 데이터를 조회할 때 코드를 참조할 수 있다. 참조가 코드의 공동 변경 책임을 뜻하지는 않는다. 도메인별 관리 기능이 필요하면 해당 서비스에 둔다.
- 사업연도는 CRM 전용 `crm.crm_business_year_m`/`crm_business_year_h`와 `/api/crm/business-years`가 담당한다. 일반 코드 저장소의 `biz_year` 재생성 차단은 유지한다.
- DMS·SNS의 공통코드 직접 소비는 이번 조사에서 발견되지 않았다. 이를 이유로 조회 경로나 서비스를 추가하지 않는다.

## 코드 관리·CRM 소비 계약 (2026-10-06)

- `/api/codes/groups`는 비활성 코드만 남은 그룹도 반환하며 `count`는 활성/비활성 전체 건수다. 비활성 코드의 재활성화·삭제 동선을 유형 목록에서 계속 찾을 수 있다.
- Admin 원천 호환 `mode=source-compatible`의 전체 목록은 CRM 세 그룹(`biz_type`, `group_type`, `payment_term`)을 전부 표시한다. 특정 데모 코드값으로 제한하지 않는다. 일반 관리 화면에서는 다른 플랫폼/도메인 유형을 선택할 수 있다.
- 생성·수정의 필수 코드명은 앞뒤 공백을 제거하고 빈 값은 거부한다. 수정/비활성화/영구 삭제의 코드 ID는 양의 PostgreSQL bigint 범위로 검증한다. 조회 인증, 관리자 변경 권한, 비활성 후 영구 삭제, CRM 사업연도 분리는 유지한다.
- 관리 화면은 조회·그룹 조회 오류를 안내하고 재시도한다. 현재 조회 중/실패 상태에서는 변경을 잠그며 저장 중 입력을 보존한다.
- CRM의 공통코드 명시 재조회와 창 focus 재조회는 최신 요청을 우선한다. 늦은 이전 응답/오류와 unmount 뒤 응답은 현재 상태에 반영하지 않는다. 계약 입력은 조회 실패 재시도, 비활성 현재 선택의 값·표시명을 보존한다.
- Admin과 CRM은 별도 앱이다. CRM 반영은 소비 화면 진입/재조회/창 focus 시점이며 다른 앱·다른 사용자의 모든 화면에 실시간 push한다고 해석하지 않는다.

## 데이터 이전과 실행 순서

Launch migration `20260930100000_move_common_codes`는 사업연도 이전 migration 다음에 실행한다. 트랜잭션에서 두 테이블을 잠그고 `ALTER TABLE ... SET SCHEMA common`을 실행한다. 기존 행·감사 필드·삭제된 코드의 이력·테이블/인덱스 식별자·소유 시퀀스 상태를 보존한다. 일반 코드의 중복 제약과 사업연도 재생성 금지 제약도 유지한다.

기존 이력 트리거가 스키마 이동 직후에도 동작하도록 `public.fn_cm_code_h_trigger()`의 식별자는 유지하고 대상 이력 테이블만 `common`으로 바꾼다. 현재 seed와 트리거 설치 스크립트는 `common`을 사용한다. 과거 migration은 기존 checksum을 보존하며 수정하지 않는다.

마이그레이션 이력이 있는 DB는 백업 후 쓰기를 멈추고 migration, Prisma Client 재생성, 서버 배포, runtime verifier 순서로 적용한다. 구버전 서버나 직접 SQL은 `pms.cm_code_*`를 참조하므로 서버와 DB를 함께 전환해야 한다. API 호환은 유지하지만 이전 DB 경로의 호환 view는 만들지 않는다.

2026-09-30 조사한 로컬 `ssoo_dev`는 migration 이력이 없는 pre-baseline DB이며 코드 25개 그룹·137건을 보유했다. 이 DB에 `migrate deploy`나 최신 스키마의 `db push`를 바로 실행하지 않는다. 별도 복제본에서 기존 데이터와 baseline 차이를 확인하고 저장소의 백업·drift 0·명시적 baseline resolve 절차를 따른다. 검증용 임시 DB의 성공은 공용 실행 DB의 적용 완료를 뜻하지 않는다.

## 검증

- `pnpm --filter @ssoo/database db:common-codes:verify`: populated 이전, 대상 충돌 rollback, 전체 이력·ID·인덱스·시퀀스 보존, 이동 직후 C/U/D 이력, 중복·사업연도 제약, 트리거 재설치 검증.
- `pnpm --filter @ssoo/database db:crm-business-years:verify`: 앞선 사업연도 이전 회귀 검증.
- `pnpm --filter @ssoo/database db:baseline:verify`: 빈 DB 전체 migration/seed, 85개 트리거, schema drift 0, populated 복원 검증.
- `pnpm --filter @ssoo/database db:runtime:verify`: `common` 코드 테이블 존재와 이전 `pms` 경로 제거를 포함한 실행 DB 계약 검증.
- 공용 서버 빌드와 실제 `/api/codes` 인증·권한·CRUD, CRM 코드 조회 및 PMS 역할 코드 조회 회귀 검증.

2026-09-30 검증 결과: 서버 빌드, 서버 전체 88개 suite·613개 테스트, 실제 API 51개 검사, populated 이전·충돌 rollback, 앞선 사업연도 이전 회귀, 전체 baseline의 14개 migration·85개 트리거·schema drift 0·복원 검증을 통과했다. Common/PMS DBML·ERD도 새 스키마로 갱신했다. 실행 기록은 `output/playwright/common-code-move/verification.json`과 같은 디렉터리의 로그에 보존한다. 공용 실행 DB는 변경하지 않았다.

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-10-06 | 동적 코드 전체 목록·비활성 유형 복구·입력 검증·조회 실패 복구와 CRM 최신 코드 재조회 계약 명시 |
| 2026-09-30 | 공통코드 저장소·기본 API를 플랫폼으로 이전하고 도메인 의미·관리 기능·타 서비스 참조의 책임을 구분 |
