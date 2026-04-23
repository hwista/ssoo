# 2026-04-17 DMS 저장/협업 체계 작업 마감 정리

> Historical note: 이 문서는 sidecar terminology purge 이전의 세션 정리 문서입니다.
> 아래 sidecar 표기는 당시 UI/설계를 설명하는 historical context 입니다.

> 최종 업데이트: 2026-04-17
> 관련 문서:
> - `document-repo-source-of-truth-policy.md`
> - `document-repo-git-sync-pattern.md`
> - `document-repo-concurrency-autopublish-pattern.md`
> - `presence-first-save-system-implementation-plan.md`

---

## 1. 오늘 작업의 목표

오늘 작업의 목표는 DMS가 외부 문서 Git working tree를 정본으로 사용하는 구조에서,
다중 사용자 편집과 자동 publish를 감당할 수 있는 저장/협업 기반을 실제 코드에 반영하는 것이었다.

핵심 축은 아래와 같다.

1. 외부 문서 Git 정본 연결 및 원격 반영
2. 문서 CRUD 이후 Git sync/publish 패턴 정리
3. 동시 접속/편집 presence 가시화
4. auto publish queue 및 publish 상태 모델 도입
5. soft lock / takeover / recovery 흐름 도입
6. 사용자별 Git attribution 기반 추가
7. 협업/퍼블리시 표식을 사이드카 패널로 정리

---

## 2. 오늘 완료한 핵심 결과

### 2.1 문서 정본 / 원격
- DMS 문서 정본을 외부 GitLab 문서 레포 `LSWIKI_DOC.git` 로 고정했다.
- 로컬 clone 경로 `/home/a0122024330/src/lswiki-docs` 를 server/dms runtime 문서 working tree 로 연결했다.
- 문서 import 후 원격 `master` 초기 push 성공 상태까지 확인했다.

### 2.2 문서 visibility / detach 검증
- in-repo `apps/web/dms/data/documents` 를 비워도 external working tree mount 기준으로 문서가 계속 보이는 것을 검증했다.
- 즉 현재 DMS runtime 의 실문서 소스는 외부 working tree 기준으로 작동한다.

### 2.3 저장 / publish 체계 foundation
- file/content mutation 이후 auto publish enqueue 가 동작하도록 연결했다.
- publish 상태 모델을 도입했다.
  - `clean`
  - `dirty-uncommitted`
  - `publishing`
  - `committed-unpushed`
  - `sync-blocked`
  - `push-failed`
- publish 상태/soft lock 상태를 `.dms-collaboration-state.json` 에 영속화하도록 했다.

### 2.4 동시 편집 협업 foundation
- `/dms/collaboration` snapshot API 추가
- 문서별 접속자/편집자 heartbeat 추적 추가
- soft lock 추가
- takeover API 추가
- 당시 sidecar 패널에서 lock owner 및 takeover 액션 표시

### 2.5 recovery / reconcile foundation
- publish 상태 refresh API 추가
- publish retry API 추가
- publish 상태에 change-set 과 git sync detail 포함
  - `operationType`
  - `affectedPaths`
  - `syncStatus`
- sync-blocked / push-failed 상태를 사이드카에서 refresh/retry 가능하게 정리

### 2.6 Git attribution
- Git commit author 를 앱 사용자 프로필 기반으로 파생하도록 확장했다.
- commit footer 에 actor 추적 정보를 남기도록 확장했다.
  - `DMS-Actor-LoginId`
  - `DMS-Actor-UserId`
  - `DMS-Session-Id`

### 2.7 UI 정리
- collaboration / publish 표식을 본문 상단 배너에서 제거했다.
- 같은 정보를 `DocumentPanel` 패널로 이동했다.
- 문서 내용과 운영/협업 상태가 분리되어 UI 흐름이 더 명확해졌다.

### 2.8 asset change-set 반영
- attachment/image/reference 업로드도 문서 기준 change-set publish enqueue 에 포함되도록 확장했다.

---

## 3. 오늘 검증 결과

오늘 최종 기준 통과:
- `pnpm run build:web-dms`
- `pnpm run build:server`
- `pnpm verify:access-dms`
- `pnpm run codex:preflight`

기존 경고 잔존:
- `apps/server/src/main.ts:53` `console.log`
- 일부 web-dms lint warnings (기존 잔존)

즉 오늘 추가한 저장/협업 체계 코드는 현재 baseline 검증을 통과한다.

---

## 4. 현재 상태 요약

현재 DMS는 아래 수준까지 도달했다.

- 외부 Git working tree 기반 문서 정본 연결 완료
- 원격 GitLab 문서 레포 반영 가능
- 다중 사용자 presence 표시 가능
- soft lock / takeover 가능
- 저장 후 auto publish enqueue 가능
- publish 상태 영속화 가능
- sync-blocked / push-failed recovery action 가능
- 사용자별 Git attribution foundation 존재
- asset 포함 change-set publish 가능
- 협업/퍼블리시 상태가 당시 sidecar UI 에서 확인 가능

즉 저장/협업 기반은 “아예 없음” 단계는 끝났고,
이제는 명확한 마스터 플랜 하에서 남은 마감 slice 들만 닫으면 된다.

---

## 5. 이후 원칙

이번 세션 이후 DMS 저장/협업 기반 작업은
임의 파생 작업으로 확장하지 않고,
`.hermes/plans/2026-04-17_171600-dms-save-collaboration-master-plan.md` 의 slice 기준으로만 진행한다.

즉:
- 100% 목표
- 게이트
- stop condition
을 충족하면 기반 작업을 멈추고 실제 권한/워크플로우 구현으로 넘어간다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | 오늘 세션에서 반영한 DMS 저장/협업 체계 작업(정본 연결, auto publish, presence, soft lock, recovery, attribution, metadata panel marker 이동)을 마감 정리 문서로 고정 |
