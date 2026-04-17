# Current Tranche Execution Contract

> 최종 업데이트: 2026-04-17
> 브랜치: `dms/refactor/integration`
> 하네스: generic `orchestrator-8-stage-harness` + SSOO repo overlay
> 라우팅 정책: Copilot-first
> 상태 기준선: `docs/common/explanation/architecture/current-workstream-baseline.md`

---

## 1. 왜 이 문서가 필요한가

현재 SSOO worktree 는 하나의 feature 브랜치 안에 여러 overhaul track 이 섞여 있습니다.

- DMS domain 변경: 237 files
- PMS domain 변경: 132 files
- CHS removal / CMS 전환 흔적: 117 files
- database 변경: 66 files
- common auth/access: 16 files
- repo tooling/docs: 23 files

이 상태에서 단일 “DMS 작업” 또는 “PMS 작업”으로 곧바로 구현을 이어가면,
실제 우선순위와 무관한 cross-domain coupling 때문에 회귀/판단 오류가 발생하기 쉽습니다.

따라서 이번 tranche 는 **dirty tree 를 현재 의미 있는 workstream 단위로 재기준선화하고, 그중 가장 급한 단일 tranche 를 먼저 닫는 것**을 목표로 합니다.

---

## 2. 현재 dirty tree 의 workstream 분류

### WS-A. Cross-app access/platform convergence

핵심 경로:
- `apps/server/src/modules/common/auth/**`
- `apps/server/src/modules/common/access/**`
- `apps/server/src/modules/pms/**`
- `apps/server/src/modules/dms/**`
- `apps/server/src/modules/cms/**`
- `apps/web/pms/**`
- `apps/web/dms/**`
- `apps/web/cms/**`
- `packages/types/src/common/**`
- `packages/types/src/pms/**`
- `packages/types/src/dms/**`
- `packages/types/src/cms/**`
- `packages/web-auth/**`
- `packages/web-shell/**`
- `packages/database/**`

관찰:
- shared auth/access foundation, PMS project access, DMS ACL, CMS access surface, shared packages, DB foundation 이 함께 움직이고 있습니다.
- `docs/common/guides/access-verification-runbook.md`, `docs/dms/planning/auth-access-readiness.md`, `docs/common/explanation/architecture/access-cutover-cleanup-plan.md` 는 모두 현재 최우선 리스크를 cross-domain access/platform 안정화로 설명합니다.

### WS-B. CHS removal -> CMS replacement cleanup

핵심 경로:
- `apps/server/src/modules/chs/**` 삭제
- `apps/web/chs/**` 삭제
- `docs/chs/**` 삭제
- `packages/types/src/chs/**` 삭제
- 대응하는 `cms/**` 신규 경로

관찰:
- rename/replacement 성격이 강하며, access/platform convergence 와 섞여 있습니다.
- 그러나 CMS 자체 feature 확장보다 먼저 “shared access contract 위에 CMS가 제대로 올라탔는가”를 닫아야 안전합니다.

### WS-C. PMS long-horizon design reconciliation

핵심 경로:
- `docs/pms/planning/spec-reconciliation-plan.md`
- `apps/server/src/modules/pms/project/**`
- `apps/server/src/modules/pms/task/**`
- `apps/server/src/modules/pms/control/**`
- `apps/web/pms/src/components/pages/project/**`

관찰:
- planning 문서상 `Lifecycle bridge`, `Organization / OrgMember foundation`, `Project membership / access` 는 Delivery 1 foundation 완료 상태로 적혀 있습니다.
- 즉 지금 가장 급한 일은 새 설계 slice 를 넓히는 것보다, 현재 access/platform convergence 결과를 안정화하는 것입니다.

### WS-D. DMS regression gate maintenance

핵심 경로:
- `apps/server/src/modules/dms/access/**`
- `apps/server/src/modules/dms/file/**`
- `apps/server/src/modules/dms/content/**`
- `apps/server/src/modules/dms/search/**`
- `apps/server/src/modules/dms/ask/**`
- `apps/server/src/modules/dms/storage/**`
- `apps/web/dms/src/**`
- `scripts/verify-access-dms.mjs`

관찰:
- DMS readiness 문서 기준, DMS 는 더 이상 blocker 제거 주체가 아니라 regression gate 입니다.
- 따라서 DMS는 “다음 feature 구현 대상”이 아니라, 현재 tranche 의 pass/fail detector 로 취급합니다.

---

## 3. 이번에 먼저 닫을 tranche

## Tranche T1 — Access/platform convergence stabilization

한 줄 정의:
- **shared auth/access foundation + PMS/CMS/DMS runtime parity + CHS->CMS cutover 를 같은 기준선 위에 올려서, 현재 dirty tree 를 release 가능한 단일 플랫폼 tranche 로 정리한다.**

이 tranche 를 먼저 고르는 이유:
1. 공통 문서들이 모두 현재 리스크를 cross-domain access/platform 안정화로 지목한다.
2. DMS는 regression gate 역할이라, 단독 feature 구현보다 공통 contract 안정화가 먼저다.
3. PMS 장기 설계 정합화는 foundation 위에서 이어가야 하므로, 지금은 platform tranche 를 닫는 편이 맞다.
4. CHS removal 과 CMS 신규 경로도 shared access/auth contract 위에서 먼저 정렬되어야 한다.

---

## 4. T1 범위

### 포함
- common auth/session/access foundation 최종 정렬
- PMS/CMS/DMS browser auth surface 정렬 확인
- PMS project access / menu/admin / access ops 와 공통 foundation parity 확인
- CMS access snapshot / visibility surface 가 공통 foundation 위에 올라왔는지 확인
- DMS regression gate 유지 (`verify:access-dms` 기준)
- DB seed/trigger/type/shared package 가 위 계약과 일치하는지 확인
- CHS 삭제 경로와 CMS 신규 경로가 공존하지 않도록 정리 방향 확정
- 관련 문서/검증 루틴/overlay 정합성 고정

### 제외
- PMS 신규 product feature 확장
- DMS 신규 UX feature 추가
- CMS moderation/board policy 심화 확장
- PMS spec-reconciliation 의 다음 상세 설계 slice 확장
- schema-last 이후의 추가 모델 재설계

---

## 5. T1 acceptance criteria

이번 tranche 는 아래가 모두 맞아야 닫습니다.

1. 공통 contract
- `auth-system.md`
- `access-cutover-cleanup-plan.md`
- `access-verification-runbook.md`
- `docs/dms/planning/auth-access-readiness.md`
가 같은 runtime 기준선을 설명한다.

2. PMS/CMS/DMS parity
- PMS: navigation snapshot + project access + admin tooling 이 공통 foundation trace 와 모순되지 않는다.
- CMS: feature snapshot + visibility/object policy 가 공통 foundation trace 와 모순되지 않는다.
- DMS: feature snapshot + object ACL/runtime 결과가 regression gate 기준과 모순되지 않는다.

3. CHS/CMS cutover hygiene
- CHS 경로는 제거 대상으로만 남고, runtime 주체는 CMS 경로로 수렴한다.
- 문서와 instruction 에서 CHS/CMS naming drift 가 최소화된다.

4. Validation automation
- `pnpm run codex:preflight`
- `pnpm verify:access-smoke`
- `pnpm verify:access-admin`
- `pnpm verify:access-dms`
가 이번 tranche 의 기준선 명령으로 유지된다.

5. Dirty tree discipline
- 다음 작업부터는 T1 내부에서도 다시 작은 slice 로 나누어 진행한다.
- 특히 구현은 아래 순서를 넘지 않는다:
  1. contract mismatch 식별
  2. 최소 수정
  3. reviewer pass
  4. verification rerun
  5. docs/changelog sync

---

## 6. 즉시 후속 slice 우선순위

T1 안에서는 아래 순서로 본다.

### Slice 1 — Runtime/contract inventory freeze
- 목표: 현재 server/web/types/database/docs 간 naming/contract drift 를 표로 고정
- 산출물: mismatch inventory, owner path, verification impact

### Slice 2 — CMS/CHS cutover parity
- 목표: CHS 제거와 CMS 신규 경로의 중복/누락을 access contract 기준으로 정리
- focus: server module wiring, web shell bootstrap, docs/instructions naming

### Slice 3 — PMS admin/project access stabilization
- 목표: PMS role/menu/project access/operator surface 를 현재 foundation 기준으로 재검증
- focus: menu baseline, project access, inspect/admin UX, verification script parity

### Slice 4 — DMS regression confirmation
- 목표: 위 수정이 DMS allow/deny/binary/search/storage 결과를 깨지 않았는지 확인
- focus: `verify:access-dms`, `viewer.han` matrix, fixture cleanup

---

## 7. Copilot-first stage routing for T1

### Stage 1 — Orchestrator
- primary: `github-copilot / gpt-5.4`
- fallback: `openai-codex / gpt-5.4`

### Stage 2 — Research / implementation-state review
- primary: `github-copilot / gpt-4.1`
- escalate: `github-copilot / claude-sonnet-4.6`
- fallback: `openai-codex / gpt-5.4`, `anthropic / claude-sonnet-4-6`

### Stage 3 — Design / execution planning
- primary: `github-copilot / claude-sonnet-4.6`
- synthesis support: `github-copilot / gpt-5.4`
- fallback: `anthropic / claude-sonnet-4-6`, `openai-codex / gpt-5.4`

### Stage 4 — Critic
- if planner is Claude-family -> `github-copilot / gpt-5.4`
- if planner is GPT-family -> `github-copilot / claude-sonnet-4.6`
- fallback: same-family direct provider

### Stage 5 — Consensus
- primary: `github-copilot / gpt-5.4`
- fallback: `openai-codex / gpt-5.4`

### Stage 6 — Build
- primary: `github-copilot / gpt-5.4`
- cheap loops: `github-copilot / gpt-5-mini`, `github-copilot / gpt-4.1`
- fallback: `openai-codex / gpt-5.4`

### Stage 7 — Review
- if builder is GPT-family -> `github-copilot / claude-sonnet-4.6`
- if builder is Claude-family -> `github-copilot / gpt-5.4`
- fallback: `anthropic / claude-sonnet-4-6`, `openai-codex / gpt-5.4`

### Stage 8 — Verification
- default: `github-copilot / gpt-4.1`
- failure analysis escalation: `github-copilot / gpt-5.4`, `github-copilot / claude-sonnet-4.6`
- fallback: `openai-codex / gpt-5.4`, `anthropic / claude-sonnet-4-6`

---

## 8. 현재 판단

이번 세션의 다음 실제 작업은 **새 기능 구현이 아니라 Slice 1 inventory freeze** 입니다.

즉 다음 액션은:
1. current dirty tree 에서 contract drift 를 표로 뽑고
2. T1 안의 첫 수정 대상 한 묶음을 정하고
3. 그 묶음만 구현/검증합니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | dirty tree 기준 workstream 재분류 후, `Access/platform convergence stabilization` 을 current tranche 로 고정하고 Copilot-first stage routing 을 함께 명시 |
