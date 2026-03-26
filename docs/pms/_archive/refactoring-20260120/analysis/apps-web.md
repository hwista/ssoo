# Phase 1.5: apps/web-pms 분석

> 분석일: 2026-01-20  
> 상태: 완료

---

## 📋 분석 대상

| 파일/폴더 | 역할 | 분석 상태 |
|-----------|------|:--------:|
| `package.json` | 패키지 정의 | ✅ |
| `tsconfig.json` | TS 설정 | ✅ |
| `src/app/` | App Router | ✅ |
| `src/components/` | 컴포넌트 | ✅ |
| `src/hooks/` | React 훅 | ✅ |
| `src/lib/` | 라이브러리 | ✅ |
| `src/stores/` | Zustand 스토어 | ✅ |
| `src/types/` | 타입 정의 | ✅ |
| `src/middleware.ts` | 미들웨어 | ✅ |

---

## 1. 전체 구조 분석

### 디렉터리 구조

```
apps/web-pms/src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # 인증 라우트 그룹
│   │   ├── layout.tsx
│   │   └── login/
│   ├── (main)/                    # 메인 라우트 그룹
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx                 # 루트 레이아웃
│   ├── not-found.tsx
│   └── providers.tsx              # QueryClient 프로바이더
│
├── components/
│   ├── index.ts
│   ├── common/                    # 공통 컴포넌트
│   │   ├── DataTable.tsx
│   │   ├── FormComponents.tsx
│   │   ├── PageHeader.tsx
│   │   ├── Pagination.tsx
│   │   ├── StateDisplay.tsx
│   │   └── page/
│   ├── layout/                    # 레이아웃 컴포넌트
│   │   ├── AppLayout.tsx
│   │   ├── ContentArea.tsx
│   │   ├── Header.tsx
│   │   ├── MainSidebar.tsx
│   │   ├── TabBar.tsx
│   │   └── sidebar/               # 사이드바 서브 컴포넌트
│   │       ├── FloatPanel.tsx
│   │       ├── SidebarAdmin.tsx
│   │       ├── SidebarFavorites.tsx
│   │       ├── SidebarMenuTree.tsx
│   │       ├── SidebarOpenTabs.tsx
│   │       └── SidebarSearch.tsx
│   ├── pages/                     # 페이지별 컴포넌트
│   │   └── request/
│   │       └── customer/
│   │           ├── CustomerRequestCreatePage.tsx
│   │           └── CustomerRequestListPage.tsx
│   ├── templates/                 # 템플릿 컴포넌트
│   │   ├── DetailPageTemplate.tsx
│   │   ├── FormPageTemplate.tsx
│   │   ├── ListPageTemplate.tsx
│   │   └── ListPageTemplateV2.tsx
│   └── ui/                        # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ... (17개)
│
├── hooks/
│   ├── index.ts
│   └── queries/                   # TanStack Query 훅
│       ├── index.ts
│       ├── useMenus.ts
│       └── useProjects.ts
│
├── lib/
│   ├── index.ts
│   ├── api/                       # API 클라이언트
│   │   ├── auth.ts
│   │   ├── client.ts              # Axios 인스턴스
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── endpoints/
│   │       ├── menus.ts
│   │       └── projects.ts
│   ├── utils/                     # 유틸리티
│   └── validations/               # Zod 스키마
│
├── stores/                        # Zustand 스토어
│   ├── index.ts
│   ├── auth.store.ts
│   ├── layout.store.ts
│   ├── menu.store.ts
│   ├── sidebar.store.ts
│   └── tab.store.ts
│
├── types/                         # 타입 정의
│   ├── index.ts
│   ├── layout.ts
│   ├── menu.ts
│   ├── sidebar.ts
│   └── tab.ts
│
└── middleware.ts                  # Next.js 미들웨어
```

---

## 2. 핵심 모듈 분석

### 2.1 app/layout.tsx (루트 레이아웃)

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 언어 설정 | ✅ | `lang="ko"` |
| Providers | ✅ | QueryClient 래핑 |

---

### 2.2 app/providers.tsx (QueryClient)

```tsx
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,    // 5분
        gcTime: 5 * 60 * 1000,       // 5분
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| SSR 대응 | ✅ | 서버/브라우저 분기 |
| DevTools | ✅ | 개발환경만 활성화 |
| 설정 | ✅ | 적절한 기본값 |

---

### 2.3 middleware.ts

```typescript
// 허용된 경로만 통과 (현재 루트만)
const allowedPaths = ['/'];

// 그 외 모든 경로는 차단 → 404
return NextResponse.rewrite(new URL('/not-found', request.url));
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 경로 보호 | ⚠️ | 현재 `'/'`만 허용 |
| API 제외 | ✅ | `/api` 경로 통과 |
| 정적 파일 제외 | ✅ | `/_next`, `/static` 제외 |

**참고**: 라우팅이 탭 기반이라 URL 경로를 최소화한 것으로 보임

---

### 2.4 lib/api/client.ts (Axios)

```typescript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// Request: localStorage에서 토큰 읽어서 Authorization 헤더 추가
// Response: 401 시 자동 토큰 갱신 → 실패 시 로그인 페이지 이동
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| baseURL | ✅ | 환경변수 기반 |
| 토큰 자동 추가 | ✅ | localStorage 연동 |
| 401 토큰 갱신 | ✅ | 자동 재시도 |
| 로그아웃 처리 | ✅ | 갱신 실패 시 리다이렉트 |

---

### 2.5 stores/ (Zustand)

#### auth.store.ts

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      
      login: async (loginId, password) => { ... },
      logout: async () => { ... },
      checkAuth: async () => { ... },
      refreshTokens: async () => { ... },
    }),
    {
      name: 'ssoo-auth',  // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| persist | ✅ | localStorage 연동 |
| 토큰 관리 | ✅ | access + refresh |
| 자동 갱신 | ✅ | checkAuth에서 처리 |

#### menu.store.ts

```typescript
export const useMenuStore = create<MenuStore>()((set, get) => ({
  menuTree: [],
  menuMap: new Map(),
  favorites: [],
  isLoading: false,
  
  setMenuTree: (menus) => { ... },
  refreshMenu: async () => { ... },
  getMenuByCode: (menuCode) => { ... },
}));
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 트리 구조 | ✅ | 계층적 메뉴 |
| 맵 캐시 | ✅ | 빠른 조회용 |
| 즐겨찾기 | ✅ | 별도 관리 |

#### tab.store.ts

```typescript
export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      maxTabs: 10,
      
      openTab: (options) => { ... },
      closeTab: (tabId) => { ... },
      activateTab: (tabId) => { ... },
    }),
    { name: 'ssoo-tabs' }
  )
);
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 탭 관리 | ✅ | 열기/닫기/활성화 |
| persist | ✅ | 새로고침 유지 |
| 최대 탭 수 | ✅ | 10개 제한 |

#### sidebar.store.ts / layout.store.ts

| 스토어 | 역할 | 상태 |
|--------|------|:----:|
| sidebar | 접힘/펼침, 플로트 패널 | ✅ |
| layout | 디바이스 타입, 반응형 | ✅ |

---

### 2.6 components/ 구조

#### 컴포넌트 계층

```
components/
├── ui/          # 기본 UI (shadcn/ui) - 원자적
├── common/      # 공통 (DataTable, Pagination) - 분자
├── templates/   # 템플릿 (ListPage, DetailPage) - 유기체
├── layout/      # 레이아웃 (AppLayout, Sidebar)
└── pages/       # 페이지별 컴포넌트
```

| 레벨 | 역할 | 상태 |
|------|------|:----:|
| ui | shadcn/ui 기반 | ✅ (17개) |
| common | 재사용 가능 | ✅ |
| templates | 페이지 골격 | ✅ (4개) |
| layout | 전체 레이아웃 | ✅ |
| pages | 비즈니스 로직 | ✅ |

---

### 2.7 hooks/queries/ (TanStack Query)

```typescript
// useMenus.ts
export const menuKeys = {
  all: ['menus'] as const,
  my: () => [...menuKeys.all, 'my'] as const,
};

export function useMyMenus(options?) {
  return useQuery({
    queryKey: menuKeys.my(),
    queryFn: () => menusApi.getMyMenus(),
    staleTime: 10 * 60 * 1000,  // 10분
  });
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| Query Keys | ✅ | 일관된 키 구조 |
| staleTime | ✅ | 적절한 캐싱 |
| Mutation | ✅ | invalidateQueries 연동 |

---

### 2.8 types/ (로컬 타입)

| 파일 | 정의 내용 |
|------|----------|
| menu.ts | MenuItem, FavoriteMenuItem, AccessType |
| tab.ts | TabItem, OpenTabOptions, TabStoreState |
| sidebar.ts | SidebarSection, SidebarState |
| layout.ts | DeviceType, LayoutState, LAYOUT_SIZES |

**참고**: `@ssoo/types`와 별도로 프론트엔드 전용 타입 정의

---

## 3. 패키지 의존성 분석

### @ssoo/types 사용

```typescript
// project.controller.ts에서 사용
import type { CreateProjectDto } from '@ssoo/types';

// 그러나 대부분 로컬 타입 사용
import type { MenuItem } from '@/types';
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| @ssoo/types 사용 | ⚠️ | 제한적 사용 |
| 로컬 타입 | ✅ | 프론트 전용 타입 분리 |

---

## 4. 라우팅 분석

### Route Groups

```
app/
├── (auth)/         # 인증 관련 (로그인)
│   └── login/
└── (main)/         # 메인 앱
    └── page.tsx    # 대시보드
```

### 탭 기반 라우팅

실제 페이지 네비게이션은 **탭 시스템**을 통해 처리:
- URL은 `/`로 고정
- 컨텐츠는 `tab.store`의 활성 탭에 따라 동적 렌더링
- 사이드바 메뉴 클릭 → `openTab()` → 탭 추가/활성화

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 탭 기반 | ✅ | 그룹웨어 스타일 UI |
| URL 고정 | ⚠️ | 딥링크/북마크 제한 |
| 상태 유지 | ✅ | 탭별 상태 유지 |

---

## 5. 발견된 이슈

### 5.1 심각도 낮음 🟢

| # | 내용 | 위치 | 영향 |
|---|------|------|------|
| 1 | @ssoo/types 제한적 사용 | 전반 | 타입 불일치 가능 |
| 2 | 로컬 타입과 공유 타입 혼용 | types/ | 혼란 가능 |
| 3 | 딥링크 미지원 | 탭 시스템 | UX 제한 (의도적) |

### 5.2 확인 필요

| # | 내용 | 위치 |
|---|------|------|
| 1 | components/index.ts 내용 확인 | 전체 export |
| 2 | 미사용 컴포넌트 존재 여부 | components/ |

---

## 6. 전체 구조 다이어그램

```
apps/web-pms/
├── package.json             ✅ Next.js 15 + React 19
├── tsconfig.json            ✅ Bundler resolution
│
└── src/
    ├── app/                 ✅ App Router
    │   ├── (auth)/          ✅ 로그인 라우트 그룹
    │   ├── (main)/          ✅ 메인 라우트 그룹
    │   ├── layout.tsx       ✅ 루트 레이아웃
    │   └── providers.tsx    ✅ QueryClient
    │
    ├── components/          ✅ 계층적 구조
    │   ├── ui/              ✅ shadcn/ui (17개)
    │   ├── common/          ✅ 공통 (7개)
    │   ├── templates/       ✅ 템플릿 (4개)
    │   ├── layout/          ✅ 레이아웃 (6개 + sidebar/)
    │   └── pages/           ✅ 페이지별
    │
    ├── hooks/               ✅ TanStack Query 훅
    │   └── queries/
    │
    ├── lib/                 ✅ API + 유틸
    │   ├── api/             ✅ Axios 클라이언트
    │   ├── utils/
    │   └── validations/
    │
    ├── stores/              ✅ Zustand (5개)
    │   ├── auth.store.ts
    │   ├── menu.store.ts
    │   ├── tab.store.ts
    │   ├── sidebar.store.ts
    │   └── layout.store.ts
    │
    ├── types/               ✅ 프론트 전용 타입
    │
    └── middleware.ts        ✅ 경로 보호
```

---

## 📊 분석 요약

### 현재 상태 평가

| 영역 | 점수 | 비고 |
|------|:----:|------|
| 전체 구조 | 9/10 | 잘 정리됨 |
| 컴포넌트 계층 | 9/10 | 명확한 분리 |
| 상태 관리 | 9/10 | Zustand + Query 조합 |
| API 클라이언트 | 9/10 | 토큰 자동 갱신 |
| 타입 관리 | 7/10 | 로컬/공유 혼용 |
| **종합** | **8.6/10** | 우수 |

### 권장 조치

1. **현재 상태 유지 가능** - 잘 구성됨
2. **선택적 개선**
   - 로컬 타입과 @ssoo/types 관계 정리
   - 미사용 컴포넌트 정리 (있다면)

---

## ✅ 분석 완료 체크

- [x] package.json
- [x] tsconfig.json
- [x] app/ 구조
- [x] components/ 계층
- [x] hooks/queries/
- [x] lib/api/
- [x] stores/
- [x] types/
- [x] middleware.ts

---

## 📎 다음 단계

→ Phase 1 분석 완료  
→ [Phase 2: 계획 수립](../plans/) 시작
