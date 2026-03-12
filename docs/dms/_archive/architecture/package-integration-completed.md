# DMS 통합 리팩터링 완료 기록

> 📅 작성일: 2026-01-29  
> � 최종 업데이트: 2026-02-02  
> 📌 목적: Phase 0~7 완료 내역 아카이브  
> 📂 현재 진행 문서: `package-integration-plan.md`  
> 📊 비교 분석: `pms-dms-comparison-analysis.md`

> 이 문서는 완료 시점 스냅샷을 보존하는 아카이브입니다.
> 현재 런타임/패키지/구조 정본은 `package-spec.md`, `tech-stack.md`, `frontend-standards.md`, 실제 코드/manifest를 우선합니다.
> 아래의 패키지 비교, Phase 기록, 옛 컴포넌트명(`WikiViewerPage`, `MarkdownViewerPage`, `Tiptap` 등)은 당시 상태를 설명하는 기록이며 현재 구현 설명으로 읽으면 안 됩니다.

---

## 📊 완료된 Phase 요약

| Phase | 작업 | 완료일 | 주요 성과 |
|-------|------|--------|----------|
| **0** | 기반 구조 정렬 | 2026-01-27 | src/ + server/ 분리, 95개 파일 이동 |
| **1** | 상태관리 + P1 패키지 | 2026-01-27 | zustand 7개 store, sonner toast |
| **2-A~D** | Context → Store 전환 | 2026-01-28 | contexts/ 폴더 완전 삭제 |
| **2-E** | 미사용 컴포넌트 정리 | 2026-01-28 | 11개 컴포넌트 삭제 |
| **2-F** | Fluent UI 제거 | 2026-01-28 | Radix UI 6개 추가 |
| **2-G~L** | 레이아웃 + 스타일 통합 | 2026-01-28 | PMS 디자인 시스템 100% |
| **3** | PMS 패턴 동기화 | 2026-01-29 | pageComponents + WikiViewerPage loadFile |
| **4** | API 레이어 정리 | 2026-01-29 | apiClient 확장, fetch 호출 통합 |
| **5** | 라우트 정리 | 2026-01-29 | `/` 루트 진입점, Middleware 추가 |
| **검증** | PMS-DMS 비교 분석 | 2026-01-29 | 4가지 관점 종합 분석, 즉시 조치 완료 |
| **6** | 레거시 코드 정리 | 2026-01-29 | **33개 파일 삭제**, 빌드 검증 완료 |

---

## 📦 패키지 비교표 (완료 시점 스냅샷)

> 📅 최종 업데이트: 2026-02-02

### Dependencies (런타임)

| 패키지 | PMS | DMS | 상태 |
|--------|-----|-----|------|
| **[Core Framework]** ||||
| next | ^15.1.0 | ^15.1.0 | ✅ 동일 |
| react | ^19.2.4 | 19.2.0 | ✅ 동일 |
| react-dom | ^19.2.4 | 19.2.0 | ✅ 동일 |
| **[State & Forms]** ||||
| zustand | ^5.0.0 | ^5.0.10 | ✅ 동일 |
| react-hook-form | ^7.54.0 | ^7.71.1 | ✅ 동일 |
| @hookform/resolvers | ^3.9.0 | ^3.10.0 | ✅ 동일 |
| zod | ^3.24.0 | ^3.25.76 | ✅ 동일 |
| **[Data Fetching]** ||||
| @tanstack/react-query | ^5.62.0 | ❌ | 🔴 DMS 없음 |
| @tanstack/react-table | ^8.21.3 | ❌ | 🔴 DMS 없음 |
| axios | ^1.7.0 | ❌ | 🔴 DMS 없음 |
| **[UI - Radix Primitives]** ||||
| @radix-ui/react-dialog | ^1.1.15 | ✅ | ✅ 추가됨 |
| @radix-ui/react-dropdown-menu | ^2.1.16 | ✅ | ✅ 추가됨 |
| @radix-ui/react-scroll-area | - | ✅ | ✅ 추가됨 |
| @radix-ui/react-separator | ^1.1.8 | ✅ | ✅ 추가됨 |
| @radix-ui/react-slot | ^1.2.4 | ✅ | ✅ 추가됨 |
| @radix-ui/react-tooltip | ^1.2.8 | ✅ | ✅ 추가됨 |
| **[Styling]** ||||
| class-variance-authority | ^0.7.1 | ^0.7.1 | ✅ 동일 |
| clsx | ^2.1.0 | ^2.1.1 | ✅ 동일 |
| tailwind-merge | ^2.6.0 | ^2.6.0 | ✅ 동일 |
| lucide-react | ^0.548.0 | ^0.548.0 | ✅ 동일 |
| **[Toast]** ||||
| sonner | ^1.7.0 | ^1.7.4 | ✅ 동일 |
| **[DMS 전용 - Editor]** ||||
| @tiptap/* (15개) | ❌ | ✅ | 🟢 DMS 전용 |
| lowlight | ❌ | ^3.3.0 | 🟢 DMS 전용 |
| marked | ❌ | ^17.0.1 | 🟢 DMS 전용 |
| react-markdown | ❌ | ^10.1.0 | 🟢 DMS 전용 |
| **[DMS 전용 - AI/DB]** ||||
| @google/generative-ai | ❌ | ^0.24.1 | 🟢 DMS 전용 |
| @lancedb/lancedb | ❌ | ^0.23.0 | 🟢 DMS 전용 |

### 제거된 패키지

| 패키지 | 제거일 | 이유 |
|--------|--------|------|
| @fluentui/react | 2026-01-28 | Radix UI로 대체 |
| @fluentui/react-components | 2026-01-28 | Radix UI로 대체 |
| @fluentui/react-icons | 2026-01-28 | lucide-react로 대체 |
| @mui/material | 2026-01-28 | 미사용 |
| @mui/lab | 2026-01-28 | 미사용 |
| @emotion/react | 2026-01-28 | MUI 제거로 불필요 |
| @emotion/styled | 2026-01-28 | MUI 제거로 불필요 |
| tailwind-variants | 2026-01-28 | 미사용 (CVA로 충분) |
| chokidar | 2026-01-28 | 미사용 |
| formidable | 2026-01-28 | 미사용 |
| multer | 2026-01-28 | 미사용 |

---

## 🏗️ Phase 0: 기반 구조 정렬 (완료)

### Step 0: 준비 작업
- ✅ 불필요한 페이지 삭제 (`goals-md/`, `goals.md/`, `wiki-test/`)

### Step 1: 프론트엔드 영역 (`src/`) 구성
- ✅ `src/` 디렉토리 생성
- ✅ 95개 파일 이동:
  - `components/` → `src/components/`
  - `hooks/` → `src/hooks/`
  - `lib/` → `src/lib/`
  - `types/` → `src/types/`
  - `utils/` → `src/lib/utils/` (통합)
  - `contexts/` → `src/contexts/` (Phase 1에서 stores로 변환)
- ✅ `tsconfig.json` paths 업데이트 (`@/*` → `./src/*`)

### Step 2: 백엔드 영역 (`server/`) 구성
- ✅ `server/` 디렉토리 생성
- ✅ 서비스 분리:
  - `server/services/FileSystemService.ts`
  - `server/services/SearchService.ts`
  - `server/handlers/` (19개 핸들러 추출)
- ✅ `app/api/` 얇은 레이어로 변환

### Step 3: 라우팅 구조
- ✅ `src/app/(main)/` route group 생성
- ✅ `src/app/(main)/wiki/page.tsx` 연결

### 최종 구조
```
apps/web/dms/
├── src/                        # 프론트엔드
│   ├── app/
│   │   └── (main)/wiki/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   └── types/
├── server/                     # 백엔드
│   ├── handlers/              # 19개
│   └── services/              # FileSystem, Search
└── data/wiki/                  # 데이터
```

---

## 🔄 Phase 1: 상태관리 + P1 패키지 (완료)

### 설치된 패키지
- ✅ `zod` ^3.25.76
- ✅ `react-hook-form` ^7.71.1
- ✅ `@hookform/resolvers` ^3.10.0
- ✅ `zustand` ^5.0.10
- ✅ `sonner` ^1.7.4

### 생성된 Stores (Phase 1 당시 7개, 현재 6개)

> ⚠️ **역사 기록**: 아래는 Phase 1 당시 생성된 Store 목록입니다.  
> Phase 6~7에서 대부분 삭제/병합되어 현재는 `confirm`, `editor`, `file`, `layout`, `sidebar`, `tab` 6개만 유지됩니다.

| Store | 파일 (당시) | 역할 | 현재 상태 |
|-------|------|------|------|
| gemini-store | `stores/gemini-store.ts` | AI 채팅 상태 | ❌ 삭제됨 |
| layout-store | `stores/layout-store.ts` | 레이아웃 상태 | ✅ 유지 (`layout.store.ts`) |
| tab-store | `stores/tab-store.ts` | 탭 + 북마크 | ✅ 유지 (`tab.store.ts`) |
| theme-store | `stores/theme-store.ts` | 테마 | ❌ 삭제됨 |
| tree-store | `stores/tree-store.ts` | 파일 트리 | ✅ 병합됨 (`file.store.ts`) |
| user-store | `stores/user-store.ts` | 사용자 | ❌ 삭제됨 |
| wiki-editor-store | `stores/wiki-editor-store.ts` | 에디터 상태 | ✅ 병합됨 (`editor.store.ts`) |

---

## 🧹 Phase 2-A~D: Context → Store 전환 (완료)

### 삭제된 Context (5개)
- ❌ `GeminiChatContext` → `gemini-store`
- ❌ `NotificationContext` → sonner toast
- ❌ `TreeDataContext` → `tree-store`
- ❌ `ThemeContext` → `theme-store`
- ❌ `UserContext` → `user-store`
- ❌ `WikiContext` → 3개 store로 분할

### 결과
- ✅ `contexts/` 폴더 완전 삭제
- ✅ PMS 구조와 동일화 달성

---

## 🗑️ Phase 2-E: 미사용 컴포넌트 정리 (완료)

### 삭제된 컴포넌트 (11개)
| 컴포넌트 | 경로 | 이유 |
|----------|------|------|
| WikiAside | `wiki/WikiAside.tsx` | WikiSidebar로 대체 |
| WikiAsideToggle | `wiki/WikiAsideToggle.tsx` | 미사용 |
| WikiFooter | `wiki/WikiFooter.tsx` | 미사용 |
| WikiHeader | `wiki/WikiHeader.tsx` | Header.tsx로 대체 |
| WikiLayout | `wiki/WikiLayout.tsx` | AppLayout으로 대체 |
| WikiThemeToggle | `wiki/WikiThemeToggle.tsx` | ThemeToggle로 통합 |
| ... | ... | ... |

---

## 🎨 Phase 2-F: Fluent UI 제거 (완료)

### 제거된 패키지
- ❌ `@fluentui/react`
- ❌ `@fluentui/react-components`
- ❌ `@fluentui/react-icons`

### 추가된 패키지 (Radix UI)
- ✅ `@radix-ui/react-dialog`
- ✅ `@radix-ui/react-dropdown-menu`
- ✅ `@radix-ui/react-scroll-area`
- ✅ `@radix-ui/react-separator`
- ✅ `@radix-ui/react-slot`
- ✅ `@radix-ui/react-tooltip`

### 아이콘 전환
- Fluent Icons → lucide-react (20+ 컴포넌트)

---

## 🎨 Phase 2-G~L: 레이아웃 + 스타일 통합 (완료)

### Phase 2-G: PMS 표준 레이아웃 적용
- ✅ AppLayout 3단 구조 (Sidebar + Main + Resizer)
- ✅ Header, TabBar, ContentArea 배치

### Phase 2-H: 사이드바 스타일링
- ✅ SidebarFileTree PMS 패턴 적용
- ✅ SidebarResizer 통합

### Phase 2-I: Header 통합
- ✅ 검색바 스타일 통일
- ✅ 사용자 메뉴 드롭다운

### Phase 2-J: TabBar 통합
- ✅ 탭 스타일 PMS와 통일
- ✅ Home 탭 고정 (closable: false)

### Phase 2-K: UI 컴포넌트 검토
- ✅ Button, Input, Modal shadcn/ui 기반 확인

### Phase 2-L: Store 비교 및 정리
- ✅ tab-store: BookmarkItem 추가
- ✅ layout-store: sidebarWidth 리사이즈 로직

### 색상 토큰 통일
- ✅ `text-muted-foreground` → `text-gray-400` 표준화
- ✅ DMS globals.css PMS와 완전 동기화

---

## 📋 변경 이력 (전체)

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | **Phase 0 시작** - 불필요 페이지 삭제 |
| 2026-01-27 | **Phase 0 Step 1** - src/ 프론트엔드 구조, 95개 파일 이동 |
| 2026-01-27 | **Phase 0 Step 2** - server/ 백엔드 구조, services 이동 |
| 2026-01-27 | **Phase 0 Step 3** - (main) route group 생성 |
| 2026-01-27 | **Phase 0 완료** - 19개 핸들러 추출, route.ts 얇은 레이어화 |
| 2026-01-27 | **Phase 1 시작** - P1 패키지 설치 |
| 2026-01-27 | **Phase 1 완료** - zustand stores 생성, sonner toast 적용 |
| 2026-01-28 | **패키지 정리** - tailwind-variants 제거, 버전 통일 |
| 2026-01-28 | **독립 실행 검증** - DMS npm 독립 설치 성공 |
| 2026-01-28 | **Phase 2-A 완료** - 5개 Context → Store 전환 |
| 2026-01-28 | **Phase 2-C 완료** - WikiContext 분할 |
| 2026-01-28 | **Phase 2-D 완료** - contexts/ 폴더 삭제 |
| 2026-01-28 | **Phase 2-E 완료** - 11개 미사용 컴포넌트 삭제 |
| 2026-01-28 | **Phase 2-F 완료** - Fluent UI 제거, Radix UI 전환 |
| 2026-01-28 | **Phase 2-G~L 완료** - PMS 디자인 시스템 100% 적용 |
| 2026-01-29 | **Phase 3 완료** - pageComponents 패턴, WikiViewerPage, currentFilePath |

---

## 📊 통합 현황 (Phase 2 완료 시점)

| 구분 | 상태 |
|------|------|
| **프로젝트 구조** | ✅ PMS 기준 `src/` + `server/` 통일 |
| **코어 프레임워크** | ✅ Next.js 15.x, React 19.x |
| **CSS 유틸리티** | ✅ Tailwind, tailwind-merge (PMS 동일) |
| **상태 관리** | ✅ zustand 7개 store |
| **UI 라이브러리** | ✅ Radix UI + shadcn/ui 패턴 |
| **레이아웃** | ✅ PMS AppLayout 구조 |
| **스타일** | ✅ PMS 디자인 시스템 100% |
| **DMS 도메인** | ✅ 당시 Tiptap/마크다운/AI 축 유지 |

---

## 📦 Phase 3: PMS 패턴 동기화 (완료)

> **완료일**: 2026-01-29  
> **목적**: DMS를 PMS의 `pageComponents` 패턴과 동기화

### 생성된 페이지 컴포넌트 (Phase 3 당시)

> ⚠️ **역사 기록**: 아래는 Phase 3 당시 생성된 페이지 컴포넌트입니다.  
> Phase 7에서 리팩터링되어 현재는:
> - `WikiHomePage` → `DashboardPage` (`pages/home/`)
> - `WikiViewerPage` → `ViewerPage` (`pages/markdown/`)
> - `AISearchPage` → `AiSearchPage` (`pages/ai/`)

| 컴포넌트 (당시) | 경로 (당시) | 역할 | 현재 상태 |
|----------|------|------|------|
| WikiHomePage | `components/pages/wiki/WikiHomePage.tsx` | 홈 대시보드 | → `DashboardPage` |
| WikiViewerPage | `components/pages/wiki/WikiViewerPage.tsx` | 문서 뷰어/에디터 | → `ViewerPage` |
| AISearchPage | `components/pages/ai/AISearchPage.tsx` | AI 검색 | → `AiSearchPage` |

### ContentArea 리팩터링 (Phase 3 당시)

> ⚠️ **역사 기록**: 아래는 Phase 3 당시 코드입니다. 현재는 `home`, `markdown`, `aiAsk`, `aiSearch`, `settings` 페이지를 keep-alive 탭 렌더링합니다.

```typescript
// Phase 3 당시: pageComponents 패턴 도입
const pageComponents = {
  home: lazy(() => import('@/components/pages/wiki/WikiHomePage')),
  'ai-search': lazy(() => import('@/components/pages/ai/AISearchPage')),
  wiki: lazy(() => import('@/components/pages/wiki/WikiViewerPage')),
};

// 현재 (2026-03 기준):
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/DashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/ViewerPage')),
  aiAsk: lazy(() => import('@/components/pages/ai/AskPage')),
  aiSearch: lazy(() => import('@/components/pages/ai/SearchPage')),
  settings: lazy(() => import('@/components/pages/settings/Page')),
};
```

### SidebarFileTree 단순화

```typescript
// 변경 전: selectFile() + openTab()
selectFile(node.path);  // tree-store 업데이트
openTab({ ... });

// 변경 후: openTab()만 호출
// PMS 패턴: 사이드바는 탭만 열고, WikiViewerPage가 loadFile() 호출
openTab({ ... });
```

### editor.store 확장 (Phase 3 당시 wiki-editor-store)

> ⚠️ **현재**: `wiki-editor-store.ts` → `editor.store.ts`로 리네이밍됨

| 필드 | 설명 |
|------|------|
| `currentFilePath` | 현재 로드된 파일 경로 (하이라이트 상태용) |

### 커밋 이력 (Phase 3)

| 커밋 | 내용 |
|------|------|
| `d0f152b` | pageComponents 패턴 도입 (당시 WikiHomePage, WikiViewerPage, AISearchPage) |
| `7037c7e` | currentFilePath 추가로 파일 로딩/하이라이트 버그 수정 |

> 📌 Phase 7에서 페이지 컴포넌트 구조 리팩터링됨

---

## 🧹 Phase 6: 레거시 코드 정리 (완료)

> 📅 완료일: 2026-01-29  
> 📌 목적: 미사용 레거시 코드 완전 제거

### 삭제 완료 내역 (총 33개 파일)

#### 컴포넌트 (16개)

| 파일 | 이유 |
|------|------|
| `WikiApp.tsx` | AppLayout으로 대체, 아무도 import 안함 |
| `WikiSidebar.tsx` | Sidebar + FileTree로 대체 |
| `WikiModals.tsx` | sonner toast로 대체 |
| `AIChat.tsx` | AISearchPage로 대체 |
| `GeminiChat.tsx` | 레거시 전용 |
| `SearchPanel.tsx` | 미사용 |
| `TextSearch.tsx` | 미사용 |
| `TreeComponent.tsx` | FileTree로 대체 |
| `CreateFileModal.tsx` | 레거시 전용, 재구현 예정 |
| `FileUpload.tsx` | 레거시 전용 |
| `MessageModal.tsx` | sonner로 대체 |
| `ThemeToggle.tsx` | 미사용 |
| `ImageModal.tsx` | 미사용 |
| `LinkModal.tsx` | 미사용 |
| `MarkdownToolbar.tsx` | 미사용 |
| `wiki/` (폴더) | ContextMenu.tsx 포함, 미사용 |

#### Hooks (8개)

| 파일 | 이유 |
|------|------|
| `useContextMenu.ts` | 미사용 |
| `useNotification.ts` | 미사용 |
| `useTreeData.ts` | 미사용 |
| `useAutoScroll.ts` | 미사용 |
| `useFileOperations.ts` | 레거시 전용 |
| `useFileSystem.ts` | 미사용 |
| `useMessage.ts` | 레거시 전용 |
| `useResize.ts` | 레거시 전용 |
| `services/` (폴더) | 미사용 |

#### Stores (5개)

| 파일 | 이유 |
|------|------|
| `gemini.store.ts` | 레거시 전용 |
| `theme.store.ts` | 레거시 전용 |
| `wiki-items.store.ts` | 레거시 전용 |
| `wiki-ui.store.ts` | 레거시 전용 |
| `user.store.ts` | 미사용 (export만 됨) |

#### Utils (2개)

| 파일 | 이유 |
|------|------|
| `markdownUtils.ts` | 미사용 |
| `performanceUtils.ts` | 미사용 |

#### Types (2개)

| 파일 | 이유 |
|------|------|
| `hooks.ts` | 미사용 |
| `wiki.ts` | 레거시 전용 |

### Index 파일 정리

| 파일 | 변경 |
|------|------|
| `hooks/index.ts` | useEditor, useOpenTabWithConfirm만 남김 |
| `stores/index.ts` | confirm, editor, file, layout, sidebar, tab만 남김 |

### 검증

- ✅ `npm run build` 성공
- ✅ 모든 라우트 정상 빌드

---

> 📌 **이 문서는 아카이브 목적입니다.**  
> 진행 중인 작업은 `package-integration-plan.md`를 참조하세요.

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |
