# DMS 문서 Git 정본 / 동기 정책

> 최종 업데이트: 2026-04-17

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

즉, 문서 corpus 자체(`.md`, sidecar, `_assets`)는 모노레포가 장기 정본으로 소유하지 않는다.

---

## 2. 책임 경계

### 2.1 문서 Git 레포가 소유하는 것
- Markdown 본문 (`*.md`)
- sidecar projection (`*.sidecar.json`)
- 문서에 종속된 `_assets`
- 문서용 Git history / commit log

### 2.2 `sooo` 모노레포가 소유하는 것
- DMS UI / API / runtime
- auth / access / ACL / request workflow
- DB control-plane schema 및 migration
- 문서 Git 저장소 bootstrap / sync 규약

---

## 3. 런타임 규칙

DMS runtime 이 보는 문서 루트는 문서 Git working tree 여야 한다.

현재 개발/로컬 Docker 기준:
- host clone path: `/home/a0122024330/src/lswiki-docs`
- container path: `/app/apps/web/dms/data/documents`
- `server`, `dms` 서비스 모두 이 경로를 bind mount 한다.

정책상 의미:
- `apps/web/dms/data/documents` 내부의 테스트 문서는 더 이상 장기 정본이 아니다.
- 앱이 읽는 실제 문서 집합은 문서 Git repo working tree 기준이어야 한다.

---

## 4. 동기 정책

### 4.1 pull / fetch
- DMS 작업 전 문서 Git repo 최신 상태를 먼저 fetch/pull 한다.
- 앱은 stale working tree 를 정본으로 사용하지 않는다.

### 4.2 write / commit
- 문서 생성/수정/이동/삭제는 문서 Git working tree 에 반영한다.
- 문서 변경 commit 은 문서 Git repo 에서 발생한다.
- 앱 코드 변경 commit 은 `sooo` 에서 발생한다.

### 4.3 push
- 문서 내용을 실제 반영하려면 문서 Git remote 로 push 해야 한다.
- 현재 canonical branch 는 `master` 이며, 2026-04-17 기준 초기 import commit 이 원격 `LSWIKI_DOC.git` `master` 에 반영되어 있다.
- 앱 기능/권한 변경은 `sooo` remote 로 push 한다.

---

## 5. 운영 원칙

1. content truth = 문서 Git repo
2. app/engine truth = `sooo`
3. sidecar 는 문서 repo 안에서 함께 관리하되, 장기적으로는 DB control-plane 의 projection 으로 수렴한다.
4. 문서가 안 보일 때는 권한 이전에 문서 Git working tree / mount / repo path 를 먼저 확인한다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | GitLab `LSWIKI_DOC.git` 를 DMS 문서 내용의 정본으로 고정하고, `sooo` 와의 책임 경계 및 pull/commit/push 정책을 문서화 |

## 현재 확인된 운영 메모

- 2026-04-17 기준 `A0122024330` 계정은 프로젝트 `Maintainer (old: Master)` 권한(access_level 40)으로 확인되었고, 원격 `master` 초기 push 가 성공했다.
- 2026-04-17 이전의 push 실패는 브랜치명 문제가 아니라 권한 레벨 30(Developer) 상태에서 발생한 protected-branch 거절이었다.
- 현재 문서 CRUD 이후 Git publish 패턴은 `document-repo-git-sync-pattern.md` 기준으로 정리한다.
