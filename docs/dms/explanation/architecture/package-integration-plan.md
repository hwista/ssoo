# DMS 통합 리팩터링 계획서

> 📅 기준일: 2026-01-29  
> � 최종 업데이트: 2026-02-02  
> 📌 목적: PMS 기준 DMS 프로젝트 구조 정렬 및 패키지 통합  
> 📂 완료 내역: `package-integration-completed.md` 참조  
> 📊 비교 분석: `pms-dms-comparison-analysis.md` 참조  
> ✅ 상태: **Phase 0~7 완료**

---

## 🔴 핵심 원칙

> **DMS는 모노레포를 몰라야 한다**

| 원칙 | 설명 |
|------|------|
| **독립 실행** | DMS는 GitLab에서 단독으로 clone하여 실행 가능해야 함 |
| **패키지 매니저** | DMS는 **npm** 사용 (모노레포는 pnpm이지만 DMS는 독립) |
| **모노레포 패키지 금지** | `@ssoo/types`, `@ssoo/database` 등 workspace 패키지 사용 금지 |
| **자체 완결** | 타입, API, 유틸리티 모두 DMS 내부에서 정의 |
| **외부 통신** | 필요시 HTTP API로만 통신 (현재 해당 없음) |

---

## 📊 현재 진행 상황

| Phase | 작업 | 상태 | 완료일 |
|-------|------|------|--------|
| **0~2** | 기반 구조, 상태관리, UI 통합 | ✅ 완료 | 2026-01-28 |
| **3** | PMS 패턴 동기화 | ✅ 완료 | 2026-01-29 |
| **4** | API 레이어 정리 | ✅ 완료 | 2026-01-29 |
| **5** | 라우트 정리 + Middleware | ✅ 완료 | 2026-01-29 |
| **검증** | PMS-DMS 비교 분석 | ✅ 완료 | 2026-01-29 |
| **6** | 레거시 코드 정리 | ✅ 완료 | 2026-01-29 |
| **7** | 문서 뷰어 템플릿 재설계 | ✅ 완료 | 2026-02-02 |
| **8** | 디자인 통일 (MUI 검토) | ⬜ 대기 | - |

> 📄 **상세 문서**
> - [완료 내역](./package-integration-completed.md)
> - [비교 분석](./pms-dms-comparison-analysis.md)
> - [초기화 흐름](./app-initialization-flow.md)

> 📎 **장기 통합 분석**: PMS-DMS 패키지 공용화 분석은 [package-unification-analysis.md](./package-unification-analysis.md) 참조

---

## ✅ 완료된 Phase (상세: [completed](./package-integration-completed.md))

| Phase | 요약 |
|-------|------|
| **3** | pageComponents 패턴, WikiHomePage/ViewerPage/AISearchPage 생성 |
| **4** | apiClient 확장 (userApi, searchApi, uploadApi, aiApi), fetch 통합 |
| **5** | `/` 루트 진입점, `/doc/` 문서 경로, Middleware 추가 |

---

## Phase 6: 레거시 코드 정리 ✅ 완료 (2026-01-29)

> 종합 검증에서 발견된 레거시 코드 전면 삭제  
> 📊 **총 33개 파일 삭제, 빌드 검증 완료**

---

### 6.0 컴포넌트 사용 현황 분석

#### 🟢 활성 컴포넌트 (새 레이아웃에 연결됨)

**진입 경로**: `app/(main)/layout.tsx` → `AppLayout` → `ContentArea` → 페이지 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| AppLayout | `layout/` | 메인 레이아웃 |
| Sidebar | `layout/sidebar/` | 새 사이드바 |
| Header | `layout/` | 헤더 |
| TabBar | `layout/` | 탭바 |
| ContentArea | `layout/` | 콘텐츠 영역 |
| FileTree | `layout/sidebar/` | 파일 트리 |
| Search | `layout/sidebar/` | 검색 |
| Bookmarks | `layout/sidebar/` | 책갈피 |
| OpenTabs | `layout/sidebar/` | 열린 탭 |
| HomeDashboardPage | `pages/home/` | 홈 대시보드 |
| MarkdownViewerPage | `pages/markdown/` | 문서 뷰어 |
| DocPageTemplate | `templates/` | 문서 템플릿 |
| WikiEditor | 루트 | 에디터 |
| BlockEditor | `editor/` | 블록 에디터 |
| EditorToolbar | `editor/` | 에디터 툴바 |

#### 🔴 미사용 컴포넌트 (레거시)

| 컴포넌트 | 위치 | 연결 상태 | 조치 |
|----------|------|----------|------|
| **WikiApp** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **WikiSidebar** | 루트 | WikiApp에서만 | 삭제 |
| **WikiModals** | 루트 | WikiApp에서만 | 삭제 |
| **GeminiChat** | 루트 | WikiApp에서만 | 삭제 or 통합 |
| **AIChat** | 루트 | WikiApp에서만 | 삭제 (AISearchPage가 대체) |
| **SearchPanel** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **TextSearch** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **TreeComponent** | 루트 | WikiSidebar, CreateFileModal에서만 | 삭제 |
| **CreateFileModal** | 루트 | WikiSidebar에서만 (레거시) | 재구현 or 삭제 |
| **FileUpload** | 루트 | WikiSidebar에서만 (레거시) | 이동 후 재연결 |
| **MessageModal** | 루트 | WikiModals, CreateFileModal에서만 | 삭제 (sonner 대체) |
| **ThemeToggle** | 루트 | ❌ 아무도 import 안함 | Header 통합 or 삭제 |
| **ImageModal** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **LinkModal** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **MarkdownToolbar** | 루트 | ❌ 아무도 import 안함 | 삭제 |
| **ContextMenu** | `wiki/` | ❌ 아무도 import 안함 | 삭제 |

#### 🟡 기능 대체 현황

| 구 기능 | 구 컴포넌트 | 신규 대체 | 상태 |
|---------|------------|----------|------|
| 사이드바 | WikiSidebar (481줄) | Sidebar + FileTree | ✅ 대체됨 |
| 파일 트리 | TreeComponent (473줄) | FileTree (222줄) | ✅ 단순화됨 |
| AI 검색 (RAG) | AIChat (211줄) | AISearchPage (205줄) | ✅ 대체됨 |
| 벡터 검색 | SearchPanel (207줄) | AISearchPage | ✅ 통합됨 |
| 메시지 모달 | MessageModal | sonner toast | ✅ 대체됨 |
| Gemini 채팅 | GeminiChat (93줄) | 🔴 없음 | ⚠️ 미구현 |
| 파일 생성 | CreateFileModal (376줄) | WikiHomePage "새 문서" | ⚠️ TODO만 |
| 컨텍스트 메뉴 | ContextMenu | 🔴 없음 | ⚠️ 미구현 |
| 테마 전환 | ThemeToggle | 🔴 없음 | ⚠️ 미구현 |
| 파일 업로드 | FileUpload | 🔴 없음 | ⚠️ 미구현 |

---

### 6.1 Hooks 사용 현황

> ✅ **Phase 7 완료**: 레거시 Hooks 정리 완료, 현재 2개 Hooks 유지

| Hook | 파일 | 사용처 | 상태 |
|------|------|--------|------|
| useEditor | `useEditor.ts` | WikiEditor | ✅ 활성 |
| useOpenTabWithConfirm | `useOpenTabWithConfirm.ts` | 탭 열기 확인 | ✅ 활성 |

---

### 6.2 Stores 사용 현황

> ✅ **Phase 7 완료**: 레거시 Stores 정리 완료, 현재 6개 Stores 유지

| Store | 파일 | 사용처 | 상태 |
|-------|------|--------|------|
| useConfirmStore | `confirm.store.ts` | 확인 모달 | ✅ 활성 |
| useEditorStore | `editor.store.ts` | WikiEditor, WikiViewerPage | ✅ 활성 |
| useFileStore | `file.store.ts` | 파일/폴더 트리 | ✅ 활성 |
| useLayoutStore | `layout.store.ts` | AppLayout, Sidebar | ✅ 활성 |
| useSidebarStore | `sidebar.store.ts` | Sidebar | ✅ 활성 |
| useTabStore | `tab.store.ts` | 다수 | ✅ 활성 |

---

### 6.3 Lib/Utils 사용 현황

| 파일 | 사용 여부 | 조치 |
|------|----------|------|
| apiClient.ts | ✅ 활성 | 유지 |
| toast.ts | ✅ 활성 | 유지 |
| errorUtils.ts | ✅ 활성 | 유지 |
| fileUtils.ts | ✅ 활성 | 유지 |
| pathUtils.ts | ✅ 활성 | 유지 |
| constants.ts | ✅ 활성 | 유지 |
| utils/markdown.ts | Viewer/BlockEditor | ✅ 활성 |
| **markdownUtils.ts** | ❌ 아무도 import 안함 | 삭제 |
| **performanceUtils.ts** | ❌ 아무도 import 안함 | 삭제 |
| embeddings.ts | vectorStore만 | ✅ 활성 (서버) |
| vectorStore.ts | 서버 핸들러만 | ✅ 활성 (서버) |
| users.ts | API route만 | ✅ 활성 |

---

### 6.4 Types 사용 현황

| 파일 | 주요 사용처 | 조치 |
|------|------------|------|
| index.ts | 통합 export | 유지 |
| tab.ts | TabStore | ✅ 활성 |
| layout.ts | LayoutStore | ✅ 활성 |
| fileSystem.ts | TreeStore | ✅ 활성 |
| common.ts | 공통 타입 | 유지 |
| **components.ts** | WikiApp, WikiSidebar 등 (레거시) | ⚠️ 정리 필요 |
| **hooks.ts** | useTreeData, useAutoScroll (미사용) | ⚠️ 정리 필요 |
| **wiki.ts** | WikiSidebar 등 (레거시) | ⚠️ 정리 필요 |
| **ui.ts** | 확인 필요 | 검토 |
| **api.ts** | 확인 필요 | 검토 |

---

### 6.5 API Routes 사용 현황

| Route | 클라이언트 사용 | 조치 |
|-------|----------------|------|
| /api/ask | aiApi.ask | ✅ 활성 |
| /api/file | fileApi | ✅ 활성 |
| /api/files | fileApi | ✅ 활성 |
| /api/gemini | aiApi.geminiChat | ✅ 활성 |
| /api/index | indexApi | ✅ 활성 |
| /api/search | searchApi.search | ✅ 활성 |
| /api/upload | uploadApi | ✅ 활성 |
| /api/users | userApi | ⚠️ 클라이언트 미호출 검토 |
| **/api/git** | ❌ 클라이언트 미호출 | 삭제 검토 |
| **/api/watch** | ❌ 클라이언트 미호출 | 삭제 검토 |
| /api/text-search | searchApi.textSearch | TextSearch에서만 (레거시) |

---

### 6.6 신규 UI에서 누락된 기능

| 기능 | 구 구현 | 신규 위치 제안 | 우선순위 |
|------|--------|---------------|----------|
| **새 파일/폴더 생성** | CreateFileModal | MainSidebar 헤더 + 버튼 | P1 |
| **파일 삭제/이름 변경** | WikiSidebar 컨텍스트 메뉴 | SidebarFileTree 컨텍스트 메뉴 | P1 |
| **파일 업로드** | FileUpload | MainSidebar or WikiHomePage | P2 |
| **Gemini 대화** | GeminiChat | AISearchPage 탭 or 별도 탭 | P2 |
| **테마 전환** | ThemeToggle | Header에 추가 | P3 |

---

### 6.7 컴포넌트 정리 우선순위

#### P1 삭제 (연결 안 됨 - 즉시 삭제)

| 파일 | 현재 위치 | 사유 |
|------|----------|------|
| `WikiApp.tsx` | 루트 | ❌ 아무도 import 안함, AppLayout이 대체 |
| `WikiSidebar.tsx` | 루트 | WikiApp에서만 사용 (레거시) |
| `WikiModals.tsx` | 루트 | WikiApp에서만 사용 (레거시) |
| `AIChat.tsx` | 루트 | WikiApp에서만 사용 (AISearchPage가 대체) |
| `SearchPanel.tsx` | 루트 | ❌ 아무도 import 안함 |
| `TextSearch.tsx` | 루트 | ❌ 아무도 import 안함 |
| `TreeComponent.tsx` | 루트 | 레거시만 사용 (SidebarFileTree가 대체) |
| `MessageModal.tsx` | 루트 | 레거시만 사용 (sonner가 대체) |
| `ImageModal.tsx` | 루트 | ❌ 아무도 import 안함 |
| `LinkModal.tsx` | 루트 | ❌ 아무도 import 안함 |
| `MarkdownToolbar.tsx` | 루트 | ❌ 아무도 import 안함 |
| `wiki/ContextMenu.tsx` | wiki/ | ❌ 아무도 import 안함 |

#### P2 이동/통합 (기능 필요)

| 파일 | 현재 위치 | 권장 위치 | 사유 |
|------|----------|----------|------|
| `WikiEditor.tsx` | 루트 | `editor/` | ✅ 활성 컴포넌트, 위치 정리 |
| `CreateFileModal.tsx` | 루트 | 재구현 | 기능 필요 (MainSidebar에) |
| `FileUpload.tsx` | 루트 | 재구현 | 기능 필요 (drag & drop) |

#### P3 검토 (기능 보류)

| 파일 | 현재 위치 | 조치 | 사유 |
|------|----------|------|------|
| `GeminiChat.tsx` | 루트 | 보류 후 삭제 or 통합 | 기능 필요 여부 확인 |
| `ThemeToggle.tsx` | 루트 | Header에 통합 검토 | 기능 필요 여부 확인 |

### 6.8 삭제 완료 내역 ✅

**컴포넌트 (16개):** ✅ 삭제됨
```
WikiApp.tsx, WikiSidebar.tsx, WikiModals.tsx, AIChat.tsx, GeminiChat.tsx,
SearchPanel.tsx, TextSearch.tsx, TreeComponent.tsx, CreateFileModal.tsx,
FileUpload.tsx, MessageModal.tsx, ThemeToggle.tsx, ImageModal.tsx, 
LinkModal.tsx, MarkdownToolbar.tsx, wiki/ (폴더 전체)
```

**Hooks (8개):** ✅ 삭제됨
```
useContextMenu.ts, useNotification.ts, useTreeData.ts, useAutoScroll.ts,
useFileOperations.ts, useFileSystem.ts, useMessage.ts, useResize.ts,
services/ (폴더 전체)
```

**Stores (5개):** ✅ 삭제됨
```
gemini.store.ts, theme.store.ts, wiki-items.store.ts, wiki-ui.store.ts, user.store.ts
```

**Utils (2개):** ✅ 삭제됨
```
markdownUtils.ts, performanceUtils.ts
```

**Types (2개):** ✅ 삭제됨
```
hooks.ts, wiki.ts
```

**API Routes (2개):** ⚠️ 보류 (삭제 검토 필요)
```
/api/git, /api/watch
```

### 6.9 기타 개선

| ID | 항목 | 작업 | 우선순위 |
|----|------|------|:--------:|
| B-02 | common/ 채우기 | 필요시 공통 컴포넌트 index.ts 구성 | P2 |
| B-03 | Root Layout | `'use client'` 제거 검토 (metadata 사용) | P3 |
| B-04 | types/ 정리 | components.ts, hooks.ts, wiki.ts 미사용 타입 제거 | P2 |

---

## Phase 7: 문서 시스템 템플릿 재설계 ⬜ 진행중

> PMS 템플릿 패턴 적용 + 문서 뷰어/에디터 컴포넌트 재설계  
> 📌 기존 레거시 방식 완전 폐기, 새 아키텍처로 구현

### 7.1 설계 방향

**페이지 구조** (PMS ListPageTemplateV2 스타일):

```
┌─────────────────────────────────────────────────────────────┐
│  Breadcrumb: /wiki/docs/architecture/tech-stack.md          │
├─────────────────────────────────────────────────────────────┤
│  PageHeader                                                 │
│  ┌─────────────────────┐  ┌──────┬──────┬────────────┐     │
│  │ 🔍 문서 내 검색      │  │ 수정 │ 삭제 │ 버전 히스토리│     │
│  └─────────────────────┘  └──────┴──────┴────────────┘     │
├────────────────────────────────────┬────────────────────────┤
│  Content (좌: 문서 본문)            │  Sidecar (우)          │
│ ┌───┬────────────────────────────┐ │ ┌────────────────────┐ │
│ │ 1 │ # 기술 스택               │ │ │ 📋 문서 정보        │ │
│ │ 2 │                           │ │ │ 작성자: admin      │ │
│ │ 3 │ ## 프론트엔드             │ │ │ 생성일: 2026-01-29 │ │
│ │ 4 │ - Next.js 15              │ │ │ 라인: 156          │ │
│ │ 5 │ - React 19                │ │ │ 문자: 4,523        │ │
│ │...│ ...                       │ │ │ 🏷️ 태그            │ │
│ └───┴────────────────────────────┘ │ │ frontend, react    │ │
└────────────────────────────────────┴────────────────────────┘
```

### 7.2 모드 전환 흐름

| 모드 | 트리거 | 헤더 | 컨텐츠 |
|------|--------|------|--------|
| **뷰어** | 파일 선택 | 검색 + [수정/삭제/히스토리] | 문서 렌더링 |
| **에디터** | 수정 버튼 | 경로 편집 + [저장/취소] | 에디터 (TipTap) |
| **새 문서** | 새 문서 버튼 | 경로 입력 + [저장/취소] | 빈 에디터 |

### 7.3 컴포넌트 구조

```
templates/
  DocumentViewerTemplate.tsx   # 뷰어 템플릿
  DocumentEditorTemplate.tsx   # 에디터 템플릿 (새 문서/수정 공용)

common/
  Breadcrumb.tsx              # 경로 표시 (클릭 가능)
  PageHeader.tsx              # 헤더 (검색 + 액션 버튼)
  PageContent.tsx             # 컨텐츠 wrapper
  Sidecar.tsx                 # 우측 메타 정보 패널
  LineNumbers.tsx             # 줄번호 컴포넌트

editor/
  WikiEditor.tsx              # 이동 예정 (현재 루트)
  BlockEditor.tsx             # TipTap 에디터
  EditorToolbar.tsx           # 에디터 툴바
```

### 7.4 작업 목록

| ID | 작업 | 우선순위 | 상태 |
|----|------|:--------:|:----:|
| 7-1 | DocumentViewerTemplate 설계 | P1 | ⬜ |
| 7-2 | common/ 컴포넌트 생성 (Breadcrumb, PageHeader, Sidecar) | P1 | ⬜ |
| 7-3 | WikiViewerPage를 새 템플릿으로 마이그레이션 | P1 | ⬜ |
| 7-4 | DocumentEditorTemplate 설계 | P2 | ⬜ |
| 7-5 | WikiEditor.tsx → editor/ 이동 | P2 | ⬜ |
| 7-6 | 새 문서 생성 기능 구현 | P2 | ⬜ |
| 7-7 | 파일 삭제/이름 변경 (컨텍스트 메뉴) | P2 | ⬜ |

---

## Phase 8: 디자인 통일 + 장기 개선 (점진적)

> Radix UI 기반 컴포넌트 교체 + PMS 패키지 도입 검토

### 8.1 MUI 제거/대체 검토

- [ ] 필요한 Radix UI 패키지 선택 설치
- [ ] `tailwindcss-animate` 설치
- [ ] MUI 컴포넌트 → Radix/shadcn 스타일로 점진적 교체
- [ ] `@mui/x-tree-view` 유지 또는 대체 검토

### 8.2 PMS 패키지 도입 검토 (선택적)

| ID | 패키지 | 용도 | 비고 |
|----|--------|------|------|
| C-01 | `@tanstack/react-query` | 서버 상태 관리 | 캐싱, 에러 처리 개선 |
| C-02 | `axios` | HTTP 클라이언트 | 인터셉터, 타임아웃 등 |

---

## 참조: DMS 전용 패키지 (유지)

> DMS 도메인 특화 패키지 - 제거하지 않음

| 패키지 | 용도 | 비고 |
|--------|------|------|
| `@tiptap/*` (15개) | 리치 텍스트 에디터 | DMS 핵심 |
| `@google/generative-ai` | Gemini AI | AI 기능 |
| `@lancedb/lancedb` | 벡터 DB | RAG 검색 |
| `@mui/x-tree-view` | 트리 뷰 | 파일 탐색기 |
| `marked`, `react-markdown` | 마크다운 | 문서 렌더링 |
| `lowlight` | 코드 하이라이팅 | 에디터 |
| `turndown` | HTML→MD 변환 | 마크다운 |

---

## 주의사항

### ❌ 하지 말아야 할 것

| 항목 | 이유 |
|------|------|
| `@ssoo/types` 연동 | DMS 모노레포 독립성 원칙 위배 |
| `@ssoo/database` 연동 | DMS 모노레포 독립성 원칙 위배 |
| `workspace:*` 의존성 | GitLab 단독 배포 불가 |

### ✅ 해야 할 것

| 항목 | 이유 |
|------|------|
| DMS 자체 타입 정의 | `src/types/`에서 독립 관리 |
| npm 공개 패키지만 사용 | 어디서든 설치 가능 |
| `src/lib/api/`로 API 호출 추상화 | 통합 시 URL만 변경 |

---

## DMS 독립 실행 가이드

### 패키지 매니저

| 프로젝트 | 패키지 매니저 |
|----------|--------------|
| 모노레포 (PMS, Server) | **pnpm** |
| **DMS** | **npm** |

### 실행 방법

```bash
# 1. DMS 폴더로 이동
cd apps/web/dms

# 2. 의존성 설치 (npm 사용)
npm install

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3001 (DMS)
# → PMS는 별도로 pnpm run dev (포트 3000)
```

### 모노레포 내 실행 시

```bash
# DMS만 실행 (모노레포 루트에서 turbo 미적용)
cd apps/web/dms && npm run dev
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-29 | **Phase 6 완료** - 레거시 33개 파일 삭제, 빌드 검증 완료 |
| 2026-01-29 | **Phase 6 분석** - 컴포넌트/Hooks/Stores/Utils/API 사용 현황 분석 |
| 2026-01-29 | **종합 검증 완료** - PMS-DMS 비교 분석 문서 작성 |
| 2026-01-29 | **package.json 수정** - name: `web-dms`, port: 3001, lint 추가 |
| 2026-01-29 | **루트 진입점 변경** - `/wiki` → `/`, 문서 경로 `/doc/` |
| 2026-01-29 | **Phase 5 완료** - 라우트 정리 (/ → /wiki 리디렉트) |
| 2026-01-29 | **패턴 통일** - Store 파일명 (`*.store.ts`), types/tab.ts 분리 |
| 2026-01-29 | **Phase 4 완료** - API 레이어 정리 |
| 2026-01-29 | 문서 분리 - 완료 내역 → `package-integration-completed.md` |
| 2026-01-29 | **Phase 3 완료** - pageComponents 패턴, WikiViewerPage, SidebarFileTree 단순화 |
| 2026-01-29 | **Phase 3 시작** - PMS 패턴 동기화 |
| 2026-01-29 | Phase 2 완료 - 레이아웃 + 스타일 통합 |

---

> 📌 **완료된 Phase 0~2 상세 내역**은 `package-integration-completed.md`를 참조하세요.

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |
