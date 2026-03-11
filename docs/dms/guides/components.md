# DMS 컴포넌트 가이드

> 최종 업데이트: 2026-03-11

DMS 프로젝트의 React 컴포넌트 구조와 사용법에 대한 가이드입니다.

---

## 컴포넌트 개요

### 폴더 구조

```
src/components/
├── common/                    # 공통 컴포넌트
│   ├── ConfirmDialog.tsx      # 확인 다이얼로그
│   ├── StateDisplay.tsx       # 상태 표시
│   ├── editor/                # 에디터 관련
│   ├── assistant/             # DMS 공통 assistant 기능
│   └── viewer/                # DMS 공통 viewer 기능
│       ├── Viewer.tsx         # 뷰어 본체
│       ├── Toolbar.tsx        # 뷰어 툴바
│       ├── Content.tsx        # 뷰어 본문
│       └── LineNumbers.tsx    # 줄번호
├── layout/                    # 레이아웃 컴포넌트
│   ├── AppLayout.tsx          # 앱 전체 레이아웃
│   ├── ContentArea.tsx        # 콘텐츠 영역
│   ├── Header.tsx             # 헤더
│   ├── TabBar.tsx             # 탭 바
│   └── sidebar/               # 사이드바 관련
├── pages/                     # 기능별 페이지 엔트리
│   ├── home/                  # 홈 페이지
│   ├── markdown/              # 마크다운 페이지
│   ├── ai/                    # AI 페이지
│   └── settings/              # 설정 페이지
├── templates/                 # 템플릿
│   ├── DocPageTemplate.tsx    # 문서형 페이지 프레임
│   └── page-frame/            # template-facing building blocks
└── ui/                        # low-level UI adapters
    ├── alert-dialog.tsx
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── divider.tsx
    ├── dropdown.tsx
    ├── scroll-area.tsx
    └── tooltip.tsx
```

---

## 네이밍 규칙

- **폴더가 컨텍스트를 제공하므로 접두어를 제거**합니다.
- 예: `common/viewer/Toolbar.tsx`, `common/viewer/Content.tsx`
- 예외: 전역 공유 컴포넌트는 이름 충돌을 피하도록 명확한 이름 사용

---

## 레이어 해석

- `ui/`
  - low-level primitive adapter 레이어입니다.
- `layout/`
  - 앱 전역 shell 과 keep-alive 탭 렌더링 구조를 담당합니다.
- `templates/`
  - `pages/` 가 공통 화면 패턴을 일관되게 구현하도록 돕는 page frame 레이어입니다.
- `pages/`
  - 실제 도메인 기능 진입점과 orchestration 을 담당합니다.
- `common/`
  - 현재는 순수 공통 컴포넌트와 DMS 도메인 공통 기능 모듈이 함께 존재하는 혼합 레이어입니다.
  - `common/viewer|editor|assistant/*`: DMS 도메인 공통 기능 모듈
- `templates/page-frame/`
  - `DocPageTemplate` 를 구성하는 template-facing building block 레이어입니다.

---

## 1. 레이아웃 컴포넌트

### AppLayout

앱 전체 레이아웃을 구성합니다.

**소스**: `src/components/layout/AppLayout.tsx`

```tsx
<AppLayout>
  {children}
</AppLayout>
```

**구조**:

```
┌────────────────────────────────────────────────────┐
│                      Header                         │
├─────────────────┬──────────────────────────────────┤
│                 │            TabBar                 │
│    Sidebar      ├──────────────────────────────────┤
│                 │          ContentArea              │
│                 │                                   │
└─────────────────┴──────────────────────────────────┘
```

### Header

상단 헤더 컴포넌트입니다.

**소스**: `src/components/layout/Header.tsx`

### TabBar

열린 문서 탭을 관리합니다.

**소스**: `src/components/layout/TabBar.tsx`

### ContentArea

메인 콘텐츠 영역입니다.

**소스**: `src/components/layout/ContentArea.tsx`

주의:

- 현재 `ContentArea` 는 단순 레이아웃 영역이 아니라 keep-alive 탭 렌더링 coordinator 역할도 수행합니다.

---

## 2. 공통 컴포넌트

### ConfirmDialog

사용자 확인 다이얼로그입니다.

**소스**: `src/components/common/ConfirmDialog.tsx`

```tsx
import { useConfirmStore } from '@/stores';

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

### StateDisplay

로딩, 에러, 빈 상태 등을 표시합니다.

**소스**: `src/components/common/StateDisplay.tsx`

```tsx
<StateDisplay
  loading={isLoading}
  error={error}
  empty={data.length === 0}
  emptyMessage="데이터가 없습니다"
>
  {/* 콘텐츠 */}
</StateDisplay>
```

---

## 3. 템플릿 컴포넌트

### DocPageTemplate

문서형 페이지의 공통 프레임입니다.

**소스**: `src/components/templates/DocPageTemplate.tsx`

```tsx
<DocPageTemplate
  title="문서 제목"
  actions={<Button>저장</Button>}
>
  {/* 문서 내용 */}
</DocPageTemplate>
```

---

## 4. UI 컴포넌트

shadcn 생성 코드, Radix primitive 래퍼, 프로젝트 스타일 래퍼를 포함하는 low-level UI 컴포넌트들입니다.

### Button

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">기본</Button>
<Button variant="outline">외곽선</Button>
<Button variant="ghost">고스트</Button>
<Button variant="destructive">삭제</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent>내용</CardContent>
</Card>
```

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>열기</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>다이얼로그 제목</DialogTitle>
    </DialogHeader>
    {/* 내용 */}
  </DialogContent>
</Dialog>
```

### Dropdown

```tsx
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@/components/ui/dropdown';

<Dropdown>
  <DropdownTrigger>메뉴</DropdownTrigger>
  <DropdownContent>
    <DropdownItem>항목 1</DropdownItem>
    <DropdownItem>항목 2</DropdownItem>
  </DropdownContent>
</Dropdown>
```

### Tooltip

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger>호버</TooltipTrigger>
  <TooltipContent>툴팁 내용</TooltipContent>
</Tooltip>
```

---

## 컴포넌트 사용 가이드라인

### 파일 명명 규칙

- PascalCase: `MyComponent.tsx`
- 폴더 기반 구조: 관련 파일은 같은 폴더에

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-11 | `ui/layout/templates/pages` 기준으로 구조 설명 갱신, `common` 혼합 레이어 상태 반영 |

### Import 순서

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { cn } from '@/lib/utils';

// 3. 컴포넌트
import { Button } from '@/components/ui/button';

// 4. editor domain hook
import { useEditorState } from '@/components/common/editor/useEditorState';

// 5. 타입
import type { FileNode } from '@/types';
```

### Props 정의

```typescript
interface MyComponentProps {
  // 필수 props
  title: string;
  
  // 선택 props (? 사용)
  description?: string;
  
  // 이벤트 핸들러 (on 접두사)
  onClick?: () => void;
  
  // children
  children?: React.ReactNode;
}
```

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
