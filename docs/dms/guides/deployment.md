# DMS Docker 배포 가이드

> 최종 업데이트: 2026-03-17

DMS를 Docker 컨테이너로 배포하기 위한 가이드입니다.

---

## 전제 조건

- Docker Engine 24+
- Docker Compose v2+
- Git (소스 클론용)

---

## 아키텍처

```
┌─────────────────┐     ┌───────────────────────┐
│  ssoo-dms       │────▶│  ssoo-postgres        │
│  (Next.js 15)   │     │  (pgvector/pg17)      │
│  Port: 3001     │     │  Port: 5432           │
│                 │     │                       │
│  /app/data/ ◀── Volume: dms-data              │
└─────────────────┘     └───────────────────────┘
```

### 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `postgres` | `pgvector/pgvector:pg17` | 5432 | PostgreSQL + pgvector 확장 |
| `dms` | `apps/web/dms/Dockerfile` | 3001 | DMS 웹 애플리케이션 |

> **참고**: `pgvector/pgvector:pg17`은 표준 PostgreSQL 17에 pgvector 확장이 포함된 이미지입니다.
> DMS의 AI 임베딩/시맨틱 검색 기능에 필요합니다.

---

## 빠른 시작

### 1. 환경 변수 설정

```bash
# DMS AI 기능 사용 시 필요 (apps/web/dms/.env.example 참조)
cp apps/web/dms/.env.example apps/web/dms/.env.local
# .env.local에서 아래 값 수정:
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_DEPLOYMENT
# - AZURE_OPENAI_EMBEDDING_DEPLOYMENT
# - 인증: AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET 또는 AZURE_OPENAI_API_KEY
```

> AI 기능 없이도 DMS 코어 기능(위키 편집/조회)은 정상 동작합니다.
> `DMS_DATABASE_URL`은 `compose.yaml`에서 자동 주입됩니다.

### 2. 빌드 & 실행

```bash
# 전체 스택 (PostgreSQL + DMS)
docker compose up --build -d

# DMS만 재빌드
docker compose up --build dms -d

# 로그 확인
docker compose logs -f dms
```

### 3. 확인

```bash
# DMS 접속
curl http://localhost:3001

# PostgreSQL 연결 확인
docker compose exec postgres pg_isready -U ssoo -d ssoo_dev
```

---

## Dockerfile 구조

`apps/web/dms/Dockerfile` — 3단계 멀티스테이지 빌드:

| Stage | 베이스 | 역할 |
|-------|--------|------|
| `deps` | `node:20-alpine` | `npm ci`로 의존성 설치 |
| `builder` | `node:20-alpine` | Next.js standalone 빌드 |
| `runner` | `node:20-alpine` | 최소 런타임 (standalone 서버만) |

**주요 특성**:
- `output: 'standalone'` — node_modules 없이 실행 가능, 이미지 크기 대폭 감소
- 비root 유저 실행 (`nextjs:nodejs`, UID 1001)
- `data/` 디렉토리 볼륨 마운트 포인트 사전 생성

---

## 볼륨 & 영속 데이터

`dms-data` 볼륨이 `/app/data/`에 마운트되며, 아래 하위 디렉토리를 포함합니다:

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

DMS 서버 시작 시 `instrumentation.ts`가 자동으로:
1. pgvector 확장 활성화 (`CREATE EXTENSION IF NOT EXISTS vector`)
2. `dms_document_embeddings` 테이블 생성
3. IVFFlat 벡터 검색 인덱스 생성 (데이터 충분 시)

별도의 마이그레이션 스크립트 실행이 필요 없습니다.

---

## 환경 변수

### compose.yaml에서 자동 설정

| 변수 | 값 | 설명 |
|------|-----|------|
| `DMS_DATABASE_URL` | `postgresql://ssoo:...@postgres:5432/ssoo_dev` | PostgreSQL 연결 |

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

compose.yaml에서 추가:
```yaml
dms:
  environment:
    - DMS_DATABASE_URL=postgresql://...
    - AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
    - AZURE_OPENAI_DEPLOYMENT=your-chat-deployment
    - AZURE_OPENAI_EMBEDDING_DEPLOYMENT=your-embedding-deployment
    - AZURE_OPENAI_API_KEY=your-api-key
```

---

## 향후 통합 배포

현재는 DMS 독립 배포(npm 기반)이며, 추후 PMS + NestJS 서버 통합 시:

- `compose.yaml`에 `server`, `web-pms` 서비스 추가
- DMS Dockerfile은 모노레포 빌드 패턴(`pnpm deploy --filter`)으로 재작성
- `outputFileTracingRoot`는 모노레포 root로 복원
- PostgreSQL은 `pgvector/pgvector:pg17` 그대로 유지 (Prisma 스키마 + pgvector 공존)

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
- `DMS_DATABASE_URL` 환경변수 확인
- PostgreSQL 컨테이너 healthy 상태 확인
- Azure OpenAI 키/엔드포인트 유효성 확인

### 데이터 경로 문제
DMS는 `process.cwd()/data/` 기준으로 파일을 읽습니다.
Docker 컨테이너 내 WORKDIR은 `/app`이므로 `/app/data/`가 됩니다.
볼륨 마운트가 정상인지 확인하세요.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-17 | 초기 버전 — DMS Docker 독립 배포 가이드 |
