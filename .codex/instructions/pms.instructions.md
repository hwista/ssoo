---
applyTo: "apps/web/pms/**"
---

# Codex PMS Instructions

> 최종 업데이트: 2026-06-17
> 정본: `.github/instructions/pms.instructions.md`

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives), `@ssoo/web-ui`
- Zustand 5.x (클라이언트 상태), TanStack Query 5.x (서버 상태)
- TanStack Table 8.x, React Hook Form + Zod

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # Level 1 - @ssoo/web-ui thin re-export adapter + Radix 원자
│   ├── common/            # Level 2 - 재사용 가능한 조합
│   ├── templates/         # Level 3 - 페이지 템플릿
│   ├── layout/            # 레이아웃 (Sidebar, Header, TabBar)
│   └── pages/             # Level 4 - 비즈니스 페이지
├── hooks/                 # 커스텀 훅 (queries/, useAuth.ts 등)
├── lib/
│   ├── api/               # API 클라이언트 (Axios)
│   ├── utils/             # 유틸리티 함수
│   └── validations/       # Zod 스키마
├── stores/                # Zustand 스토어
└── types/                 # 로컬 타입 정의
```

## 컴포넌트 레이어

| 레벨 | 위치 | 비즈니스 로직 |
|------|------|-------------|
| 0 | shadcn/ui | ❌ |
| 1 | ui/ | ❌ |
| 2 | common/ | ❌ |
| 3 | templates/ | ⚠️ 주입만 |
| 4 | pages/ | ✅ API, 상태, 권한 |

레벨 역전 금지 (상위 → 하위만 의존), Level 2 이하에 도메인/권한 로직 금지.

## UI primitive 사용법

- Button/Badge/Card/Input/NativeSelect/Table/Textarea 등 inventory 원자는 `@ssoo/web-ui`가 소유하고 `components/ui/*`는 thin re-export adapter로 유지한다.
- `components/ui/*`에서 앱별 primitive variant recipe를 재정의하지 않는다.
- Radix 기반 신규 primitive가 필요하면 앱 로컬에 먼저 두지 않고 `@ssoo/web-ui` inventory 원자로 추가한다.
- 색상: `ssoo-primary`, `ssoo-secondary`, `ssoo-accent`, `ls-blue`, `ls-red` 같은 theme token 사용
- 하드코딩 색상 금지 (`bg-[#1E40AF]` ❌)

## UI primitive 소비 기준

- PMS TSX surface에서는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 공용 primitive 또는 앱 thin adapter를 사용한다.
- DataGrid 본문/툴바/페이지네이션과 요청 목록의 행 액션/상태 토큰도 같은 전역 기준을 따른다.
- 이 기준은 `pnpm run verify:ui-consumption`에서 전역 검증된다.

## Zustand 스토어 패턴

```typescript
// State/Actions 인터페이스 분리, persist 사용
interface AuthStoreState { user: User | null; accessToken: string | null; }
interface AuthStoreActions { setUser: (user: User | null) => void; logout: () => void; }

const useAuthStore = create<AuthStoreState & AuthStoreActions>()(
  persist((set) => ({ /* ... */ }), { name: 'auth-store' })
);
```

## API 클라이언트 + React Query 패턴

```typescript
// lib/api/endpoints/projects.ts - Axios 인스턴스
export const projectsApi = {
  list: (params?) => client.get('/projects', { params }),
  create: (data) => client.post('/projects', data),
};

// hooks/queries/useProjects.ts
export function useProjectList(params) {
  return useQuery({ queryKey: ['projects', 'list', params], queryFn: () => api.projects.list(params) });
}
```

## 레이아웃 치수

| 영역 | 값 |
|------|-----|
| Sidebar (펼침) | 340px |
| Sidebar (접힘) | 56px |
| Header | 60px |
| TabBar | 53px |
| 컨트롤 높이 기본 | 36px (`h-control-h`) |

## 페이지 패턴

- `page.tsx`는 Thin Wrapper: 라우팅만, 로직은 `pages/` 컴포넌트에 위임
- `ListPageTemplate` 등 템플릿 컴포넌트 활용

## 금지 사항

1. **pages에서 직접 API 호출** - hooks/queries 통해 호출
2. **컴포넌트에서 store 직접 수정** - action 함수 사용
3. **any 타입**
4. **와일드카드 export**
5. **inline 스타일** - Tailwind 클래스 사용

## 검증

- 빌드: `pnpm run build:web-pms`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-17 | PMS DataGrid/요청 목록을 선별 UI 기준선으로 지정하고 `@ssoo/web-ui` primitive 사용 규칙 추가 |
| 2026-02-27 | 기술스택/폴더구조/컴포넌트레이어/shadcn/Zustand/API+RQ/레이아웃/페이지패턴/금지사항 추가 |
| 2026-02-22 | Codex PMS 정본 신설 |
