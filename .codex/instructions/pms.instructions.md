---
applyTo: "apps/web/pms/**"
---

# Codex PMS Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/pms.instructions.md`

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives)
- Zustand 5.x (클라이언트 상태), TanStack Query 5.x (서버 상태)
- TanStack Table 8.x, React Hook Form + Zod

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # Level 1 - shadcn/ui 기반 원자
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

## shadcn/ui 사용법

- 컴포넌트 추가: `npx shadcn-ui@latest add [component]`
- `components/ui/` 에 설치, Tailwind 클래스로 커스터마이징
- 색상: `ssoo-primary`, `ssoo-secondary`, `ssoo-accent`, `ls-blue`, `ls-red` (CSS 변수)
- 하드코딩 색상 금지 (`bg-[#1E40AF]` ❌)

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

## 타이포그래피 규칙

- 폰트 스택은 전역 CSS 변수(`--font-sans`, `--font-mono`)와 Tailwind token만 사용합니다.
- 시맨틱 토큰 우선:
  - `text-title-page`, `text-title-section`, `text-title-subsection`, `text-title-card`
  - `text-body-md`, `text-body-sm`
  - `text-control-lg`
  - `text-label-md`, `text-label-sm`, `text-label-strong`
  - `text-caption`, `text-badge`
  - `text-code-inline`, `text-code-block`, `text-code-line-number`
- typography 선택 순서: `slot 역할 -> density -> 허용 token`
- role layer: `header`, `title`, `body`, `detail`, `label`, `badge`, `code`, `annotation`
- `label-*`는 조작/식별용 텍스트의 독립 역할 계층입니다.
- `caption`은 detail 계층 기본값입니다.
- 기존 alias(`heading-1/2/3`, `body-text`, `body-text-muted`)는 하위 호환으로 유지합니다.
- 컨트롤 primitive는 `text-xs`, `text-sm`, `text-base` 단독 raw class도 수동 정리 대상입니다.
- raw 조합(`text-sm font-medium`, `text-xs font-medium`, `text-sm font-semibold`, `text-lg font-semibold`, `text-xs font-semibold`, `text-lg font-medium`, `body-text font-medium`)과 개별 `fontFamily` 하드코딩은 금지합니다.
- `text-[Npx]` arbitrary font-size는 금지합니다.
- standalone `text-xl`, `text-2xl`, `font-bold`는 금지합니다.
- semantic token + raw weight override(`text-title-card font-bold`, `text-label-md font-semibold`)는 금지합니다.
- `badge/chip/table cell` 내부 텍스트도 역할/밀도 기준 정규화 대상입니다.
- container-scaled text는 semantic intent를 token으로 정의하고, 실제 size는 컨테이너 비례 스케일을 허용합니다.

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
| 2026-02-27 | 기술스택/폴더구조/컴포넌트레이어/shadcn/Zustand/API+RQ/레이아웃/페이지패턴/금지사항 추가 |
| 2026-02-22 | Codex PMS 정본 신설 |
