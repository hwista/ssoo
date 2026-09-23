# SSOO 제품 로드맵

> 최종 업데이트: 2026-07-15
>
> 2026-07-15 runtime quality gate에서 Prisma `Decimal` 공수 값이 공용 BigInt serializer를 거치며 내부 `{s,e,d}` 구조로 노출되던 결함을 수정했다. 일일 공수 API는 숫자 `actualHours`와 문자열 식별자 계약을 유지한다.

2026-09-17 최신: 승인-13 네 옵션 **4/4** 구현·검증 완료. 프로젝트 사용 설정의 새 진입과 계정별 저장·실제 업무 반영을 연결했다. `/settings` 직접 접속은 개인 설정, `/project-settings`는 프로젝트 사용 설정이다. [최종 핸드오프](../../common/explanation/architecture/2026-09-17-project-settings-handoff.md) 기준 **20완료·2잔여·운영 증거 0/5**.

단계별 구축 전략 (Progressive Delivery)

---

## MVP-0: "일을 모으는 마스터 허브"

> 보고/템플릿/자동화보다 먼저 아래 목록을 한 곳에 모아 검색/필터/연결 조회가 가능하도록 한다.

### 마스터 오브젝트 (최초 범위)

| # | 오브젝트 | 설명 |
|---|----------|------|
| 1 | Customer | 고객사 읽기용 조회. 원장 편집은 CRM/Admin/공용 조직 책임 |
| 2 | Plant/Site | 플랜트/사이트 |
| 3 | System Catalog | 시스템 종류/계층 |
| 4 | System Instance | 고객/플랜트별 시스템 인스턴스 + 운영 주체 구분 |
| 5 | Integration | 시스템 간 인터페이스 |
| 6 | Project | PMS 실행 프로젝트 엔티티. `request/proposal` 상태는 CRM 기회 원장이 아니라 내부 접수/인계 호환 단계로 제한 |
| 7 | User | 사람 (내부 직원 + 외부 이해관계자, 시스템 사용 여부로 구분) |

> MVP-0에서는 "단계/핸드오프/종료조건/산출물/태스크"를 강하게 도입하지 않는다.  
> 우선 **"어디에 어떤 일이 있고 누가 들고 있는지"**를 보이게 한다.

---

## MVP-1: 상태/단계 + 전환/종료 이벤트 적용

- `status_code(request/proposal/execution/transition)` + `stage_code(waiting/in_progress/done)` 적용
- 요청/제안 완료 시 `done_result(accepted/rejected/won/lost/hold)`로 결과 구분하되, CRM 영업 기회 원장과 동일시하지 않는다.
- 계약 체결은 CRM 정본에서 확정되며, PMS는 실행 인계 또는 읽기용 계약 스냅샷을 받아 execution으로 전환한다.
- 종료 시점에 운영 전환 여부 선택 (운영 전환이면 SM 지정)

---

## MVP-2: 핸드오프(Handoff) 트랙/로그 적용

- CRM 확정/인계 → PM (실행 인계)
- CRM 계약 스냅샷 → PMS 실행 참고 정보
- 실행 → SM (운영 전환)
- 필요 시 인계 패킷/체크리스트로 확장

---

## MVP-3: 산출물/종료조건 (프로젝트 관리 실체화)

- 산출물 마스터/템플릿/프로젝트 제출 상태 관리
- 종료조건 체크리스트/템플릿 관리
- `requires_deliverable=true` 종료조건은 현재 런타임 완료 판정(`confirmed`/`approved`/`not_required`)을 통과한 산출물만 체크 허용한다. 기존 설계 문서의 `before_submit`은 런타임 저장 시 `not_submitted`로, `final` 호환값은 `confirmed`로 정규화한다.
- 산출물과 종료조건은 모바일에서 카드형 목록과 작은 화면 등록 흐름으로 확인·갱신할 수 있게 유지한다.
- 현재 단계 기본 템플릿 적용, 저장된 그룹 템플릿 선택 적용, 현재 목록 기반 그룹 템플릿 저장은 구현됐다. 서버는 산출물/종료조건 그룹 마스터가 있으면 우선 사용하고, 없으면 상태별 기본 세트를 적용한다. 기본 적용은 append 방식으로 기존 항목을 유지하고, 선택 적용에서는 replace 방식으로 템플릿 밖 기존 활성 항목을 소프트 비활성화할 수 있다. 종료조건 그룹 항목은 산출물 필요 여부를 정식 필드로 저장한다. 전용 템플릿 관리 화면은 산출물/종료조건 그룹의 초안·승인·보관, 버전 증가, 이력 조회·복구를 1차 제공한다. 산출물/종료조건별 1~5단계 승인선 저장, 지정 승인자 승인/반려, 최종 승인 시 산출물 승인 또는 종료조건 완료 반영은 1차 구현됐다. 전사 결재 엔진이나 DMS 파일 검토 워크플로우 연동은 후속이다.

---

## MVP-4: 태스크/이슈/리스크 + 자동 리포트/대시보드

- 마일스톤/태스크/이슈/리스크는 "핵심 프로젝트부터" 단계적으로 적용
- 목표/WBS/작업/마일스톤은 프로젝트 상세에서 데스크톱 표와 모바일 카드 목록으로 상태 확인·변경이 가능하고, 작은 화면에서도 등록 다이얼로그를 사용할 수 있게 유지한다. 작업 탭은 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산, 합계·소진율·차이·미기입 요약을 1차 제공한다.
- 통제 객체 이슈/요구사항/리스크/변경/이벤트는 프로젝트 상세에서 데스크톱 표와 모바일 카드 목록으로 상태 확인·변경이 가능하도록 유지한다.
- 기존 `Issue` 행은 신규 작성 경로가 아니라 호환성 cleanup 인박스로만 유지한다. 열린 정리 대상만 기본 표시하고 완료/전환 행은 선택 이력으로 접어 두며, 완료 상태 행은 프로젝트 단위 일괄 숨김 처리로 보존 아카이브 후 비활성화한다. 열린 행은 프로젝트 단위 일괄 정식 전환으로 이슈·리스크·변경요청을 생성한 뒤 `canonicalized_cleanup` 보존 아카이브 후 비활성화할 수 있다. cleanup 요약은 활성/열린/완료/숨김 보존 건수와 물리 제거 가능 여부를 서버 기준으로 표시한다. fresh seed 는 더 이상 활성 `Issue` demo 행을 만들지 않고, 열린 데모 업무는 정식 통제 객체에 seed 하며 원본 스냅샷은 legacy archive 로만 보존한다.
- 프로젝트 상세에는 비용(CRM 계약 스냅샷), 일정, 성과, 통제/피드백을 한 번에 보는 통제 요약 패널과 `/dashboard/summary` API가 1차 구현됐다. 이 요약은 CRM 계약/대금 원장을 PMS가 소유한다는 의미가 아니며, 기존 PMS 전체 PMO/경영 대시보드와 전사 타임시트·노무비/회계 연동은 후속 범위다.
- 데이터가 쌓이면 수작업 PPT 취합/보고 비용이 자연스럽게 감소한다.

---

## 현재 진행 상황

| 단계 | 상태 | 비고 |
|------|------|------|
| MVP-0 | 🔄 진행중 | `Customer`는 PMS 원장 편집이 아니라 프로젝트 생성·기준정보 선택용 읽기 조회로 축소됨. 공용 조직 앵커 메타데이터 응답/검색/선택지 표기 1차와 프로젝트 응답/상태별 목록/기본정보 읽기 화면의 앵커 노출 1차, 요청 등록/프로젝트 기본정보/기준정보 관리 고객사 선택지의 공용 조직명·코드 우선 표시 통일, 요청/제안/수행/전환 목록 고객 필터의 읽기용 고객 조회 선택 전환 1차, 프로젝트 조직 supplier/partner 연결의 공용 조직 lookup 선택 1차, 프로젝트 직접 관계 추가와 실행 상세 후속 프로젝트의 프로젝트명/번호 검색 선택 1차, 요청/제안/전환 상세 담당자의 프로젝트 멤버 선택 1차, 주요 런칭 표면의 내부 ID fallback 비노출 1차는 구현됐으나 고객사 원장 편집과 CRM/Admin/공용 조직 full cutover 는 미구현. `Project`, `User/Role/Menu`, 프로젝트 멤버 역할 코드 선택 축은 구현됐고, 멤버 추가는 숫자 사용자 ID 입력이 아니라 활성 공용 사용자 lookup 선택으로 전환됨. `Plant/Site`, `System Catalog`, `System Instance`, `Integration`은 PMS 실행 자산 기준정보 1차 스키마/API/조회 화면/시드/관리자 CRUD, JSON 기반 dry-run/apply 반입·기존 코드 갱신 1차, CSV/TSV 업로드·컬럼 매핑·코드 우선 템플릿 다운로드·브라우저 로컬 매핑 재사용 1차, 숫자 ID 컬럼의 기존 파일 호환 매핑, 서버 공유 매핑 프로필 CRUD/재사용·기본 지정 UI·이력 조회/복구 1차, 프로젝트 생성·수정 선택 검증 1차, 프로젝트 응답/상태별 목록/작업 큐/기본정보 읽기 화면의 실행 자산명 노출 1차까지 착수됨 |
| MVP-1 | 🔄 부분 구현 | `status/stage`, `doneResult`, 단계별 상세, 상태 전이 로직이 이미 구현됨 |
| MVP-2 | 🔄 부분 구현 | handoff 서버 기반과 프로젝트 상세 인수인계 1차 화면은 존재. 인수 대상 담당자는 프로젝트 멤버 선택, 배정 역할은 활성 프로젝트 멤버 역할 코드 선택으로 전환됨. 인수인계 탭은 CRM 계약 후보 검색과 PMS 인계 preview 조회를 읽기 전용으로 제공한다. contract/payment는 CRM 정본의 읽기용 스냅샷으로 노출하며 PMS 편집 화면과 프로젝트 자동 생성은 런칭 범위에서 제외 |
| MVP-3 | 🔄 부분 구현 | 산출물/종료조건 CRUD와 완료 전 검증, 산출물 모바일 카드 목록, 산출물/종료조건 작은 화면 등록 다이얼로그, 현재 단계 기본 템플릿 적용 API/화면/검증, 저장된 그룹 템플릿 선택 적용, append/replace 적용 정책, 현재 목록 기반 그룹 템플릿 저장, 종료조건 그룹 항목 산출물 필요 여부 보존, 전용 템플릿 관리 화면, 초안·승인·보관, 버전 증가, 이력 조회·복구, 산출물 완료 상태 어휘 통합, 산출물/종료조건별 프로젝트 멤버 기반 1~5단계 승인선과 지정 승인자 승인/반려는 존재. DMS 파일 검토와 전사 결재 엔진 연동은 후속 |
| MVP-4 | 🔄 부분 구현 | 목표/WBS/작업/마일스톤의 데스크톱 표·모바일 카드 목록·작은 화면 등록 다이얼로그, 작업별 예상/실제 공수 입력과 합계·소진율·차이·미기입 요약, 일일 작업 공수 기록과 작업 실제 공수 자동 합산, task/milestone/issue/basic dashboard와 통제 객체 이슈/요구사항/리스크/변경/이벤트의 데스크톱 표·모바일 카드 목록, 프로젝트 상세 비용(CRM 계약 스냅샷)·일정·성과·통제/피드백 요약 패널과 API, 기존 `Issue` 호환성 인박스의 모바일 카드 목록·정식 통제 객체 수동 전환·열린 행 일괄 정식 전환·완료 행 기본 접기·완료 행 일괄 숨김·soft-hide cleanup, 보존 아카이브, 서버 기준 cleanup 요약 지표, 기존 `Issue` 신규 생성 POST/웹 create 계약 폐기, 프로젝트 상세 보고/리뷰 이벤트 요약, 피드백 이슈/리뷰 이벤트 직접 등록 표면, 수집된 launch feedback 이슈의 상태 변경·해결 처리, 리뷰/피드백 탭의 모바일 카드 목록·작은 화면 등록 다이얼로그, 누적 데이터 환경에서 PMR/PRR 원장·런칭 피드백·보고 이벤트 최근 항목 렌더링, 런칭 피드백 공유용 스냅샷 다운로드, PMR/PRR 준비도 화면, PMR/PRR 초안 다운로드, 프로젝트 이벤트 기반 PMR/PRR 발행 원장, 주간/월간 반복 예약 생성, 만기 예약 자동 rollover, 프로젝트 멤버 승인자 지정, 결재선 정책 선택과 수신 정책 기반 PMS 공통 알림, 승인 요청·승인·반려·발행 완료 상태 전환, 승인·반려 지정 승인자 제한, 홈에서 리뷰/피드백 탭으로 바로 진입하는 동선, 홈의 열린 런칭 피드백 큐 패널, 홈 리스크/리포트/운영 집계 위젯은 존재. 기존 PMS 전체 PMO/경영 대시보드와 전사 타임시트·노무비/회계 연동은 후속 범위 |

### 현재 기준 정리

- PMS는 아직 **MVP-0 전체 완료** 단계는 아니지만, 실제 구현은 MVP-1과 MVP-3 일부를 선행 포함하고 있습니다.
- 동시에 worktree 기준으로는 lifecycle bridge / org-orgmember foundation / project membership-access / objective-WBS / control quartet+issue / project org-relation / handoff-contract foundation 이 구현 쪽까지 상당 부분 진행된 상태입니다.
- CRM 분리 이후 PMS의 1차 런칭 범위는 [PMS-CRM Boundary Launch Rebaseline](./pms-crm-boundary-launch-rebaseline.md) 을 따른다.
- 계약/청구/매출/원가 원장은 CRM 정본이며, PMS는 실행 프로젝트에서 필요한 스냅샷만 명시 반영한다. 프로젝트 상세 인수인계 탭은 CRM 계약 후보와 PMS 인계 preview를 조회하고 준비 완료 preview를 기존 프로젝트 계약/대금/accepted handoff 스냅샷으로 반영하지만, PMS 신규 프로젝트 자동 생성이나 계약/청구 직접 편집은 수행하지 않는다.
- 프로젝트 멤버 역할은 `PROJECT_MEMBER_ROLE` 코드 그룹의 활성 코드만 선택지로 사용하며, 화면 fallback 정적 역할 목록은 런칭 기준에서 제거했다. 멤버 추가 대상자는 활성 공용 사용자 lookup 결과에서 선택하고, 인수인계 배정 역할도 텍스트 코드 입력이 아니라 활성 역할 코드 선택으로 저장한다. PMS는 사용자 원장을 생성/수정하지 않는다.
- PMS 고객사 관리 CRUD 화면/API/mutation/쓰기 DTO export 는 제거됐고, PMS는 프로젝트 생성·수정 및 기준정보 선택에서 고객사 읽기 조회만 사용한다. 이 조회는 공용 조직 앵커 메타데이터를 함께 반환하고 공용 조직 코드/명 검색과 선택지 연결 표기를 1차 제공한다. 요청 등록, 프로젝트 기본정보, 기준정보 관리의 고객사 선택지는 같은 포매터를 사용해 고객사 코드와 공용 조직명/코드를 우선 표시하고, 조직 식별자만 있을 때는 숫자 ID 대신 정보 조회 필요 상태를 표시한다. 프로젝트 목록/상세 응답도 고객명과 공용 조직 앵커 메타데이터를 읽기 전용으로 반환하며, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면은 식별자 대신 고객/조직 연결 상태를 표시한다. 요청/제안/수행/전환 목록의 고객 필터는 숫자 고객 ID 입력이 아니라 읽기용 고객 조회 선택으로 동작하고, 고객/조직/실행 자산/프로젝트 관계/담당자 표시 fallback 도 숫자 내부 ID를 직접 노출하지 않는다. 프로젝트 조직 연결 화면은 supplier/partner 직접 연결 시 숫자 조직 ID 입력 대신 활성 공용 조직 lookup 결과를 선택한다. 프로젝트 간 직접 관계는 PMS 실행 프로젝트 간 연결 책임으로 유지하되, 추가 화면은 숫자 프로젝트 ID 입력 대신 프로젝트명/번호 검색 결과를 선택한다. 실행 상세의 후속 프로젝트도 숫자 프로젝트 ID 입력/표시가 아니라 프로젝트명/번호 검색 선택을 사용하며, `nextProjectId`는 successor 호환 동기화 필드로만 유지한다. 요청/제안/전환 상세 담당자는 숫자 사용자 ID 입력 대신 현재 프로젝트 멤버 중에서 선택한다. 고객사 원장 편집은 CRM/Admin/공용 조직 책임으로 남아 있으며, 공용 Organization full cutover 는 아직 남아 있다.
- PMS 서버/웹 TypeDoc reference 도 최신 소스로 재생성해 제거된 고객사 쓰기 DTO, 고객사 mutation hook, 고객사 관리 화면을 더 이상 문서화하지 않는다. `verify:pms-launch` 는 이 stale reference 회귀까지 차단한다.
- PMS 고객/프로젝트/실행 자산 목록 조회는 서버 계약에 맞춰 `pageSize`를 네트워크 요청에 남기지 않고 `limit`으로만 전달한다. PMS 앱 전역은 한국어 시스템 글꼴을 우선 사용하며, 런칭 브라우저 QA는 홈, 홈 런칭 피드백 큐, 프로젝트 상세, closeout 처리 큐와 조치 바로가기, 태스크/마일스톤/컨트롤/산출물/종료조건/인수인계/리뷰 탭, 기존 Issue 신규 생성 차단과 cleanup 인박스, 리뷰 탭의 피드백 이슈/리뷰 이벤트 실제 저장과 피드백 해결 처리, PMR/PRR 예약 행의 승인 요청·승인·발행 완료 상태 전환, 활성 헤더 브레드크럼, 사이드바 요청 등록 화면을 desktop/mobile 기준으로 확인한다. 설정 화면은 `/settings` 직접 진입 시에도 공용 PMS 셸에서 MDI 탭으로 열리며, ContentArea 실제 페이지 매핑과 헤더 브레드크럼을 `verify:pms-launch` 가 소스 기준으로 확인한다. 코드 관리, 메뉴 관리, 기준정보, 템플릿 관리의 destructive action 과 오류 피드백은 브라우저 기본 대화상자가 아니라 PMS 전역 확인 다이얼로그와 토스트를 사용하고, 같은 회귀를 `verify:pms-launch` 가 소스 기준으로 차단한다. 인수인계 탭과 셸 fallback 은 `미구현`, `페이지 준비 중` 같은 미완성형 문구 대신 인계 미구성 또는 등록되지 않은 경로 같은 운영 가능한 상태 표현을 사용한다. PMR/PRR 이벤트 생성·상태 변경 성공 응답은 이벤트 목록 캐시와 활성 PMR/PRR 행에 즉시 반영해 누적 데이터 Docker 환경에서도 같은 화면 행의 상태 전환을 바로 확인한다.
- Docker 재빌드와 런타임 검증을 시작하기 전에는 `verify:pms-launch-host` 로 host 여유 공간, Windows host/Docker host 마운트, Docker CLI/Compose 응답을 먼저 확인한다. 이 점검은 PMS 기능 통과 증빙이 아니라, 현재 재빌드 차단 원인이 host 디스크 부족이나 Docker/WSL 상태인지 즉시 분리하기 위한 운영 게이트다.
- PMS 런칭 화면의 날짜/일시/숫자/금액/건수 표시는 PMS 전용 공통 포맷 유틸로 정리했고, 전환 목록 운영 담당자 같은 사용자/조직 경계 표면은 숫자 내부 ID 대신 지정 여부나 이름 기반 정보만 노출하도록 `verify:pms-launch` 에서 회귀를 차단한다. PMS AI/RAG project/task/member/status projection 본문도 고객·플랜트·시스템·담당자·조직 내부 ID 라벨을 넣지 않고, 구조 식별자는 ACL/metadata 에만 남긴다.
- PMS API 오류 응답은 런칭 경로에 한해 `PMS_*` 상세 코드, 실패 경로, HTTP 상태 메타데이터를 포함하도록 정리됐고, 대표 식별자 오류 응답은 `verify:pms-launch` 런타임 검증에 포함됐다. 이는 PMS API 오류 계약 안정화이지 CRM/Admin/공용 원장 오류 소유권 확장이 아니다.
- `Plant/Site`, `System Catalog`, `System Instance`, `Integration`은 PMS 실행 자산 기준정보로 분리된 1차 조회/검색/관리자 생성·수정·비활성화 표면, JSON 기반 dry-run/apply 반입과 기존 코드 갱신 1차, CSV/TSV 업로드·컬럼 매핑·코드 우선 템플릿 다운로드·브라우저 로컬 매핑 재사용 1차, 숫자 ID 컬럼의 기존 파일 호환 매핑, 서버 공유 매핑 프로필 CRUD/재사용·기본 지정 UI·이력 조회/복구 1차, 프로젝트 생성·수정 흐름의 선택 검증 1차가 생겼다. 프로젝트 목록/상세/생성/수정 응답은 plant/site와 system instance 이름·코드를 읽기 전용 메타데이터로 반환하고, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면은 숫자 식별자 대신 실행 자산명을 우선 표시한다. 이는 CRM 기회/견적/계약/매출 원장을 대체하지 않는다.
- PMS 실행 자산 기준정보, 공유 반입 프로필, core reconciliation foundation 은 formal migration 파일, db-init protected baseline 적용 경로, `verify:pms-launch` 소스 검증으로 1차 재현성을 고정했다. 기존 Issue 호환 인박스는 열린 cleanup 대상 중심으로 축소됐고 신규 생성 POST/웹 create 계약은 폐기됐으며, 숨김 cleanup 의 보존 아카이브 스냅샷과 이력 정책, 서버 기준 cleanup 요약 지표, 완료 행 일괄 숨김, 열린 행 일괄 정식 전환, fresh seed 의 활성 legacy Issue 재생성 차단과 전체 프로젝트 cleanup 활성 0건 런타임 검증도 고정됐다. PMS AI/RAG provider-ready report verifier/template/self-test 게이트, precheck → live evidence → report verification 완료 runner, provider-ready evidence recorder/dry-run 문서 기록 경로, provider-ready evidence bundle 생성/검증 경로는 생겼지만 실제 Azure-backed provider-ready 통과 report artifact 는 아직 없다. CRM/Admin/공용 Organization cutover, AI/RAG provider-ready live evidence, legacy Issue 물리 테이블 제거는 별도 잔여다.
- 따라서 현재 우선순위는 새 feature 확장이 아니라 **baseline close** 입니다.
- 프로젝트 상세 목표/WBS/작업/마일스톤은 데스크톱 표와 모바일 카드 목록으로 상태·연결·진척을 확인/변경하고, 작은 화면 등록 다이얼로그를 제공한다. 산출물/종료조건 탭은 산출물 모바일 카드 목록, 상태·이벤트 연결 선택, 현재 단계 기본 템플릿 적용 버튼, 저장된 템플릿 그룹 선택 적용, 현재 목록 기반 템플릿 저장, 프로젝트 멤버 기반 승인선 설정과 승인/반려, 작은 화면 등록 다이얼로그를 제공한다. 관리자 템플릿 관리 화면은 산출물·종료조건 그룹 목록, 편집 저장, 승인, 보관, 이력 조회·복구를 제공하고 보관 그룹도 감사/복구용으로 조회한다. 상세 closeout 패널은 다음 액션/막힌 조건/종료 가능 여부에서 현재 단계의 미해결 산출물·종료조건 처리 큐를 보여주고, 큐 항목 또는 조치 바로가기에서 산출물, 종료조건, 리뷰/피드백 탭으로 바로 전환한다. 통제 탭은 이슈/요구사항/리스크/변경/이벤트를 데스크톱 표와 모바일 카드 목록으로 표시하고, 작은 화면에서도 등록 다이얼로그를 스크롤해 사용할 수 있다. 기존 `Issue` 행은 호환성 cleanup 인박스로만 유지하며 열린 정리 대상만 기본 표시하고 완료/전환 행은 선택적으로 펼쳐 확인한다. 필요한 행은 정식 이슈·리스크·변경요청으로 수동 또는 프로젝트 단위 일괄 전환하고, 원본 행은 `canonicalized_cleanup` 보존 아카이브 후 비활성화할 수 있다. 완료 상태 행은 프로젝트 단위 일괄 숨김 액션으로 보존 아카이브 후 비활성화할 수 있다. cleanup 요약은 활성/열린/완료/숨김 보존 건수와 활성 0건 물리 제거 조건을 서버 기준으로 표시한다. 새 작성은 정식 통제 패널로 유도한다. 프로젝트 상세 리뷰/피드백 탭은 보고/리뷰 이벤트와 피드백 큐를 노출하고, 모바일에서는 카드 목록으로 읽게 하며, launch feedback 을 정식 이슈와 리뷰 이벤트로 바로 등록하고 수집된 피드백 이슈를 상태 변경·해결 처리할 수 있다. 누적 데이터 환경에서는 PMR/PRR 원장, 수집된 launch feedback, 보고/리뷰 이벤트를 최근 항목 중심으로 렌더링하고 전체 건수는 별도로 표시한다. 또한 현재 이벤트·피드백·확인 필요 신호를 런칭 피드백 공유용 스냅샷으로 다운로드하고, 현재 PMS 실행 데이터 기준 PMR/PRR 준비도 화면, 초안 다운로드, 프로젝트 이벤트 기반 발행 원장, 주간/월간 반복 예약 생성, 만기 예약 자동 rollover, 프로젝트 멤버 승인자 지정, 결재선 정책 선택, 수신 정책 기반 PMS 공통 알림, 승인 요청·승인·반려·발행 완료 상태 전환, 승인·반려 지정 승인자 제한을 제공한다. PMS 홈은 권한 있는 프로젝트의 리뷰/피드백 탭으로 바로 진입하는 동선, 열린 launch feedback 이슈의 피드백 지표·운영 신호, 리스크/리포트/운영 집계 위젯을 제공한다.
- `verify:pms-launch` 는 인증 후 프로젝트 상세, access/readiness, 작업, 산출물, 종료조건, 산출물 완료 상태 어휘(`confirmed`/`approved`/`not_required`)와 종료조건 체크 가드, 산출물·종료조건 기본 템플릿 적용, 템플릿 그룹 저장·목록 조회·선택 적용, append/replace 적용 정책, 산출물·종료조건 승인선 저장과 지정 승인자 승인 결과, 관리자 템플릿 그룹 저장·승인·이력 조회·복구·보관, 인수인계, 계약 스냅샷 API smoke 와 CRM 계약 PMS 인계 preview 읽기·준비 완료 preview 의 PMS 스냅샷 반영 경계를 런타임에서 확인한다.
- 2026-04-17 기준 PMS 병렬 축의 기준선은 [current-baseline-close-brief.md](./current-baseline-close-brief.md) 를 정본으로 삼습니다.
- 다음 PMS 작업은 아래 순서로 봅니다.
  1. `verify:pms-launch-host` 로 Docker 재빌드 가능 host 상태를 먼저 확인하고, 실패 시 디스크/Docker Desktop/WSL 상태를 복구
  2. CRM/Admin/공용 Organization full cutover 범위 확정 및 잔여 direct anchor 정리
  3. PMS AI/RAG provider-ready evidence bundle 의 env template/request packet 을 채운 뒤 완료 runner와 evidence recorder로 live runtime report artifact 확보·기록
  4. legacy Issue cleanup 요약 기준 활성 대상 0건 확인 이후 물리 테이블 제거 migration 여부 결정
  5. 런칭 피드백을 받은 뒤 프로젝트 상세/홈 화면의 사용성 보강

## 횡단 AI/RAG Track

PMS AI/RAG 확장은 PMS 원장 구조를 common schema로 옮기는 작업이 아니다. 프로젝트, 태스크, 멤버, 상태 데이터는 PMS RDB가 계속 정본이며, adapter는 공용 `CommonAiIndexModule`에 `AiIndexObjectProjection`, ACL snapshot, target resolver만 제공한다.

현재 상태는 다음과 같다.

1. PMS project RDB projection adapter는 구현됐다. 프로젝트 기본 정보, 요청/제안/실행/전환 상세, status timeline, member/org ACL snapshot을 common AI index projection으로 변환한다.
2. PMS project create/update/delete, detail upsert, stage transition 저장 이벤트는 common AI index job queue에 project upsert/delete 작업을 넣는다.
3. PMS project controlled backfill endpoint는 기존 project row를 제한된 batch로 common AI index `backfill` job에 넣는다.
4. PMS task RDB projection adapter와 task create/update/delete queue hook이 구현됐다. Task projection은 task row, WBS, assignee, project/member/org ACL snapshot을 common AI index projection으로 변환한다.
5. PMS project/task/member/status runtime evidence gate는 실제 런타임에서 project/task backfill 및 projectMember/projectStatus 공용 AI job을 큐잉·실행하고 common AI object, chunk, ACL snapshot, index state, retrieval audit 를 확인한다. 데모 프로젝트 상태 상세 시드는 새 Docker 환경에서도 projectStatus evidence 대상을 재현할 수 있게 고정됐고, provider-unavailable Docker 증빙은 JSON report 와 Markdown summary 로 함께 남긴다.
6. provider-ready runtime report verifier는 PMS project/task/member/status report 의 source status, backfill, job run, retrieval, database audit, embedding count 를 검증하고 template/self-test 를 제공한다. 이는 실제 provider-ready 실증을 대체하지 않으며, 통과 report 파일이 있어야 production readiness를 주장할 수 있다.
7. PMS provider-ready 완료 runner는 provider env precheck, live PMS evidence 생성, report verification, evidence block 기록을 한 순서로 실행하고 env-file, Docker runtime, 기존 artifact 재검증, 문서 dry-run 기록을 지원한다.
8. provider-ready evidence bundle 은 env template, required-input request packet, draft report template, completion runner 명령, 최종 bundle verifier 를 한 산출물로 묶는다. 이 bundle 은 실행 준비 산출물이며, draft report 나 placeholder summary 는 최종 검증에서 실패해야 한다.
9. embedding provider가 준비되지 않은 환경에서는 PMS semantic/vector/RAG capability가 false로 남고, provider-ready workflow가 통과해야 vector/RAG production readiness를 주장할 수 있다.
10. 다음 PMS 잔여는 이 runner를 실제 Azure-backed 환경에서 통과시켜 live provider-ready runtime report artifact 를 확보하고 아래 evidence block 을 `recorded` 상태로 갱신하는 것이다.

### PMS Provider-Ready Evidence Record

<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START -->
Provider-ready evidence status: pending

- Current blocking item: no verified Azure-backed PMS provider-ready runtime report artifact has been recorded.
- Required proof: passed PMS project/task/projectMember/projectStatus provider-ready JSON report plus Markdown summary, verified before documentation is updated.
- Handoff bundle: `output/pms-ai-rag-provider-ready` contains draft report/env/request packet templates only and must not be treated as completion evidence.
- Recording path: `complete:pms-ai-rag-provider-ready` calls `record:pms-ai-rag-provider-ready-evidence` after report verification.
<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:END -->

PMS adapter는 project/task/member/status context를 통합 검색과 assistant에 제공하되, PMS 업무 상태 전이·권한·종료 조건의 원천 판단은 PMS service와 RDB에 남긴다.

---

## 관련 문서

- [BACKLOG.md](BACKLOG.md) - 상세 백로그
- [../domain/service-overview.md](../explanation/domain/service-overview.md) - 서비스 개요

## Changelog

| Date | Change |
|------|--------|
| 2026-07-13 | Added PMS daily task effort logs: the task tab now records work date/type/summary/hours per task, the API stores PMS-owned effort log history, and active logs are aggregated back to task actual hours. Enterprise timesheet, labor-cost, and accounting integrations remain future scope. |
| 2026-07-13 | Added task-level PMS effort management: the task tab now shows estimated/actual effort totals, burn rate, variance, missing actual counts, and inline estimated/actual effort inputs as the first effort-management surface. |
| 2026-07-13 | Added a PMS project detail control dashboard summary: `/dashboard/summary` and the detail panel now show CRM contract snapshot totals, schedule, performance, controls, launch feedback, boundary text, and management-tab shortcuts while keeping full PMO dashboard and effort automation as future scope. |
| 2026-07-13 | Added a PMS home launch feedback queue: home summary now returns uncollapsed launch feedback signals and the home screen exposes a dedicated queue for direct review-tab triage. |
| 2026-07-13 | Added PMS launch host readiness preflight guidance: `verify:pms-launch-host` now checks host free space and Docker CLI/Compose responsiveness before rebuild/runtime verification attempts, without treating host readiness as PMS feature completion. |
| 2026-07-13 | Added PMS AI/RAG provider-ready evidence bundle preparation and final bundle verification so the remaining Azure-backed report can be requested, generated, verified, and recorded through one operator handoff packet. Draft bundle artifacts still fail final verification and do not close the live provider-ready artifact. |
| 2026-07-13 | Routed PMS `/settings` through the shared shell, mapped the local settings screen into the MDI ContentArea, and added launch-gate source checks for the settings tab and breadcrumb contract. |
| 2026-07-13 | Added PMS AI/RAG provider-ready evidence recorder integration so a passed Azure-backed project/task/member/status report can write a digest-bound evidence block to PMS planning docs after verification. The actual Azure-backed provider-ready report artifact remains open. |
| 2026-07-10 | Added PMS AI/RAG provider-ready completion runner so the remaining live artifact can be produced through one ordered path: provider env precheck, live PMS evidence generation, and provider-ready report verification. The actual Azure-backed report artifact remains open. |
| 2026-07-10 | Added PMS AI/RAG provider-ready runtime report verification scripts and launch-gate source checks for project/task/member/status evidence shape, while keeping the live Azure-backed provider-ready artifact as open work. |
| 2026-07-10 | Added a retired legacy PMS `Issue` seed baseline so fresh launch seed no longer creates active `pr_issue_m` demo rows; active demo work is seeded into canonical control tables, original snapshots stay in the archive, and runtime launch verification checks global active cleanup count is zero. |
| 2026-07-10 | Added project-level batch canonicalization for pending legacy PMS `Issue` cleanup rows so open compatibility rows can create canonical project issues, risks, or change requests before being archived and soft-hidden. |
| 2026-07-10 | Added a project-level batch archive action for completed legacy PMS `Issue` cleanup rows, preserving snapshots and keeping pending rows on the canonical conversion path. |
| 2026-07-10 | Added server-owned legacy PMS `Issue` cleanup summary counts and physical-removal gate evidence to the project control surface and launch runtime verifier. |
| 2026-07-10 | Added protected archive retention for legacy PMS `Issue` cleanup: hide now writes a preserved archive snapshot and history record before soft-hiding the source row, while physical table removal remains a later migration after cleanup rows are exhausted. |
| 2026-07-10 | Retired legacy PMS `Issue` creation from launch surfaces: POST now returns 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED`, PMS web no longer exposes create API/mutation/request docs, and browser/runtime QA checks the write-disabled path while preserving cleanup-only reads and conversion of existing rows. |
| 2026-07-10 | Added launch-ready closeout approval routes for PMS deliverables and close conditions, including project-member approver steps, assigned-approver decisions, status updates, protected migration coverage, and launch verification. Enterprise approval-engine or DMS file-review integration remains future scope. |
| 2026-07-10 | Added append/replace apply policy for PMS deliverable and close-condition templates so selected templates can soft-deactivate rows outside the chosen group, with web controls and runtime launch verification. |
| 2026-07-09 | Unified PMS deliverable completion vocabulary so `confirmed`, `approved`, and `not_required` are all accepted by transition readiness and close-condition guards, with legacy `before_submit`/`final` inputs normalized and launch verification covering the runtime path. |
| 2026-07-09 | Added the PMS template admin screen and workflow-backed template group API for deliverable and close-condition groups, including draft/approved/archived status, version increments, history lookup/restore, archived-group visibility, protected migration coverage, and launch verification. Closeout approval routes were added in the later 2026-07-10 entry. |
| 2026-07-09 | Added launch-facing PMS deliverable and close-condition template group lookup/save and selected group apply UX. Close-condition group items now persist deliverable-required policy; dedicated template admin and version/approval/restore operations were added in the later same-day template admin entry. |
| 2026-07-09 | Added launch-facing PMS deliverable and close-condition default template application API/UI with group-master-first and default fallback append behavior. Group selection/save and template admin/version operations were added in later same-day entries. |
| 2026-07-09 | Updated PMS event mutations and the review tab PMR/PRR row overlay to reflect create/update success responses immediately so approval-requested, approved, and published transitions are visible in launch browser QA and runtime screens. |
| 2026-07-09 | Added PMS-CRM handoff boundary coverage to launch verification: PMS reads CRM contract candidates and PMS handoff previews without exposing CRM write mutations, then runtime smoke accepts only a ready preview as a PMS contract/payment/accepted handoff snapshot with CRM ownership evidence. |
| 2026-07-09 | Added stable event-id and status-code markers to PMS PMR/PRR ledger rows and updated browser QA to verify approval transitions against the same workflow row in accumulated ledger environments. |
| 2026-07-09 | Added PMS AI/RAG runtime evidence Markdown summary output so project/task/member/status Docker evidence can be reviewed without reading the raw JSON report. Provider-ready vector/RAG artifact evidence remains open. |
| 2026-07-09 | Limited PMS review tab PMR/PRR ledger, launch feedback, and review event rendering to recent visible rows while preserving total counts and browser QA coverage. |
| 2026-07-09 | Narrowed the legacy Issue compatibility inbox to pending cleanup rows by default, moved completed/converted rows behind an optional history toggle, and changed legacy Issue delete to soft-hide instead of physical deletion. |
| 2026-07-09 | Added PMR/PRR overdue scheduled publication rollover so the server background worker moves due planned workflow events to approval-requested and notifies recipients. |
| 2026-07-09 | Added PMR/PRR designated-approver enforcement for approval/rejection transitions in the review tab and PMS event API. |
| 2026-07-08 | Added PMR/PRR approval-line policy selection, recipient policy preview, project-event policy evidence, and policy-based multi-recipient PMS notifications. |
| 2026-07-08 | Added PMR/PRR repeated reservation generation, project-member approver assignment, and PMS common notifications for workflow events. |
| 2026-07-08 | Added project-event-backed PMR/PRR scheduled publication and approval transitions for weekly/monthly publication items in the PMS review tab. |
| 2026-07-08 | Added a project-event-backed PMR/PRR ledger action and ledger list to the PMS review tab. |
| 2026-07-08 | Added an on-screen PMR/PRR readiness panel in the PMS review tab. |
| 2026-07-08 | Added explicit CRM contract handoff snapshot acceptance from PMS project detail, storing ready CRM previews as PMS project contract/payment/accepted handoff snapshots without PMS auto project creation or CRM ledger ownership changes. |
| 2026-07-08 | Added a PMR/PRR draft download from current PMS execution data. |
| 2026-07-08 | Added a launch feedback review snapshot download in PMS project detail, scoped as a sharing snapshot rather than PMR/PRR report automation. |
| 2026-07-08 | Standardized PMS customer selector captions in request intake, project basic info, and master data management so customer code and common Organization name/code are displayed by a shared formatter while full CRM/Admin/common Organization cutover remains open. |
| 2026-07-08 | Centralized PMS launch-facing date, datetime, number, amount, and count formatting in a shared web formatter, and blocked raw operation owner user id display on the transition list with launch verification coverage. |
| 2026-07-08 | Added a PMS review feedback triage loop so captured launch feedback issues can be status-updated or resolved from the review tab, with home feedback summary invalidation and browser QA coverage. |
| 2026-07-08 | Added a PMS demo project status-detail seed baseline and connected it to seed installers and verification gates so projectStatus AI/RAG runtime evidence remains reproducible in Docker. |
| 2026-07-08 | Added PMS project member/status AI index projections and widened the PMS AI/RAG runtime evidence gate to project/task/member/status verification. Provider-ready artifact evidence remains open. |
| 2026-07-08 | Added a PMS AI/RAG runtime evidence gate for project/task backfill, common AI object/chunk/ACL/index-state verification, retrieval audit verification, and provider-mode assertions. The member/status projection gap from this step was closed by the later 2026-07-08 member/status projection entry. |
| 2026-07-08 | Normalized PMS API error responses for launch-facing routes with stable `PMS_*` detailed codes, failed path, and HTTP status metadata, and added runtime launch verification for representative invalid project identifier responses. |
| 2026-07-07 | Added a PMS home risk/report aggregate widget backed by the home summary API, covering open risks, blocking issues, change requests, review/report readiness, delayed milestones, pending deliverables, and closeout blockers without claiming PMR/PRR automation. |
| 2026-07-07 | Added active-tab PMS header breadcrumbs and launch verification so the desktop/mobile shell exposes the current home, project detail, search, settings, and request-entry context. |
| 2026-07-07 | Added PMS home feedback visibility so open launch feedback issues appear as a dedicated home metric and review-targeted signal, without claiming full reporting automation. |
| 2026-07-07 | Added a legacy Issue cleanup path on the PMS control tab so compatibility rows can be converted into canonical project issues, risks, or change requests before the old row is closed, with launch verification coverage. |
| 2026-07-07 | Added a read-only CRM contract handoff candidate panel to PMS project handoffs so PMs can search CRM contracts and inspect the PMS handoff preview without creating PMS projects or editing CRM financial ledgers. |
| 2026-07-07 | Added a closeout resolution queue on PMS project detail so unresolved current-status deliverables and close conditions are visible inside the readiness panel and can jump to their management tabs, with launch verification coverage. |
| 2026-07-07 | Added closeout action shortcuts on PMS project detail so PMs can jump from readiness verdicts to deliverables, close conditions, and review feedback surfaces, with launch verification coverage. |
| 2026-07-07 | Expanded PMS launch browser QA to write a real feedback issue and review event from the project review tab, then verify the saved items appear in the feedback queue and review event list. |
| 2026-07-07 | Expanded PMS launch browser QA to the home-to-project-detail rehearsal path and stabilized small-screen project detail tab rails with horizontal scrolling. |
| 2026-07-06 | Fixed PMS launch-screen list requests to use server-compatible `limit` parameters, added PMS-scoped Korean system font priority, and adjusted browser QA artifacts to exercise the MDI tab flow. |
| 2026-07-06 | Removed raw internal ID fallback labels from launch-facing PMS customer/organization/execution asset/project relation/owner displays and added launch verification coverage. |
| 2026-07-06 | Switched PMS execution-detail successor project entry from raw project ID input/display to project name/number lookup selection while keeping `nextProjectId` as compatibility storage. |
| 2026-07-06 | Switched PMS request/proposal/execution/transition list customer filters from raw customer ID text entry to read-only customer lookup selection and blocked raw customer ID display fallback in launch verification. |
| 2026-07-06 | Changed PMS execution asset CSV/TSV import templates to code-first columns while keeping raw direct ID fields as compatibility-only mappings, with launch verification coverage. |
| 2026-07-06 | Improved PMS planning/task launch usability with mobile cards for objectives, WBS, tasks, and milestones, plus full-width mobile actions, scrollable small-screen create dialogs, and launch verification coverage. |
| 2026-07-06 | Improved PMS deliverable and close-condition launch usability with mobile deliverable cards, full-width mobile actions, and scrollable small-screen create dialogs, with launch verification coverage. |
| 2026-07-06 | Improved the PMS control tab legacy Issue compatibility inbox with mobile cards while keeping new authoring directed to canonical control panels, with launch verification coverage. |
| 2026-07-06 | Improved PMS project control tab mobile usability with compact cards for issues, requirements, risks, change requests, and events, plus scrollable small-screen create dialogs and launch verification coverage. |
| 2026-07-06 | Improved PMS review/feedback tab mobile usability with compact report/review and feedback queue cards plus scrollable launch feedback dialogs, with launch verification coverage. |
| 2026-07-06 | Switched PMS handoff assigned role entry from free-text role code input to active project-member role code selection, with launch verification coverage. |
| 2026-07-06 | Switched PMS request/proposal/transition detail owner fields from raw user ID entry to current project member selection, with launch verification coverage. |
| 2026-07-06 | Switched PMS explicit project relation add flow from raw project ID entry to accessible project name/number search selection, with launch verification coverage. |
| 2026-07-06 | Switched PMS project member add flow from raw user ID entry to project-scoped active common user lookup selection, including primary organization anchor handoff and launch verification. |
| 2026-07-06 | Added read-only plant/site and system instance metadata to PMS project responses and exposed execution asset labels in project lists, work queues, and project basic info read view. |
| 2026-07-06 | Added a project-scoped read-only common organization lookup and switched PMS supplier/partner project organization linking from raw organization ID entry to lookup selection. |
| 2026-07-06 | Added read-only customer/common Organization anchor metadata to PMS project responses and exposed it in project lists, work queues, and project basic info read view. Full CRM/Admin/common Organization cutover remains open. |
| 2026-07-06 | Regenerated PMS server/web TypeDoc reference and added launch verification that removed customer write DTOs, mutation hooks, and customer master page docs stay absent. |
| 2026-07-06 | Removed non-functional delete alert actions from legacy PMS status lists and added launch verification for visible menu route-to-page mapping. |
| 2026-07-06 | Added first common organization anchor projection to PMS read-only customer lookup and launch verification while keeping full CRM/Admin/common Organization cutover open. |
| 2026-07-06 | Added protected db-init coverage and launch verification for PMS core reconciliation foundation migration bundles. Organization cutover, AI/RAG provider-ready evidence, and legacy cleanup remain separate work. |
| 2026-07-06 | Added protected db-init coverage and launch verification for PMS asset master and shared import profile formal migration bundles. |
| 2026-07-06 | Added a PMS home review-feedback action and direct drilldown into the project review tab so the launch feedback capture surface is discoverable from the first screen. |
| 2026-07-06 | Added launch feedback capture in the project review tab by writing feedback issues and review events through existing PMS control/event APIs. Full reporting automation and PMR/PRR remain out of scope. |
| 2026-07-06 | Removed PMS-owned customer master write surface from launch scope; customer lookup remains read-only for project execution selection and common Organization cutover remains open. |
| 2026-07-03 | Added shared mapping profile history listing and restore flow for PMS execution asset master CSV/TSV imports; common Organization cutover remains open. |
| 2026-07-03 | Added default-profile designation UI for server-backed shared mapping profiles on PMS execution asset master CSV/TSV imports; common Organization cutover remains open. |
| 2026-07-03 | Added server-backed shared mapping profile schema/API/UI and runtime launch smoke for PMS execution asset master CSV/TSV imports; common Organization cutover remains open. |
| 2026-07-03 | Added CSV template download and browser-local mapping save/load/delete controls to PMS execution asset master file imports; shared mapping profile reuse now has a first server-backed slice and common Organization cutover remains open. |
| 2026-07-03 | Added first CSV/TSV file upload, entity selection, column mapping, and row preview UX for PMS execution asset master imports; shared mapping profile reuse now has a first server-backed slice and common Organization cutover remains open. |
| 2026-07-03 | Added first dry-run/apply import and merge path for PMS execution asset master rows; file upload now has a first CSV/TSV mapping surface and shared mapping profile reuse slice, while common Organization cutover remains open. |
| 2026-07-03 | Added first project create/edit validation for PMS execution asset anchors, including request create and basic-info edit selection UI plus runtime launch smoke. |
| 2026-07-03 | Extended MVP0-01 with first admin create/update/deactivate lifecycle for Plant/Site, System Catalog, System Instance, and Integration; import/merge and common Organization cutover remain open. |
| 2026-07-03 | Completed member role code-table cleanup: PMS member add flow now uses active `PROJECT_MEMBER_ROLE` codes only, and launch verification blocks hard-coded role fallback regressions. |
| 2026-07-03 | Added project detail report/review event summary and feedback queue as a launch-facing read-only surface; full reporting automation and PMR/PRR remain out of current completion scope. |
| 2026-07-03 | Expanded PMS launch verification to authenticated runtime API smoke covering project detail, access/readiness, tasks, deliverables, close conditions, handoff, and contract snapshot. |
| 2026-07-03 | Added launch-facing project detail handoff tab and kept contract/payment data as CRM-owned read-only snapshot in PMS. |
| 2026-07-03 | Rebaselined PMS launch scope around CRM-separated execution management; contract/billing/revenue/cost ownership remains in CRM and PMS consumes read-only snapshots. |
| 2026-07-03 | Started MVP0-01 by adding PMS execution asset master schema/API/seed/admin read surface for Plant/Site, System Catalog, System Instance, and Integration. |
| 2026-07-02 | Added project-scoped PMS task controlled AI index backfill endpoint; provider-ready evidence remains open. |
| 2026-07-02 | Added PMS task RDB projection and task write-hook queueing for common AI index jobs; provider-ready evidence remains open. |
| 2026-07-02 | Added controlled PMS project AI index backfill endpoint; provider-ready evidence remains open. |
| 2026-07-02 | Added PMS project write-hook queueing for common AI index jobs; provider-ready evidence remains open. |
| 2026-07-02 | Added PMS project AI index adapter as partial `AI-RAG-08B`; PMS RDB remains the source of truth while projection/ACL/target data flows into the common AI index. |
| 2026-07-02 | Tightened PMS AI/RAG adapter prerequisite to verified provider-ready Markdown summary artifact evidence. |
| 2026-07-02 | Tightened PMS AI/RAG adapter prerequisite to verified provider-ready runtime smoke artifact evidence. |
| 2026-07-02 | Provider-ready workflow and legacy/common retrieval comparison remain required before PMS vector/RAG production readiness is claimed. |
| 2026-07-02 | Added cross-cutting AI/RAG track for PMS. PMS remains the RDB source of truth; AI/RAG work is projection adapter work, not a common-schema migration of PMS ledgers. |
| 2026-04-17 | current-baseline-close-brief 를 planning 기준선에 연결하고, PMS 우선순위를 새 feature 확장보다 baseline close / migration / validation gap 정리로 재정렬 |
| 2026-04-07 | Rebaseline roadmap status to match implemented PMS scope. |
| 2026-02-09 | Add changelog section. |
