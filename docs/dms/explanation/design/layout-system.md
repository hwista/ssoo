# 레이아웃 시스템

> 최종 업데이트: 2026-03-03

DMS의 레이아웃 구조와 컴포넌트를 정의합니다.

---

## 레이아웃 개요

DMS는 **단일 페이지 앱** 구조로, 탭 기반 네비게이션을 사용합니다.

```
┌─────────────────────────────────────────────────────────┐
│                       Header                            │
├─────────┬───────────────────────────────────────────────┤
│         │                 TabBar                        │
│         ├───────────────────────────────────────────────┤
│ Sidebar │                                               │
│         │              ContentArea                      │
│         │                                               │
│         │                                               │
└─────────┴───────────────────────────────────────────────┘
```

---

## 레이아웃 크기

```typescript
// types/layout.ts
export const LAYOUT_SIZES = {
  header: {
    height: 48,         // 3rem (h-header-h)
  },
  sidebar: {
    expandedWidth: 260, // 16.25rem
    collapsedWidth: 48, // 3rem
    minWidth: 200,
    maxWidth: 400,
  },
  tabBar: {
    containerHeight: 36,
    tabHeight: 32,
  },
  control: {
    height: 32,         // 컨트롤 요소 높이
  },
};
```

---

## Header

상단 헤더 컴포넌트

### 구조

```
┌────────────────────────────────────────────────────────┐
│ [AI Search Input] [Type▼]    [+New] [🔔] [👤]         │
└────────────────────────────────────────────────────────┘
```

### 기능

| 영역 | 기능 |
|------|------|
| AI 검색 | Gemini/RAG 검색 입력 |
| 타입 드롭다운 | AI 검색 타입 선택 (Gemini, RAG) |
| 새 문서 | 새 문서 생성 |
| 알림 | 알림 표시 (추후) |
| 프로필 | 사용자 메뉴 (추후) |

### 스타일

```tsx
<header className="h-header-h flex items-center justify-between px-4 bg-ssoo-primary">
```

- 높이: `h-header-h` (48px)
- 배경: `bg-ssoo-primary` (SSOO 브랜드 색상)
- 텍스트: 흰색

---

## Sidebar

사이드바 컨테이너

### 구조

```
┌─────────────┐
│ [Bookmarks] │  ← 접이식 섹션
├─────────────┤
│ [Open Tabs] │  ← 열린 탭 목록
├─────────────┤
│ [File Tree] │  ← 파일 트리
│             │
│             │
├─────────────┤
│ [Search]    │  ← 파일 검색
└─────────────┘
```

### 섹션 (Section)

접이식 섹션 컴포넌트:

```tsx
<Section title="북마크" defaultExpanded>
  <Bookmarks />
</Section>
```

### 컴팩트 모드

화면 너비가 좁을 때 자동 전환:

- **트리거:** 콘텐츠 영역 < 975px
- **동작:** 사이드바 오버레이로 표시
- **토글:** 왼쪽 그립 버튼

```tsx
// AppLayout.tsx
const checkCompactMode = () => {
  const availableWidth = window.innerWidth - LAYOUT_SIZES.sidebar.expandedWidth;
  const shouldBeCompact = availableWidth < DOCUMENT_MIN_WIDTH;
  setCompactMode(shouldBeCompact);
};
```

### 리사이즈

사이드바 너비 조절 가능:

- **최소:** 200px
- **최대:** 400px
- **기본:** 260px

---

## TabBar

탭 바 컴포넌트

### 구조

```
┌─────────────────────────────────────────────────────────┐
│ [<] [🏠 홈] [📄 문서1] [📄 문서2] [📄 문서3] [>]        │
└─────────────────────────────────────────────────────────┘
```

### 기능

| 기능 | 설명 |
|------|------|
| 탭 활성화 | 클릭 시 해당 탭 활성화 |
| 탭 닫기 | X 버튼 클릭 시 탭 닫기 |
| 스크롤 | 탭이 많을 때 좌우 스크롤 |
| 드래그 | 탭 순서 변경 (Home 제외) |

### 탭 스타일

```tsx
// 활성 탭
className="bg-white border-t-2 border-ssoo-primary"

// 비활성 탭
className="bg-gray-100 hover:bg-gray-200"
```

### Home 탭 규칙

- 항상 첫 번째 위치
- 닫기 불가 (`closable: false`)
- 드래그 불가

---

## ContentArea

콘텐츠 영역 컴포넌트

### 동작

1. `activeTabId`에서 활성 탭 찾기
2. 탭 경로로 페이지 타입 결정
3. `pageComponents` 매핑에서 컴포넌트 로드
4. `Suspense`로 로딩 상태 처리

### 페이지 매핑

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/DashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/DocumentPage')),
};
```

### 페이지 타입 결정

```typescript
function getPageType(tab) {
  if (tab.id === 'home') return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
  return null;
}
```

---

## 문서형 콘텐츠 폭 규칙

문서형 페이지(문서 뷰어/에디터 및 유사 기능)는 **본문 최대 너비 975px** 규칙을 따릅니다.

### 목적

- 긴 가로 폭을 제한해 읽기/입력 가독성을 확보
- 사이드카와의 균형 유지
- 문서형/정보형 페이지 레이아웃 일관성 확보

### 적용 기준

- `PageTemplate`를 사용하는 모든 문서형 페이지
- 마크다운 뷰어/에디터 외의 기능 페이지도 동일한 폭 규칙 준수

### 문서 방향

문서 방향은 **스크롤 방향이 아닌 문서 규격(A4 기준)**으로 정의합니다.

| 방향 | 기준 | 폭 상수 |
|------|------|--------|
| `portrait` | 세로 문서 | `DOCUMENT_WIDTHS.portrait` |
| `landscape` | 가로 문서 | `DOCUMENT_WIDTHS.landscape` |

```tsx
import { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from '@/components/templates/page-frame';
```

### 구현 패턴

```tsx
import { PageTemplate } from '@/components/templates';

<PageTemplate
  filePath="ai/search"
  mode="viewer"
  contentOrientation="portrait"
>
  {/* 페이지별 콘텐츠 */}
</PageTemplate>
```

### Shell 외곽 책임 단일화

`SectionedShell`은 툴바/바디/푸터의 외곽 frame(보더/배경/라운드/분할선)을 단일 책임으로 관리합니다.

- Shell 책임: `toolbar/body/footer`의 frame 스타일
- 슬롯 컴포넌트 책임: 기능 UI(버튼, 입력, 카드, 메시지 등)
- 금지: `SectionedShell` 슬롯 직하위 래퍼에 `border-*`, `rounded-*`, 외곽용 `bg-*`를 중복 적용
- 에디터 모드도 툴바를 Shell `toolbar` 슬롯으로 렌더링하고, 에디터 본문 컴포넌트는 콘텐츠 편집 기능만 담당
- 에디터 툴바 액션은 store 우회 없이 페이지 로컬 `Editor` ref에 직접 전달해 body 편집기와 1:1로 연결
- `toolbar`, `footer`가 없으면 `body`가 해당 영역 스타일을 대체해 상하단 경계를 완성
- Footer 입력은 `AssistantComposer` 공용 컴포넌트로 단일화하며, `+ / 입력 / 전송` 정렬 규칙은 페이지별 보정 없이 컴포넌트 내부에서만 관리합니다.
- Body 슬롯에 주입되는 콘텐츠 루트는 `h-full min-h-0 overflow-hidden` 계약을 필수로 따릅니다.
- `body` 최상위에서 `flex-1` 단독 사용은 금지합니다(부모가 flex가 아니면 높이 전파 실패).

### AI 페이지 공통 구조

AI 페이지는 `PageTemplate` + `SectionedShell` 조합으로 헤더/툴바/본문/푸터 구성을 통일합니다.

```tsx
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { AiSidecar } from '@/components/pages/ai/_components/AiSidecar';

<PageTemplate
  filePath="ai/search"
  mode="viewer"
  breadcrumbRootIconVariant="ai"
  contentOrientation="portrait"
  contentSurfaceClassName={DOC_PAGE_SURFACE_PRESETS.ai}
  sidecarContent={<AiSidecar variant="search" />}
>
  <SectionedShell
    variant="search_with_toolbar"
    toolbar={<SearchBar />}
    body={<ResultList />}
    footer={<ComposeInput />}
  />
</PageTemplate>
```

- `SectionedShell` 스타일은 `variant`로 제어합니다.
- 페이지는 frame 스타일을 직접 주입하지 않고 variant preset을 사용합니다.

### SectionedShell Variant 매핑

| 화면 | 구성 | variant |
|------|------|---------|
| 문서 에디터 | 툴바 + 바디 + 푸터 | `editor_with_footer` |
| 문서 뷰어 | 툴바 + 바디 | `viewer_with_toolbar` |
| AI 대화 | 바디 + 푸터 | `chat_with_footer` |
| AI 검색 | 툴바 + 바디 | `search_with_toolbar` |

### 참고

- 문서 뷰어/에디터의 기준 폭: `components/common/viewer/Content.tsx`의 `DOCUMENT_WIDTH = 975`
- 내부 영역은 필요 시 자체 스크롤을 제공하도록 구성

---

## 컴팩트 모드 상세

### 트리거 조건

```
화면 너비 - 사이드바 너비 < 문서 최소 너비 (975px)
```

### 동작

| 상태 | 사이드바 | 그립 버튼 | 오버레이 |
|------|---------|---------|---------|
| 일반 모드 | 표시 | 숨김 | 없음 |
| 컴팩트 + 닫힘 | 숨김 | 표시 | 없음 |
| 컴팩트 + 열림 | 오버레이 | 숨김 | 배경 어둡게 |

### 그립 버튼

```tsx
{isCompactMode && !sidebarOpen && (
  <button
    onClick={toggleSidebar}
    className="fixed left-0 top-1/2 -translate-y-1/2 z-30 ..."
  >
    <ChevronRight />
  </button>
)}
```

---

## 반응형 디자인

### 디바이스 타입

```typescript
export const BREAKPOINTS = {
  mobile: 768,
};

// layout.store.ts
const detectDeviceType = (): DeviceType => {
  return window.innerWidth < BREAKPOINTS.mobile ? 'mobile' : 'desktop';
};
```

### 모바일 대응 (추후)

현재 모바일은 "준비 중" 메시지 표시:

```tsx
if (deviceType === 'mobile') {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1>모바일 버전 준비 중</h1>
    </div>
  );
}
```

---

## CSS 변수

```css
/* globals.css */
:root {
  --header-h: 48px;
  --sidebar-w: 260px;
  --sidebar-collapsed-w: 48px;
  --tab-h: 32px;
  --control-h: 32px;
}
```

### Tailwind 확장

```javascript
// tailwind.config.ts
theme: {
  extend: {
    height: {
      'header-h': 'var(--header-h)',
      'tab-h': 'var(--tab-h)',
      'control-h': 'var(--control-h)',
    },
    width: {
      'sidebar-w': 'var(--sidebar-w)',
      'sidebar-collapsed-w': 'var(--sidebar-collapsed-w)',
    },
  },
}
```

---

## 관련 문서

- [state-management.md](../architecture/state-management.md) - 레이아웃 스토어
- [page-routing.md](../architecture/page-routing.md) - 탭 라우팅
- [component-hierarchy.md](component-hierarchy.md) - 컴포넌트 구조

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
