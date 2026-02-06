# 상태 관리 (State Management)

Zustand를 사용한 클라이언트 상태 관리 문서입니다.

## 개요

SSOO 프론트엔드는 **Zustand**를 사용하여 전역 상태를 관리합니다.

### 선택 이유

- 간단한 API (Redux 대비 보일러플레이트 감소)
- TypeScript 친화적
- React 외부에서도 상태 접근 가능
- DevTools 지원
- 미들웨어 (persist, immer 등) 지원

### 파일 위치

```
apps/web/pms/src/stores/
├── auth.store.ts      # 인증 상태
├── confirm.store.ts   # 전역 Confirm Dialog
├── index.ts           # 배럴 export
├── layout.store.ts    # 레이아웃/반응형 상태
├── menu.store.ts      # 메뉴/즐겨찾기 상태
├── sidebar.store.ts   # 사이드바 UI 상태
└── tab.store.ts       # 탭 상태
```

---

## Store 목록

| Store | 용도 | 영속성 |
|-------|------|--------|
| `useAuthStore` | 인증, 토큰, 사용자 정보 | localStorage |
| `useConfirmStore` | 전역 Confirm Dialog | 없음 |
| `useMenuStore` | 메뉴 트리, 즐겨찾기 | 없음 (API 조회) |
| `useTabStore` | 열린 탭, 활성 탭 | sessionStorage |
| `useSidebarStore` | 사이드바 접힘, 섹션 펼침 | 없음 |
| `useLayoutStore` | 디바이스 타입, 모바일 메뉴 | 없음 |

---

## useAuthStore

사용자 인증 상태를 관리합니다.

### State

```typescript
interface AuthState {
  accessToken: string | null;      // JWT 액세스 토큰
  refreshToken: string | null;     // JWT 리프레시 토큰
  user: AuthUser | null;           // 로그인한 사용자 정보
  isLoading: boolean;              // 인증 처리 중 여부
  isAuthenticated: boolean;        // 인증 여부
}

interface AuthUser {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean;
}
```

### Actions

| 액션 | 설명 |
|------|------|
| `login(loginId, password)` | 로그인 (API 호출 → 토큰 저장 → 사용자 정보 조회) |
| `logout()` | 로그아웃 (API 호출 → 상태 초기화) |
| `checkAuth()` | 인증 상태 확인 (토큰 유효성 검사) |
| `refreshTokens()` | 토큰 갱신 |
| `setTokens(access, refresh)` | 토큰 직접 설정 |
| `setUser(user)` | 사용자 정보 설정 |
| `clearAuth()` | 인증 상태 초기화 |

### 사용 예시

```tsx
import { useAuthStore } from '@/stores/auth.store';

// 컴포넌트에서 사용
function LoginForm() {
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async () => {
    await login(loginId, password);
  };
}

// 컴포넌트 외부에서 사용
const isAuthenticated = useAuthStore.getState().isAuthenticated;
```

### 영속성

- **저장소**: localStorage
- **키**: `ssoo-auth`
- **저장 항목**: accessToken, refreshToken, user, isAuthenticated

---

## useMenuStore

메뉴 트리와 즐겨찾기를 관리합니다.

### State

```typescript
interface MenuStoreState {
  generalMenus: MenuItem[];           // 일반 메뉴 트리
  adminMenus: MenuItem[];             // 관리자 메뉴 트리
  menuMap: Map<string, MenuItem>;     // 메뉴 코드 → 메뉴 맵 (빠른 조회)
  favorites: FavoriteMenuItem[];      // 즐겨찾기 목록
  isLoading: boolean;                 // 로딩 상태
  lastUpdatedAt: Date | null;         // 마지막 갱신 시각
}
```

### Actions

| 액션 | 설명 |
|------|------|
| `setMenus(general, admin)` | 메뉴 트리 설정 |
| `setFavorites(favorites)` | 즐겨찾기 설정 |
| `isFavorite(menuId)` | 즐겨찾기 여부 확인 |
| `addFavorite(item)` | 즐겨찾기 추가 (API 호출) |
| `removeFavorite(menuId)` | 즐겨찾기 삭제 (API 호출) |
| `refreshMenu()` | 메뉴 새로고침 (API 호출) |
| `getMenuAccess(menuCode)` | 메뉴 권한 조회 |
| `getMenuByCode(menuCode)` | 메뉴 코드로 조회 |
| `clearMenu()` | 메뉴 초기화 |

### 사용 예시

```tsx
import { useMenuStore } from '@/stores/menu.store';

function Sidebar() {
  const { generalMenus, favorites, addFavorite } = useMenuStore();

  const handleAddFavorite = async (menu) => {
    await addFavorite({
      menuId: menu.menuId,
      menuCode: menu.menuCode,
      menuName: menu.menuName,
      menuPath: menu.menuPath,
      icon: menu.icon,
    });
  };
}
```

### 메뉴 구조

```typescript
interface MenuItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
  menuLevel: number;
  parentMenuId: string | null;
  children: MenuItem[];
  accessType?: AccessType;
}
```

---

## useTabStore

브라우저 탭 시스템을 관리합니다.

### State

```typescript
interface TabStoreState {
  tabs: TabItem[];          // 열린 탭 목록
  activeTabId: string | null; // 현재 활성 탭 ID
  maxTabs: number;          // 최대 탭 수 (기본: 16)
}

interface TabItem {
  id: string;               // 탭 고유 ID (menuCode + params)
  menuCode: string;         // 메뉴 코드
  menuId: string;           // 메뉴 ID
  title: string;            // 탭 제목
  icon: string | null;      // 아이콘
  path: string;             // 라우트 경로
  closable: boolean;        // 닫기 가능 여부
  params?: Record<string, string>; // 탭별 파라미터
  openedAt: Date;           // 열린 시각
  lastActiveAt: Date;       // 마지막 활성 시각
}
```

### Actions

| 액션 | 설명 |
|------|------|
| `openTab(options)` | 탭 열기 |
| `closeTab(tabId)` | 탭 닫기 |
| `closeAllTabs()` | 모든 탭 닫기 (고정 탭 제외) |
| `closeOtherTabs(tabId)` | 다른 탭 모두 닫기 |
| `activateTab(tabId)` | 탭 활성화 |
| `updateTabTitle(tabId, title)` | 탭 제목 변경 |
| `updateTabData(tabId, data)` | 탭 데이터 업데이트 |
| `reorderTabs(from, to)` | 탭 순서 변경 |
| `getTabByMenuCode(code, params)` | 메뉴 코드로 탭 조회 |

### Home 탭

```typescript
const HOME_TAB = {
  menuCode: 'HOME',
  menuId: 'home',
  title: 'Home',
  icon: 'Home',
  path: '/home',
  closable: false,  // 닫기 불가
};
```

### 사용 예시

```tsx
import { useTabStore } from '@/stores/tab.store';

function MenuTree() {
  const { openTab } = useTabStore();

  const handleMenuClick = (menu) => {
    openTab({
      menuCode: menu.menuCode,
      menuId: menu.menuId,
      title: menu.menuName,
      icon: menu.icon,
      path: menu.menuPath,
    });
  };
}
```

### 영속성

- **저장소**: sessionStorage
- **키**: `ssoo-tabs`
- **저장 항목**: tabs, activeTabId
- **특징**: 브라우저 탭/창 닫으면 초기화

---

## useSidebarStore

사이드바 UI 상태를 관리합니다.

### State

```typescript
interface SidebarState {
  isCollapsed: boolean;               // 사이드바 접힘 여부
  activeFloatSection: SidebarSection | null; // 활성 플로팅 섹션
  expandedSections: SidebarSection[]; // 펼쳐진 섹션 목록
  searchQuery: string;                // 검색어
  expandedMenuIds: Set<string>;       // 펼쳐진 메뉴 ID 목록
}

type SidebarSection = 'favorites' | 'openTabs' | 'menuTree' | 'admin';
```

### Actions

| 액션 | 설명 |
|------|------|
| `toggleCollapse()` | 사이드바 접기/펼치기 토글 |
| `setCollapsed(collapsed)` | 접힘 상태 설정 |
| `openFloatSection(section)` | 플로팅 패널 열기 |
| `closeFloatSection()` | 플로팅 패널 닫기 |
| `toggleSection(section)` | 섹션 접기/펼치기 |
| `setExpandedSections(sections)` | 펼쳐진 섹션 설정 |
| `setSearchQuery(query)` | 검색어 설정 |
| `clearSearch()` | 검색어 초기화 |
| `toggleMenuExpand(menuId)` | 메뉴 트리 항목 토글 |
| `expandMenu(menuId)` | 메뉴 펼치기 |
| `collapseMenu(menuId)` | 메뉴 접기 |
| `collapseAllMenus()` | 모든 메뉴 접기 |

### 사이드바 구조

```
┌────────────────────┐
│  Header (로고)      │
├────────────────────┤
│  Search (검색)      │  ← 고정 (섹션 포함)
├────────────────────┤
│  ┌ 즐겨찾기         │  ↕
│  ├ 현재 열린 페이지  │  스
│  ├ 메뉴 탐색        │  크
│  └ 관리자           │  롤
├────────────────────┤
│  Footer (카피라이트) │  ← 고정
└────────────────────┘
```

---

## useLayoutStore

반응형 레이아웃 상태를 관리합니다.

### State

```typescript
interface LayoutState {
  deviceType: DeviceType;       // 'mobile' | 'desktop'
  isMobileMenuOpen: boolean;    // 모바일 메뉴 열림 여부
}

const BREAKPOINTS = {
  mobile: 768,  // 768px 미만 → mobile
};
```

### Actions

| 액션 | 설명 |
|------|------|
| `setDeviceType(type)` | 디바이스 타입 설정 |
| `toggleMobileMenu()` | 모바일 메뉴 토글 |
| `closeMobileMenu()` | 모바일 메뉴 닫기 |

### 자동 감지

```typescript
// 윈도우 리사이즈 시 자동으로 deviceType 업데이트
window.addEventListener('resize', () => {
  const newType = window.innerWidth < 768 ? 'mobile' : 'desktop';
  useLayoutStore.setState({ deviceType: newType });
});
```

---

## Store 간 상호작용

```
┌─────────────┐
│  AuthStore  │ ─── 로그인 후 ───> MenuStore.refreshMenu()
└─────────────┘                              │
       │                                     ↓
       │ 로그아웃 시               ┌─────────────┐
       └───────────────────────────>│  MenuStore  │
                                   └─────────────┘
                                          │
                                          │ 메뉴 클릭 시
                                          ↓
                                   ┌─────────────┐
                                   │  TabStore   │
                                   └─────────────┘
                                          │
                                          │ 탭 활성화 시
                                          ↓
                                   ┌──────────────┐
                                   │ SidebarStore │ ← 펼침/접힘
                                   └──────────────┘
```

---

## 구현 파일

- `apps/web/pms/src/stores/auth.store.ts`
- `apps/web/pms/src/stores/confirm.store.ts`
- `apps/web/pms/src/stores/menu.store.ts`
- `apps/web/pms/src/stores/tab.store.ts`
- `apps/web/pms/src/stores/sidebar.store.ts`
- `apps/web/pms/src/stores/layout.store.ts`

---

## useConfirmStore

전역 Confirm Dialog를 관리합니다. `Promise` 기반으로 비동기적으로 사용자 확인을 받을 수 있습니다.

### State

```typescript
interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;  // 기본: '확인'
  cancelText?: string;   // 기본: '취소'
}
```

### Actions

| 액션 | 설명 |
|------|------|
| `confirm(options)` | Confirm Dialog 열기 (Promise 반환) |
| `handleConfirm()` | 확인 버튼 클릭 처리 |
| `handleCancel()` | 취소 버튼 클릭 처리 |

### 사용 예시

```tsx
import { useConfirmStore } from '@/stores/confirm.store';

function MyComponent() {
  const { confirm } = useConfirmStore();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '삭제 확인',
      description: '정말 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
    });
    
    if (confirmed) {
      // 삭제 실행
    }
  };
}
```

### 영속성

없음 (UI 상태만 관리)

---

## 관련 문서

- [인증 시스템](../../common/explanation/architecture/auth-system.md)
- [메뉴 구조](../explanation/domain/menu-structure.md)
- [레이아웃 시스템](./layout-system.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| STM-01 | 타입 정의 전용 문서 작성 | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-02 | useConfirmStore 추가, maxTabs 16으로 수정, expandedMenuIds 타입 수정, SidebarSection에서 search 제거 |
| 2026-01-22 | Sidebar 섹션 타입에 search 추가 정합화 |
| 2026-01-21 | 메뉴 응답 필드명 정합화 (menuId/icon/menuLevel/parentMenuId) |
| 2026-01-21 | 즐겨찾기 순서 변경 항목 제거 (API 미지원) |
| 2026-01-21 | 상태 관리 문서 최초 작성 |
| 2026-01-21 | 즐겨찾기 DB 연동 (addFavorite, removeFavorite API 호출) |
| 2026-01-21 | 현재 열린 페이지에서 홈 탭 제외 |
