# CRM 원천 데모 마이그레이션 PRD

> 작성: 2026-06-08 / 현재 상태 갱신: 2026-08-24
> 범위: 사용자가 제공한 영업관리 시스템 데모를 SSOO 프레임워크와 디자인 문법에 맞게 이식하기 위한 현재 정본

## 1. 결론 요약

2026-08-18 재감사에서 이전의 원천 완료 결론을 철회하고 기능 28개와 UI/UX 17개 분모를 새로 고정했다. S1~S14 실행 뒤 폐쇄 원장에는 `SRC-01~28` 28/28, `UX-01~17` 17/17, strict demo 45/45(100%)가 기록됐다. 2026-08-24 감사에서는 그 증거가 현재 작업본의 실제 파일내용·current build identity와 결합되지 않은 freshness 공백을 확인했다. 따라서 현재 점수는 `verify:crm-current-demo`의 fresh 격리 DB/API와 17화면·83상태 browser 재실행이 끝날 때까지 미확정이다. 보호 발표자료는 선택 보조 자료이며 필수 분모가 아니다.

기능별 판정과 최종 완료 게이트는 [CRM 원천 기능 패리티 매트릭스](./source-parity-matrix.md)를 따른다. 정적 readiness, Jest, production build는 회귀 증거일 뿐 원천 시나리오 완료 판정을 대신하지 않는다. AI/RAG, 외부 회계 provider, PMS 인계, DMS governance 확장은 원천 패리티 점수에서 제외한다.

기존 `provider-gated 외부 회계·지급 API 실행 mode`와 관련 evidence verifier는 플랫폼 확장 진단으로 유지하되 원천 기능 완료로 계산하지 않는다.

계약 DMS lifecycle artifact 범위에는 `export-policy.md`/`dmsExecution.governance.exportPolicy`와 DMS 설정의 `CRM 계약 산출 정책` 편집 UI가 포함된다. CRM은 이 산출 정책을 직접 소유하지 않고, `/contracts`에서 DMS 실행 결과의 조직 scope별 evidence 경로를 governance evidence로 표시한다.

CRM 계약 DMS 문서 패킷은 공급자 CI `ciStorageRef`와 청구계획 별첨 후보를 attachment evidence path로 표시하고 lifecycle/handoff snapshot에 보존한다. `ciStorageRef`는 DMS working tree 또는 storage adapter 참조로 검증해 `/contracts` 첨부 카드에 `referenceStatus`와 사유를 표시하고, 누락/잘못된 참조는 DMS 초안 readiness를 차단한다. DMS lifecycle 실행은 export policy record, active 템플릿 버전 snapshot, 템플릿 변경 검토, 템플릿 변경 요청 원장, 템플릿 검토, 첨부 확인, 첨부 확정 원장, Word/PDF artifact, 승인 route policy, 공용 사용자/조직 directory snapshot, 결재선 원장 동기화 기록, 승인 workflow record를 evidence로 만들며, `/contracts`는 실행 결과의 governance evidence를 읽기 전용으로 표시한다. DMS 설정의 `CRM 계약 결재선`은 lifecycle 실행에 사용할 route policy와 required roles를 관리하고, `CRM 계약 산출 정책`은 markdown evidence와 Word/PDF artifact의 조직 scope별 산출 경로를 관리한다.

CRM 계약 DMS lifecycle 실행 evidence는 `POST /api/crm/contracts/:id/dms-document-execution-evidence`로 수신한다. 이 endpoint는 DMS가 실제로 만든 Word/PDF/승인 artifact reference를 active handoff snapshot에 completed step으로 남기기 위한 계약이며, CRM이 DMS export runtime이나 승인 워크플로를 대체하지 않는다.

외부 데모는 단순 영업기회 목록이 아니라 다음 업무를 한 화면 체계로 묶은 시스템이다.

1. 영업기회와 견적
2. 영업기회 확정과 계약 전환
3. 계약 등록, 확정, 청구계획
4. 청구실적과 계약대비실적
5. 3개년 사업계획과 사업계획대비실적
6. 내부원가와 AMS 외부원가
7. 사용자, 코드, 회사 정보, 사업년도 관리
8. Word 계약서 자동 생성

런칭 직전 품질을 고려하면 전체 기능을 한 번에 구현하지 말고, 데모에 구현된 기능을 SSOO 방식으로 재해석하여 단계별로 닫아야 한다. 특히 첫 단계는 디자인 일관성 회복과 업무 골격 이식이다.

## 2. 입력 자료 확인 결과

| 자료 | 확인 상태 | 판단 |
|---|---:|---|
| 외부 데모 소스 | 확인 | 단일 HTML과 여러 JavaScript 파일로 구성된 Supabase 기반 프로토타입이다. |
| DB 스키마 문서 | 확인 | 23개 테이블이 정의되어 있으며 영업, 계약, 청구, 사업계획, 원가, 시스템 관리를 포함한다. |
| 영업관리시스템 소개 자료 | 확인 | 25개 슬라이드에서 화면 구성과 주요 기능을 설명한다. |
| 사업부 사업관리 시스템 자료 | 제한 확인·현재 범위 제외 | OLE/DRM 보호 Office 문서라 본문 추출이 되지 않았다. 사용자 지시에 따라 현재 완료 판정에서 제외하며 해제본 제공 시 증분 감사한다. |
| 현재 SSOO 저장소 | 확인 | CRM 웹 앱·서버 API·공유 타입·문서·Docker 3001 포트 골격이 존재한다. 영업기회, 고객/활동, 견적, 계약, 보고, 사업계획, 원가/AMS, 운영 기준은 원천 데모 실행 소스와 DB 스키마를 SSOO CRM 웹/API/DB 경계로 옮기는 1차 흐름으로 전환됐다. 실환경 ERP/API provider 실행 결과와 운영 대조 증거, PMS 신규 프로젝트 자동 생성, provider-ready AI/RAG 운영 검증, CRM 내부 계정/권한/법인 관리는 기본 데모 이식 완료 조건이 아니라 별도 확장 readiness 또는 경계 검토 항목이다. |

| DMS 계약 산출 정책 | 확인 | DMS 설정의 `CRM 계약 산출 정책`이 `system.crmContractExportPolicy`를 저장하고, DMS 계약 lifecycle 실행은 `export-policy.md`와 `dmsExecution.governance.exportPolicy`를 생성한다. `/contracts`는 산출 정책 key/version, 조직 scope, markdown evidence 경로, Word/PDF artifact 경로를 읽기 전용 governance evidence로 표시한다. |

## 3. 원천 데모 기능 범위

### 3.1 영업 화면

| 화면 | 원천 데모 기능 | SSOO 이식 판단 |
|---|---|---|
| 대시보드 | 전체 건수, 확정 매출, 확정 이익, 평균 이익률, 최근 영업기회 | 구현·브라우저검증. 홈 요약 밴드에서 원천 6개 최신 그룹과 합계 2,156,150,000원을 대조했다. |
| 영업기회 현황 | 검색, 상태 필터, 매출 정렬, 최신 차수 기준 조회, 이전 차수 펼침 | 구현·브라우저검증. 검색·복합필터·정렬·차수·확정·삭제 규칙을 확인했다. |
| 영업기회 등록/수정 | 고객, 건명, 담당자, 기간, 사업구분, 계열, 국내/해외, 수금조건, 특별할인, 매출/원가 그리드 | 구현·브라우저검증. 모든 원천 필드와 매출/원가 5개 유형을 저장·재조회했다. |
| 견적서 | 영업기회 데이터로 견적서 미리보기, 인쇄/PDF 저장 | 구현·브라우저검증. A4 인쇄/PDF, 견적 상태, 공급자/담당자, DMS template lifecycle을 확인했다. |
| 계약서 생성 | Word 템플릿 업로드, 변수 치환, 문서 다운로드 | 구현·브라우저검증. DMS에 올리고 선택한 실제 DOCX binary의 OOXML 변수를 치환해 다운로드·재열기까지 확인했다. |

### 3.2 계약 화면

| 화면 | 원천 데모 기능 | SSOO 이식 판단 |
|---|---|---|
| 계약 현황 | 확정 계약 목록, 매출/원가/기간/WBS/상태, 필터/정렬 | 구현·브라우저검증. 원천 5개 계약 seed와 검색·상세 수치를 대조했다. |
| 계약 등록/수정 | 계약 기본정보, 매출/원가 항목, WBS, 청구계획 자동 분할 | 구현·브라우저검증. 영업기회 전환과 전 필드 저장, 7개월 자동분할 합계 오차 0을 확인했다. |
| 계약 확정/취소 | 계약 확정 잠금, 확정 취소, 계약 삭제 | 구현·브라우저검증. 확정·해제·삭제와 역할 잠금을 확인했다. |
| 계약청구실적 | 계획 대비 실제 청구/외부원가 입력 | 구현·브라우저검증. 확정 계약 저장·재조회와 해제 후 disabled 잠금을 확인했다. |
| 계약대비실적 | 월별 계획/실적 비교, 필터, 틀고정 그리드 | 구현·브라우저검증. 계획·실적·차이와 필터를 실제 수치로 대조했다. |
| 보고 Preview | 사업구분/담당자/WBS별 요약, 월별 trend, 확인 항목 | 1차 구현됨. `/reports`는 영업기회 pipeline과 확정 계약 월별 계약대비실적 read model을 집계하고, `POST /crm/reports/confirm`과 `/crm/reports/confirmations/:id/reopen`은 현재 Preview를 `crm.crm_report_confirmation_m` CRM 보고 snapshot 원장으로 확정/해제한다. 회계 전표 생성, PMS 수행 KPI 편집, DMS 문서 저장 확정은 후속이다. |

### 3.3 사업관리/원가 화면

| 화면 | 원천 데모 기능 | SSOO 이식 판단 |
|---|---|---|
| 사업계획 등록 | 3개년 계획, 차수, 확정/해제, 전년 이월 | 구현·브라우저검증. 3개년 source grid, 12개월 매출·외부원가, 미래연도 연간값, 행 CRUD, TSV 붙여넣기, 차수 생성·이월·확정·해제·삭제를 확인했다. |
| 사업계획대비실적 | 확정 계획과 계약 청구계획 비교 | 1차 진행: `/business-plan-performance`에서 확정 사업계획 차수가 있으면 해당 원장 line의 월별 입력값을 우선 사용하고 미입력 line은 연간 계획 매출을 월 균등 배분해 확정 계약 월별 실적과 비교한다. 확정 차수가 없으면 pipeline 후보와 확정 계약 월별 청구계획/실적 fallback을 계획/실적/차이 구조로 표시하고, 확정 내부원가/AMS 원가는 별도 `confirmed-cost` source row로 합산한다. 같은 WBS에 정산 확정된 AMS 외부원가가 있으면 계약 성과 외부원가 계획/실적을 제외해 중복을 조정한다. `POST /crm/business-plan/performance-actual/monthly`와 직접 입력 패널은 별도 원장에 12개월 매출·원가 실적을 저장해 `manual-actual` source row로 합산한다. 확정 원가의 CRM 회계·지급 handoff snapshot, demo 실행 evidence, provider-gated 외부 API 실행 evidence는 원가/AMS 화면에서 관리하고 실환경 ERP/API 완료 판정은 provider 실행 결과와 운영 대조 증거가 필요하다. |
| 내부원가 등록 | 인건비, 기타, 부서조정, 용역비, 부서공통의 계획/실적/차이 | 구현·브라우저검증. 고정 5개 항목의 12개월 계획·실적·차이, TSV 붙여넣기와 확정 잠금을 확인했다. |
| AMS 공급업체 관리 | 사업년도별 업체와 WBS 매핑 | 구현·브라우저검증. 업체 master CRUD, 다중 WBS와 업체×WBS mapping을 확인했다. |
| AMS 연간외부원가 | 업체×WBS별 월간 계획/실적/차이 | 구현·브라우저검증. 12개월 계획·실적·차이, TSV 붙여넣기와 정산 잠금을 확인했다. 외부 회계 provider는 별도 extension readiness다. |

### 3.4 시스템 관리

| 화면 | 원천 데모 기능 | SSOO 이식 판단 |
|---|---|---|
| 계정 관리 | 사용자 등록, 편집, 비활성화, 비밀번호 초기화 | 공용 Admin/Auth로 치환·브라우저검증. 계정 CRUD, 상태, 역할, 초기화와 역할별 deny/allow를 확인했다. |
| 코드 관리 | 사업구분, 계열구분, 수금조건 등 코드 | 공용 Admin 코드 master로 치환·브라우저검증. CRUD·비활성·CRM option 반영을 확인했다. |
| 회사 정보 | 견적서/계약서 공급자 정보 | CRM 설정과 DMS storage 경계로 치환·브라우저검증. 공급자 CRUD, CI upload/download/remove와 견적·계약 소비를 확인했다. |
| 사업년도 관리 | 계획/실적 조회 기준 연도 | CRM `/business-years`와 `crm.crm_business_year_m`에서 관리. 기존 추가·활성/비활성·삭제·조회조건 소비를 유지하며 회계 마감은 이번 범위에 포함하지 않는다. |
| 프로필 편집 | 사용자 정보/비밀번호 | 공용 프로필/Auth로 치환·브라우저검증. 프로필·비밀번호 변경, 이전/신규 암호 로그인과 30분 idle 만료를 확인했다. |

## 4. 원천 DB 모델 요약

원천 스키마는 23개 테이블로 구성되어 있다.

| 영역 | 테이블 수 | 핵심 데이터 |
|---|---:|---|
| 사용자/시스템 | 4 | 사용자, 코드, 회사 정보, 사업년도성 코드 |
| 영업기회 | 6 | 영업기회, 매출 상품/용역, 원가 상품/내부용역/외부용역 |
| 계약 | 7 | 계약, 계약 매출/원가 상세, 청구계획, 청구실적 |
| 사업계획 | 2 | 사업계획, 월별 계획 |
| 내부원가 | 1 | 월별 내부원가 계획/실적 |
| AMS 외부원가 | 3 | 공급업체, 업체-WBS 매핑, 월별 외부원가 |

SSOO 이식 시에는 원천 테이블명을 그대로 복사하지 않는다. 다음 원칙을 적용한다.

1. 사용자와 권한은 SSOO 공용 사용자/권한 체계를 사용한다.
2. 영업기회, 견적, 계약, 청구, 계획, 원가는 CRM 도메인 또는 PMS와의 명확한 경계 아래 재모델링한다.
3. 금액, 상태, 차수, 확정, WBS, 수금조건은 이력과 감사가 가능한 구조로 둔다.
4. 문서 산출물은 CRM이 업무 문맥을 소유하고 DMS가 파일/템플릿/검토/첨부를 소유한다.

## 5. SSOO 제품 경계

CRM은 PMS의 계약/수행 화면을 대체하거나 중복 구현하지 않는다. PMS 병렬 세션의 현재 문서 기준, PMS는 실행 프로젝트의 baseline close를 진행 중이며 handoff/contract/payment backend foundation은 있으나 web surface와 migration/verification은 아직 닫히지 않았다. 따라서 CRM 이식은 다음 경계를 전제로 한다.

### CRM이 소유할 것

- 영업기회와 파이프라인
- 견적 후보, 견적 상태, 견적 산출 근거
- 계약 전환 전 영업 확정
- 계약 원장성 정보와 청구/매출/원가의 영업·계약 측 입력
- 매출/원가/손익 계산 근거
- 고객/담당자/기간/사업구분/계열/국내외/WBS 후보
- 계약 확정 전후의 영업 관점 상태, 잠금, 이력, 보고 기준값

### PMS가 소유할 것

- 실행 프로젝트의 태스크, 이슈, 리스크, 마일스톤
- 프로젝트 수행 상세와 종료조건
- 수행 인력/산출물 진행률
- PM 관점의 납기·품질·이슈 관리
- 계약 이후 수행 단계의 작업 계획, 변경 요청, 산출물, 전환 준비

### CRM과 PMS 사이의 연결 방식

- CRM은 계약·청구·매출·원가의 원장성 편집 주체로 둔다.
- PMS는 실행에 필요한 계약/인계 정보를 명시 반영된 스냅샷 또는 인계 패킷으로 소비한다. 현재 PMS 상세 인수인계 탭은 CRM 계약 후보를 검색하고 선택 계약의 PMS 인계 preview를 조회한 뒤, 준비 완료 preview만 `/api/projects/:id/contracts/crm-handoff-snapshot`으로 기존 프로젝트 계약/대금/인계 스냅샷에 반영한다.
- PMS가 계약 금액, 청구계획, 지급/수금 실적을 직접 편집하는 화면은 만들지 않는다.
- CRM 1단계에서는 CRM 계약 preview와 PMS 기존 프로젝트 스냅샷 반영만 명시한다.
- CRM에서 PMS 신규 프로젝트를 자동 생성하지 않는다. 신규 실행 프로젝트가 필요하면 PMS 일반 프로젝트 생성 workflow를 먼저 통과한다.

### DMS와 연결하되 CRM이 직접 소유하지 않을 것

- 견적서/계약서 파일 저장소
- 문서 뷰어, 첨부, 버전, 검토 상태
- Word 템플릿 보관과 문서 검토 워크플로
- CRM 견적 상세는 `/api/crm/opportunities/:id/quote-preview`로 DMS 견적 초안 readiness, `crm-quote-v1` active template source path, 템플릿/폴더/파일명 hint, deterministic 초안 경로, 최신 handoff id/status/savedAt, 문서 변수, DMS 견적 lifecycle을 제공하고, 준비 완료 견적은 `/api/crm/opportunities/:id/quote-dms-document-draft`로 DMS markdown 초안을 저장한 뒤 `crm.crm_quote_dms_handoff_m`에 문서/변수/lifecycle snapshot을 남긴다. `POST /api/crm/opportunities/:id/quote-dms-document-lifecycle-execution`은 DMS quote lifecycle 실행기로 template-version/template-review record와 DOCX/PDF artifact evidence를 만들고 active handoff lifecycle에 반영한다. `POST /api/crm/opportunities/:id/quote-dms-document-execution-evidence`는 외부 DMS 실행 결과의 template-review/DOCX/PDF evidence path도 같은 수신 계약으로 반영한다. DMS 설정의 관리자 템플릿 목록은 `crm-quote-v1` reviewConfirmation 검토 확정 상태를 기록한다.
- CRM 계약 상세는 `/api/crm/contracts/:id/dms-document-preview`로 계약서 입력 변수, 공급자 법인정보 readiness, 템플릿/폴더/파일명 hint, deterministic 초안 경로와 저장된 초안 경로, 최신 handoff id/status/savedAt, DMS `crm-contract-v1` active 템플릿 source path, CRM markdown 초안부터 DMS 템플릿 검토/첨부 확인/Word 산출/PDF 저장/승인까지의 lifecycle checklist를 제공하고, 준비 완료 계약은 `/api/crm/contracts/:id/dms-document-draft`로 DMS markdown 초안을 저장한 뒤 `crm.crm_contract_dms_handoff_m`에 문서/변수/첨부/lifecycle snapshot을 남긴다. DMS `POST /dms/crm-contract-lifecycle/executions`는 이 handoff를 입력으로 템플릿 버전 snapshot, 템플릿 변경 검토 기록, 템플릿 변경 요청 원장, 템플릿 검토 기록, 첨부 확인 기록, 첨부 확정 원장, DOCX/PDF artifact, 승인 route policy record, 공용 사용자/조직 directory snapshot, 승인 workflow record를 생성하고 CRM은 해당 evidence와 governance snapshot을 수신해 `/contracts`에서 표시한다.
- CRM 계약 DMS 첨부 evidence는 공급자 CI `ciStorageRef`와 `계약코드#billing-plan:n` 청구계획 참조 경로를 표시하며, `ciStorageRef`는 DMS working tree/storage adapter 참조로 검증되어 `/contracts`에 `referenceStatus`와 사유가 표시된다. DMS lifecycle 실행은 이를 `attachment-finalization-ledger.md`와 `dmsExecution.governance.attachmentFinalizationLedger`에 확정 원장으로 보존한다. 운영 조직 기준 export 정책은 DMS 설정의 `CRM 계약 산출 정책`과 `export-policy.md` evidence로 관리한다.
- CRM 계약 DMS 실행 evidence 수신은 DMS가 완료한 step의 evidence path를 CRM handoff snapshot에 반영하는 수준이며, 결재선 정책 편집 자체는 DMS 설정이 소유한다.

### 공용 영역으로 흡수할 것

- 사용자 계정과 권한
- 로그인/세션/프로필
- 메뉴 접근 제어
- 조직/역할 기반 권한 판정
- 법인, 조직, 사용자, 역할, 시스템 접근권한, 관리자 운영 화면

### Admin/공용 운영 경계

- 원천 데모의 계정 관리, 비밀번호 초기화, 프로필 편집은 CRM 기능으로 이식하지 않는다.
- CRM은 공용 사용자/권한/조직/법인 모델을 참조한다.
- CRM 고유 설정은 영업/계약 업무 설정에 한정한다. 예: 영업상태, 수금조건, 사업구분, 계열, 견적/계약 표시 정책.
- 공용 관리자 영역에서 관리되어야 할 요소를 CRM 내부 메뉴로 복제하지 않는다.
- `/api/crm/operations/preview`와 `/operations`는 이 경계를 검토하는 읽기 전용 surface이며, 계정/비밀번호/역할/법인/CI 파일을 CRM 내부 action으로 열지 않는다.
- 런칭 전까지 공용 관리자/권한 모델이 부족한 부분은 CRM 내부 임시 구현으로 우회하지 말고 백로그로 남긴다.

## 6. 디자인·사용성 기준

현재 외부 데모는 기능 확인용 프로토타입 성격이 강하다. SSOO 런칭 품질로 이식할 때는 다음 기준을 우선한다.

1. 좌측 메뉴와 페이지 헤더는 SSOO의 공용 앱 셸을 따른다.
2. 카드, 표, 배지, 버튼, 입력 높이는 기존 SSOO 토큰을 따른다.
3. 업무 화면은 "많은 데이터를 빽빽하게 보여주는 ERP식 표"와 "SSOO의 현대적 업무 허브" 사이를 조정한다.
4. 미구현 기능은 버튼처럼 보이게 두지 말고 "다음 구현 예정"으로 명확히 표시한다.
5. 영업기회 기반 계약 전환은 최신 확정 영업기회에서만 실행 액션으로 표시하고, DMS 연결과 PMS 인계처럼 실제 연결이 없는 것은 절대 구현된 것처럼 표현하지 않는다.
6. 첫 화면은 대시보드보다 "영업기회 현황 + 등록/수정" 흐름을 먼저 완성한다.

## 7. 단계별 마이그레이션 계획

### 0단계: 기준선 문서화와 앱 골격

목표: CRM을 SSOO의 독립 워크스페이스로 세울 수 있는 최소 구조를 만든다.

완료 조건:
- CRM 문서 정본 생성
- CRM 앱/서버/타입/DB 경계 확정
- 기존 SSOO 앱 셸과 디자인 토큰을 재사용하는 화면 골격 생성
- Docker 포트와 빌드 스크립트 정의
- PMS/공용 Admin/DMS와 중복되지 않는 경계 문구를 화면과 문서에 반영

### 1단계: 영업기회 핵심

목표: 원천 데모의 영업기회 현황과 등록/수정 기능을 SSOO 방식으로 이식한다.

포함:
- 영업기회 목록, 검색, 필터, 정렬
- 대시보드 핵심 지표
- 영업기회 상세/등록/수정
- 매출 상품/용역, 원가 상품/내부/외부용역 입력
- 금액, 원가, 손익, 이익률 계산
- 수금조건, 특별할인, 할인 전 매출과 최종 매출 구분
- 차수, 확정, 확정 후 잠금
- 원천 데모 샘플 데이터 기반 시드

제외:
- 실제 견적서 PDF/Word 생성
- DMS 파일 연결
- PMS 인계
- CRM 내부 계정/권한/법인 관리

### 2단계: 견적·계약 전환

목표: 영업기회에서 견적/계약 후보를 만들고 계약 현황으로 전환하는 흐름을 만든다.

포함:
- 견적 미리보기, 견적 상태 저장, DMS markdown 초안 handoff
- 계약 현황 목록
- 계약 등록/수정
- 영업기회 기반 계약 전환과 전환 후 영업기회 잠금
- 청구계획 자동 분할
- 계약 확정/취소의 권한과 이력
- 회사 정보 기반 문서 표시값
- PMS 실행 전환용 읽기 스냅샷/인계 후보 생성
- DMS 계약서 생성을 위한 읽기 전용 문서 입력 패킷 preview

제외:
- 완전한 전자결재
- 외부 회계 연동
- PMS 수행 데이터 직접 편집
- 공용 계정/조직/권한 관리자 화면

### 3단계: 청구실적과 보고

목표: 계약 이후 청구계획 대비 실적을 관리하고 월별 보고 화면을 제공한다.

포함:
- 청구실적 입력
- 계획/실적/차이 계산
- 계약대비실적 월별 표
- 필터와 합계

### 4단계: 사업계획·원가·AMS

목표: 원천 데모의 사업부 사업관리 범위를 SSOO에서 닫는다.

포함:
- 3개년 사업계획 preview
- 차수와 확정/해제
- 사업계획대비실적
- 내부원가 계획/실적
- AMS 공급업체/WBS 매핑
- AMS 외부원가 계획/실적

## 8. 현재 패리티 상태

자체 추정 가중 백분율은 폐기한다. 2026-08-21 최종 회귀 기준 상태는 다음과 같다.

| 판정 | 사실 |
|---|---|
| 원천 분석 | 제공된 prototype/DDL과 source-owned SQL로 REF-01 17개 화면·83개 state·hash 기준과 DDL 23개 table을 고정 |
| 구현·자동검증 | S1~S12 구현, source fixed hash, goal-contract, UI/UX all, quote artifact, server test/build PASS |
| 구현·브라우저검증 | UX-01~17의 83/83 source/desktop/mobile capture, 구조·interaction·content visual diff, E0 PASS |
| 부분·미구현 | strict demo 분모의 부분·누락·치환 검증·원천 모순 0 |
| 플랫폼 치환 검증 | 공용 Admin/Auth와 CRM/DMS owner surface를 원천 시나리오·UI/UX·권한 기준으로 재검증 완료 |
| 런칭 증거 | `OPS-01~17`과 `BT-01~27` 완료. EXT-01~02는 실제 배포 입력으로 별도 대기 |

상세 28개 요구사항은 `source-parity-matrix.md`를 정본으로 사용한다.

## 9. 완료 후 유지 작업

1. 원천 6개 영업기회와 5개 계약 seed를 idempotent하게 유지한다.
2. CRM 기능 변경 시 패리티 매트릭스와 직접 테스트 가이드를 함께 갱신한다.
3. 정적/Jest/build verifier와 desktop/mobile 브라우저 회귀를 함께 실행한다.
4. AI/RAG, 외부 회계 provider, PMS 자동생성과 같은 원천 밖 기능은 별도 extension readiness로 관리한다.
5. 보호 발표자료 해제본이 제공되면 알려진 hash를 확인하고 선택 보조 증거로 증분 감사한다. 현재 `SRC-28`은 오류/빈 상태/수동 복구/권한 fallback 항목이며 보호자료를 뜻하지 않는다.

### 이전 계획 기록(실행 기준 아님)

아래 목록은 2026-08-11 패리티 재감사 전 계획 기록이며, 현재 실행 순서는 위 목록과 패리티 매트릭스가 우선한다.

다음 작업은 기능 확장보다 1단계 이식 준비를 닫는 것이다.

1. 현재처럼 PMS를 가장 가까운 업무 베이스로 삼아 화면 밀도, 검색/목록 패턴, 운영 포커스, 상세/등록 기준을 먼저 안정화한다.
2. 원천 영업기회 스키마를 SSOO Prisma 모델로 1차 변환한다. 단, 계정/권한/법인/조직은 공용 참조로 둔다.
3. 견적 후보/미리보기, 견적 상태 저장, 공급자 회사 정보 설정, ownerUserId 기반 담당 연락처, 견적 DMS markdown 초안 handoff와 DMS quote lifecycle artifact 실행/evidence 수신, PMS 인계 후보 preview와 PMS 기존 프로젝트 스냅샷 반영, DMS 계약서 문서 패킷 preview와 markdown 초안 저장, DMS lifecycle artifact 실행 1차와 export policy record/템플릿 버전/템플릿 변경 검토/템플릿 변경 요청 원장/첨부 확정 원장/승인 route policy/공용 사용자·조직 directory snapshot/결재선 원장 동기화 기록/다자 승인 workflow evidence UI 표시, DMS 설정의 CRM 계약 결재선 정책 편집 UI와 CRM 계약 산출 정책 편집 UI, 운영 기준 preview는 CRM 원장 기반 surface로 시작했으므로, 다음 slice에서는 결재선 정책·산출 정책이나 공용 Admin/Auth 기능을 CRM 내부 액션처럼 보이게 만들지 않는다.
4. 영업기회 확정 이후 계약 전환과 계약 생성 후 opportunity 잠금, 확정 계약 청구실적 입력, 계약대비실적 월별 조회, 보고 Preview와 보고 snapshot 확정, 견적 상태 저장, 견적 DMS lifecycle artifact 실행/evidence 수신, 사업계획 preview snapshot 저장/확정/전년 이월, draft line 월별 계획 매출 입력, 확정 사업계획 기준 월별 대비실적 preview와 확정원가 row 반영, AMS WBS 계약 외부원가 중복 조정, 사업계획대비실적 직접 실적 입력, 원가/AMS preview의 내부원가 월별 계획·실적 입력/확정, AMS 업체-WBS 매핑과 AMS 외부원가 월별 입력/정산 확정, 확정 원가 회계·지급 handoff snapshot, 외부 실행 evidence 수신, CRM demo 실행 evidence 생성, provider-gated 외부 API 실행 mode, `verify:crm-accounting-payment-provider:ready-precheck` provider 환경 precheck, `verify:crm-accounting-payment-provider-report` provider 실행 report verifier, `verify:crm-ai-rag-runtime-report` provider-ready runtime report verifier, `verify:crm-protected-source-reflection-report` 보호자료 reflection report verifier, `verify:crm-local` 로컬 build/test gate, `verify:crm-migration-completion` 완료 감사 gate, PMS 기존 프로젝트 계약/대금/인계 스냅샷 반영, DMS markdown 초안 저장과 CRM handoff lifecycle snapshot 원장, DMS 계약 lifecycle artifact 실행 1차와 export policy record/템플릿 버전/템플릿 변경 검토/템플릿 변경 요청 원장/첨부 확정 원장/승인 route policy/공용 사용자·조직 directory snapshot/결재선 원장 동기화 기록/다자 승인 workflow evidence, DMS 설정의 CRM 계약 결재선 정책 편집 UI와 CRM 계약 산출 정책 편집 UI는 완료됐으므로, 다음 slice에서는 실환경 ERP/API provider 실행 결과와 운영 대조 증거를 별도 승인된 단계로 분리한다.
5. CRM customer/activity 모델, projection source, 고객/활동 Workspace, owner-aware AI projection ACL snapshot, controlled AI backfill endpoint, 고객/활동 API access guard/snapshot 1차와 Workspace capability 연동, CRM 전용 runtime evidence gate와 `verify:crm-ai-rag-runtime-report` report verifier는 추가됐으므로, 다음 slice에서는 SSOO 공통 AI/RAG provider-backed runtime 품질 검증을 별도 확장 readiness로 수집한다.
6. PMS에는 준비 완료 CRM 계약 preview만 기존 프로젝트 스냅샷으로 반영하고 신규 프로젝트 자동 생성은 하지 않는다는 경계를 화면 문구와 백로그에 계속 고정한다.
7. `verify:crm-launch`는 CRM 웹 surface, Next API proxy, 서버 모듈/테스트 파일, CRM DB migration/seed/trigger, PMS/DMS 경계, 완료 판정 evidence 계약 문서화를 점검하는 정적 readiness gate로 유지한다. `verify:crm-local`은 정적 gate, 관련 Jest suite와 CRM production build를 실행하고 schema 2 worktree identity report를 runtime 시작 전에 남기지만 그 단독 PASS는 데모 완료가 아니다. 이후 `build:crm-ralph-runtime`이 격리 public API/WS URL로 server·CRM·Admin·DMS를 강제 build하고 compiled URL과 Next static/server 전체 artifact fingerprint를 기록한다. 기본 `verify:crm-migration-completion`은 `verify:crm-current-demo`에 위임해 source/DDL 계약, schema 2 local/UI evidence, current build fingerprint와 live PID의 시작·종료 재검증, fresh 격리 DB/API runtime, `SRC-01~28` executable mapping, `UX-01~17` 83상태를 모두 같은 worktree identity로 blocking 판단한다. 확장 provider와 보호자료는 계속 `--require-extensions`에서만 별도 readiness로 판단한다. `inspect:crm-migration-inputs`, evidence bundle/template/report 명령은 진단·전달 산출물이며 이 엄격 completion gate를 대체하지 않는다.
   확장 자료 적용 옵션은 `--accounting-payment-report-path`, `--crm-ai-rag-report-path`, `--protected-source-reflection-report-path`이고 환경 변수는 각각 `CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH`, `CRM_AI_RAG_PROVIDER_READY_REPORT_PATH`, `CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH`다. `prepare:crm-migration-evidence`, `prepare:crm-local-evidence-bundle`, `verify:crm-migration-evidence-bundle`이 만드는 `crm-migration-input-inspection`, `crm-migration-required-external-inputs`, `protectedSourceCandidateSummary`, `requiredExternalInputs`, `completionCheckId`, `verificationCommand`, `local-ready-pending-external`은 diagnostic-only input inspection·요청 packet이다. synthetic/self-test evidence marker나 보호 발표자료 반영 marker 제거는 실제 provider/protected-source 증거가 아니다. provider 환경은 `verify:crm-accounting-payment-provider:ready-precheck`, 결과는 `verify:crm-accounting-payment-provider-report`, AI/RAG는 `verify:crm-ai-rag-runtime-report`, 보호자료는 `verify:crm-protected-source-reflection-report`로 별도 확인한다.
8. 빌드, Docker 반영, 디스크 상태를 각 slice마다 함께 검증한다.

## 10. 미해결 질문

1. 원천 데모의 내부원가/AMS는 CRM 앱 안에 둘 것인가, 별도 사업관리 영역으로 나눌 것인가? 사업계획 preview snapshot 차수 원장은 CRM 1차 경계로 둔다.
2. 보호된 발표자료의 내용이 현재 원천 데모보다 최신이라면 어떤 차이가 있는가?
3. DMS lifecycle artifact 실행 1차와 결재선/산출 정책 편집 UI 이후 첨부 확정 원장 역참조와 CRM 원장 역참조를 어떤 DMS API/DB 계약으로 고도화할 것인가?
4. 공용 Admin에서 법인/조직/사용자/권한을 관리할 때 CRM이 필요로 하는 최소 참조 필드는 무엇인가?

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-08-24 | current v1 browser 재실행이 UX-12에서 Admin의 build-time `localhost:4000` API bundle을 검출했다. 격리 public URL 강제 build·compiled chunk 검사·Next 전체 runtime artifact fingerprint·strict 종료 재검증을 추가하고 local verifier는 live runtime 전에 report를 생성하도록 순서를 고정했다 |
| 2026-08-24 | 기본 `verify:crm-migration-completion`을 정적·로컬 PASS 기반 완료 판정에서 `verify:crm-current-demo` strict gate 위임으로 교체했다. source/DDL, schema 2 local/UI evidence, current build/runtime provenance, 격리 DB/API executable SRC 28점과 UX 17점이 같은 worktree identity일 때만 현재 45/45를 허용한다 |
| 2026-07-13 | CRM 데모 이식 완료 기준을 사용자 제공 데모 실행 소스와 DB 스키마의 SSOO CRM 이식/로컬 재현성으로 재정렬했다. 기본 `verify:crm-migration-completion`은 정적 readiness와 `verify:crm-local`만 blocking으로 보고, 외부 ERP/API provider execution report, CRM AI/RAG provider-ready runtime report, 보호 발표자료 reflection report와 반영 marker 제거는 `--require-extensions` 확장 readiness에서만 blocking으로 판단한다 |
| 2026-07-10 | `inspect:crm-migration-inputs`를 추가해 completion env/report path, `.runtime` Office 후보, DMS sidecar source metadata를 진단한다. 진단 JSON은 `protectedSourceCandidateSummary`로 같은 SHA-256 후보를 중복 그룹화하고 `requiredExternalInputs`로 남은 외부 입력 요청을 구조화한다. RMS 보호 Office 후보는 경로 복원 단서일 뿐 완료 증거가 아니다 |
| 2026-07-10 | `prepare:crm-migration-evidence`를 추가해 completion evidence report 3종, `crm-migration-input-inspection` JSON/Markdown, `crm-migration-required-external-inputs` JSON/Markdown request packet, env template, README, manifest를 한 번에 생성한다. bundle self-test는 draft report가 verifier를 통과하지 못하고 input inspection이 diagnostic-only, required inputs가 request-only로 남는지 확인한다 |
| 2026-07-10 | `verify:crm-local`을 추가해 `verify:crm-launch`, CRM 관련 server Jest suite, DMS/PMS CRM boundary test, `pnpm build:web-crm` production build를 한 번에 실행한다. `verify:crm-migration-completion`은 이 로컬 build/test gate도 완료 판정에 포함한다 |
| 2026-07-10 | `prepare:crm-migration-evidence` manifest와 README에 `verify:crm-local -- --report-path=crm-local-verification-report.json` local verification evidence 생성 단계를 추가했다 |
| 2026-07-10 | `crm-migration-required-external-inputs` request packet의 각 항목에 completion audit의 `completionCheckId`와 자료별 `verificationCommand`를 포함해 외부 provider/protected-source 증거 수집 후 어떤 gate를 통과시켜야 하는지 고정했다 |
| 2026-07-10 | `verify:crm-migration-evidence-bundle`을 추가해 prepared bundle의 로컬 검증 report와 외부 evidence report 3종이 각 verifier를 통과하는지 제출 전 확인한다. 이 검증은 bundle 파일 상태만 확인하며 `verify:crm-migration-completion`을 대체하지 않는다 |
| 2026-07-10 | `prepare:crm-migration-evidence -- --local-verification-report-path=<report.json>` 옵션을 추가해 통과한 `verify:crm-local` JSON을 bundle 내부 `crm-local-verification-report.json`으로 복사하고 manifest에 포함 여부를 기록한다 |
| 2026-07-10 | `prepare:crm-local-evidence-bundle`을 추가해 로컬 검증 report 생성 또는 기존 report 복사, migration evidence bundle 준비, 선택적으로 제공된 `--accounting-payment-report-path`, `--crm-ai-rag-report-path`, `--protected-source-reflection-report-path` passed report 적용, bundle verifier 실행을 한 번에 수행하고 남은 외부 evidence report가 draft뿐이면 `local-ready-pending-external` 상태로 기록한다 |
| 2026-07-13 | CRM completion report verifier와 `verify:crm-migration-completion`의 확장 readiness 검사가 synthetic/self-test evidence marker를 기본 거부하도록 강화해 verifier self-test용 JSON이 provider/protected-source 증거로 오인되지 않게 했다 |
| 2026-07-10 | `verify:crm-migration-completion` 실패 출력과 JSON report에 diagnostic-only input inspection을 포함해 로컬 후보 경로와 남은 외부 입력 요청을 같은 audit evidence로 남긴다. 이 진단은 완료 증거가 아니다 |
| 2026-07-10 | CRM 완료 evidence report 3종에 `:template` 스크립트를 추가해 draft JSON 작성 양식을 출력한다. template은 `status: draft`라 그대로 완료 증거가 될 수 없고 실제 provider/protected-source 증거로 채워야 한다 |
| 2026-07-10 | `verify:crm-launch` 문서 assertion을 완료 전 미완료 문구 강제에서 완료 판정 evidence 계약 확인으로 조정했다. 실제 완료 여부는 `verify:crm-migration-completion`의 report evidence와 marker 제거가 판단한다 |
| 2026-07-10 | `verify:crm-protected-source-reflection-report`를 추가해 보호된 CRM 발표자료 해제본 SHA-256, 텍스트 추출, 문서 반영 대상, 미매핑 0건을 검증한다. 이 report는 보호자료가 실제 제공되고 별도 승인된 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-ai-rag-runtime-report`를 추가해 CRM AI/RAG provider-ready runtime report의 opportunity/customer/activity indexed object, embedding, retrieval audit evidence를 검증한다. 이 report는 SSOO 공통 AI/RAG embedding provider가 연결된 환경의 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-accounting-payment-provider-report`를 추가해 외부 회계·지급 `external-api` 실행 report의 전표, 지급 요청, 지급 실행, 외부 시스템 sync evidence와 운영 대조 `matched`/`reconciled` 상태를 검증한다. 이 report는 외부 ERP/API 연계가 별도 승인된 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-migration-completion` 완료 감사 gate를 추가해 CRM 정적 readiness와 로컬 build/test gate를 기본 완료 판정으로 묶고, 외부 회계·지급 provider-ready precheck, provider execution report, CRM AI/RAG provider-ready precheck/runtime report, 보호 발표자료 reflection report와 반영 marker 제거는 명시적 확장 readiness로 분리했다 |
| 2026-07-10 | `verify:crm-accounting-payment-provider:ready-precheck`를 추가해 CRM 회계·지급 외부 ERP/API URL/endpoint 환경을 별도 gate로 점검한다. 이 precheck는 provider 환경 readiness만 확인하며 실제 전표·지급 반영과 운영 대조 증거를 대체하지 않는다 |
| 2026-07-10 | `verify:crm-launch` 정적 readiness gate를 추가. CRM 웹 surface, Next API proxy, 서버 모듈/테스트, CRM DB migration/seed/trigger, PMS/DMS 경계, 완료 판정 evidence 계약 문서화를 함께 점검하되 실제 외부 ERP/API, SSOO 공통 AI/RAG provider-ready runtime artifact, 보호된 발표자료 반영은 완료로 보지 않는다 |
| 2026-07-10 | CRM 원가/AMS 회계·지급 실행에 provider-gated 외부 ERP/API mode를 추가. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`는 기본 `demo` mode를 유지하고 `mode: external-api`와 provider URL 설정 시 외부 API 응답의 전표/지급/sync evidence를 handoff snapshot에 기록한다. 실환경 ERP/API 완료 판정은 provider 실행 결과와 운영 대조 증거가 필요하다 |
| 2026-07-10 | DMS 설정에 `CRM 계약 결재선` 정책 편집 UI를 추가. `system.crmContractApprovalRoute`가 route key/name, policy version, organization scope, required roles를 저장하고 DMS 계약 lifecycle 실행이 이 설정으로 승인 route/승인자 matrix/결재선 원장 evidence를 생성한다 |
| 2026-07-10 | DMS 설정 관리자 템플릿 목록에 `crm-quote-v1` 검토 확정 UI를 추가. `POST /dms/templates/:id/review-confirmation`과 `/api/templates/:id/review-confirmation`이 템플릿 metadata `reviewConfirmation`에 확정 상태/확정자/확정일을 기록한다 |
| 2026-07-10 | CRM 견적 DMS lifecycle artifact 실행 1차를 추가. `POST /crm/opportunities/:id/quote-dms-document-lifecycle-execution`은 DMS quote lifecycle 실행기로 template-version/template-review record와 DOCX/PDF artifact를 만들고 active quote handoff lifecycle에 evidence를 반영한다. 템플릿 검토 확정 상태는 DMS 설정 metadata로 관리한다 |
| 2026-07-10 | CRM 견적 DMS lifecycle evidence 수신 계약을 추가. `POST /crm/opportunities/:id/quote-dms-document-execution-evidence`는 외부 DMS 실행 결과가 만든 template-review, DOCX, PDF evidence path를 active quote handoff lifecycle에 반영하고 `/opportunities` DMS 견적 lifecycle 패널이 상태/evidence를 표시한다 |
| 2026-07-10 | DMS 기본 시스템 템플릿 registry에 `crm-quote-v1` 견적서 markdown 템플릿을 추가하고, CRM 견적 preview가 active template 이름/상태/source path를 DMS 견적 초안 패널에 표시하도록 연결. 이 템플릿은 DMS quote lifecycle artifact 실행의 입력과 DMS 설정 검토 확정 대상으로 재사용한다 |
| 2026-07-10 | CRM 견적 DMS markdown 초안 handoff를 추가. `POST /crm/opportunities/:id/quote-dms-document-draft`, `crm.crm_quote_dms_handoff_m`, `/opportunities` DMS 견적 초안 패널을 통해 준비 완료 견적 preview를 DMS markdown 초안으로 저장하고 최신 handoff/saved path/lifecycle을 표시한다. CRM 직접 Word/PDF 생성은 수행하지 않음 |
| 2026-07-10 | CRM 계약 DMS 산출 정책 UI를 추가. DMS 설정의 `CRM 계약 산출 정책`이 `system.crmContractExportPolicy`를 저장하고, DMS lifecycle 실행은 `export-policy.md`와 `dmsExecution.governance.exportPolicy`를 생성해 markdown evidence와 Word/PDF artifact를 조직 scope별 경로로 산출한다 |
| 2026-07-10 | CRM 계약 DMS 문서 패킷의 공급자 CI 참조 검증을 추가. `ciStorageRef`를 DMS working tree 또는 storage adapter 참조로 확인하고, `/contracts` 첨부 카드가 `referenceStatus`와 사유를 표시하며 누락/잘못된 참조는 DMS 초안 readiness를 차단한다 |
| 2026-07-10 | CRM 계약 DMS governance evidence UI 표시를 추가. `/contracts` DMS 문서 패킷 패널이 lifecycle 실행 후 `dmsExecution.governance`의 템플릿 버전, 템플릿 변경 원장, 첨부 확정 원장, 결재선 원장, 승인자 matrix를 읽기 전용 evidence로 표시한다 |
| 2026-07-09 | CRM 계약 DMS attachment finalization ledger evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 CRM handoff의 공급자 CI/청구계획 별첨 evidence를 `attachment-finalization-ledger.md`와 `dmsExecution.governance.attachmentFinalizationLedger`에 확정 원장으로 보존한다 |
| 2026-07-09 | CRM 계약 DMS approval route ledger sync evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 승인 route policy와 다자 승인 workflow를 `approval-route-ledger.md`와 `dmsExecution.governance.approvalRouteLedger`에 동기화하고 directory sync status와 resolved actor 수를 남긴다 |
| 2026-07-09 | CRM 계약 DMS template change request ledger evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 active 템플릿 재사용 판단을 `template-change-request-ledger.md`와 `dmsExecution.governance.templateChangeRequestLedger`에 남기며, 변경 요청이 필요 없으면 `closed-without-change` entry로 닫는다 |
| 2026-07-09 | CRM 계약 DMS approval route에 공용 사용자/조직 directory snapshot evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `directorySyncStatus`, `directorySource`, `directorySyncedAt`, `resolvedActors`를 `dmsExecution.governance.approvalRoute`와 `approval-route.md`에 남긴다 |
| 2026-07-09 | CRM 계약 DMS lifecycle route/template governance evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `template-change-review.md`와 `approval-route.md` artifact를 추가 생성하고 CRM `dmsExecution.governance`가 `templateChangeReview`와 `approvalRoute`를 노출한다 |
| 2026-07-09 | CRM 계약 DMS lifecycle governance evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `template-version.md`와 `approval-workflow.md` artifact를 생성하고 CRM `dmsExecution.governance`로 active 템플릿 버전 snapshot과 다자 승인 matrix를 노출한다 |
| 2026-07-09 | CRM 원가/AMS 회계·지급 데모 실행 endpoint를 추가. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`가 active handoff snapshot의 확정 line으로 전표, 지급 요청, 지급 실행, 외부 동기화 demo artifact evidence를 생성하고 active handoff snapshot에 기록한다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 계약 DMS lifecycle artifact 실행 1차를 추가. DMS 서비스가 `crm-contract-v1` 템플릿과 handoff markdown 초안을 기반으로 템플릿 검토 기록, 첨부 확인 기록, 첨부 확정 원장, DOCX, PDF, 승인 기록 artifact를 생성하고 CRM handoff evidence snapshot에 반영한다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 원가/AMS 회계·지급 실행 evidence 수신 계약을 추가. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execution-evidence`가 외부 전표/지급 evidence path를 active handoff snapshot의 `execution_evidence_snapshot`에 기록하고 이전 active row는 `replaced`로 남긴다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 계약 DMS lifecycle 실행 evidence 수신 계약을 추가. DMS가 생성한 Word/PDF/승인 evidence path를 active handoff snapshot에 `completed` step으로 기록하고 preview reload 시 유지한다 |
| 2026-07-09 | CRM 계약 DMS 문서 패킷의 공급자 CI `ciStorageRef`와 청구계획 별첨 후보를 첨부 evidence path로 표시하고 lifecycle/handoff snapshot에 남기도록 보강. 해당 evidence는 DMS lifecycle 실행의 첨부 확정 원장으로 보존한다 |
| 2026-07-09 | DMS 기본 시스템 템플릿에 `crm-contract-v1` 계약서 markdown 템플릿을 추가하고 CRM 계약 DMS preview가 DMS TemplateService의 active 템플릿 source path를 lifecycle evidence로 표시하도록 연결. 템플릿 변경 승인과 조직 승인 라우팅은 후속 |
| 2026-07-09 | CRM 원가/AMS Preview에 회계·지급 handoff snapshot을 추가. `/crm/cost-plan/accounting-payment-preview`가 확정 내부원가/AMS 정산 확정 row와 최신 handoff를 표시하고, `POST /crm/cost-plan/accounting-payment-handoff`가 `crm.crm_cost_plan_accounting_handoff_m`에 line snapshot을 저장. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 계약 DMS handoff에 문서 lifecycle checklist를 추가. preview와 `/contracts`가 CRM markdown 초안, DMS 템플릿 검토, 첨부 확인, Word 산출, PDF 저장, 승인 단계를 상태/증거와 함께 표시하고, markdown 초안과 handoff snapshot에 같은 lifecycle evidence를 남긴다. 실제 DMS 템플릿 검토/첨부/Word·PDF export/승인은 후속 |
| 2026-07-09 | CRM AI/RAG runtime evidence gate를 추가해 `verify:crm-ai-rag-runtime*`가 opportunity/customer/activity API 선택, opportunity 공용 job queue, customer/activity controlled backfill, common AI object/chunk/ACL/index state/retrieval audit를 검증하도록 연결. 공용 검색 entity type에 `activity`를 추가했으며, SSOO 공통 AI/RAG provider-backed runtime 품질 검증은 확장 readiness로 분리한다 |
| 2026-07-09 | CRM 계약 DMS 초안 저장 후 `crm.crm_contract_dms_handoff_m` handoff snapshot 원장을 남기도록 보강. `/crm/contracts/:id/dms-document-preview`는 최신 handoff id/status/savedAt과 저장 경로를 재조회하며, 문서/변수/첨부 snapshot은 CRM handoff evidence로만 남기고 템플릿 검토/첨부/Word·PDF/승인은 DMS 후속으로 유지 |
| 2026-07-09 | CRM 보고 Preview 확정 snapshot 원장을 추가해 `POST /crm/reports/confirm`, `POST /crm/reports/confirmations/:id/reopen`, `crm.crm_report_confirmation_m`, `/reports` 최신 확정 상태/확정/해제 버튼을 연결. 회계 전표, PMS 수행 KPI, DMS 문서 저장 확정은 후속 |
| 2026-07-09 | CRM 사업계획대비실적에 직접 실적 입력을 추가해 `POST /crm/business-plan/performance-actual/monthly`, `crm.crm_business_plan_performance_actual_d`, `/business-plan-performance` 직접 입력 패널, `manual-actual` source row 합산을 연결. 계약/원가/회계 정본을 덮어쓰지 않으며 회계/지급 반영은 후속 |
| 2026-07-09 | CRM 사업계획대비실적 Preview가 확정 AMS 외부원가와 같은 WBS의 계약 성과 외부원가를 중복 계산하지 않도록 조정. 같은 WBS에 정산 확정 AMS row가 있으면 계약 row의 외부원가 계획/실적을 제외하고 summary/UI에 조정 WBS 수와 제외 금액을 표시. 이 중복 조정 slice 당시에는 회계/지급 반영과 직접 실적 입력 write UI를 후속으로 유지 |
| 2026-07-09 | CRM 계약 DMS 문서 패킷을 DMS markdown 초안 저장까지 확장해 `POST /crm/contracts/:id/dms-document-draft`, DMS `FileCrudService.write`, 계약 `dms_link_status_code='draft-created'`, `/contracts` DMS 초안 저장/갱신 버튼과 재조회 가능한 저장 경로 표시를 연결. Word/PDF 산출, 템플릿 검토/첨부/승인은 DMS 후속으로 유지 |
| 2026-07-08 | CRM 사업계획대비실적 Preview가 확정 내부원가/AMS 외부원가 입력을 별도 `confirmed-cost` source row로 읽어 계획/실적 원가와 손익 차이에 합산하도록 보강. 회계/지급 반영과 계약 외부원가 중복 조정은 후속 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 외부원가 월별 입력 정산 확정/해제를 추가해 `POST /crm/cost-plan/ams/external-cost/monthly/:id/confirm`, `/reopen`, `crm.crm_cost_plan_ams_external_monthly_d.status_code/confirmed/confirmed_at`, `/cost-plan` AMS 정산 확정 버튼과 잠금 상태를 연결. 회계 전표/지급 정산 연계는 후속 |
| 2026-07-08 | CRM 원가/AMS Preview에 내부원가 월별 입력 확정/해제를 추가해 `POST /crm/cost-plan/internal-cost/monthly/:id/confirm`, `/reopen`, `crm.crm_cost_plan_internal_monthly_d.status_code/confirmed/confirmed_at`, `/cost-plan` 확정 버튼과 잠금 상태를 연결. 이 내부원가 slice 당시에는 AMS 정산 확정과 사업계획/회계 연동을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 외부원가 월별 계획/실적 입력을 추가해 `POST /crm/cost-plan/ams/external-cost/monthly`, `crm.crm_cost_plan_ams_external_monthly_d`, `/cost-plan` AMS 외부원가 입력 패널을 연결. 이 입력 slice 당시에는 내부원가 확정과 AMS 외부원가 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 업체-WBS 매핑 저장을 추가해 `POST /crm/cost-plan/ams/vendor-wbs`, `crm.crm_cost_plan_ams_vendor_wbs_r`, `/cost-plan` 업체 매핑 패널을 연결. 확정 계약 WBS는 저장된 업체 매핑이 있어야 AMS ready로 계산하며, 이 매핑 slice 당시에는 내부원가 확정과 AMS 외부원가 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 내부원가 월별 계획/실적 입력을 추가해 `POST /crm/cost-plan/internal-cost/monthly`, `crm.crm_cost_plan_internal_monthly_d`, `/cost-plan` 월별 입력 패널을 연결. 내부원가 확정과 AMS 업체-WBS 매핑/외부원가 월별 입력은 당시 후속 |
| 2026-07-08 | CRM 사업계획 draft line 월별 계획 매출 직접 입력을 추가해 `POST /crm/business-plan/plans/:id/lines/:lineId/monthly-plan`과 `/business-plan` 차수 패널에서 12개월 계획 매출을 저장하고, 확정 사업계획대비실적은 월별 입력값을 우선 사용하도록 변경. 이 계획 입력 slice 당시에는 실적 직접 편집과 내부원가 확정/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | PMS 프로젝트 상세 인수인계 탭에서 준비 완료 CRM 계약 인계 preview를 기존 PMS 프로젝트의 계약/대금/accepted handoff 스냅샷으로 명시 반영하는 `POST /api/projects/:id/contracts/crm-handoff-snapshot` 흐름을 추가. CRM 계약 원장 소유권, PMS 신규 프로젝트 자동 생성, 계약/청구 직접 편집은 제외 |
| 2026-07-08 | CRM 사업계획 전년 이월을 추가해 `POST /api/crm/business-plan/plans/carry-forward`와 `/business-plan` 차수 패널에서 전년도 확정 차수의 겹치는 연도 line을 새 기준년도 draft로 이월하고 현재 preview 신규 후보를 보강. 이 시점에는 내부원가 확정/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 사업계획대비실적 preview가 확정 사업계획 차수 원장을 기준으로 연간 계획 매출을 월 균등 배분하고 확정 계약 월별 실적과 비교하도록 보강. 확정 차수가 없을 때는 기존 pipeline/계약 청구계획 fallback을 유지하며, 이 시점에는 계획/실적 직접 편집과 내부원가/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 고객/활동 controlled AI index backfill endpoint를 추가해 `POST /crm/customers/ai-index/backfill`에서 system-override/admin 권한으로 customer/activity row를 제한된 batch의 `jobType: backfill` job에 enqueue. `@ssoo/types` backfill 계약, 실패 요약 테스트, AI projection owner-aware ACL snapshot 검증을 추가. provider-ready vector evidence는 후속으로 유지 |
| 2026-07-07 | CRM 고객/활동 Workspace 1차를 추가해 `/customers` 메뉴, 목록 검색/유형 필터/정렬, 고객 상세, 고객 생성/수정, 활동 등록 UI를 기존 `/api/crm/customers` 원장과 연결. 당시에는 customer/activity object-level owner policy, provider-ready vector evidence, controlled AI backfill endpoint를 후속으로 유지 |
| 2026-07-07 | CRM 고객/활동 원장 1차를 추가해 `crm.crm_customer_m`, `crm.crm_customer_activity_d`, history trigger, opportunity row 기반 migration/seed backfill, `/api/crm/customers`, `/api/crm/customers/:id/activities`, Next proxy route, 공용 검색 고객 결과, customer/activity AI projection 및 저장 이벤트 queue hook을 연결. 당시에는 customer/activity object-level owner policy, provider-ready vector evidence를 후속으로 유지 |
| 2026-07-07 | CRM 사업계획 차수 원장 1차를 추가해 `crm.crm_business_plan_m`, `crm.crm_business_plan_line_d`, history trigger, seed, `/api/crm/business-plan/plans`, `/plans/snapshot`, `/plans/:id/confirm`, `/plans/:id/reopen`, CRM `/business-plan` 차수 원장 패널을 연결. 현재 preview를 draft 차수로 저장하고 기준년도별 확정 차수를 관리하며 당시 전년 이월, 월별 직접 입력, 내부원가/AMS 원가 배부 저장은 후속으로 유지 |
| 2026-07-07 | CRM 보고 Preview 1차를 추가해 `/api/crm/reports/preview`와 `/reports`가 영업기회 pipeline과 확정 계약 월별 계약대비실적 read model을 집계하고 월별 trend, 사업구분/담당자/WBS drilldown, 확인 항목을 읽기 전용으로 표시. 회계 전표 생성, PMS 수행 KPI 편집, DMS 문서 저장 확정은 수행하지 않음 |
| 2026-07-07 | CRM 사업계획대비실적 preview 1차를 추가해 `/api/crm/business-plan/performance-preview`와 `/business-plan-performance`가 영업기회 pipeline 후보와 확정 계약 월별 계획/실적을 계획/실적/차이 3행 구조로 읽기 전용 비교. 확정 사업계획 차수 기준 월별 비교, 전년 이월, 내부원가/AMS 원가 배부 저장은 수행하지 않음 |
| 2026-07-07 | CRM 운영 기준 preview 1차를 추가해 `/api/crm/operations/preview`와 `/operations`가 원천 데모의 계정/코드/회사정보/사업년도/프로필 관리를 CRM 원장 설정, 공용 Admin/Auth, DMS 경계로 읽기 전용 표시. CRM 내부 계정 CRUD, 비밀번호 초기화, 역할/권한 편집, 법인/조직 마스터 편집, 코드 마스터 저장, CI 파일 저장은 수행하지 않음 |
| 2026-07-07 | CRM 원가/AMS preview 1차를 추가해 `/api/crm/cost-plan/preview`와 `/cost-plan`이 영업기회/계약 원가 라인, 확정 계약 외부원가 계획/실적, AMS readiness를 읽기 전용으로 표시. 내부원가 월별 저장, 원가 확정, AMS 업체-WBS 매핑, AMS 외부원가 저장은 수행하지 않음 |
| 2026-07-07 | CRM 사업계획 3개년 preview 1차를 추가해 `/api/crm/business-plan/preview`와 `/business-plan`이 영업기회 pipeline, 확정 계약 청구계획/실적, 실적 Gap을 표시. 현재 preview의 차수 원장 저장/확정은 별도 사업계획 원장 slice에서 수행하고 전년 이월/내부원가/AMS 저장은 수행하지 않음 |
| 2026-07-07 | CRM 홈 업무 요약 1차를 추가해 `/api/crm/dashboard`와 영업기회 홈 상단 요약 밴드가 pipeline, 계약 원장 요약, 견적 후보/계약 전환/PMS 인계/DMS 문서 패킷 readiness queue, 다음 액션을 읽기 전용으로 표시. PMS 프로젝트 생성과 DMS 저장은 수행하지 않음 |
| 2026-07-07 | CRM 계약 기반 DMS 계약서 문서 패킷 preview를 추가해 계약 확정/WBS/청구계획/공급자 법인정보 readiness, 템플릿/폴더/파일명 hint, 문서 변수, 첨부 후보를 읽기 전용으로 표시. Word/PDF 생성과 DMS 저장은 수행하지 않음 |
| 2026-07-07 | PMS 프로젝트 상세 인수인계 탭에서 CRM 계약 후보를 검색하고 PMS 인계 preview를 읽기 전용으로 소비하는 1차 흐름을 반영. PMS 프로젝트 생성과 계약/청구 편집은 제외 |
| 2026-07-07 | CRM 계약 기반 PMS 인계 후보 preview를 추가해 확정/WBS/청구계획 합계 readiness, 계약 금액, 라인, 청구계획을 읽기용 스냅샷으로 제공. PMS 프로젝트 생성은 수행하지 않음 |
| 2026-07-07 | CRM 영업기회 담당자 공용 사용자 lookup API와 편집 select UI를 추가해 `ownerUserId` 직접 숫자 입력을 기본 흐름에서 제거하고, 선택 시 ownerName을 공용 사용자 표시명으로 동기화 |
| 2026-07-07 | CRM 영업기회에 `owner_user_id`를 추가하고 access/견적 후보가 ownerUserId 공용 사용자 프로필을 우선 사용하도록 전환. db-init protected baseline에도 포함했으며 기존 ownerName fallback은 과거 row 호환용으로 유지 |
| 2026-07-07 | CRM 견적 담당 연락처 1차를 추가해 견적 후보 API/UI가 현재 세션의 공용 사용자 프로필 부서/전화/e-Mail을 표시하도록 연결. 영업기회 ownerId 기반 정밀 담당자 매핑과 PDF/Word/DMS 생성은 후속으로 유지 |
| 2026-07-07 | CRM 견적 공급자 회사 정보 1차를 추가해 `crm.crm_quote_seller_profile_m`/`_h`, seed/history trigger, `/api/crm/quote-seller-profile`, CRM `/quote-settings` 화면을 연결하고 견적 후보의 공급자 표시값을 설정 기반으로 전환. CI 파일 업로드와 DMS 문서 저장은 후속으로 유지 |
| 2026-07-07 | CRM 견적 상태 저장 1차를 추가해 opportunity 원장에 `quote_status_code`, 수신 담당자, 발행일, 유효기한, 메모를 저장하고 상세 견적 후보에서 상태를 갱신하도록 반영. PDF/Word/DMS 생성은 계속 미구현으로 유지 |
| 2026-07-06 | CRM 계약대비실적 월별 조회 1차를 추가해 `/api/crm/contracts/monthly-performance`, `/contract-performance` 메뉴, 사업년도/사업구분/계열/국내외/검색 필터, 월별 계획/실적/차이와 합계 표를 반영 |
| 2026-07-06 | CRM 계약 청구실적 1차를 추가해 `crm.crm_contract_billing_actual_d`, `/api/crm/contracts/:id/billing-actual` 조회/저장, 확정 계약 저장 제한, `/contracts` 계획 대비 실적 입력/차이/달성률 표시를 반영 |
| 2026-07-06 | 최신 확정 영업기회 기반 계약 전환 API/UI를 추가하고, 전환 시 opportunity에 계약 전환 플래그와 계약 코드를 기록하며 확정해제/차수추가를 차단하도록 반영 |
| 2026-07-06 | CRM 계약 등록/수정/삭제 폼과 청구계획 자동분할 preview/apply를 `/contracts` surface에 연결하고, 저장 시 청구계획 합계 불일치를 서버에서 거절하도록 보강 |
| 2026-07-06 | CRM 계약 원장 저장/수정/삭제/확정/해제 API와 `/contracts` 계약 원장 surface를 추가하고, 확정 시 WBS·청구계획·매출/외부원가 합계 일치 검증을 서버 기준으로 반영 |
| 2026-07-06 | 원천 데모의 견적서 modal/print 흐름을 SSOO 방식으로 재해석해 영업기회 원장 기반 읽기 전용 견적 후보 미리보기 API/UI를 추가하고, PDF/Word/DMS 생성은 미구현으로 유지하며 계약 전환은 후속 slice로 분리 |
| 2026-07-03 | CRM opportunity 공용 access permission seed, 서버 capability guard/access snapshot, CRM 웹 권한 기반 버튼/상세 표시를 추가해 권한 1차 slice를 반영 |
| 2026-07-03 | CRM opportunity history ledger 조회 API, Next proxy, 상세 변경 이력 UI를 추가해 확정/차수 흐름의 감사 조회 기준을 1차 반영 |
| 2026-06-08 | CRM 원천 데모 이식 기준과 PMS/Admin/DMS 경계를 문서화 |
| 2026-06-08 | CRM 1차 골격 존재 상태로 PRD를 현행화하고 PMS 기반 디자인 재정렬, 현재 진척률, 다음 작업 순서를 반영 |
