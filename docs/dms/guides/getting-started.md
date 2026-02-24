# DMS 개발 환경 설정 가이드

> 최종 업데이트: 2026-02-24

---

## 1. 사전 요구사항

| 도구 | 버전 |
|------|------|
| Node.js | 18+ (권장 20+) |
| npm | 9+ |
| Git | 최신 |

---

## 2. 설치 및 실행

### 모노레포 기준

```bash
cd /home/hwista/src/ssoo
pnpm install
cd apps/web/dms
npm run dev
```

접속: `http://localhost:3001`

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
```

---

## 4. 문서 저장소 설정

기본 개발 경로:

- 위키 자산: `apps/web/dms/data/wiki/`
- 설정: `apps/web/dms/dms.config.json`

설정 화면(`/settings`)에서 Git 저장소 경로를 변경할 수 있습니다.

운영 저장소 정책 정본:

- `docs/dms/planning/storage-and-second-brain-architecture.md`

---

## 5. 주요 명령어

```bash
# DMS 빌드
npm run build

# 모노레포 preflight
cd /home/hwista/src/ssoo
pnpm run codex:preflight

# DMS 가드
pnpm run codex:dms-guard
```

---

## 6. 문제 해결

### 포트 충돌 (3001)

```bash
lsof -ti:3001 | xargs kill -9
```

### 빌드 캐시 이슈

```bash
cd apps/web/dms
rm -rf .next
npm run build
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
| 2026-02-24 | LanceDB/Gemini 중심 구 설명 제거, Azure/현행 저장소 정책 기준으로 재작성 |
