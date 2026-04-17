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
- CMS: `http://localhost:3002`
- Server health: `http://localhost:4000/api/health`

직접 DMS 개발 서버가 필요하면 대안으로 `pnpm dev:web-dms`를 사용할 수 있습니다.

---

## 3. 환경 변수

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

| 표면 | 파일 | 역할 |
|------|------|------|
| 문서 자산 | `apps/web/dms/data/documents/` | 기본 Git 문서 루트 |
| 시스템 기본값 | `apps/web/dms/dms.config.default.json` | Git / storage / ingest / search / DocAssist 기본값 |
| 시스템 오버라이드 | `apps/web/dms/dms.config.json` | settings 화면에서 저장되는 실제 시스템 설정 |
| 개인 기본값 | `apps/web/dms/dms.personal.config.default.json` | identity / workspace / viewer / sidebar 기본값 |
| 개인 오버라이드 | `apps/web/dms/dms.personal.config.json` | settings 화면에서 저장되는 개인 설정 |

설정 화면(`/settings`)에서 Git 저장소 경로와 런타임 JSON 오버라이드를 변경할 수 있습니다.

운영 저장소 정책 정본:

- `docs/dms/planning/storage-and-second-brain-architecture.md`

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
| 2026-04-07 | `DMS_SERVER_API_URL`/runtime JSON 표면과 root compose 연계를 빠른 참조에 추가 |
| 2026-04-07 | GitLab workspace sync/publish 명령과 pre-push guard marker 기준을 빠른 참조에 추가 |
| 2026-04-07 | DMS workspace 통합에 맞춰 pnpm 실행 기준과 `data/documents` 경로로 갱신 |
| 2026-02-24 | LanceDB/Gemini 중심 구 설명 제거, Azure/현행 저장소 정책 기준으로 재작성 |
