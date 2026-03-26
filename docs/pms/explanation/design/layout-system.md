# 레이아웃 시스템 (Layout System)

SSOO 프론트엔드의 레이아웃 구조 및 컴포넌트 문서입니다.

## 전체 구조

```
┌──────────────────────────────────────────────────────────┐
│                     Browser Window                        │
├─────────────┬────────────────────────────────────────────┤
│             │                Header (60px)               │
│             ├────────────────────────────────────────────┤
│   Sidebar   │              TabBar (53px)                 │
│  (56/340px) ├────────────────────────────────────────────┤
│             │                                            │
│             │             ContentArea                     │
│             │                                            │
│             │                                            │
└─────────────┴────────────────────────────────────────────┘
```

## 주요 치수

- TabBar 컨테이너 높이: 53px

```typescript
const LAYOUT_SIZES = {
  sidebar: {
    expandedWidth: 340,   // 펼친 사이드바
    collapsedWidth: 56,   // 접은 사이드바
  },
  header: {
    height: 60,           // 상단 헤더
  },
  tabBar: {
    height: 36,           // 탭 컨트롤 높이 (컨테이너는 53px)
    tabMinWidth: 120,
    tabMaxWidth: 200,
  },
};
```

---

## 컴포넌트 계층

```
AppLayout
├── Sidebar
│   ├── Header (로고, 토글 버튼)
│   ├── CollapsedSidebar (접힌 상태)
│   │   └── 아이콘 버튼들
│   ├── ExpandedSidebar (펼친 상태)
│   │   ├── Search (검색창 - 고정)
│   │   ├── ScrollArea
│   │   │   ├── Favorites (즐겨찾기 섹션)
│   │   │   ├── OpenTabs (현재 열린 페이지 섹션)
│   │   │   ├── MenuTree (메뉴 탐색 섹션)
│   │   │   └── AdminMenu (관리자 섹션, isAdmin만)
│   │   └── Footer (카피라이트 - 고정)
│   └── FloatingPanel (접힌 상태에서 hover 시)
├── Header (상단 바)
├── TabBar (MDI 탭)
└── ContentArea (페이지 렌더링)
```

---

## AppLayout

메인 앱의 루트 레이아웃 컴포넌트입니다.

### 파일 위치

`apps/web/pms/src/components/layout/AppLayout.tsx`

### 구조

```tsx
<div className="flex h-screen overflow-hidden bg-gray-50">
  {/* 사이드바 - 고정 위치 */}
  <MainSidebar />

  {/* 메인 컨텐츠 영역 */}
  <div style={{ marginLeft: sidebarWidth }}>
    <Header />
    <TabBar />
    <ContentArea>{children}</ContentArea>
  </div>
</div>
```

### 반응형 처리

- **Desktop**: 기본 레이아웃
- **Mobile**: "모바일 버전 준비 중" 메시지 표시 (추후 개발)

---

## Sidebar

사이드바 컴포넌트입니다. 두 가지 상태를 가집니다.

### 파일 위치

`apps/web/pms/src/components/layout/sidebar/`

```
sidebar/
├── index.ts
├── Sidebar.tsx           # 메인 컴포넌트
├── CollapsedSidebar.tsx  # 접힌 상태
├── ExpandedSidebar.tsx   # 펼친 상태
├── FloatingPanel.tsx     # 플로팅 패널
├── Section.tsx           # 섹션 컴포넌트
├── Search.tsx            # 검색 컴포넌트
├── Favorites.tsx         # 즐겨찾기 섹션
├── OpenTabs.tsx          # 열린 탭 섹션
├── MenuTree.tsx          # 메뉴 트리 섹션
├── AdminMenu.tsx         # 관리자 메뉴 섹션
└── constants.ts          # 섹션 아이콘 상수
```

### 상태별 구조

#### 펼친 상태 (340px)

```
┌─────────────────────┐
│ 🏠 SSOO    [<<]     │  Header (60px)
├─────────────────────┤
│ 🔍 검색...           │  Search (고정)
├─────────────────────┤
│ ▼ 즐겨찾기           │
│   ⭐ 프로젝트 목록    │
│                     │
│ ▼ 현재 열린 페이지    │  ScrollArea
│   📄 요청서 작성      │  (스크롤 가능)
│                     │
│ ▼ 메뉴 탐색          │
│   📁 프로젝트        │
│     └ 요청          │
│     └ 제안          │
│                     │
│ ▼ 관리자            │
│   ⚙️ 사용자 관리     │
├─────────────────────┤
│ v1.0.0              │  Footer (고정)
│ © 2026 HWISTA       │
└─────────────────────┘
```

#### 접힌 상태 (56px)

```
┌────┐
│ 🏠 │ Header
├────┤
│ ⭐ │ 즐겨찾기
│ 📄 │ 열린 페이지
│ 📁 │ 메뉴 탐색
│ ⚙️ │ 관리자 (isAdmin)
├────┤
│ >> │ 펼치기 버튼
└────┘
```

### 플로팅 패널

접힌 상태에서 아이콘 hover 시 나타나는 플로팅 패널입니다.

```typescript
const FLOAT_PANEL_CONFIG = {
  width: 288,      // w-72 기준
  openDelay: 100,  // hover 후 100ms 후 열림
  closeDelay: 300, // leave 후 300ms 후 닫힘
};
```

### 4개 섹션

| 섹션 | 아이콘 | 설명 |
|------|--------|------|
| `favorites` | ⭐ Star | 즐겨찾기 메뉴 |
| `openTabs` | 📄 FileText | 현재 열린 페이지 (Home 제외) |
| `menuTree` | 📁 FolderTree | 전체 메뉴 트리 |
| `admin` | ⚙️ Settings | 관리자 메뉴 (isAdmin만) |

---

## Header

상단 헤더 컴포넌트입니다.

### 파일 위치

`apps/web/pms/src/components/layout/Header.tsx`

### 구성 요소

```
┌─────────────────────────────────────────────────────────┐
│ [Breadcrumb]                          [Alarm] [Profile] │
└─────────────────────────────────────────────────────────┘
```

- **Breadcrumb**: 현재 위치 표시 (추후 개발)
- **Alarm**: 알림 버튼
- **Profile**: 사용자 프로필 드롭다운

---

## TabBar

MDI(Multiple Document Interface) 탭바 컴포넌트입니다.

### 파일 위치

`apps/web/pms/src/components/layout/TabBar.tsx`

### 구성 요소

```
┌───────────────────────────────────────────────────────────┐
│ [🏠] [프로젝트 목록 ×] [요청서 작성 ×] [제안서 검토 ×]     │
└───────────────────────────────────────────────────────────┘
```

### 특징

- **Home 탭**: 항상 첫 번째, 닫기 불가, 아이콘만 표시
- **일반 탭**: 제목 + 닫기 버튼
- **스크롤**: 탭이 많으면 좌우 화살표로 스크롤
- **최대 탭 수**: 16개 (초과 시 가장 오래된 탭 자동 닫힘)

---

## ContentArea

활성 탭의 페이지를 렌더링하는 영역입니다.

### 파일 위치

`apps/web/pms/src/components/layout/ContentArea.tsx`

### 동작 방식

1. `activeTabId`에 해당하는 탭 찾기
2. 탭의 `path`로 페이지 컴포넌트 매핑
3. `React.lazy`로 동적 로딩
4. `Suspense`로 로딩 상태 처리

### 페이지 매핑

```typescript
const pageComponents = {
  '/home': lazy(() => import('@/components/pages/home/HomeDashboardPage')),
  '/request': lazy(() => import('@/components/pages/request/RequestListPage')),
  '/request/create': lazy(() => import('@/components/pages/request/RequestCreatePage')),
  '/proposal': lazy(() => import('@/components/pages/proposal/ProposalListPage')),
  // ...
};
```

### Next.js 라우팅과의 관계

- 탭으로 열린 페이지: `pageComponents`에서 렌더링
- 직접 URL 접근: Next.js App Router 사용 (`/app` 폴더)

---

## 스크롤바 스타일

사이드바와 콘텐츠 영역에 커스텀 스크롤바를 적용합니다.

### CSS 유틸리티

```css
/* 크기 */
.scrollbar-thin { width: 4px; }
.scrollbar-default { width: 8px; }

/* 색상 */
.scrollbar-primary { thumb: primary color }
.scrollbar-transparent { thumb: transparent, hover: visible }

/* 프리셋 */
.scrollbar-sidebar { 사이드바용 스타일 }
.scrollbar-table { 테이블용 스타일 }
```

### ScrollArea 컴포넌트

```tsx
<ScrollArea variant="sidebar" showOnHover>
  {/* 스크롤 가능한 콘텐츠 */}
</ScrollArea>
```

➡️ [스크롤바 문서](./scrollbar.md)

---

## 관련 파일

### 컴포넌트

- `apps/web/pms/src/components/layout/AppLayout.tsx`
- `apps/web/pms/src/components/layout/sidebar/`
- `apps/web/pms/src/components/layout/Header.tsx`
- `apps/web/pms/src/components/layout/TabBar.tsx`
- `apps/web/pms/src/components/layout/ContentArea.tsx`

### Store

- `apps/web/pms/src/stores/sidebar.store.ts`
- `apps/web/pms/src/stores/layout.store.ts`
- `apps/web/pms/src/stores/tab.store.ts`

### 타입 정의

- `apps/web/pms/src/types/layout.ts`

## 관련 문서

- [상태 관리](./state-management.md)
- [스크롤바 시스템](./scrollbar.md)
- [메뉴 구조](../explanation/domain/menu-structure.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| LAY-01 | 모바일 레이아웃 구현 | P2 | 🔲 대기 |
| LAY-02 | 페이지 컴포넌트 문서화 (Home, Request 등) | P3 | 🔲 대기 |
| LAY-03 | Header 브레드크럼 구현 | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-02 | 최대 탭 수 16으로 수정, sidebar/ 폴더 경로 정합 |
| 2026-01-22 | 사이드바/탭바 치수 및 플로팅 패널 설정 정합화 |
| 2026-01-21 | 레이아웃 시스템 문서 최초 작성 |
| 2026-01-21 | 사이드바 스크롤 영역 검색란 아래로 한정 |
| 2026-01-21 | 사이드바 하단 카피라이트 영역 추가 |
| 2026-01-21 | 접힌 사이드바 관리자 메뉴 표시 수정 |
