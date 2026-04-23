# DMS 문서 Git 정본 / 동기 정책

> 최종 업데이트: 2026-04-22

---

## 1. 정본 정의

DMS 문서 내용의 정본(source of truth)은 GitLab 문서 전용 레포를 사용한다.

- 문서 정본 레포: `LSWIKI_DOC.git`
- 현재 원격: `http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git`

`sooo` 모노레포는 아래만 소유한다.
- DMS 앱 코드
- 인증/권한 엔진
- 메타데이터 구조 / control-plane schema
- 문서 저장소를 읽고 쓰는 런타임 규약

즉, 문서 corpus 자체 중 **markdown 본문과 그 Git history** 는 모노레포가 장기 정본으로 소유하지 않는다.

---

## 2. 책임 경계

### 2.1 문서 Git 레포가 소유하는 것
- Markdown 본문 (`*.md`)
- 문서용 Git history / commit log

> 2026-04-22 기준 정책: GitLab binding 은 **markdown only** 이다.  
> attachment / reference / image 같은 binary·large file 은 Git 정본에 포함하지 않는다.

### 2.2 `sooo` 모노레포가 소유하는 것
- DMS UI / API / runtime
- auth / access / ACL / request workflow
- DB control-plane schema 및 migration
- 문서 Git 저장소 bootstrap / sync 규약
- binary storage / ingest runtime path contract

---

## 3. 런타임 규칙

DMS runtime 이 보는 문서 루트는 문서 Git working tree 여야 한다.

현재 정책 기준:
- local working tree root 는 `git.repositoryPath` 로 명시되며, 배포 환경에서는 `DMS_MARKDOWN_ROOT` 같은 **external runtime path override** 가 우선할 수 있다.
- settings UI 는 이 markdown root 를 runtime surface 로 관측하지만, runtime 중 경로 변경 자체를 수행하는 관리 surface 는 아니다.
- Docker/compose 는 이 external markdown root 를 컨테이너에 bind/mount 해야 하며, 새 이미지 배포가 문서 정본을 덮지 않도록 **빌드 이미지 밖** 에 둔다.
- DMS web 컨테이너는 same-origin proxy 역할이므로, 문서 working tree / binary storage mount 의 핵심 소유자는 server runtime 이다.
- binary asset root(attachment/reference/image), ingest queue 는 markdown root 와 분리된 external runtime path 를 사용한다. 템플릿은 문서 Git 레포의 `_templates/` 하위에 배치되며 GitLab과 자동 동기화된다.

정책상 의미:
- `apps/web/dms/data/documents` 같은 repo-local build path 는 더 이상 운영 정본이 아니다.
- 앱이 읽는 실제 문서 집합은 문서 Git repo working tree 기준이어야 한다.
- working tree 가 비어 있으면 runtime 은 `git.bootstrapRemoteUrl` / `git.bootstrapBranch` 설정으로 canonical remote 를 먼저 clone/bootstrap 해야 한다.
- 이 bootstrap/sync 는 app build-time 이 아니라 server runtime initialize/reconcile 단계에서 수행된다.
- 즉 로컬 fixture 파일이 미리 채워져 있어야 한다는 전제는 정책에서 제외된다.
- `git.repositoryPath` 가 비어 있다는 이유만으로 repo-local fallback/build output 경로가 canonical truth 로 승격되면 안 된다.
- attachment / reference / image 는 markdown Git working tree 안 `_assets` 하위가 아니라 **별도 non-Git storage root** 로 보내야 한다.

---

## 4. 동기 정책

### 4.1 pull / fetch
- 초기 working tree 가 비어 있으면 fetch 이전에 canonical remote clone/bootstrap 이 선행된다.
- DMS 작업 전 문서 Git repo 최신 상태를 먼저 fetch/pull 한다.
- 앱은 stale working tree 를 정본으로 사용하지 않는다.
- repo-level control-plane reconcile / deactivate 는 remote parity 가 fast-forward safe 로 확인됐을 때만 수행한다. remote ahead / diverged / parity inspection 실패 시에는 기존 DB control-plane 을 유지하고 repo-wide mutation 을 건너뛴다.

### 4.2 write / commit
- 문서 생성/수정/이동/삭제는 문서 Git working tree 에 반영한다.
- 문서 변경 commit 은 문서 Git repo 에서 발생한다.
- 앱 코드 변경 commit 은 `sooo` 에서 발생한다.

### 4.3 push
- 문서 내용을 실제 반영하려면 문서 Git remote 로 push 해야 한다.
- 현재 canonical branch 는 `master` 이며, 2026-04-17 기준 초기 import commit 이 원격 `LSWIKI_DOC.git` `master` 에 반영되어 있다.
- 앱 기능/권한 변경은 `sooo` remote 로 push 한다.

### 4.4 운영 관찰 surface
- Settings > Git surface 는 이제 아래를 함께 노출해야 한다.
  - configured root input
  - resolved configured root
  - actual Git root
  - actual remote URL / branch
  - sync state(`in-sync`, `local-ahead`, `remote-ahead`, `diverged`, `remote-missing`, `local-only`)
  - ahead / behind / parity 결과
  - non-empty non-git root 의 reconcile-needed 사유
- 상대 경로 `git.repositoryPath` 는 **process cwd 가 아니라 `apps/web/dms` app root 기준**으로 해석한다.
- 문서 상세 runtime surface(협업 / publish 상태)는 path isolation reason 과 publish sync 상태를 계속 노출하지만, release/unlock 은 아직 manual reconcile 범위로 남는다.

---

## 5. 운영 원칙

1. markdown content truth = 문서 Git repo
2. app/engine truth = `sooo`
3. `.sidecar.json` 파일은 더 이상 runtime 계약에 포함되지 않으며, metadata 정본은 DB control-plane projection 이다.
4. binary asset / ingest runtime 은 Git 비대상 external path contract 로 관리한다. 템플릿은 문서 Git 레포의 `_templates/` 하위에 포함되어 자동 동기화된다.
5. 문서가 안 보일 때는 권한 이전에 문서 Git working tree / mount / repo path 를 먼저 확인한다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-22 | GitLab binding 은 markdown only 이고, attachment/reference/image/ingest/template runtime 은 빌드 이미지 밖의 external path contract 로 분리해야 함을 정책에 반영 |
| 2026-04-22 | Settings Git surface / collaboration runtime surface 가 configured root, actual Git root, remote/branch, sync/parity, reconcile-needed context 를 노출해야 함을 운영 정책에 추가하고, 상대 경로 해석 기준을 `apps/web/dms` app root 로 명시 |
| 2026-04-22 | repo-wide control-plane reconcile/deactivate 는 remote parity fast-forward 검증이 통과한 경우에만 수행하고, remote ahead/diverged/parity inspection 실패 시 기존 DB control-plane 을 유지하도록 정책을 추가 |
| 2026-04-22 | `git.repositoryPath` explicit binding 원칙을 추가하고, blank fallback/build-output 경로가 canonical truth 로 승격되지 않아야 함을 명시 |
| 2026-04-21 | empty working tree bootstrap(`git.bootstrapRemoteUrl` / `git.bootstrapBranch`)와 DB-only metadata / no-sidecar 정책을 반영 |
| 2026-04-17 | GitLab `LSWIKI_DOC.git` 를 DMS 문서 내용의 정본으로 고정하고, `sooo` 와의 책임 경계 및 pull/commit/push 정책을 문서화 |

## 현재 확인된 운영 메모

- 2026-04-17 기준 `A0122024330` 계정은 프로젝트 `Maintainer (old: Master)` 권한(access_level 40)으로 확인되었고, 원격 `master` 초기 push 가 성공했다.
- 2026-04-17 이전의 push 실패는 브랜치명 문제가 아니라 권한 레벨 30(Developer) 상태에서 발생한 protected-branch 거절이었다.
- 현재 문서 CRUD 이후 Git publish 패턴은 `document-repo-git-sync-pattern.md` 기준으로 정리한다.
