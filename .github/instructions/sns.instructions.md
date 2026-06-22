---
applyTo: "apps/web/sns/**"
---

# SNS 프론트엔드 개발 규칙

> 이 규칙은 `apps/web/sns/` 경로의 파일 작업 시 적용됩니다.

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives)
- Zustand 5.x (클라이언트 상태), TanStack Query 5.x (서버 상태)
- Axios (API 클라이언트), Zod (검증)

---

## PMS와의 공통점 / 차이점

| 항목 | PMS | SNS |
|------|-----|-----|
| **UI 라이브러리** | shadcn/ui + Tailwind | ✅ 동일 |
| **상태 관리** | Zustand + TanStack Query | ✅ 동일 |
| **API 클라이언트** | Axios + 인터셉터 | ✅ 동일 |
| **인증 토큰** | `ssoo-auth` localStorage 키 | ✅ 동일 (공유) |
| **색상 테마** | 네이비 (hue 213°) | 틸 (hue 180°) — `globals.css` |
| **포트** | 3002 | 3004 |
| **라우팅** | MDI 탭 (ContentArea) | ✅ 동일 — route 진입은 MDI 탭 open 입력 |
| **TabBar** | ✅ 있음 (53px MDI) | ✅ 동일 — `SsooMdiTabBar` full MDI |
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
│       └── search/        # 전문가 검색
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
| TabBar | 53px MDI tabbar | SNS도 `SsooMdiTabBar` full MDI 탭바 사용 |
| Control 높이 | 36px (`h-control-h`) | PMS와 동일 |

### PMS와의 레이아웃 계약

SNS도 PMS와 같은 full MDI shell을 사용합니다:
- 피드 → 프로필 → 게시판 → 검색 진입은 `getSnsShellTabOptions()`를 통해 MDI 탭을 엽니다.
- Header 아래 tabbar slot은 `@ssoo/web-shell`의 `SsooMdiTabBar`를 소비합니다.
- App Router 경로는 탭 open/active state를 동기화하는 입력이며, 별도 route strip이나 route-mode shell 형태를 만들지 않습니다.
- Header 알림 slot은 source app별 고정 필터를 걸지 않고 공용 `useCommonNotificationCenter` + `SsooHeaderNotificationCenter`를 사용해 사용자의 전체 수신 알림을 표시합니다. 상단 `전체`/앱별 filter chip과 unread badge는 공용 표면이며, SNS는 현재 앱 chip 우선순위와 SNS 대상 열기 action만 주입합니다.

---

## 색상 시스템

### SNS 틸 팔레트 (#0A3D3D, hue 180°)

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
| **SNS** | **틸 `#0A3D3D`** | **180°** | **연결·성장** |

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
    client.get<PaginatedResponse<FeedItem>>('/sns/feed', { params }),
  
  create: (data: CreatePostDto) =>
    client.post<ApiResponse<Post>>('/sns/posts', data),
  
  detail: (id: string) =>
    client.get<ApiResponse<Post>>(`/sns/posts/${id}`),
};
```

---

## React Query 패턴

```typescript
// hooks/queries/usePosts.ts
export function useFeed(params: FeedQueryDto) {
  return useQuery({
    queryKey: ['sns', 'feed', params],
    queryFn: () => postsApi.feed(params),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sns', 'feed'] });
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
| 전문가 검색 | `/search` | 스킬 기반 검색 |
| 프로필 | `/__user/profile/me`, `/__user/profile/:userId` | `@ssoo/web-auth` 공용 사용자 표면. SNS는 profile/feed/follow API 소유자일 뿐 물리 `ProfilePage`를 렌더링하지 않는다. |
| 설정 | `/__user/settings` | `@ssoo/web-auth` 공용 사용자 설정 표면. SNS 물리 `SettingsPage`를 두지 않는다. |

`/profile/*`와 `/settings`는 기존 링크 호환을 위해 App Router path로만 남길 수 있다. 이 경로는 `ContentArea`의 `legacy-user-surface-handoff`가 canonical `__user` route로 넘기는 입력이며, local profile/settings page 컴포넌트를 렌더링하면 공용 표면 계약 위반이다. SNS 내부 피드, 작성자, 빠른 이동 링크도 `@ssoo/web-auth`의 `SSOO_USER_SURFACE_*` 상수와 `getSsooUserSurfaceTabPath()`를 사용한다.

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

- `docs/sns/README.md` — SNS 문서 허브
- `docs/sns/CHANGELOG.md` — 변경 이력
