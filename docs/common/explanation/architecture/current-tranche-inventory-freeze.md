# Current Tranche Inventory Freeze

> 최종 업데이트: 2026-04-17
> 상위 계약:
> - `docs/common/explanation/architecture/current-tranche-execution-contract.md`
> - `docs/common/explanation/architecture/current-workstream-baseline.md`

이 문서는 Tranche T1 (`Access/platform convergence stabilization`) 의 첫 slice 인 inventory freeze 결과를 기록합니다.

---

## 1. 확정된 관찰

### F1. server runtime entrypoint 는 이미 CMS 기준으로 수렴했다

근거:
- `apps/server/src/app.module.ts`
  - `CmsModule` import/등록 존재
  - `ChsModule` import 없음

해석:
- server runtime 기준선은 이미 `CHS -> CMS` 전환 방향으로 이동했다.
- 남은 CHS 흔적은 주로 삭제/정리 작업과 문서/history layer 에 가깝다.

### F2. browser auth surface 는 PMS/CMS/DMS 모두 `@ssoo/web-auth` 로 수렴 중이다

근거 경로:
- `apps/web/pms/src/stores/auth.store.ts`
- `apps/web/cms/src/stores/auth.store.ts`
- `apps/web/dms/src/stores/auth.store.ts`
- `apps/web/pms/src/lib/api/auth.ts`
- `apps/web/cms/src/lib/api/auth.ts`
- `apps/web/dms/src/lib/api/auth.ts`
- `apps/web/*/src/app/api/auth/[action]/route.ts`

해석:
- shared same-origin auth proxy + shared auth runtime 방향은 코드 기준선에서 이미 사실상 확정이다.
- 따라서 이후 drift 수정은 “새 auth 구조 도입”이 아니라 “문서/instruction/runtime naming parity 복구” 관점으로 접근해야 한다.

### F3. verification baseline 은 access 3종 스크립트 기준으로 수렴했다

근거 경로:
- `package.json`
  - `verify:access-smoke`
  - `verify:access-admin`
  - `verify:access-dms`
- `docs/common/guides/access-verification-runbook.md`
- `docs/CHANGELOG.md`

해석:
- 현재 tranche 의 최소 검증 기준은 이미 명확하다.
- 이후 작은 수정 slice 들도 위 세 명령 + `codex:preflight` 를 공통 gate 로 사용하면 된다.

### F4. DMS 는 blocker 가 아니라 regression gate 라는 framing 이 문서상 일관된다

근거 경로:
- `docs/dms/planning/auth-access-readiness.md`
- `docs/common/explanation/architecture/access-cutover-cleanup-plan.md`
- `docs/common/guides/access-verification-runbook.md`

해석:
- 이번 tranche 에서 DMS feature 확장을 먼저 진행하는 것은 우선순위가 아니다.
- DMS 는 PMS/CMS/common 쪽 정리 이후 결과가 깨지지 않았는지를 잡아내는 기준면으로 사용한다.

### F5. repo instruction / meta docs 에는 아직 contract drift 가 남아 있다

대표 근거:
- `README.md` 는 shared packages 로 `@ssoo/web-auth`, `@ssoo/web-shell` 을 명시
- 반면 일부 meta 문서/규칙 문서는 아직 shared packages 를 `database`, `types` 중심으로 설명
- `.codex/instructions/project.instructions.md` 의 package list / path mapping 은 CMS 및 신규 shared package 현실을 완전히 반영하지 못할 가능성이 높다
- `docs/common/AGENTS.md` 는 DMS의 `@ssoo/web-auth` 재사용은 언급하지만 PMS/CMS까지 같은 공용 auth surface 를 쓰는 현재 그림을 충분히 드러내지 않는다

해석:
- 첫 수정 slice 는 코드보다 문서/overlay/instruction parity 복구가 적합하다.
- 이 작업은 low-risk 이면서 이후 구현 판단 오류를 줄여준다.

---

## 2. 현재 tranche 의 첫 수정 대상

## T1-S1 — repo instruction / meta-doc parity recovery

목표:
- 현재 코드 기준선에 맞게 repo-level instruction / onboarding / meta docs 를 정렬한다.

우선 대상 파일:
- `AGENTS.md`
- `.codex/instructions/project.instructions.md`
- `docs/common/AGENTS.md`
- 필요 시 `README.md`, `CLAUDE.md`

수정 목표:
1. shared package 현실 반영
   - `@ssoo/web-auth`
   - `@ssoo/web-shell`
2. app topology 현실 반영
   - PMS / CMS / DMS 모두 current web app set 으로 명시
3. path-to-instruction mapping 보강
   - `apps/web/cms/**`
   - `packages/web-auth/**`
   - `packages/web-shell/**`
4. access/platform current tranche 와 충돌하는 서술 제거

비목표:
- runtime 코드 수정
- schema 수정
- PMS/DMS/CMS feature 구현 확장

---

## 3. T1-S1 acceptance

- instruction / AGENTS / README 계층이 현재 app/package topology 를 같은 방식으로 설명한다.
- CMS, shared auth, shared shell 관련 누락이 사라진다.
- 이후 implementation stage 에서 참조하는 overlay 기준이 더 이상 현재 코드와 어긋나지 않는다.

---

## 4. 다음 액션

다음 실제 구현 slice 는 `T1-S1 repo instruction / meta-doc parity recovery` 이다.
그 다음에야 CMS/CHS cutover parity 와 PMS admin/project access stabilization 으로 내려간다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | T1 inventory freeze 를 기록하고, 첫 수정 대상을 `repo instruction / meta-doc parity recovery` 로 고정 |
