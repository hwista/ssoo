---
applyTo: "apps/web/cms/**"
---

# CMS 프론트엔드 개발 규칙

> 이 규칙은 `apps/web/cms/` 경로의 파일 작업 시 적용됩니다.

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives)
- Zustand 5.x (클라이언트 상태), TanStack Query 5.x (서버 상태)
- Axios (API 클라이언트), Zod (검증)

---

## PMS와의 공통점 / 차이점

| 항목 | PMS | CMS |
|------|-----|-----|
| **UI 라이브러리** | shadcn/ui + Tailwind | ✅ 동일 |
| **상태 관리** | Zustand + TanStack Query | ✅ 동일 |
| **API 클라이언트** | Axios + 인터셉터 | ✅ 동일 |
| **인증 토큰** | `ssoo-auth` localStorage 키 | ✅ 동일 (공유) |
| **색상 테마** | 네이비 (hue 213°) | 틸 (hue 180°) — `globals.css` |
| **포트** | 3000 | 3002 |
| **라우팅** | MDI 탭 (ContentArea) | 페이지 라우팅 (App Router) |
| **TabBar** | ✅ 있음 (53px) | ❌ 없음 |
| **패키지 매니저** | pnpm (모노레포) | ✅ 동일 |

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 레이아웃 그룹
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # Route Handlers
│   └── layout.tsx
├── components/
│   ├── ui/                # Level 1 - shadcn/ui 기반 원자
│   ├── common/            # Level 2 - 재사용 가능한 조합
│   ├── layout/            # 레이아웃 (Sidebar, Header)
│   ├── templates/         # Level 3 - 페이지 템플릿
│   └── pages/             # 비즈니스 페이지 컴포넌트
│       ├── feed/          # 피드/타임라인
│       ├── board/         # 게시판
│       ├── profile/       # 프로필·스킬맵
│       ├── search/        # 전문가 검색
│       └── settings/      # 개인 설정
├── hooks/
│   ├── queries/           # TanStack Query 훅
│   └── useAuth.ts
├── lib/
│   ├── api/               # API 클라이언트 (Axios)
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── endpoints/     # 도메인별 API 함수
│   ├── utils/
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
| Header | 60px | 상단 고정 (PMS와 동일) |
| Sidebar (펼침) | 340px | 확장 상태 (PMS와 동일) |
| Sidebar (접힘) | 56px | 컴팩트 상태 (PMS와 동일) |
| TabBar | ❌ 없음 | CMS는 페이지 라우팅 사용 |
| Control 높이 | 36px (`h-control-h`) | PMS와 동일 |

### PMS와의 레이아웃 차이

CMS는 MDI 탭 시스템 대신 **페이지 라우팅**을 사용합니다:
- 피드 → 프로필 → 게시판 → 검색은 컨텍스트가 독립적
- Header 바로 아래에 콘텐츠 영역 시작 (TabBar 53px 만큼 콘텐츠 공간 확보)
- Next.js App Router 기본 라우팅 활용

---

## 색상 시스템

### CMS 틸 팔레트 (#0A3D3D, hue 180°)

| 토큰 | 용도 | 값 |
|------|------|-----|
| `--ssoo-primary` | 주요 액션 | `#0A3D3D` (딥 틸) |
| `--ssoo-primary-hover` | 호버 | `#1A5C5C` |
| `--ssoo-secondary` | 보조 | `#2A7A7A` |
| `--ssoo-background` | 배경 | `#F7FBFB` |
| `--ssoo-content-border` | 보더 | `#9FD4D4` |
| `--ssoo-content-background` | 콘텐츠 배경 | `#DEF0F0` |

### 3앱 패밀리 색상

| 앱 | 색상 | Hue | 의미 |
|---|---|---|---|
| PMS | 네이비 `#0A1E5A` | 213° | 업무·신뢰 |
| DMS | 퍼플 `#34104A` | 270° | 지식·깊이 |
| **CMS** | **틸 `#0A3D3D`** | **180°** | **연결·성장** |

```css
/* ✅ CSS 변수 사용 */
className="bg-ssoo-primary text-white"
className="text-ssoo-primary"

/* ❌ 하드코딩 금지 */
className="bg-[#0A3D3D]"
```

---

## API 클라이언트 패턴

```typescript
// lib/api/endpoints/posts.ts
export const postsApi = {
  feed: (params?: FeedQueryDto) =>
    client.get<PaginatedResponse<FeedItem>>('/cms/feed', { params }),
  
  create: (data: CreatePostDto) =>
    client.post<ApiResponse<Post>>('/cms/posts', data),
  
  detail: (id: string) =>
    client.get<ApiResponse<Post>>(`/cms/posts/${id}`),
};
```

---

## React Query 패턴

```typescript
// hooks/queries/usePosts.ts
export function useFeed(params: FeedQueryDto) {
  return useQuery({
    queryKey: ['cms', 'feed', params],
    queryFn: () => postsApi.feed(params),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'feed'] });
    },
  });
}
```

---

## Zustand 스토어 패턴

```typescript
// ✅ 표준: State/Actions 분리, persist 사용
interface FeedStoreState {
  feedType: 'all' | 'following' | 'board';
}

interface FeedStoreActions {
  setFeedType: (type: FeedStoreState['feedType']) => void;
}

const useFeedStore = create<FeedStoreState & FeedStoreActions>()(
  (set) => ({
    feedType: 'all',
    setFeedType: (feedType) => set({ feedType }),
  })
);
```

---

## 페이지 구성

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 홈/피드 | `/` | 피드 타임라인 |
| 게시판 | `/board` | 게시판 목록 |
| 게시판 상세 | `/board/:id` | 게시판 게시물 목록 |
| 프로필 | `/profile/:userId` | 프로필·스킬맵 |
| 전문가 검색 | `/search` | 스킬 기반 검색 |
| 설정 | `/settings` | 개인 설정 |

---

## SNS 디자인 방향: LinkedIn 스타일

- **피드 타임라인**: 중앙 카드 레이아웃 (max-w ~680px)
- **PostCard**: 프로필+직급+시간, 본문, 태그, 반응바
- **ProfileCard**: 커버+프로필사진, 스킬맵 게이지바
- **ComposeBox**: "무슨 생각을 하고 계신가요?" 스타일
- **ReactionBar**: 좋아요·댓글·공유·저장

---

## Import 순서

```typescript
// 1. React/외부 라이브러리
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 내부 alias (@/)
import { useFeedStore } from '@/stores';
import { postsApi } from '@/lib/api/endpoints/posts';
import { Button } from '@/components/ui/button';
import type { Post } from '@ssoo/types';

// 3. 상대 경로
import { PostCard } from './PostCard';
```

---

## 금지 사항

1. **pages에서 직접 API 호출** — hooks/queries 통해 호출
2. **컴포넌트에서 store 직접 수정** — action 함수 사용
3. **any 타입** — 구체적 타입 사용
4. **와일드카드 export** — 명시적 export
5. **inline 스타일** — Tailwind 클래스 사용
6. **하드코딩 색상** — CSS 변수 사용

---

## 관련 문서

- `docs/cms/README.md` — CMS 문서 허브
- `docs/cms/CHANGELOG.md` — 변경 이력
