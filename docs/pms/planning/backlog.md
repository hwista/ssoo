# SSOO 프로젝트 백로그 - 인덱스

> 2026-09-22 검색 결과 표현 완료: 승인된 공통 카드의 프로젝트 상태·진행 단계 및 다른 서비스 결과 표현을 적용했다. 프로젝트관리 브라우저 28개 검사 통과. 프로젝트 자체 결과는 검증용 응답으로 표시를 확인했으며 실제 프로젝트 검색/열기 전체 완료를 뜻하지 않는다. [핸드오프](../../common/explanation/architecture/2026-09-22-search-results-handoff.md).

> 전체 백로그 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-09-22

> 2026-09-22 로그인 옵션 완료: 사용자 “진행”으로 공용 로그인에 아이디 저장·비밀번호 표시를 연결했다. 새 빌드와 프로젝트관리 28개 실제 동작 검증·네 화면 폭을 확인했으며 기존 세션·권한·로그인 후 복귀를 유지한다. [핸드오프](../../common/explanation/architecture/2026-09-22-login-options-handoff.md). 이번 적용 승인 대기 0건, 다른 화면 품질 잔여는 유지한다.

> 2026-09-22: 승인한 공용 상단 검색 배치 적용 완료. 좁은 데스크톱 두 줄 배치와 데스크톱 중복 제목 정리, 실제 상단 아래의 알림창 위치를 다섯 새 빌드에서 확인했다. 모바일 제목·기존 탭·본문과 검색 계약은 보존한다. [검증 핸드오프](../../common/explanation/architecture/2026-09-22-header-search-layout-handoff.md). 아래 상세·등록·설정 등 나머지 화면 품질 잔여는 유지한다.

> 2026-09-21: 순차 승인한 화면 품질 보완으로 프로젝트 카드·목록·타임라인에 이어 홈·네 업무 목록의 본문 폭과 여백을 공용 기준에 연결했다. [레이아웃 적용 범위](../explanation/design/layout-system.md#홈업무-목록-본문-기준-2026-09-21)를 따른다. 프로젝트 상세·등록·사용 설정·관리 화면의 폭/배치는 이번 완료 범위가 아니며 후속으로 남는다. 전 서비스 화면 품질 완료율은 산출하지 않는다. 기존 승인 대장 현황은 [현재 대장](../../common/explanation/architecture/2026-09-11-launch-approval-register.md)을 우선하며 아래 수치는 당시 기록이다.

> 2026-09-17: 승인-13 프로젝트 사용 설정 구현·검증 완료. 별도 진입·계정 저장·세 보기·작업 표시/담당자 지정·두 업무 알림, 네 옵션 **4/4**. 서버 15/15·실제 요청 21/21·브라우저·기존 업무 6/6·서버/다섯 웹 빌드 통과. [최종 핸드오프](../../common/explanation/architecture/2026-09-17-project-settings-handoff.md). 전체 **20완료·2잔여**, 운영 증거 **0/5**.
>
> 아래는 이전 단계 기록이다.
> 2026-09-15: 승인-18 검색 직접 접속·로그인 복귀·검색어/필터 복원과 동일 사용자 루트 새로고침의 검색 탭 보존 완료. 다른 소유자·출처 없는 저장 탭·로그아웃 정리를 유지한다. [최신 핸드오프](../../common/explanation/architecture/2026-09-15-search-entry-handoff.md) 기준 총 18항목 중 9완료·9대기. 프로젝트 설정(승인-13)은 별도 미해결로 유지한다.

> 2026-07-15: 일일 공수 생성 runtime smoke에서 발견된 Prisma `Decimal` 직렬화 결함을 공용 serializer 회귀 테스트와 함께 수정했다. API의 `actualHours`는 숫자, BigInt ID는 문자열로 반환한다.

---

## 📍 영역별 Backlog 위치

각 문서 하단에 해당 영역의 상세 백로그가 있습니다.

| 영역 | 문서 위치 | 설명 |
|------|----------|------|
| **작업 프로세스** | [workflow-process.md](../../common/explanation/architecture/workflow-process.md#backlog) | 작업 프로세스/커밋/Git (공용) |
| **프론트엔드 표준** | [architecture/frontend-standards.md](../explanation/architecture/frontend-standards.md#backlog) | 컴포넌트 계층/표준 |
| **API** | [api/README.md](../api/README.md#backlog) | API 추가/개선 |
| **레이아웃** | [design/layout-system.md](../explanation/design/layout-system.md#backlog) | 레이아웃/모바일 |
| **상태 관리** | [architecture/state-management.md](../explanation/architecture/state-management.md#backlog) | Store 개선 |
| **UI 컴포넌트** | [design/ui-components.md](../explanation/design/ui-components.md#backlog) | 컴포넌트 추가 |
| **유틸리티** | [architecture/utilities.md](../explanation/architecture/utilities.md#backlog) | 헬퍼 함수 |
| **데이터베이스** | [database-guide.md](../../common/guides/database-guide.md) | 테이블 변경 (공용) |

---

## 🎯 리팩토링 목적 (Why)

> 모든 백로그 항목은 아래 목적에 부합해야 합니다.

| # | 목적 | 설명 |
|:-:|------|------|
| 1 | **코드 품질 유지** | 무분별한 코드 방지, 유지보수/운영 용이성 확보 |
| 2 | **표준/패턴 선구축** | 덩치 커지기 전에 기반 구축, 일관된 개발 가이드 |
| 3 | **문서화 기반 작업** | 이력 관리, 충돌 방지, 협업 효율 |
| 4 | **주기적 재정립** | 간결하고 명확한 구조 유지 |
| 5 | **개발 생산성** | 표준이 있으면 고민 없이 빠르게 개발 |
| 6 | **온보딩 용이성** | 새 개발자 합류 시 문서/패턴으로 빠른 적응 |
| 7 | **자동화된 품질 게이트** | 사람이 아닌 시스템이 품질을 강제 |

---

## 📋 상태 범례

| 상태 | 설명 |
|------|------|
| 🔲 | 대기 |
| 🔄 | 진행중 |
| ✅ | 완료 |
| ⏸️ | 보류 |

---

## 🚨 우선순위 높은 항목 요약

> 각 영역에서 P1-P2 우선순위 항목만 모아서 표시

### P1 (High) - 바로 착수할 항목

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| FLOW-01 | UI 흐름 | 상태별 목록/상세 탭 계약 안정화 | ✅ |
| BOUND-01 | 제품 경계 | PMS-CRM 책임 경계와 런칭 조각 문서화 | ✅ |
| BOUND-02 | 도메인 문서 | 오래된 PMS 기회/요청/제안 문서를 CRM 분리 기준으로 현행화 | ✅ |
| UI-EXEC-01 | 프로젝트 상세 | 실행 상세의 계약/청구 값을 PMS 편집 필드가 아닌 CRM 읽기용 스냅샷으로 정리 | ✅ |
| VER-02 | 검증 | PMS 런타임 검증을 인증 후 프로젝트 상세/작업/산출물/종료조건/계약 스냅샷까지 확장 | ✅ |
| RULE-01 | 비즈니스 규칙 | `requiresDeliverable` 종료조건 체크 가드 보강 | ✅ |
| DOC-01 | Planning | roadmap/backlog/changelog 기준선 현행화 | ✅ |
| DOC-02 | Planning | current baseline-close brief 기준으로 PMS foundation/migration/validation gap 재고정 | ✅ |
| DASH-02 | 대시보드 | PM 운영 포커스 위젯으로 정체/담당자/종료 후보 노출 | ✅ |
| CLOSE-01 | 프로젝트 상세 | 다음 액션/막힌 조건/종료 가능 여부 closeout 패널 노출 | ✅ |
| CLOSE-02 | 프로젝트 상세 | closeout 패널에서 산출물·종료조건·리뷰/피드백으로 바로 이동하는 조치 동선 | ✅ |
| CLOSE-03 | 프로젝트 상세 | closeout 패널에서 현재 단계 미해결 산출물·종료조건을 처리 큐로 노출하고 각 항목에서 관리 탭으로 이동 | ✅ |
| VER-01 | 검증 | `verify:pms-launch` PMS 전용 런칭 검증 명령 추가 | ✅ |
| MIG-01 | DB/런칭 재현성 | PMS 실행 자산 기준정보와 공유 반입 프로필 formal migration bundle 을 db-init protected baseline 과 런칭 검증에 고정 | ✅ |
| MIG-02 | DB/런칭 재현성 | PMS core 정합화 테이블과 history table formal migration bundle 을 db-init protected baseline 과 런칭 검증에 고정 | ✅ |

### P2 (Medium) - 다음 배치

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| ROLE-01 | 멤버 관리 | 멤버 역할 하드코딩을 코드 테이블 기반으로 정리 | ✅ |
| BOUND-08 | 멤버/경계 | 프로젝트 멤버 추가 대상을 숫자 사용자 ID 입력이 아니라 활성 공용 사용자 lookup 선택으로 전환. 사용자 원장 생성/수정은 PMS 범위 밖 | ✅ |
| BOUND-09 | 프로젝트 관계 | 프로젝트 직접 관계 추가 대상을 숫자 프로젝트 ID 입력이 아니라 프로젝트명/번호 검색 선택으로 전환. 프로젝트 간 관계 관리는 PMS 실행 프로젝트 책임 | ✅ |
| BOUND-10 | 단계별 상세 | 요청/제안/전환 담당자를 숫자 사용자 ID 입력이 아니라 현재 프로젝트 멤버 선택으로 전환. 사용자 원장 생성/수정은 PMS 범위 밖 | ✅ |
| BOUND-11 | 인수인계 | 인수인계 배정 역할을 텍스트 코드 입력이 아니라 활성 프로젝트 멤버 역할 코드 선택으로 전환. PMS 역할 기준은 PMS 코드 그룹 책임 | ✅ |
| BOUND-12 | 기준정보 반입/경계 | 실행 자산 기준정보 CSV/TSV 템플릿을 고객사/사이트/시스템 코드 우선으로 정리하고 숫자 ID 컬럼은 기존 파일 호환 매핑으로만 유지 | ✅ |
| BOUND-13 | 상태별 목록/경계 | 요청/제안/수행/전환 목록의 고객사 필터를 숫자 ID 입력이 아니라 읽기용 고객 조회 선택으로 전환하고 고객 열은 고객명/공용 조직 라벨로만 표시 | ✅ |
| BOUND-14 | 실행 상세/경계 | 실행 상세의 후속 프로젝트를 숫자 프로젝트 ID 입력이 아니라 접근 가능한 프로젝트명/번호 검색 선택으로 전환하고 `nextProjectId`는 호환 저장 필드로만 유지 | ✅ |
| BOUND-15 | 런칭 표시/경계 | 고객/조직/실행 자산/프로젝트 관계/담당자 fallback 이 숫자 내부 ID를 직접 보여주지 않고 이름·코드 우선 또는 정보 조회 필요 상태로 표시되도록 전환 | ✅ |
| LAUNCH-QA-01 | 런칭 QA/API | 브라우저 QA에서 확인된 고객/프로젝트/실행 자산 목록 400 응답을 서버 계약 기준 쿼리로 정리하고, PMS 전용 한국어 글꼴 스택과 홈/요청 등록 사이드바 흐름 검증 산출물을 보강 | ✅ |
| LAUNCH-QA-02 | 런칭 QA/상세 화면 | 브라우저 QA가 홈에서 프로젝트 상세로 진입해 태스크·마일스톤·컨트롤·산출물·종료조건·인수인계·리뷰 탭을 실제로 열고, 모바일 상세 탭 레일의 overflow 회귀를 확인 | ✅ |
| LAUNCH-QA-03 | 런칭 QA/피드백 저장 | 브라우저 QA가 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 실제로 등록하고, 저장 결과가 화면의 피드백 큐와 보고/리뷰 이벤트 목록에 다시 표시되는지 확인 | ✅ |
| LAUNCH-QA-04 | 런칭 QA/통제 전환 | 브라우저 QA가 기존 Issue 호환성 인박스 cleanup 전환 동선을 실제 클릭해 정식 이슈 생성과 기존 행 종료를 확인. QA 전용 legacy Issue 신규 생성은 2026-07-10 CONTROL-LEGACY-01에서 폐기 | ✅ |
| LAUNCH-QA-05 | 런칭 QA/피드백 처리 | 브라우저 QA가 리뷰 탭에서 등록한 피드백 이슈의 해결 버튼을 실제 클릭해 상태 변경까지 확인 | ✅ |
| LAUNCH-QA-06 | 런칭 QA/PMR·PRR 상태 전환 | 브라우저 QA가 누적 원장 환경에서도 같은 PMR/PRR 예약 행을 안정 식별자로 추적하고 승인 요청·승인·발행 완료 상태 전환을 상태 코드 기준으로 확인 | ✅ |
| BOUND-18 | PMS/CRM 경계 검증 | PMS 웹은 CRM 계약 후보와 PMS 인계 preview를 읽기만 하고, 준비 완료 preview만 PMS 계약/대금/accepted handoff 스냅샷으로 반영한다는 정적·런타임 검증을 `verify:pms-launch`에 고정 | ✅ |
| LAUNCH-QA-07 | 런칭 QA/PMR·PRR 화면 갱신 | PMR/PRR 이벤트 생성·상태 변경 성공 시 이벤트 목록 캐시와 활성 PMR/PRR 행을 성공 응답으로 즉시 갱신해 브라우저 QA와 실제 화면이 승인 요청·승인·발행 완료 전환을 바로 확인 | ✅ |
| LAUNCH-QA-08 | 런칭 UX/관리자 표면 | 코드 관리, 메뉴 관리, 기준정보, 템플릿 관리 화면의 브라우저 기본 `alert`/`confirm` 호출을 PMS 전역 확인 다이얼로그와 토스트로 교체하고 `verify:pms-launch` 소스 검증으로 회귀를 차단 | ✅ |
| LAUNCH-QA-09 | 런칭 UX/표현 정리 | PMS 인수인계 탭과 셸 fallback 에서 `미구현`, `페이지 준비 중`처럼 미완성으로 보이는 문구를 운영 상태 표현으로 바꾸고 `verify:pms-launch` 소스 검증으로 회귀를 차단 | ✅ |
| LAUNCH-QA-10 | 런칭 UX/검색 본문 | PMS AI/RAG project/task/member/status projection 본문에서 고객·조직·담당자 내부 ID 라벨을 제거하고, 구조 식별자는 ACL/metadata 에만 남기며 `verify:pms-launch`와 adapter 단위 테스트로 회귀를 차단 | ✅ |
| LAUNCH-HOST-01 | 런칭 운영 검증 | PMS Docker 재빌드 전 host 여유 공간과 Docker CLI/Compose 응답을 수치로 점검하는 사전 검증을 추가하고, 현재 재빌드 차단이 기능 미구현이 아니라 host 디스크/Docker 상태 문제임을 분리 | ✅ |
| DASH-03 | 프로젝트 상세/통제 요약 | 프로젝트 상세에 비용(CRM 계약 스냅샷)·일정·성과·통제/피드백 요약 API와 화면 패널을 추가하고, CRM 계약 원장 경계 문구와 관리 탭 바로가기를 런칭 검증에 고정. 기존 PMS 전체 PMO/경영 대시보드는 후속 | ✅ |
| EFFORT-01 | 프로젝트 상세/작업 공수 | 작업 탭에서 예상/실제 공수 합계, 소진율, 차이, 미기입 건수를 표시하고 각 작업 행에서 예상/실제 공수를 직접 입력·수정 | ✅ |
| EFFORT-02 | 프로젝트 상세/일일 공수 원장 | 작업별 작업일·유형·요약·실제 공수를 기록하는 PMS 공수 원장 DB/API/UI를 추가하고, 활성 기록 합계를 작업 실제 공수로 자동 반영. 전사 타임시트·노무비/회계 연동은 후속 | ✅ |
| CLOSE-TPL-01 | 프로젝트 상세/API | 현재 단계 산출물·종료조건 기본 템플릿 적용 API와 화면 버튼을 추가하고 `verify:pms-launch` 정적·런타임 검증에 포함. 그룹 선택/저장은 CLOSE-TPL-02에서 별도 완료 | ✅ |
| CLOSE-TPL-02 | 프로젝트 상세/API | 산출물·종료조건 템플릿 그룹 목록 조회, 현재 목록 기반 그룹 저장, 저장된 그룹 선택 적용, 종료조건 그룹 항목의 산출물 필요 여부 보존을 API/화면/런칭 검증에 포함. 전용 관리 화면과 버전/승인/복구 운영은 CLOSE-TPL-03에서 별도 완료 | ✅ |
| CLOSE-TPL-03 | 관리자/API/DB | 산출물·종료조건 전용 템플릿 관리 화면, 관리자 API, 승인 상태, 버전 번호, 이력 조회·복구, 보관 상태, 기본 템플릿 승인 시드와 런칭 검증을 구현 | ✅ |
| CLOSE-TPL-04 | 프로젝트 상세/API | 산출물·종료조건 템플릿 선택 적용에 append/replace 정책을 추가하고, replace 시 템플릿 밖 기존 활성 항목을 소프트 비활성화하며 화면 선택과 런타임 검증에 포함 | ✅ |
| CLOSE-STAT-01 | 프로젝트 상세/API | 산출물 완료 상태 어휘를 `confirmed`/`approved`/`not_required`로 통합하고, `before_submit`/`final` 호환 입력 정규화와 종료조건 체크 가드·전환 준비도 런타임 검증을 추가 | ✅ |
| CLOSE-APPROVAL-01 | 프로젝트 상세/API/DB | 산출물·종료조건별 프로젝트 멤버 기반 1~5단계 승인선 저장, 지정 승인자 승인/반려, 최종 승인 시 산출물 승인 또는 종료조건 완료 반영, 보호 마이그레이션과 `verify:pms-launch` 런타임 검증을 추가. 전사 결재 엔진과 DMS 파일 검토 연동은 후속 | ✅ |
| CONTROL-LEGACY-01 | 프로젝트 상세/API/검증 | 기존 `Issue` 신규 생성 POST, 웹 create API, mutation hook, 공유 create DTO export 를 런칭 표면에서 폐기하고 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED` 검증을 추가. 기존 행 조회·상태 변경·숨김·정식 전환 cleanup 은 보존 | ✅ |
| CONTROL-LEGACY-02 | 프로젝트 상세/API/DB | 기존 `Issue` 숨김 처리 시 보존 아카이브 스냅샷과 이력 트리거를 남기고, 원본 행은 런칭 cleanup 조회용으로 비활성화한다. 물리 테이블 제거는 활성 cleanup 행 0건 확인 이후 별도 migration 으로 분리 | ✅ |
| CONTROL-LEGACY-03 | 프로젝트 상세/API/검증 | 기존 `Issue` cleanup 요약 API와 화면 지표를 추가해 활성 cleanup, 열린 대상, 완료 상태, 숨김 보존 건수와 물리 제거 가능 여부를 서버 기준으로 표시하고 런칭 런타임 검증에 포함 | ✅ |
| CONTROL-LEGACY-04 | 프로젝트 상세/API/검증 | 완료 상태의 기존 `Issue` cleanup 행을 프로젝트 단위로 일괄 숨김 처리하는 API와 화면 액션을 추가하고, 보존 아카이브 reason 과 런칭 런타임 검증에 포함. 열린 cleanup 행은 정식 통제 항목 전환 대상으로 유지 | ✅ |
| CONTROL-LEGACY-05 | 프로젝트 상세/API/검증 | 열린 기존 `Issue` cleanup 행을 프로젝트 단위로 정식 이슈·리스크·변경요청으로 일괄 전환하고, 원본 행은 `canonicalized_cleanup` 보존 아카이브 후 비활성화하도록 API/화면/런칭 검증에 포함 | ✅ |
| CONTROL-LEGACY-06 | DB/런칭 재현성 | fresh seed 가 기존 `Issue` 활성 행을 다시 만들지 않고, 열린 데모 업무는 정식 이슈·리스크·변경요청으로 seed 하며 원본 스냅샷은 보존 아카이브로만 남기도록 전환. `verify:pms-launch` 는 전체 프로젝트 cleanup 활성 0건을 런타임에서 확인 | ✅ |
| MVP0-01 | 도메인 | `Plant/Site`, `System Catalog`, `System Instance`, `Integration` 도메인 착수: 1차 스키마/API/시드/조회 화면/관리자 CRUD, JSON 기반 dry-run/apply 반입·기존 코드 갱신 1차, CSV/TSV 업로드·컬럼 매핑·템플릿 다운로드·브라우저 로컬 매핑 재사용 1차, 서버 공유 매핑 프로필 CRUD/재사용·기본 지정 UI·이력 조회/복구 1차, 프로젝트 생성·수정 선택 검증 1차 완료. PMS 고객사 원장 쓰기 표면은 제거하고 읽기용 고객 조회만 유지하며 공용 조직 앵커를 응답/검색/선택지와 프로젝트 응답/상태별 목록/기본정보 읽기 화면에 1차 투영. 요청 등록, 프로젝트 기본정보, 기준정보 관리의 고객사 선택지는 고객사 코드와 공용 조직명/코드를 공통 규칙으로 표시하며 직접 숫자 조직 ID를 노출하지 않음. 상태별 목록의 고객 필터는 읽기용 고객 조회 선택을 사용하며 직접 숫자 ID 입력을 받지 않음. 프로젝트 조직 supplier/partner 연결은 공용 조직 lookup 선택으로 전환. 프로젝트 응답/상태별 목록/작업 큐/기본정보 읽기 화면은 plant/site와 system instance 이름·코드를 1차 표시. CRM/Admin/공용 조직 full cutover 잔여 | 🔄 |
| REPORT-01 | 프로젝트 상세 | 보고/리뷰 이벤트 요약과 피드백 큐 1차 노출 | ✅ |
| HAND-01 | 프로젝트 흐름 | Handoff/log 트랙 설계 및 1차 구현 | ✅ |
| AI-RAG-08B | AI/RAG | PMS project/task/member/status projection adapter (project/task/member/status RDB projection adapter, project/task write-hook queue, project/task controlled backfill, project/task/member/status runtime evidence gate, Docker 재현용 project status detail seed baseline, provider-unavailable 런타임 JSON/Markdown evidence 산출, provider-ready report verifier/template/self-test 게이트, precheck → live evidence → report verification → evidence recording 완료 runner, provider-ready evidence bundle 생성/검증 경로 완료. 실제 Azure-backed provider-ready 통과 report artifact 잔여) | 🔄 |
| LAY-01 | 레이아웃 | 모바일 레이아웃 구현 | ✅ |
| REPORT-02 | 프로젝트 상세 | 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 바로 등록하는 launch feedback 수집 표면 | ✅ |
| HOME-02 | 홈 | 홈 요약에서 권한 있는 프로젝트의 리뷰/피드백 탭으로 바로 진입하는 launch feedback 동선 | ✅ |
| HOME-03 | 홈 | 리뷰 탭에서 수집된 열린 launch feedback 이슈를 홈 운영 신호와 피드백 지표로 노출 | ✅ |
| HOME-04 | 홈/런칭 피드백 | 접힌 대표 신호와 별도로 열린 launch feedback 신호 목록을 홈 요약 계약에 추가하고, 홈 화면에서 여러 프로젝트의 런칭 피드백 큐를 바로 리뷰 탭으로 열 수 있게 노출 | ✅ |
| REPORT-03 | 프로젝트 상세 | 리뷰/피드백 탭의 모바일 카드 목록과 작은 화면 입력 다이얼로그 보강 | ✅ |
| REPORT-04 | 프로젝트 상세 | 리뷰/피드백 탭에서 수집된 launch feedback 이슈를 상태 변경·해결 처리하고 홈 피드백 지표를 즉시 갱신 | ✅ |
| REPORT-05 | 프로젝트 상세 | 리뷰/피드백 탭의 현재 이벤트·피드백·확인 필요 신호를 PMR/PRR 자동 보고서가 아닌 런칭 피드백 공유용 스냅샷으로 다운로드 | ✅ |
| REPORT-06 | 프로젝트 상세 | 리뷰/피드백 탭에서 현재 PMS 실행 데이터 기준 PMR/PRR 초안을 다운로드하고 발행·승인 흐름은 프로젝트 이벤트 기반 원장/워크플로우로 연결 | ✅ |
| REPORT-07 | 프로젝트 상세 | 리뷰/피드백 탭에서 PMR/PRR 준비도와 항목별 충족/확인 필요 상태를 화면에서 바로 확인 | ✅ |
| REPORT-08 | 프로젝트 상세 | 리뷰/피드백 탭에서 현재 PMR/PRR 판정을 프로젝트 이벤트 기반 발행 원장으로 기록하고 이력을 확인 | ✅ |
| REPORT-09 | 프로젝트 상세 | 리뷰/피드백 탭에서 PMR/PRR 주간/월간 발행 건을 예약하고 승인 요청·승인·반려·발행 완료 상태를 프로젝트 이벤트로 전환 | ✅ |
| REPORT-10 | 프로젝트 상세 | 리뷰/피드백 탭에서 PMR/PRR 반복 예약 차수를 생성하고 프로젝트 멤버 승인자를 지정해 PMS 공통 알림을 발송 | ✅ |
| REPORT-11 | 프로젝트 상세 | 리뷰/피드백 탭에서 PMR/PRR 결재선 정책과 알림 수신 정책을 선택하고 정책별 수신자에게 PMS 공통 알림을 발송 | ✅ |
| REPORT-12 | 프로젝트 상세/API | PMR/PRR 승인 요청 이후 승인·반려는 지정 승인자만 수행하도록 화면과 API 상태 전환을 제한 | ✅ |
| REPORT-13 | 프로젝트 상세/API | 예약 시간이 지난 PMR/PRR 발행 예정 건을 백그라운드 rollover로 승인 요청 상태로 자동 전환하고 승인자 알림을 발송 | ✅ |
| REPORT-14 | 프로젝트 상세/QA | 리뷰/피드백 탭의 PMR/PRR 원장·런칭 피드백·보고 이벤트를 최근 항목 중심으로 렌더링해 누적 데이터 환경의 런칭 화면과 브라우저 QA를 안정화 | ✅ |
| CONTROL-UI-01 | 프로젝트 상세 | 통제 객체 이슈/요구사항/리스크/변경/이벤트 목록의 모바일 카드와 작은 화면 등록 다이얼로그 보강 | ✅ |
| CONTROL-UI-02 | 프로젝트 상세 | 기존 Issue 호환성 인박스의 모바일 카드 목록과 정식 통제 패널 유도 문구 보강 | ✅ |
| CONTROL-UI-03 | 프로젝트 상세 | 기존 Issue 호환성 인박스에서 정식 이슈·리스크·변경요청으로 수동 전환하는 1차 cleanup 동선 | ✅ |
| CONTROL-UI-04 | 프로젝트 상세/API | 기존 Issue 호환성 인박스를 열린 cleanup 대상 기본 보기로 축소하고 완료/전환 행은 접기, 삭제는 물리 삭제가 아닌 숨김 처리로 전환 | ✅ |
| CLOSE-UI-02 | 프로젝트 상세 | 산출물 모바일 카드 목록과 산출물/종료조건 작은 화면 등록 다이얼로그 보강 | ✅ |
| TASK-UI-01 | 프로젝트 상세 | 목표/WBS/작업/마일스톤 모바일 카드 목록과 작은 화면 등록 다이얼로그 보강 | ✅ |

### PMS AI/RAG Provider-Ready Evidence Record

<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START -->
Provider-ready evidence status: pending

- Current blocking item: no verified Azure-backed PMS provider-ready runtime report artifact has been recorded.
- Required proof: passed PMS project/task/projectMember/projectStatus provider-ready JSON report plus Markdown summary, verified before documentation is updated.
- Handoff bundle: `output/pms-ai-rag-provider-ready` contains draft report/env/request packet templates only and must not be treated as completion evidence.
- Recording path: `complete:pms-ai-rag-provider-ready` calls `record:pms-ai-rag-provider-ready-evidence` after report verification.
<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:END -->

### P3 (Low) - 추후 개선

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| DASH-01 | 대시보드 | PMS 홈 리스크/리포트/운영 집계 위젯 확장 | ✅ |
| LAY-02 | 레이아웃 | Header 브레드크럼 구현 | ✅ |
| UTL-01 | 유틸리티 | 날짜/숫자/금액 포맷 유틸리티 정리 | ✅ |
| API-01 | API | PMS API 에러 응답 상세 코드 정의 | ✅ |

---

## ✅ 최근 완료 항목

> 현재 PMS의 foundation 정합화 상태와 다음 baseline close 기준은 [current-baseline-close-brief.md](./current-baseline-close-brief.md) 를 함께 참조합니다.

| 완료일 | ID | 항목 |
|--------|-----|------|
| 2026-07-13 | EFFORT-02 | PMS 작업 탭에 일일 공수 기록 패널과 기록 추가 다이얼로그를 추가하고, PMS 공수 원장 DB/API/이력 트리거/런칭 검증을 통해 활성 기록 합계를 작업 실제 공수로 자동 반영 |
| 2026-07-13 | EFFORT-01 | PMS 작업 탭에 예상/실제 공수 요약 카드와 작업별 공수 입력을 추가하고, 프로젝트 통제 요약 성과 카드와 `verify:pms-launch` 검증에 공수 필드를 포함 |
| 2026-07-13 | DASH-03 | PMS 프로젝트 상세에 비용(CRM 계약 스냅샷)·일정·성과·통제/피드백 요약 패널과 `/dashboard/summary` API를 추가하고, 관리 탭 바로가기와 CRM/PMS 계약 원장 경계 문구를 런칭 검증에 포함 |
| 2026-07-13 | HOME-04 | PMS 홈 요약에 접힌 대표 신호와 별도의 열린 launch feedback 신호 목록을 추가하고, 홈 화면에 `런칭 피드백 큐` 패널을 노출해 여러 프로젝트의 피드백을 바로 리뷰 탭으로 열 수 있게 보강 |
| 2026-07-13 | LAUNCH-HOST-01 | PMS Docker 재빌드 전 host 디스크 여유 공간, Windows host/Docker host 마운트, Docker CLI/Compose 응답을 점검하는 `verify:pms-launch-host`를 추가하고 런칭 게이트 소스 검증에 연결. 실제 Docker 재빌드 통과 증빙은 host 디스크 부족 및 Docker/WSL I/O 오류 해소 이후 별도 확인 필요 |
| 2026-07-13 | AI-RAG-08B-READY-EVIDENCE-BUNDLE | PMS AI/RAG provider-ready evidence bundle 생성기와 최종 번들 검증기를 추가해 Azure-backed report 생성에 필요한 env template, required-input request packet, draft report template, completion runner 명령을 한 산출물로 묶음. draft report/placeholder summary 는 최종 검증에서 실패하며 실제 provider-ready 통과 report artifact 는 계속 잔여 |
| 2026-07-13 | LAUNCH-QA-10 | PMS AI/RAG project/task/member/status 검색 본문에서 고객·플랜트·시스템·담당자·조직 내부 ID 라벨을 제거하고, 구조 식별자는 ACL/metadata 에만 유지하도록 회귀 검증을 추가 |
| 2026-07-13 | LAY-03 | PMS `/settings` 직접 진입을 공용 셸 AppLayout으로 수렴시키고, 설정 화면을 MDI ContentArea 실제 페이지로 매핑하며 헤더 브레드크럼과 `verify:pms-launch` 소스 검증에 고정 |
| 2026-07-13 | AI-RAG-08B-READY-EVIDENCE-RECORDER | PMS AI/RAG provider-ready evidence recorder를 추가하고 완료 runner가 report verification 이후 증거 block artifact 및 PMS planning 문서 기록 dry-run/record 경로를 실행하도록 연결. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| 2026-07-10 | AI-RAG-08B-READY-COMPLETION-RUNNER | PMS AI/RAG provider-ready 완료 runner를 추가해 provider env precheck, live PMS evidence 생성, provider-ready report 검증을 기본 순서로 묶고 env-file, Docker runtime, 기존 artifact 재검증, self-test를 제공. 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| 2026-07-10 | AI-RAG-08B-READY-REPORT-GATE | PMS AI/RAG provider-ready runtime report verifier와 fill-in template, self-test, 루트 실행 스크립트, `verify:pms-launch` 소스 검증을 추가. 이는 provider-ready 통과 report 형식과 필수 증빙 필드를 고정한 것이며, 실제 Azure-backed provider-ready report artifact 는 별도 잔여 |
| 2026-07-10 | CONTROL-LEGACY-06 | PMS demo issue seed 가 `pr_issue_m` 활성 행을 재생성하지 않도록 전환하고, 열린 seed 업무는 정식 통제 객체로, 원본 스냅샷은 legacy archive 로 남기며, `verify:pms-launch` 런타임이 전체 프로젝트 cleanup 활성 0건을 확인 |
| 2026-07-10 | CONTROL-LEGACY-05 | PMS 기존 `Issue` cleanup 인박스에 열린 행 일괄 정식 전환 API/화면 액션을 추가하고, 정식 이슈·리스크·변경요청 생성 후 원본을 `canonicalized_cleanup` 보존 아카이브로 비활성화하도록 런칭 검증에 포함 |
| 2026-07-10 | CONTROL-LEGACY-04 | PMS 기존 `Issue` cleanup 인박스에 완료 행 일괄 숨김 API/화면 액션을 추가하고, `resolved`/`closed` 행만 보존 아카이브 후 비활성화하도록 런칭 검증에 포함. 열린 cleanup 행은 정식 통제 항목 전환 대상으로 유지 |
| 2026-07-10 | CONTROL-LEGACY-03 | PMS 기존 `Issue` cleanup 요약 API와 화면 지표를 추가해 활성 cleanup, 열린 대상, 완료 상태, 숨김 보존 건수와 물리 제거 가능 여부를 서버 기준으로 표시하고 `verify:pms-launch` 런타임에서 확인 |
| 2026-07-10 | CONTROL-LEGACY-02 | PMS 기존 `Issue` 숨김 cleanup 이 원본 행 비활성화 전에 보존 아카이브 스냅샷과 이력 테이블을 남기도록 고정. 원본 `Issue` 테이블의 물리 제거는 활성 cleanup 대상이 0건임을 확인한 뒤 별도 migration 으로 처리 |
| 2026-07-10 | CONTROL-LEGACY-01 | PMS 기존 `Issue` 신규 생성 경로를 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED`로 차단하고, 웹 create API/hook/타입 문서 표면을 제거했으며, 기존 행은 cleanup 인박스의 조회·전환·숨김 전용으로 보존 |
| 2026-07-10 | CLOSE-APPROVAL-01 | PMS 산출물·종료조건별 1~5단계 승인선을 프로젝트 멤버 기반으로 저장하고, 지정 승인자가 승인/반려하면 산출물 승인 또는 종료조건 완료 상태로 반영되도록 DB/API/화면/런칭 검증에 고정 |
| 2026-07-10 | CLOSE-TPL-04 | PMS 산출물·종료조건 템플릿 선택 적용에 append/replace 정책을 추가하고, replace 적용 시 템플릿 밖 활성 항목이 소프트 비활성화되는지 `verify:pms-launch` 런타임에서 확인 |
| 2026-07-09 | CLOSE-STAT-01 | PMS 산출물 완료 상태 어휘를 `confirmed`/`approved`/`not_required`로 통합하고, 종료조건 체크 가드와 전환 준비도 완료 집계가 `confirmed`를 런타임에서 인정하도록 검증 |
| 2026-07-09 | CLOSE-TPL-03 | PMS 관리자 템플릿 관리 화면을 추가하고 산출물·종료조건 그룹의 초안/승인/보관, 버전 증가, 이력 조회·복구, 보관 그룹 조회를 서버 API/DB/시드/런칭 검증에 고정 |
| 2026-07-09 | CLOSE-TPL-02 | PMS 산출물·종료조건 탭에 템플릿 선택 다이얼로그를 추가하고, 서버 API가 그룹 목록 조회·현재 목록 기반 그룹 저장·저장된 그룹 선택 적용을 제공하도록 확장. 종료조건 그룹 항목은 산출물 필요 여부를 정식 컬럼으로 보존하며 `verify:pms-launch`는 정적 표면과 Docker 런타임 저장/조회/적용 응답을 확인 |
| 2026-07-09 | CLOSE-TPL-01 | PMS 산출물·종료조건 탭에 현재 단계 기본 템플릿 적용 버튼을 추가하고, 서버 API가 그룹 마스터가 있으면 우선 사용하며 없으면 상태별 기본 세트를 append 방식으로 생성하도록 보강. `verify:pms-launch`는 정적 표면과 Docker 런타임 적용 응답을 확인 |
| 2026-07-09 | LAUNCH-QA-07 | PMS 이벤트 생성·상태 변경 mutation 이 성공 응답으로 이벤트 목록 캐시와 활성 PMR/PRR 행을 즉시 갱신하도록 보강해, Docker 재기동 직후 누적 데이터 환경에서도 PMR/PRR 승인 요청·승인·발행 완료 전환이 같은 화면 행에 바로 반영되도록 조정 |
| 2026-07-09 | BOUND-18 | PMS 런칭 검증이 CRM 계약 후보 조회와 PMS 인계 preview 조회는 읽기 전용으로만 허용하고, 준비 완료 preview만 `/projects/:id/contracts/crm-handoff-snapshot`으로 PMS 계약/대금/accepted handoff 스냅샷에 반영되는지 런타임에서 확인하도록 보강. CRM 계약/청구 원장 쓰기와 PMS 신규 프로젝트 자동 생성은 여전히 제외 |
| 2026-07-09 | LAUNCH-QA-06 | PMS PMR/PRR 발행·승인 원장 행에 안정 이벤트 ID와 상태 코드 식별자를 추가하고, 브라우저 QA가 같은 예약 행의 승인 요청·승인·발행 완료 전환을 상태 코드 기준으로 추적하도록 보강 |
| 2026-07-09 | AI-RAG-08B-EVIDENCE-SUMMARY | PMS AI/RAG 런타임 evidence verifier가 project/task/member/status backfill, 공용 AI object/chunk/ACL/index state/retrieval audit 결과를 JSON과 사람이 읽는 Markdown summary로 함께 남기도록 보강. 현재 Docker 환경에서는 provider-unavailable 모드로 증빙하며 provider-ready artifact 는 별도 잔여 |
| 2026-07-09 | REPORT-14 | PMS 리뷰/피드백 탭의 PMR/PRR 발행·승인 원장, 수집된 런칭 피드백, 보고/리뷰 이벤트 표시를 최근 20건 중심으로 제한하고 전체 건수는 유지. 브라우저 QA는 제한된 원장에서도 기대 상태와 전환 액션을 확인하도록 보정 |
| 2026-07-09 | CONTROL-UI-04 | PMS 기존 Issue 호환성 인박스를 열린 cleanup 대상만 기본 표시하도록 축소하고, 완료/전환 행은 선택적으로 펼치는 이력으로 분리. 기존 Issue 삭제 동작은 물리 삭제 대신 비활성화/숨김 처리로 전환 |
| 2026-07-09 | REPORT-13 | PMS 서버 백그라운드 worker가 예약 시간이 지난 PMR/PRR 발행 예정 이벤트를 승인 요청 상태로 자동 전환하고, 프로젝트 단위 운영 트리거와 런칭 검증이 같은 rollover 경로를 확인하도록 확장 |
| 2026-07-09 | REPORT-12 | PMS 리뷰/피드백 탭과 이벤트 API에서 PMR/PRR 승인 요청 이후 승인·반려를 지정 승인자만 처리하도록 제한하고, 런칭 검증과 브라우저 QA가 현재 사용자 승인자 경로와 비승인자 API 거부를 확인하도록 확장 |
| 2026-07-08 | REPORT-11 | PMS 리뷰/피드백 탭에서 PMR/PRR 결재선 정책과 알림 수신 정책을 선택하고, 이벤트 요약에 정책 증적을 남기며 승인자·프로젝트 담당자·활성 멤버 대상 PMS 공통 알림을 정책별로 발송하도록 확장 |
| 2026-07-08 | REPORT-10 | PMS 리뷰/피드백 탭에서 PMR/PRR 주간/월간 반복 예약 차수를 한 번에 생성하고, 프로젝트 멤버 승인자를 이벤트 owner 로 지정해 PMS 공통 알림을 발송하도록 확장 |
| 2026-07-08 | REPORT-09 | PMS 리뷰/피드백 탭에서 PMR/PRR 주간/월간 발행 건을 예약하고 승인 요청·승인·반려·발행 완료 상태를 프로젝트 이벤트로 전환하는 발행·승인 워크플로우 1차를 추가 |
| 2026-07-08 | REPORT-08 | PMS 리뷰/피드백 탭에서 PMR/PRR 준비도 판정을 프로젝트 이벤트 기반 발행 원장으로 기록하고, 저장된 원장 이력을 모바일 카드와 데스크톱 표로 확인하도록 추가 |
| 2026-07-08 | REPORT-07 | PMS 리뷰/피드백 탭에 PMR/PRR 준비도 패널을 추가해 산출물·종료조건·일반 통제 이슈·리스크·변경·인수인계·launch feedback 의 충족/확인 필요 상태를 화면에서 즉시 확인하고 브라우저 QA가 해당 패널을 확인하도록 확장 |
| 2026-07-08 | REPORT-06 | PMS 리뷰/피드백 탭에서 산출물·종료조건·통제 이슈·리스크·변경·인수인계·launch feedback 상태를 묶은 PMR/PRR Markdown 초안을 다운로드하도록 추가 |
| 2026-07-08 | REPORT-05 | PMS 리뷰/피드백 탭에서 현재 보고/리뷰 이벤트, launch feedback 이슈, 확인 필요 신호를 런칭 피드백 공유용 Markdown 스냅샷으로 내려받게 하되 PMR/PRR 자동 보고서로는 주장하지 않도록 범위 문구와 런칭 검증을 추가 |
| 2026-07-08 | MVP0-01-CUSTOMER-ORG-CAPTION | 요청 등록, 프로젝트 기본정보, 기준정보 관리의 고객사 선택 표시를 공통 포매터로 통일해 고객사 코드와 공용 조직명/코드를 우선 표시하고, 조직 식별자만 있을 때는 정보 조회 필요 상태로 표시하도록 런칭 검증에 포함 |
| 2026-07-08 | UTL-01 | PMS 화면 날짜/일시/숫자/금액/건수 표시를 공통 포맷 유틸로 정리하고, 전환 목록 운영 담당자 숫자 ID 노출을 지정 여부 표시로 차단 |
| 2026-07-08 | LAUNCH-QA-05 | PMS 브라우저 QA가 리뷰 탭에서 등록한 피드백 이슈의 해결 버튼을 실제 클릭해 상태가 해결로 바뀌는지 확인하도록 확장 |
| 2026-07-08 | REPORT-04 | PMS 리뷰/피드백 탭에 수집된 launch feedback 이슈 목록, 상태 선택, 해결 처리 액션을 추가하고 프로젝트 이슈 변경 시 홈 피드백 요약을 갱신하도록 보강 |
| 2026-07-08 | AI-RAG-08B-DEMO-STATUS-SEED | PMS AI/RAG member/status runtime evidence 가 새 Docker 환경에서도 검증 대상을 확보하도록 데모 프로젝트 상태 상세 시드를 추가하고, apply_all_seeds/db-seed/런칭 게이트에 연결 |
| 2026-07-08 | AI-RAG-08B-MEMBER-STATUS | PMS project member/status 를 독립 AI index entity 로 투영하고, 공용 AI job queue 와 runtime evidence gate 가 project/task/member/status object/chunk/ACL/index state/retrieval audit 를 모두 확인하도록 확장. provider-ready 실증 artifact 는 잔여 |
| 2026-07-08 | AI-RAG-08B-EVIDENCE-GATE | PMS project/task AI backfill 을 실제 런타임에서 큐잉·실행하고 공용 AI object/chunk/ACL/index state/retrieval audit 를 확인하는 evidence gate 를 추가. 이 시점의 member/status projection 잔여는 이후 같은 날짜 AI-RAG-08B-MEMBER-STATUS 에서 해소 |
| 2026-07-08 | API-01 | PMS API 경로의 전역 오류 응답을 `PMS_*` 상세 코드와 HTTP 상태 메타데이터로 정규화하고, 대표 식별자 오류 응답을 런타임 런칭 검증에 포함 |
| 2026-07-07 | DASH-01 | PMS 홈 요약에 리스크, 차단 이슈, 변경 요청, 보고/리뷰 이벤트 준비도, 지연 마일스톤, 산출물 대기, 종료/전환 막힘을 묶은 리스크/리포트 집계 위젯을 추가하고 런칭 검증에 포함 |
| 2026-07-07 | LAY-02 | PMS 헤더가 활성 MDI 탭 기준으로 홈/업무 화면/프로젝트 상세/통합 검색/개인 설정 브레드크럼을 표시하고, 런칭 검증과 브라우저 QA에서 회귀를 확인 |
| 2026-07-07 | LAUNCH-QA-04 | PMS 브라우저 QA가 기존 Issue 호환성 인박스에서 QA 전용 행을 생성하고 정식 전환 버튼을 실제 클릭해 정식 이슈 생성과 기존 행 종료를 확인하도록 확장 |
| 2026-07-07 | CONTROL-UI-03 | PMS 프로젝트 상세 기존 Issue 호환성 인박스에서 유형별로 정식 이슈·리스크·변경요청을 생성하고 기존 행을 종료 처리하는 수동 전환 동선을 추가 |
| 2026-07-07 | CLOSE-03 | PMS 프로젝트 상세 closeout 패널에 현재 단계의 미해결 산출물·종료조건 처리 큐를 추가하고, 각 큐 항목에서 산출물/종료조건/리뷰 관리 탭으로 이동하도록 보강 |
| 2026-07-07 | CLOSE-02 | PMS 프로젝트 상세 closeout 패널에서 산출물, 종료조건, 리뷰/피드백 탭으로 바로 전환하고 해당 관리 영역으로 스크롤되는 조치 바로가기를 추가 |
| 2026-07-07 | LAUNCH-QA-03 | PMS 브라우저 QA가 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 실제 등록하고, 저장 후 피드백 큐와 보고/리뷰 이벤트 목록에 다시 표시되는지 확인하도록 확장 |
| 2026-07-07 | LAUNCH-QA-02 | PMS 브라우저 QA를 홈→프로젝트 상세→태스크/마일스톤/컨트롤/산출물/종료조건/인수인계/리뷰 탭 흐름으로 확장하고, 모바일 상세 탭 레일이 가로 스크롤로 동작하도록 보강 |
| 2026-07-06 | LAUNCH-QA-01 | PMS 브라우저 QA에서 드러난 목록 API 400 응답을 `limit` 요청 계약으로 정리하고, PMS 전용 한국어 글꼴 스택과 홈/요청 등록 사이드바 흐름 검증 산출물을 보강 |
| 2026-07-06 | BOUND-15 | PMS 런칭 표면의 고객/조직/실행 자산/프로젝트 관계/담당자 fallback 이 숫자 내부 ID를 직접 보여주지 않도록 정리하고 런칭 검증에 회귀 차단 추가 |
| 2026-07-06 | BOUND-14 | PMS 실행 상세 후속 프로젝트 입력을 프로젝트명/번호 검색 선택으로 전환하고, `nextProjectId` 직접 입력/표시 회귀를 런칭 검증에 포함 |
| 2026-07-06 | BOUND-13 | PMS 요청/제안/수행/전환 목록의 고객사 필터를 읽기용 고객 조회 선택으로 전환하고, 고객 열과 fallback 표시에서 숫자 고객 ID가 직접 노출되지 않도록 런칭 검증에 포함 |
| 2026-07-06 | BOUND-12 | PMS 실행 자산 기준정보 CSV/TSV 템플릿을 고객사/사이트/시스템 코드 기반으로 내려받게 하고, 숫자 ID 컬럼은 기존 파일 호환 매핑으로만 유지하도록 런칭 검증에 포함 |
| 2026-07-06 | TASK-UI-01 | PMS 프로젝트 상세 목표/WBS/작업/마일스톤 목록을 모바일 카드로 제공하고, 등록 다이얼로그와 상단 액션을 작은 화면에서 사용할 수 있게 보강 |
| 2026-07-06 | CLOSE-UI-02 | PMS 프로젝트 상세 산출물 탭을 모바일 카드 목록으로 제공하고, 산출물/종료조건 추가 다이얼로그와 상단 액션을 작은 화면에서 사용할 수 있게 보강 |
| 2026-07-06 | CONTROL-UI-02 | PMS 프로젝트 상세 컨트롤 탭의 기존 Issue 호환성 인박스를 모바일 카드 목록으로 제공하고, 새 작성은 정식 통제 패널로 유도한다는 기준을 런칭 검증에 포함 |
| 2026-07-06 | CONTROL-UI-01 | PMS 프로젝트 상세 통제 탭의 이슈/요구사항/리스크/변경/이벤트 목록을 모바일 카드로 제공하고, 각 등록 다이얼로그를 작은 화면에서 스크롤 가능하게 보강 |
| 2026-07-06 | REPORT-03 | PMS 리뷰/피드백 탭의 보고 이벤트와 피드백 큐를 모바일 카드 목록으로 제공하고, 피드백 이슈/리뷰 이벤트 등록 다이얼로그를 작은 화면에서 스크롤 가능하게 보강 |
| 2026-07-06 | BOUND-11 | PMS 인수인계 등록의 배정 역할 텍스트 코드 입력을 제거하고, 활성 프로젝트 멤버 역할 코드 선택과 역할/멤버명 우선 표시를 런칭 검증에 포함 |
| 2026-07-06 | BOUND-10 | PMS 요청/제안/전환 상세 담당자 입력에서 숫자 사용자 ID 직접 입력을 제거하고, 현재 프로젝트 멤버 선택으로 저장하도록 런칭 검증에 포함 |
| 2026-07-06 | BOUND-09 | PMS 프로젝트 직접 관계 추가에서 숫자 프로젝트 ID 직접 입력을 제거하고, 프로젝트명/번호 검색 선택과 런타임 프로젝트 검색 검증으로 확인 |
| 2026-07-06 | BOUND-08 | PMS 프로젝트 멤버 추가에서 숫자 사용자 ID 직접 입력을 제거하고, 프로젝트 문맥의 활성 공용 사용자 lookup 선택과 1차 소속 조직 앵커 전달을 런칭 검증으로 확인 |
| 2026-07-06 | MVP0-01-PROJECT-ASSET-ANCHOR-LABEL | PMS 프로젝트 목록/상세/생성/수정 응답에 plant/site와 system instance 이름·코드를 읽기 전용으로 반환하고, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면 및 런타임 검증에서 확인 |
| 2026-07-06 | BOUND-07 | PMS 프로젝트 조직 supplier/partner 연결에서 숫자 조직 ID 직접 입력을 제거하고, 프로젝트 문맥의 읽기 전용 공용 조직 lookup 선택과 런칭 검증으로 확인 |
| 2026-07-06 | MVP0-01-PROJECT-CUSTOMER-ORG-ANCHOR | PMS 프로젝트 목록/상세/생성 응답에 고객명과 공용 조직 앵커 메타데이터를 읽기 전용으로 반환하고, 상태별 목록·작업 큐·프로젝트 기본정보 읽기 화면 및 런타임 검증에서 확인 |
| 2026-07-06 | DOC-REF-01 | PMS 서버/웹 TypeDoc reference 를 최신 소스로 재생성해 제거된 고객사 쓰기 DTO·mutation·관리 화면 문서를 삭제하고, stale reference 회귀를 `verify:pms-launch` 에서 차단 |
| 2026-07-06 | UI-LAUNCH-02 | 상태별 legacy 목록의 실제 동작 없는 삭제 alert 액션을 제거하고, 노출 PMS 메뉴가 실제 화면 컴포넌트에 매핑되는지 `verify:pms-launch` 에서 고정 |
| 2026-07-06 | MVP0-01-CUSTOMER-ORG-ANCHOR | PMS 고객사 읽기 조회에 공용 조직 앵커 메타데이터를 함께 반환하고, 공용 조직 코드/명 검색과 프로젝트/요청/기준정보 선택지 표기 및 런타임 검증을 추가 |
| 2026-07-06 | MIG-02 | PMS core project/member/org/relation/handoff/planning/control/report 테이블과 history table formal migration bundle 을 db-init protected baseline 적용 경로에 포함하고 CRM 원장 비소유 경계를 `verify:pms-launch` 소스 검증으로 고정 |
| 2026-07-06 | MIG-01 | PMS 실행 자산 기준정보와 공유 반입 프로필 formal migration bundle 을 db-init protected baseline 적용 경로에 포함하고 `verify:pms-launch` 소스 검증으로 고정 |
| 2026-07-06 | HOME-02 | PMS 홈의 바로 이동/권한별 업무 동선에서 프로젝트 리뷰/피드백 탭으로 직접 진입하도록 홈 요약 액션 계약과 런타임 검증을 추가 |
| 2026-07-06 | REPORT-02 | 프로젝트 상세 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 직접 등록해 사용자 launch feedback 을 정식 PMS 이슈/이벤트로 수집 |
| 2026-07-06 | MVP0-01-CUSTOMER-READONLY | PMS 고객사 관리 CRUD 화면/API/mutation/DTO export 를 제거하고 프로젝트 생성·기준정보 선택용 읽기 조회만 유지 |
| 2026-07-03 | LAY-01 | PMS 모바일 준비 중 차단 화면을 제거하고 헤더 메뉴 버튼, 오버레이 사이드바, 탭바, 콘텐츠 유지형 모바일 레이아웃 1차 추가 |
| 2026-07-03 | MVP0-01-IMPORT-PROFILE-HISTORY | PMS 실행 자산 기준정보 CSV/TSV 반입의 서버 공유 매핑 프로필 이력 조회와 선택 이력 복구 1차를 추가 |
| 2026-07-03 | MVP0-01-IMPORT-PROFILE-DEFAULT | PMS 실행 자산 기준정보 CSV/TSV 반입의 서버 공유 매핑 프로필에 기본 지정/해제 UI와 저장 payload 연결을 추가 |
| 2026-07-03 | MVP0-01-IMPORT-PROFILE | PMS 실행 자산 기준정보 CSV/TSV 반입 매핑을 서버 공유 프로필로 저장·조회·수정·삭제하고 화면에서 재사용하는 1차를 추가 |
| 2026-07-03 | MVP0-01-IMPORT-TEMPLATE | PMS 실행 자산 기준정보 CSV/TSV 반입에 템플릿 다운로드와 브라우저 로컬 컬럼 매핑 저장·불러오기 1차를 추가 |
| 2026-07-03 | MVP0-01-IMPORT-FILE | PMS 실행 자산 기준정보 반입 화면에 CSV/TSV 파일 업로드, 대상 선택, 컬럼 매핑, 행 미리보기 1차를 추가 |
| 2026-07-03 | MVP0-01-IMPORT | PMS 실행 자산 기준정보 JSON 반입 미리보기/적용 API와 관리자 반입 다이얼로그, 기존 코드 갱신 smoke 를 추가 |
| 2026-07-03 | MVP0-01-PROJECT-ANCHOR | 프로젝트 요청 등록과 기본정보 편집에서 플랜트/사이트·시스템 인스턴스 선택을 연결하고 서버 anchor 정합성 검증 및 `verify:pms-launch` 런타임 smoke 추가 |
| 2026-07-03 | MVP0-01-CRUD | PMS 실행 자산 기준정보 관리자 생성·수정·비활성화 1차 표면과 `verify:pms-launch` 쓰기 smoke 추가 |
| 2026-07-03 | ROLE-01 | 프로젝트 멤버 추가 화면의 역할 선택을 `PROJECT_MEMBER_ROLE` 코드 그룹 기반으로 고정하고 정적 fallback 역할 목록을 제거 |
| 2026-07-03 | REPORT-01 | 프로젝트 상세 리뷰 탭에서 보고/리뷰 이벤트, 연결 산출물/종료조건 readiness, 열린 이슈/리스크/변경/인계 대기 피드백 큐를 읽기용으로 노출 |
| 2026-07-03 | VER-02 | `verify:pms-launch` 런타임 검증을 인증 후 프로젝트 상세, 작업, 산출물, 종료조건, 인수인계, 계약 스냅샷 API smoke 로 확장 |
| 2026-07-03 | UI-EXEC-01 | 실행 상세의 계약/청구 값을 편집 필드에서 제외하고 읽기용 스냅샷으로 정리 |
| 2026-07-03 | HAND-01 | 프로젝트 상세에 인수인계 전용 탭과 계약/대금 읽기용 스냅샷을 추가 |
| 2026-07-03 | BOUND-02 | 오래된 PMS 기회/요청/제안 도메인 문서를 CRM 분리 기준으로 현행화 |
| 2026-07-03 | BOUND-01 | PMS-CRM 책임 경계와 런칭 조각 문서화 |
| 2026-07-03 | MVP0-01 | PMS 실행 자산 기준정보 1차 스키마/API/시드/관리 조회 화면 추가 |
| 2026-07-02 | AI-RAG-08B | PMS task controlled AI index backfill endpoint 및 공유 요청/응답 계약 추가 |
| 2026-06-08 | DASH-02 | PM 운영 포커스 위젯으로 수행/정체/담당자/종료 후보를 홈에서 노출 |
| 2026-06-08 | CLOSE-01 | 프로젝트 상세 상단에 산출물/종료조건 readiness 기반 closeout 패널 추가 |
| 2026-06-08 | VER-01 | `scripts/verify-pms-launch-readiness.mjs` 및 `verify:pms-launch` 명령 추가 |
| 2026-04-07 | FLOW-01 | 대시보드 프로젝트 상세 진입 계약을 목록 화면 규약에 맞춤 |
| 2026-04-07 | RULE-01 | 종료조건 체크 시 산출물 필요 조건 검증 추가 |
| 2026-04-07 | DOC-01 | planning 문서를 실제 PMS 구현 단계에 맞게 재기준화 |
| 2026-01-21 | - | 즐겨찾기 DB 연동 |
| 2026-01-21 | - | 커스텀 스크롤바 시스템 |
| 2026-01-21 | - | API/아키텍처 문서화 |
| 2026-01-20 | IMM-01 | 자동 품질 게이트 구축 |
| 2026-01-20 | IMM-02 | 하드코딩 URL 수정 |
| 2026-01-20 | IMM-03 | 인증 가드 타입 개선 |
| 2026-01-20 | WEB-05 | DataTable 분리 |
| 2026-01-20 | WEB-06 | MainSidebar 분리 |

---

## 🗃️ 아카이브

> 완료된 항목 중 30일 이상 지난 것은 아카이브로 이동합니다.

- [완료된 백로그 아카이브](../_archive/backlog-completed.md) *(예정)*

## Changelog

| Date | Change |
|------|--------|
| 2026-07-13 | Added `HOME-04`: PMS home summary now exposes uncollapsed launch feedback signal rows and the home screen renders a dedicated launch feedback queue panel for direct review-tab triage across multiple projects. |
| 2026-07-13 | Added PMS launch host readiness verification: `verify:pms-launch-host` checks host free space, the Windows/Docker host mounts, and Docker CLI/Compose responsiveness before a rebuild attempt. This separates current Docker rebuild blockers from PMS feature completion. |
| 2026-07-10 | Added PMS AI/RAG provider-ready completion runner: `complete:pms-ai-rag-provider-ready` runs provider-ready env precheck, live PMS runtime evidence generation, and report verification in order, with env-file, Docker runtime, artifact replay, and self-test support. The live Azure-backed provider-ready report artifact remains open. |
| 2026-07-10 | Added PMS AI/RAG provider-ready runtime report verification: `verify:pms-ai-rag-runtime-report` validates the required project/task/member/status provider-ready JSON evidence shape, emits a Markdown summary, ships a template and self-test, and is now watched by the PMS launch gate. The live Azure-backed provider-ready report artifact remains open. |
| 2026-07-10 | Added a retired legacy PMS `Issue` seed baseline: fresh seed no longer creates active `pr_issue_m` demo rows, active demo work is seeded into canonical control tables, source snapshots are preserved in the legacy archive, and launch runtime verification checks global active cleanup count is zero. |
| 2026-07-10 | Added project-level batch canonicalization for pending legacy PMS `Issue` cleanup rows, creating canonical project issues, risks, or change requests before archiving and soft-hiding the source row with a canonicalized cleanup reason. |
| 2026-07-10 | Added project-level batch archive for terminal legacy PMS `Issue` cleanup rows, preserving archive snapshots with a manual cleanup reason while leaving pending rows for canonical conversion. |
| 2026-07-10 | Added server-owned cleanup summary evidence for legacy PMS `Issue` rows: active, pending, terminal, archived, and physical-removal gate counts are exposed in the project control surface and runtime launch verification. |
| 2026-07-10 | Added protected legacy PMS `Issue` archive policy: cleanup hide writes an archive snapshot and history record before soft-hiding the source row, while physical table removal remains a later migration after active cleanup rows reach zero. |
| 2026-07-10 | Retired legacy PMS `Issue` creation from launch surfaces: POST now returns 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED`, web create API/hook/request docs are removed, and launch verification keeps existing rows cleanup-only. |
| 2026-07-10 | Added `CLOSE-APPROVAL-01` for PMS deliverable and close-condition approval routes, including project-member approver steps, assigned-approver decisions, protected migration coverage, and runtime launch verification. |
| 2026-07-10 | Added `CLOSE-TPL-04` to cover PMS deliverable and close-condition template append/replace apply policy, including soft-deactivation of template-excluded active rows and launch runtime verification. |
| 2026-07-09 | Added `CLOSE-STAT-01` to unify PMS deliverable completion vocabulary across server guards, web status choices, transition readiness counts, and launch runtime verification. |
| 2026-07-09 | Added PMS deliverable and close-condition template group lookup/save/selected-apply UX, persisted close-condition deliverable-required policy, and extended launch verification to cover runtime group save/list/apply. |
| 2026-07-09 | Updated PMS event mutations and the review tab PMR/PRR row overlay to reflect successful create/update responses immediately, making browser QA status transitions visible as soon as the API accepts the workflow change. |
| 2026-07-09 | Added PMS-CRM handoff boundary coverage to `verify:pms-launch`: PMS web CRM handoff access is query-only, direct contract/payment edit clients stay absent, and runtime smoke reads a ready CRM PMS handoff preview before applying it as a PMS snapshot with CRM ownership boundary evidence. |
| 2026-07-09 | Stabilized PMS browser QA for accumulated PMR/PRR workflow ledgers by tracking workflow rows with event id and status-code attributes instead of ambiguous approval button text. |
| 2026-07-09 | Added a PMS AI/RAG runtime evidence Markdown summary artifact alongside the JSON report so provider-unavailable Docker proof remains reviewable while provider-ready vector/RAG evidence stays open. |
| 2026-07-09 | Limited PMS review tab PMR/PRR ledger, launch feedback, and review event rendering to recent visible rows while keeping total counts, and adjusted browser QA for capped ledgers. |
| 2026-07-09 | Narrowed the legacy Issue compatibility inbox to pending cleanup rows by default, moved completed/converted rows behind an optional history toggle, and changed legacy Issue delete to soft-hide instead of physical deletion. |
| 2026-07-09 | Added PMR/PRR overdue scheduled publication rollover so the server background worker moves due planned workflow events to approval-requested and notifies recipients. |
| 2026-07-09 | Added PMR/PRR designated-approver enforcement for approval/rejection transitions in the review tab and PMS event API. |
| 2026-07-08 | Added PMR/PRR approval-line policy selection, recipient policy preview, policy evidence in project events, and multi-recipient PMS common notifications. |
| 2026-07-08 | Added repeated PMR/PRR reservation generation, project-member approver assignment, and PMS common notifications for PMR/PRR workflow events. |
| 2026-07-08 | Added a project-event-backed PMR/PRR ledger action and ledger list to the PMS review tab. |
| 2026-07-08 | Added an on-screen PMR/PRR readiness panel to the PMS review tab and extended browser QA to check it. |
| 2026-07-08 | Added a PMS PMR/PRR draft download based on current execution data in the review tab. |
| 2026-07-08 | Added a PMS review snapshot download for launch feedback sharing across review events, captured launch feedback issues, and unresolved review signals. It is explicitly not PMR/PRR report automation. |
| 2026-07-08 | Standardized PMS customer selector captions across request intake, project basic info, and master data management so customer code and common Organization name/code are shown through one shared formatter. Full CRM/Admin/common Organization cutover remains open. |
| 2026-07-08 | Added a PMS review feedback triage loop so captured launch feedback issues can be status-updated or resolved from the review tab, with home feedback summary invalidation and browser QA coverage. |
| 2026-07-08 | Added a PMS demo project status-detail seed baseline and wired it into seed installers and launch gates so projectStatus AI/RAG runtime evidence is reproducible in Docker. |
| 2026-07-08 | Added PMS project member/status AI index projections and widened the runtime evidence gate to project/task/member/status object, chunk, ACL, index state, and retrieval audit verification. Provider-ready artifact evidence remains open. |
| 2026-07-08 | Added a PMS AI/RAG runtime evidence gate that queues and runs project/task backfill jobs, verifies common AI object, chunk, ACL, index state, retrieval audit, and provider-mode behavior. The member/status projection gap from this step was closed by the later 2026-07-08 member/status projection entry. |
| 2026-07-08 | Completed API-01 by normalizing PMS API error responses with stable `PMS_*` detailed codes, failed path, HTTP status metadata, and runtime launch verification for representative invalid project identifier responses. |
| 2026-07-07 | Added HOME-03 so PMS home separates open launch feedback issues into a visible feedback metric and review-targeted signal instead of burying them in generic control issue signals. |
| 2026-07-07 | Added a PMS control-tab cleanup path that converts legacy Issue compatibility rows into canonical project issues, risks, or change requests and then closes the old compatibility row, with launch verification coverage. |
| 2026-07-07 | Added a PMS project detail closeout resolution queue for unresolved current-status deliverables and close conditions, with queue item jumps to the relevant management tabs and launch verification coverage. |
| 2026-07-07 | Expanded PMS launch browser QA to submit a real feedback issue and review event from the project review tab, then verify the saved items are visible in the feedback queue and report/review event list. |
| 2026-07-07 | Expanded PMS launch browser QA from home/request intake to the home-to-project-detail rehearsal path, covering task, milestone, control, deliverable, close-condition, handoff, and review tabs across desktop/mobile, and made project detail tab rails horizontally scrollable on small screens. |
| 2026-07-06 | Fixed PMS launch-screen list requests to use server-compatible `limit` parameters, added PMS-scoped Korean system font priority, and adjusted browser QA artifacts to exercise the MDI tab flow. |
| 2026-07-06 | Switched the PMS execution-detail successor project field from raw project ID input/display to accessible project name/number lookup selection while keeping `nextProjectId` as the compatibility storage field. |
| 2026-07-06 | Switched PMS request/proposal/execution/transition list customer filters from raw customer ID text entry to read-only customer lookup selection, and blocked raw customer ID fallback display in launch verification. |
| 2026-07-06 | Changed PMS execution asset CSV/TSV import templates to code-first columns while keeping raw direct ID fields as compatibility-only mappings, with launch verification coverage. |
| 2026-07-06 | Improved PMS planning/task launch usability with mobile cards for objectives, WBS, tasks, and milestones, plus full-width mobile actions, scrollable small-screen create dialogs, and launch verification coverage. |
| 2026-07-06 | Improved PMS deliverable and close-condition launch usability with mobile deliverable cards, full-width mobile actions, and scrollable small-screen create dialogs, with launch verification coverage. |
| 2026-07-06 | Improved the PMS control tab legacy Issue compatibility inbox with mobile cards while keeping new authoring directed to canonical control panels, with launch verification coverage. |
| 2026-07-06 | Improved PMS project control tab mobile usability with compact cards for issues, requirements, risks, change requests, and events, plus scrollable small-screen create dialogs and launch verification coverage. |
| 2026-07-06 | Improved PMS review/feedback tab mobile usability with compact report/review and feedback queue cards plus scrollable launch feedback dialogs, and added launch verification coverage. |
| 2026-07-06 | Switched PMS handoff assigned role entry from free-text role code input to active project-member role code selection, with launch verification coverage. |
| 2026-07-06 | Switched PMS project member add flow from raw user ID entry to active common user lookup selection, passes the selected user's primary organization anchor when available, and added launch verification coverage. |
| 2026-07-06 | Added plant/site and system instance metadata to PMS project list/detail/create/update responses, rendered execution asset labels in project lists, work queues, and project basic info read view, and extended `verify:pms-launch` runtime smoke to prove the project response contract. |
| 2026-07-06 | Added a project-scoped read-only common organization lookup for PMS project organizations and changed supplier/partner linking from raw organization ID entry to lookup selection, with launch verification coverage. |
| 2026-07-06 | Added customer/common Organization anchor metadata to PMS project list/detail/create responses, rendered it in project lists, work queues, and project basic info read view, and extended `verify:pms-launch` runtime smoke to prove the project response contract. Full CRM/Admin/common Organization cutover remains open. |
| 2026-07-06 | Regenerated PMS server/web TypeDoc reference from current source and added launch verification that removed customer write DTOs, mutation hooks, and customer master page docs stay absent. |
| 2026-07-06 | Removed fake delete alert actions from PMS legacy status list screens and added launch verification that visible PMS menu routes are backed by real page components. |
| 2026-07-06 | Added first common organization anchor projection to PMS read-only customer lookup: responses expose bridged organization metadata, search can match organization code/name, selectors show linked status, and launch verification checks runtime anchored rows. Full CRM/Admin/common Organization cutover remains open. |
| 2026-07-06 | Added PMS core reconciliation foundation migration baseline coverage: project/member/org/relation/handoff/planning/control/report tables and history tables are protected in db-init and checked by `verify:pms-launch` without owning CRM ledgers. |
| 2026-07-06 | Added PMS launch migration baseline coverage: asset master and shared import profile formal migrations are protected in db-init and checked by `verify:pms-launch`. |
| 2026-07-06 | Added a PMS home review-feedback action and direct drilldown into the project review tab so launch users can find the feedback capture surface without navigating through project detail tabs manually. |
| 2026-07-06 | Added direct launch feedback capture in the PMS project review tab: feedback issues and review events now write to existing canonical control/event APIs and runtime launch smoke verifies the flow. |
| 2026-07-06 | Removed PMS-owned customer master write surface from launch scope; PMS keeps customer lookup read-only while CRM/Admin/common Organization cutover remains open. |
| 2026-07-03 | Added shared mapping profile history listing and restore flow for PMS execution asset master CSV/TSV imports. Common Organization cutover remains open. |
| 2026-07-03 | Added default-profile designation UI and save payload wiring for server-backed shared mapping profiles on PMS execution asset master CSV/TSV imports. Common Organization cutover remains open. |
| 2026-07-03 | Added server-backed shared mapping profile schema/API/UI and runtime launch smoke for PMS execution asset master CSV/TSV imports. Common Organization cutover remains open. |
| 2026-07-03 | Added CSV template download and browser-local column mapping save/load/delete controls for PMS execution asset master imports. Shared mapping profile reuse now has a first server-backed slice; common Organization cutover remains open. |
| 2026-07-03 | Added first CSV/TSV upload, entity selection, column mapping, and row preview UX for PMS execution asset master imports. Shared mapping profile reuse now has a first server-backed slice; common Organization cutover remains open. |
| 2026-07-03 | Added first JSON-based dry-run/apply import and merge path for PMS execution asset master rows, including admin import dialog and runtime launch smoke. File upload now has a first CSV/TSV mapping surface and shared mapping profile reuse slice; common Organization cutover remains open. |
| 2026-07-03 | Added first project create/edit selection validation for PMS execution asset anchors: request create and basic-info edit now select plant/site and system instance, while the server validates customer/site/instance consistency. |
| 2026-07-03 | Added first admin CRUD lifecycle for PMS execution asset master rows and extended `verify:pms-launch` with a non-readonly runtime create/update/deactivate smoke. |
| 2026-07-03 | Completed ROLE-01 by making the PMS member-role selector depend on active `PROJECT_MEMBER_ROLE` codes and extending launch verification to block hard-coded role fallback regressions. |
| 2026-07-03 | Completed REPORT-01 by adding a launch-facing project review tab that summarizes report/review events and feedback queue from existing PMS execution data without claiming full legacy reporting/PMO scope. |
| 2026-07-03 | Completed VER-02 by extending `verify:pms-launch` to authenticated PMS runtime API smoke for detail, access/readiness, tasks, deliverables, close conditions, handoff, and contract snapshot. |
| 2026-07-03 | Added first launch-facing handoff tab in project detail with read-only contract/payment snapshot. |
| 2026-07-03 | Completed PMS-CRM boundary documentation and execution-detail contract/billing read-only snapshot cleanup. |
| 2026-07-03 | Added PMS-CRM boundary launch backlog items and moved runtime PMS launch verification expansion to P1. |
| 2026-07-02 | Added project-scoped PMS task controlled AI index backfill endpoint; remaining `AI-RAG-08B` work is provider-ready vector/RAG evidence. |
| 2026-07-02 | Added PMS task RDB projection and task create/update/delete AI index queue hooks; remaining `AI-RAG-08B` work is provider-ready vector/RAG evidence. |
| 2026-07-02 | Added controlled PMS project AI index backfill endpoint; remaining `AI-RAG-08B` work is provider-ready vector/RAG evidence. |
| 2026-07-02 | Added PMS project create/update/delete/detail/stage AI index job queue hooks; remaining `AI-RAG-08B` work is provider-ready vector/RAG evidence. |
| 2026-07-02 | Added PMS project AI index adapter as partial `AI-RAG-08B`; remaining work is provider-ready vector/RAG evidence. |
| 2026-07-02 | Tightened PMS AI/RAG adapter prerequisite to verified provider-ready Markdown summary artifact evidence. |
| 2026-07-02 | Tightened PMS AI/RAG adapter prerequisite to verified provider-ready runtime smoke artifact evidence. |
| 2026-07-02 | Provider-ready workflow and legacy/common retrieval comparison remain required before PMS vector/RAG production readiness is claimed. |
| 2026-07-02 | Added PMS AI/RAG adapter backlog entry. PMS RDB remains canonical; adapter work exposes project/task/member/status as `AiIndexObjectProjection` without moving PMS source-of-truth data into common schema. |
| 2026-06-08 | Added PMS launch closeout dashboard/detail/verification backlog closeout entries. |
| 2026-04-07 | Reorganized backlog around the next executable PMS batches. |
| 2026-02-09 | Add changelog section. |

| 2026-09-14 | 승인-17 검색 가림 개선과 승인-18 검색 진입/복원 대기 반영 |

| 2026-09-15 | 승인-18 검색 복원과 사용자별 탭 보존 완료. 승인-13 설정 문제와 분리 |
