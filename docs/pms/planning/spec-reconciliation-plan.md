# PMS 설계 정합화 계획

> 최종 업데이트: 2026-04-16

현재 PMS 구현과 새 설계 기준(`/mnt/c/Users/A0122024330.000/Downloads/pms-design-spec.md`, 사용자 협의 내용)을 정합화하기 위한 장기 계획 문서입니다.

---

## 목적

이 문서는 다음을 위한 **지속 참조용 planning 기준서**입니다.

1. 현재 PMS runtime/schema/docs 와 새 설계의 충돌 지점을 관리
2. 애매한 판단을 임의로 확정하지 않고 사용자와 함께 결정
3. 확정된 결정만 장기 백로그와 실제 구현 순서에 반영

---

## 작업 원칙

1. **Compatibility-first rollout**
   - 현재 `statusCode/stageCode/doneResultCode` 와 기존 access/runtime 은 즉시 제거하지 않는다.
   - additive 확장을 우선하고, replacement 는 cleanup 단계에서만 검토한다.
2. **임의 판단 금지**
   - 권한, lifecycle, migration, schema 의미 변경은 사용자 확인 없이는 확정하지 않는다.
3. **확정 후 반영**
   - 상세 설계 slice 별 결정이 끝나야 backlog/delivery/구현 계획에 반영한다.
4. **세션 외 지속성 확보**
   - 장기 계획과 합의된 결정은 session plan 뿐 아니라 이 문서에도 반영한다.

---

## 반드시 재검토할 선행 맥락

`Organization / OrgMember` 검토 전에 아래 작업 내역을 함께 본다.

### PMS/CMS/DMS/shared user-auth-access 정렬 문서

- `docs/common/explanation/architecture/auth-system.md`
- `docs/common/guides/access-verification-runbook.md`
- `docs/common/explanation/architecture/access-cutover-cleanup-plan.md`
- `docs/pms/planning/changelog.md`의 2026-04-07 ~ 2026-04-14 항목

### 현재 runtime / type / schema 기준

- `packages/database/prisma/schema.prisma`
- `packages/types/src/common/access.ts`
- `packages/types/src/pms/access.ts`
- `packages/types/src/pms/project.ts`
- `packages/types/src/dms/access.ts`
- `apps/server/src/modules/common/access/access-foundation.service.ts`
- `apps/server/src/modules/pms/project/project-access.service.ts`
- `apps/server/src/modules/dms/access/access.service.ts`

이 선행 맥락은 특히 아래 항목과 직접 연결됩니다.

- 조직 하이어라키
- owner organization
- organization baseline permission
- user/org bridge compatibility
- object permission / policy trace
- PMS/CMS/DMS cross-app runtime parity

---

## 현재 확정된 기준

1. **Phase 0를 먼저 수행한다.**
   - 즉시 구현이 아니라 상세 설계 확정과 장기 백로그 구성을 먼저 진행한다.
2. **첫 상세 설계 slice는 `Organization / OrgMember` 이다.**
3. **Lifecycle canonical model 해석은 1차 완료 상태다.**
   - `statusCode` 는 phase 역할
   - `stageCode` 는 진행 상태 역할
   - `doneResultCode` 는 종료 사유/다음 전이 트리거 역할
4. **애매한 부분은 사용자에게 넘긴다.**
   - 선택지와 권장안은 제시하되, 최종 결정은 사용자 확인 후 확정한다.

---

## 현재 Organization 기준선

현재 레포에서 organization 계층은 아래 구조로 운영됩니다.

### 1. `cm_organization_m` (`Organization`)

- 공통 organization master
- 핵심 필드: `orgCode`, `orgName`, `orgType`, `parentOrgId`
- 현재 역할:
  - 조직 하이어라키
  - 프로젝트 `ownerOrganizationId` 참조점
  - organization baseline permission 부여의 기준점
  - org-target permission exception 참조점

### 2. `cm_user_org_r` (`UserOrganizationRelation`)

- 사용자-조직 bridge
- 핵심 필드:
  - `isPrimary`
  - `affiliationRole`
  - `positionCode`
  - `employeeNumber`
  - `effectiveFrom`, `effectiveTo`
- 현재 역할:
  - `AccessFoundationService.getUserOrganizationIds()` 의 source
  - inspect `organizationIds` 기준선
  - internal/external primary affiliation 유지

### 3. `cm_org_permission_r` (`OrganizationPermission`)

- 조직 baseline permission grant 테이블
- 현재 shared access foundation 이 role baseline 위에 organization baseline 을 덧씌우는 근거

### 4. `cm_user_permission_exception_r` (`UserPermissionException`)

- 사용자별 grant/revoke 예외
- `targetOrgId` 를 갖지만, 현재 주요 runtime 은 action/object 예외 해석이 중심

### 5. `cm_user_m` (`User`) 의 legacy affiliation 필드

- `departmentCode`
- `positionCode`
- `employeeNumber`
- `companyName`
- `customerId`

현재 `syncOrganizationFoundation()` 이 이 필드들을 읽어 `Organization` / `UserOrganizationRelation` 을 backfill/정렬합니다.

### 6. `pr_project_m.owner_organization_id`

- project-scoped organization model 은 아직 없고, 현재 PMS project access 의 organization 축은 주로 이 필드에 의존합니다.

### 해석

- 현재 레포는 이미 **단일 Organization master + user-org bridge + org baseline permission layer** 구조로 돌아갑니다.
- 따라서 새 설계의 `OrgMember` 검토는 **빈 바탕 설계가 아니라 `UserOrganizationRelation` 의 역할을 어디까지 승격/변형할지**를 결정하는 작업입니다.
- 또한 `Organization` 은 PMS 전용이 아니라 shared auth/access/DMS 문맥과 묶여 있으므로, project 조직까지 같은 master 에 넣을지 여부는 신중한 결정이 필요합니다.

### 이 slice의 실제 검토 범위

이 검토는 PMS 모델링만이 아니라 다음과 함께 맞춰야 합니다.

1. PMS navigation snapshot + project object access
2. CMS feature snapshot + visibility policy
3. DMS feature snapshot + document/object ACL
4. shared auth/session bootstrap
5. inspect `organizationIds` 와 runtime allow/deny parity

---

## 권한 경계 1차 판독

현재 레포에서 권한은 다음처럼 나뉩니다.

### 공용 foundation

1. same-origin auth proxy + shared session bootstrap
2. `AccessFoundationService`
   - role baseline
   - organization baseline
   - user exception
   - object exception
   - `policy` trace
3. `Organization` / `UserOrganizationRelation`
4. inspect `organizationIds`
5. `system.override`

### 도메인 특화 해석

#### PMS

- navigation snapshot (`/api/menus/my`)
- project object capability (`/api/projects/:id/access`)
- owner organization / project member / project role permission

#### CMS

- feature snapshot (`/api/cms/access/me`)
- content visibility (`public / organization / followers / self`)

#### DMS

- feature snapshot (`/api/dms/access/me`)
- document/file/content object ACL

### 해석

- 권한은 “공용 권한 시스템 하나”로 끝나지 않는다.
- 공용 layer 는 **소속 / baseline permission / exception / trace** 를 제공한다.
- 각 도메인은 그 위에서 **자기 object/surface semantics** 를 해석한다.
- 따라서 `Organization / OrgMember` 설계도 공용 foundation 과 도메인 특화 권한 해석의 경계를 깨지 않는 방향으로 가야 한다.

### 사용자 확정

- 공용 layer는 baseline/trace까지만 맡고, 실제 권한 의미와 object 권한은 PMS/CMS/DMS 각 도메인이 해석한다.

---

## 현재 OrgMember 후보 구조

현재 common layer 에서 `OrgMember` 후보에 가장 가까운 것은 `UserOrganizationRelation` 입니다.

### 이미 들어있는 요소

1. `isPrimary`
2. `affiliationRole`
3. `positionCode`
4. `employeeNumber`
5. `effectiveFrom` / `effectiveTo`
6. `isActive`

### 이미 붙어 있는 입력/운영 표면

#### 서버 입력 계약

- `CreateUserDto`
- `UpdateUserDto`

현재 아래 필드를 직접 받습니다.

- `departmentCode`
- `positionCode`
- `employeeNumber`
- `companyName`
- `customerId`
- `primaryAffiliationType`

#### PMS 운영 UI

- `UserManagementPage` 가 같은 필드를 create/update 에 직접 사용합니다.

#### bridge 정렬 로직

- `syncOrganizationFoundation()` 이 legacy affiliation field 를 읽어 `Organization` / `UserOrganizationRelation` 을 정렬합니다.

#### inspect/runtime 표면

- `AccessOperationsService.inspectAccess()` 가 runtime 기준 `organizationIds` 를 외부 inspect surface 로 노출합니다.

### 아직 없는 요소

1. `isLeader`
2. 상설 조직 vs 프로젝트 조직의 명시 구분
3. 자유로운 조직 role vocabulary 와 canonical 의미
4. project-scoped org member semantics

### 해석

- 지금은 공용 `OrgMember` 를 빈 바탕에서 새로 만드는 상황이 아닙니다.
- 실제 결정은 **`UserOrganizationRelation` 을 common affiliation member 로 승격/정리할지**, 아니면 **bridge 는 유지하고 별도 canonical OrgMember 모델을 둘지** 입니다.

---

## 외부 설계서의 명시적 해법 (Organization slice)

사용자가 제공한 설계서는 이 slice 에 대해 아래 구조를 명시합니다.

1. `Organization` 은 단일 테이블
2. `Organization.org_class`
   - `permanent`
   - `project`
3. `Organization.scope`
   - `internal`
   - `external`
4. `Organization.level_type`
   - `corporation`
   - `middle`
   - `department`
5. `OrgMember`
   - `Organization` 과 `User` 의 canonical 조직-유저 릴레이션
6. `ProjectOrg`
   - `Project` 와 `Organization` 의 매핑
7. `Project.owner_org_id`
   - 상설 소유 조직 참조

### 설계서 해석

- 설계서는 **상설 조직과 프로젝트 조직을 둘 다 `Organization` 에 둡니다.**
- 즉, “프로젝트 조직은 별도 테이블만 사용”이 아니라, **`Organization` row + `ProjectOrg` 연결** 구조를 택합니다.
- 외부 조직의 고객/공급/협력 구분은 `Organization.scope` 가 아니라 `ProjectOrg.role` 에서 해석합니다.

### 현재 레포와의 직접 충돌

1. 현재 `Organization` 은 `orgType` 만 있고 `org_class`, `scope`, `level_type` 이 없습니다.
2. 현재 `UserOrganizationRelation` 은 `OrgMember` 와 비슷하지만 bridge/backfill 중심 의미가 강합니다.
3. 현재 project-scoped organization row 개념이 없습니다.
4. 현재는 `Project.ownerOrganizationId` 만 있고 `ProjectOrg` 가 없습니다.

### 현재 open decision

남은 질문은 이 해법을 **그대로 채택할지**, 아니면 PMS/CMS/DMS shared foundation 제약에 맞게 **수정 채택할지** 입니다.

---

## Organization / OrgMember slice 결정안

사용자와 함께 확정하는 것이 원칙이지만, 현재 세션에서는 응답 없이 진행해야 하므로 아래를 **임시 기준안**으로 고정합니다.

### ORG-01. `Organization` 단일 테이블 구조는 수정 채택

- 새 설계의 `Organization(org_class = permanent | project)` 방향은 채택합니다.
- 즉, 상설 조직과 프로젝트 조직 모두 장기적으로는 `Organization` 계층 안에 둘 수 있습니다.

### ORG-02. shared foundation 은 permanent affiliation 기준만 사용

- `org_class = project` row 는 `Organization` 에 저장될 수 있습니다.
- 그러나 아래 공용 계산에서는 제외합니다.
  - shared `organizationIds`
  - organization baseline permission
  - primary affiliation
- 공용 foundation 에서 조직 baseline 은 **상설 조직(`permanent`)** 만 기준으로 삼습니다.

### ORG-03. `UserOrganizationRelation` 은 common OrgMember storage 로 승격

- 별도 common `OrgMember` 테이블은 만들지 않습니다.
- 현재 `UserOrganizationRelation` 을 common affiliation member storage 로 승격/정리합니다.
- 향후 정리 후보:
  - `isLeader`
  - canonical role vocabulary
  - joined/left semantics

### ORG-04. project 참여/권한은 PMS 도메인 해석 유지

- project 조직 연결: `ProjectOrg`
- project 사람 참여: `ProjectMember`
- owner / participant / contributor / phase owner 의미는 PMS 도메인에서 해석합니다.

### 이유

1. 외부 설계서의 방향(`Organization + OrgMember + ProjectOrg`)을 최대한 유지합니다.
2. 동시에 PMS/CMS/DMS shared foundation 경계를 보존합니다.
3. 같은 `Organization` 테이블을 쓰더라도 **공용 baseline** 과 **도메인 project semantics** 를 분리할 수 있습니다.

---

## 장기 백로그 반영 (Organization slice)

| ID | 결정/작업 | 적용 시점 |
|---|---|---|
| ORG-01 | `Organization` 에 `org_class`, `scope`, `level_type` 도입 | Delivery 1 |
| ORG-02 | shared organization baseline 계산에서 `permanent` 만 포함하도록 foundation 정리 | Delivery 1 |
| ORG-03 | `UserOrganizationRelation` 을 common OrgMember storage 로 정리하고 `isLeader` 등 확장 | Delivery 1 |
| ORG-04 | `ProjectOrg` 도입 전까지는 `ownerOrganizationId` 기반 호환 유지 | Delivery 1 |
| ORG-05 | project 조직 row + `ProjectOrg` 정식 도입 | Delivery 3 |

---

## Handoff / Contract slice 결정안

### 현재 상태 요약

1. handoff 는 `Project` inline 필드로만 존재
2. contract 는 `ProjectExecutionDetail` 내부 필드로만 존재
3. 현재 PMS UI 는 `ExecutionDetailTab`, `TransitionDetailTab`, `advanceStage` 중심

### HND-01. `Handoff` 는 standalone entity 로 분리

- 설계서의 `Handoff` 방향을 채택합니다.
- 이유:
  - pending / accepted / rejected / cancelled 상태 필요
  - 병렬 handoff(계약 + 실행) 필요
  - reassignment / escalation / closure 표현 필요

### HND-02. `Project` inline handoff 필드는 compatibility summary 로 유지

- 초기 rollout 에서는 `handoffTypeCode`, `handoffStatusCode`, `handoffRequestedAt` 등을 즉시 제거하지 않습니다.
- standalone `Handoff` 도입 이후에도 한동안 latest summary 용도로 유지합니다.

### CON-01. `Contract` / `ContractPayment` 는 standalone entity 로 분리

- 설계서의 `Contract` + `ContractPayment` 방향을 채택합니다.
- `ProjectExecutionDetail` 내부 계약 필드는 canonical source 가 아니라 compatibility bridge 로 남깁니다.

### CON-02. `ProjectExecutionDetail` 의 계약 필드는 compatibility mirror 로 격하

- 새 canonical source: `Contract`
- 초기 UI/호환성 유지: `ExecutionDetailTab`
- 장기적으로는 primary contract snapshot/view 성격만 남기거나 제거

### HND-03. 상태 전이 엔진은 상위 orchestration 으로 감싼다

- 기존 `advanceStage` 엔진은 즉시 폐기하지 않습니다.
- 이후 `Handoff accepted` 이벤트가 내부적으로 같은 전이 엔진을 호출하도록 연결합니다.
- 즉, handoff 도입은 기존 엔진의 replacement 가 아니라 **상위 orchestration layer 추가** 로 시작합니다.

### 장기 백로그 반영 (Handoff / Contract slice)

| ID | 결정/작업 | 적용 시점 |
|---|---|---|
| HND-01 | standalone `Handoff` schema/API 도입 | Delivery 1 |
| HND-02 | `Project` inline handoff 필드는 latest summary 로 유지 | Delivery 1 |
| HND-03 | `Handoff accepted` → 기존 `advanceStage` 엔진 연결 | Delivery 1 |
| CON-01 | standalone `Contract` / `ContractPayment` 도입 | Delivery 1 |
| CON-02 | `ProjectExecutionDetail` 계약 필드를 compatibility mirror 로 유지 | Delivery 1 |
| CON-03 | 계약 UI 를 `ExecutionDetail` 중심에서 독립 surface 로 전환 | Delivery 2 |

---

## Work breakdown slice 결정안

### 현재 상태 요약

1. 현재 레포는 `Task`, `Milestone`, `Issue` 가 이미 실구현 상태입니다.
2. 현재 `Task` 는 `parentTaskId`, `taskCode`, `depth`, `progressRate` 를 가져 WBS 성격을 일부 이미 포함합니다.
3. 외부 설계서는 `Objective` → `Milestone` / `WBS` → `Task` 로 더 분리된 planning hierarchy 를 요구합니다.

### WB-01. `Objective` / `WBS` 는 새 canonical planning hierarchy 로 도입

- 설계서의 `Objective`, `WBS` 방향을 채택합니다.
- 현재 PMS에 없는 planning backbone 을 보강하는 역할로 봅니다.

### WB-02. 기존 `Task` 는 compatibility hybrid 로 유지

- 현재 `Task` 는 이미 WBS-like code/hierarchy 를 일부 포함하고 있습니다.
- 따라서 초기에는 `Task` 를 즉시 분해하지 않고 compatibility hybrid 로 유지합니다.
- 이후 `wbsId` 같은 연결을 추가해 점진적으로 새 hierarchy 에 편입합니다.

### WB-03. `Milestone` 은 먼저 `Objective` 와 연결

- 설계서대로 `Milestone.objectiveId` 를 먼저 도입합니다.
- 기존 milestone CRUD 는 그대로 유지합니다.

### WB-04. control object 완전 분리는 다음 slice 에서 처리

- 현재 `Issue` 는 `issueTypeCode` 로 risk 등을 일부 흡수하고 있습니다.
- work breakdown slice 에서는 planning hierarchy 만 우선 도입하고,
  requirement/risk/change/event 완전 분리는 다음 slice 에서 처리합니다.

### 장기 백로그 반영 (Work breakdown slice)

| ID | 결정/작업 | 적용 시점 |
|---|---|---|
| WB-01 | `Objective` schema/API 도입 | Delivery 2 |
| WB-02 | `WBS` schema/API 도입 | Delivery 2 |
| WB-03 | `Task` 에 `wbsId` 연결 추가, 기존 hierarchy 는 호환 유지 | Delivery 2 |
| WB-04 | `Milestone` 에 `objectiveId` 연결 추가 | Delivery 2 |
| WB-05 | 기존 `TasksTab` / `MilestonesTab` 는 새 hierarchy 연결 전까지 유지 | Delivery 2 |

---

## Project membership / access slice 결정안

### 현재 상태 요약

1. 현재 `ProjectMember` 는 `(projectId, userId, roleCode)` 중심입니다.
2. 현재 project 권한은 `ProjectAccessService` 가 `isProjectOwner`, `isOwnerOrganizationMember`, `isProjectMember`, `roleCode -> permission` 매핑으로 계산합니다.
3. 새 설계는 `organizationId`, `accessLevel`, `isPhaseOwner` 를 member contract 안으로 끌어옵니다.

### MEM-01. `ProjectMember` 는 additive 확장

- 현재 `ProjectMember` 테이블은 유지합니다.
- 새 필드 후보:
  - `organizationId`
  - `accessLevel`
  - `isPhaseOwner`
- 즉시 replacement 하지 않고 additive 확장합니다.

### MEM-02. `roleCode` 는 기능 역할 vocabulary 로 유지

- `roleCode` 는 영업/AM/계약/PM/운영/수행 같은 functional role 어휘로 계속 사용합니다.
- 실제 권한 판단은 점진적으로 `accessLevel + isPhaseOwner + object policy` 쪽으로 옮깁니다.

### MEM-03. 조직장/소유 조직 baseline 은 view 중심으로 유지

- 상설 조직 하이어라키에 따른 조직장/소유 조직 baseline 은 유지합니다.
- 강한 편집 권한은 `ProjectMember.accessLevel` 과 `isPhaseOwner` 가 담당하도록 정리합니다.

### MEM-04. `PmsProjectAccessSnapshot` 도 richer member semantics 를 반영하도록 확장

- 현재 snapshot 의 `isProjectOwner`, `isOwnerOrganizationMember`, `isProjectMember`, `memberRoleCodes` 는 유지합니다.
- 이후 아래 의미를 추가 반영합니다.
  - member access level
  - phase owner 여부
  - 참여 조직 정보

### 장기 백로그 반영 (Project membership / access slice)

| ID | 결정/작업 | 적용 시점 |
|---|---|---|
| MEM-01 | `ProjectMember` 에 `organizationId`, `accessLevel`, `isPhaseOwner` 추가 | Delivery 1 |
| MEM-02 | `roleCode` 는 compatibility + functional vocabulary 로 유지 | Delivery 1 |
| MEM-03 | `ProjectAccessService` 를 새 member semantics 반영 형태로 확장 | Delivery 1 |
| MEM-04 | `PmsProjectAccessSnapshot` / members API / UI 확장 | Delivery 1 |
| MEM-05 | 조직장/소유 조직 hierarchy view baseline 과 member edit baseline 역할 분리 | Delivery 1 |

---

## ProjectOrg / external breadth slice 결정안

### 현재 상태 요약

1. 현재 PMS는 `Project.customerId`, `plantId`, `systemInstanceId`, `ownerOrganizationId` 를 개별 필드로 가집니다.
2. 실제 제품 표면은 아직 `Customer` 만 강하게 구현되어 있고 `Plant/Site`, `System Instance`, `Integration` 은 공백이 큽니다.
3. 새 설계는 외부 조직을 `Organization(scope=external)` 로 보고, 프로젝트와의 관계는 `ProjectOrg.role` 로 표현합니다.

### EXT-01. external org 는 common `Organization` 으로 수렴

- 고객/공급사/협력사는 장기적으로 common `Organization(scope=external)` 로 수렴합니다.
- 프로젝트에서의 의미는 `ProjectOrg.role` 이 결정합니다.

### EXT-02. `ProjectOrg` 는 PMS 도메인 relation 으로 도입

- `ProjectOrg(role=owner|customer|supplier|partner)` 방향을 채택합니다.
- 같은 조직이 한 프로젝트에서 여러 role 을 가질 수 있게 유지합니다.

### EXT-03. breadth 는 actor lane 과 asset/context lane 으로 분리한다

- actor lane:
  - `ProjectOrg(owner|customer|supplier|partner)`
- asset/context lane:
  - `customerId`
  - `plantId`
  - `systemInstanceId`
  - future `Integration`-class anchors
- breadth canonicalization 의 다음 단계는 **모든 anchor 를 하나의 generic relation 으로 올리는 것**이 아니라,
  조직 actor 와 도메인 asset/context anchor 를 분리하는 방향으로 고정합니다.

### EXT-04. `linked` terminal result 와 `ProjectRelation.linked` 는 분리된 정본으로 본다

- `doneResultCode = linked` 는 lifecycle terminal reason 입니다.
- `ProjectRelation(relationTypeCode=linked)` 는 **explicit target capture 가 있는 project-to-project edge** 입니다.
- 따라서 둘은 자동 동기화하지 않습니다.
- `nextProjectId -> ProjectRelation(successor)` 만 compatibility sync 로 유지하고,
  linked 관계가 필요하면 별도 relation authoring 으로 생성합니다.
- relation row 가 없어도 `doneResultCode = linked` 종료는 유효하며, relation row 가 있다면 target capture 의 정본은 relation row 입니다.

### EXT-05. supplier / partner 는 explicit external organization breadth 로 고정한다

- supplier/partner 용 별도 `Project` inline field 는 만들지 않습니다.
- `ProjectOrg(role=supplier|partner)` 가 canonical project edge 입니다.
- 대상은 우선 `Organization(scope=external)` row 를 사용합니다.
- customer 만 기존 `Customer` master 에서 `ProjectOrg(customer)` 로 compatibility backfill 을 허용하고,
  supplier/partner 는 explicit organization selection 을 우선합니다.
- 이 단계에서는 scope 제약을 hard migration rule 로 강제하기보다, UI/API 에서 preferred semantics 로 안내하는 additive 정리를 우선합니다.

### EXT-06. `Customer`, `Plant/Site`, `System Instance`, `Integration` 은 PMS domain breadth lane 으로 유지한다

- auth/access foundation 은 공용 `Organization` 까지로 제한합니다.
- `customerId` 는 당분간 **domain breadth anchor 이면서 `ProjectOrg(customer)` 의 compatibility source** 를 겸합니다.
- `plantId` / `systemInstanceId` 는 실제 `Plant/Site` / `System Instance` master 가 생기기 전까지 direct project anchor 로 유지합니다.
- 따라서 `plant/system` 은 아직 `ProjectOrg` / `ProjectRelation` / generic breadth relation 으로 승격하지 않습니다.
- future cutover 가 필요해도 first owner 는 PMS domain master 이고, `ProjectOrg` 는 actor lane 에만 머물도록 합니다.

### 장기 백로그 반영 (ProjectOrg / external breadth slice)

| ID | 결정/작업 | 적용 시점 |
|---|---|---|
| EXT-01 | external `Organization(scope=external)` 정렬 | Delivery 3 |
| EXT-02 | `ProjectOrg` schema/API 도입 | Delivery 3 |
| EXT-03 | actor breadth(`ProjectOrg`) 와 asset/context breadth(`customer/plant/system`) 분리 고정 | Delivery 3 |
| EXT-04 | `doneResultCode=linked` 와 explicit `ProjectRelation.linked` 분리, auto-promotion 금지 | Delivery 3 |
| EXT-05 | supplier/partner 를 explicit external `ProjectOrg` edge 로 정렬 | Delivery 3 |
| EXT-06 | `Customer`/`Plant`/`System`/`Integration` breadth lane 을 PMS domain master 쪽에 유지 | Delivery 3 |

---

## 롤아웃 시퀀싱 잠정안

아래 순서는 현재까지의 slice 결정안을 기준으로 한 **장기 구현 순서**입니다.

### Delivery 1 — 핵심 전환 기반

| Lane | 주요 항목 |
|---|---|
| Lifecycle | `statusCode/stageCode/doneResultCode` ↔ `phase/status/terminalReason` canonical mapping |
| Org foundation | `ORG-02`, `ORG-03`, `ORG-04` |
| Project membership/access | `MEM-01` ~ `MEM-05` |
| Handoff/Contract | `HND-01` ~ `HND-03`, `CON-01`, `CON-02` |

### Delivery 2 — planning structure 확장

| Lane | 주요 항목 |
|---|---|
| Work breakdown | `WB-01` ~ `WB-05` |
| Contract surface | `CON-03` |
| Control objects | requirement/risk/change/event 분리 검토 및 최소 도입 (별도 상세 slice 필요) |

### Delivery 3 — external breadth + relation 확장

| Lane | 주요 항목 |
|---|---|
| Organization breadth | `ORG-05`, `EXT-01`, `EXT-05` |
| Project relations | `EXT-02`, `EXT-04` |
| Domain breadth | `EXT-03`, `EXT-06` |

### Cleanup

| Lane | 주요 항목 |
|---|---|
| Legacy lifecycle cleanup | legacy compatibility path 제거 |
| Handoff cleanup | `Project` inline handoff summary 축소/제거 |
| Contract cleanup | `ExecutionDetail` 계약 mirror 축소/제거 |
| Work cleanup | legacy `Task` hybrid 축소, compatibility anchor 정리 |

### 선행 의존성 요약

1. lifecycle canonical mapping 이 먼저 정리돼야 `Handoff`, `Contract`, `phase owner` semantics 가 안정됩니다.
2. `Organization / OrgMember` 결정이 먼저여야 `ProjectMember.organizationId` 와 hierarchy view baseline 이 안정됩니다.
3. `ProjectMember/access` 확장이 먼저여야 `Handoff accepted -> phase owner 갱신` 이 자연스럽게 연결됩니다.
4. `ProjectOrg / external breadth` 는 공용 `Organization(scope=external)` 정렬 이후에 올리는 것이 안전합니다.

---

## 상세 설계 확정 순서

1. `Lifecycle canonical model`
2. `Organization / OrgMember`
3. `Project membership / access`
4. `Handoff / Contract`
5. `Objective / WBS / Task / Milestone`
6. `Control objects`
7. `ProjectOrg / ProjectRelation / external breadth`
8. `Cutover / migration policy`

---

## 장기 백로그 프레임

각 backlog item 은 아래 정보를 반드시 포함한다.

1. 결정 항목
2. 선택지
3. 권장안
4. 현재 구조와 충돌점
5. 영향 범위
   - schema
   - server API
   - shared types
   - PMS UI
   - access/policy
   - docs/migration
6. 선행 의존성
7. 적용 시점

---

## Delivery 구조

| 구간 | 목표 | 범위 |
|---|---|---|
| Phase 0 | 상세 설계 결정 + 장기 백로그 확정 | 사용자 결정 포인트 확정, dependency backlog 작성, delivery 배치 고정 |
| Delivery 1 | 핵심 모델 전환 기반 확보 | lifecycle bridge, org/orgmember, project membership/access, handoff/contract foundation |
| Delivery 2 | 프로젝트 구조 모델 확장 | objective/wbs/task/milestone, requirement/risk/change/event 연결 |
| Delivery 3 | 외부 조직/시스템 breadth + cleanup | project-org/relation, customer/plant/system mapping, legacy cleanup, 문서/운영 정리 |

---

## Delivery 1 구현 현황

| Workstream | 상태 | 실제 반영 |
|---|---|---|
| Lifecycle bridge | 완료 | shared PMS type 에 canonical `lifecycle.phase/status/terminalReason` 추가, server response/transition result 에 lifecycle bridge 적용 |
| Organization / OrgMember foundation | 완료 | `Organization.orgClass/scope/levelType`, `UserOrganizationRelation.isLeader` 추가, shared org baseline 을 `permanent` affiliation 기준으로 정렬 |
| Project membership / access | 완료 | `ProjectMember.organizationId/accessLevel/isPhaseOwner` 추가, `ProjectAccessService` 와 members UI/API 를 새 member semantics 기준으로 확장 |
| Handoff / Contract foundation | 완료 | standalone `ProjectHandoff`, `ProjectContract`, `ContractPayment` schema/API 도입, `Project` handoff summary 및 `ExecutionDetail` 계약 필드를 compatibility bridge 로 유지 |

> 위 완료 표시는 **Delivery 1 foundation 기준**입니다.  
> Delivery 2/3 에서 object model 확장, UI cutover, compatibility cleanup 이 후속으로 남아 있습니다.

---

## Delivery 2 구현 현황

| Workstream | 상태 | 실제 반영 |
|---|---|---|
| Objective / WBS foundation | 완료 | standalone `Objective`, `WBS` schema/API 도입, `Task.wbsId` 와 `Milestone.objectiveId` 연결 추가, PMS `TasksTab`/`MilestonesTab` 안에 planning foundation panel 을 연결 |
| Control objects | 완료 | standalone `ProjectRequirement`, `ProjectRisk`, `ProjectChangeRequest`, `ProjectEvent` schema/API/history 를 도입하고 PMS management surface 를 `Control` 탭 기준으로 확장. 기존 `Issue` 는 legacy compatibility surface 로 유지 |
| Contract surface cleanup | 대기 | contract mirror 를 richer execution planning surface 와 어떻게 연결할지 후속 정리 필요 |

---

## 현재 장기 백로그 후보

| Slice | 현재 상태 | 다음 처리 |
|---|---|---|
| Lifecycle canonical model | Delivery 1 foundation 완료 | Delivery 2 이후 compatibility field cleanup 기준만 유지 |
| Organization / OrgMember | Delivery 1 foundation 완료 | hierarchy rule / project-org 분리와 함께 Delivery 3 에서 재확장 |
| Project membership / access | Delivery 1 foundation 완료 | phase-dimensioned owner semantics 와 object-level capability 확장 검토 |
| Handoff / Contract | Delivery 1 foundation 완료 | 병렬 orchestration 상세화 및 UI cutover 는 후속 delivery 에서 진행 |
| Objective / WBS | Delivery 2 foundation 완료 | control object 분리 및 legacy task hierarchy cleanup 기준 유지 |
| Control objects | Delivery 2 + refinement 구현 완료 | additive `ProjectIssue` fifth control object 를 실제 runtime/UI 에 반영했고, 신규 `bug / impediment / inquiry / improvement` authoring 은 canonical control panel 로 정렬됐다. legacy `Issue` 는 secondary compatibility / historical surface 로 유지하며 deeper retirement 판단만 후속 wave 로 남긴다 |
| Reporting / review / handoff rollup | 모델/구현 완료 | 별도 persistent `ProjectReport` / `ProjectReview` / handoff-rollup object 는 추가하지 않고, `ProjectEvent` 위의 derived rollup 을 `Control` / `DeliverablesTab` / `CloseConditionsTab` 에 반영했다. dedicated latest `ProjectHandoff` PMS surface 및 explicit `ProjectHandoff -> event` FK migration 은 계속 보류한다 |
| ProjectOrg / external breadth | Delivery 3 refinement 구현 완료 | `ProjectOrg` foundation 및 customer/owner compatibility bridge 위에 explicit `ProjectRelation(linked)` create/delete, supplier/partner explicit breadth UI, synced vs manual provenance badge 를 추가했다. `nextProjectId -> successor` 와 `doneResultCode=linked` 분리는 그대로 유지되며, plant/system read surface 만 후속 additive surface 로 남긴다 |
| Migration / cleanup | post-refinement cleanup 완료 | PMS control/detail wording 을 canonical primary surface 기준으로 정리했고, legacy `Issue` 는 secondary historical / compatibility inbox 로 명확히 표기했다. relation/org/reporting surface copy 와 docs/session plan 도 landed state 기준으로 정렬했으며, deeper compatibility field removal 만 별도 refinement 로 유지 |

---

## Legacy issue transition policy (compatibility-first)

### 현재 runtime 기준선

1. `Issue` 는 여전히 별도 schema/API/history 와 PMS `Control` 탭 내 legacy surface 를 갖고 있다.
2. canonical control model 은 이미 `ProjectRequirement`, `ProjectRisk`, `ProjectChangeRequest`, `ProjectEvent` 로 분리돼 있다.
3. 새 canonical object 들은 legacy `Issue` 가 갖지 않는 전용 필드(예: risk 의 `impactCode/likelihoodCode`, change request 의 `requestedAt/decidedAt`, event 의 `eventTypeCode/scheduledAt/occurredAt`)를 요구한다.
4. 따라서 `Issue -> control object` 자동 동기화는 누락 필드를 임의 보정해야 하므로 현재 시점의 안전한 기본값이 될 수 없다.

### 정책 결정

1. **legacy `Issue` 는 read-only 도, dual-write canonical 도 아닌 `migration-source compatibility model` 로 유지한다.**
2. **새 canonical panel 이 다룰 수 있는 데이터는 canonical object 에 직접 생성한다.**
3. **legacy `Issue` 와 requirement/risk/change/event 사이에 자동 dual-write 는 하지 않는다.**
4. **legacy `Issue` 는 기존 데이터 보존 + 수동/보조 reclassification source 역할만 맡는다.**
5. **`ProjectEvent` 는 reporting/review/handoff container 이며 generic issue replacement 로 쓰지 않는다.**
6. **남은 `bug` / `impediment` / `inquiry` / `improvement` 는 quartet 안에 억지 흡수하지 않고, additive fifth control object `ProjectIssue` 로 수렴한다.**

### issue semantics → canonical mapping

| Legacy `issueTypeCode` | canonical target | transition policy | 비고 |
|---|---|---|---|
| `risk` | `ProjectRisk` | **manual / assisted migration only** | `Issue` 에는 `impactCode`, `likelihoodCode`, `responsePlan` 이 없어 lossless auto-migration 불가 |
| `requirement_change` | `ProjectChangeRequest` | **primary mapping** | 기존 `reportedAt` 는 `requestedAt` 후보가 되지만, 종료 상태가 `approved/rejected/implemented` 중 무엇인지는 `Issue` 만으로 확정할 수 없으므로 auto status translation 금지 |
| `requirement_change` (approved 이후) | `ProjectRequirement` | **downstream optional** | 변경 요청이 승인되어 실제 scope item 으로 편입될 때에만 별도 requirement 를 생성한다. change request 와 requirement 는 1:1 auto mirror 로 취급하지 않는다 |
| `impediment` | `ProjectIssue` | **compatibility-first canonical owner** | blocker chronology 가 필요하면 별도 `ProjectEvent` / `ProjectRisk` 를 추가 생성할 수 있지만 `ProjectIssue` 를 대체하지 않는다 |
| `inquiry` | `ProjectIssue` | **compatibility-first canonical owner** | inquiry 가 회의/검토/보고 일정으로 구체화되더라도, 원 질문 자체는 `ProjectIssue` 에 남기고 필요 시 `ProjectEvent` 를 satellite 로 만든다 |
| `bug` | `ProjectIssue` | **compatibility-first canonical owner** | defect semantics 를 change/requirement 로 강제 추론하지 않고 generic issue lifecycle 로 보존한다 |
| `improvement` | `ProjectIssue` | **compatibility-first canonical owner** | triage 후 필요하면 `ProjectChangeRequest` 또는 `ProjectRequirement` 를 추가 생성하지만 auto mirror 는 하지 않는다 |

### compatibility-first owner model for remaining legacy issue families

1. `ProjectIssue` 는 `bug / impediment / inquiry / improvement` 전용 fifth control object 로 둔다. `risk` / `requirement_change` 는 포함하지 않는다.
2. 데이터 shape 는 현행 legacy `Issue` 의 generic semantics 를 거의 그대로 보존한다: `issueTypeCode`, `statusCode`, `priorityCode`, `reportedByUserId`, `reportedAt`, `dueAt`, `resolvedAt`, `resolution`, `memo`.
3. control quartet 와 정렬하기 위해 canonical 책임자 필드는 `ownerUserId` 로 두고, legacy `assigneeUserId` 는 promote/import 시 1:1 bridge 로 연결한다.
4. 사람이 triage 하면서 필요할 때만 downstream `ProjectChangeRequest` / `ProjectRequirement` / `ProjectRisk` / `ProjectEvent` 를 추가 생성한다. `ProjectIssue` 와 다른 control object 사이의 auto mirror / auto status translation 은 하지 않는다.
5. additive `ProjectIssue` schema/API/history/types/UI panel 도입까지는 완료됐고, 다음 정리 범위는 legacy `Issue` create/edit 를 truly migration-only 흐름으로 더 좁힐지 결정하는 것이다.

Implementation note (2026-04-16):

1. additive `ProjectIssue` schema/runtime/history 가 `pr_project_issue_m` / `pr_project_issue_h` 와 `/projects/:projectId/control/issues` API 로 실제 반영됐다.
2. PMS `Control` 탭은 dedicated canonical issue panel 로 신규 `bug / impediment / inquiry / improvement` authoring 을 받으며, legacy `Issue` 영역은 compatibility inbox / historical surface 로 유지된다.
3. `ownerUserId` 가 canonical ownership field 이고, create/update path 는 legacy `assigneeUserId` 를 compatibility alias 로 bridge 한다. auto dual-write / auto status translation 은 여전히 없다.

### immediate PMS / UI behavior before retirement

1. `Control` 탭의 **primary authoring surface 는 canonical control panels(`ProjectIssue`, requirement, risk, change, event)** 이다.
2. legacy `Issue` 영역은 **secondary compatibility backlog / historical inbox** 로 취급한다.
3. 새 work item 이 `risk`, `requirement_change`, scheduled/reported `event` 로 명확히 분류되면 legacy `Issue` 가 아니라 canonical panel 에서 먼저 생성한다.
4. 현재 신규 `bug / impediment / inquiry / improvement` authoring 은 `ProjectIssue` panel 에서만 받고, legacy `Issue` 는 historical row + promote 대상 중심 surface 로 유지한다.
5. runtime tightening 의 첫 안전 단계(`risk` / `requirement_change` legacy create 차단)는 유지된다. 현재 단계의 다음 tightening 은 legacy issue create/edit 를 truly migration-only 흐름으로 더 제한할지 결정하는 것이다.

---

## Reporting / review / handoff rollup fixed model

### 현재 runtime / UI inspection 요약

1. `ProjectEvent` 는 현재 `eventTypeCode(report/review/handoff 포함)` 와 `summary` 를 가진 **project-wide timeline row** 이고, PMS `Control` 탭에서는 코드/이름/유형/상태와 함께 linked deliverable / close-condition rollup mini-summary 까지 노출합니다.
2. `ProjectDeliverable`, `ProjectCloseCondition` 은 이미 `eventId` 를 통해 특정 event 에 연결되며, 각 row 는 별도로 `statusCode(request/proposal/execution/transition)` 를 유지합니다.
3. PMS `DeliverablesTab` / `CloseConditionsTab` 은 event linkage 를 직접 편집하고, linked event 의 neutral rollup 요약까지 함께 보여줍니다. 다만 phase scope 나 handoff detail 은 아직 노출하지 않습니다.
4. 단계 완료 readiness 는 `checkTransitionReadiness()` 가 **status-level aggregate** 로 계속 계산하고, event 단위에서는 additive rollup mini-summary 를 함께 노출합니다.
5. handoff 쪽은 standalone `ProjectHandoff` + `Project` inline latest summary 가 이미 존재하지만, PMS 클라이언트에는 아직 handoff 전용 hook/API surface 가 없어 event 와의 1:1 binding 을 전제로 한 UI 는 바로 구현할 수 없습니다.
6. deliverable completion 판정도 현재 UI label(`not_submitted/submitted/confirmed/rejected`) 과 server helper(`approved/not_required`) 사이 vocabulary drift 가 있으므로, 다음 rollup 은 새로운 review-only 상태를 만들기보다 **neutral completed/pending aggregate + raw by-status count** 를 우선 노출하는 편이 안전합니다.

### 결정

1. **다음 wave 에서는 새 persistent `ProjectReport` / `ProjectReview` / handoff-rollup entity 를 만들지 않습니다.**
2. **`ProjectEvent` 는 계속 report/review/handoff chronology 를 담는 유일한 authoring object 로 유지합니다.**
3. **다음 구현 단위는 `ProjectEvent` 위에 얹는 additive read model(`ProjectEventRollup`)** 입니다.
4. report/review 의미는 새 row 를 저장해서 만들지 않고, **linked deliverable / close-condition aggregate + readiness snapshot** 으로 파생합니다.
5. handoff 는 **standalone `ProjectHandoff` 가 canonical source** 로 유지되고, 다음 rollup 은 `latestHandoff` summary 를 control/event surface 옆에 보여주는 수준까지만 고정합니다.
6. 따라서 다음 wave 의 handoff surface 는 **timeline event 와 transactional handoff 를 나란히 보여주는 방식** 이며, `ProjectHandoff.eventId` 같은 hard FK 는 이번 결정 범위에서 도입하지 않습니다.

### 다음 구현 contract (migration 추가 없이 가능해야 함)

| Surface | Additive contract | Source |
|---|---|---|
| `ProjectEvent` row | optional `rollup` fragment (`statusCodes[]`, `deliverables.total/completed/pending/byStatus`, `closeConditions.total/checked/unchecked/requiresDeliverable`, `readiness.isReady/blockingDeliverables/blockingCloseConditions`) | `ProjectEvent` + linked `ProjectDeliverable` + linked `ProjectCloseCondition` |
| report / review 의미 | event type 은 그대로 두고, UI 는 `rollup` 으로 “보고 시점 요약 / 검토 가능 여부” 를 표현 | same as above |
| handoff 요약 | event row 와 별개로 optional `latestHandoff` fragment(`handoffTypeCode`, `handoffStatusCode`, `requestedAt`, `respondedAt`, `toPhaseCode`, `toUserId`) 를 control overview/header 에 노출 | latest `ProjectHandoff` + existing `Project` inline handoff summary |
| PMS first surface | `Control` 탭 event table badge/mini-summary, `DeliverablesTab`/`CloseConditionsTab` 의 linked event label 보강, 필요 시 `StageActionBar` readiness 와 wording 재사용 | existing PMS tabs + `checkTransitionReadiness()` |

### 구현 메모 (2026-04-16)

- `GET /projects/:projectId/control/events` 가 additive `rollup` fragment 를 함께 반환하도록 확장되었습니다.
- PMS `Control` 탭 event row 는 neutral readiness / raw by-status mini-summary 를 표시합니다.
- PMS `DeliverablesTab` / `CloseConditionsTab` 은 linked event selector 아래에 동일 rollup 요약을 노출합니다.
- `ProjectHandoff` 는 standalone canonical source 로 유지되며, 이번 구현에서는 `ProjectHandoff -> event` binding 이나 별도 report/review persistence 를 추가하지 않았습니다.

### 다음 wave 의 명시적 non-goal

1. `ProjectEvent` 를 generic issue replacement 로 다시 확장하지 않는다.
2. `ProjectHandoff` 와 `ProjectEvent` 사이에 새로운 FK/migration 을 추가하지 않는다.
3. report/review 를 별도 persistence object 로 재분리하지 않는다.

이 결정으로 고정되는 최소 semantic:

- **report/review = event-centered read model**
- **handoff = standalone transactional model + latest summary read model**
- **deliverable / close-condition linkage = 기존 `eventId` 기반 관계 재사용**

후속 구현에서 남는 유일한 선택은 UI 밀도(뱃지 vs detail drawer) 정도이며, canonical storage 의미는 이번 단계에서 더 이상 열어두지 않습니다.

---

## stabilization cleanup 이후의 breadth canonicalization model

현재 breadth canonicalization 의 다음 단계는 아래처럼 고정한다.

1. `bug` / `impediment` / `inquiry` / `improvement` 의 canonical owner model 은 additive `ProjectIssue` control object 로 고정했고, PMS 신규 authoring 도 이미 해당 panel 로 정렬됐다. legacy `Issue` 는 secondary compatibility / historical surface 로 유지한다.
2. `doneResultCode = linked` 는 lifecycle terminal reason 으로 유지하고, **자동으로** canonical `ProjectRelation.linked` 를 생성하지 않는다.
3. `nextProjectId -> successor` 만 automatic relation sync 로 유지한다.
4. cross-project target capture 가 필요할 때의 canonical edge 는 explicit `ProjectRelation.linked` row 이다.
5. breadth 는 `ProjectOrg` actor lane 과 `customer/plant/system` asset/context lane 으로 분리한다.
6. `customerId` 는 당분간 asset/context lane anchor 이면서 `ProjectOrg(customer)` 의 compatibility source 를 겸한다.
7. `plantId` / `systemInstanceId` 는 direct project anchor 로 유지하고, 실제 domain master 가 생기기 전까지 `ProjectOrg` / `ProjectRelation` / generic breadth relation 으로 승격하지 않는다.
8. supplier/partner 는 explicit `ProjectOrg(role=supplier|partner)` 로만 확장하고, 대상은 우선 `Organization(scope=external)` 를 사용한다.
9. 보고/검토 rollup 은 `ProjectEvent` 위의 derived read model(`rollup`)로만 추가하고, 별도 persistent `Report` / `Review` object 는 만들지 않는다.
10. handoff rollup 은 standalone `ProjectHandoff` + `Project` inline latest summary 를 재사용하는 read model 로만 추가하고, `ProjectHandoff -> event` direct binding migration 은 보류한다.
11. relation manual authoring 과 supplier/partner UI 는 additive breadth surface 로 반영되었고, 남은 후속 surface 는 plant/system read exposure 이다. baseline replacement 는 아니다.
12. safe stabilization cleanup 과 final wording cleanup 은 이미 다음 범위까지 반영했다: legacy issue create flow 는 unmapped legacy type 중심으로 제한하고, control/detail/reporting surface 문구는 canonical primary path 기준으로 정리했다.

이 fixed model 위에서 additive implementation 을 진행하고, deeper cleanup/replacement 는 실제 breadth master 가 준비된 뒤 별도 wave 에서 다룬다.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | 계획 문서를 세션 전용 plan 에서 레포 planning 문서로 승격하고, `Organization / OrgMember` 를 다음 상세 설계 slice 로 고정. DMS/shared access 통합 맥락 재검토를 선행 조건으로 명시. |
| 2026-04-16 | `Organization / OrgMember` 검토 범위를 DMS 단독 맥락이 아니라 PMS/CMS/DMS 공통 user/auth/access foundation 으로 확장하고, cross-app runtime parity 를 선행 검토 기준으로 명시. |
| 2026-04-16 | shared auth/access foundation 과 PMS/CMS/DMS 도메인 특화 권한 해석의 경계를 구분하고, `Organization / OrgMember` 검토가 이 공용/도메인 경계를 보존해야 한다는 기준을 추가. |
| 2026-04-16 | 현재 `UserOrganizationRelation` 이 사실상 common affiliation bridge 로 동작하고 있으며, `CreateUserDto`/`UpdateUserDto`/`UserManagementPage`/`syncOrganizationFoundation()`/inspect `organizationIds` 가 이미 그 위에 정렬되어 있다는 점을 기준선에 반영. |
| 2026-04-16 | 외부 설계서가 `Organization(org_class=permanent/project)` + `OrgMember` + `ProjectOrg` 조합을 명시적으로 제안한다는 점과, 현재 레포와의 직접 충돌 지점을 문서에 반영. |
| 2026-04-16 | `Organization / OrgMember` slice 의 임시 결정안으로 `Organization(org_class)` 수정 채택, `permanent`만 shared baseline 계산 참여, `UserOrganizationRelation` common OrgMember storage 승격, project 참여는 PMS 도메인 해석 유지 방향을 추가. |
| 2026-04-16 | `Handoff / Contract` slice 의 임시 결정안으로 standalone `Handoff` + `Contract/ContractPayment` 채택, `Project`/`ExecutionDetail` inline 필드는 compatibility summary/mirror 로 유지, 기존 `advanceStage` 엔진은 상위 orchestration 으로 감싸는 방향을 추가. |
| 2026-04-16 | `Work breakdown` slice 의 임시 결정안으로 `Objective/WBS` 를 새 planning hierarchy 로 도입하되, 현재 `Task` 는 compatibility hybrid 로 유지하고 `Milestone` 은 먼저 `Objective` 와 연결하는 방향을 추가. |
| 2026-04-16 | `Project membership / access` slice 의 임시 결정안으로 `ProjectMember` additive 확장(`organizationId/accessLevel/isPhaseOwner`)과 `roleCode` vocabulary 유지, hierarchy view baseline 과 member edit baseline 분리 방향을 추가. |
| 2026-04-16 | `ProjectOrg / external breadth` slice 의 임시 결정안으로 external org 를 common `Organization(scope=external)` 으로 수렴시키고 `ProjectOrg` 를 PMS relation 으로 도입하되, 기존 `customerId/plantId/systemInstanceId` 는 compatibility anchor 로 유지하는 방향을 추가. |
| 2026-04-16 | slice 결정안을 Delivery 1/2/3 + cleanup 기준의 롤아웃 시퀀스로 묶고 선행 의존성 요약을 추가. |
| 2026-04-16 | Delivery 1 foundation 구현을 실제 코드에 반영: lifecycle bridge, `Organization`/`UserOrganizationRelation` 확장, `ProjectMember` access semantics 확장, standalone `ProjectHandoff`/`ProjectContract`/`ContractPayment` schema·API·compatibility bridge 를 추가. |
| 2026-04-16 | Delivery 2 첫 slice 구현을 실제 코드에 반영: standalone `Objective`/`WBS` schema·API 를 추가하고 `Task.wbsId`, `Milestone.objectiveId` 연결 및 PMS planning panel UI 를 기존 task/milestone surface 안에 additive 로 연결. |
| 2026-04-16 | Delivery 3 foundation 을 시작: `ProjectOrg` schema/API/history 를 추가하고 owner/customer anchor 를 compatibility bridge 로 동기화하며 PMS project detail 에 연결 조직 summary surface 를 노출. `ProjectRelation` 및 broader plant/system/integration breadth 는 후속 결정으로 유지. |
| 2026-04-16 | Delivery 3 foundation 을 확장: read-only `ProjectRelation` schema/API/history 와 PMS detail relation summary 를 추가하고, legacy `nextProjectId` anchor 를 canonical `successor` relation 으로 compatibility sync 하도록 연결. |
| 2026-04-16 | Control object foundation 을 실제 코드에 반영: standalone `ProjectRequirement`/`ProjectRisk`/`ProjectChangeRequest`/`ProjectEvent` schema·API·history 를 추가하고 PMS management tab 을 `Control` 기준으로 확장하며 기존 `Issue` 는 legacy compatibility surface 로 유지. |
| 2026-04-16 | deliverable / close-condition refinement 를 실제 코드에 반영: `ProjectDeliverable`/`ProjectCloseCondition` 이 선택적으로 `ProjectEvent` 를 참조하도록 확장하고, PMS 탭에서 event-centered linkage 를 직접 선택/조정할 수 있게 연결. |
| 2026-04-16 | legacy `Issue` transition policy 를 planning 문서에 고정: `Issue` 는 dual-write/read-only 가 아니라 migration-source compatibility model 로 유지하고, `risk -> ProjectRisk`, `requirement_change -> ProjectChangeRequest` 의 1차 매핑과 unmapped `bug/impediment/inquiry/improvement` retention 기준, PMS immediate authoring policy 를 명시. |
| 2026-04-16 | relation / breadth anchor refinement 결과를 문서화: `owner/customer -> ProjectOrg`, `nextProjectId -> successor` 만 safe compatibility sync 로 유지하고, `linked` terminal-result 및 `plant/system` breadth 는 fixed compatibility baseline 위의 후속 refinement 항목으로 정리. |
| 2026-04-16 | 사용자 응답이 즉시 없을 때의 기본값을 breadth baseline 으로 고정: `doneResultCode=linked` 는 canonical `ProjectRelation.linked` 로 자동 승격하지 않고, `plantId/systemInstanceId` 는 direct project anchor 로 유지한 채 stabilization cleanup 을 계속 진행한다. |
| 2026-04-16 | safe stabilization cleanup 을 실제 UI/문서에 반영: legacy issue create flow 는 unmapped legacy type 위주로 제한하고 `risk` / `requirement_change` 는 canonical panel 사용을 유도하며, project detail wording 과 session plan 을 fixed compatibility baseline 기준으로 정리. |
| 2026-04-16 | unmapped legacy issue owner model 을 compatibility-first 기준으로 고정: quartet 확장/강제 흡수 대신 additive `ProjectIssue` fifth control object 를 채택하고, legacy `Issue` 는 migration inbox/promote source 로 축소하는 다음 단계 구현 방향을 명시. |
| 2026-04-16 | breadth canonicalization model 을 다음 단계 기준으로 추가 고정: actor breadth 는 `ProjectOrg`, asset/context breadth 는 `customer/plant/system` lane 으로 분리하고, `doneResultCode=linked` 는 terminal reason 으로 유지한 채 explicit `ProjectRelation.linked` 만 target capture 정본으로 본다. supplier/partner 는 explicit external `ProjectOrg` 확장 대상으로 정리했다. |
| 2026-04-16 | reporting / review / handoff rollup 모델을 고정: `ProjectEvent` 위의 additive read model(`rollup`)과 latest `ProjectHandoff` summary 를 다음 wave 의 구현 단위로 확정하고, 별도 persistent report/review object 및 `ProjectHandoff -> event` FK migration 은 이번 wave 범위에서 제외했다. |
| 2026-04-16 | additive `ProjectIssue` fifth control object 를 실제 runtime 으로 구현: Prisma schema/history trigger, PMS control API/types/hooks, canonical issue panel, legacy issue compatibility inbox wording 을 반영하고 `ownerUserId` + legacy `assigneeUserId` bridge 를 적용했다. |
| 2026-04-16 | final post-refinement cleanup 을 반영: PMS `Control` / `Organizations` / `Relations` / `DeliverablesTab` / `CloseConditionsTab` wording 을 canonical primary surface 기준으로 다듬고, legacy `Issue` 를 secondary historical / compatibility surface 로 명확화했다. docs/session plan progress 도 landed state 기준으로 갱신했다. |
