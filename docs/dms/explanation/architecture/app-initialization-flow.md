# DMS 앱 초기화 흐름

> **작성일**: 2026-01-29  
> **최종 업데이트**: 2026-02-02 (Phase 7 완료 반영)  
> **목적**: DMS 앱의 실제 초기화 흐름 분석 + PMS 비교  
> **상태**: ✅ Phase 7 완료, 레거시 코드 정리됨

---

## 📊 현재 DMS 초기화 흐름 (실제 코드 기준)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Root Layout (app/layout.tsx)                                              │
│    ├─ 'use client' 선언                                                      │
│    ├─ 폰트 설정: Geist Sans/Mono (Google Fonts)                              │
│    ├─ lang="ko"                                                              │
│    └─ <Toaster /> (sonner) - position="top-right"                            │
│         └─ {children}                                                        │
│                                                                              │
│    📌 특징: Providers 없음 (react-query 미사용)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Main Layout (app/(main)/layout.tsx)                                       │
│    ├─ 'use client' 선언                                                      │
│    ├─ useLayoutStore: initializeDeviceType()                                 │
│    ├─ useFileStore: refreshFileTree() - Server Action으로 파일 트리 로드     │
│    ├─ window.resize 이벤트 리스너                                             │
│    └─ return <AppLayout /> ← children 전달 안함!                             │
│                                                                              │
│    📌 특징: Auth 체크 없음 (DMS는 인증 미사용)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. AppLayout (components/layout/AppLayout.tsx)                               │
│    ├─ props 없음 (children 받지 않음)                                         │
│    ├─ useLayoutStore: deviceType                                             │
│    ├─ 조건부 렌더링:                                                          │
│    │     ├─ mobile → "모바일 버전 준비 중" 메시지                             │
│    │     └─ else → Desktop 레이아웃                                          │
│    └─ Desktop 구조:                                                          │
│         ├─ Sidebar (고정 너비 240px, 접기 없음)                               │
│         └─ Main Area (marginLeft: 240px)                                     │
│              ├─ Header                                                       │
│              ├─ TabBar                                                       │
│              └─ ContentArea                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Sidebar (components/layout/sidebar/Sidebar.tsx)                           │
│    ├─ 로고 + 제목                                                             │
│    ├─ Search (검색)                                                           │
│    ├─ Bookmarks (책갈피)                                                      │
│    ├─ OpenTabs (열린 탭)                                                      │
│    └─ FileTree (파일 트리)                                                    │
│                                                                              │
│    📌 특징: 항상 펼침 상태, 접기/플로팅 없음                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. ContentArea (components/layout/ContentArea.tsx)                           │
│    ├─ useTabStore: activeTabId, tabs                                         │
│    ├─ pageComponents 매핑 (React.lazy):                                      │
│    │     ├─ 'home': HomeDashboardPage                                        │
│    │     └─ 'markdown': MarkdownViewerPage                                   │
│    ├─ getPageType() 함수로 탭 경로 → 페이지 타입 매핑                         │
│    └─ <Suspense fallback={LoadingFallback}><PageComponent /></Suspense>      │
│                                                                              │
│    📌 특징: children 없음, pageComponents로만 렌더링                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. 파일 클릭 시 (FileTree)                                                    │
│    ├─ openTab({ path: '/doc/{encodedPath}', ... })                           │
│    │         │                                                               │
│    │         ▼                                                               │
│    └─ WikiViewerPage (자체 로딩):                                            │
│         ├─ activeTab.path에서 filePath 추출 (/doc/ 제거 + decodeURIComponent)│
│         ├─ useEffect: loadFile(filePath) 자동 호출                           │
│         └─ WikiEditor 컴포넌트 렌더링                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. Middleware (middleware.ts)                                                 │
│    ├─ 허용 경로: ['/'] 만                                                     │
│    ├─ 제외: api, _next, 정적 파일, favicon.ico                               │
│    └─ 그 외 모든 경로 → '/' 리다이렉트                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 PMS vs DMS 상세 비교

### 1. Root Layout 비교

| 항목 | PMS | DMS | 차이점 |
|------|-----|-----|--------|
| **'use client'** | ❌ 없음 (서버 컴포넌트) | ✅ 있음 (클라이언트) | 🔴 DMS가 클라이언트 |
| **Providers** | `<Providers>` 래핑 | ❌ 없음 | 🔴 DMS에 없음 |
| **폰트** | ❌ 없음 | Geist Sans/Mono | 🟡 DMS만 |
| **Toaster** | ❌ 없음 | sonner | 🟡 DMS만 |
| **metadata** | ✅ export metadata | ❌ 없음 | 🔴 DMS에 없음 |
| **lang** | "ko" | "ko" | ✅ 동일 |

```tsx
// PMS - 서버 컴포넌트
export const metadata: Metadata = { title: 'SSOO - 업무 허브', ... };
export default function RootLayout({ children }) {
  return <html lang="ko"><body><Providers>{children}</Providers></body></html>;
}

// DMS - 클라이언트 컴포넌트
'use client';
export default function RootLayout({ children }) {
  return <html lang="ko"><body>{children}<Toaster /></body></html>;
}
```

### 2. Main Layout 비교

| 항목 | PMS | DMS | 차이점 |
|------|-----|-----|--------|
| **인증 체크** | ✅ checkAuth() → 로그인 폼 | ❌ 없음 | 🔴 의도적 차이 |
| **로딩 상태** | 인증 확인 중 스피너 | ❌ 없음 | 🔴 의도적 차이 |
| **데이터 초기화** | refreshMenu() | refreshFileTree() | ✅ 패턴 동일 |
| **children 전달** | `<AppLayout>{children}</AppLayout>` | `<AppLayout />` | 🟡 DMS가 다름 |

```tsx
// PMS - 인증 체크 후 AppLayout
if (isChecking || authLoading) return <Loading />;
if (!isAuthenticated) return <LoginForm />;
return <AppLayout>{children}</AppLayout>;

// DMS - 바로 AppLayout (인증 없음)
useEffect(() => { initializeDeviceType(); refreshFileTree(); }, []);
return <AppLayout />;  // children 전달 안함!
```

### 3. AppLayout 비교

| 항목 | PMS | DMS | 차이점 |
|------|-----|-----|--------|
| **children prop** | ✅ 받음 | ❌ 안 받음 | 🟡 DMS가 다름 |
| **사이드바 접기** | ✅ isCollapsed 지원 | ❌ 항상 펼침 | 🔴 기능 차이 |
| **사이드바 너비** | collapsedWidth / expandedWidth | 고정 240px | 🔴 기능 차이 |
| **useSidebarStore** | ✅ 사용 | ❌ 없음 | 🔴 구조 차이 |

```tsx
// PMS
const { isCollapsed } = useSidebarStore();
const sidebarWidth = isCollapsed ? LAYOUT_SIZES.sidebar.collapsedWidth : expandedWidth;
return <div><MainSidebar /><div style={{ marginLeft: sidebarWidth }}><ContentArea>{children}</ContentArea></div></div>;

// DMS
return <div><MainSidebar /><div style={{ marginLeft: LAYOUT_SIZES.sidebar.expandedWidth }}><ContentArea /></div></div>;
```

### 4. ContentArea 비교

| 항목 | PMS | DMS | 차이점 |
|------|-----|-----|--------|
| **children prop** | ✅ 받음 (fallback용) | ❌ 안 받음 | 🟡 패턴 차이 |
| **pageComponents** | path 키 (`'/home'`, `'/request'`) | 타입 키 (`'home'`, `'wiki'`) | 🟡 키 방식 차이 |
| **매핑 방식** | `pageComponents[activeTab.path]` | `getPageType()` → `pageComponents[type]` | 🟡 구현 차이 |
| **Suspense** | ✅ 사용 | ✅ 사용 | ✅ 동일 |

```tsx
// PMS - path 직접 매핑
const pageComponents = { '/home': lazy(...), '/request': lazy(...) };
const PageComponent = pageComponents[activeTab.path];

// DMS - 타입 추출 후 매핑
const pageComponents = { home: lazy(...), wiki: lazy(...) };
const pageType = getPageType(activeTab);  // '/doc/...' → 'wiki'
const PageComponent = pageComponents[pageType];
```

### 5. 사이드바 클릭 흐름 비교

| 항목 | PMS | DMS | 차이점 |
|------|-----|-----|--------|
| **클릭 핸들러** | openTab() 호출 | openTab() 호출 | ✅ 동일 |
| **탭 경로** | `path: '/request'` | `path: '/doc/{encodedPath}'` | 🟡 경로 형식 |
| **데이터 로딩** | 페이지 컴포넌트에서 | WikiViewerPage에서 | ✅ 패턴 동일 |

```tsx
// PMS - SidebarMenuTree
openTab({ menuCode: 'REQUEST', title: '요청 관리', path: '/request', ... });

// DMS - SidebarFileTree
openTab({ id: `file-${path}`, title: node.name, path: `/doc/${encodeURIComponent(path)}`, ... });
```

### 6. Store 구조 비교

| Store | PMS | DMS | 비고 |
|-------|-----|-----|------|
| **Tab Store** | menuCode, menuId, status, params | id, path, 책갈피 기능 | 🟡 구조 다름 |
| **Layout Store** | deviceType | deviceType + expandedFolders | 🟡 DMS가 더 많음 |
| **Sidebar Store** | ✅ 별도 존재 | ❌ 없음 (Layout에 통합) | 🔴 구조 차이 |
| **Auth Store** | ✅ JWT 인증 | ❌ 없음 | 🔴 의도적 차이 |
| **Menu/Tree Store** | menuStore | treeStore | 🟡 도메인 특화 |
| **Wiki 관련** | ❌ 없음 | wiki-editor, wiki-ui, wiki-items | 🟡 DMS 전용 |

---

## 📁 현재 파일 구조

### DMS 구조 (실제 - 2026-02-02 기준)
```
src/
├── app/
│   ├── layout.tsx           ← 'use client', 폰트, Toaster
│   ├── globals.css
│   ├── favicon.ico
│   ├── api/                 ← API Routes
│   └── (main)/
│       └── layout.tsx       ← DeviceType + FileTree 초기화, <AppLayout />
│
├── components/
│   ├── layout/
│   │   ├── index.ts
│   │   ├── AppLayout.tsx    ← children 없음
│   │   ├── ContentArea.tsx  ← pageComponents 패턴
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   └── sidebar/         ← 사이드바 컴포넌트들
│   │       ├── Sidebar.tsx      ← 메인 사이드바 (항상 펼침)
│   │       ├── Search.tsx       ← 검색
│   │       ├── Bookmarks.tsx    ← 책갈피
│   │       ├── OpenTabs.tsx     ← 열린 탭
│   │       ├── FileTree.tsx     ← 파일 트리 (openTab만 호출)
│   │       ├── Section.tsx      ← 공통 섹션 래퍼
│   │       └── constants.ts
│   │
│   ├── pages/
│   │   ├── index.ts
│   │   ├── wiki/
│   │   │   ├── WikiHomePage.tsx     ← 홈 대시보드
│   │   │   └── WikiViewerPage.tsx   ← loadFile 자동 호출
│   │   └── ai/
│   │       └── AISearchPage.tsx
│   │
│   ├── common/              ← 공통 UI 컴포넌트
│   ├── templates/           ← 페이지 템플릿
│   ├── ui/                  ← shadcn/ui 컴포넌트
│   └── index.ts
│
├── stores/                  ← 7개 Store
│   ├── index.ts
│   ├── confirm.store.ts     ← 확인 모달
│   ├── editor.store.ts      ← 에디터 상태
│   ├── file.store.ts        ← 파일 트리
│   ├── layout.store.ts      ← 레이아웃/디바이스
│   ├── sidebar.store.ts     ← 사이드바 UI 상태
│   └── tab.store.ts         ← 탭 + 책갈피
│
├── hooks/                   ← 2개 Hook
│   ├── index.ts
│   ├── useEditor.ts
│   └── useOpenTabWithConfirm.ts
│
├── middleware.ts            ← '/' 외 모든 경로 리다이렉트
├── lib/
│   └── utils/
│       └── apiClient.ts
└── types/
```

### PMS 구조 (비교용)
```
src/
├── app/
│   ├── layout.tsx           ← 서버 컴포넌트, Providers
│   ├── providers.tsx        ← QueryClientProvider 등
│   ├── not-found.tsx
│   ├── (auth)/              ← 인증 라우트
│   └── (main)/
│       └── layout.tsx       ← Auth 체크 + 로그인 폼
│
├── components/
│   ├── index.ts
│   ├── layout/              ← 정리된 구조
│   ├── pages/               ← 도메인별 페이지
│   ├── common/              ← 공통 컴포넌트
│   ├── templates/           ← 템플릿 컴포넌트
│   └── ui/
│
├── stores/
│   ├── index.ts
│   ├── auth.store.ts        ← DMS에 없음
│   ├── sidebar.store.ts     ← DMS에 없음
│   ├── menu.store.ts
│   ├── tab.store.ts
│   └── layout.store.ts
│
└── middleware.ts
```

---

## 🎯 핵심 흐름 다이어그램

### PMS 흐름
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   Root Layout          Main Layout              AppLayout       ContentArea  │
│   (Providers)          (Auth 체크)              (children)      (children)   │
│       │                    │                        │               │        │
│       │                    ▼                        │               │        │
│       │              [인증 확인]                    │               │        │
│       │                    │                        │               │        │
│       │              미인증? ──► 로그인 폼          │               │        │
│       │                    │                        │               │        │
│       │              인증됨 ──► refreshMenu()       │               │        │
│       │                    │                        │               │        │
│       └───────────────────►└───────────────────────►└──────────────►│        │
│                                                                      │        │
│   SidebarMenuTree                                     pageComponents[path]   │
│        │                                                     │               │
│        │ openTab({ path: '/request' })                       ▼               │
│        └─────────────────────────────────────────────► RequestListPage       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### DMS 흐름
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   Root Layout          Main Layout              AppLayout       ContentArea  │
│   (Toaster)            (초기화)                 (props 없음)    (props 없음) │
│       │                    │                        │               │        │
│       │                    ▼                        │               │        │
│       │          initializeDeviceType()             │               │        │
│       │          refreshFileTree()                  │               │        │
│       │                    │                        │               │        │
│       └───────────────────►└───────────────────────►└──────────────►│        │
│                                                                      │        │
│   FileTree (sidebar/)                           getPageType() ──► pageComponents │
│        │                                                     │               │
│        │ openTab({ path: '/doc/...' })                       ▼               │
│        └─────────────────────────────────────────────► WikiViewerPage        │
│                                                              │               │
│                                                        loadFile(path)        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ 잘 정렬된 항목 (PMS 패턴 일치)

| 영역 | 상태 | 설명 |
|------|------|------|
| **pageComponents 패턴** | ✅ | React.lazy + Suspense로 동적 로딩 |
| **사이드바 클릭 → openTab()만** | ✅ | 페이지 컴포넌트가 데이터 로드 |
| **WikiViewerPage 자체 로딩** | ✅ | path 추출 → loadFile() 자동 호출 |
| **TabBar 구조** | ✅ | 탭 관리 패턴 유사 |
| **Header 구조** | ✅ | 기본 구조 유사 |
| **middleware.ts** | ✅ | 존재 (경로 리다이렉트) |
| **lang="ko"** | ✅ | 동일 |

---

## 🟡 의도적 차이 (유지)

| 영역 | PMS | DMS | 이유 |
|------|-----|-----|------|
| **인증** | JWT 기반 | 없음 | DMS는 로컬/내부용 |
| **데이터 로드** | API 호출 | Server Action | DMS는 로컬 파일 시스템 |
| **사이드바 접기** | 지원 | 미지원 | DMS는 항상 파일 트리 노출 |
| **Providers** | QueryClientProvider | 없음 | react-query 미사용 |

---

## 🔴 개선 필요 항목 (Phase 7~8)

| 영역 | 현재 상태 | 개선 방향 | Phase |
|------|----------|----------|-------|
| **Root Layout 'use client'** | 클라이언트 컴포넌트 | 서버 컴포넌트로 변경 검토 | 8 |
| **metadata export** | 없음 | SEO를 위해 추가 검토 | 8 |
| **WikiEditor.tsx** | 루트에 남음 | editor/로 이동 | 7 |
| **문서 템플릿** | 없음 | DocumentViewerTemplate 신규 개발 | 7 |
| **MUI 의존성** | 일부 사용 | 제거/대체 검토 | 8 |
| **react-query** | 미사용 | 도입 검토 | 8 |

---

## ✅ 완료된 작업 (Phase 6)

| 항목 | 설명 | 상태 |
|------|------|------|
| 루트 레벨 16개 컴포넌트 | WikiApp, WikiSidebar 등 삭제 | ✅ 완료 |
| 미사용 Hooks 8개 | useContextMenu, useTreeData 등 삭제 | ✅ 완료 |
| 레거시 Stores 5개 | gemini, theme, wiki-ui 등 삭제 | ✅ 완료 |
| 미사용 Utils 2개 | markdownUtils, performanceUtils 삭제 | ✅ 완료 |
| wiki/ 폴더 | ContextMenu.tsx 포함 삭제 | ✅ 완료 |
| index.ts 정리 | hooks, stores export 정리 | ✅ 완료 |
| 빌드 검증 | npm run build 성공 | ✅ 완료 |

---

## ⏭️ 남은 작업 (Phase 7~8)

### Phase 7: 문서 시스템 템플릿 재설계 (진행중)
| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 7-1 | DocumentViewerTemplate 설계 | P1 |
| 7-2 | common/ 컴포넌트 (Breadcrumb, PageHeader, Sidecar) | P1 |
| 7-3 | WikiViewerPage 템플릿 마이그레이션 | P1 |
| 7-4 | DocumentEditorTemplate 설계 | P2 |
| 7-5 | WikiEditor.tsx → editor/ 이동 | P2 |
| 7-6 | 새 문서 생성 기능 구현 | P2 |
| 7-7 | 파일 삭제/이름 변경 (컨텍스트 메뉴) | P2 |

### Phase 8: 디자인 통일 (장기)
| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 8-1 | React Query 도입 검토 | P3 |
| 8-2 | axios 도입 검토 | P3 |
| 8-3 | MUI 제거/대체 검토 | P3 |
| 8-4 | Root Layout 서버 컴포넌트 전환 | P3 |

→ 상세 계획: [package-integration-plan.md](./package-integration-plan.md)

---

## 🔗 관련 문서

- [PMS 앱 초기화 흐름](../../pms/explanation/architecture/app-initialization-flow.md) - 참조 패턴
- [통합 리팩터링 계획서](./package-integration-plan.md) - Phase 6~7 상세
- [완료 내역 아카이브](./package-integration-completed.md) - Phase 0~5
- [PMS-DMS 비교 분석](./pms-dms-comparison-analysis.md) - 4관점 비교
- [패키지 공용화 분석](./package-unification-analysis.md) - 장기 공용화 계획

---

## 📝 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-29 | 초안 작성 - 계획 기반 |
| 2026-01-29 | Phase 3~5 완료 반영 |
| 2026-01-29 | **실제 코드 기반 전면 재작성** - DMS/PMS 상세 비교 |
| 2026-01-29 | **Phase 6 완료 반영** - 레거시 코드 정리, 파일 구조 업데이트 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

