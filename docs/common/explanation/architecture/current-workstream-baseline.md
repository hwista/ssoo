# Current Workstream Baseline

> 최종 업데이트: 2026-04-17
> 상위 문서:
> - `docs/common/explanation/architecture/current-tranche-execution-contract.md`
> - `docs/common/explanation/architecture/current-tranche-inventory-freeze.md`

이 문서는 현재 SSOO 레포에서 실제로 진행 중인 3개 작업축(DMS / PMS / CMS)을 기준으로,
어디까지 진행됐고 어디서 끊겼으며 무엇을 먼저 닫아야 하는지 고정하는 운영 기준선입니다.

---

## 1. 현재 공통 판단

현재 레포는 단일 기능 브랜치 안에 다음 세 가지 축이 동시에 섞여 있습니다.

1. DMS monorepo/auth-access integration 이후의 도메인 ACL/문서 접근 모델 구현
2. PMS 신규 PRD 기준 reconciliation / model cleanup / foundation 구현
3. CMS의 CHS replacement + branding/layout shell + access integration

세 축 모두 실제 코드가 많이 들어가 있지만, 각 축의 상태가 다릅니다.

- DMS: 구현은 많이 되어 있으나 verification 이 깨져 있음
- PMS: 설계/모델링은 많이 진행됐으나 공식 baseline, migration, validation 이 닫히지 않음
- CMS: 런타임 replacement 는 상당히 진행됐으나 workstream 통제가 약하고 docs/instructions drift 가 큼

따라서 지금은 **새 기능 확장보다 현재 상태를 닫고 다음 작업 순서를 고정하는 것**이 우선입니다.

---

## 2. DMS baseline snapshot

### 2.1 현재 상태

DMS는 다음이 실제로 구현되어 있습니다.

- pnpm workspace 통합
- shared auth/session/bootstrap 연동
- same-origin auth proxy
- shared access foundation 위의 DMS feature snapshot
- DmsFeatureGuard 기반 feature gating
- sidecar 기반 document ACL pilot
- document access request workflow
- document/file/content/search/ask/storage/git/templates surface 에 대한 ACL enforcement 확장

대표 근거 경로:
- `apps/web/dms/src/stores/auth.store.ts`
- `apps/web/dms/src/app/(main)/layout.tsx`
- `apps/web/dms/src/app/api/auth/[action]/route.ts`
- `apps/server/src/modules/dms/access/access.service.ts`
- `apps/server/src/modules/dms/access/dms-feature.guard.ts`
- `apps/server/src/modules/dms/access/document-acl.service.ts`
- `apps/server/src/modules/dms/access/access-request.service.ts`
- `packages/types/src/dms/access.ts`
- `packages/types/src/dms/document-metadata.ts`

### 2.2 어디서 끊겼는가

DMS의 핵심 끊김은 다음입니다.

- verification 과 runtime truth 가 아직 일치하지 않음
- `build:web-dms` 가 green 이 아님
- `verify:access-dms` 가 green 이 아님
- readiness/runbook 문서는 실제보다 앞서 있음

즉 DMS는 “미구현”이 아니라 **검증 미완료 상태**입니다.

### 2.3 지금 멈춰야 할 것

- 신규 DMS feature 추가
- DB control-plane 확대 구현
- UI/UX 확장
- DMS 문서만 추가로 앞서 나가는 작업

### 2.4 지금 이어가야 할 것

- `verify:access-dms` 실패 원인 정리
- probe document ACL 기대값과 verification script 기대값 정렬
- `build:web-dms` 오류 제거
- readiness/runbook 을 실제 상태와 맞추기

### 2.5 DMS next gate

DMS 다음 단계로 넘어가기 위한 최소 기준:
- `pnpm run build:web-dms`
- `pnpm verify:access-dms`

---

## 3. PMS baseline snapshot

### 3.1 현재 상태

PMS는 단순 PRD 비교 단계보다 더 많이 진행되어 있습니다.

이미 진행된 축:
- lifecycle bridge
- Organization / OrgMember foundation
- Project membership / access foundation
- Handoff / Contract foundation
- Objective / WBS foundation
- control object split (issue/requirement/risk/change/event)
- ProjectOrg / ProjectRelation breadth foundation
- 관련 schema/types/server/web UI foundation 반영

대표 근거 경로:
- `docs/pms/planning/spec-reconciliation-plan.md`
- `packages/database/prisma/schema.prisma`
- `packages/types/src/pms/project.ts`
- `packages/types/src/pms/member.ts`
- `packages/types/src/pms/control.ts`
- `apps/server/src/modules/pms/project/*`
- `apps/server/src/modules/pms/control/*`
- `apps/web/pms/src/components/pages/project/*`

### 3.2 어디서 끊겼는가

PMS의 핵심 끊김은 다음입니다.

- planning / modeling wave 가 local working tree 에는 존재하지만 공식 baseline 으로 닫히지 않음
- 관련 변경이 commit/migration/validation 으로 정리되지 않음
- backlog / roadmap / execution 기준선이 최신 상태와 완전히 맞지 않음

즉 PMS는 “설계 초기”라기보다 **foundation 구현 후 baseline 미확정 상태**입니다.

### 3.3 지금 멈춰야 할 것

- 신규 PMS feature 개발
- 추가 모델 확장
- contract/handoff/project feature surface 확대
- migration 없이 schema 변경만 더 쌓는 작업

### 3.4 지금 이어가야 할 것

- `spec-reconciliation-plan.md` 를 공식 baseline 으로 승격
- 현재 schema/types/server/web 변경을 delivery slice 기준으로 다시 분해
- migration 생성/검증
- backlog/roadmap/changelog 기준선 재정렬

### 3.5 PMS next gate

PMS 다음 단계로 넘어가기 위한 최소 기준:
- reconciliation baseline 문서 승인/고정
- schema 변경에 대응하는 migration 계획 또는 migration 생성
- PMS foundation build/type validation green

---

## 4. CMS baseline snapshot

### 4.1 현재 상태

CMS는 생각보다 구현량이 있습니다.

이미 존재하는 축:
- server runtime 에서 `CmsModule` 사용
- `apps/web/cms` 기반의 실제 web app 존재
- `packages/types/src/cms/*` 존재
- shared auth/session/bootstrap 연동
- feature snapshot / visibility policy 기반 access service 존재
- LinkedIn-style main/feed shell, branding/layout work 존재

대표 근거 경로:
- `apps/server/src/app.module.ts`
- `apps/server/src/modules/cms/*`
- `apps/web/cms/src/app/(main)/layout.tsx`
- `apps/web/cms/src/components/layout/*`
- `apps/web/cms/src/components/pages/feed/*`
- `packages/types/src/cms/*`
- `docs/cms/README.md`

### 4.2 어디서 끊겼는가

CMS의 핵심 끊김은 다음입니다.

- CHS -> CMS replacement 는 runtime 기준으로 상당히 진행됐지만 workstream 통제가 안 됨
- 많은 파일이 untracked/new 상태라 baseline 이 약함
- docs/cms 와 instructions 가 현재 코드와 어긋남
- placeholder surface 와 실제 구현 surface 가 명확히 분리되지 않음
- validation / seed / naming 에 CHS 잔재가 남아 있음

즉 CMS는 **구현은 있으나 정리되지 않은 replacement workstream** 입니다.

### 4.3 지금 멈춰야 할 것

- 신규 CMS feature 추가
- feed 외 product 확장
- moderation / board policy 심화 구현
- branding polish 추가

### 4.4 지금 이어가야 할 것

- CHS/CMS naming drift 정리
- CMS current state 문서화
- placeholder surface 명시
- docs/instructions/seed/verify 경로에서 CHS 잔재 정리
- current implementation 을 reviewable slice 로 묶기

### 4.5 CMS next gate

CMS 다음 단계로 넘어가기 위한 최소 기준:
- CHS/CMS cutover hygiene 문서화
- CMS current implemented/placeholder matrix 고정
- CMS build/type/access smoke 기준선 정리

---

## 5. stop / continue boundary

### 5.1 지금 당장 멈출 것

다음 작업은 기준선이 닫히기 전까지 하지 않습니다.

- DMS 신규 feature 확장
- PMS 신규 feature 확장
- CMS 신규 feature 확장
- 공통 schema foundation 추가 확장
- shared auth/access foundation 의 대규모 구조 변경
- branding polish / UX 확장

### 5.2 지금 당장 계속할 것

- DMS verification recovery
- PMS reconciliation baseline close
- CMS cutover hygiene recovery
- docs/instructions/runtime truth sync

---

## 6. 실행 순서

현재 기준 추천 순서는 다음과 같습니다.

### Step 1 — DMS verification recovery (최우선)
목표:
- DMS를 실제로 다시 진행 가능한 green baseline 으로 복구

이유:
- 전체 로드맵상 DMS가 가장 우선순위가 높다.
- 세 축 중 가장 명확한 blocker 이기도 하다.
- 구현량은 충분하지만 verification 이 깨져 있어 실제 작업을 이어갈 수 없는 상태다.
- 공통 access/platform 정리의 regression gate 역할을 맡아야 한다.

종료 조건:
- `build:web-dms` green
- `verify:access-dms` green 또는 실패 계약 명확화 + 문서 sync

### Step 2 — PMS baseline close (가능하면 DMS와 병렬)
목표:
- PRD reconciliation 과 foundation 구현을 공식 baseline 으로 승격

이유:
- PMS는 전체 우선순위상 DMS 다음이며, 가능하면 병렬로 진행하는 것이 바람직하다.
- 다만 공통 영역을 직접 수정하지 않는 범위에서만 병렬을 허용한다.
- PMS는 이미 많이 구현되어 있으나 아직 baseline/migration/validation 이 닫히지 않았다.

병렬 허용 조건:
- `apps/server/src/modules/pms/**`
- `apps/web/pms/**`
- `packages/types/src/pms/**`
- `docs/pms/**`
범위 안에서만 우선 진행한다.

병렬 금지 조건:
- `apps/server/src/modules/common/**`
- `packages/types/src/common/**`
- `packages/web-auth/**`
- `packages/web-shell/**`
- `docs/common/**`
- root instructions / root changelog / 공통 verification scripts

종료 조건:
- reconciliation baseline 공식화
- migration 계획/생성
- backlog/roadmap 재정렬
- foundation build/type validation 기준 확정

### Step 3 — CMS cutover hygiene (최하위)
목표:
- CHS -> CMS replacement 를 reviewable baseline 으로 고정

이유:
- CMS는 현재 세 축 중 우선순위가 가장 낮다.
- runtime 주체는 이미 CMS로 수렴 중이지만, 지금은 신규 확장보다 cutover hygiene 만 유지하면 된다.
- DMS recovery 및 PMS baseline close 이후 정리해도 된다.

종료 조건:
- CHS/CMS drift inventory 정리
- CMS current-state 문서화
- docs/instructions parity 복구

---

## 7. 병렬 진행 규칙

병렬은 가능하지만, 현재 기준으로는 다음 원칙을 지켜야 합니다.

### 7.1 병렬 허용

- 상태 점검
- inventory 생성
- 도메인 내부 구현 정리
- 도메인 문서 정리

### 7.2 병렬 금지 또는 owner-only

다음 공통 영역은 동시에 여러 세션이 수정하지 않습니다.

- `packages/types/src/common/**`
- `packages/web-auth/**`
- `packages/web-shell/**`
- `apps/server/src/modules/common/**`
- `docs/common/**`
- root-level instructions / AGENTS / CLAUDE / root changelog
- 공통 verification scripts
- DB foundation seed/trigger/schema 공통 영역

### 7.3 escalation rule

도메인 세션이 공통 변경 필요를 발견하면:
1. 직접 수정하지 않고 보고
2. orchestrator 가 공통 owner 에게 승격
3. 공통 변경 반영 후 다시 도메인 세션 재개

즉 병렬 에이전트끼리 직접 소통하는 구조가 아니라, **중앙 조정자(orchestrator)를 통한 간접 조정**만 허용합니다.

---

## 8. 다음 실제 액션

현재 기준에서 바로 이어갈 실제 다음 작업은:

1. DMS verification recovery 를 현재 active slice 로 잡는다.
2. PMS baseline close 는 공통 영역을 건드리지 않는 범위에서 가능하면 병렬로 진행한다.
3. CMS cutover hygiene 는 가장 낮은 우선순위로 유지한다.

즉, 지금부터의 작업 우선순위는
- DMS 최우선
- PMS는 가능하면 병렬
- CMS는 최하위
기준으로 봅니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | DMS/PMS/CMS 3개 워크스트림의 실제 상태, stop/continue boundary, 실행 순서, 병렬 규칙을 묶은 current baseline 문서를 추가 |
