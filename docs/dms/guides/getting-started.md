# DMS 개발 환경 설정 가이드

> 최종 업데이트: 2026-04-08

---

## 1. 사전 요구사항

| 도구 | 버전 |
|------|------|
| Node.js | 18+ (권장 20+) |
| pnpm | 9+ |
| Git | 최신 |

---

## 2. 설치 및 실행

### 모노레포 기준

```bash
cd /path/to/ssoo
pnpm install
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup
```

접속:

- PMS: `http://localhost:3000`
- DMS: `http://localhost:3001`
- SNS: `http://localhost:3002`
- Server health: `http://localhost:4000/api/health`

직접 DMS 개발 서버가 필요하면 대안으로 `pnpm dev:web-dms`를 사용할 수 있습니다.

---

## 3. 환경 변수

Docker compose 기준 server 컨테이너는 root `.env` 의 Azure 값을 `compose.yaml` `server.environment` 로 전달받습니다. `apps/web/dms/.env.local` 은 web-dms 로컬 override 용도입니다.

`apps/web/dms/.env.local` 예시:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=<chat-deployment>
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-deployment>
OPENAI_API_VERSION=2024-10-21

# Entra ID (옵션: Managed Identity 또는 SP)
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_USE_MANAGED_IDENTITY=true
AZURE_MANAGED_IDENTITY_CLIENT_ID=

# 폴백 키 (옵션)
AZURE_OPENAI_API_KEY=

# 서버 검색 브리지 (옵션: 기본값은 http://localhost:4000/api)
DMS_SERVER_API_URL=http://localhost:4000/api

# 공용 DB URL (권장)
DATABASE_URL=postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public

# 호환용 별도 키 (선택)
DMS_DATABASE_URL=
```

주의:

- `apps/web/dms/.env.example`는 템플릿만 유지하고, 실제 값은 반드시 `apps/web/dms/.env.local`에 넣습니다.
- 루트 `compose.yaml`도 `apps/web/dms/.env.local`을 선택적으로 읽으므로, Docker 경로를 쓸 때도 같은 파일을 기준으로 맞춥니다.
- 동일 키를 중복 선언하면 아래쪽 값이 우선되어 잘못된 Azure 설정으로 요청이 나갈 수 있습니다.
- `DMS_SERVER_API_URL`을 비워두면 로컬 direct dev 기준 `http://localhost:4000/api`가 사용되고, root compose에서는 기본적으로 내부 `server` 서비스 URL이 주입됩니다.
- DMS 앱에 남아 있는 로컬 DB persistence는 `DATABASE_URL`을 우선 사용하고, `DMS_DATABASE_URL`은 호환용 fallback입니다.

---

## 4. 문서 저장소 / 런타임 설정

| 표면 | 파일/변수 | 역할 |
|------|-----------|------|
| markdown working tree | `git.repositoryPath`, `DMS_MARKDOWN_ROOT` | Git-managed markdown runtime root |
| local binary storage | `storage.local.basePath`, `DMS_STORAGE_LOCAL_BASE_PATH` | attachment/reference/image local storage root |
| ingest queue | `ingest.queuePath`, `DMS_INGEST_QUEUE_PATH` | ingest queue runtime path |
| template runtime | `markdownRoot/_templates/` | 템플릿은 문서 Git 레포의 `_templates/` 하위에 배치되며 GitLab과 자동 동기화됩니다 (별도 `DMS_TEMPLATE_ROOT` 불필요) |
| 시스템 설정 | `dm_config_m` 테이블 (DB, `scopeCode='system'`) | Git / storage / ingest / template / search / DocAssist 기본값. 시드: `20_dms_config_foundation.sql` |
| 시스템 오버라이드 | DMS Settings UI (`/settings`) 또는 직접 DB 수정 | settings 화면에서 저장되는 실제 시스템 설정 |
| 개인 설정 | `dm_config_m` 테이블 (DB, `scopeCode='personal'`) | identity / workspace / viewer / sidebar 기본값 |
| 개인 오버라이드 | DMS Settings UI (`/settings`) | settings 화면에서 저장되는 개인 설정 |

운영 원칙:

- GitLab binding 은 markdown working tree 에만 적용합니다.
- attachment / reference / image 는 Git 비대상 external storage root 로 관리합니다.
- Docker 배포에서는 위 경로들을 `compose.yaml` bind mount + env override 로 image 밖에 둡니다.
- settings 화면(`/settings`)은 persisted config 와 runtime snapshot 을 함께 보여 줄 수 있으며, env override 가 실제 runtime path 를 덮어쓸 수 있습니다.
- markdown working tree root 는 settings 에서 관측만 제공하고, 실제 변경은 deploy/runtime config 로 관리합니다.
- Git binding 은 `DMS_INSTANCE_ENV` 역할 계약으로 runtime 에서 결정되며, settings 는 read-only observability 만 제공합니다.
- 문서 Git bootstrap/sync 는 앱 빌드 시점이 아니라 server runtime initialize/reconcile 시점에 수행됩니다.

운영 저장소 정책 정본:

- `docs/dms/planning/storage-and-second-brain-architecture.md`

### Direct-run local-test profile (document repo isolation)

로컬에서 DMS Git/save/publish 테스트를 할 때는 `LSWIKI/.runtime/dms/documents` 를 markdown working tree로 쓰지 않습니다. 대신 문서 Git working tree만 repo 밖으로 분리하고, ingest/storage는 기존 `.runtime` 경로를 유지합니다.

- supported direct-run entrypoint: `pnpm run dms:local-test:start`
- tracked launcher: `.codex/scripts/dms-local-test-start.sh`
- untracked local override: `.env.local-test`
- local markdown repo example: `~/dev/LSWIKI_DOC_LOCAL`
- local templates also live under `DMS_MARKDOWN_ROOT/_templates`

권장 `.env.local-test` 예시:

```bash
DMS_INSTANCE_ENV=local-test
DMS_MARKDOWN_ROOT=$HOME/dev/LSWIKI_DOC_LOCAL
DMS_INGEST_QUEUE_PATH=/absolute/path/to/LSWIKI/.runtime/dms/ingest
DMS_STORAGE_LOCAL_BASE_PATH=/absolute/path/to/LSWIKI/.runtime/dms/storage/local
DMS_GIT_BOOTSTRAP_REMOTE_URL=
DMS_GIT_BOOTSTRAP_BRANCH=master
```

직접 실행 원칙:

- `DMS_INSTANCE_ENV=local-test` 를 명시해야 하며, `NODE_ENV` 로 대체하지 않습니다.
- `DMS_MARKDOWN_ROOT` 는 반드시 `LSWIKI` repo 밖 경로를 가리켜야 합니다.
- `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 기본 local-test profile에서는 비워 둡니다.
- 기본 local-test profile에서는 remote가 없어도 현재 local repo를 canonical source로 간주합니다.
- 테스트 문서와 템플릿은 로컬에서 생성합니다.
- 운영 문서/운영 템플릿이 꼭 필요할 때만 명시 승인 후 예외 반입합니다.

### Ordinary local-dev profile (development document repo)

일반 로컬 실행(`pnpm dev:server`, `pnpm dev`, local compose)은 운영 문서 repo가 아니라 개발 문서 repo를 사용해야 합니다.

```bash
DMS_INSTANCE_ENV=dev
DMS_GIT_DEV_REMOTE_URL=git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git
DMS_GIT_BOOTSTRAP_BRANCH=master
```

- ordinary local run 기본값은 `DMS_INSTANCE_ENV=dev` 입니다.
- 배포 서버/운영 compose 는 `DMS_INSTANCE_ENV=prod` 로 명시하거나 compose default(prod)를 그대로 사용합니다.
- `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 local-dev 기본 스위치가 아니라 cleanup/override 용으로만 사용합니다.

---

## 5. 주요 명령어

```bash
# 전체 Docker 스택 빌드 + 실행
pnpm docker:up

# Docker 서비스 상태 / 로그
pnpm docker:ps
pnpm docker:logs

# DMS 빌드
pnpm run build:web-dms

# Playwright browser install (1회)
pnpm run playwright:install

# DMS Playwright smoke
pnpm run test:e2e:dms

# Direct-run local-test server (emitted server + local-test profile)
pnpm run dms:local-test:start

# 모노레포 preflight
cd /path/to/ssoo
pnpm run codex:preflight

# DMS 가드
pnpm run codex:dms-guard

# GitLab workspace 최신 동기화
pnpm run codex:workspace-sync-from-gitlab

# 표준 publish (현재 브랜치 기준 GitHub + GitLab workspace 동시 반영)
pnpm run codex:workspace-publish
```

> 일반 `git push origin ...` 은 `codex.gitlabLastPublished` marker가 현재 HEAD와 다르면 pre-push guard에서 차단됩니다.  
> 운영 push 절차는 `docs/dms/explanation/architecture/git-subtree-integration.md`의 workspace publish 흐름을 기준으로 따르세요.

> `pnpm run test:e2e:dms` 는 Docker 없이 `.runtime/playwright/` 아래 로컬 PostgreSQL cluster를 띄우고, fresh schema/seed를 적용한 뒤 DMS direct-run server + `web-dms` production server를 함께 올려 **로그인 smoke** 를 실행합니다. pgvector가 필요한 AI/search E2E는 별도 DB profile 또는 Docker 스택이 필요합니다.

관련 문서:

- [GitLab issue operator mode](./gitlab-issue-operator-mode.md)
- [DMS automation surface index](../../../automation/README.md)

---

## 6. 문제 해결

### 포트 충돌 (3001)

```bash
lsof -ti:3001 | xargs kill -9
```

### 빌드 캐시 이슈

```bash
rm -rf apps/web/dms/.next
pnpm run build:web-dms
```

### Azure 호출 실패

- `.env.local` 값 확인
- Entra 토큰 경로 실패 시 API Key 폴백 설정 확인

---

## 7. 다음 문서

- API 가이드: `docs/dms/guides/api.md`
- 서비스 개요: `docs/dms/explanation/domain/service-overview.md`
- 저장소/수집/딥리서치 정책: `docs/dms/planning/storage-and-second-brain-architecture.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-22 | external runtime paths(`DMS_MARKDOWN_ROOT`, `DMS_TEMPLATE_ROOT`, `DMS_INGEST_QUEUE_PATH`, `DMS_STORAGE_LOCAL_BASE_PATH`)와 markdown-only Git binding 원칙을 반영 |
| 2026-04-07 | `DMS_SERVER_API_URL`/runtime JSON 표면과 root compose 연계를 빠른 참조에 추가 |
| 2026-04-07 | GitLab workspace sync/publish 명령과 pre-push guard marker 기준을 빠른 참조에 추가 |
| 2026-04-07 | DMS workspace 통합에 맞춰 pnpm 실행 기준과 `data/documents` 경로로 갱신 |
| 2026-02-24 | LanceDB/Gemini 중심 구 설명 제거, Azure/현행 저장소 정책 기준으로 재작성 |
