# DMS 컴포넌트 가이드

> 최종 업데이트: 2026-02-02

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
│   ├── page/                  # 페이지 컴포넌트
│   └── viewer/                # 뷰어 컴포넌트
├── layout/                    # 레이아웃 컴포넌트
│   ├── AppLayout.tsx          # 앱 전체 레이아웃
│   ├── ContentArea.tsx        # 콘텐츠 영역
│   ├── Header.tsx             # 헤더
│   ├── TabBar.tsx             # 탭 바
│   └── sidebar/               # 사이드바 관련
├── pages/                     # 페이지별 컴포넌트
│   ├── home/                  # 홈 페이지
│   ├── markdown/              # 마크다운 페이지
│   └── wiki/                  # 위키 페이지
├── templates/                 # 템플릿
│   └── DocPageTemplate.tsx    # 문서 페이지 템플릿
└── ui/                        # 기본 UI 컴포넌트
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

문서 페이지의 기본 템플릿입니다.

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

shadcn/ui 기반의 기본 UI 컴포넌트들입니다.

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

### Import 순서

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { cn } from '@/lib/utils';

// 3. 컴포넌트
import { Button } from '@/components/ui/button';

// 4. 훅
import { useEditor } from '@/hooks';

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
