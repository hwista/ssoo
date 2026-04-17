# PMS Current Baseline-Close Brief

> 최종 업데이트: 2026-04-17
> 범위: PMS 전용 baseline close 준비
> 공통 제약: `apps/server/src/modules/common/**`, `packages/types/src/common/**`, `packages/web-auth/**`, `packages/web-shell/**`, `docs/common/**`, root instructions / root changelog / 공통 verification scripts 는 직접 수정하지 않음

---

## 1. 현재 PMS baseline 요약

현재 PMS는 단순 PRD 비교 단계보다 많이 진행되어 있습니다.

이미 foundation 수준으로 반영된 축:
- project object access snapshot + feature gating
- canonical lifecycle overlay (`statusCode/stageCode/doneResultCode` 위 bridge)
- project organization / relation compatibility surface
- objective / WBS planning foundation
- canonical control domain
  - `ProjectIssue`
  - `ProjectRequirement`
  - `ProjectRisk`
  - `ProjectChangeRequest`
  - `ProjectEvent`
- deliverable / close-condition -> event rollup linkage
- handoff / contract / contract payment backend foundation

대표 근거 경로:
- `docs/pms/planning/spec-reconciliation-plan.md`
- `apps/server/src/modules/pms/project/*`
- `apps/server/src/modules/pms/control/*`
- `apps/web/pms/src/components/pages/project/*`
- `packages/types/src/pms/*`
- `packages/database/prisma/schema.prisma`

---

## 2. 현재 끊긴 지점

PMS의 핵심 끊김은 구현 부족보다는 baseline close 부족입니다.

- reconciliation wave 가 local worktree 에는 존재하지만 공식 baseline 으로 닫히지 않음
- schema 변화가 formal migration / rollout 단위로 닫히지 않음
- backlog / roadmap / execution 기준선이 최신 구현 상태를 완전히 반영하지 않음
- handoff / contract / payment 는 backend foundation 대비 web surface 가 아직 얕음

즉 PMS는 “설계 초기”가 아니라 **foundation 구현 후 baseline 미확정 상태**로 봅니다.

---

## 3. baseline-close commit grouping 제안

### A. docs(pms): baseline freeze
- `docs/pms/planning/spec-reconciliation-plan.md`
- `docs/pms/planning/README.md`
- `docs/pms/planning/backlog.md`
- `docs/pms/planning/changelog.md`
- `docs/pms/planning/roadmap.md`
- `docs/pms/explanation/architecture/*`
- `docs/pms/explanation/design/*`
- `docs/pms/explanation/domain/*`

### B. feat(server-pms-project)
- `apps/server/src/modules/pms/project/*`
- `apps/server/src/modules/pms/pms.module.ts`

### C. feat(server-pms-work-control)
- `apps/server/src/modules/pms/task/*`
- `apps/server/src/modules/pms/control/*`
- `apps/server/src/modules/pms/deliverable/*`
- `apps/server/src/modules/pms/issue/*`
- `apps/server/src/modules/pms/member/*`
- `apps/server/src/modules/pms/menu/*`

### D. feat(web-pms-shell)
- `apps/web/pms/src/app/*`
- `apps/web/pms/src/components/layout/*`
- `apps/web/pms/src/components/pages/admin/*`
- `apps/web/pms/src/hooks/queries/*`
- `apps/web/pms/src/lib/api/*`
- `apps/web/pms/src/stores/*`

### E. feat(web-pms-project)
- `apps/web/pms/src/components/pages/project/*`
- `apps/web/pms/src/components/pages/home/DashboardPage.tsx`
- remove legacy `IssuesTab.tsx`

### F. feat(types-db-pms-bridge) — owner-only / shared infra 주의
- `packages/types/src/pms/*`
- PMS 관련 `packages/database/prisma/schema.prisma` 구간
- PMS 관련 seeds / triggers

주의:
- F 그룹은 shared infra 와 인접하므로 가장 마지막에 분리 검토
- DMS/CMS/common artifact 와 한 커밋에 섞지 않음

---

## 4. migration / validation gap

현재 드러난 핵심 gap:

1. `apply_all_triggers.sql` 가 PMS trigger 34-44를 설치하지 않음
- handoff
- contract
- contract payment
- objective
- WBS
- project org
- project relation
- requirement
- risk
- change request
- event

2. schema 변화 대비 formal migration bundle 부재

3. PMS 전용 verification script 부재
필요 검증 축:
- project access snapshot
- org / relation compatibility rows
- objective / WBS CRUD
- control domain CRUD
- deliverable / close-condition event rollup

4. backend/type/schema 대비 handoff/contract/payment web surface 얕음

---

## 5. baseline close 종료 조건

PMS baseline close 는 아래가 맞아야 닫습니다.

- `spec-reconciliation-plan.md` 를 PMS 공식 baseline 으로 참조 가능
- backlog / roadmap / changelog 가 현재 구현 상태를 반영
- PMS-owned file groups 가 review 가능한 묶음으로 분해됨
- migration / trigger installer gap 이 명시됨
- foundation build / type validation 기준이 정해짐

---

## 6. baseline close 이후 다음 tranche

추천 다음 tranche:

### Tranche 1
- handoff / contract / contract payment web surface 노출

### Tranche 2
- PMS verification / migration debt 해소
- trigger installer coverage 수정
- PMS verification script 추가

### Tranche 3
- PMS 내부 compatibility cleanup
- legacy Issue vs canonical ProjectIssue 정리

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | PMS 병렬 세션 결과를 current baseline-close brief 로 고정하고, commit grouping / migration gap / 다음 tranche 를 정리 |
