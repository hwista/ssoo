# 커스텀 스크롤바 가이드

> 최종 업데이트: 2026-02-02

---

## 개요

SSOO 프로젝트에서는 일관된 스크롤바 디자인을 위해 커스텀 스크롤바 스타일을 제공합니다.

### 지원 범위
- **WebKit 브라우저** (Chrome, Safari, Edge): `::-webkit-scrollbar` 기반
- **Firefox**: `scrollbar-width`, `scrollbar-color` 속성

---

## 1. 기본 스크롤바

전체 앱에 기본 스크롤바 스타일이 자동 적용됩니다.

```css
/* globals.css에서 자동 적용 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}
```

---

## 2. 유틸리티 클래스

### 크기 조절

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `scrollbar-thin` | 4px | 좁은 영역, 사이드바 |
| `scrollbar-default` | 8px | 기본값 |
| `scrollbar-wide` | 12px | 넓은 콘텐츠 영역 |

```tsx
<div className="overflow-auto scrollbar-thin">
  {/* 얇은 스크롤바 */}
</div>
```

### 색상 테마

| 클래스 | 설명 |
|--------|------|
| (기본) | 회색 계열 |
| `scrollbar-primary` | Primary 색상 (#003876) |
| `scrollbar-accent` | Accent 색상 (#016CA2) |
| `scrollbar-transparent` | 투명 트랙 |

```tsx
<div className="overflow-auto scrollbar-primary">
  {/* Primary 색상 스크롤바 */}
</div>
```

### 동작

| 클래스 | 설명 |
|--------|------|
| `scrollbar-hide` | 스크롤바 숨기기 |
| `scrollbar-on-hover` | 호버 시에만 표시 |
| `scrollbar-rounded` | 둥근 모서리 (9999px) |

```tsx
<div className="overflow-auto scrollbar-on-hover">
  {/* 호버 시에만 스크롤바 표시 */}
</div>
```

### 프리셋

| 클래스 | 설명 |
|--------|------|
| `scrollbar-sidebar` | 사이드바용 (4px, 투명 트랙, 둥근 모서리) |
| `scrollbar-table` | 테이블용 (6px, 테두리 트랙) |

```tsx
<div className="overflow-auto scrollbar-sidebar">
  {/* 사이드바 스타일 스크롤바 */}
</div>
```

---

## 3. ScrollArea 컴포넌트

더 쉬운 사용을 위한 래퍼 컴포넌트입니다.

### 기본 사용

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-[300px]">
  {/* 스크롤 가능한 콘텐츠 */}
</ScrollArea>
```

### Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | 스크롤 방향 |
| `scrollbarSize` | `'thin' \| 'default' \| 'wide'` | `'default'` | 스크롤바 크기 |
| `scrollbarTheme` | `'default' \| 'primary' \| 'accent' \| 'transparent'` | `'default'` | 색상 테마 |
| `showOnHover` | `boolean` | `false` | 호버 시에만 표시 |
| `variant` | `'default' \| 'sidebar' \| 'table'` | `'default'` | 프리셋 변형 |

### 예제

```tsx
// 사이드바용
<ScrollArea variant="sidebar" className="h-full">
  <SidebarContent />
</ScrollArea>

// 테이블용
<ScrollArea variant="table" className="h-[400px]">
  <Table />
</ScrollArea>

// 가로 스크롤 + Primary 색상
<ScrollArea 
  orientation="horizontal" 
  scrollbarTheme="primary"
  className="w-full"
>
  <div className="flex gap-4">
    {/* 가로 스크롤 콘텐츠 */}
  </div>
</ScrollArea>

// 양방향 스크롤 + 호버 시만 표시
<ScrollArea 
  orientation="both" 
  showOnHover
  className="w-[600px] h-[400px]"
>
  <LargeContent />
</ScrollArea>
```

---

## 4. 적용 위치

### 이미 적용된 곳
- `MainSidebar.tsx` - 사이드바 메인 영역
- `FloatingPanel.tsx` - 접힌 사이드바의 플로팅 패널

### 권장 적용 위치
- 드롭다운 메뉴 (긴 목록)
- 모달/다이얼로그 내 콘텐츠
- 테이블 컨테이너
- 코드 블록
- 긴 폼 영역

---

## 5. 스타일 커스터마이징

### globals.css에서 수정

```css
/* 기본 스크롤바 전역 수정 */
::-webkit-scrollbar {
  width: 10px; /* 원하는 크기 */
}

::-webkit-scrollbar-thumb {
  background: #your-color;
}
```

### 새 유틸리티 클래스 추가

```css
@layer utilities {
  .scrollbar-custom::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #color1, #color2);
  }
}
```

---

## 6. 브라우저 호환성

| 브라우저 | 지원 |
|----------|------|
| Chrome | ✅ 전체 지원 |
| Safari | ✅ 전체 지원 |
| Edge | ✅ 전체 지원 |
| Firefox | ⚠️ 일부 지원 (색상, 너비만) |
| IE | ❌ 미지원 |

---

## 관련 파일

- [globals.css](../../../apps/web/pms/src/app/globals.css) - 스크롤바 스타일 정의
- [scroll-area.tsx](../../../apps/web/pms/src/components/ui/scroll-area.tsx) - ScrollArea 컴포넌트

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| SCR-01 | Firefox 스크롤바 색상 개선 | P4 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 스크롤바 문서 최초 작성 |
| 2026-01-21 | 커스텀 스크롤바 CSS 유틸리티 추가 |
| 2026-01-21 | ScrollArea 컴포넌트 추가 |
