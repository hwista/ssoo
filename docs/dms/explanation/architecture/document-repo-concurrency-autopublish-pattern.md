# DMS 문서 레포 동시 편집 / 자동 Publish / 사용자별 Git 반영 패턴

> Historical note: 이 문서는 **2026-04-21 이전의 sidecar-era 설계 메모**를 보존합니다.
> 현재 runtime 정본 계약은 `markdown content + DB metadata control-plane` 이며, 아래의 sidecar 언급은 historical context 로만 읽어야 합니다.

> 최종 업데이트: 2026-04-17
> 상위 문서:
> - `docs/dms/explanation/architecture/document-repo-git-sync-pattern.md`
> - `docs/dms/explanation/architecture/document-repo-source-of-truth-policy.md`
> - `docs/dms/explanation/architecture/hybrid-document-control-plane.md`

---

## 1. 왜 이 문서가 필요한가

현재 DMS는 소스 레포 밖의 외부 문서 Git working tree를 직접 수정한다.
이 구조에서 가장 위험한 지점은 아래 3개다.

1. 여러 사용자가 같은 문서를 동시에 편집하는 경우
2. Git publish가 자동화되지 않아 working tree가 상시 dirty 상태로 방치되는 경우
3. 앱 인증 사용자가 따로 존재하는데 Git commit 상에는 그 사용자가 구분되어 남지 않는 경우

이 문서는 위 3개를 동시에 해결하기 위한 운영 패턴을 고정한다.

---

## 2. 현재 구현에서 확인된 위험 신호

### 2.1 동시 편집 방어는 문서 단위 `revisionSeq`에만 일부 존재한다
현재 `content.controller.ts` 와 `file-crud.service.ts` 기준으로 문서 저장 시 `expectedRevisionSeq` 검증이 들어간다.
이는 같은 문서의 content/metadata 충돌을 막는 1차 방어선으로 유효하다.

하지만 아직 부족한 점:
- 문서 단위 optimistic concurrency만 있고 working tree 전체 publish 상태 잠금은 없다.
- 같은 사용자가 여러 문서를 묶어 수정할 때 batch publish 일관성이 없다.
- asset, rename/move, delete까지 포함한 publish transaction 모델이 없다.

### 2.2 Git author identity가 현재 사용자 기준으로 분리되지 않는다
현재 `git.service.ts` 는 commit 시 optional `author` 문자열만 받는다.
기본 author는 `personalSettingsService.getAuthorIdentity()` fallback 기준이다.

문제:
- `personalSettingsService` 는 현재 `anonymous-first` 단일 프로필 구조다.
- 즉 현재 서버 구조만 놓고 보면 사용자 A와 사용자 B의 commit author를 안정적으로 분리할 수 없다.
- sidecar에는 `author`, `ownerLoginId`, `lastModifiedBy`가 `currentUser.loginId`로 남지만, Git commit author와 1:1 대응된다고 볼 수 없다.

### 2.3 Git publish는 수동이라 dirty tree가 장기화될 수 있다
현재 CRUD는 filesystem write까지만 하고, Git commit/push는 `/dms/git` 수동 액션으로 분리돼 있다.

문제:
- 사용자가 저장만 반복하고 publish를 안 하면 working tree가 계속 dirty 상태다.
- 여러 사용자의 dirty change가 섞이면 publish 책임 소재가 흐려진다.
- 원격 선행 커밋이 생겼을 때 fast-forward 불가 상태를 늦게 발견한다.

---

## 3. 목표 상태

권한 시스템을 올리기 전에 아래 3가지를 만족해야 한다.

### 3.1 동시 편집 안전성
- 같은 문서 동시 편집은 앱 레벨 optimistic concurrency로 즉시 차단
- publish 단위 충돌은 문서별이 아니라 change set 단위로도 감지
- 자동 publish 중에는 같은 문서/자산 세트에 대한 중복 publish를 serialize

### 3.2 자동 publish 기본화
- CRUD 이후 사용자가 별도 Git 화면에 들어가지 않아도 publish가 뒤따라야 함
- 단, request path 안에서 remote push까지 동기식으로 묶지는 않음
- save와 publish는 분리하되, publish queue는 자동으로 작동해야 함

### 3.3 사용자별 Git attribution 보장
- Git commit author는 앱 로그인 사용자 기준으로 남아야 함
- 최소한 아래 정보는 commit metadata에서 역추적 가능해야 함
  - userId
  - loginId
  - display name
  - email
  - session/request trace

---

## 4. 권장 아키텍처: 3단계 저장 모델 + 자동 publish queue

### 4.1 Stage A — Save to working tree
요청 처리 단계에서 수행:
- ACL 확인
- `expectedRevisionSeq` 검증
- `.md` / `.sidecar.json` / `_assets` 변경 반영
- sidecar에 `lastModifiedBy`, `ownerLoginId`, `revisionSeq` 반영

이 단계 결과:
- 상태 = `dirty-uncommitted`
- 사용자에게는 "저장됨, 아직 publish 전"으로 노출

### 4.2 Stage B — Local commit by publisher
백그라운드 publish worker가 수행:
- change set 구성
- 관련 파일을 하나의 commit 단위로 묶음
- Git author를 현재 앱 사용자 identity로 지정
- commit message에 앱 이벤트 성격 반영

예시 commit message:
- `docs(dms): create design/apps/order/orderMain/orderMain.md`
- `docs(dms): update common/build.md`
- `docs(dms): move analysis/apps/App.md -> analysis/apps/core/App.md`
- `docs(dms): delete drafts/obsolete-note.md`
- `docs(dms): attach asset to design/apps/order/orderMain/orderMain.md`

이 단계 결과:
- 상태 = `committed-unpushed`

### 4.3 Stage C — Remote push by publisher
같은 worker 또는 후속 worker가 수행:
1. `fetch origin`
2. local HEAD vs `origin/master` fast-forward 가능 여부 확인
3. 가능하면 push
4. 불가능하면 `sync-blocked` 상태로 전환
5. 네트워크/권한 실패는 `push-failed` 상태로 전환

이 단계 결과:
- 성공 시 `clean`
- 실패 시 retry 가능한 publish failure 상태

---

## 5. 동시 편집 안전 패턴

### 5.1 문서 단위 optimistic concurrency는 유지하고 더 강하게 쓴다
현재의 `expectedRevisionSeq`는 유지해야 한다.

규칙:
- content save
- metadata-only update
- rename/move로 sidecar 변경 발생 시
- delete 직전 sidecar 확인 시
모두 문서의 최신 `revisionSeq` 기반 검증을 거쳐야 한다.

즉 같은 문서에 대해선 Git 충돌 전에 앱 레벨 409가 먼저 나야 한다.

### 5.2 publish queue는 문서 키 기반 직렬화가 필요하다
동시에 여러 사용자가 작업하더라도 최소한 아래 단위로는 queue serialization이 필요하다.

lock key 후보:
- document path
- affected asset path
- folder subtree

규칙:
- 같은 document path를 건드리는 publish job은 동시에 실행 금지
- rename/move는 old/new path 둘 다 lock
- delete는 subtree 전체 lock

### 5.3 publish 단위는 change set으로 본다
문서 하나만 바뀌는 게 아니라 아래가 함께 바뀔 수 있다.
- `.md`
- `.sidecar.json`
- `_assets/...`
- rename/move에 따른 old/new path

따라서 queue/job은 파일 1개가 아니라 `change set`을 기준으로 가져야 한다.

권장 change set 구조:
- actor: `{ userId, loginId, displayName, email }`
- operationType: `create | update | metadata | move | delete | asset`
- paths: `affectedPaths[]`
- revisionExpectations: 문서별 expected/current revision
- createdAt
- requestId / sessionId

### 5.4 auto-merge는 금지하고, sync-blocked로 승격한다
원격 선행 커밋 때문에 fast-forward가 안 되는 경우 서버가 자동 rebase/merge하지 않는다.

이유:
- sidecar ACL과 본문이 같이 바뀌는 문서에서 자동 merge는 위험하다.
- 권한 시스템이 얹히면 잘못된 merge가 곧 권한 사고로 이어질 수 있다.

규칙:
- remote 선행 커밋 발견 시 publish job은 실패가 아니라 `sync-blocked`
- 운영자/승인 사용자만 수동 reconcile 진행

---

## 6. 자동 publish 패턴

### 6.1 request path에서 push까지 동기 처리하지 않는다
금지:
- save API 안에서 바로 `git commit && git push`

이유:
- 네트워크 지연이 사용자 저장 UX를 망친다.
- remote 오류가 곧바로 save 실패로 보이면 사용자가 혼란스럽다.
- 동시 작업 시 latency spike가 곧 contention이 된다.

### 6.2 대신 save 후 즉시 publish job enqueue
권장 흐름:
1. save 성공
2. change set 생성
3. publish queue에 enqueue
4. worker가 짧은 debounce 후 local commit/push 수행

짧은 debounce가 필요한 이유:
- 같은 사용자가 연속 저장할 때 불필요한 commit 폭증을 막기 위함
- 예: 3~10초 내 동일 문서 연속 저장은 한 publish job으로 합치기

### 6.3 dirty tree를 장기 상태로 허용하지 않는다
운영 원칙:
- dirty-uncommitted 상태는 일시 상태여야 한다.
- 정상 경로에서는 save 후 짧은 시간 안에 `committed-unpushed` 또는 `clean`으로 이동해야 한다.

권장 SLO 예시:
- save 후 10초 내 local commit
- save 후 30초 내 remote push 시도
- 실패 시 사용자/운영자에게 상태 노출

---

## 7. 사용자별 Git 반영 패턴

### 7.1 Git author는 앱 사용자 identity에서 파생해야 한다
필수 입력:
- `TokenPayload.userId`
- `TokenPayload.loginId`
- 사용자 display name
- 사용자 email

현재 gap:
- `TokenPayload` 에는 `userId`, `loginId`만 있고 display name/email이 없다.
- `personalSettingsService`는 anonymous 단일 프로필이어서 사용자별 Git author source로 부적합하다.

권장 보완:
- publish job 생성 시 auth/user service에서 사용자 profile 조회
- Git author를 아래처럼 구성
  - name: 사용자 실명 또는 표시명
  - email: 회사 이메일 또는 no-reply 규칙 기반 메일

### 7.2 commit author와 sidecar actor를 같이 남긴다
동시에 남겨야 할 것:
- Git commit author = 사람 친화적 attribution
- sidecar `lastModifiedBy`, `ownerLoginId` = 앱 계정 기준 attribution
- commit message footer = 시스템 추적용 attribution

권장 footer 예시:
- `DMS-Actor-LoginId: viewer.han`
- `DMS-Actor-UserId: 12345`
- `DMS-Session-Id: ...`
- `DMS-Request-Id: ...`

즉 Git log만 봐도 누가 반영했는지, 앱 내부 감사 로그와 연결 가능해야 한다.

### 7.3 no-reply 규칙도 허용 가능
실제 사용자 이메일을 Git에 남기기 부담되면 아래 패턴을 쓴다.
- name: `최휘성`
- email: `A0122024330@dms.local` 또는 `A0122024330@no-reply.lsitc.local`

중요한 건 각 사용자별로 안정적으로 구분 가능해야 한다는 점이다.

---

## 8. 권한 적용 전 필수 테스트 항목

### 8.1 동시 편집
1. 같은 문서를 두 사용자 세션에서 열기
2. A 저장 후 revision 증가 확인
3. B가 이전 revision으로 저장 시 409 충돌 확인
4. 충돌 이후 B가 최신 pull/reload 없이 강제 publish되지 않는지 확인

### 8.2 auto publish
1. 문서 수정 후 별도 Git 버튼 없이 publish job 생성 확인
2. debounce 내 연속 저장이 단일 publish로 합쳐지는지 확인
3. publish 성공 시 dirty tree가 clean으로 복귀하는지 확인
4. publish 실패 시 `push-failed` 또는 `sync-blocked` 상태가 남는지 확인

### 8.3 per-user attribution
1. 사용자 A/B 각각 수정 후 Git log author 분리 확인
2. commit footer에 loginId/userId/sessionId가 남는지 확인
3. sidecar `lastModifiedBy`와 Git author가 같은 actor를 가리키는지 확인

### 8.4 sync blocked
1. 원격에 선행 커밋 추가
2. 로컬에서 다른 수정 발생
3. auto publish가 merge/rebase 대신 `sync-blocked` 로 멈추는지 확인
4. 운영자가 reconcile 전까지 추가 publish가 차단 또는 대기되는지 확인

---

## 9. 구현 전제 조건

이 패턴을 실제 구현하려면 최소 아래가 필요하다.

1. publish queue / worker
2. change set model
3. per-document or per-change-set locking
4. 사용자 profile 조회를 통한 Git author resolution
5. publish state persistence (`dirty-uncommitted`, `committed-unpushed`, `sync-blocked`, `push-failed`)
6. UI/ops surface 에서 상태 노출

---

## 10. 최종 결론

권한을 문서 위에 얹기 전에 먼저 고정해야 할 운영 모델은 다음이다.

- 동시 편집은 앱 레벨 `revisionSeq` 충돌로 먼저 차단한다.
- CRUD 이후 Git publish는 자동 queue로 처리한다.
- save와 push는 분리하되 dirty tree가 장기 상태가 되지 않도록 auto publish를 기본값으로 둔다.
- Git commit author는 anonymous/system 공용값이 아니라 실제 앱 로그인 사용자 기준으로 남긴다.
- 원격 충돌은 서버가 자동 merge하지 않고 `sync-blocked` 상태로 승격한다.

즉 앞으로의 기준선은:
`filesystem save → auto publish queue → per-user local commit → fast-forward push or sync-blocked`

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | 동시 편집 위험, dirty tree 장기화 방지, 사용자별 Git attribution 요구를 반영해 DMS 문서 레포의 concurrency-safe auto publish 패턴과 사전 테스트 항목을 문서화 |
