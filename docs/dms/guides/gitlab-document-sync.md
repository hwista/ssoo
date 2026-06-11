# DMS GitLab 문서 자동 싱크 운영 가이드

> 최종 업데이트: 2026-06-04
> 범위: DMS 서버가 runtime markdown root를 어떤 문서 GitLab 저장소에 연결하는지 운영/개발/테스트 역할별로 고정하는 절차.

이 문서는 코드 구현이 아니라 운영 handoff 문서입니다. 현재 DMS 서버는 시작 시 이미 `gitService.initialize()` 를 호출하며, 운영자는 `.env` 와 배포 runtime 역할만 올바르게 고정하면 됩니다.

---

## 1. 코드 적용 상태

자동 싱크 진입점과 역할 검증은 이미 서버 부팅 경로에 포함되어 있습니다.

- `apps/server/src/modules/dms/dms.module.ts`
  - `onModuleInit()` 에서 DB 설정 초기화 후 `configService.assertGitBootstrapContract()` 와 `gitService.initialize()` 호출
  - `DMS_INSTANCE_ENV` 누락/오류 또는 역할-설정 mismatch 는 startup-fatal 로 중단
  - 기존 repo의 실제 `origin` 이 기대 remote 와 다르면 서버는 기동을 계속하되 Git mutation/auto-sync 는 차단
- `apps/server/src/modules/dms/runtime/dms-config.service.ts`
  - `DMS_INSTANCE_ENV=prod|dev|local-test` 역할 계약을 해석
  - 역할별 canonical remote / branch / explicit-empty override 를 계산
- `apps/server/src/modules/dms/runtime/git.service.ts`
  - empty dir clone, 기존 repo fast-forward, wrong-remote blocking 을 수행
  - 기존 repo의 `origin` 을 자동으로 덮어쓰지 않고 mismatch 를 진단 상태로 남김

따라서 다음 단계는 "코드 구현"이 아니라 역할별 `.env` / compose / SSH 운영 기준을 고정하는 것입니다.

---

## 2. 역할 계약 정본

현재 기준의 canonical binding 은 아래와 같습니다.

| `DMS_INSTANCE_ENV` | 대상 역할 | canonical remote | 기본 branch | 메모 |
|---|---|---|---|---|
| `prod` | 현재 서버/배포 운영 | `http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git` | `master` | 기존에 사용하던 문서 repo 유지 |
| `dev` | 일반 로컬 실행 / 개발 서버 | `git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git` | `master` | ordinary local run 은 이 역할을 따라감 |
| `local-test` | Playwright/direct-run 격리 테스트 | remote 없음 | `master` | 문서 repo는 항상 격리 상태 유지 |

운영 원칙:

- `DMS_INSTANCE_ENV=prod` 런타임은 `LSWIKI_DOC.git` 문서 저장소를 canonical remote 로 사용합니다.
- `DMS_INSTANCE_ENV=dev` 런타임은 `LSWIKI_DOC_DEV.git` 문서 저장소를 canonical remote 로 사용합니다.
- 현재 "서버에 올라가는" 배포 런타임은 `DMS_INSTANCE_ENV=prod` 로 취급합니다.
- ordinary local run(`pnpm dev`, `pnpm dev:server`, local compose)은 `DMS_INSTANCE_ENV=dev` 로 취급합니다.
- Playwright / local-test 는 `DMS_INSTANCE_ENV=local-test` 로 고정하고 remote 를 비워 둡니다.
- 향후 운영 서버와 개발 서버가 명확히 분리되더라도 같은 역할 계약을 그대로 사용합니다.

---

## 3. 운영자가 관리해야 할 `.env` 값

`compose.yaml` 의 server service 는 아래 변수를 컨테이너 환경변수로 전달합니다. 실제 운영에서는 compose 파일을 직접 수정하기보다 배포 환경의 `.env` 에 값을 둡니다.

```dotenv
# 필수 역할 선택
DMS_INSTANCE_ENV=prod

# 역할별 canonical remote
DMS_GIT_PROD_REMOTE_URL=http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git
DMS_GIT_DEV_REMOTE_URL=git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git

# branch 기본값
DMS_GIT_BOOTSTRAP_BRANCH=master

# 선택: stale persisted bootstrap remote 를 지우거나 같은 remote 로만 override 할 때 사용
DMS_GIT_BOOTSTRAP_REMOTE_URL=
```

주의:

- 운영자 `.env` 에는 먼저 `DMS_INSTANCE_ENV` 를 넣고, 그 다음 역할별 remote 변수를 맞춥니다.
- `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 기본 스위치가 아닙니다. 역할이 기대하는 remote 와 다른 값을 넣으면 startup-fatal 이거나 mutation-blocking 상태가 됩니다.
- local dev 는 `DMS_INSTANCE_ENV=dev` 를 사용하고, 배포 운영은 `DMS_INSTANCE_ENV=prod` 를 사용합니다.
- local-test 는 `DMS_INSTANCE_ENV=local-test` 이고 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 을 비워 둡니다.
- secret, token, credential 값은 기록하지 않는다. 문서에는 URL shape 와 변수명만 남긴다.
- 개발 remote 는 SSH(`git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git`) 이므로 서버/개발 머신의 SSH key, known_hosts, access policy 를 별도로 준비해야 합니다.

---

## 4. 부팅 시 동작 규칙

역할 계약과 현재 working tree 상태에 따라 DMS 는 아래처럼 동작합니다.

| 상태 | 역할 | 동작 | 운영 의미 |
|---|---|---|---|
| empty dir | `prod`/`dev` | role-bound remote 로 `git clone` | 빈 runtime document root 를 역할별 정본 repo 로 채움 |
| existing `.git` + expected remote | `prod`/`dev` | fetch + fast-forward only auto-pull | 현재 repo binding 을 유지하면서 안전하게 최신화 |
| existing `.git` + wrong remote | `prod`/`dev` | remote rewrite 금지, mutation 차단 | 운영자가 새 root cutover 또는 수동 정리 필요 |
| non-empty dir, `.git` 없음 | `prod`/`dev` | reconcile-needed / bootstrap flow | 기존 파일과 remote 기준을 운영자가 점검해야 함 |
| any existing remote | `local-test` | remote 사용 금지, binding 차단 | 테스트 profile 이 운영/개발 repo 를 오염시키지 않음 |

중요한 경계:

- `DMS_INSTANCE_ENV` 누락 또는 invalid 값은 startup-fatal 입니다.
- `DMS_INSTANCE_ENV=prod|dev` 이 기대하는 canonical remote 와 `DMS_GIT_BOOTSTRAP_REMOTE_URL` / persisted config 가 다르면 startup-fatal 입니다.
- 이미 존재하는 working tree 의 실제 `origin` 이 기대 remote 와 다르면 서버는 자동으로 `origin` 을 바꾸지 않습니다.
- wrong remote existing repo 는 settings/runtime 에 blocking reason 이 표시되고, fetch/pull/publish 같은 mutation path 가 차단됩니다.

---

## 5. local-dev 와 local-test 경계

`pnpm run codex:workspace-sync-from-gitlab` 는 monorepo workspace 동기화용 수동 명령입니다. 문서 runtime repo binding 과 역할이 다릅니다.

- local-dev (`DMS_INSTANCE_ENV=dev`)
  - ordinary local run 이 따르는 기본 profile
  - 문서 Git remote 는 `LSWIKI_DOC_DEV.git`
  - `.env` 또는 `.env.local` 에서 역할을 dev 로 둡니다
- local-test (`DMS_INSTANCE_ENV=local-test`)
  - `pnpm run dms:local-test:start`
  - `.codex/scripts/dms-local-test-start.sh`
  - Playwright bootstrap (`automation/scripts/playwright/start-dms-e2e-stack.sh`)
  - remote-empty isolated profile 이어야 하며 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 비워 둡니다

수동 workspace 동기화 명령과의 경계:

- 서버 부팅 자동 싱크: `DMS_INSTANCE_ENV` + 역할별 remote 기준으로 runtime markdown root 를 문서 repo 에 연결
- `pnpm run codex:workspace-sync-from-gitlab`: monorepo workspace 최신화
- `pnpm run codex:workspace-publish`: 현재 checkout 을 GitHub + GitLab workspace 에 publish

---

## 6. 빠른 검증 체크리스트

```bash
# 역할/remote 변수가 compose 에 반영되는지 shape 만 확인한다.
docker compose config | grep -E 'DMS_INSTANCE_ENV|DMS_GIT_(PROD_REMOTE_URL|DEV_REMOTE_URL|BOOTSTRAP_BRANCH|BOOTSTRAP_REMOTE_URL)'

# local/dev/ops env shape 확인
grep -E 'DMS_INSTANCE_ENV|DMS_GIT_(PROD_REMOTE_URL|DEV_REMOTE_URL|BOOTSTRAP_BRANCH|BOOTSTRAP_REMOTE_URL)' .env

# server/dms 재기동
docker compose up -d --build server dms

# 서버 로그에서 역할 확인
docker compose logs --tail 200 server | grep -E 'DMS Git role contract|Git 초기화 완료|Git 초기화 실패'

# DMS runtime API 검증
pnpm run verify:access-dms:raw
```

성공 기준:

- `compose.yaml` 과 `.env` 에서 `DMS_INSTANCE_ENV` 가 의도한 역할로 고정됨
- `prod` 는 `LSWIKI_DOC.git`, `dev` 는 `LSWIKI_DOC_DEV.git`, `local-test` 는 remote-empty 를 가리킴
- wrong-remote existing repo 인 경우 자동 rewrite 가 아니라 blocking reason 이 노출됨
- local-test 는 운영/개발 remote 를 건드리지 않음

---

## 7. 이번 묶음과 out of scope

이번 묶음은 역할별 문서 repo binding 계약, 운영 변수, local-test 격리 규칙을 정리하는 것입니다. out of scope 는 다음과 같습니다.

- 실제 운영 `.env` 파일에 값을 쓰는 작업
- GitLab token/credential/secret 값을 확인하거나 문서화하는 작업
- SSH key 발급/배포 자체를 자동화하는 작업
- 운영 문서 repo 를 개발/테스트 runtime 에 직접 복제해 넣는 작업

---

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-06-04 | 역할 매핑 검증 문장을 명시해 docs verify 의 prod/dev canonical remote 점검 기준을 보강 |
| 2026-06-01 | `DMS_INSTANCE_ENV` 기준 prod/dev/local-test 문서 repo 분리 계약, wrong-remote blocking, local-test 격리 규칙을 반영 |
| 2026-05-08 | 사이드바 변경사항 표시를 실패/차단 publish 복구 전용 UI로 조정 |
| 2026-05-08 | 앱 내부 문서/템플릿 변경 자동 publish 기준과 사이드바 변경사항 화면의 진단 역할을 추가 |
| 2026-05-07 | DMS GitLab 문서 자동 싱크 운영 변수, 부팅 분기, 검증 절차를 정리 |
