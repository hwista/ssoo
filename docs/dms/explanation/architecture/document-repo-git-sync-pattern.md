# DMS 문서 레포 Git Sync 패턴

> Historical note: 이 문서는 **DB-only metadata cutover 이전의 sidecar-based Git sync 설계**를 기록합니다.
> 현재 runtime 계약은 `.md content + DB metadata projection` 기준이며, 아래 sidecar 언급은 historical context 로만 유지합니다.

> 최종 업데이트: 2026-04-17
> 상위 문서:
> - `docs/dms/explanation/architecture/document-repo-source-of-truth-policy.md`
> - `docs/dms/explanation/architecture/hybrid-document-control-plane.md`

---

## 1. 목적

권한/ACL을 문서 위에 본격적으로 입히기 전에, DMS가 소스 레포 밖의 외부 문서 Git working tree를 참조하는 현재 구조에서 실제 파일 CRUD와 Git 동기화가 어떤 패턴으로 동작해야 하는지 고정한다.

이 문서는 특히 아래 질문에 답한다.

- 파일 생성/수정/이동/삭제 시 working tree에는 무엇이 남는가
- Git commit 은 언제 자동/수동으로 발생해야 하는가
- pull/fetch/push 는 요청 처리와 어떤 경계로 분리해야 하는가
- 충돌(conflict)과 stale working tree 는 어디서 차단해야 하는가

---

## 2. 현재 구현에서 확인된 사실

### 2.1 파일 CRUD는 즉시 working tree를 바꾼다
현재 서버 구현은 CRUD 요청이 오면 우선 문서 working tree를 직접 수정한다.

대표 근거:
- `apps/server/src/modules/dms/file/file-crud.service.ts`
- `apps/server/src/modules/dms/content/content.controller.ts`

확인된 동작:
- create: `.md`와 `.sidecar.json`을 생성한다.
- update/save: 본문 저장 시 `.md`와 `.sidecar.json`의 `revisionSeq`, `updatedAt`, `lastModifiedBy` 등을 갱신한다.
- metadata update: 본문 없이 sidecar만 갱신할 수 있다.
- rename/move: 본문 파일과 sidecar 파일을 같이 rename하고 sidecar에 `pathHistory`를 누적한다.
- delete: 본문 삭제 시 sidecar도 같이 삭제한다.
- folder create/delete: 디렉토리 자체를 직접 생성/삭제한다.

즉 현재 CRUD의 commit point는 Git이 아니라 filesystem write 완료 시점이다.

### 2.2 Git 기능은 별도 수동 surface 이다
현재 Git 기능은 `/dms/git`에서 별도 액션으로 노출된다.

대표 근거:
- `apps/server/src/modules/dms/runtime/git.service.ts`
- `apps/server/src/modules/dms/git/git.controller.ts`

확인된 동작:
- status
- commit / commitFiles
- discard / discardAll
- history / fileHistory
- restore
- diff
- init

중요:
- 파일 CRUD가 끝났다고 해서 자동 commit/push가 일어나지 않는다.
- 즉 현재 구조는 `filesystem mutation`과 `git publication`이 분리된 모델이다.

### 2.3 현재 서버에는 remote fetch/pull/push orchestration 이 없다
`git.service.ts` 기준 현재 구현은 로컬 working tree의 상태/commit/discard/history까지만 담당한다.

현재 없는 것:
- request 전 자동 `git fetch`
- request 전 자동 `git pull --rebase`
- request 후 자동 `git push`
- remote fast-forward 검사/lease push
- background retry queue

따라서 현재 앱의 본질은 `external Git working tree mounted filesystem editor` 이다.

---

## 3. 설계 원칙

### 3.1 CRUD와 Git publish는 분리한다
기본 원칙:
- 사용자 CRUD 요청은 working tree 반영까지 책임진다.
- 원격 Git publish는 별도 단계로 다룬다.

이유:
- 문서 편집 트랜잭션과 원격 네트워크 실패를 한 요청에 묶으면 UX와 복구가 나빠진다.
- ACL/sidecar/revisionSeq 검증은 파일 수준에서 먼저 닫아야 한다.
- Git remote 실패 때문에 사용자의 로컬 편집 자체를 실패로 되돌리면 운영 복구가 어려워진다.

### 3.2 Git commit은 로컬 publish 단위, push는 원격 publish 단위다
구분:
- local commit: working tree 스냅샷을 로컬 Git history에 고정
- remote push: 로컬 커밋을 원격 정본에 반영

즉 앞으로는 아래 3단계로 본다.
1. filesystem mutation
2. local git commit
3. remote git push

### 3.3 fetch/pull은 request path에 강제하지 않는다
읽기/쓰기 요청마다 fetch/pull을 강제하지 않는다.

이유:
- 모든 요청이 네트워크/원격 상태에 종속되면 응답성과 안정성이 나빠진다.
- 현재 DMS는 mounted working tree를 앱 상태의 직접 입력으로 사용하므로, request path는 가능한 한 local-only여야 한다.

대신 stale 여부는 별도 sync point에서 관리한다.

---

## 4. CRUD별 표준 Git sync 패턴

### 4.1 Read
패턴:
- local working tree만 읽는다.
- request path에서 fetch/pull 하지 않는다.
- sidecar가 없으면 읽기 시 default sidecar가 생성될 수 있으므로, read-only처럼 보여도 working tree mutation이 발생할 수 있다.

운영 규칙:
- 순수 조회 경로에서 sidecar 자동 생성은 가능한 한 축소 대상으로 본다.
- 현재 구현을 유지하더라도, 자동 생성된 sidecar는 별도 pending change로 취급한다.

### 4.2 Create
패턴:
1. `.md` 생성
2. owner/visibility/acl 기본값을 가진 `.sidecar.json` 생성
3. working tree dirty 상태로 남김
4. local commit은 명시적 publish 단계에서 수행
5. remote push는 commit 이후 별도 수행

commit 단위:
- 기본적으로 본문 파일 + sidecar 파일을 같은 commit에 묶는다.

### 4.3 Update content
패턴:
1. ACL/write 권한 확인
2. `expectedRevisionSeq`로 optimistic concurrency 검증
3. 본문 저장
4. sidecar 메타데이터(`revisionSeq`, `updatedAt`, `lastModifiedBy`) 동시 갱신
5. working tree dirty 상태로 남김
6. 이후 local commit / remote push

중요:
- revision 충돌은 Git merge가 아니라 앱 레벨에서 먼저 막는다.
- 즉 같은 문서의 동시 수정 1차 방어선은 `revisionSeq` 이다.

### 4.4 Metadata-only update
패턴:
1. sidecar만 갱신
2. working tree dirty 상태로 남김
3. local commit / remote push는 별도

commit 단위:
- metadata-only 변경도 독립 commit 가능
- 단, 권한/visibility 변경은 감사성이 중요하므로 content edit commit과 섞지 않는 쪽이 유리하다.

### 4.5 Rename / Move
패턴:
1. 기존 경로 manage 권한 확인
2. 본문 파일 rename/move
3. sidecar 파일 rename/move
4. sidecar의 `relativePath`, `pathHistory`, `revisionSeq`, `lastModifiedBy` 갱신
5. working tree dirty 상태로 남김
6. local commit / remote push

commit 단위:
- rename 대상 본문 + sidecar + 경로 히스토리 갱신을 반드시 한 commit으로 묶는다.

### 4.6 Delete
패턴:
1. manage 권한 확인
2. 본문 삭제
3. sidecar 삭제
4. working tree dirty 상태로 남김
5. local commit / remote push

주의:
- delete는 복구 비용이 크므로 remote push 전까지는 로컬 Git commit이 반드시 존재해야 한다.
- 즉 delete는 `commit 없는 삭제` 상태로 오래 두지 않는 것이 운영 원칙이다.

### 4.7 Folder create / delete
패턴:
- 빈 폴더 생성/삭제 자체는 Git commit에서 잘 보존되지 않을 수 있다.
- 따라서 Git 기준 관리 대상은 실제 문서 파일 세트(`.md`, `.sidecar.json`, `_assets`)다.

운영 규칙:
- 폴더 생성은 문서 생성의 부산물로 취급한다.
- 폴더 삭제는 내부 문서가 모두 정리된 뒤에만 허용한다.

### 4.8 Asset attach / image / reference
패턴:
1. asset 바이너리 저장
2. 관련 sidecar/본문 링크 갱신
3. working tree dirty 상태로 남김
4. local commit / remote push

commit 단위:
- asset 파일만 따로 커밋하지 말고, 최소한 이를 참조하는 문서/sidecar와 함께 묶는다.

---

## 5. 표준 publish 단계

### 5.1 local save 단계
정의:
- API 요청이 filesystem mutation을 성공적으로 끝낸 상태
- 아직 Git commit/push는 안 됨

사용자 관점 상태:
- 저장됨(saved to working tree)
- 아직 게시되지 않음(not published)

### 5.2 local commit 단계
정의:
- logical change set을 Git commit으로 고정

권장 commit 묶음:
- create: `.md` + `.sidecar.json`
- update: `.md` + `.sidecar.json`
- metadata-only ACL 변경: `.sidecar.json` 중심 단독 commit 허용
- rename/move: old/new path 반영 전체
- delete: 삭제 대상 전체
- asset: `_assets/...` + 관련 문서/sidecar

### 5.3 remote push 단계
정의:
- local commit을 `origin/master`에 fast-forward로 반영

운영 규칙:
1. push 전 `fetch origin`
2. local branch가 `origin/master`에 대해 fast-forward 가능한지 확인
3. 가능하면 push
4. 불가능하면 앱이 자동 merge하지 말고 sync conflict 상태로 올린다.

중요:
- 서버 request path에서 자동 merge/rebase는 하지 않는다.
- 충돌 해소는 명시적 sync 단계에서만 한다.

---

## 6. fetch / pull / push 규칙

### 6.1 fetch
용도:
- 원격 새 커밋 존재 여부 확인
- local working tree stale 여부 판단

권장 시점:
- 앱 부트 시 1회
- publish 직전
- 관리자 수동 sync 요청 시

### 6.2 pull
원칙:
- dirty working tree 상태에서는 자동 pull 금지
- unpublished local change가 없을 때만 허용

이유:
- mounted working tree가 앱의 실제 편집 대상이라, dirty 상태 pull은 예측 불가능한 충돌을 만든다.

### 6.3 push
원칙:
- local commit이 있는 clean working tree에서만 허용
- push 실패 시 filesystem 변경을 롤백하지 않는다.
- 실패 원인은 publish 상태로 남기고 재시도 가능해야 한다.

---

## 7. 상태 모델 권장안

권장 문서/작업트리 상태:
- clean: 로컬 변경 없음, 원격과 동기
- dirty-uncommitted: filesystem 변경은 있으나 commit 없음
- committed-unpushed: local commit 존재, remote 미반영
- sync-blocked: remote 선행 커밋 또는 fast-forward 불가
- push-failed: remote 연결/권한/네트워크 실패

권한 시스템을 얹기 전 최소한 이 상태를 운영자가 볼 수 있어야 한다.

---

## 8. 권한 적용 전 반드시 테스트할 시나리오

1. create 후 commit 없이 재시작해도 working tree 기반으로 문서가 보이는가
2. update 후 `revisionSeq` 충돌이 Git merge 이전에 409로 막히는가
3. metadata-only ACL 수정이 본문 변경 없이 독립 commit 세트로 남는가
4. rename/move 시 sidecar `pathHistory` 와 실제 파일 경로가 일치하는가
5. delete 후 local commit은 되지만 push 전 복원이 가능한가
6. asset 추가 시 문서/sidecar/asset이 같은 publish 단위로 묶이는가
7. remote에 선행 커밋이 생긴 상태에서 push가 fast-forward 실패로 중단되는가
8. dirty working tree 상태에서 pull을 금지할 수 있는가

---

## 9. 현재 기준 결론

현재 SSOO DMS에서 채택해야 할 기본 패턴은 아래와 같다.

- CRUD는 외부 문서 Git working tree를 직접 수정한다.
- CRUD 성공 = filesystem save 성공이지, Git publish 성공이 아니다.
- Git commit/push는 별도 publish 단계로 분리한다.
- request path에서는 자동 fetch/pull/push/merge를 하지 않는다.
- 충돌 제어는 먼저 `revisionSeq` 로 막고, 원격 충돌은 publish 단계에서 fast-forward 검사로 막는다.
- 권한 시스템을 올리기 전에는 이 publish 상태 모델과 테스트 시나리오를 먼저 닫는다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | 외부 문서 Git working tree를 사용하는 현재 DMS 구조에서 CRUD별 Git sync 패턴, publish 단계, fetch/pull/push 규칙, 사전 테스트 시나리오를 문서화 |
