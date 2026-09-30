# DMS / SSOO Docker 배포 가이드

> 최종 업데이트: 2026-08-27

DMS를 **모노레포 통합 런타임 기준**으로 Docker 컨테이너에 배포하는 가이드입니다.  
지원 경로는 repo root `compose.yaml`을 역할 없는 공용 base로 두고, 로컬은 `compose.local.yaml`, 격리 브라우저 테스트는 `compose.local.yaml + compose.local-test.yaml`, 공개 배포는 `compose.production.yaml`을 반드시 함께 사용하는 방식입니다. 기본 배포 단위는 `postgres + server + admin + crm + pms + dms + sns` 전체 스택입니다.

> `compose.yaml` 의 Compose project name 기본값은 `ssoo`입니다. 체크아웃 폴더명이 달라도 로컬 Docker 리소스 이름이 일관되며, CI는 `COMPOSE_PROJECT_NAME`과 `POSTGRES_DATA_VOLUME`을 함께 지정해 기존 운영 volume을 보존합니다.

---

## 전제 조건

- Docker Engine 24+
- Docker Compose v2.24.4+ (`!reset`/`!override` overlay tags 필요)
- Git (소스 클론용)

---

## 아키텍처

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ssoo-admin     │ │  ssoo-crm       │ │  ssoo-pms       │
│  Port: 3000     │ │  Port: 3001     │ │  Port: 3002     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                      ┌───────────────┐
                      │  ssoo-server  │
                      │  Port: 4000   │
                      └──────┬────────┘
                             │
┌─────────────────┐ ┌────────┴────────┐ ┌───────────────────────┐
│  ssoo-dms       │ │  ssoo-sns       │ │  ssoo-postgres        │
│  Port: 3003     │ │  Port: 3004     │ │  Port: 5432           │
│  same-origin    │ │  standalone UI  │ │  (pgvector/pg17)      │
│  proxy / UI     │ │                 │ │                       │
└─────────────────┘ └─────────────────┘ └───────────────────────┘
```

### 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `postgres` | `pgvector/pgvector:pg17` | 5432 | PostgreSQL + pgvector 확장 |
| `server` | `apps/server/Dockerfile` | 4000 | NestJS API + 공통 auth + DMS server module |
| `admin` | `apps/web/admin/Dockerfile` | 3000 | Admin Next.js 앱 |
| `crm` | `apps/web/crm/Dockerfile` | 3001 | CRM Next.js 앱 |
| `pms` | `apps/web/pms/Dockerfile` | 3002 | PMS Next.js 앱 |
| `dms` | `apps/web/dms/Dockerfile` | 3003 | DMS Next.js 앱 |
| `sns` | `apps/web/sns/Dockerfile` | 3004 | SNS Next.js 앱 |

> **참고**: `pgvector/pgvector:pg17`은 표준 PostgreSQL 17에 pgvector 확장이 포함된 이미지입니다.
> DMS의 AI 임베딩/시맨틱 검색 기능에 필요합니다.
> DMS의 server-backed path는 기본적으로 compose 내부 `server`(`http://server:4000/api`)를 사용합니다.

---

## 로컬 빠른 시작

### 1. 환경 변수 설정

```bash
# repo root 기준
cp .env.example .env
cp apps/web/dms/.env.example apps/web/dms/.env.local

# .env / .env.local에서 아래 값 수정:
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_DEPLOYMENT
# - AZURE_OPENAI_EMBEDDING_DEPLOYMENT (임베딩/시맨틱 검색 사용 시)
# - 인증: AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET 또는 AZURE_OPENAI_API_KEY
```

> AI 기능을 쓰지 않더라도 `.env.local` 파일은 같은 자리에서 유지하는 것을 권장합니다.  
> `pnpm docker:*`는 `compose.yaml + compose.local.yaml`을 사용합니다. `compose.local.yaml`은 root `.env`의 `DMS_INSTANCE_ENV` 값과 무관하게 역할을 literal `dev`, bootstrap remote를 빈 값으로 고정합니다. 이 로컬 경로만 root `.env`와 `apps/web/dms/.env.local`을 읽고, localhost용 `AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS=true`를 명시합니다. 공개 배포에 로컬 overlay나 로컬 env 파일을 재사용하지 않습니다.

### 2. 빌드 & 실행

```bash
# repo root 기준 - 전체 스택
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup

# 로그 확인
pnpm docker:logs
```

Playwright/Ralph, 실패주입, 문서 mutation 회귀에는 운영·개발 working tree와 분리된 Docker local-test profile을 사용합니다. 이 프로필은 자동검증 전용이며 사용자가 기존 문서로 확인하는 인수 테스트나 로컬 Docker 인계 대상으로 사용하지 않습니다.

```bash
pnpm run docker:local-test:up
pnpm run docker:local-test:ps
# 종료하되 named volume은 다음 회귀 비교를 위해 보존
pnpm run docker:local-test:down
```

이 경로는 `DMS_INSTANCE_ENV=local-test`, remote-empty, `ssoo_local_test` DB와 PostgreSQL·문서·ingest·storage용 `ssoo-dms-local-test-*` named volume 네 개를 강제합니다. DB와 문서 root를 한 쌍으로 격리하므로 빈 테스트 working tree가 dev DB의 활성 문서를 누락 처리하지 않습니다. `docker:local:config`와 `docker:local-test:config`는 실행 전에 프로필 정적 계약을 검증하므로 root `.env`가 `prod`여도 로컬 역할로 전파되지 않습니다.

### 로컬 프로필 선택과 사용자 인계 게이트

| 단계 | 프로필 | 데이터/Git 대상 | 사용 여부 |
|---|---|---|---|
| 자동 회귀·실패주입 | `local-test` | 전용 DB/volume, remote 없음 | Playwright/Ralph에서만 사용 |
| 사용자 인수 테스트 | `dev` | 기존 dev DB, dev working tree, `LSWIKI_DOC_DEV.git` | 실제 로컬 배포 후보 확인 |
| 공개 배포 | `prod` | 운영 DB/path, `LSWIKI_DOC.git` | production gate 이후 사용 |

`local-test` 검증이 끝난 뒤 사용자가 `http://localhost:3003`을 확인하기 전에는 반드시 아래 순서로 `dev`를 복구합니다.

```bash
pnpm docker:up
docker exec ssoo-server printenv DMS_INSTANCE_ENV
curl --fail http://localhost:4000/api/health/readiness
```

두 번째 명령은 반드시 `dev`를 출력해야 합니다. 이어서 DMS 로그인 후 기존 dev 파일 트리가 보이는지 확인하고, 인계 보고에는 active profile과 문서 대상 경로를 함께 적습니다. `NODE_ENV=production`은 최적화된 컨테이너 빌드 모드일 뿐 DMS의 `prod` 역할을 뜻하지 않습니다.

기존 문서 working tree의 `origin`이 선택한 역할과 다르면 그 자리에서 remote를 다시 쓰지 않습니다. 로컬 수정과 미추적 파일을 포함한 기존 tree를 보존하고, 역할에 맞는 저장소를 별도 경로에 clone한 뒤 root `.env`의 `DMS_MARKDOWN_HOST_PATH`로 명시합니다.

dev working tree의 origin이 HTTPS이고 무인 parity/publish 인증이 필요하면 credential을 remote URL이나 `.git/config`, Compose environment에 넣지 않습니다. 레포 로컬 `codex.gitlabUser`/`codex.gitlabToken` 또는 일회성 `GL_USER`/`GL_TOKEN`을 준비한 뒤 아래처럼 Docker secret을 생성합니다.

```bash
pnpm run dms:git-http-auth:prepare
```

root `.env`에는 secret 자체가 아니라 scope와 파일 경로만 둡니다.

```dotenv
DMS_GIT_HTTP_AUTH_SCOPE=http://gitlab.example.internal:8010
DMS_GIT_HTTP_CREDENTIALS_FILE=./.runtime/dms/git-http-credentials
```

생성 파일은 mode `0600`이고 `.runtime/` 아래에 있어 Git 추적 대상이 아닙니다. server entrypoint는 이 파일을 Docker secret으로 읽어 지정한 HTTP(S) origin에만 Git credential helper를 연결합니다. 파일이 없으면 기존 SSH 또는 무인증 remote 동작을 유지하고, 파일이 있는데 scope가 유효한 HTTP(S) origin이 아니면 fail-closed합니다.

readiness는 설정에서 활성화된 storage provider의 실제 runtime path를 필수로 검사합니다. dev에서 기본 `local`만 사용할 때는 NAS를 비활성화합니다. NAS 기능을 확인하려면 임시 로컬 폴더를 NAS로 위장하지 말고 실제 NAS/host mount를 `/mnt/nas/documents` 또는 `DMS_STORAGE_NAS_BASE_PATH` 대상에 먼저 연결한 뒤 provider를 활성화합니다.

조직 TLS 프록시가 dependency/Prisma binary endpoint를 중계하면 root `.env`의 `SSOO_TLS_CA_CERT_FILE`에 보안팀 승인 PEM root CA의 절대 경로를 설정합니다. 이 파일은 7개 이미지 build에 BuildKit secret으로만 노출되고, runtime secret은 outbound Node TLS가 필요한 server/db-init에만 mount되며 이미지 layer에는 포함되지 않습니다. 공개 CA 환경은 값을 비워 두며 `NODE_TLS_REJECT_UNAUTHORIZED=0` 같은 검증 우회는 금지합니다. 모든 deps stage는 전체 workspace manifest를 먼저 복사한 뒤 대상만 filtered install하고 pnpm v11 store와 lockfile-keyed verification metadata를 잠금형 BuildKit cache로 공유합니다. pnpm 11 pre-run 상태 검사와 최초 release-age/frozen lockfile/install-script allowlist 검증은 유지되고, 검증된 동일 lockfile의 반복 registry 조회만 줄어듭니다.

### 3. 확인

```bash
# Admin / CRM / PMS / DMS / SNS 접속
curl http://localhost:3000
curl http://localhost:3001
curl http://localhost:3002
curl http://localhost:3003
curl http://localhost:3004

# Server liveness / DB+DMS runtime readiness
curl http://localhost:4000/api/health
curl --fail http://localhost:4000/api/health/readiness

# PostgreSQL 연결 확인
docker compose -f compose.yaml -f compose.local.yaml exec postgres pg_isready -U ssoo -d ssoo_dev
```

## 공개 배포 경로

공개/클로즈 베타 배포는 로컬 Compose 경로와 분리합니다.

```bash
cp .env.production.example .env.production

# .env.production에서 placeholder를 모두 실제 secret/URL/path로 교체한 뒤
pnpm docker:production:verify-env
pnpm docker:production:config
pnpm docker:production:up
```

프로덕션 gate의 강제 조건:

- 네 개의 auth secret과 PostgreSQL password는 충분한 길이의 비-placeholder 값이어야 하고 auth secret끼리 서로 달라야 합니다.
- 공개 API/앱/CORS/WebSocket URL은 non-local HTTPS/WSS여야 하며 secure cookie를 사용합니다.
- PostgreSQL은 host port를 공개하지 않고, API와 웹 포트는 `127.0.0.1`에만 bind합니다. 외부 공개는 같은 호스트의 승인된 TLS reverse proxy가 담당합니다.
- DMS markdown/ingest/local storage host path는 미리 생성된 읽기·쓰기 가능한 서로 다른 절대 경로여야 합니다.
- backup archive root는 세 runtime root와 겹치거나 서로 포함하지 않는 별도 절대 경로여야 하고, archive name은 실행마다 고유해야 합니다.
- `SSOO_RELEASE_SHA`는 GitHub/GitLab에 게시할 lowercase 40자 commit SHA이며 server/DMS/Admin 이미지가 같은 값을 응답해야 합니다.
- AI/RAG 외부 provider를 런칭 예외로 둘 때도 `DMS_AI_RAG_LAUNCH_MODE=exempted_external_provider`를 명시해야 합니다. 빈 값이나 묵시적 skip은 실패합니다.
- `SSOO_TLS_CA_CERT_FILE`을 설정했다면 읽을 수 있는 유효 PEM 인증서의 절대 경로여야 하며, Compose secret mount로만 전달됩니다.
- `DMS_INSTANCE_ENV=prod`와 SSH 또는 credential 비포함 HTTPS Git remote를 사용합니다.
- `.env.production`은 gitignored이며 verifier는 secret 값을 출력하지 않습니다.

> 프로덕션 구성 검증 통과는 TLS/HSTS, secret manager, 방화벽/WAF, 이미지 스캔, PostgreSQL 및 DMS runtime path의 백업·복구 증거를 대신하지 않습니다. 이 증거가 없으면 public internet 공개는 No-Go입니다.

### 트래픽 전환 전 필수 운영 증거

아래 항목이 모두 증거로 남기 전에는 liveness가 정상이어도 공개 전환하지 않습니다.

1. `/api/health/readiness`가 DB와 DMS aggregate readiness를 포함해 `200`을 반환합니다. DMS가 blocked/degraded이면 Compose도 server를 healthy로 승격하지 않습니다.
2. admin 세션으로 `/api/dms/settings/readiness`를 조회해 settings persistence, Git remote parity, control-plane sync, markdown/ingest/local storage/template path가 `ready`인지 상세 확인합니다. 선택적으로 비활성인 NAS는 `not-required`일 수 있습니다.
3. DMS 설정의 수집 큐 화면에서 smoke job을 등록하고 승인해 문서가 생성되는지, 실패 작업의 재시도와 대기 작업 취소가 동작하는지 확인합니다.
4. Admin에서 사용자 비활성/재활성, 세션 강제 회수, 조직 hierarchy 안전장치, 역할 permission 저장, 감사 이벤트 기록을 확인합니다. 마지막 활성 admin 보호를 실제 계정에 파괴적으로 시험하지 말고 자동화 회귀 결과를 증거로 사용합니다.
5. Admin AI 운영에서 provider readiness, source registration, queue backlog, scheduler를 확인합니다. AI 기능을 런칭 범위에 넣는다면 실제 provider-ready smoke evidence가 필요합니다.
6. PostgreSQL과 세 runtime path의 백업을 만들고 격리된 위치에 복원해 파일 수/해시와 DB 검증을 통과한 restore evidence를 보관합니다.
7. `pnpm run codex:preflight`, `pnpm run codex:verify-sync`, `pnpm run codex:dms-guard`, 관련 build/test/access gate 및 격리 브라우저 smoke가 통과합니다.

기존 DB를 승격하거나 복원할 때는 `AUTH_CONFIG_ENCRYPTION_KEY`를 임의로 교체하지 않습니다. Admin에서 저장된 Microsoft client secret은 이 키로 AES-GCM 암호화되어 있으므로, 키 변경 전에 통제된 secret 재입력 또는 재암호화 절차가 필요합니다. JWT/refresh secret 변경은 기존 세션을 무효화하므로 별도 배포 공지와 검증을 거칩니다.

### 최종 Go-live 실행

배포된 API/DMS/Admin이 같은 release SHA를 응답하는지, 공개 TLS/HSTS/보안 헤더와 secure cookie가 유효한지 먼저 확인합니다.

```bash
pnpm run verify:dms-public-endpoints
pnpm run verify:workspace-release-state
pnpm run verify:dms-go-live
```

`verify:dms-go-live`는 모노레포 릴리즈 gate, Git 양 원격 정합성, production env와 공개 endpoint, backup→isolated restore, 실제 DMS/Admin 브라우저 흐름을 모두 실행합니다. 하나라도 실패하면 report는 No-Go입니다. 이 명령은 배포나 트래픽 전환을 자동 수행하지 않습니다.

각 실행은 자동 생성되거나 명시한 `DMS_GO_LIVE_RUN_ID`로 `output/dms-go-live/<release-sha>/<run-id>/` evidence bundle을 만들고 step 전후 checkpoint를 atomic 갱신합니다. PC 재부팅이나 프로세스 중단 뒤에는 같은 release SHA·HEAD·worktree fingerprint·gate plan hash인 경우에만 아래처럼 통과 step을 이어갑니다.

```bash
DMS_GO_LIVE_RUN_ID=<기존-run-id> pnpm run verify:dms-go-live -- --resume
```

identity가 다르거나 checkpoint가 손상됐으면 `--resume`은 No-Go이며 새 run ID로 처음부터 실행합니다. bundle의 `manifest.json`은 report, 로그, endpoint/restore evidence, Playwright JSON·trace·screenshot·video의 크기와 SHA-256을 기록합니다.

AI/RAG 외부 provider 예외는 최종 report에 `EXEMPTED_EXTERNAL_PROVIDER`로 기록할 수 있지만, readiness·복구·SHA·Admin/DMS 운영·브라우저 실패에는 적용되지 않습니다. 프로덕션 실행 계약은 [프로덕션 Go-live Ralph 계획](../planning/2026-08-13-production-go-live-ralph-plan.md), 기능·운영 수용 명세는 [DMS·Admin 운영 완결성 Launch Ralph 계획](../planning/2026-08-14-operational-launch-ralph-plan.md)을 함께 따릅니다.

---

## Dockerfile 구조

`apps/web/dms/Dockerfile` — 3단계 멀티스테이지 빌드:

| Stage | 베이스 | 역할 |
|-------|--------|------|
| `deps` | `node:22` | pnpm 11.13.1로 `pnpm install --filter web-dms...` workspace 의존성 설치 |
| `builder` | `node:22` | `@ssoo/types` + `@ssoo/web-auth` + `web-dms` 빌드 후 standalone 산출물 생성 |
| `runner` | `node:22` | 최소 런타임 + 기본 JSON config 2종 포함 |

**주요 특성**:
- `output: 'standalone'` — monorepo root tracing 기준으로 standalone 산출 생성
- 비root 유저 실행 (`nextjs:nodejs`, UID 1001)
- runtime data 는 image 내부 `apps/web/dms/data/` 가 아니라 external runtime path mount 를 통해 server 컨테이너에 주입

---

## 볼륨 & 영속 데이터

Compose는 DMS 운영 데이터를 **빌드 이미지 밖의 external runtime paths** 로 분리합니다. 로컬 overlay는 repo의 `.runtime` 기본값을 허용하지만, 프로덕션 overlay는 아래 세 host path를 절대 경로로 강제합니다.

| 호스트 변수 | 컨테이너 변수 | 기본 컨테이너 경로 | 용도 |
|------------|---------------|-------------------|------|
| `DMS_MARKDOWN_HOST_PATH` | `DMS_MARKDOWN_ROOT` | `/var/lib/ssoo/documents` | markdown working tree (Git-managed). 템플릿은 이 경로의 `_templates/` 하위에 배치됩니다 |
| `DMS_INGEST_HOST_PATH` | `DMS_INGEST_QUEUE_PATH` | `/var/lib/ssoo/document-ingest` | ingest queue (`jobs.json`) |
| `DMS_STORAGE_LOCAL_HOST_PATH` | `DMS_STORAGE_LOCAL_BASE_PATH` | `/var/lib/ssoo/document-storage/local` | local binary storage |

핵심 원칙:

- `server` 컨테이너가 markdown / storage / ingest runtime mount 를 소유한다. 템플릿은 markdown root 의 `_templates/` 하위에 포함되므로 별도 mount 가 불필요하다.
- `dms` web 컨테이너는 same-origin proxy/UI 이므로 runtime data mount 를 직접 소유하지 않는다.
- GitLab binding 은 `DMS_MARKDOWN_ROOT` 에만 적용한다. 템플릿은 문서 Git 레포의 `_templates/` 하위에 배치되며 GitLab과 자동 동기화된다.
- attachment / reference / image 는 `DMS_STORAGE_LOCAL_BASE_PATH` 또는 다른 provider root 를 사용하며 Git 비대상이다.

### 백업·격리 복구 gate

수동 `tar` 성공은 런칭 증거가 아닙니다. production operations profile이 PostgreSQL custom dump와 세 runtime root를 하나의 mode `0600` archive로 만들고, 별도 임시 DB와 격리 디렉터리에 복원한 뒤 파일 manifest·SHA-256·Git working tree·ingest queue·DB schema contract를 검증합니다.

`.env.production`에 다음 정책을 설정합니다.

```dotenv
DMS_BACKUP_ARCHIVE_ROOT=/srv/ssoo-backups/dms
DMS_BACKUP_ARCHIVE_NAME=dms-launch-20260813T120000KST.tar.gz
DMS_BACKUP_RETENTION_DAYS=30
```

`DMS_BACKUP_ARCHIVE_NAME`은 매 실행마다 새 이름을 사용합니다. 보존 기한에 따른 삭제는 승인된 외부 retention job이 소유하며 verifier가 운영 archive를 자동 삭제하지 않습니다.

```bash
pnpm run verify:dms-backup-restore:production
```

성공 evidence JSON에는 archive/dump hash, runtime root별 file/byte/manifest hash, source snapshot 안정성, ingest queue 상태와 임시 restore DB의 canonical runtime contract 결과가 기록됩니다. 비밀값과 DB password는 evidence에 기록되지 않습니다. 손상된 `jobs.json`은 서버와 verifier가 fail closed하므로 원본을 보존하고 마지막 검증 archive에서 복원합니다.

---

## 데이터베이스 초기화

- `apps/server`의 DMS 검색 모듈이 필요 시 `dms_document_embeddings` 테이블과 vector 인덱스를 준비합니다.
- `apps/web/dms`는 더 이상 pgvector 임베딩 테이블을 직접 초기화하지 않으며, 로컬 DB 연결은 채팅 세션 같은 app-local persistence에만 사용합니다.
- full-stack compose 기본값에서는 `server`도 함께 올라오므로, DMS 검색/질문/요약 경로가 별도 host bridge 없이 동작합니다.

---

## 환경 변수

### compose base/overlay에서 설정

| 변수 | 값 | 설명 |
|------|-----|------|
| `DATABASE_URL` | `DOCKER_DATABASE_URL` 값으로 주입 | compose 내부 server/DMS 런타임 공용 PostgreSQL 연결 |
| `DMS_DATABASE_URL` | `DOCKER_DMS_DATABASE_URL` 값으로 주입 | DMS-local persistence 호환 키 |
| `DMS_SERVER_API_URL` | `http://server:4000/api` | compose 내부 server 검색/질문/요약 슬라이스 브리지 |
| `DMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | DMS 브라우저 번들용 API 주소. build argument로 주입 |
| `DMS_NEXT_PUBLIC_WS_URL` | 빈 값 | 선택적 DMS 브라우저 Socket.IO origin. 비우면 absolute `DMS_NEXT_PUBLIC_API_URL`의 origin에서 파생 |
| `PMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | PMS 브라우저 번들용 API 주소 |
| `PMS_SERVER_API_URL` | `http://server:4000/api` | PMS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |
| `SNS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | SNS 브라우저 번들용 API 주소 |
| `SNS_SERVER_API_URL` | `http://server:4000/api` | SNS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |
| `DMS_MARKDOWN_ROOT` | `/var/lib/ssoo/documents` | server 컨테이너 내 external markdown working tree. 템플릿은 이 경로의 `_templates/` 하위에 자동 포함 |
| `DMS_INGEST_QUEUE_PATH` | `/var/lib/ssoo/document-ingest` | server 컨테이너 내 ingest queue root |
| `DMS_STORAGE_LOCAL_BASE_PATH` | `/var/lib/ssoo/document-storage/local` | server 컨테이너 내 local binary storage root |
| `DMS_STORAGE_NAS_BASE_PATH` | `/mnt/nas/documents` | NAS provider base path override |
| `DMS_GIT_HTTP_AUTH_SCOPE` | 빈 값 | HTTPS Git credential을 허용할 단일 HTTP(S) origin. credential secret 사용 시 필수 |
| `DMS_GIT_HTTP_CREDENTIALS_FILE` | 빈 값 | `dms:git-http-auth:prepare`가 만드는 mode `0600` Docker secret 경로 |
| `DMS_GIT_PUBLISH_IGNORED_PATH_PREFIXES` | `launch-smoke/,codex-lock-ui/,codex-lock-probe/,verify-access/` | 쉼표로 구분한 local-only 검증 문서 디렉터리 prefix. 일반 운영/개발 런타임에서는 이 prefix 의 문서를 파일 트리/검색/편집 잠금 알림 사용자 표면에서 숨기고 DMS Git publish/실패 알림 대상에서도 제외. `local-test` 하네스에서는 브라우저 스모크 검증을 위해 사용자 표면 숨김을 적용하지 않음 |

### AI 기능 사용 시 추가 필요

| 변수 | 필수 | 설명 |
|------|------|------|
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI 엔드포인트 |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | 채팅 모델 배포명 |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | ◐ | 임베딩 모델 배포명. 임베딩/시맨틱 검색에는 필요하지만 챗봇 단독 호출에는 필수 아님 |
| `OPENAI_API_VERSION` | ✅ | Azure OpenAI API version |
| `AZURE_USE_MANAGED_IDENTITY` | ⭕ | Managed Identity 사용 여부 (`true`/`false`) |
| `AZURE_OPENAI_API_KEY` | ⭕ | API 키 (Entra ID 미사용 시) |
| `AZURE_TENANT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_SECRET` | ⭕ | Entra ID 인증 시 |
| `AZURE_MANAGED_IDENTITY_CLIENT_ID` | ⭕ | user-assigned managed identity 사용 시 |

로컬 `compose.yaml + compose.local.yaml`은 root `.env`를 shared baseline으로 사용하고, `apps/web/dms/.env.local`을 DMS-local override로 함께 읽습니다. `apps/web/dms/.env.local`에 있는 DMS/Azure 겹치는 키는 `web-dms`와 `server` 컨테이너에 동시에 반영됩니다. 프로덕션 `compose.yaml + compose.production.yaml`은 두 env_file 주입을 모두 reset하고 `.env.production` interpolation으로 명시된 값만 전달합니다.

예시:
```yaml
server:
  environment:
    DMS_MARKDOWN_ROOT: /var/lib/ssoo/documents
    DMS_STORAGE_LOCAL_BASE_PATH: /var/lib/ssoo/document-storage/local
  volumes:
    - /srv/documents:/var/lib/ssoo/documents
    - /srv/document-storage/local:/var/lib/ssoo/document-storage/local
```

---

## 지원 범위

- 지원 compose base는 repo root `compose.yaml` 하나이며, 실행 환경에 따라 `compose.local.yaml` 또는 `compose.production.yaml` 중 하나를 반드시 병합합니다.
- 레거시 root / app-local `docker-compose.yml` 경로는 제거했습니다.
- Docker DMS는 workspace 빌드(`pnpm`, `@ssoo/types`, `@ssoo/web-auth`)를 전제로 합니다.
- 기본 compose는 DMS 단독이 아니라 **모노레포 full-stack**을 띄웁니다.

### GitLab pipeline 배포 계약

- `development` push는 `verify -> ai_review -> build`를 자동 실행하고, `deploy_dev`는 `when: manual` + `allow_failure: false`로 유지합니다. 자동 단계가 끝난 pipeline은 배포 전까지 blocked/manual 상태이며, deploy가 성공해야 success, deploy가 실패하면 failed가 됩니다. 이 상태 계약은 배포를 자동 실행하지 않으면서도 실패한 수동 배포를 green pipeline으로 숨기지 않습니다.
- shell runner의 persistent checkout은 각 job 시작 시 remote ref를 fetch한 뒤 exact `CI_COMMIT_SHA`로 reset하며, HEAD 불일치나 non-ignored 잔여 파일이 있으면 build/deploy 전에 실패합니다. 운영자가 checkout 옆에 보존하는 `.env.*`/`compose.yaml.bak*` 백업은 Git과 Docker build context에서 제외되며, 이 명시 패턴 밖의 임의 파일은 허용하지 않습니다.
- `verify`는 shell runner host의 전역 Node/pnpm에 의존하지 않습니다. exact commit source, `pnpm install --frozen-lockfile` 의존성, generated Prisma client를 담은 저장소 정본 Node 22/pnpm 11.13.1 CI image에서 GitLab pipeline contract, Codex preflight, root lint, server test를 실제로 실행하고 Git metadata만 read-only mount합니다.
- build image는 `app-<service>:<CI_COMMIT_SHA>` 태그로 보존합니다. 수동 deploy는 선택한 pipeline SHA의 image를 `latest`로 복원한 뒤 기존 Compose stack을 `--no-build`로 올립니다.
- deploy 직전에는 먼저 7개 commit image와 모든 기존 container의 rollback source를 전수 분류합니다. 실행 container의 image object가 남아 있으면 그 exact ID를 backup tag로 보존하고, container는 있지만 image object가 사라졌으면 먼저 `docker commit` application-container snapshot을 시도합니다. Docker content store 손상으로 commit도 실패하면 실행 container의 merged filesystem을 `docker export`하고 기존 CMD/ENTRYPOINT/WORKDIR/USER/ENV/EXPOSE/STOPSIGNAL을 `docker import --change`로 재적용한 평탄화 image를 만든 뒤 핵심 실행 metadata와 image ID를 검증합니다. 첫 배포처럼 기존 container가 없을 때만 현재 `latest`를 fallback으로 보존합니다. snapshot/export image는 application image 복구용이며 PostgreSQL, volume, bind-mounted DMS 문서/첨부 데이터의 백업을 대신하지 않습니다.
- 모든 서비스 backup이 성공한 뒤에만 completed manifest와 last-backup marker를 기록합니다. 일부 tag만 만들어진 실패 시도는 유효한 rollback set으로 취급하지 않으며, commit image나 rollback source가 하나라도 준비되지 않으면 image 선택과 Compose 변경 전에 실패합니다.
- build/deploy trace에는 commit image ID와 배포된 `ssoo-<service>` container image ID가 남고, 하나라도 다르면 deploy job이 실패합니다.
- 기본 60초 후 PostgreSQL과 전체 web/server container가 모두 `healthy`가 아니면 deploy job이 실패합니다. commit image 선택 이후 Compose recreation, health, image parity 중 하나라도 실패하면 completed manifest의 backup image를 `latest`로 복원하고 이전 application image set을 같은 Compose topology에서 `--no-build`로 다시 올린 뒤 rollback health와 container/backup-image parity를 검증합니다. Compose topology 또는 DB migration을 바꾸는 배포는 이 image rollback만으로 안전하다고 간주하지 않으며 별도 migration/config rollback 계획이 필요합니다.
- verify/build 직전에는 실행 중 container, volume을 삭제하지 않고 unused BuildKit cache와 dangling image만 정리합니다. 실패한 이전 build가 `latest`를 바꿨지만 해당 image가 운영 container에 배포되지 않은 경우에는 그 7개 application `latest` tag만 정확히 식별해 제거하며, 실행 container image는 보존합니다. 이어서 누적 image 보관 정책을 적용합니다. 서비스별 `app-<service>:<SHA>` commit tag는 생성 시각 기준 최근 distinct build 3개(`CI_IMAGE_RETENTION_COMMIT_KEEP`), `app-<service>:ci-backup-*` tag는 최근 2개(`CI_IMAGE_RETENTION_BACKUP_KEEP`)만 남기고, 중단된 verify가 남긴 `app-ci-verify:<SHA>`를 제거합니다. 모든 container(정지 포함)가 참조하는 image, 현재 `latest`, 현재 pipeline SHA tag, last-backup marker가 가리키는 manifest의 backup image는 보관 개수와 무관하게 보존하고, 이 세 패턴 밖의 tag와 `app-*` 외 image는 건드리지 않으며 삭제는 강제(`-f`) 없이 수행합니다. 보관 범위 밖 SHA tag의 과거 pipeline은 manual deploy 시 backup/Compose 변경 전에 실패하므로 다시 build해야 합니다. `CI_IMAGE_RETENTION_DRY_RUN=1`로 pipeline을 실행하면 삭제 없이 전체 image 목록과 keep/remove 판정만 trace에 남깁니다. 먼저 지정된 cache 보존량을 유지하며 정리하고 Docker root의 여유 공간이 기본 8 GiB 미만이면 unused BuildKit cache를 전량 정리한 뒤 재측정하며, 그래도 부족하면 실제 build 전에 실패합니다. Compose의 다중 타깃 build는 병렬도 1에서도 BuildKit 내부 타깃을 동시에 처리하며 단일 서비스 요청도 `depends_on` image를 함께 예약할 수 있으므로 직접 실행하지 않습니다. Compose가 계산한 context, Dockerfile, build args, tag를 Bake 정의로 출력한 뒤 큰 `server`, `db-init`을 먼저 만들고 `pms`, `dms`, `sns`, `admin`, `crm` target을 Buildx로 하나씩 완전히 순차 빌드합니다. target 사이에는 unused BuildKit cache를 전량 정리하고 기본 3 GiB 여유 공간을 재검사합니다. 초기/target 임계값과 1차 cache 보존량은 각각 `CI_BUILD_MIN_FREE_KB`, `CI_BUILD_TARGET_MIN_FREE_KB`, `CI_BUILD_CACHE_KEEP_STORAGE`로 조정할 수 있습니다.
- 자동 rollback이 성공해도 원래 deploy job은 failed로 유지해 배포 실패 사실을 보존합니다. rollback도 실패하면 trace에 manifest 경로와 manual recovery 필요 상태를 남기고 failed로 종료하며, 운영자가 확인하기 전 추가 배포를 실행하지 않습니다.
- persistent worktree와 shared Docker tag를 사용하는 job은 shell runner host의 `/tmp/ssoo-app-runtime.lock` `flock`으로 직렬화됩니다. 더 최신 pipeline이 `latest`를 갱신한 뒤 과거 pipeline의 manual deploy를 실행해도 선택한 commit tag가 배포 기준입니다.

---

## 트러블슈팅

### 컨테이너 시작 실패
```bash
# 로그 확인
docker compose -f compose.yaml -f compose.local.yaml logs dms

# PostgreSQL 상태 확인
docker compose -f compose.yaml -f compose.local.yaml ps postgres
```

### Docker Desktop에 `lswiki`/`sooo` 같은 이전 compose project가 함께 남아 보일 때
- `compose.yaml` 은 `ssoo` project 이름을 기준으로 스택 식별자를 고정합니다.
- 과거에 다른 project 이름으로 띄운 컨테이너와 `ssoo-*` 고정 `container_name` 이 충돌하면, 아래 한 번의 정리 후 전체 스택을 다시 올리세요.

```bash
docker rm -f ssoo-postgres ssoo-db-init ssoo-server ssoo-pms ssoo-sns ssoo-dms ssoo-admin ssoo-crm 2>/dev/null || true
pnpm docker:up
```

### WSL bind mount가 `ubuntu.sock` 또는 `WSL_E_USER_VHD_ALREADY_ATTACHED`로 실패할 때

먼저 Docker Desktop **Settings → Resources → WSL Integration**에서 실제 작업 배포판(기본값 `Ubuntu`) 통합이 활성화돼 있는지 확인합니다. `accessing specified distro mount service ... ubuntu.sock`는 이 통합 agent가 없을 때 발생합니다.

Desktop 재시작 뒤에도 backend 로그가 `WSL_E_USER_VHD_ALREADY_ATTACHED`에서 멈춘 경우에만, Windows PowerShell에서 Docker Desktop을 중지한 상태로 Docker 전용 data VHD 연결을 분리한 뒤 다시 시작합니다. VHD 파일을 삭제하거나 `docker-desktop`을 unregister하지 않습니다.

```powershell
docker desktop stop
wsl --terminate docker-desktop
wsl --unmount "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
docker desktop start
docker desktop status
```

이 절차는 volume을 삭제하지 않지만, 엔진이 완전히 중지된 상태에서만 실행합니다. 로그에 위 오류가 없으면 적용하지 않고 일반 Desktop 진단을 우선합니다.

### AI 기능 오류
- `DATABASE_URL` 또는 `DMS_DATABASE_URL` 환경변수 확인
- PostgreSQL 컨테이너 healthy 상태 확인
- Azure OpenAI 키/엔드포인트 유효성 확인

### 서버 검색 오류
- `docker compose ps server` 로 server 상태 확인
- `docker compose logs server` 로 API 부팅/DB 연결 상태 확인
- 필요 시 `DMS_SERVER_API_URL` 을 다른 내부/외부 Nest API 주소로 override

### 데이터 경로 문제
- 실제 runtime data owner는 `server` 컨테이너입니다. 먼저 `docker compose exec server printenv DMS_MARKDOWN_ROOT DMS_INGEST_QUEUE_PATH DMS_STORAGE_LOCAL_BASE_PATH` 로 effective path 를 확인하세요. 템플릿은 `$DMS_MARKDOWN_ROOT/_templates/` 에 자동 포함됩니다.
- 로컬 compose는 host `.runtime/documents`, `.runtime/document-ingest`, `.runtime/document-storage/*`를 server 컨테이너 `/var/lib/ssoo/*` document runtime 경로로 bind mount 합니다. 프로덕션은 `.env.production`의 세 절대 host path만 허용합니다. 필요 시 해당 profile의 Compose 파일을 명시해 `exec server`로 mounted contents를 확인하세요.
- `dms` web 컨테이너는 UI/same-origin proxy 이므로 `/app/apps/web/dms/data` 를 운영 데이터 경로로 진단하지 않습니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-08-27 | Compose project/port 가변화와 exact-SHA CI·rollback·disk recovery를 현행 SSOO 포트·Node 22/pnpm 11.13.1 정본에 맞춰 통합 |
| 2026-08-19 | `local-test`를 자동 회귀 전용, `dev`를 실제 로컬 사용자 인수 테스트 정본으로 확정하고 dev 별도 working tree, mode `0600` HTTPS Git secret, 활성 storage readiness, Docker Desktop WSL integration/stale VHD 조건부 복구 절차를 추가 |
| 2026-08-12 | liveness/DB readiness 분리, DMS aggregate readiness, ingest smoke, Admin 운영 제어, AI readiness, 백업 복원 증거를 공개 전환 필수 gate로 추가 |
| 2026-07-16 | 로컬/프로덕션 Compose overlay를 분리하고 production env secret/HTTPS/cookie/DB/DMS path/Git remote fail-closed gate, loopback port binding, 전체 교차 앱 URL build contract를 추가 |
| 2026-07-16 | DMS 브라우저 WebSocket origin을 explicit URL → public API origin → browser host `:4000` 순서로 해석하고 Docker build argument를 추가 |
| 2026-08-06 | verify/build 전 unused build cache·dangling image와 undeployed application `latest`를 정리하고 초기 8 GiB/target 간 3 GiB free-space gate를 적용하며, Compose-resolved Bake target 7개를 Buildx로 하나씩 빌드해 runner ENOSPC를 사전 복구/차단 |
| 2026-08-06 | missing running-image를 application-container snapshot으로 보존하고 content-store 손상 시 metadata-preserving filesystem export/import로 재구성하는 rollback preflight/completed manifest, post-mutation automatic rollback, manual+non-optional deploy 상태 계약을 추가 |
| 2026-07-15 | 현재 GitLab 버전과 호환되는 host `flock`, exact `CI_COMMIT_SHA` source alignment, 실제 자동 verify, commit-tagged image와 deployed container ID parity 계약을 추가 |
| 2026-06-19 | local compose 에서 `apps/web/dms/.env.local` 의 DMS/Azure 값을 `web-dms`와 `server`가 함께 읽도록 정리해 로컬 요약 경로가 UI 설정과 어긋나지 않게 수정 |
| 2026-06-19 | `compose.yaml` 의 Compose project name 을 `ssoo` 로 고정하고, Docker Desktop 에 남아 있는 이전 project 충돌을 위한 1회 정리 절차를 추가 |
| 2026-04-22 | 데이터 경로 트러블슈팅을 server-owned external runtime mount(`DMS_MARKDOWN_ROOT`, `DMS_TEMPLATE_ROOT`, `DMS_INGEST_QUEUE_PATH`, `DMS_STORAGE_LOCAL_BASE_PATH`) 기준으로 정리 |
| 2026-04-08 | full-stack compose 기준으로 `postgres + server + pms + sns + dms` 기본 배포, DMS internal server bridge, PMS/SNS browser API URL 기준으로 정리 |
| 2026-04-07 | root compose 단일 지원 경로, workspace Dockerfile, monorepo root tracing 기준 standalone runtime, `DMS_SERVER_API_URL` 브리지 기준으로 정규화 |
| 2026-03-17 | 초기 버전 — DMS Docker 독립 배포 가이드 |
