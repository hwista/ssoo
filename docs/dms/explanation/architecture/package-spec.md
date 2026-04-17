# DMS 패키지 명세서

> 📅 기준일: 2026-04-07  
> 📦 패키지명: `web-dms` v0.1.0

> 이 문서는 `apps/web/dms/package.json` 의 현재 설치 의존성과 활성 런타임을 설명합니다.

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | web-dms |
| **경로** | `apps/web/dms/` |
| **용도** | 문서 관리 시스템 (Document Management System) |
| **포트** | 3001 |
| **원본 저장소** | GitLab `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git` |

---

## 2. 코어 프레임워크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | ^15.1.0 | React 프레임워크 (App Router) |
| `react` | 19.2.0 | UI 라이브러리 |
| `react-dom` | 19.2.0 | React DOM 렌더링 |
| `typescript` | ^5 | 타입 시스템 |

---

## 3. UI 컴포넌트

### 3.1 디자인 시스템

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `tailwindcss` | ^3.4.0 | 유틸리티 CSS |
| `tailwind-merge` | ^2.6.0 | 클래스 병합 유틸리티 |
| `tailwindcss-animate` | ^1.0.7 | 애니메이션 유틸리티 |
| `class-variance-authority` | ^0.7.1 | 컴포넌트 변형 관리 |
| `clsx` | ^2.1.1 | 조건부 클래스 결합 |

### 3.2 Radix UI (Primitives)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@radix-ui/react-dialog` | ^1.1.15 | Dialog |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Dropdown menu |
| `@radix-ui/react-tooltip` | ^1.2.8 | Tooltip |
| `@radix-ui/react-context-menu` | ^2.2.16 | Context menu |
| `@radix-ui/react-progress` | ^1.1.8 | Progress |
| `@radix-ui/react-slot` | ^1.2.4 | Slot |

### 3.3 아이콘

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `lucide-react` | ^0.548.0 | 아이콘 라이브러리 |

---

## 4. 상태/폼/검증/알림

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zustand` | ^5.0.10 | 상태 관리 |
| `@tanstack/react-query` | ^5.x | 원격 데이터 query/mutation 캐시 |
| `sonner` | ^1.7.4 | 토스트 알림 |

---

## 5. 리치 텍스트 에디터

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `codemirror` | ^6.0.2 | 현재 block editor 런타임 |
| `@codemirror/lang-markdown` | ^6.5.0 | 마크다운 언어 지원 |
| `lowlight` | ^3.3.0 | 코드 구문 강조 |
| `tippy.js` | ^6.3.7 | 툴팁/슬래시 메뉴 표시 |

## 6. 마크다운 처리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `marked` | ^17.0.1 | 마크다운 파서 |
| `react-markdown` | ^10.1.0 | 마크다운 렌더링 |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown |

---

## 7. AI / Vector 검색 (RAG)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `ai` | ^6.x | Vercel AI SDK (LLM 추상화, 스트리밍) |
| `@ai-sdk/azure` | ^3.x | Azure OpenAI 프로바이더 |
| `pg` | ^8.x | PostgreSQL 클라이언트 (pgvector 연결) |

---

## 8. 파일 처리 & 서버

현재 별도 업로드/메일러/파일 watcher 패키지는 설치되어 있지 않습니다.

---

## 9. 내부 패키지 & 런타임 구성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@ssoo/types` | `workspace:*` | DMS ↔ server 검색 계약 / 파일 메타데이터 공유 타입 |

### 런타임 설정 표면

- 환경 변수: `apps/web/dms/.env.local` (Azure/OpenAI + 선택 `DATABASE_URL` / `DMS_SERVER_API_URL`)
- 시스템 기본값 / 오버라이드: `dms.config.default.json` → `dms.config.json`
- 개인 기본값 / 오버라이드: `dms.personal.config.default.json` → `dms.personal.config.json`
- Docker 경로: repo root `compose.yaml` 이 `apps/web/dms/.env.local` 을 선택적으로 읽고, `DOCKER_DATABASE_URL` / `DOCKER_DMS_DATABASE_URL` / `DMS_SERVER_API_URL` 기준으로 컨테이너 runtime 값을 주입

### 프론트엔드 데이터 계층

- Provider: `src/app/providers.tsx` 의 `QueryClientProvider`
- API surface: `src/lib/api/endpoints/*`
- Query hooks: `src/hooks/queries/*`
- 액션/스트리밍 성격이 강한 문서 편집 흐름은 endpoint 호출을 유지하고, 목록/조회/세션 동기화 성격의 데이터는 query layer를 우선 사용

---

## 10. 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `eslint` | ^9 | 코드 린팅 |
| `eslint-config-next` | ^15.1.0 | Next.js ESLint 설정 |
| `autoprefixer` | ^10.4.21 | CSS 벤더 프리픽스 |
| `postcss` | ^8.5.6 | CSS 후처리 |
| `@tailwindcss/typography` | ^0.5.19 | 타이포그래피 플러그인 |

---

## 11. 스크립트

```json
{
  "dev": "next dev --port 3001",
  "build": "next build",
  "start": "next start"
}
```

> ✅ Next.js 15.x로 다운그레이드 후 `--webpack` 플래그 불필요

---

## 12. 알려진 이슈

### 12.1 Tailwind 설정 파일 형식

DMS는 workspace 앱이지만 app-local Next/Tailwind 구성을 유지하기 위해 `tailwind.config.js`(CJS)를 사용한다.  
`tailwind.config.ts` 전환은 DMS 빌드/런타임 경로를 다시 정리할 때 함께 진행한다.

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| PKG-01 | 남은 설치 의존성(`@ai-sdk/react`, `marked` 등)의 실사용 여부 재검증 | P2 | 🔄 진행중 |

---

## Changelog

| 날짜 | 내용 |
|------|------|
| 2026-04-07 | DMS 프론트엔드의 react-query provider / endpoints / hooks 구조 반영 |
| 2026-04-07 | `@ssoo/types` 연동과 env/JSON/compose 런타임 표면을 현재 workspace 기준으로 정정 |
| 2026-03-12 | 미사용 설치 의존성(MUI/Tiptap/RHF/Zod/formidable/multer/chokidar/nodemailer/turndown 등) 제거 반영 |
| 2026-03-12 | 미사용 의존성 제거 이후 현재 설치 패키지 기준으로 정정 |
| 2026-01-27 | 초기 작성 - GitLab subtree 기준 |
| 2026-01-27 | PMS 호환성을 위해 다운그레이드: Next.js 16→15, tailwind-merge 3→2 |
| 2026-01-28 | Fluent UI 목록 제거, Radix/상태 패키지 추가, 알려진 이슈 정리 |
| 2026-01-28 | Tailwind 설정 파일 형식(JS 유지) 근거 추가 |
