# CRM 사업연도 관리

> 변경일: 2026-09-30

사업연도 관리의 메뉴, API, 데이터 소유권을 CRM으로 옮겼다. 연도 추가, 활성·비활성 전환, 비활성 연도 삭제 기능을 유지한다. 회계 마감, 재개방, 기간별 잠금은 이번 변경에 포함하지 않는다.

## 위치와 권한

| 구분 | 기존 | 변경 |
|---|---|---|
| 메뉴 | Admin 사업연도 관리 | CRM 사업연도 관리 |
| 웹 경로 | Admin `/business-years` | CRM `/business-years` |
| 서버 | PMS 공통코드 API | `modules/crm/business-year`, `/api/crm/business-years` |
| 데이터 | `pms.cm_code_m`, `code_group=biz_year` | `crm.crm_business_year_m` |
| 변경 이력 | `pms.cm_code_h` | `crm.crm_business_year_h` |
| 프런트엔드 | Admin 공통코드 hook | CRM 사업연도 API와 hook |

공유 Prisma 정의는 `packages/database/prisma/schema.prisma`에 두되 모델의 DB schema는 `crm`이다. 공용 타입 역시 `@ssoo/types/crm`에서 제공한다. Admin 공통코드 화면에서 사업연도를 추가하지 않는다.

`crm.business-year.read`는 기본 admin/manager/user/viewer 역할에, `crm.business-year.manage`는 admin 역할에 부여한다. 화면의 조회 전용 처리와 별개로 서버에서 각 요청의 권한을 검사한다.

연도는 2000~2100 정수이며 중복은 허용하지 않는다. 활성 연도는 먼저 비활성화해야 삭제할 수 있다. CRM 계획·실적 화면은 전용 API에서 활성 연도를 읽는다. 기존 화면의 현재 선택 연도 유지와 조회 실패 시 기본 연도 fallback은 유지한다.

## 데이터 이전

Launch migration `20260930090000_move_crm_business_years`는 기존 식별자, 표시명, 정렬, 활성 상태, 생성·수정 정보를 보존한다. 기존 코드 이력과 master 원본의 전체 필드는 이력의 `legacy_snapshot`에 보관한다. 이전 후 공통코드의 `biz_year` 행을 제거하고 재등록을 차단한다. 다른 공통코드는 유지한다.

이전은 트랜잭션으로 실행한다. 변환 불가능한 기존 연도는 작업을 실패시켜 원본을 보존한다. 배포 시 웹·서버·DB migration을 함께 적용해야 한다. 이미 실행 중인 구버전 서비스는 코드 수정만으로 바뀌지 않는다.

## 검증

- `pnpm --filter @ssoo/database db:baseline:verify`: 빈 DB 전체 migration/seed, schema drift, 복원 리허설.
- `pnpm --filter @ssoo/database db:crm-business-years:verify`: 기존 코드 데이터·이력 보존, 잘못된 값 rollback, 다른 코드 유지, 새 이력 C/U/D 검증. 별도 임시 DB를 생성하고 정리한다.
- CRM access/readiness 단위 테스트: 사업연도 권한과 CRM 소유권 확인.
- `pnpm --filter server test --runInBand src/modules/crm/business-year/business-year.service.spec.ts src/modules/crm/access/access.service.spec.ts src/modules/crm/operations/readiness.service.spec.ts`: 사업연도 서비스·권한·준비 상태 36개 회귀 테스트. 연도 경계, 중복, BigInt ID 보존, 활성 연도 삭제 거부와 삭제 대상의 비활성 조건 확인을 포함한다.
- 실제 API와 브라우저 증거: `output/playwright/crm-business-years/` (로컬 검증 산출물).

이번 검증은 사업연도 이동 범위다. 과거 CRM 데모 전체 패리티 보고서를 이번 변경의 전수 검증 결과로 사용하지 않는다.

### 2026-09-30 WSL 중단 후 재개 검증

- 사업연도 서비스 테스트 17개를 추가해 CRM access/readiness와 합계 36개를 통과했다. 활성 행 삭제 거부, 삭제 시 비활성 조건의 원자적 확인, 중복·잘못된 입력·누락 대상 처리와 BigInt 정밀도 보존을 검사한다.
- 사업연도 이전 verifier와 전체 baseline verifier를 다시 통과했다. 13개 migration, 85개 application trigger, schema drift 0, populated restore rehearsal을 확인했다.
- 별도 임시 DB의 실제 API 27개 검사와 원상 복구를 통과했다. 공용 실행 DB와 운영 배포는 변경하지 않았다.
- CRM production build를 완료했고, 병행 세션과 `.next`를 공유하지 않는 `/tmp` 복사본에서도 production build와 브라우저 검증을 완료했다. 공용 작업 트리의 전체 빌드도 11개 대상이 통과한 기록을 보존했다.
- 브라우저에서 추가·중복 안내·활성 전환·새로고침 유지·삭제 취소/확정·기존 목록 복원, 데스크톱 1440×1000·모바일 390×844, 원본 호환 모드, 기존 사업계획 탭의 연도 갱신, 조회 전용 계정의 변경 버튼 비활성화를 확인했다. 격리 production 환경의 최종 CRUD·조회 전용 검사는 console/page/request/HTTP 오류 0건이다.
- Admin은 격리 개발 런타임에서 메뉴 제거와 이전 URL의 HTTP 404를 확인했다. 최초 컴파일 중 발생한 CSS preload warning은 개발 런타임 기록에 남기고 CRM production 검증 결과와 구분한다.
- 재개 산출물: `output/playwright/crm-business-years/resume-20260930/verification.json`, 빌드·API·브라우저 로그와 화면 캡처. 빌드 디렉터리 충돌 및 초기 검증 환경 설정 실패 기록도 보존한다.

### 2026-10-01 기존 로컬 DB 배포 호환성

기존 pre-baseline 권한 테이블은 `updated_at`에 DB 기본값이 없어 이전 중 권한 생성이 실패할 수 있다. 새 사업연도 migration의 권한·역할 연결 INSERT에 `CURRENT_TIMESTAMP`를 명시했다. verifier에도 기본값이 없는 권한 테이블과 admin 역할을 재현하여 두 권한 연결이 생성되는지 검사한다. 실제 로컬 DB의 복제본에서 사용자 11명·공통코드 134개·사업연도 3개 보존과 공통코드 원문 hash 일치를 확인했고, 전체 baseline 14개 migration·85개 트리거·schema drift 0 및 복원 검증을 통과했다. 실제 반영 상태는 로컬 Docker 배포 기록을 따른다.


### 2026-10-02 기능별 재검수

활성 연도 조회가 성공한 뒤에는 0개 결과도 정상 설정으로 취급한다. 이 경우 기본 연도를 다시 추가하지 않고 현재 선택 연도만 보존한다. 최초 로딩/최초 조회 실패에는 기존 fallback을 사용하며, 이후 재조회 실패 시 마지막 정상 목록을 보존한다. 겹친 조회와 unmount에서는 이전 요청을 취소하고 늦은 결과를 적용하지 않는다. 관리 화면은 목록 로딩/오류 중 변경을 막고 기존 재시도 동선으로 복구한다.

API 26검사·관련 서버 47테스트·원천 실행 7검사·실제 브라우저 29검사와 production 빌드/preflight를 통과했다. 열린 내부원가 탭의 연도 변경 반영과 실제 viewer 계정의 조회 전용 상태를 확인했다. 기존 정렬/입력/삭제 정책 차이와 증거 범위는 [기능별 검수 대장](../planning/2026-09-30-menu-functional-audit.md)의 14차를 따른다.
