# Presence-first 저장 체계 구현 계획

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** DMS를 외부 문서 Git working tree 기반 문서 시스템으로 유지하면서, 동시 접속 가시화, 자동 publish, 사용자별 Git attribution을 갖춘 저장 체계로 전환한다.

**Architecture:** 1차 슬라이스는 REST heartbeat 기반 document presence + in-memory auto publish queue + per-user Git author/footer foundation을 넣는다. 이후 상태 영속화, sync-blocked reconcile UX, asset/change-set batching, soft-lock/takeover UX를 순차 확장한다.

**Tech Stack:** NestJS, Next.js App Router, Zustand, simple-git, existing DMS file/content controllers

---

## 현재 반영된 1차/2차/3차/4차 슬라이스

완료:
- server collaboration module/controller/service 추가
- document presence snapshot API 추가 (`/dms/collaboration`)
- file/content mutation 이후 auto publish enqueue 연결
- Git commit author/footer 확장
- fast-forward only push foundation 추가
- DocumentPage 상단 presence/publish 상태 banner 추가
- publish 상태/soft lock file persistence 추가 (`.dms-collaboration-state.json`)
- soft lock takeover API 추가 (`/dms/collaboration/takeover`)
- DocumentPage 에 soft lock owner 표시 및 takeover action 추가
- publish state 에 change-set(`operationType`, `affectedPaths`)와 git sync detail 추가
- recovery API 추가 (`/dms/collaboration/refresh`, `/dms/collaboration/retry-publish`)
- DocumentPage 에 sync-blocked / push-failed 상태 새로고침 및 publish 재시도 UX 추가
- collaboration/publish 표식을 `DocumentPanel` 패널로 이동
- asset 업로드(attachment/image/reference)도 문서 기준 change-set publish enqueue 에 포함

검증:
- `pnpm run build:web-dms`
- `pnpm run build:server`
- `pnpm verify:access-dms`
- `pnpm run codex:preflight`

---

## 다음 구현 슬라이스

### Slice 2 — publish 상태를 메모리에서 durable state로 승격

**Objective:** 서버 재시작 후에도 dirty/publish 상태가 유실되지 않도록 상태 저장소를 도입한다.

**Files:**
- Modify: `apps/server/src/modules/dms/collaboration/collaboration.service.ts`
- Create: `apps/server/src/modules/dms/collaboration/collaboration-state.store.ts`
- Create: `apps/server/src/modules/dms/collaboration/collaboration.types.ts`
- Test: `apps/server/test/dms-collaboration-state.spec.ts`

**Steps:**
1. failing test로 publish 상태 복원 요구사항 작성
2. 상태 store 추상화 추가
3. 메모리 구현 + 파일 또는 DB-backed 구현 슬롯 추가
4. 서비스가 store를 사용하도록 변경
5. 테스트/빌드 재실행

### Slice 3 — 사용자별 Git author를 실제 profile 기반으로 고정

**Objective:** loginId 기반 no-reply fallback을 넘어 displayName/email을 실제 사용자 프로필 기준으로 안정화한다.

**Files:**
- Modify: `apps/server/src/modules/dms/collaboration/collaboration.service.ts`
- Modify: `apps/server/src/modules/common/user/user.service.ts`
- Test: `apps/server/test/dms-git-author-resolution.spec.ts`

**Steps:**
1. failing test로 displayName/email resolution 규칙 작성
2. actor profile cache 정책 정리
3. null/fallback/no-reply 규칙 확정
4. commit footer 확장 여부 검토
5. 테스트/빌드 재실행

### Slice 4 — soft lock / takeover / concurrent editor UX

**Objective:** presence를 단순 표시에서 편집 조정 UX로 승격한다.

**Files:**
- Modify: `apps/server/src/modules/dms/collaboration/collaboration.service.ts`
- Modify: `apps/server/src/modules/dms/collaboration/collaboration.controller.ts`
- Modify: `apps/web/dms/src/components/pages/markdown/DocumentPage.tsx`
- Create: `apps/web/dms/src/components/pages/markdown/_components/DocumentPresenceBanner.tsx`
- Create: `apps/web/dms/src/components/pages/markdown/_components/TakeoverDialog.tsx`

**Steps:**
1. soft lock 모델 정의
2. takeover request/ack flow 추가
3. 배너를 전용 컴포넌트로 분리
4. read-only/open-anyway/takeover UX 구현
5. 검증 실행

### Slice 5 — asset/change-set batching and sync-blocked recovery

**Objective:** 문서/metadata/assets를 change-set 단위로 묶고, sync-blocked 상태에서 수동 reconcile 흐름을 제공한다.

**Files:**
- Modify: `apps/server/src/modules/dms/collaboration/collaboration.service.ts`
- Modify: `apps/server/src/modules/dms/file/file.controller.ts`
- Modify: `apps/server/src/modules/dms/content/content.controller.ts`
- Modify: `apps/web/dms/src/lib/api/collaborationApi.ts`
- Modify: `apps/web/dms/src/components/pages/markdown/DocumentPage.tsx`

**Steps:**
1. failing test로 rename/delete/asset batching 규칙 작성
2. change-set 모델 도입
3. sync-blocked 상세 정보와 recovery endpoint 설계
4. UI에 blocked reason/retry 표시
5. 전체 회귀 검증

---

## 최소 게이트

각 slice 후 반복:
- `pnpm run build:web-dms`
- `pnpm run build:server`
- `pnpm verify:access-dms`
- `pnpm run codex:preflight`

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | presence-first 저장 체계의 1차 구현 완료 상태와 다음 slice(상태 영속화, per-user author 고정, soft lock/takeover, change-set batching) 계획을 문서화 |
