# SSOO 변경 이력 (Changelog) - 인덱스

> 전체 변경 이력 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-09-21

---

## 📍 Changelog 하이브리드 구조

### 자동 생성 (릴리스 노트)
- **위치**: [/docs/CHANGELOG.md](/docs/CHANGELOG.md)
- **도구**: `conventional-changelog`
- **용도**: 버전별 릴리스 노트 (Git 커밋 메시지 기반 자동 생성)
- **명령어**: `pnpm changelog` (증분) / `pnpm changelog:init` (전체 재생성)

### 수동 관리 (영역별 상세)
각 문서 하단에 해당 영역의 상세 변경 이력이 있습니다.

| 영역 | 문서 위치 | 설명 |
|------|----------|------|
| **작업 프로세스** | [workflow-process.md](../../common/explanation/architecture/workflow-process.md#changelog) | 개발 프로세스/커밋/Git (공용) |
| **프론트엔드 표준** | [architecture/frontend-standards.md](../explanation/architecture/frontend-standards.md#changelog) | 컴포넌트 표준 |
| **API** | [api-guide.md](../../common/guides/api-guide.md#changelog) | REST API 사용 가이드 (공용) |
| **레이아웃** | [design/layout-system.md](../explanation/design/layout-system.md#changelog) | 레이아웃/사이드바/탭바 |
| **상태 관리** | [architecture/state-management.md](../explanation/architecture/state-management.md#changelog) | Zustand Store |
| **UI 컴포넌트** | [design/ui-components.md](../explanation/design/ui-components.md#changelog) | 공통 컴포넌트 |
| **유틸리티** | [architecture/utilities.md](../explanation/architecture/utilities.md#changelog) | API Client, 헬퍼 |
| **인증** | [auth-system.md](../../common/explanation/architecture/auth-system.md#changelog) | 인증/인가 (공용) |
| **스크롤바** | [design/scrollbar.md](../explanation/design/scrollbar.md#changelog) | 스크롤바 스타일 |
| **데이터베이스** | [database-guide.md](../../common/guides/database-guide.md#changelog) | DB 구조/연결 (공용) |

---

## 📅 최근 변경 요약

### 2026-09-21

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 홈·업무 목록 본문 | 사용자 순차 승인에 따라 다섯 화면의 최대 본문 폭 975px·바깥 여백/구역 간격 16px를 적용. 홈 업무 신호의 작은 화면 배치와 권한별 업무 안내 넘침을 함께 보완. [적용 범위](../explanation/design/layout-system.md#홈업무-목록-본문-기준-2026-09-21), [검증 결과](../../../output/playwright/pms-page-width-20260921/results.md) 참조 |
| - | - | PMS 프로젝트 목록·타임라인 | 사용자 후속 승인으로 긴 제목이 프로젝트 번호를 침범하는 높이 충돌을 해소하고, 목록에 열별 읽기 폭·내부 가로 스크롤을 적용. 일반 목록 7너비와 긴 문구 2보기×4너비, 세 보기 저장/새로고침/동일 데이터/상세 열기 및 원래 설정 복원 검증. [표시 기준](../guides/project-settings.md) 참조 |
| - | - | PMS 프로젝트 카드 | 순차 적용 승인에 따라 내 프로젝트(보드)·조치 필요·종료/전환·전체 운영 현황 카드의 세로 배치, 상단 정렬, 긴 고객사·자산 줄바꿈 보완. 공용 버튼·DMS·API 계약 유지. [표시 기준과 잔여 범위](../guides/project-settings.md), [진행 현황](../../common/explanation/architecture/2026-09-11-launch-approval-register.md) 참조 |

### 2026-07-13

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 프로젝트 상세/일일 공수 | **EFFORT-02 일일 공수 원장 추가**: 작업별 작업일·유형·요약·실제 공수를 기록하는 PMS 공수 원장 DB/API/UI와 이력 트리거를 추가하고, 활성 기록 합계를 작업 실제 공수로 자동 반영하며 `verify:pms-launch` 정적·런타임 검증에 포함. 전사 타임시트·노무비/회계 연동은 후속 |
| - | - | PMS 프로젝트 상세/작업 공수 | **EFFORT-01 작업 단위 공수 관리 표면 추가**: 작업 탭에 예상/실제 공수 합계, 소진율, 차이, 미기입 건수 요약과 작업별 예상/실제 공수 인라인 입력을 추가하고, 프로젝트 통제 요약 성과 카드와 `verify:pms-launch` 검증에 공수 필드를 포함 |
| - | - | PMS 프로젝트 상세/통제 요약 | **DASH-03 프로젝트 통제 요약 추가**: 프로젝트 상세에 비용(CRM 계약 스냅샷)·일정·성과·통제/피드백 요약 패널과 `/dashboard/summary` API를 추가하고, CRM 계약 원장 경계 문구와 관리 탭 바로가기를 `verify:pms-launch` 정적·런타임 검증에 포함. 기존 PMS 전체 PMO/경영 대시보드는 후속 범위로 유지 |
| - | - | PMS 홈/런칭 피드백 | **HOME-04 런칭 피드백 홈 큐 추가**: 홈 요약 API가 접힌 대표 신호와 별도로 열린 launch feedback 신호 목록을 내려주고, PMS 홈이 `런칭 피드백 큐` 패널에서 여러 프로젝트의 피드백을 바로 리뷰 탭으로 열 수 있게 보강 |
| - | - | PMS 런칭/운영 검증 | **LAUNCH-HOST-01 Docker 호스트 사전 점검 추가**: PMS 런칭 재빌드 전 Windows host/Docker host 여유 공간과 Docker CLI/Compose 응답을 수치로 확인하는 `verify:pms-launch-host`를 추가하고, `verify:pms-launch` 소스 검증과 PMS 계획 문서에 연결. 현재 실제 Docker 재빌드는 host 디스크 부족 및 Docker/WSL I/O 오류가 해소되어야 진행 가능 |
| - | - | PMS AI/RAG | **AI-RAG-08B provider-ready 증빙 번들 추가**: Azure-backed PMS AI/RAG provider-ready report 를 받기 위한 PMS 전용 evidence bundle 생성기와 최종 번들 검증기를 추가. 번들은 env template, required-input request packet, draft report template, completion runner 명령을 한 디렉터리에 모으고, draft report/placeholder summary 는 최종 검증에서 실패하도록 고정. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| - | - | PMS 런칭 UX/AI/RAG | **LAUNCH-QA-10 AI/RAG 본문 내부 식별자 표현 제거**: PMS project/task/member/status AI/RAG projection 의 검색 본문에서 고객·플랜트·시스템·담당자·조직 내부 ID 라벨을 제거하고, 가능한 사용자/조직 라벨만 본문에 포함하도록 정리. ACL/metadata 식별자는 유지하며 `verify:pms-launch`와 adapter 단위 테스트가 본문 회귀를 차단 |
| - | - | PMS 런칭 UX/검증 | **LAUNCH-QA-09 미완성형 화면 문구 제거**: PMS 인수인계 탭의 CRM 인계 상태 `not-implemented` 표시를 사용자-facing `인계 미구성`으로 바꾸고, 알 수 없는 셸 경로 fallback 이 `페이지 준비 중` 대신 등록되지 않은 화면 경로로 안내하도록 변경. `verify:pms-launch`가 두 문구 회귀를 차단 |
| - | - | PMS 런칭 UX/검증 | **LAUNCH-QA-08 관리자 기본 대화상자 제거**: 코드 관리, 메뉴 관리, 기준정보, 템플릿 관리 화면의 브라우저 기본 `alert`/`confirm` 표면을 PMS 전역 확인 다이얼로그와 토스트로 교체하고, `verify:pms-launch` 소스 검증이 관리자 화면의 기본 브라우저 대화상자 회귀를 차단하도록 보강 |
| - | - | PMS 레이아웃 | **LAY-03 설정 화면 셸 경로 계약 보강**: `/settings` 직접 진입도 PMS 공용 셸로 들어와 설정 MDI 탭을 열도록 연결하고, ContentArea 설정 화면 매핑과 헤더 브레드크럼, `verify:pms-launch` 소스 검증을 추가 |
| - | - | PMS AI/RAG | **AI-RAG-08B provider-ready evidence recorder 추가**: PMS provider-ready runtime report 검증 이후 digest-bound evidence block artifact 와 PMS planning 문서 기록 dry-run/record 경로를 실행하는 recorder를 추가하고 `complete:pms-ai-rag-provider-ready`에 연결. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |

### 2026-07-10

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS AI/RAG | **AI-RAG-08B provider-ready 완료 runner 추가**: PMS provider-ready env precheck, live PMS runtime evidence 생성, provider-ready report 검증을 `complete:pms-ai-rag-provider-ready` 한 경로로 묶고 env-file, Docker runtime, 기존 artifact 재검증, self-test를 제공. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| - | - | PMS AI/RAG | **AI-RAG-08B provider-ready report gate 추가**: PMS provider-ready runtime report verifier, fill-in template, self-test, 루트 실행 스크립트, `verify:pms-launch` 소스 검증을 추가해 project/task/member/status 증빙 JSON의 source status, backfill, job run, retrieval, database audit, embedding count 필드를 고정. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| - | - | PMS DB/검증 | **CONTROL-LEGACY-06 legacy Issue seed 재현성 고정**: PMS demo issue seed 가 활성 `pr_issue_m` 행을 재생성하지 않도록 전환하고, 열린 seed 업무는 정식 이슈·리스크·변경요청으로 생성하며 원본 스냅샷은 legacy archive 로 보존. `verify:pms-launch` 런타임 검증이 전체 프로젝트 cleanup 활성 0건을 확인 |
| - | - | PMS 통제/API/검증 | **CONTROL-LEGACY-05 legacy Issue 열린 행 일괄 정식 전환**: 프로젝트 단위로 열린 기존 `Issue` cleanup 행을 정식 이슈·리스크·변경요청으로 전환하고, 원본 행은 `canonicalized_cleanup` 보존 아카이브 후 비활성화하는 API와 화면 액션을 추가. `verify:pms-launch` 런타임 검증이 전환 카운트와 cleanup 카운트 감소를 확인 |
| - | - | PMS 통제/API/검증 | **CONTROL-LEGACY-04 legacy Issue 완료 행 일괄 숨김**: 프로젝트 단위로 `resolved`/`closed` 기존 `Issue` cleanup 행을 보존 아카이브 후 비활성화하는 API와 화면 액션을 추가하고 `verify:pms-launch` 런타임 검증에 포함. 열린 cleanup 행은 정식 통제 항목 전환 대상으로 유지 |
| - | - | PMS 통제/API/검증 | **CONTROL-LEGACY-03 legacy Issue cleanup 요약 고정**: 기존 `Issue` cleanup 요약 API와 화면 지표를 추가해 활성 cleanup, 열린 대상, 완료 상태, 숨김 보존 건수와 물리 제거 가능 여부를 서버 기준으로 표시하고 `verify:pms-launch` 런타임에서 확인한다. 물리 테이블 제거는 활성 cleanup 0건 확인 이후 별도 migration 으로 유지 |
| - | - | PMS 통제/API/DB | **CONTROL-LEGACY-02 legacy Issue 아카이브 정책 고정**: 기존 `Issue` 숨김 cleanup 은 원본 행을 비활성화하기 전에 보존 아카이브 스냅샷과 이력 레코드를 남긴다. 원본 테이블은 런칭 cleanup 조회용으로 유지하며, 물리 테이블 제거는 활성 cleanup 대상 0건 확인 이후 별도 migration 으로 분리 |
| - | - | PMS 통제/API | **CONTROL-LEGACY-01 legacy Issue 신규 생성 폐기**: 기존 `Issue` POST 신규 생성은 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED`로 차단하고, PMS 웹 create API/mutation hook/create request 타입과 TypeDoc 표면을 제거. 기존 행 조회·상태 변경·숨김·정식 전환은 cleanup 인박스로 보존 |
| - | - | PMS 산출물/종료조건 | **CLOSE-APPROVAL-01 closeout 승인선 1차**: 산출물·종료조건별 프로젝트 멤버 기반 1~5단계 승인선 저장, 지정 승인자 승인/반려, 최종 승인 시 산출물 승인 또는 종료조건 완료 반영을 DB/API/화면에 추가하고 보호 마이그레이션과 `verify:pms-launch` 런타임 검증에 고정. 전사 결재 엔진과 DMS 파일 검토 연동은 후속 |
| - | - | PMS 산출물/종료조건 | **CLOSE-TPL-04 템플릿 append/replace 적용 정책**: 산출물·종료조건 템플릿 선택 적용에서 append/replace 모드를 제공. append는 기존 활성 항목을 유지하고, replace는 선택 템플릿 밖 기존 활성 항목을 소프트 비활성화한다. 화면 선택과 `verify:pms-launch` 런타임 검증에 고정 |

### 2026-07-09

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 산출물/종료조건 | **CLOSE-STAT-01 산출물 완료 상태 어휘 통합**: 산출물 완료 판정을 `confirmed`/`approved`/`not_required`로 통합하고, `before_submit`/`final` 호환 입력은 런타임 표준 상태로 정규화. 종료조건 체크 가드와 전환 준비도 완료 집계가 `confirmed` 산출물을 완료로 인정하는지 `verify:pms-launch` 런타임에서 확인 |
| - | - | PMS 산출물/종료조건 | **CLOSE-TPL-03 템플릿 관리 화면·승인·복구 1차**: 관리자 템플릿 관리 화면과 전용 API를 추가해 산출물·종료조건 그룹 편집, 초안·승인·보관, 버전 증가, 이력 조회·복구, 보관 그룹 조회를 제공. DB migration, 시드, history trigger, `verify:pms-launch` 정적·런타임 검증에 고정. Closeout 승인선은 이후 2026-07-10 항목에서 1차 구현 |
| - | - | PMS 산출물/종료조건 | **CLOSE-TPL-02 템플릿 그룹 선택·저장 1차**: 산출물·종료조건 탭에서 저장된 템플릿 그룹을 선택 적용하고 현재 목록을 새 그룹으로 저장하는 UX와 API를 추가. 종료조건 그룹 항목은 산출물 필요 여부를 정식 컬럼으로 보존하며, `verify:pms-launch`가 그룹 저장·목록 조회·선택 적용을 Docker 런타임에서 확인 |
| - | - | PMS 산출물/종료조건 | **CLOSE-TPL-01 기본 템플릿 적용 1차**: 산출물·종료조건 탭에서 현재 단계 기본 템플릿을 적용하는 버튼과 API를 추가. 서버는 그룹 마스터가 있으면 우선 사용하고, 없으면 상태별 기본 세트를 append 방식으로 생성한다. 템플릿 선택·저장과 전용 관리 화면은 같은 날짜 후속 항목에서 보강됨 |
| - | - | PMS 런칭 QA/PMR·PRR | **LAUNCH-QA-07 PMR/PRR 화면 갱신 안정화**: 이벤트 생성·상태 변경 mutation 성공 응답을 활성 이벤트 목록 캐시와 PMR/PRR 활성 행 상태에 즉시 반영해, 누적 데이터 Docker 환경에서도 같은 예약 행의 승인 요청·승인·발행 완료 상태 전환이 화면과 브라우저 QA에 바로 표시되도록 보강 |
| - | - | PMS/CRM 경계 검증 | **BOUND-18 CRM 인계 경계 런칭 검증 보강**: `verify:pms-launch`가 PMS 웹의 CRM 계약 후보·PMS 인계 preview 접근이 읽기 전용인지 정적으로 확인하고, Docker 런타임에서는 준비 완료 CRM preview만 PMS 계약/대금/accepted handoff 스냅샷으로 반영되는지 확인. CRM 계약/청구 원장 쓰기와 PMS 신규 프로젝트 자동 생성은 제외 |
| - | - | PMS 런칭 QA/PMR·PRR | **LAUNCH-QA-06 PMR/PRR 상태 전환 QA 안정화**: PMR/PRR 발행·승인 원장 행에 안정 이벤트 ID와 상태 코드 식별자를 추가하고, 브라우저 QA가 누적 원장 환경에서도 같은 예약 행의 승인 요청·승인·발행 완료 전환을 상태 코드 기준으로 확인하도록 보강 |
| - | - | PMS AI/RAG | **AI-RAG-08B evidence summary 추가**: PMS project/task/member/status 런타임 evidence verifier가 공용 AI object, chunk, ACL snapshot, index state, retrieval audit 결과를 JSON report 와 Markdown summary 로 함께 산출하도록 보강. 현재 Docker 런타임은 provider-unavailable 증빙이며 provider-ready vector/RAG artifact 는 계속 잔여 |
| - | - | PMS 리뷰/피드백/QA | **REPORT-14 리뷰 탭 최근 항목 렌더링 안정화**: PMR/PRR 원장, 수집된 런칭 피드백, 보고/리뷰 이벤트를 최근 20건 중심으로 표시하고 전체 건수는 유지. 브라우저 QA는 제한된 원장에서도 기대 상태와 전환 액션을 확인하도록 보정 |
| - | - | PMS 통제/API | **CONTROL-UI-04 legacy Issue 인박스 축소**: 프로젝트 상세 컨트롤 탭의 기존 `Issue` 호환성 인박스를 열린 cleanup 대상 기본 보기로 축소하고, 완료/전환 행은 선택 이력으로 접음. 기존 Issue 삭제 동작은 물리 삭제가 아니라 비활성화/숨김 처리로 전환. 신규 생성 API/웹 계약은 2026-07-10 CONTROL-LEGACY-01에서 폐기했고, 보존 아카이브 정책은 2026-07-10 CONTROL-LEGACY-02에서 고정. 물리 테이블 제거는 활성 cleanup 대상 0건 확인 이후 별도 migration |
| - | - | PMS 리뷰/피드백/API | **REPORT-13 PMR/PRR 만기 예약 자동 rollover 추가**: 서버 백그라운드 worker가 예약 시간이 지난 PMR/PRR 발행 예정 이벤트를 승인 요청 상태로 자동 전환하고 승인자 알림을 발송. 프로젝트 단위 운영 트리거와 런칭 검증이 같은 rollover 경로를 확인 |
| - | - | PMS 리뷰/피드백 | **REPORT-12 PMR/PRR 승인자 제한 추가**: 프로젝트 상세 리뷰/피드백 탭과 이벤트 API에서 PMR/PRR 승인 요청 이후 승인·반려를 지정 승인자만 처리하도록 제한하고, 런칭 검증과 브라우저 QA가 현재 사용자 승인자 경로와 비승인자 API 거부를 확인 |

### 2026-07-08

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 리뷰/피드백 | **REPORT-11 PMR/PRR 결재선·수신 정책 추가**: 프로젝트 상세 리뷰/피드백 탭에서 결재선 정책과 알림 수신 정책을 선택하고, 프로젝트 이벤트에 정책 증적을 남기며 승인자·프로젝트 담당자·활성 멤버에게 정책별 PMS 공통 알림을 발송 |
| - | - | PMS 리뷰/피드백 | **REPORT-10 PMR/PRR 반복 예약·승인자 알림 추가**: 프로젝트 상세 리뷰/피드백 탭에서 주간/월간 반복 예약 차수를 한 번에 생성하고 프로젝트 멤버 승인자를 이벤트 owner 로 지정해 PMS 공통 알림을 발송 |
| - | - | PMS 리뷰/피드백 | **REPORT-09 PMR/PRR 발행·승인 워크플로우 1차 추가**: 프로젝트 상세 리뷰/피드백 탭에서 주간/월간 발행 건을 예약하고 승인 요청·승인·반려·발행 완료 상태를 프로젝트 이벤트로 전환 |
| - | - | PMS 리뷰/피드백 | **REPORT-08 PMR/PRR 발행 원장 1차 추가**: 프로젝트 상세 리뷰/피드백 탭에서 현재 PMR/PRR 준비도 판정을 프로젝트 이벤트 기반 발행 원장으로 기록하고 이력을 모바일 카드와 데스크톱 표로 확인 |
| - | - | PMS 리뷰/피드백 | **REPORT-07 PMR/PRR 준비도 화면 추가**: 프로젝트 상세 리뷰/피드백 탭에서 산출물, 종료조건, 일반 통제 이슈, 리스크, 변경요청, 인수인계, launch feedback 의 충족/확인 필요 상태를 화면에서 바로 판정 |
| - | - | PMS/CRM 경계 | **BOUND-16 CRM 계약 인계 스냅샷 수용**: 프로젝트 상세 인수인계 탭에서 준비 완료 CRM 계약 preview를 `/api/projects/:id/contracts/crm-handoff-snapshot`으로 기존 프로젝트 계약/대금/accepted handoff 스냅샷에 반영. CRM 계약 원장 소유권, PMS 신규 프로젝트 자동 생성, 계약/청구 직접 편집은 제외 |
| - | - | PMS 리뷰/피드백 | **REPORT-06 PMR/PRR 초안 다운로드 추가**: 프로젝트 상세 리뷰/피드백 탭에서 현재 PMS 실행 데이터 기준 PMR/PRR Markdown 초안을 다운로드. 산출물, 종료조건, 통제 이슈, 리스크, 변경요청, 인수인계, launch feedback 상태를 묶음 |
| - | - | PMS 리뷰/피드백 | **REPORT-05 launch feedback 공유 스냅샷 추가**: 프로젝트 상세 리뷰/피드백 탭에서 현재 보고/리뷰 이벤트, 수집된 launch feedback 이슈, 확인 필요 신호를 Markdown 스냅샷으로 다운로드. 이 파일은 런칭 피드백 공유용이며 PMR/PRR 자동 보고서나 기존 PMS 전체 보고 자동화 완료로는 주장하지 않음 |
| - | - | PMS/CRM 경계 | **MVP0-01 고객사 선택지 조직 앵커 표시 통일**: 요청 등록, 프로젝트 기본정보, 기준정보 관리의 고객사 선택지가 공통 포매터로 고객사 코드와 공용 조직명/코드를 표시하도록 정리. 조직 식별자만 있을 때는 숫자 ID 대신 정보 조회 필요 상태로 표시하며, 고객사 원장 편집과 공용 조직 full cutover 는 계속 잔여 |
| - | - | PMS 유틸리티/경계 | **UTL-01 표시 포맷 유틸 정리**: PMS 런칭 화면의 날짜/일시/숫자/금액/건수 표시를 공통 포맷 유틸로 통일하고, 전환 목록 운영 담당자 숫자 ID 노출을 지정 여부 표시로 차단. `verify:pms-launch`가 주요 화면의 직접 로케일 포맷 회귀와 담당자 숫자 ID 재노출을 확인 |
| - | - | PMS AI/RAG | **AI-RAG-08B demo status seed 추가**: PMS projectStatus runtime evidence 가 새 Docker 환경에서도 검증 대상을 확보하도록 데모 프로젝트 상태 상세 시드를 추가하고 apply_all_seeds, db-seed, 런칭 검증 게이트에 연결 |
| - | - | PMS AI/RAG | **AI-RAG-08B member/status projection 추가**: PMS project member/status 를 독립 AI index entity 로 투영하고, runtime evidence gate 가 project/task/member/status 공용 AI 객체, 청크, ACL snapshot, index state, retrieval audit 를 모두 검증하도록 확장. provider-ready 실증 artifact 는 잔여 |
| - | - | 전역 UI 표준 | **STYLE-GATE-02 최종 페이지 내부 확장**: `verify:ui-style-boundary`를 app globals, 모든 웹 앱 `components/pages/**` 최종 페이지와 주요 App Router page/error surface까지 확장하고, PMS 최종 페이지의 raw Tailwind 색상/arbitrary typography 및 raw `white`/`black` token을 semantic SSOO token으로 정리 |
| - | - | PMS AI/RAG | **AI-RAG-08B evidence gate 추가**: PMS project/task backfill 을 런타임에서 큐잉·실행하고 공용 AI 객체, 청크, ACL snapshot, index state, retrieval audit 를 검증하는 evidence gate 를 추가. 이 시점의 member/status projection 잔여는 이후 같은 날짜 member/status projection 항목에서 해소 |
| - | - | PMS API | **API-01 PMS API 오류 코드 정규화**: PMS 런칭 API 경로의 전역 오류 응답을 `PMS_*` 상세 코드, 실패 경로, HTTP 상태 메타데이터로 정리. 대표 프로젝트 식별자 오류는 `PMS_INVALID_IDENTIFIER` 런타임 검증에 포함했으며, CRM/Admin/공용 원장 오류 소유권 확장으로 주장하지 않음 |

### 2026-07-07

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 리뷰/피드백 | **REPORT-04 launch feedback 처리 루프 추가**: 프로젝트 상세 리뷰/피드백 탭에서 수집된 launch feedback 이슈를 별도 목록으로 보고 상태 변경·해결 처리할 수 있도록 보강. 프로젝트 이슈 변경 시 홈 피드백 요약을 갱신하고, 런칭 브라우저 QA가 등록한 피드백 이슈의 해결 버튼을 실제 클릭해 상태 변경을 확인 |
| - | - | PMS 홈 | **DASH-01 리스크/리포트 집계 위젯 추가**: PMS 홈 요약 API가 열린 리스크, 상위 위험, 담당 미지정 리스크, 차단 이슈, 변경 요청, 보고/리뷰 이벤트 준비도, 지연 마일스톤, 산출물 대기, 종료/전환 막힘을 집계하고 홈 화면의 `리스크/리포트 집계` 위젯으로 노출. `verify:pms-launch`가 소스와 런타임 응답을 확인하며, PMR/PRR 자동 보고 완료로는 주장하지 않음 |
| - | - | PMS 레이아웃 | **LAY-02 헤더 브레드크럼 추가**: PMS 헤더가 활성 MDI 탭 기준으로 `PMS / 홈`, `PMS / 프로젝트 상세`, 통합 검색, 개인 설정 등 현재 화면 문맥을 표시. `verify:pms-launch` 소스 검증과 브라우저 QA가 홈/상세/요청 등록 헤더 문맥 회귀를 확인 |
| - | - | 전역 UI 표준 | **STYLE-GATE-01 전역 style boundary 적용**: PMS 로컬 page/datagrid 호환 surface에서 gray 계열 직접 토큰을 semantic SSOO token으로 정리하고, 앱별 font/theme/Tailwind/domain reusable surface drift를 `verify:ui-style-boundary`에서 차단하도록 공용 게이트에 연결 |
| - | - | PMS 홈 | **HOME-03 launch feedback 운영 가시성 추가**: 리뷰 탭에서 수집된 열린 launch feedback 이슈를 홈의 피드백 지표와 리뷰 탭 대상 운영 신호로 분리해 표시. 기존 보고/PMO/PMR/PRR 자동화 완료로는 주장하지 않음 |
| - | - | PMS 런칭 QA/통제 전환 | **LAUNCH-QA-04 legacy Issue 전환 클릭 리허설 추가**: 당시 브라우저 QA는 프로젝트 상세 컨트롤 탭에 QA 전용 기존 `Issue` 행을 만들고 화면의 정식 전환 버튼을 실제 클릭해 정식 이슈 생성과 기존 행 종료 상태를 확인했다. 이후 2026-07-10 `CONTROL-LEGACY-01`에서 신규 생성 차단 확인 방식으로 대체 |
| - | - | PMS/Admin 공용 UI | **DATA-UI-02 데이터 워크스페이스 헤더 통합**: `SsooDataWorkspacePage`의 action/filter controls 를 별도 toolbar card 가 아니라 full-width page header chrome 내부에 배치하도록 전환. 본문 `contentWidth` 제한은 grid/main content 에만 적용하고 header 폭은 플랫폼 page chrome 기준을 유지 |
| - | - | PMS 통제 | **CONTROL-UI-03 legacy Issue 수동 전환**: 프로젝트 상세 컨트롤 탭의 기존 `Issue` 호환성 인박스에서 유형에 따라 정식 이슈, 리스크, 변경요청을 생성하고 기존 행을 종료 처리하는 1차 cleanup 동선을 추가. `verify:pms-launch`가 전환 액션과 정식 mutation 의존성을 확인 |
| - | - | PMS/CRM 경계 | **BOUND-16 CRM 계약 인계 preview 소비**: 프로젝트 상세 인수인계 탭에서 CRM 계약 후보를 검색하고 선택 계약의 PMS 인계 preview를 읽기 전용으로 조회하도록 추가. PMS 프로젝트 생성, 계약/청구 편집, CRM 원장 소유권 확장은 제외 |
| - | - | PMS 상세 closeout | **CLOSE-03 closeout 처리 큐**: 프로젝트 상세 closeout 패널에 현재 단계의 미해결 산출물과 종료조건을 읽기용 처리 큐로 노출하고, 각 큐 항목에서 산출물/종료조건/리뷰 관리 탭으로 이동하도록 보강. 브라우저 QA와 `verify:pms-launch`가 처리 큐와 탭 이동 회귀를 확인 |
| - | - | PMS 상세 closeout | **CLOSE-02 closeout 조치 바로가기**: 프로젝트 상세 closeout 패널에서 산출물, 종료조건, 리뷰/피드백 탭으로 바로 전환하고 해당 관리 영역으로 스크롤되는 조치 동선을 추가. 브라우저 QA와 `verify:pms-launch`가 바로가기 회귀를 확인 |
| - | - | PMS 런칭 QA/피드백 저장 | **LAUNCH-QA-03 리뷰 탭 저장 리허설 추가**: 브라우저 QA가 프로젝트 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 실제 등록하고, 저장 후 피드백 큐와 보고/리뷰 이벤트 목록에 표시되는지 desktop/mobile 기준으로 확인 |
| - | - | PMS/Admin 공용 UI | **DATA-UI-01 데이터 워크스페이스 공용화**: PMS 요청 목록 기준선의 action/filter toolbar, 접힘 필터, DataGrid, pagination, 세컨 그리드 패널을 `@ssoo/web-shell`의 `SsooDataWorkspacePage`/`SsooDataGrid`로 승격하고, Admin 사용자/조직 관리가 같은 데이터 화면 shell을 소비하도록 전환 |
| - | - | PMS 런칭 QA/상세 화면 | **LAUNCH-QA-02 홈→상세 리허설 QA 확대**: 프로젝트 상세 상태/관리 탭 레일을 작은 화면에서 가로 스크롤되도록 보강하고, 브라우저 QA가 홈에서 프로젝트 상세로 진입해 태스크, 마일스톤, 컨트롤, 산출물, 종료조건, 인수인계, 리뷰 탭을 desktop/mobile 기준으로 실제 확인하도록 확장 |

### 2026-07-06

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 런칭 QA/API | **LAUNCH-QA-01 브라우저 QA 기반 목록 API 400 정리**: PMS 고객/프로젝트/실행 자산 목록 요청이 서버 계약에 없는 `pageSize`를 함께 보내지 않고 `limit`만 보내도록 정리해 런칭 화면의 400 응답을 제거. PMS 전용 한국어 시스템 글꼴 스택을 보강하고, 브라우저 QA 산출물은 실제 사이드바 흐름 기준으로 홈과 요청 등록 화면을 확인하도록 조정 |
| - | - | PMS 런칭 표시/경계 | **BOUND-15 내부 ID fallback 표시 제거**: PMS 상태별 목록, 작업 큐, 홈, 프로젝트 기본정보, 조직/관계 섹션, 요청 보조 그리드, 담당자 선택 fallback 이 숫자 내부 ID를 직접 보여주지 않고 이름·코드 우선 또는 정보 조회 필요 상태로 표시되도록 정리. 저장 필드와 API 식별자는 유지하되 사용자 표면의 raw ID 회귀는 `verify:pms-launch` 정적 검증에서 차단 |
| - | - | PMS 실행 상세/경계 | **BOUND-14 후속 프로젝트 lookup 선택 전환**: 실행 상세의 후속 프로젝트 입력/표시를 숫자 프로젝트 ID 직접 입력에서 접근 가능한 프로젝트명/번호 검색 선택으로 전환. 기존 `nextProjectId` successor 호환 동기화는 유지하되, 사용자 표면의 직접 ID 입력 회귀는 `verify:pms-launch` 정적 검증에서 차단 |
| - | - | PMS 상태별 목록/경계 | **BOUND-13 고객 필터 조회 선택 전환**: 요청/제안/수행/전환 목록의 고객사 필터를 숫자 ID 직접 입력에서 읽기용 고객 조회 선택으로 전환하고, 고객 열과 fallback 표시가 숫자 고객 ID에 의존하지 않도록 보강. PMS는 고객사 원장 편집을 소유하지 않으며, `verify:pms-launch` 정적 검증에서 회귀를 차단 |
| - | - | PMS 기준정보/경계 | **BOUND-12 기준정보 반입 코드 우선 템플릿**: PMS 실행 자산 기준정보 CSV/TSV 템플릿을 고객사/사이트/시스템 코드 기반으로 내려받게 하고, 숫자 ID 컬럼은 기존 파일 호환 매핑으로만 유지. PMS는 고객사 원장 편집을 소유하지 않으며, `verify:pms-launch` 정적 검증에서 코드 우선 템플릿 기준을 확인 |
| - | - | PMS 계획/작업 | **TASK-UI-01 목표/WBS/작업·마일스톤 모바일 사용성 보강**: 프로젝트 상세 목표/WBS/작업/마일스톤을 모바일 카드 목록으로 제공하고 상태·연결·진척을 작은 화면에서 확인/변경할 수 있게 보강. 각 등록 다이얼로그와 상단 액션은 작은 화면에서 스크롤·전체폭 버튼으로 동작하며, `verify:pms-launch` 정적 검증에서 확인 |
| - | - | PMS 산출물/종료조건 | **CLOSE-UI-02 산출물·종료조건 모바일 사용성 보강**: 프로젝트 상세 산출물 탭을 모바일 카드 목록으로 제공하고 제출상태·연결 이벤트를 모바일에서 변경할 수 있게 보강. 산출물/종료조건 등록 다이얼로그와 상단 액션은 작은 화면에서 스크롤·전체폭 버튼으로 동작하며, `verify:pms-launch` 정적 검증에서 확인 |
| - | - | PMS 통제 | **CONTROL-UI-02 legacy Issue 호환성 인박스 모바일 보강**: 프로젝트 상세 컨트롤 탭의 기존 `Issue` 호환성 인박스를 모바일 카드 목록으로 제공하고, 새 작성은 정식 통제 패널로 유도한다는 기준을 유지. `verify:pms-launch` 정적 검증에서 legacy 인박스 모바일 카드와 canonical 작성 경로 문구를 확인 |
| - | - | PMS 통제 | **CONTROL-UI-01 통제 객체 모바일 사용성 보강**: 프로젝트 상세 통제 탭의 이슈/요구사항/리스크/변경/이벤트를 모바일 카드 목록으로 제공하고, 각 등록 다이얼로그가 작은 화면에서 스크롤되도록 보강. `verify:pms-launch` 정적 검증에서 통제 객체 모바일 카드와 다이얼로그 제약을 확인 |
| - | - | PMS 리뷰/피드백 | **REPORT-03 모바일 피드백 사용성 보강**: 프로젝트 상세 리뷰/피드백 탭의 보고 이벤트와 피드백 큐를 모바일 카드 목록으로 제공하고, 피드백 이슈/리뷰 이벤트 등록 다이얼로그가 작은 화면에서 스크롤되도록 보강. `verify:pms-launch` 정적 검증에서 모바일 카드와 다이얼로그 제약을 확인 |
| - | - | PMS 인수인계 | **BOUND-11 인수인계 배정 역할 선택 전환**: PMS 인수인계 등록 화면이 배정 역할을 텍스트 코드로 직접 입력받지 않고 활성 프로젝트 멤버 역할 코드에서 선택하도록 전환. 기존 인계 목록은 멤버명/역할명을 우선 표시하며, `verify:pms-launch` 정적 검증에서 회귀를 차단 |
| - | - | PMS 단계 상세 | **BOUND-10 단계별 담당자 프로젝트 멤버 선택 전환**: 요청/제안/전환 상세 담당자 화면이 숫자 사용자 ID 직접 입력 대신 현재 프로젝트 멤버를 선택하도록 전환. 사용자 원장 생성/수정은 PMS 범위 밖으로 유지하며, `verify:pms-launch` 정적 검증에서 확인 |
| - | - | PMS 프로젝트 관계 | **BOUND-09 프로젝트 관계 lookup 선택 전환**: PMS 프로젝트 직접 관계 추가 화면이 숫자 프로젝트 ID 직접 입력 대신 프로젝트명/번호 검색 결과를 선택하도록 전환. 프로젝트 간 관계 관리는 PMS 실행 프로젝트 책임으로 유지하며, `verify:pms-launch` 정적/런타임 검증에서 확인 |
| - | - | PMS 멤버/경계 | **BOUND-08 프로젝트 멤버 사용자 lookup 선택 전환**: PMS 프로젝트 멤버 추가 화면이 숫자 사용자 ID 직접 입력 대신 프로젝트 문맥의 활성 공용 사용자 lookup 결과를 선택하도록 전환. PMS는 사용자 원장을 생성/수정하지 않으며, 선택 사용자의 1차 소속 조직 앵커를 멤버 배정에 전달하고 `verify:pms-launch` 정적/런타임 검증에서 확인 |
| - | - | PMS/CRM 경계 | **BOUND-07 프로젝트 연결 조직 lookup 선택 전환**: PMS 프로젝트 조직 supplier/partner 추가 화면이 숫자 조직 ID 직접 입력 대신 프로젝트 문맥의 읽기 전용 공용 조직 lookup 결과를 선택하도록 전환. PMS는 조직 원장을 생성/수정하지 않으며, `verify:pms-launch` 정적/런타임 검증에서 확인 |
| - | - | PMS 프로젝트 | **MVP0-01 프로젝트 실행 자산 앵커 표시 정리**: PMS 프로젝트 목록/상세/생성/수정 응답이 plant/site와 system instance 이름·코드를 읽기 전용으로 반환하고, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면 및 `verify:pms-launch` 런타임 검증에서 확인 |
| - | - | PMS/CRM 경계 | **MVP0-01 프로젝트 고객 공용 조직 앵커 투영**: PMS 프로젝트 목록/상세/생성 응답이 고객명과 공용 조직 앵커 메타데이터를 읽기 전용으로 반환하고, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면 및 `verify:pms-launch` 런타임 검증에서 확인. 고객사 원장 편집과 공용 조직 full cutover 는 계속 잔여 |
| - | - | PMS 문서/검증 | **DOC-REF-01 TypeDoc reference 현행화**: PMS 서버/웹 TypeDoc reference 를 최신 소스로 재생성해 제거된 고객사 쓰기 DTO, 고객사 mutation hook, 고객사 관리 화면 문서를 삭제하고, `verify:pms-launch` 가 stale reference 회귀를 차단하도록 보강 |
| - | - | PMS 런칭 UI | **UI-LAUNCH-02 가짜 삭제 액션 제거**: 요청/제안/수행/전환 legacy 목록에서 실제 동작 없는 삭제 alert 버튼을 제거하고, 노출 PMS 메뉴 경로가 실제 화면 컴포넌트에 매핑되는지 `verify:pms-launch` 에서 고정 |
| - | - | PMS/CRM 경계 | **MVP0-01 고객사 공용 조직 앵커 1차 투영**: PMS 고객사 읽기 조회가 공용 조직 앵커 메타데이터를 반환하고, 공용 조직 코드/명 검색과 프로젝트/요청/기준정보 선택지 연결 표기 및 `verify:pms-launch` 런타임 검증을 추가. 고객사 원장 편집과 공용 조직 full cutover 는 계속 잔여 |
| - | - | DB/검증 | **MIG-02 PMS core reconciliation protected baseline 고정**: 프로젝트 멤버·조직·관계, 인수인계, 계약 읽기 스냅샷, 목표/WBS/작업, 이슈·요구사항·리스크·변경·이벤트 및 history table formal migration 을 db-init protected baseline 적용 경로에 묶고, `verify:pms-launch` 가 migration 내용·CRM 원장 비소유 경계·db-init coverage 를 소스 기준으로 확인 |
| - | - | DB/검증 | **MIG-01 formal migration protected baseline 고정**: PMS 실행 자산 기준정보와 공유 반입 프로필 formal migration 을 db-init protected baseline 적용 경로에 묶고, `verify:pms-launch` 가 migration 내용·CRM 원장 비소유 경계·db-init coverage 를 소스 기준으로 확인 |
| - | - | PMS 홈 | **HOME-02 launch feedback 진입 동선 추가**: 홈 요약의 권한 기반 액션에 `리뷰/피드백`을 추가하고, 바로 이동에서 프로젝트 리뷰 탭으로 직접 진입하도록 연결. `verify:pms-launch` 런타임 smoke 가 홈 요약 응답의 review feedback action 을 확인 |
| - | - | PMS 상세 | **REPORT-02 launch feedback 수집 표면 추가**: 프로젝트 상세 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 직접 등록해 사용자 확인 사항을 기존 정식 이슈/프로젝트 이벤트 API로 저장. `verify:pms-launch` 런타임 smoke 가 실제 생성·조회·정리 흐름을 확인 |
| - | - | PMS/CRM 경계 | **MVP0-01 고객사 쓰기 표면 제거**: PMS 관리자 고객사 CRUD 화면, 고객사 생성/수정/비활성화 API, 웹 mutation, PMS 고객사 쓰기 DTO export 를 제거하고 프로젝트 생성·기준정보 선택용 읽기 조회만 유지. 고객사 원장 편집은 CRM/Admin/공용 조직 책임이며 공용 Organization cutover 는 계속 잔여 |

### 2026-07-03

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 레이아웃 | **LAY-01 모바일 레이아웃 1차 구현**: 모바일 준비 중 차단 화면을 제거하고 헤더 메뉴 버튼, 오버레이 사이드바, 탭바, 콘텐츠 유지형 레이아웃을 추가. 개별 업무 화면의 모바일 표/폼 밀도 개선은 별도 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 공유 매핑 이력 조회/복구 1차 추가**: 기준정보 CSV/TSV 반입의 서버 공유 매핑 프로필 히스토리를 조회하고 선택 이력으로 복구하는 API/화면/런타임 smoke 를 추가. 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 공유 매핑 기본 지정 UI 추가**: 기준정보 CSV/TSV 반입의 서버 공유 매핑 프로필을 기본 프로필로 지정/해제하고 저장 payload 에 반영하도록 화면을 보강. 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 서버 공유 매핑 프로필 1차 추가**: 기준정보 CSV/TSV 반입 매핑을 서버 테이블/API/화면에서 저장·조회·수정·삭제하고 `verify:pms-launch` 런타임 smoke 로 검증. 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 반입 템플릿·매핑 재사용 1차 추가**: 기준정보 CSV/TSV 반입에 대상별 템플릿 다운로드, 브라우저 로컬 컬럼 매핑 저장·불러오기·삭제를 추가. 서버 공유 매핑 프로필 CRUD/재사용 1차도 추가됐고, 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 파일 반입 UX 1차 추가**: 기준정보 반입 화면에 CSV/TSV 파일 업로드, 반입 대상 선택, 컬럼 자동 매핑, 행 미리보기를 추가. 적용은 기존 dry-run/apply import API를 사용하며 서버 공유 매핑 프로필 CRUD/재사용 1차도 추가됨. 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 반입/병합 1차 추가**: Plant/Site, System Catalog, System Instance, Integration 에 대해 JSON 기반 dry-run/apply 반입 API, 코드 참조 기반 관계 해석, 기존 코드 갱신 옵션, 관리자 반입 다이얼로그, `verify:pms-launch` 런타임 반입/merge smoke 를 추가. CSV/TSV 업로드·컬럼 매핑과 서버 공유 매핑 프로필 1차가 추가됐고, 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 프로젝트 | **기준정보 선택 검증 1차 추가**: 요청 등록과 프로젝트 기본정보 편집에서 Plant/Site, System Instance 선택을 기준정보 API와 연결하고, 서버 create/update 가 customer-site-instance 조합을 검증·보정하도록 반영. `verify:pms-launch` 는 런타임에서 anchor 포함 프로젝트 생성·수정·삭제 smoke 를 확인 |
| - | - | PMS 기준정보 | **MVP0-01 관리자 CRUD 1차 추가**: Plant/Site, System Catalog, System Instance, Integration 에 대해 관리자 생성·수정·비활성화 API, React Query mutation, 기준정보 화면 편집 다이얼로그, `verify:pms-launch` 비읽기 전용 런타임 쓰기 smoke 를 추가. 대량 import/merge, 공용 Organization cutover 는 계속 잔여 |
| - | - | PMS 기준정보 | **MVP0-01 1차 착수**: Plant/Site, System Catalog, System Instance, Integration 을 PMS 실행 자산 기준정보로 분리하고 스키마·이력 트리거·시드·서버 목록 API·관리자 조회 화면·`verify:pms-launch` 런타임 smoke 를 추가. 기준정보 CRUD 전체와 프로젝트 생성 흐름 선택 검증은 아직 잔여 |
| - | - | PMS 멤버 | **멤버 역할 코드 테이블 전환 완료**: 프로젝트 멤버 추가 화면의 역할 선택을 `PROJECT_MEMBER_ROLE` 활성 코드 기반으로 고정하고 정적 fallback 역할 목록을 제거. `verify:pms-launch` 가 코드 시드, 화면 의존성, 런타임 코드 API 조회를 함께 확인 |
| - | - | PMS 상세 | **보고/리뷰 이벤트 요약 1차 화면 추가**: 프로젝트 상세 관리 탭에 리뷰를 추가해 보고/리뷰/회의/인계 이벤트, 연결 산출물·종료조건 readiness, 열린 이슈·리스크·변경·인계 대기 피드백 큐를 읽기용으로 노출. 기존 PMS 전체 보고/PMO/PMR/PRR 자동화는 계속 미완성 범위로 구분 |
| - | - | 검증 | **PMS 런타임 검증 확장 완료**: `verify:pms-launch` 가 관리자 로그인 후 프로젝트 상세, access/readiness, 조직/관계, objective/WBS, 작업, control 객체, 산출물, 종료조건, 인수인계, 계약 스냅샷 API smoke 를 실제 런타임에서 확인 |
| - | - | PMS/CRM 경계 | **런칭 책임 경계 재고정**: 기존 PMS 구축 자료의 영업/계약/청구/매출 범위를 CRM 정본으로 분리하고, PMS는 실행 프로젝트 관리와 CRM 읽기용 스냅샷 소비로 제한 |
| - | - | PMS 상세 | **계약/청구 표시 정책 정리**: 실행 상세의 계약/청구 값은 PMS 편집 대상이 아니라 CRM 정본에서 동기화되는 스냅샷으로 취급 |
| - | - | PMS 상세 | **실행 상세 편집 범위 축소**: 납품 방식, 후속 프로젝트, 메모만 PMS에서 편집하고 계약 체결일/금액/청구 유형은 읽기 전용으로 표시 |
| - | - | PMS 상세 | **인수인계 1차 화면 추가**: 프로젝트 상세 관리 탭에 인수인계를 추가해 인계 목록, 신규 인계 등록, 대기 인계 수락/반려/취소를 처리하고 계약/대금은 읽기용 스냅샷으로 노출 |

### 2026-06-11

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | PMS 홈/권한 | **홈 권한별 action 노출 연결**: `PmsHomeSummary` 에 `allowedActions`, `primaryAction`, `accessProjects` 를 추가하고, 홈 화면이 프로젝트별 `features` capability 기준으로 조치 버튼과 상세 management tab 진입을 동적으로 구성 |
| - | - | PMS 홈/API | **서버 정책 기반 홈 summary 연결**: `GET /api/home/summary` 와 `PmsHomeSummary` 공유 계약을 추가하고, 홈 화면을 프로젝트 access policy 기반 briefing/signal/flow/recent change 소비 구조로 전환 |
| - | - | DB/검증 | **PMS trigger installer coverage 연결**: `apply_all_triggers.sql` 에 handoff/contract/payment/objective/WBS/project org/relation/control/event/project issue history trigger 설치 경로를 포함 |
| - | - | 검증 | **PMS 런칭 검증 확장**: `verify:pms-launch` 가 홈/상세 closeout 외에 access, readiness, org/relation, planning/control/output API surface 와 trigger installer coverage 를 확인 |

### 2026-06-08

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 프로젝트 상세 | **PM 실행 closeout 패널 추가**: 상세 상단에서 다음 액션, 막힌 조건, 종료 가능 여부를 산출물/종료조건 readiness 기준으로 즉시 확인하도록 정리 |
| - | - | 대시보드 | **PM 운영 포커스 위젯 추가**: 수행 프로젝트, 7일 이상 정체, 담당자 미지정, 종료/전환 확인 대상을 홈에서 먼저 노출 |
| - | - | 검증 | **PMS 런칭 검증 스크립트 추가**: `verify:pms-launch` 로 대시보드/상세 closeout surface와 Docker runtime 응답을 확인하는 전용 게이트를 추가 |

### 2026-04-16

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | planning | **current baseline-close brief 추가**: `current-baseline-close-brief.md` 를 추가해 PMS foundation 구현 상태, commit grouping, migration/validation gap, baseline close 이후 다음 tranche 를 병렬 진행용 기준선으로 고정 |
| - | - | planning | **설계 정합화 계획 문서 추가**: `spec-reconciliation-plan.md` 를 추가해 새 PMS 설계와 현재 구현의 장기 정합화 계획, 상세 설계 확정 순서, delivery 구조, `Organization / OrgMember` 우선 검토 기준을 레포 planning 문서로 고정 |
| - | - | planning | **조직 기준선 문서화**: 현재 조직 관련 구조가 `Organization` + `UserOrganizationRelation` + `OrganizationPermission` + `UserPermissionException` + `Project.ownerOrganizationId` + legacy user affiliation bridge 로 운영된다는 점을 `spec-reconciliation-plan.md` 에 명시 |
| - | - | planning | **검토 범위 확장**: `Organization / OrgMember` slice 를 PMS 단독 범위가 아니라 PMS/SNS/DMS 공통 user/auth/access foundation 및 `organizationIds` parity 검토까지 포함하는 cross-app review 로 재정의 |
| - | - | planning | **권한 경계 기준 추가**: 공용 auth/access foundation(`AccessFoundationService`, org baseline, exception, policy trace)과 PMS/SNS/DMS의 도메인 특화 권한 해석 경계를 `spec-reconciliation-plan.md` 에 명시 |
| - | - | planning | **OrgMember 후보 기준선 추가**: `UserOrganizationRelation` 과 user admin/input/inspect surface 가 이미 common affiliation bridge 역할을 하고 있음을 기준선으로 문서화 |
| - | - | 인증/라우팅 | **shell-app entry blueprint 정렬**: `(main)/layout` 을 auth/access gate 전용으로, `(main)/page` 를 실제 `AppLayout` 루트 엔트리로 이동해 DMS와 같은 shell-app 구조로 정리 |
| - | - | 인증/라우팅 | **entry route constants 도입**: `APP_HOME_PATH`, `LOGIN_PATH`, `ROOT_ENTRY_PATHS` 를 추가하고 login/logout/not-found/middleware/global-error 가 같은 경로 계약을 참조하도록 정리 |
| - | - | 문서 | **entry architecture 문서 현행화**: app-initialization-flow, page-routing, page-security-routing, 로그인 관련 도메인 문서를 현재 bootstrap/entry 구조 기준으로 갱신 |
| - | - | planning | **외부 설계서의 명시 해법 반영**: 새 설계가 `Organization(org_class=permanent/project)` + `OrgMember` + `ProjectOrg` 조합을 명시적으로 채택하고 있음을 planning 문서에 반영 |
| - | - | planning | **Organization slice 임시 결정안 반영**: `Organization(org_class)` 방향은 채택하되 shared baseline 은 `permanent` affiliation 만 사용하고, `UserOrganizationRelation` 을 common OrgMember storage 로 승격하며 project 참여/권한은 PMS 도메인 해석으로 유지하는 방향을 기록 |
| - | - | planning | **Handoff/Contract slice 임시 결정안 반영**: standalone `Handoff` 와 `Contract/ContractPayment` 를 채택하되 현재 `Project`/`ExecutionDetail` inline 필드는 compatibility summary/mirror 로 유지하고, 기존 `advanceStage` 엔진은 상위 orchestration 으로 감싸는 방향을 기록 |
| - | - | planning | **Work breakdown slice 임시 결정안 반영**: `Objective/WBS` 를 새 planning hierarchy 로 도입하되 현재 `Task` 는 compatibility hybrid 로 유지하고, `Milestone` 은 먼저 `Objective` 와 연결하는 방향을 기록 |
| - | - | planning | **Project membership/access slice 임시 결정안 반영**: `ProjectMember` 를 additive 확장해 `organizationId/accessLevel/isPhaseOwner` 를 도입하되 `roleCode` 는 기능 역할 vocabulary 로 유지하고, 조직 hierarchy view baseline 과 member edit baseline 을 분리하는 방향을 기록 |
| - | - | planning | **ProjectOrg/external breadth slice 임시 결정안 반영**: external org 는 common `Organization(scope=external)` 으로 수렴시키고 `ProjectOrg` 를 PMS relation 으로 도입하되 기존 `customerId/plantId/systemInstanceId` 는 compatibility anchor 로 유지하는 방향을 기록 |
| - | - | planning | **롤아웃 시퀀스 고정**: 확정된 slice 결정안을 Delivery 1/2/3 + cleanup 형태의 장기 구현 순서와 선행 의존성 요약으로 묶음 |
| - | - | 모델/상태 | **Lifecycle bridge 실반영**: shared PMS contract 와 server response 에 canonical `lifecycle.phase/status/terminalReason` 를 추가하고, 기존 `statusCode/stageCode/doneResultCode` 는 compatibility layer 로 유지 |
| - | - | 조직/권한 | **OrgMember foundation 실반영**: `Organization.orgClass/scope/levelType`, `UserOrganizationRelation.isLeader` 를 추가하고 PMS/SNS/shared access baseline 을 `permanent` affiliation 기준으로 정렬 |
| - | - | 프로젝트 권한 | **ProjectMember/access semantics 실반영**: `ProjectMember.organizationId/accessLevel/isPhaseOwner` 를 도입하고 `ProjectAccessService` 및 PMS member UI/API 를 새 baseline 에 맞게 확장 |
| - | - | 계약/인계 | **Handoff/Contract foundation 실반영**: standalone `ProjectHandoff`, `ProjectContract`, `ContractPayment` 모델과 API 를 추가하고 `Project` handoff summary, `ExecutionDetail` 계약 필드는 compatibility bridge 로 유지 |
| - | - | planning/work | **Objective/WBS foundation 실반영**: standalone `Objective`, `WBS` 모델과 API를 추가하고 `Task.wbsId`, `Milestone.objectiveId` 연결 및 PMS planning panel UI 를 기존 task/milestone 탭 안에 추가 |
| - | - | 조직/breadth | **ProjectOrg foundation 실반영**: `ProjectOrg` 모델/히스토리/API 를 추가하고 `ownerOrganizationId`, `customerId` anchor 를 compatibility bridge 로 동기화하며 PMS project detail 에 연결 조직 summary 를 노출 |
| - | - | 조직/breadth | **ProjectRelation foundation 실반영**: read-only `ProjectRelation` 모델/히스토리/API 와 PMS relation summary surface 를 추가하고, 기존 `nextProjectId` anchor 를 canonical `successor` relation 으로 동기화 |
| - | - | control/ui | **Control object foundation 실반영**: standalone `ProjectRequirement`, `ProjectRisk`, `ProjectChangeRequest`, `ProjectEvent` 모델/히스토리/API 를 추가하고 PMS management tab 을 `컨트롤` 기준으로 전환해 legacy issue surface 와 새 control panels 를 함께 노출 |
| - | - | deliverable/control | **Event-centered output linkage 반영**: `ProjectDeliverable`, `ProjectCloseCondition` 이 선택적으로 `ProjectEvent` 를 참조하도록 schema/history/API 를 확장하고 PMS 산출물/종료조건 탭에서 연결 이벤트를 직접 선택·변경할 수 있게 정리 |
| - | - | planning | **relation/breadth anchor refinement 기준 추가**: `spec-reconciliation-plan.md` 에 `owner/customer -> ProjectOrg`, `nextProjectId -> successor` 만 safe compatibility sync 로 유지하고 `linked` terminal-result, `plant/system` breadth 는 fixed compatibility baseline 위의 후속 refinement 항목으로 기록 |
| - | - | 프로젝트 상세 | **compatibility baseline 명시적 노출**: PMS project detail 의 연결 조직/프로젝트 요약에 현재 safe sync 범위와 유지되는 direct anchor(`linked`, `plant/system`)를 직접 안내하도록 정리 |
| - | - | planning/control | **Legacy Issue transition policy 고정**: `Issue` 를 dual-write/read-only 가 아닌 migration-source compatibility model 로 정하고, `risk -> ProjectRisk`, `requirement_change -> ProjectChangeRequest` 1차 맵핑과 unmapped `bug/impediment/inquiry/improvement` retention, PMS immediate authoring policy 를 planning 문서에 명시 |
| - | - | planning/breadth | **breadth 기본값 확정**: 사용자 응답이 없을 때의 compatibility-first baseline 으로 `doneResultCode=linked` 자동 relation 승격을 하지 않고 `plantId/systemInstanceId` 를 direct project anchor 로 유지한 채 stabilization cleanup 을 계속 진행하도록 planning 문서를 정리 |
| - | - | planning/ui | **stabilization cleanup 실행**: legacy issue create flow 를 unmapped legacy type 위주로 조여 `risk` / `requirement_change` 신규 authoring 을 canonical panel 로 유도하고, project detail wording 과 session plan 을 fixed compatibility baseline 기준으로 정리 |
| - | - | planning/control | **Unmapped legacy issue owner model 확정**: quartet 흡수 대신 additive `ProjectIssue` fifth control object 를 다음 단계 canonical owner 로 정하고, legacy `Issue` 는 migration inbox/promote source 로 축소하는 방향을 기록 |
| - | - | control/ui | **ProjectEvent rollup read-model 반영**: `GET /projects/:id/control/events` 가 linked deliverable/close-condition 기준 `rollup` fragment를 함께 반환하고, PMS Control/Deliverables/CloseConditions 탭이 readiness·count mini-summary를 표시하도록 정리 |
| - | - | control/ui | **ProjectIssue canonical surface 실반영**: additive `ProjectIssue` schema/API/types/hooks/panel 을 반영하고, 신규 `bug/impediment/inquiry/improvement` authoring 을 정식 이슈 패널로 이동. legacy `Issue` 는 secondary compatibility inbox/history surface 로 축소 |
| - | - | 프로젝트 상세 | **breadth canonicalization UI 실반영**: explicit `ProjectRelation(linked)` create/delete 와 supplier/partner `ProjectOrg` add/remove 를 추가하고, owner/customer 및 successor row 는 기준 반영 provenance 로 정리 |
| - | - | planning/ui | **post-refinement cleanup 반영**: Control/Organizations/Relations/Deliverables/CloseConditions wording 을 canonical primary surface 기준으로 정리하고, docs/session plan progress 를 landed state 로 갱신 |

### 2026-04-14

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증/권한 | **공통 permission/runtime contract 정렬 확인**: `ProjectAccessService` 가 `AccessFoundationService` + shared `policy` trace 기준으로 owner/org/member/object exception을 계속 합성하고, DMS reference contract 이후에도 PMS project capability 가 같은 상위 계약으로 설명 가능함을 기준선으로 고정 |

### 2026-04-13

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증/권한 | **PMS 프로젝트 조회 정책 정렬**: `canViewProject` 를 프로젝트 owner, 활성 멤버, owner 조직 소속 사용자, 명시적 project capability 보유 사용자에 한해 허용하도록 보정 |
| - | - | 인증/권한 | **프로젝트 목록/access endpoint 정합성 확보**: `GET /projects` 를 access-aware 목록으로 제한하고 `GET /projects/:id/access` 도 상세 조회와 같은 `canViewProject` 정책을 따르도록 정리 |
| - | - | DB/데모데이터 | **Docker 권한 검증용 PMS 샘플 정렬**: `db:seed` 루프에 누락됐던 PMS demo 멤버/태스크/마일스톤/이슈/산출물 시드를 다시 포함시키고 `17_demo_project_access_context.sql` 로 프로젝트 owner/user org baseline 을 고정 |
| - | - | DB/데모데이터 | **viewer 런타임 검증 계정 추가**: `viewer.han` 데모 계정을 추가해 DMS/SNS viewer snapshot 과 PMS same-org read-only 시나리오를 Docker 기준으로 재현 가능하게 정리 |

### 2026-04-09

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증/권한 | **PMS project object policy 도입**: `owner_organization_id` 와 `pr_project_role_permission_r` 기반으로 project capability snapshot(`/api/projects/:id/access`)을 계산하고, 기본 정보/상세 탭/멤버/작업/산출물/종료조건/단계 진행 UI를 snapshot 기준으로 gating |
| - | - | 인증/권한 | **PMS access contract 명시화**: `/api/menus/my` 응답을 `@ssoo/types/pms` 의 `PmsAccessSnapshot` 기준으로 정렬하고, menu store가 snapshot apply 경계와 `usePmsAccess()` thin wrapper를 통해 navigation-centric access bootstrap 임을 드러내도록 정리 |
| - | - | 인증/권한 | **PMS access lifecycle 분리**: `access.store` 가 `hydrate/reset/isLoading/hasLoaded/error` lifecycle 을 담당하고, `Sidebar` 새로고침과 main shell bootstrap 도 동일한 hydrate 경로를 사용하도록 정리. `menu.store` 는 이 snapshot 을 실제 메뉴/즐겨찾기/navigation 상태로 유지 |

### 2026-04-08

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증 | **auth proxy contract 정규화**: PMS same-origin `/api/auth/[action]` 가 backend envelope를 브라우저까지 그대로 넘기지 않고 payload-only contract로 정리되어 SNS/DMS와 같은 auth adapter 계약을 사용 |
| - | - | 인증 | **same-origin auth proxy 정렬**: PMS가 `/api/auth/[action]` proxy를 통해 login/session/logout/me를 처리하도록 정리해 DMS와 같은 브라우저-facing auth surface를 사용하고, 401 session bootstrap도 same-origin 경유로 통일 |
| - | - | 인증 | **shared session bootstrap 도입**: 공통 auth backend가 HttpOnly `ssoo-session` cookie와 `/api/auth/session` bootstrap endpoint를 제공하도록 정리하고, PMS는 localStorage refresh token 없이 access token/session 복원 흐름으로 전환 시작 |
| - | - | 인증 | **로그인 화면 기준선 고정**: `packages/web-auth` 에 PMS 기준 표준 login card를 추가하고 SNS/DMS도 같은 레이아웃·문구·footer를 공유하도록 정리. 단, 앱별 컬러 토큰은 그대로 유지 |

### 2026-04-07

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증 | **공용 auth user menu 정렬**: PMS `UserMenu`가 `packages/web-auth` 공용 authenticated user menu surface를 재사용하도록 정리해 DMS와 같은 logout/menu shell을 공유 |
| - | - | 인증 | **공용 auth runtime/login UI 전환**: `packages/types` / `packages/web-auth` 기준으로 PMS login page, auth store, loading shell을 공용 surface 위로 재정렬하고 PMS는 메뉴 bootstrap만 앱별로 유지 |
| - | - | UI | **대시보드 프로젝트 상세 진입 계약 정렬**: `DashboardPage`를 `'/project/detail' + params.id` 규약으로 맞춰 목록 화면과 동일한 탭 오픈 계약 사용 |
| - | - | 규칙 | **종료조건 체크 가드 보강**: `requiresDeliverable` 종료조건은 미완료 산출물이 남아 있으면 체크되지 않도록 서비스 레벨 검증 추가 |
| - | - | 문서 | **planning 기준선 재정렬**: roadmap/backlog/changelog를 현재 PMS 구현 수준 기준으로 재작성 |

### 2026-02-10

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | UI | **DataGrid 세컨 패널 옵션 추가**: 하단 그립 버튼 토글 + 플로팅 상세 패널 지원 |
| - | - | UI | **요청 목록 실데이터 조회/검색 적용**: 메인 그리드 API 연동, 세컨 그리드 상세 패널 추가 |
| - | - | UI | **세컨 그리드 UX 개선**: 쉐브론 토글 버튼 상단 중앙 배치, 헤더 제거, 공통 패널 분리 |
| - | - | UI | **빈 데이터 높이 유지**: 데이터가 없어도 그리드 영역 크기 고정 |
| - | - | DB | **요청 샘플 시드 추가**: 프로젝트 + 요청 상세 테스트 데이터 |
| - | - | UI | **빈 데이터 문구/스타일 보정**: 조회된 데이터가 없습니다 문구 적용 |
| - | - | UI | **세컨 그리드 크기/버튼 스타일 조정**: 너비 정렬, 높이 확대, DMS 스타일 반영 |
| - | - | UI | **UserMenu 드롭다운 너비 개선**: 액션 영역 너비에 맞춤 (ResizeObserver) |
| - | - | UI | **쉐브론 버튼 가로형 전환**: DMS 사이드카 스타일 기준으로 피벗 적용 |
| - | - | DB | **요청 샘플 데이터 보강**: 프로젝트/요청 상세 테스트 데이터 정제 |
| - | - | API | **프로젝트 목록 조인 조회 보강**: `pr_project_m` + `pr_project_status_m` + `pr_project_request_d` 포함 |
| - | - | UI | **요청 목록 그리드 복구**: DataGrid 스타일/세컨 패널 롤백 복원 |

### 2026-02-09

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 성능 | **icons.ts wildcard import 제거**: `import * as LucideIcons`(3,740모듈) → 명시적 25개 아이콘 import. 초기 모듈 4,626→1,442 (-69%) |
| - | - | 버그 | **auth.store.ts Hydration 처리 추가**: `_hasHydrated` 상태 + `onRehydrateStorage` 콜백으로 SSR→CSR 전환 시 상태 불일치 해결 |
| - | - | 버그 | **checkAuth 안전한 에러 처리**: 외부 try-catch로 네트워크 오류 등 예상치 못한 예외 시 `isLoading: true` 고정 방지 |
| - | - | 버그 | **DataGrid 클라이언트 페이지네이션 연결**: ListPageTemplate 샘플 목록에서 페이지 변경 반영 |
| - | - | 리팩 | **(main)/layout.tsx 인라인 로그인 폼 제거**: 기존 (auth)/login 페이지 활용, AppLayout dynamic import로 청크 분리 |
| - | - | 버그 | **middleware.ts `/login` 경로 허용 추가**: 미인증 시 리다이렉드 작동 |
| - | - | 신규 | **global-error.tsx 추가**: ChunkLoadError 자동 새로고침 + 폴백 UI |
| - | - | 신규 | **(main)/error.tsx 추가**: 인증 후 영역 에러 바운더리 (자동 복구) |
| - | - | 개선 | **(main)/layout.tsx 로딩 타임아웃 추가**: 15초 초과 시 자동 새로고침, 재실패 시 로그인 페이지로 이동 |
| - | - | DB | **프로젝트 단계별 상세 테이블 추가**: request/proposal/execution/transition 상세 + 히스토리 트리거 도입, UNIT 코드 그룹 시드 추가 |
| - | - | 문서 | **프로젝트 단계별 상세/전환 흐름 문서화**: concepts, lifecycle, 실행 종료 스펙 업데이트 |

### 2026-01-30

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 정리 | **미사용 ui 컴포넌트 삭제**: badge, dialog, label, separator, sheet, tooltip, breadcrumb |
| - | - | 정리 | **미사용 ProtectedRoute 삭제** (향후 컨트롤 레벨 권한은 별도 패턴으로 구현 예정) |
| - | - | 리팩토링 | **Admin.tsx → AdminMenu.tsx** 파일명/함수명 통일 |
| - | - | 문서 | frontend-standards.md, layout-system.md, ui-components.md 현행화 |
| - | - | 버그 | **Search 컴포넌트 무한 루프 수정**: lucide-react `Search` 아이콘과 컴포넌트 이름 충돌 → `SearchIcon` alias로 해결 |
| - | - | 리팩토링 | **`ListPageTemplateV2.tsx` → `ListPageTemplate.tsx` 파일명 변경** (레거시 제거 후 표준 이름 사용) |
| - | - | 구조 | **PMS/DMS Sidebar 구조 통일**: `MainSidebar/` + `sidebar/` → `Sidebar/` 폴더 통합 |
| - | - | 구조 | Sidebar 컴포넌트 접두어 제거: `SidebarSearch` → `Search`, `SidebarSection` → `Section` 등 |
| - | - | 구조 | **common/page 네이밍 통일**: `PageHeader` → `Header`, `PageContent` → `Content` 등 |
| - | - | 삭제 | **레거시 템플릿 삭제**: `ListPageTemplate` (V2가 표준), `DetailPageTemplate`, `PageHeader` 삭제 |
| - | - | 구조 | `FormPageTemplate` 리팩토링: `PageHeader` → `Breadcrumb` + Title 내장 방식 |

### 2026-01-25

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | `50e84d0` | 문서 | **API 문서 HTML 생성**: @redocly/cli 도입, OpenAPI JSON → Redoc HTML 자동 변환 |
| - | - | 문서 | 문서 자동화 출력 패턴 통일: 모든 도구가 정적 HTML/SVG 산출물 생성 |
| - | - | 문서 | **Changelog 하이브리드 도입**: conventional-changelog 자동 + 영역별 수동 병행 |
| - | - | 문서 | docs-verify.js 검증 항목 14개로 확장 (API index.html 추가) |
| - | - | 문서 | 아키텍처 다이어그램 폴더 구조 준비 (diagrams-src, diagrams/.gitkeep) |
| - | - | 결정 | Changelog 자동화 검토 → 현행 하이브리드 방식 유지 (영역별 분산 + 인덱스) |

### 2026-01-24

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | DB | **Phase 2-B 완료: PostgreSQL 멀티스키마 분리** |
| - | - | DB | 스키마 분리 보완 - common: User/UserHistory만 (2개), pms: 나머지 (27개) |
| - | - | DB | 04_refine_schema_separation.sql 작성 및 실행 (cm_* 테이블 common→pms 이동) |
| - | - | DB | Prisma 6.x multiSchema stable 반영 (previewFeatures 제거) |
| - | - | 문서 | DB README.md 스키마 분리 내용 업데이트 |

### 2026-01-23

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | `cbfa70b` | DB | 트리거/시드 파일에 명시적 스키마 prefix(pms./common.) 적용 |
| - | `f214e92` | 문서 | 문서 경로 수정 (web-pms → web/pms) 및 레거시 스크립트 아카이브 |
| - | `be91fe2` | 구조 | 스크립트 아카이브를 docs/pms/_archive/로 통합 |
| - | `8930b75` | 문서 | **모듈러 모놀리스 아키텍처 문서** 추가 (modular-monolith.md) |
| - | `8cc8d9a` | 문서 | **프론트엔드 패키지 전략 문서** 추가 (frontend-package-strategy.md) |
| - | - | 결정 | PMS/DMS 독립 개발 후 통합 방침 결정 (별도 조직, 런칭 임박) |
| - | - | 구조 | @ssoo/types 패키지를 subpath exports 구조로 재편 (`@ssoo/types/common`, `@ssoo/types/pms`) |
| - | - | 구조 | @ssoo/types-pms 패키지 삭제 (types/pms로 통합) |
| - | - | 구조 | 프론트엔드 디렉토리 구조 재편 (apps/web/pms → apps/web/pms, apps/web-dms → apps/web/dms) |
| - | - | 수정 | @nestjs/throttler v6 API 호환성 수정 (@Throttle 데코레이터) |
| - | - | 설정 | pnpm-workspace.yaml 경로 패턴 수정 (apps/server, apps/web/*) |

### 2026-01-22

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 백엔드 | 서버 모듈을 common/pms 도메인 단위로 분리하여 모듈러 모놀리스 구조 확립 |
| - | - | 문서 | server Typedoc을 도메인별 경로로 분리(`docs/common/reference/typedoc/server`, `docs/pms/reference/typedoc/server`)하고 빌드 스크립트 정리 |
| - | - | 문서 | 문서 아웃풋 경로 규칙 `docs/{type}/reference/{package}` 적용(typedoc·storybook 기준 확인) |
| - | - | 문서 | 최신 모듈 경로(common/pms) 기준으로 API·도메인 문서의 코드 참조 경로 정합화 |
| - | - | 백엔드 | JWT 시크릿/만료 설정을 환경변수 필수 값으로 강제하고 Joi 기반 설정 검증 추가 |
| - | - | 백엔드 | 글로벌 HTTP 예외 필터 도입, NotFound 응답을 예외 처리로 전환해 상태코드 정합성 확보 |
| - | - | 백엔드 | 로그인/토큰 갱신 레이트 리밋 적용(5/10 req per min), 비밀번호 정책 강화(8자, 영문+숫자+특수문자) |
| - | - | 백엔드 | Prisma `db.client.<model>` 접근 가이드 및 BigInt 직렬화 유틸 문서화 |
| - | - | 백엔드 | ESLint 모듈 경계 규칙(import/no-restricted-paths)으로 common↔pms 역참조 차단 |

### 2026-01-21

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 문서 | PMS 문서와 코드 정합성 점검(구현 상태 표기/경로 정합화) |
| - | - | 문서 | 라우팅/보안 문서 경로 및 로그인 플로우 정합화 |
| - | - | 문서 | 레이아웃/상태관리 문서 정합화 (사이드바/탭/검색 섹션) |
| - | - | 문서 | 프론트엔드 표준 문서 구조/컴포넌트 정합화 |
| - | - | 문서 | 유틸리티 문서/리다이렉트 경로 정합화 |
| - | - | 문서 | @ssoo/types 커버리지 기준 및 동기화 원칙 명시 |
| - | - | 문서 | 서버 모듈 경로 변경에 따른 문서 경로 정합화 |
| - | - | 문서 | docs 구조를 common/pms/dms로 분리 |
| - | - | 문서 | apps/web → apps/web/pms 리네임 완료 |
| - | - | 문서 | apps/web-dms 디렉토리 슬롯 준비 |
| - | - | 문서 | PMS 문서 UI/렌더링 롤백 진행 |
| - | - | 문서 | PMS 문서 구조 정리 계획 문서 추가 |
| - | - | 문서 | PMS 기준 문서 구조로 수렴 |
| - | - | 문서 | /docs 홈에 문서 자동 목록 표시 추가 |
| - | - | 문서 | /docs 문서 허브 및 ReDoc 기반 API Reference 경로 추가 |
| - | - | 문서 | 리팩터링 문서 아카이브 이동 및 개발 표준 위치 정리 |
| - | `cef4630` | 문서 | UI 컴포넌트 및 유틸리티 문서화 |
| - | `63d21be` | 문서 | 상태 관리 및 레이아웃 시스템 문서화 |
| - | `38d7160` | 문서 | API 명세서 문서화 (5개 파일) |
| - | `8047c9c` | 기능 | 즐겨찾기 DB 연동 구현 |
| - | `bba91bc` | 수정 | 현재 열린 페이지에서 홈 탭 제외 |
| - | `4c902a0` | 문서 | CHANGELOG 업데이트 |
| - | `6d0a8b9` | 수정 | 접힌 사이드바에서 관리자 메뉴 표시 |
| - | `188c1f7` | 기능 | 사이드바 하단에 카피라이트 영역 추가 |
| - | `ebd82f5` | 수정 | 사이드바 스크롤 영역을 검색란 아래로 한정 |
| - | `d43cb90` | 기능 | 커스텀 스크롤바 디자인 시스템 추가 |

### 2026-01-20

| 커밋 | 영역 | 변경 내용 |
|------|------|----------|
| - | 리팩터링 | MainSidebar 컴포넌트 분리 (295줄 → 6개 파일) |
| - | 리팩터링 | DataTable 컴포넌트 분리 (454줄 → 5개 파일) |
| - | 수정 | 하드코딩 URL 수정, 인증 가드 타입 개선 |
| - | 설정 | Husky + lint-staged + Commitlint 설정 |

---

## 📋 변경 유형 범례

| 태그 | 설명 |
|------|------|
| 기능 | 새로운 기능 추가 |
| 수정 | 버그 수정 |
| 리팩터링 | 코드 구조 개선 |
| 문서 | 문서화 작업 |
| 설정 | 설정 파일 변경 |
| 스타일 | UI/UX 개선 |

---

## 🗃️ 아카이브

> 30일 이상 지난 변경 이력은 아카이브로 이동합니다.

- [2026년 1월 이전](../_archive/changelog-2025.md) *(예정)*

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | Add compatibility baseline and stabilization cleanup entries. |
| 2026-04-07 | Add 2026-04-07 stabilization and planning rebaseline entries. |
| 2026-02-09 | Add changelog section. |
