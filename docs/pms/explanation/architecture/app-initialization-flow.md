# PMS 앱 초기화 흐름

> **작성일**: 2026-01-29  
> **목적**: PMS 앱의 컴포넌트 인스턴스 생성부터 렌더링까지의 전체 흐름 정리

---

## 📊 초기화 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Root Layout (app/layout.tsx)                                              │
│    ├─ 메타데이터 설정 (title, description)                                    │
│    └─ <Providers>                                                            │
│         └─ QueryClientProvider (React Query)                                 │
│              └─ {children}                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Main Layout (app/(main)/layout.tsx)                                       │
│    ├─ useEffect #1: checkAuth() → 토큰 검증                                   │
│    │     └─ accessToken 유효성 → isAuthenticated, user 설정                   │
│    ├─ 조건부 렌더링:                                                          │
│    │     ├─ (isChecking || authLoading) → 로딩 스피너                         │
│    │     ├─ (!isAuthenticated) → 로그인 폼 표시                               │
│    │     └─ (isAuthenticated) → AppLayout 렌더링                              │
│    ├─ useEffect #2: 인증 후 refreshMenu() → 메뉴 API 호출                     │
│    └─ return <AppLayout>{children}</AppLayout>                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. AppLayout (components/layout/AppLayout.tsx)                               │
│    ├─ useLayoutStore: sidebarWidth, isMobileMenuOpen                         │
│    ├─ 레이아웃 구조:                                                          │
│    │     ├─ Sidebar (고정 너비 또는 리사이즈 가능)                              │
│    │     ├─ Main Area (flex-1)                                               │
│    │     │     ├─ Header                                                     │
│    │     │     ├─ TabBar                                                     │
│    │     │     └─ ContentArea                                                │
│    │     └─ SidebarResizer (드래그로 너비 조절)                                │
│    └─ 모바일: MobileMenuOverlay                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Sidebar (components/layout/sidebar/Sidebar.tsx)                           │
│    ├─ 헤더: 로고 + 접기 버튼                                                   │
│    ├─ 빠른 액세스 (Favorites)                                                 │
│    ├─ MenuTree: 메뉴 트리 렌더링                                            │
│    │     └─ useMenuStore.generalMenus/adminMenus                             │
│    └─ 사용자 정보 + 로그아웃                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. ContentArea (components/layout/ContentArea.tsx)                           │
│    ├─ pageComponents 매핑 (React.lazy 동적 import)                            │
│    │     ├─ '/home': HomeDashboardPage                                       │
│    │     ├─ '/request': RequestListPage                                      │
│    │     ├─ '/request/create': RequestCreatePage                             │
│    │     ├─ '/proposal': ProposalListPage                                    │
│    │     ├─ '/execution': ExecutionListPage                                  │
│    │     └─ '/transition': TransitionListPage                                │
│    ├─ activeTab.path로 컴포넌트 결정                                          │
│    └─ <Suspense><PageComponent /></Suspense>                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. 메뉴 클릭 시 (MenuTree → handleMenuClick)                                    │
│    └─ openTab({ path: '/request', title: '의뢰', ... })                       │
│         └─ ContentArea 리렌더링 → RequestListPage 로딩                        │
│              └─ 페이지 컴포넌트가 자체적으로 데이터 fetch                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ 핵심 파일 구조

```
apps/web/pms/src/
├── app/
│   ├── layout.tsx              # Root Layout (Providers)
│   ├── providers.tsx           # QueryClientProvider 설정
│   ├── (main)/
│   │   ├── layout.tsx          # Auth 체크 + AppLayout 렌더링
│   │   ├── page.tsx            # Home 페이지 (/ 라우트)
│   │   ├── request/page.tsx    # 얇은 래퍼
│   │   ├── proposal/page.tsx
│   │   ├── execution/page.tsx
│   │   └── transition/page.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx       # 메인 레이아웃 컨테이너
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── ContentArea.tsx     # 동적 페이지 로딩
│   │   └── sidebar/
│   │       ├── Sidebar.tsx
│   │       ├── CollapsedSidebar.tsx
│   │       ├── ExpandedSidebar.tsx
│   │       ├── FloatingPanel.tsx
│   │       ├── Section.tsx
│   │       ├── Search.tsx
│   │       ├── Favorites.tsx
│   │       ├── OpenTabs.tsx
│   │       ├── MenuTree.tsx        # 메뉴 트리
│   │       ├── AdminMenu.tsx
│   │       └── constants.ts
│   └── pages/                  # 실제 비즈니스 페이지
│       ├── home/
│       │   └── HomeDashboardPage.tsx
│       ├── request/
│       │   ├── RequestListPage.tsx
│       │   └── RequestCreatePage.tsx
│       ├── proposal/
│       │   └── ProposalListPage.tsx
│       ├── execution/
│       │   └── ExecutionListPage.tsx
│       └── transition/
│           └── TransitionListPage.tsx
└── stores/
    ├── auth.store.ts           # 인증 상태
    ├── confirm.store.ts        # 전역 Confirm Dialog
    ├── index.ts                # 배럴 export
    ├── menu.store.ts           # 메뉴 트리, 즐겨찾기
    ├── tab.store.ts            # 탭 상태
    ├── sidebar.store.ts        # 사이드바 UI
    └── layout.store.ts         # 레이아웃 상태
```

---

## 🔄 Store 간 연동 흐름

### 1. 인증 흐름

```
┌──────────────┐    checkAuth()    ┌──────────────┐
│  AuthStore   │ ◄──────────────── │ Main Layout  │
│              │                   │              │
│ accessToken  │                   │ isChecking   │
│ user         │                   │              │
│ isAuth       │ ────────────────► │ 조건부 렌더  │
└──────────────┘                   └──────────────┘
       │
       │ authenticated
       ▼
┌──────────────┐
│  MenuStore   │ ◄── refreshMenu() API 호출
│              │
│ generalMenus │
│ adminMenus   │
│ favorites    │
└──────────────┘
```

### 2. 네비게이션 흐름

```
┌─────────────────┐   openTab()   ┌──────────────┐
│ SidebarMenuTree │ ────────────► │   TabStore   │
│                 │               │              │
│ handleMenuClick │               │ tabs[]       │
└─────────────────┘               │ activeTabId  │
                                  └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ ContentArea  │
                                  │              │
                                  │ pageComp[path]│
                                  │ <PageComp /> │
                                  └──────────────┘
```

### 3. 레이아웃 상태 흐름

```
┌──────────────┐                  ┌─────────────────┐
│ LayoutStore  │ ◄────────────────│ SidebarResizer  │
│              │  setSidebarWidth │                 │
│ sidebarWidth │                  │ onDrag          │
│ deviceType   │                  └─────────────────┘
│              │
│              │                  ┌─────────────────┐
│              │ ◄────────────────│ AppLayout       │
│              │  initDevice      │                 │
└──────────────┘                  │ useEffect       │
       │                          └─────────────────┘
       │
       ▼
┌──────────────┐  ┌──────────────┐
│   Sidebar    │  │ ContentArea  │
│ width={...}  │  │ flex-1       │
└──────────────┘  └──────────────┘
```

---

## 📋 컴포넌트별 주요 역할

### Root Layout (`app/layout.tsx`)
- HTML 문서 기본 구조
- Providers 래핑 (React Query)
- 전역 메타데이터

### Main Layout (`app/(main)/layout.tsx`)
- **인증 게이트**: 비인증 시 로그인 폼
- **메뉴 초기화**: 인증 성공 후 메뉴 로드
- AppLayout으로 자식 렌더링

### AppLayout (`components/layout/AppLayout.tsx`)
- 전체 레이아웃 구성 (Sidebar + Main)
- 반응형 처리 (모바일 메뉴)
- 사이드바 리사이즈 로직

### ContentArea (`components/layout/ContentArea.tsx`)
- **핵심**: `pageComponents` 객체로 동적 페이지 로딩
- `activeTab.path`에 따라 컴포넌트 결정
- Suspense로 로딩 상태 처리

### SidebarMenuTree (`components/layout/sidebar/SidebarMenuTree.tsx`)
- 메뉴 트리 렌더링
- 클릭 시 `openTab()` 호출
- **데이터 로딩 책임 없음** (페이지가 자체 로드)

---

## ⚡ 핵심 패턴: pageComponents 동적 로딩

```typescript
// ContentArea.tsx
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/home': lazy(() => import('@/components/pages/home/HomeDashboardPage')),
  '/request': lazy(() => import('@/components/pages/request/RequestListPage')),
  '/request/create': lazy(() => import('@/components/pages/request/RequestCreatePage')),
  '/proposal': lazy(() => import('@/components/pages/proposal/ProposalListPage')),
  '/execution': lazy(() => import('@/components/pages/execution/ExecutionListPage')),
  '/transition': lazy(() => import('@/components/pages/transition/TransitionListPage')),
};

// 렌더링
const PageComponent = pageComponents[activeTab.path];
return (
  <Suspense fallback={<Loading />}>
    <PageComponent />
  </Suspense>
);
```

### 장점
1. **코드 분할**: 각 페이지는 필요할 때만 로드
2. **책임 분리**: 메뉴는 탭만 열고, 페이지가 데이터 로드
3. **URL 보안**: Next.js 라우트 구조 최소 노출
4. **일관성**: 모든 페이지 동일한 방식으로 로딩

---

## 🔗 관련 문서

- [페이지 보안 및 라우팅 전략](./page-routing.md)
- [상태 관리](./state-management.md)
- [레이아웃 시스템](./layout-system.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

