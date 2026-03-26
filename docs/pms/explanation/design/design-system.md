# 디자인 시스템 가이드

SSOO 프로젝트의 일관된 UI/UX를 위한 디자인 시스템 표준 문서입니다.

## 🔗 Storybook 바로가기

> **컴포넌트의 실제 적용 모습과 인터랙티브 예시는 Storybook에서 확인하세요.**
>
> - **[Storybook - UI 컴포넌트 카탈로그](../reference/storybook/index.html)**
>
> 이 문서는 **"왜 이 디자인 규칙인가"** (브랜드 가이드, 의사결정)를 설명합니다.

---

## 목차
1. [색상 체계](#색상-체계)
2. [레이아웃](#레이아웃)
3. [타이포그래피](#타이포그래피)
4. [아이콘 크기](#아이콘-크기)
5. [컨트롤 높이 표준](#컨트롤-높이-표준)
6. [버튼](#버튼)
7. [간격 및 레이아웃](#간격-및-레이아웃)
8. [사용 예시](#사용-예시)

---

## 색상 체계

> 📝 그룹웨어 색상 체계를 기반으로 브랜드 일관성을 유지합니다.
> 
> ⚠️ **중요**: 모든 색상은 CSS 변수 기반 Tailwind 클래스를 사용합니다. 하드코딩된 색상 코드(`[#XXXXXX]`)는 사용하지 않습니다.

### LS CI 색상 팔레트

공식 CI 색상 가이드에 따른 색상 체계입니다.

#### 메인 컬러

| 색상명 | HEX | RGB | Tailwind 클래스 | 용도 |
|-------|-----|-----|-----------------|------|
| **LS BLUE** | `#0A1E5A` | RGB(10, 30, 90) | `ls-blue` | CI 메인 블루, 공식 로고 |
| **LS RED** | `#FA002D` | RGB(250, 0, 45) | `ls-red` | CI 메인 레드, Destructive 액션 |
| **LS RED Hover** | `#d90027` | - | `ls-red-hover` | LS RED의 Hover 상태 |

#### 서브 컬러

| 색상명 | HEX | RGB | Tailwind 클래스 | 용도 |
|-------|-----|-----|-----------------|------|
| **GREEN** | `#009BB4` | RGB(0, 155, 180) | `ls-green` | 성공, 완료 상태 |
| **BLUE** | `#0569A0` | RGB(5, 105, 160) | `ls-sub-blue` | 정보, 링크 |
| **GRAY** | `#7D8282` | RGB(125, 130, 130) | `ls-gray` | 비활성, 보조 텍스트 |
| **SILVER** | `#87827D` | RGB(135, 130, 125) | `ls-silver` | 테두리, 구분선 |
| **GOLD** | `#7D0D0D` | RGB(125, 13, 13) | `ls-gold` | 특별 강조, VIP |

### SSOO 테마 색상 팔레트

그룹웨어 기반 앱 전용 색상 체계입니다.

| 색상명 | HEX | Tailwind 클래스 | 용도 |
|-------|-----|-----------------|------|
| **Primary** | `#003876` | `ssoo-primary` | 메인 브랜드색, CUD 버튼 |
| **Primary Hover** | `#235a98` | `ssoo-primary-hover` | Hover 상태 |
| **Secondary** | `#235a98` | `ssoo-secondary` | 보조색, 일반 버튼 |
| **Portal Background** | `#F9FBFD` | `ssoo-background` | 페이지 배경 |
| **Content Border** | `#9FC1E7` | `ssoo-content-border` | 카드/패널 테두리 |
| **Content Background** | `#DEE7F1` | `ssoo-content-bg` | 카드 배경, Muted 영역 |
| **Sitemap Title** | `#016CA2` | `ssoo-sitemap-title` | 링크 색상, 액센트 |
| **Sitemap Bullet** | `#00588A` | `ssoo-sitemap-bullet` | 보조 액센트 |
| **Sitemap Background** | `#F6FBFF` | `ssoo-sitemap-bg` | Hover 배경 |

> 📝 **참고**: 레드 색상은 LS CI의 `ls-red`를 사용합니다. (Destructive 액션, 경고)

### CSS 변수

```css
/* globals.css에서 정의됨 */

/* SSOO 테마 색상 */
--ssoo-primary: #003876;
--ssoo-primary-hover: #235a98;
--ssoo-secondary: #235a98;
--ssoo-background: #F9FBFD;
--ssoo-content-border: #9FC1E7;
--ssoo-content-background: #DEE7F1;
--ssoo-sitemap-title: #016CA2;
--ssoo-sitemap-bullet: #00588A;
--ssoo-sitemap-background: #F6FBFF;

/* LS CI 색상 팔레트 */
--ls-blue: #0A1E5A;      /* LS BLUE - 메인 */
--ls-red: #FA002D;       /* LS RED - 메인 (Destructive 용도로 사용) */
--ls-green: #009BB4;     /* GREEN - 서브 */
--ls-sub-blue: #0569A0;  /* BLUE - 서브 */
--ls-gray: #7D8282;      /* GRAY - 서브 */
--ls-silver: #87827D;    /* SILVER - 서브 */
--ls-gold: #7D0D0D;      /* GOLD - 서브 */

/* Tailwind 전용 (CSS 변수 없음) */
ls-red-hover: #d90027;   /* LS RED Hover */
```

### Tailwind 클래스 사용법

> ⚠️ **필수**: 색상 코드를 직접 사용하지 말고 Tailwind 클래스를 사용하세요.

```tsx
// ❌ 잘못된 사용 (하드코딩)
<div className="bg-[#003876] text-[#FA002D]">

// ✅ 올바른 사용 (Tailwind 클래스)
<div className="bg-ssoo-primary text-ls-red">

// ✅ LS CI 색상 사용
<div className="bg-ls-blue text-ls-red">
```

### Primary (네이비 블루)
**용도**: CUD(생성/수정/삭제) 작업, 중요한 액션, 메인 버튼
```tsx
bg-ssoo-primary            /* Primary */
hover:bg-ssoo-primary-hover /* Hover 상태 */
```

### Secondary (라이트 네이비)
**용도**: 일반 작업, 보조 버튼, 취소 액션
```tsx
bg-ssoo-secondary          /* Secondary */
hover:bg-ssoo-primary      /* Hover 시 Primary로 */
```

### Destructive (LS Red)
**용도**: 삭제, 경고, 위험한 작업
```tsx
bg-ls-red              /* LS RED (#FA002D) */
hover:bg-ls-red-hover  /* Hover (#d90027) */
```

### Outline (테두리)
**용도**: 덜 중요한 액션, 필터, 정렬
```tsx
border border-ssoo-content-border bg-white text-ssoo-primary
hover:bg-ssoo-sitemap-bg
```

### Ghost (배경 없음)
**용도**: 아이콘 버튼, 서브 액션
```tsx
text-ssoo-primary
hover:bg-ssoo-content-bg
```

### Link (링크 스타일)
**용도**: 텍스트 링크, 내비게이션
```tsx
text-ssoo-sitemap-title
hover:underline
```

---

## 레이아웃

> 📐 그룹웨어와 일관된 레이아웃 구조를 사용합니다.

### 헤더

| 속성 | 값 | Tailwind 클래스 | 설명 |
|------|-----|-----------------|------|
| **높이** | 60px | `h-[60px]` | 고정 헤더 높이 |
| **배경색** | `#003876` | `bg-ssoo-primary` | Primary 색상 |
| **텍스트** | White | `text-white` | 아이콘, 버튼 텍스트 |

> 📝 로고와 접기 버튼은 **사이드바 헤더**에만 존재합니다. 메인 헤더에는 통합 검색란이 위치합니다.

```tsx
<header className="h-[60px] bg-ssoo-primary flex items-center justify-between px-4">
  {/* 왼쪽: 통합 검색 (추후 Elasticsearch/AI 챗 연동) */}
  <div className="flex items-center flex-1 max-w-md">
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
      <input
        type="text"
        placeholder="통합 검색... (준비 중)"
        disabled
        className="w-full h-control-h pl-9 pr-4 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
      />
    </div>
  </div>
  
  {/* 오른쪽: 액션 버튼들 */}
  <div className="flex items-center gap-2">
    <button className="h-control-h px-3 bg-white text-ssoo-primary rounded-md">새 프로젝트</button>
    <button className="hover:bg-white/10 text-white">알림</button>
    <button className="hover:bg-white/10 text-white">프로필</button>
  </div>
</header>
```

### 사이드바

| 속성 | 값 | Tailwind 클래스 | 설명 |
|------|-----|-----------------|------|
| **펼침 너비** | 340px | - | 그룹웨어 기준 |
| **접힘 너비** | 56px | - | 아이콘만 표시 |
| **헤더 높이** | 60px | `h-[60px]` | 메인 헤더와 동일 |
| **헤더 배경** | `#003876` | `bg-ssoo-primary` | Primary |
| **본문 배경** | `#DEE7F1` | `bg-ssoo-content-bg` | Content Background |
| **우측 보더** | `#9FC1E7` | `border-ssoo-content-border` | 사이드바 구분선 |

```tsx
<aside 
  className="bg-ssoo-content-bg border-r border-ssoo-content-border" 
  style={{ width: 340 }}
>
  {/* 사이드바 헤더 - 로고 + 접기 버튼 */}
  <div className="h-[60px] bg-ssoo-primary flex items-center justify-between px-3">
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 bg-white rounded flex items-center justify-center">
        <span className="text-ssoo-primary font-bold">S</span>
      </div>
      <span className="text-white font-semibold text-lg">SSOO</span>
    </div>
    <button className="p-2 hover:bg-white/10 rounded-lg">
      <Menu className="w-5 h-5 text-white" />
    </button>
  </div>
  
  {/* 콘텐츠 영역 */}
  <div className="bg-ssoo-content-bg">
    {/* 검색, 메뉴 등 */}
  </div>
</aside>
```

#### 사이드바 요소 스타일

| 요소 | Tailwind 클래스 | 설명 |
|------|-----------------|------|
| 외곽 보더 | `border-ssoo-content-border` | 사이드바 우측 구분선 |
| 섹션 보더 | `border-gray-200` | 내부 섹션 구분선 |
| 검색란 보더 | `border-ssoo-content-border` | 외곽 보더와 동일 |
| 아이콘 색상 | `text-ssoo-primary` | Primary |
| 텍스트 색상 | `text-ssoo-primary` | Primary |
| Hover 배경 | `bg-ssoo-sitemap-bg` | 은은한 Hover (Sitemap Background) |
| 선택 배경 | `bg-ssoo-content-border` | 활성화된 메뉴 항목 |

### 탭바 (MDI 탭 영역)

| 속성 | 값 | 설명 |
|------|-----|------|
| **영역 높이** | 53px | 사이드바 검색 영역과 수평 정렬 |
| **탭 높이** | 36px (`h-control-h`) | 표준 컨트롤 높이 |
| 탭 최소 너비 | 120px | |
| 탭 최대 너비 | 200px | |
| 배경색 | `bg-gray-50` | |
| 하단 보더 | `border-gray-200` | |

```tsx
<div className="h-[53px] flex items-end bg-gray-50 border-b border-gray-200 px-2">
  {/* 탭 버튼들 - 하단 정렬 */}
  <button className="h-control-h px-4 flex items-center gap-2 border-t border-x rounded-t-md">
    <span>탭 제목</span>
    <X className="w-4 h-4" />
  </button>
</div>
```

---

## 폰트 스택

> **핵심 원칙**: 폰트는 전역에서 정의하고, 개별 컴포넌트는 상속받습니다.

### 기본 폰트 (font-sans) - 시스템 폰트

```css
font-family: 
  -apple-system, BlinkMacSystemFont, 
  'Segoe UI', Roboto, Oxygen, 
  Ubuntu, Cantarell, 'Open Sans', 
  'Helvetica Neue', sans-serif;
```

### 코드 폰트 (font-mono)

```css
font-family: 
  "Fira Code", "JetBrains Mono", 
  "SF Mono", Monaco, Consolas, 
  monospace;
```

### 정의 위치

| 파일 | 역할 | 수정 가능 |
|------|------|----------|
| `globals.css` | `body`에 폰트 정의 | ✅ 유일한 정의 위치 |
| 컴포넌트 | 상속받음 | ❌ 개별 정의 금지 |

### 금지되는 패턴

```tsx
// ❌ 금지: 컴포넌트에서 직접 폰트 정의
style={{ fontFamily: 'Arial, sans-serif' }}
className="font-['Roboto']"

// ✅ 허용: Tailwind 클래스 사용
className="font-mono"  // 코드용
```

---

## 타이포그래피

### H1 - 페이지 제목
**크기**: 28px (1.75rem)  
**가중치**: Bold (700)  
**용도**: 페이지 최상단 메인 제목

```tsx
<h1 className="heading-1">고객 요청 관리</h1>
// 또는
<h1 className="text-h1 text-gray-900 font-bold">고객 요청 관리</h1>
```

### H2 - 섹션 제목
**크기**: 24px (1.5rem)  
**가중치**: Semibold (600)  
**용도**: 페이지 내 주요 섹션 제목

```tsx
<h2 className="heading-2">요청 목록</h2>
// 또는
<h2 className="text-h2 text-gray-800 font-semibold">요청 목록</h2>
```

### H3 - 하위 섹션 제목
**크기**: 20px (1.25rem)  
**가중치**: Semibold (600)  
**용도**: 카드/패널 제목, 폼 섹션 제목

```tsx
<h3 className="heading-3">기본 정보</h3>
// 또는
<h3 className="text-h3 text-gray-800 font-semibold">기본 정보</h3>
```

### Body Text - 본문
**크기**: 14px (0.875rem)  
**가중치**: Regular (400)  
**용도**: 일반 텍스트, 설명, 레이블

```tsx
<p className="body-text">요청 내용을 입력하세요.</p>
// 회색 텍스트
<p className="body-text-muted">선택 사항입니다.</p>
```

---

## 아이콘 크기

각 텍스트 레벨에 맞는 아이콘 크기를 사용합니다.

| 텍스트 레벨 | 아이콘 크기 | 클래스명 | 실제 크기 |
|------------|-----------|---------|----------|
| H1 | icon-h1 | `icon-h1` | 28px |
| H2 | icon-h2 | `icon-h2` | 24px |
| H3 | icon-h3 | `icon-h3` | 20px |
| Body | icon-body | `icon-body` | 16px |

### 사용 예시

```tsx
// H1과 함께
<div className="flex items-center gap-2">
  <FolderIcon className="icon-h1 text-blue-600" />
  <h1 className="heading-1">프로젝트 관리</h1>
</div>

// H2와 함께
<div className="flex items-center gap-2">
  <ListIcon className="icon-h2 text-gray-700" />
  <h2 className="heading-2">요청 목록</h2>
</div>

// H3와 함께
<div className="flex items-center gap-2">
  <InfoIcon className="icon-h3 text-gray-600" />
  <h3 className="heading-3">상세 정보</h3>
</div>

// Body와 함께
<div className="flex items-center gap-1">
  <CheckIcon className="icon-body text-green-600" />
  <span className="body-text">완료</span>
</div>
```

---

## 컨트롤 높이 표준

> 📏 UI 컨트롤(버튼, 입력, 탭, 메뉴 등)의 높이를 **36px**로 통일하여 일관성 있는 인터페이스를 제공합니다.

### 높이 토큰

| 크기 | Tailwind 클래스 | 실제 높이 | 용도 |
|------|----------------|----------|------|
| **Small** | `h-control-h-sm` | 32px | 밀집된 UI, 테이블 내 컨트롤 |
| **Default** | `h-control-h` | 36px | **표준** - 버튼, 입력, 탭, 메뉴 |
| **Large** | `h-control-h-lg` | 44px | 강조가 필요한 CTA 버튼 |

### 적용 대상

| 컴포넌트 | 클래스 | 높이 |
|----------|--------|------|
| Button (기본) | `h-control-h` | 36px |
| Input | `h-control-h` | 36px |
| Select | `h-control-h` | 36px |
| MDI 탭 | `h-control-h` | 36px |
| 사이드바 검색란 | `h-control-h` | 36px |
| 메뉴 트리 노드 | `h-control-h` | 36px |
| 즐겨찾기 항목 | `h-control-h` | 36px |
| 열린 탭 항목 | `h-control-h` | 36px |

### 인라인 아이콘 버튼

- 닫기/즐겨찾기/검색 클리어 등 인라인 아이콘은 `h-control-h-sm w-control-h-sm` 기준.

### 컨트롤 컨테이너

- 표준 컨트롤(36px)을 담는 바/패널: `min-h-[52px] px-4 py-2` (36px + 상하 8px)
- 적용 대상: PageHeader(ActionBar/FilterBar), DataGrid Pagination Footer, 기타 툴바류
- 예외: TabBar 컨테이너는 레이아웃 규칙(53px)

### 사용 예시

```tsx
// 표준 높이 적용
<input className="h-control-h px-3 border rounded-md" />
<Button>저장</Button>  {/* 자동으로 h-control-h 적용 */}

// 작은 컨트롤
<Button size="sm">필터</Button>  {/* h-control-h-sm */}

// 큰 컨트롤
<Button size="lg">시작하기</Button>  {/* h-control-h-lg */}

// 유틸리티 클래스
<div className="control-height">커스텀 컨트롤</div>
```

---

## 버튼

### 버튼 높이 표준
**기본 높이**: 36px (`h-control-h`)

### 버튼 변형

#### 1. Primary (default) - 네이비 블루
**용도**: 생성, 저장, 확인 등 주요 액션
```tsx
<Button>생성</Button>
<Button variant="default">저장</Button>
```

#### 2. Secondary - 라이트 네이비
**용도**: 일반 작업, 보조 액션
```tsx
<Button variant="secondary">취소</Button>
<Button variant="secondary">닫기</Button>
```

#### 3. Outline - 테두리만
**용도**: 필터, 정렬, 덜 중요한 액션
```tsx
<Button variant="outline">필터</Button>
<Button variant="outline">정렬</Button>
```

#### 4. Destructive - 빨간색
**용도**: 삭제, 위험한 작업
```tsx
<Button variant="destructive">삭제</Button>
```

#### 5. Ghost - 배경 없음
**용도**: 아이콘 버튼, 서브 액션
```tsx
<Button variant="ghost">더보기</Button>
```

### 버튼 크기

```tsx
// 작은 버튼 (높이 32px)
<Button size="sm">작게</Button>

// 기본 버튼 (높이 36px)
<Button>기본</Button>

// 큰 버튼 (높이 44px)
<Button size="lg">크게</Button>

// 아이콘 버튼 (36x36px)
<Button size="icon">
  <PlusIcon className="icon-body" />
</Button>
```

### 텍스트 오버플로우 처리

#### 한 줄 말줄임
```tsx
<Button className="max-w-xs">
  <span className="text-ellipsis-line">
    매우 긴 버튼 텍스트가 있을 때 처리
  </span>
</Button>
```

#### Tooltip과 함께 사용
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button className="max-w-xs">
        <span className="text-ellipsis-line">
          매우 긴 버튼 텍스트
        </span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>매우 긴 버튼 텍스트 전체 내용</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 간격 및 레이아웃

### 표준 간격

| 용도 | 간격 | Tailwind 클래스 |
|-----|------|----------------|
| 요소 사이 작은 간격 | 8px | `gap-2` |
| 요소 사이 중간 간격 | 16px | `gap-4` |
| 섹션 사이 간격 | 24px | `gap-6` |
| 페이지 패딩 | 24px | `p-6` |

### 레이아웃 가이드

```tsx
// 페이지 컨테이너
<div className="p-6 space-y-6">
  {/* H1 제목 */}
  <div className="flex items-center justify-between">
    <h1 className="heading-1">페이지 제목</h1>
    <Button>액션</Button>
  </div>

  {/* H2 섹션 */}
  <div className="space-y-4">
    <h2 className="heading-2">섹션 제목</h2>
    <div className="bg-white rounded-lg border p-4">
      {/* 콘텐츠 */}
    </div>
  </div>
</div>
```

---

## 사용 예시

### 페이지 헤더

```tsx
import { Button } from '@/components/ui/button';
import { PlusIcon, FilterIcon } from 'lucide-react';

export function PageHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* 제목 */}
      <div className="flex items-center gap-3">
        <FolderIcon className="icon-h1 text-ssoo-primary" />
        <h1 className="heading-1">고객 요청 관리</h1>
      </div>
      
      {/* 액션 버튼들 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <FilterIcon className="icon-body" />
          필터
        </Button>
        <Button>
          <PlusIcon className="icon-body" />
          새 요청
        </Button>
      </div>
    </div>
  );
}
```

### 카드 컴포넌트

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon } from 'lucide-react';

export function RequestCard({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="heading-3">{title}</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <EditIcon className="icon-body" />
            </Button>
            <Button variant="ghost" size="icon">
              <TrashIcon className="icon-body text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="body-text">{description}</p>
      </CardContent>
    </Card>
  );
}
```

### 폼 레이아웃

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateForm() {
  return (
    <form className="space-y-6">
      {/* 폼 섹션 */}
      <div className="space-y-4">
        <h3 className="heading-3">기본 정보</h3>
        
        <div className="space-y-2">
          <Label className="body-text">요청 제목</Label>
          <Input placeholder="제목을 입력하세요" />
        </div>
        
        <div className="space-y-2">
          <Label className="body-text">설명</Label>
          <Textarea placeholder="설명을 입력하세요" />
          <p className="body-text-muted">선택 사항입니다.</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary">
          취소
        </Button>
        <Button type="submit">
          생성
        </Button>
      </div>
    </form>
  );
}
```

### 리스트 아이템

```tsx
import { CheckCircleIcon, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RequestListItem({ request }) {
  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-gray-50">
      {/* 왼쪽: 상태 + 정보 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {request.status === 'completed' ? (
          <CheckCircleIcon className="icon-h3 text-green-600 flex-shrink-0" />
        ) : (
          <ClockIcon className="icon-h3 text-orange-600 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="heading-3 text-ellipsis-line">{request.title}</h3>
          <p className="body-text-muted text-ellipsis-line">{request.description}</p>
        </div>
      </div>

      {/* 오른쪽: 액션 */}
      <div className="flex gap-2 ml-4">
        <Button variant="outline" size="sm">상세</Button>
        <Button variant="secondary" size="sm">편집</Button>
      </div>
    </div>
  );
}
```

---

## 체크리스트

새로운 컴포넌트나 페이지를 만들 때 다음을 확인하세요:

- [ ] H1, H2, H3는 적절한 클래스(`heading-1`, `heading-2`, `heading-3`) 사용
- [ ] 아이콘 크기가 텍스트 레벨과 일치 (`icon-h1`, `icon-h2`, `icon-h3`, `icon-body`)
- [ ] 버튼은 표준 높이(36px, `h-control-h`) 사용
- [ ] **Primary(#003876)는 주요 액션, Secondary(#235a98)는 보조 액션**
- [ ] **외곽 테두리는 #9FC1E7, 내부 구분선은 gray-200**
- [ ] **Hover 배경은 #F6FBFF (은은한), 선택 상태는 #9FC1E7**
- [ ] 긴 텍스트는 `text-ellipsis-line` + Tooltip 처리
- [ ] 일관된 간격 사용 (`gap-2`, `gap-4`, `gap-6`)
- [ ] 본문 텍스트는 `body-text` 또는 `body-text-muted` 사용

---

## 참고 자료

- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

