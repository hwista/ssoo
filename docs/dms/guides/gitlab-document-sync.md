# DMS GitLab 문서 자동 싱크 운영 가이드

> 최종 업데이트: 2026-05-08
> 범위: DMS 서버 시작 시 문서 전용 GitLab 저장소(`LSWIKI_DOC.git`)를 runtime markdown root에 연결하는 운영 절차.

이 문서는 코드 구현이 아니라 운영 handoff 문서입니다. 현재 DMS 서버는 시작 시 이미 `gitService.initialize()` 를 호출하며, 운영자는 배포 환경의 `.env` 값과 원격 저장소 정책만 채우면 됩니다.

---

## 1. 코드 적용 상태

자동 싱크 진입점은 이미 서버 부팅 경로에 포함되어 있습니다.

- `apps/server/src/modules/dms/dms.module.ts:75-95`
  - `onModuleInit()` 에서 DB 설정 초기화 후 `gitService.initialize()` 호출
  - 성공 시 `Git 초기화 완료 (mode: ...)` 로그 출력
  - 실패 시 서버 부팅을 중단하지 않고 warning 으로 남김
- `apps/server/src/modules/dms/runtime/git.service.ts:207-505`
  - document root 상태를 판별하고 clone/init/reconcile/fast-forward 동작 수행
  - 기존 repo는 fast-forward only 로만 자동 pull
  - 충돌/분기 상태는 운영자가 수동 정리하도록 fail/skip reason 을 남김
- 문서/템플릿 변경 publish 경로
  - 일반 문서 저장/생성/삭제는 `CollaborationService.noteMutation()` 을 통해 자동 commit/push job으로 등록
  - 기본/레거시 템플릿 seed 및 사용자 템플릿 저장/삭제도 `_templates/**/*.md` 변경으로 자동 publish 등록
  - 사이드바 `변경 사항`은 수동 커밋 화면이 아니라 자동 publish 대기/실패 진단 화면으로 사용

따라서 다음 단계는 "코드 구현"이 아니라 운영 변수와 배포 가이드 고정입니다.

---

## 2. 운영자가 설정해야 할 `.env` 값

`compose.yaml` 의 server service는 아래 bootstrap 변수를 컨테이너 환경변수로 전달합니다. 실제 운영에서는 compose 파일을 직접 수정하기보다 배포 환경의 `.env` 에 값을 둡니다.

```dotenv
# 문서 전용 GitLab repository. 예: http(s)://.../LSWIKI_DOC.git
DMS_GIT_BOOTSTRAP_REMOTE_URL=https://gitlab.example.com/LSWIKI_DOC.git

# 문서 repo의 canonical branch. 운영 repo 정책에 맞춰 master/main/development 등 명시
DMS_GIT_BOOTSTRAP_BRANCH=master
```

운영자 `.env` 에 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 를 반드시 설정해야 server 컨테이너의 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 이 채워지고, 자동 `git clone`/pull/reconcile 동작이 원격 `LSWIKI_DOC.git` 를 기준으로 실행됩니다. 값이 비어 있으면 server 컨테이너에는 빈 환경변수만 전달되고 자동 clone 기준 원격은 없는 상태로 남습니다.

주의:

- secret, token, credential 값은 기록하지 않는다. 문서에는 URL shape 와 변수명만 남긴다.
- GitLab 인증이 필요한 경우 credential 주입 방식은 운영 secret 관리 정책에서 다루고, 이 문서에 token 값을 쓰지 않는다.
- `DMS_MARKDOWN_HOST_PATH` / `DMS_MARKDOWN_ROOT` 는 document working tree 위치를 정하고, Git bootstrap 변수는 그 working tree를 어떤 remote와 연결할지 정합니다.

---

## 3. 부팅 시 자동 분기 4종

DMS 서버 시작 시 document root 상태에 따라 아래처럼 동작합니다.

| 상태 | remote 설정 | 동작 | 운영 의미 |
|------|-------------|------|-----------|
| empty dir | remote 있음 | git clone | 빈 runtime document root를 `LSWIKI_DOC.git` 로 채움 |
| `.git` 있음 | origin 있음/설정됨 | fast-forward only auto-pull | 기존 repo를 보존하고 remote ahead인 경우에만 안전하게 당김 |
| non-empty dir, `.git` 없음 | remote 있음 | reconcile-merge | 기존 로컬 파일을 임시 보존하면서 remote-first 병합 시도 |
| non-empty dir, `.git` 없음 | no remote | fail | 원격 기준 없이 기존 문서를 임의 Git repo로 만들지 않음 |

### reconcile-merge 세부 처리

기존 문서가 이미 있는 non-empty 디렉터리에 remote를 연결하면 다음 순서로 처리합니다.

1. `git init`
2. `origin` remote 추가
3. `fetch`
4. remote branch checkout
5. 이름 충돌 시 임시 commit 후 `merge --allow-unrelated-histories`
6. merge 충돌 시 remote-first resolution 으로 마무리

이 방식은 기존 파일을 최대한 보존하되, 충돌이 나면 원격 문서 repo를 기준으로 맞춥니다.

---

## 4. 수동 workspace 동기화 명령과의 경계

`pnpm run codex:workspace-sync-from-gitlab` 는 monorepo workspace 동기화용 수동 명령입니다. 서버 runtime document root 자동 싱크와 목적이 다릅니다.

- 서버 부팅 자동 싱크: `DMS_GIT_BOOTSTRAP_REMOTE_URL` / `DMS_GIT_BOOTSTRAP_BRANCH` 기준으로 runtime markdown root를 GitLab 문서 repo에 연결
- `pnpm run codex:workspace-sync-from-gitlab`: GitLab workspace branch가 monorepo보다 앞선 경우 개발 checkout을 재통합
- `pnpm run codex:workspace-publish`: 현재 checkout을 GitHub + GitLab workspace에 publish

운영자가 먼저 확인할 순서:

1. `.env` 에 `DMS_GIT_BOOTSTRAP_REMOTE_URL` / `DMS_GIT_BOOTSTRAP_BRANCH` 가 있는지 확인
2. `docker compose config` 로 server service environment에 값이 주입되는지 확인
3. `docker compose exec server env | grep DMS_GIT_BOOTSTRAP` 으로 실행 중 컨테이너에 값이 있는지 확인
4. `docker compose up -d --build server dms` 로 재기동
5. `docker compose logs server` 에서 `Git 초기화 완료 (mode: clone|existing|existing-pulled|reconcile-merge)` 확인
6. `/api/dms/files` 또는 `pnpm run verify:access-dms:raw` 로 파일 트리 노출 확인

---

## 5. 앱 내부 변경사항 표시와 자동 publish

DMS 웹 사이드바의 `변경 사항`은 runtime markdown Git working tree의 uncommitted 상태를 보여줍니다. 정상 운영에서는 사용자가 직접 커밋하지 않습니다.

- 문서 생성/수정/삭제, 메타데이터 변경, 템플릿 seed/save/remove는 서버에서 자동 publish job을 등록합니다.
- 자동 publish job은 대상 markdown 파일을 commit한 뒤 `origin/<현재 브랜치>` 로 push합니다.
- 원격이 ahead/diverged 이거나 push 권한이 없으면 상태가 `sync-blocked` 또는 `push-failed` 로 남고, 수동 reconcile 또는 credential 점검이 필요합니다.
- `_templates/` 아래 기본 템플릿 파일도 document working tree의 일부이므로 GitLab 문서 전용 repo에 함께 반영됩니다.

운영 확인 예:

```bash
docker compose exec server sh -lc 'cd "$DMS_MARKDOWN_ROOT" && git status -sb'
docker compose logs --tail 300 server | grep -E 'Git 파일 커밋 완료|자동 publish 실패|push-failed|sync-blocked'
```

성공 기준:

- `git status -sb` 에 untracked/modified markdown 파일이 남지 않음
- 최근 문서 변경 로그에 `Git 파일 커밋 완료`가 있고 local/remote branch hash가 일치
- DMS 웹 사이드바에 수동 `커밋` 버튼이 노출되지 않음

---

## 6. 이번 묶음과 out of scope

이번 묶음은 운영 가이드와 앱 내부 자동 publish 기준 보강입니다. out of scope 는 다음과 같습니다.

- 실제 운영 `.env` 파일에 값을 쓰는 작업
- GitLab token/credential/secret 값을 확인하거나 문서화하는 작업
- ACL/permission semantics 변경
- DMS collaboration/document grant UI 변경

별도 task 로 잡을 후보:

- 운영 `.env` 에 `DMS_GIT_BOOTSTRAP_REMOTE_URL` / `DMS_GIT_BOOTSTRAP_BRANCH` 반영
- 실제 `LSWIKI_DOC.git` clone/pull 로그와 `/api/dms/files` runtime 확인
- GitLab 보호 브랜치/push 권한 runbook 확장

---

## 7. 빠른 검증 체크리스트

```bash
# 환경 값이 compose에 반영되는지 shape만 확인한다. secret/token 값은 출력하지 않는다.
docker compose config | grep -E 'DMS_GIT_BOOTSTRAP_(REMOTE_URL|BRANCH)|DMS_MARKDOWN'

# server/dms 재기동
docker compose up -d --build server dms

# 컨테이너 상태
docker compose ps server dms

# 서버 로그에서 Git bootstrap mode 확인
docker compose logs --tail 200 server | grep -E 'Git 초기화 완료|Git 초기화 실패|reconcile-merge|auto-pull'

# DMS runtime API 검증
pnpm run verify:access-dms:raw
```

성공 기준:

- server/dms가 healthy
- Git 초기화 mode가 의도한 상태와 일치
- document tree가 `/api/dms/files` 에 노출
- 원격 ahead/diverged 상태에서는 자동 mutation 대신 운영자가 수동 reconcile 하는 상태로 남음

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-05-08 | 앱 내부 문서/템플릿 변경 자동 publish 기준과 사이드바 변경사항 화면의 진단 역할을 추가 |
| 2026-05-07 | DMS GitLab 문서 자동 싱크 운영 변수, 부팅 분기, 검증 절차를 정리 |
