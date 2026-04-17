# SSOO 변경 이력 (Changelog) - 인덱스

> 전체 변경 이력 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-04-16

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

### 2026-04-16

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | planning | **current baseline-close brief 추가**: `current-baseline-close-brief.md` 를 추가해 PMS foundation 구현 상태, commit grouping, migration/validation gap, baseline close 이후 다음 tranche 를 병렬 진행용 기준선으로 고정 |
| - | - | planning | **설계 정합화 계획 문서 추가**: `spec-reconciliation-plan.md` 를 추가해 새 PMS 설계와 현재 구현의 장기 정합화 계획, 상세 설계 확정 순서, delivery 구조, `Organization / OrgMember` 우선 검토 기준을 레포 planning 문서로 고정 |
| - | - | planning | **조직 기준선 문서화**: 현재 조직 관련 구조가 `Organization` + `UserOrganizationRelation` + `OrganizationPermission` + `UserPermissionException` + `Project.ownerOrganizationId` + legacy user affiliation bridge 로 운영된다는 점을 `spec-reconciliation-plan.md` 에 명시 |
| - | - | planning | **검토 범위 확장**: `Organization / OrgMember` slice 를 PMS 단독 범위가 아니라 PMS/CMS/DMS 공통 user/auth/access foundation 및 `organizationIds` parity 검토까지 포함하는 cross-app review 로 재정의 |
| - | - | planning | **권한 경계 기준 추가**: 공용 auth/access foundation(`AccessFoundationService`, org baseline, exception, policy trace)과 PMS/CMS/DMS의 도메인 특화 권한 해석 경계를 `spec-reconciliation-plan.md` 에 명시 |
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
| - | - | 조직/권한 | **OrgMember foundation 실반영**: `Organization.orgClass/scope/levelType`, `UserOrganizationRelation.isLeader` 를 추가하고 PMS/CMS/shared access baseline 을 `permanent` affiliation 기준으로 정렬 |
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
| - | - | DB/데모데이터 | **viewer 런타임 검증 계정 추가**: `viewer.han` 데모 계정을 추가해 DMS/CMS viewer snapshot 과 PMS same-org read-only 시나리오를 Docker 기준으로 재현 가능하게 정리 |

### 2026-04-09

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증/권한 | **PMS project object policy 도입**: `owner_organization_id` 와 `pr_project_role_permission_r` 기반으로 project capability snapshot(`/api/projects/:id/access`)을 계산하고, 기본 정보/상세 탭/멤버/작업/산출물/종료조건/단계 진행 UI를 snapshot 기준으로 gating |
| - | - | 인증/권한 | **PMS access contract 명시화**: `/api/menus/my` 응답을 `@ssoo/types/pms` 의 `PmsAccessSnapshot` 기준으로 정렬하고, menu store가 snapshot apply 경계와 `usePmsAccess()` thin wrapper를 통해 navigation-centric access bootstrap 임을 드러내도록 정리 |
| - | - | 인증/권한 | **PMS access lifecycle 분리**: `access.store` 가 `hydrate/reset/isLoading/hasLoaded/error` lifecycle 을 담당하고, `Sidebar` 새로고침과 main shell bootstrap 도 동일한 hydrate 경로를 사용하도록 정리. `menu.store` 는 이 snapshot 을 실제 메뉴/즐겨찾기/navigation 상태로 유지 |

### 2026-04-08

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 인증 | **auth proxy contract 정규화**: PMS same-origin `/api/auth/[action]` 가 backend envelope를 브라우저까지 그대로 넘기지 않고 payload-only contract로 정리되어 CMS/DMS와 같은 auth adapter 계약을 사용 |
| - | - | 인증 | **same-origin auth proxy 정렬**: PMS가 `/api/auth/[action]` proxy를 통해 login/session/logout/me를 처리하도록 정리해 DMS와 같은 브라우저-facing auth surface를 사용하고, 401 session bootstrap도 same-origin 경유로 통일 |
| - | - | 인증 | **shared session bootstrap 도입**: 공통 auth backend가 HttpOnly `ssoo-session` cookie와 `/api/auth/session` bootstrap endpoint를 제공하도록 정리하고, PMS는 localStorage refresh token 없이 access token/session 복원 흐름으로 전환 시작 |
| - | - | 인증 | **로그인 화면 기준선 고정**: `packages/web-auth` 에 PMS 기준 표준 login card를 추가하고 CMS/DMS도 같은 레이아웃·문구·footer를 공유하도록 정리. 단, 앱별 컬러 토큰은 그대로 유지 |

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
