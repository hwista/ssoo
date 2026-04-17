# DMS / SSOO Docker 배포 가이드

> 최종 업데이트: 2026-04-08

DMS를 **모노레포 통합 런타임 기준**으로 Docker 컨테이너에 배포하는 가이드입니다.  
지원 경로는 **repo root `compose.yaml`** 하나로 정리하며, 기본 배포 단위는 `postgres + server + pms + cms + dms` 전체 스택입니다.

---

## 전제 조건

- Docker Engine 24+
- Docker Compose v2+
- Git (소스 클론용)

---

## 아키텍처

```
┌─────────────────┐    ┌─────────────────┐
│  ssoo-pms       │    │  ssoo-cms       │
│  Port: 3000     │    │  Port: 3002     │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
             ┌───────────────┐
             │  ssoo-server  │
             │  Port: 4000   │
             └──────┬────────┘
                    │
┌─────────────────┐ │  ┌───────────────────────┐
│  ssoo-dms       │─┘  │  ssoo-postgres        │
│  Port: 3001     │────▶  (pgvector/pg17)      │
│  /app/apps/web/ │    │  Port: 5432           │
│  dms/data/      │◀───│  Volume: dms-data     │
└─────────────────┘    └───────────────────────┘
```

### 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `postgres` | `pgvector/pgvector:pg17` | 5432 | PostgreSQL + pgvector 확장 |
| `server` | `apps/server/Dockerfile` | 4000 | NestJS API + 공통 auth + DMS server module |
| `pms` | `apps/web/pms/Dockerfile` | 3000 | PMS Next.js 앱 |
| `dms` | `apps/web/dms/Dockerfile` | 3001 | DMS Next.js 앱 |
| `cms` | `apps/web/cms/Dockerfile` | 3002 | CMS Next.js 앱 |

> **참고**: `pgvector/pgvector:pg17`은 표준 PostgreSQL 17에 pgvector 확장이 포함된 이미지입니다.
> DMS의 AI 임베딩/시맨틱 검색 기능에 필요합니다.
> DMS의 server-backed path는 기본적으로 compose 내부 `server`(`http://server:4000/api`)를 사용합니다.

---

## 빠른 시작

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
# - AZURE_OPENAI_EMBEDDING_DEPLOYMENT
# - 인증: AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET 또는 AZURE_OPENAI_API_KEY
```

> AI 기능을 쓰지 않더라도 `.env.local` 파일은 같은 자리에서 유지하는 것을 권장합니다.  
> `compose.yaml`은 DMS `.env.local`을 **선택적으로** 읽고, 공통 DB/API 연결 값은 compose 기본값으로 주입합니다.

### 2. 빌드 & 실행

```bash
# repo root 기준 - 전체 스택
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup

# 로그 확인
pnpm docker:logs
```

### 3. 확인

```bash
# PMS / DMS / CMS 접속
curl http://localhost:3000
curl http://localhost:3001
curl http://localhost:3002

# Server health
curl http://localhost:4000/api/health

# PostgreSQL 연결 확인
docker compose exec postgres pg_isready -U ssoo -d ssoo_dev
```

---

## Dockerfile 구조

`apps/web/dms/Dockerfile` — 3단계 멀티스테이지 빌드:

| Stage | 베이스 | 역할 |
|-------|--------|------|
| `deps` | `node:20` | `pnpm install --filter web-dms...` 로 workspace 의존성 설치 |
| `builder` | `node:20` | `@ssoo/types` + `@ssoo/web-auth` + `web-dms` 빌드 후 standalone 산출물 생성 |
| `runner` | `node:20` | 최소 런타임 + 기본 JSON config 2종 포함 |

**주요 특성**:
- `output: 'standalone'` — monorepo root tracing 기준으로 standalone 산출 생성
- 비root 유저 실행 (`nextjs:nodejs`, UID 1001)
- `apps/web/dms/data/` 디렉토리 볼륨 마운트 포인트 사전 생성

---

## 볼륨 & 영속 데이터

`dms-data` 볼륨이 `/app/apps/web/dms/data/`에 마운트되며, 아래 하위 디렉토리를 포함합니다:

| 경로 | 용도 | 데이터 유실 시 영향 |
|------|------|-------------------|
| `data/wiki/` | 위키 문서 (마크다운 + 사이드카 메타데이터) | 🔴 전체 문서 유실 |
| `data/templates/` | 글로벌/개인 템플릿 | 🟡 템플릿 초기화 |
| `data/ingest/` | 수집 작업 큐 (jobs.json) | 🟡 대기 중 작업 유실 |
| `data/storage/local/` | 로컬 스토리지 파일 | 🟠 저장된 파일 유실 |

### 백업 권장

```bash
# 볼륨 백업
docker run --rm -v dms-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/dms-data-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 데이터베이스 초기화

- `apps/server`의 DMS 검색 모듈이 필요 시 `dms_document_embeddings` 테이블과 vector 인덱스를 준비합니다.
- `apps/web/dms`는 더 이상 pgvector 임베딩 테이블을 직접 초기화하지 않으며, 로컬 DB 연결은 채팅 세션 같은 app-local persistence에만 사용합니다.
- full-stack compose 기본값에서는 `server`도 함께 올라오므로, DMS 검색/질문/요약 경로가 별도 host bridge 없이 동작합니다.

---

## 환경 변수

### compose.yaml에서 자동 설정

| 변수 | 값 | 설명 |
|------|-----|------|
| `DATABASE_URL` | `DOCKER_DATABASE_URL` 값으로 주입 | compose 내부 server/DMS 런타임 공용 PostgreSQL 연결 |
| `DMS_DATABASE_URL` | `DOCKER_DMS_DATABASE_URL` 값으로 주입 | DMS-local persistence 호환 키 |
| `DMS_SERVER_API_URL` | `http://server:4000/api` | compose 내부 server 검색/질문/요약 슬라이스 브리지 |
| `PMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | PMS 브라우저 번들용 API 주소 |
| `PMS_SERVER_API_URL` | `http://server:4000/api` | PMS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |
| `CMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | CMS 브라우저 번들용 API 주소 |
| `CMS_SERVER_API_URL` | `http://server:4000/api` | CMS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |

### AI 기능 사용 시 추가 필요

| 변수 | 필수 | 설명 |
|------|------|------|
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI 엔드포인트 |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | 채팅 모델 배포명 |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | ✅ | 임베딩 모델 배포명 |
| `AZURE_OPENAI_API_KEY` | ⭕ | API 키 (Entra ID 미사용 시) |
| `AZURE_TENANT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_SECRET` | ⭕ | Entra ID 인증 시 |

루트 `compose.yaml` 은 `apps/web/dms/.env.local` 을 **선택적으로** 읽습니다.  
Azure 관련 값은 해당 파일에 넣고, Docker 내부 DB 주소 override가 필요하면 root `.env`의 `DOCKER_DATABASE_URL` / `DOCKER_DMS_DATABASE_URL` 을 수정하세요.

예시:
```yaml
dms:
  environment:
    DMS_SERVER_API_URL: http://server:4000/api
```

---

## 지원 범위

- 지원 compose 파일은 repo root `compose.yaml` 하나입니다.
- 레거시 root / app-local `docker-compose.yml` 경로는 제거했습니다.
- Docker DMS는 workspace 빌드(`pnpm`, `@ssoo/types`, `@ssoo/web-auth`)를 전제로 합니다.
- 기본 compose는 DMS 단독이 아니라 **모노레포 full-stack**을 띄웁니다.

---

## 트러블슈팅

### 컨테이너 시작 실패
```bash
# 로그 확인
docker compose logs dms

# PostgreSQL 상태 확인
docker compose ps postgres
```

### AI 기능 오류
- `DATABASE_URL` 또는 `DMS_DATABASE_URL` 환경변수 확인
- PostgreSQL 컨테이너 healthy 상태 확인
- Azure OpenAI 키/엔드포인트 유효성 확인

### 서버 검색 오류
- `docker compose ps server` 로 server 상태 확인
- `docker compose logs server` 로 API 부팅/DB 연결 상태 확인
- 필요 시 `DMS_SERVER_API_URL` 을 다른 내부/외부 Nest API 주소로 override

### 데이터 경로 문제
DMS는 `process.cwd()/data/` 기준으로 파일을 읽습니다.
Docker 컨테이너 내 WORKDIR은 `/app/apps/web/dms`이므로 실제 데이터 경로는 `/app/apps/web/dms/data/`가 됩니다.
볼륨 마운트가 정상인지 확인하세요.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-08 | full-stack compose 기준으로 `postgres + server + pms + cms + dms` 기본 배포, DMS internal server bridge, PMS/CMS browser API URL 기준으로 정리 |
| 2026-04-07 | root compose 단일 지원 경로, workspace Dockerfile, monorepo root tracing 기준 standalone runtime, `DMS_SERVER_API_URL` 브리지 기준으로 정규화 |
| 2026-03-17 | 초기 버전 — DMS Docker 독립 배포 가이드 |
