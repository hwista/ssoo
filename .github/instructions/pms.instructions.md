---
applyTo: "apps/web/pms/**"
---

# PMS 프론트엔드 개발 규칙

> 이 규칙은 `apps/web/pms/` 경로의 파일 작업 시 적용됩니다.

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives)
- Zustand 5.x (클라이언트 상태), TanStack Query 5.x (서버 상태)
- TanStack Table 8.x, React Hook Form + Zod

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # Route Handlers
│   └── layout.tsx
├── components/
│   ├── ui/                # Level 1 - shadcn/ui 기반 원자
│   ├── common/            # Level 2 - 재사용 가능한 조합
│   │   ├── datagrid/      # DataGrid, Pagination
│   │   ├── form/          # FormSection, FormField
│   │   └── page/          # Breadcrumb, Header, FilterBar
│   ├── templates/         # Level 3 - 페이지 템플릿
│   ├── layout/            # 레이아웃 (Sidebar, Header, TabBar)
│   └── pages/             # 비즈니스 페이지 컴포넌트
├── hooks/                 # 커스텀 훅 (queries/, useAuth.ts 등)
├── lib/
│   ├── api/               # API 클라이언트 (Axios)
│   ├── utils/             # 유틸리티 함수
│   └── validations/       # Zod 스키마
├── stores/                # Zustand 스토어
└── types/                 # 로컬 타입 정의
```

---

## 컴포넌트 레이어 의존성

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조 가능
- ui 컴포넌트가 pages 참조 ❌
- 순환 참조 금지

---

## 레이아웃 치수

| 영역 | 값 | 비고 |
|------|-----|------|
| Sidebar (펼침) | 340px | 확장 상태 |
| Sidebar (접힘) | 56px | 컴팩트 상태 |
| Header | 60px | 상단 고정 |
| TabBar | 53px | 탭 컨테이너 |

---

## 컨트롤 높이 표준

| 클래스 | 높이 | 용도 |
|--------|------|------|
| `h-control-h-sm` | 32px | 작은 버튼, 인라인 |
| `h-control-h` | 36px | **기본** (버튼, 입력, 선택) |
| `h-control-h-lg` | 44px | 큰 버튼 |

컨테이너 규칙: 36px 컨트롤을 담는 바는 `min-h-[52px] px-4 py-2`

---

## Zustand 스토어 패턴

```typescript
// ✅ 표준 패턴: State/Actions 분리, persist 사용
interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
}

interface AuthStoreActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStoreState & AuthStoreActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: 'auth-store' }
  )
);
```

---

## API 클라이언트 패턴

```typescript
// lib/api/client.ts - Axios 인스턴스
// ✅ 인터셉터로 토큰 자동 주입, 401 시 리프레시

// lib/api/endpoints/projects.ts
export const projectsApi = {
  list: (params?: FindProjectsParams) => 
    client.get<PaginatedResponse<Project>>('/projects', { params }),
  
  detail: (id: string) => 
    client.get<ApiResponse<Project>>(`/projects/${id}`),
  
  create: (data: CreateProjectDto) => 
    client.post<ApiResponse<Project>>('/projects', data),
};

// 사용
import { api } from '@/lib/api';
const projects = await api.projects.list({ page: 1 });
```

---

## React Query 패턴

```typescript
// hooks/queries/useProjects.ts
export function useProjectList(params: FindProjectsParams) {
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => api.projects.list(params),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

---

## 폼 + Zod 패턴

```typescript
// lib/validations/project.ts
export const createProjectSchema = z.object({
  projectName: z.string().min(1, '프로젝트명을 입력하세요'),
  description: z.string().optional(),
  customerId: z.string().optional(),
});

// 컴포넌트에서 사용
const form = useForm<CreateProjectInput>({
  resolver: zodResolver(createProjectSchema),
});
```

---

## 페이지 템플릿 패턴

```typescript
// ✅ ListPageTemplate 사용
<ListPageTemplate
  header={{
    breadcrumb: ['프로젝트', '목록'],
    title: '프로젝트 관리',
    actions: [
      { label: '등록', onClick: handleCreate, variant: 'default' }
    ],
    filters: [...]
  }}
  table={{
    columns,
    data,
    pagination: { page, pageSize, total, onPageChange, onPageSizeChange }
  }}
/>
```

---

## 색상 시스템

### LS CI (Corporate Identity) 팔레트

| 변수 | 용도 |
|------|------|
| `ls-blue` | LS 브랜드 블루 - 주요 강조 |
| `ls-red` | LS 브랜드 레드 - 경고, 중요 |

### SSOO 테마 색상

| 변수 | 용도 |
|------|------|
| `ssoo-primary` | 주요 액션 버튼, 링크 |
| `ssoo-secondary` | 보조 요소 |
| `ssoo-accent` | 강조, 포커스 |

### 색상 사용 규칙

```typescript
// ✅ CSS 변수 사용
className="bg-ssoo-primary text-white"
className="text-ls-blue"
className="border-ssoo-accent"

// ❌ 하드코딩 금지
className="bg-[#1E40AF]"  // 금지!
style={{ color: '#DC2626' }}  // 금지!
```

---

## 페이지 보안 패턴

### Middleware 인증

```typescript
// middleware.ts - allowedPaths 설정
export const config = {
  matcher: ['/((?!_next|api/auth|login|favicon).*)'],
};

const allowedPaths = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  if (!allowedPaths.includes(pathname) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### 페이지 컴포넌트 패턴 (Thin Wrapper)

```typescript
// app/(main)/projects/page.tsx
// ✅ Thin Wrapper - page.tsx는 라우팅만, 로직은 pages/ 컴포넌트에
export default function ProjectsPage() {
  return <ProjectListPage />;
}

// ❌ 금지 - page.tsx에 직접 로직 작성
export default function ProjectsPage() {
  const { data } = useProjects(); // 금지!
  return <div>...</div>;
}
```

### ContentArea 동적 로딩

```typescript
// 대시보드 등에서 ContentArea 사용 시
<ContentArea
  loading={isLoading}
  error={error}
  fallback={<EmptyState message="데이터가 없습니다" />}
>
  {children}
</ContentArea>
```

---

## 기술 결정 사항

### UI 라이브러리: TanStack Table + shadcn/ui

| 선택 | 이유 |
|------|------|
| ✅ TanStack Table | 무료, MIT, React 네이티브 |
| ✅ shadcn/ui | Radix 기반, 커스터마이징 용이 |
| ❌ DevExtreme | 라이선스 비용 ($899.99/년/개발자) |
| ❌ AG Grid | 고급 기능 유료 |

### 라우팅 전략: 하이브리드 (URL 고정 + 동적 로딩)

```
URL: http://localhost:3000/ (항상 고정)
└── ContentArea가 메뉴 path 기반으로 lazy load
└── 직접 URL 접근 시 → 로그인 페이지로 리다이렉트
```

**장점:**
- 라우팅 구조 숨김 (보안)
- 권한 기반 메뉴 DB 제어
- MDI 탭 시스템과 통합

### 권한 관리: UNION 방식

```
최종 권한 = 역할 권한 (cm_role_menu_r)
           ∪ 사용자 추가 권한 (override_type = 'grant')
           - 사용자 권한 박탈 (override_type = 'revoke')
```

---

## 컴포넌트 레벨 규칙

| 레벨 | 위치 | 책임 | 비즈니스 로직 |
|------|------|------|-------------|
| 0 | shadcn/ui | 외부 라이브러리 | ❌ |
| 1 | ui/ | 프로젝트 스타일 래퍼 | ❌ |
| 2 | common/ | 재사용 복합 컴포넌트 | ❌ |
| 3 | templates/ | 페이지 레이아웃 표준화 | ⚠️ 주입만 |
| 4 | pages/ | 실제 화면 | ✅ API, 상태, 권한 |

**규칙:**
- 레벨 역전 금지 (상위 → 하위만 의존)
- Level 2 이하에 도메인/권한 로직 금지
- 같은 패턴 2회 이상 → 공통화 검토

---

## Button Variants

| variant | 용도 |
|---------|------|
| `default` | 주요 액션 (저장, 생성) |
| `secondary` | 보조 액션 |
| `outline` | 테두리만 |
| `destructive` | 삭제, 위험 |
| `ghost` | 아이콘 버튼 |

---

## Import 순서

```typescript
// 1. React/외부 라이브러리
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 내부 alias (@/)
import { useAuthStore } from '@/stores';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { Project } from '@ssoo/types';

// 3. 상대 경로 (같은 폴더)
import { ProjectCard } from './ProjectCard';
```

---

## 금지 사항

1. **pages에서 직접 API 호출** - hooks/queries 통해 호출
2. **컴포넌트에서 store 직접 수정** - action 함수 사용
3. **any 타입** - 구체적 타입 사용
4. **와일드카드 export** - 명시적 export
5. **inline 스타일** - Tailwind 클래스 사용

---

## 관련 문서

- [layout-system.md](../../docs/pms/design/layout-system.md) - 레이아웃 다이어그램, 치수 상세
- [design-system.md](../../docs/pms/design/design-system.md) - LS CI/SSOO 색상 상세, 타이포그래피
- [state-management.md](../../docs/pms/architecture/state-management.md) - 각 스토어 API 상세
- [frontend-standards.md](../../docs/pms/architecture/frontend-standards.md) - 폴더 구조, React Query 패턴
- [component-hierarchy.md](../../docs/pms/design/component-hierarchy.md) - 컴포넌트 레벨 상세
