# 🎨 Design System

Markdown Wiki System의 일관된 디자인 언어와 UI 구성 요소에 대한 가이드입니다.

## 📋 목차

1. [디자인 원칙](#-디자인-원칙)
2. [색상 체계](#-색상-체계)
3. [타이포그래피](#-타이포그래피)
4. [간격 및 레이아웃](#-간격-및-레이아웃)
5. [컴포넌트 디자인](#-컴포넌트-디자인)
6. [반응형 디자인](#-반응형-디자인)
7. [애니메이션](#-애니메이션)

---

## 🎯 디자인 원칙

### 핵심 가치

1. **일관성 (Consistency)**
   - 모든 컴포넌트가 동일한 디자인 패턴을 따름
   - 색상, 간격, 타이포그래피의 일관된 사용

2. **직관성 (Intuitiveness)**
   - 사용자가 쉽게 이해할 수 있는 인터페이스
   - 명확한 시각적 계층 구조

3. **접근성 (Accessibility)**
   - WCAG 2.1 AA 준수
   - 키보드 탐색 지원
   - 충분한 색상 대비

4. **효율성 (Efficiency)**
   - 빠른 작업 흐름
   - 최소한의 클릭으로 목표 달성

---

## 🎨 색상 체계

### 주요 색상 (Primary Colors)

```css
:root {
  /* Blue - 주요 액션 */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  
  /* Gray - 텍스트 및 배경 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

### 시맨틱 색상 (Semantic Colors)

```css
:root {
  /* 상태 색상 */
  --success: #10b981;    /* 성공, 완료 */
  --warning: #f59e0b;    /* 경고, 주의 */
  --error: #ef4444;      /* 오류, 위험 */
  --info: #3b82f6;       /* 정보, 알림 */
  
  /* 특수 용도 */
  --primary: #3b82f6;    /* 주요 버튼, 링크 */
  --secondary: #6b7280;  /* 보조 요소 */
  --accent: #8b5cf6;     /* 강조 요소 */
}
```

### 사용 예제

```tsx
// Tailwind 클래스
<Button className="bg-blue-500 hover:bg-blue-600 text-white">
  주요 액션
</Button>

<div className="bg-gray-50 border border-gray-200">
  카드 컨테이너
</div>

// CSS 변수 사용
<div style={{ backgroundColor: 'var(--blue-500)' }}>
  커스텀 스타일
</div>
```

---

## ✍️ 타이포그래피

### 폰트 스택

```css
/* 주요 폰트 */
font-family: 
  "Pretendard Variable", 
  Pretendard, 
  -apple-system, 
  BlinkMacSystemFont, 
  system-ui, 
  Roboto, 
  "Helvetica Neue", 
  "Segoe UI", 
  "Apple SD Gothic Neo", 
  "Noto Sans KR", 
  "Malgun Gothic", 
  "Apple Color Emoji", 
  "Segoe UI Emoji", 
  "Segoe UI Symbol", 
  sans-serif;

/* 코드 폰트 */
font-family: 
  "Fira Code", 
  "JetBrains Mono", 
  "SF Mono", 
  Monaco, 
  "Cascadia Code", 
  "Roboto Mono", 
  Consolas, 
  "Courier New", 
  monospace;
```

### 텍스트 스케일

| 이름 | 크기 | 용도 | Tailwind |
|------|------|------|----------|
| Heading 1 | 36px / 2.25rem | 페이지 제목 | `text-4xl` |
| Heading 2 | 30px / 1.875rem | 섹션 제목 | `text-3xl` |
| Heading 3 | 24px / 1.5rem | 서브섹션 | `text-2xl` |
| Heading 4 | 20px / 1.25rem | 컴포넌트 제목 | `text-xl` |
| Large | 18px / 1.125rem | 강조 텍스트 | `text-lg` |
| Base | 16px / 1rem | 본문 텍스트 | `text-base` |
| Small | 14px / 0.875rem | 부가 정보 | `text-sm` |
| Extra Small | 12px / 0.75rem | 라벨, 캡션 | `text-xs` |

### 사용 예제

```tsx
// 페이지 제목
<h1 className="text-4xl font-bold text-gray-900">
  마크다운 위키
</h1>

// 섹션 제목
<h2 className="text-2xl font-semibold text-gray-800 mb-4">
  파일 목록
</h2>

// 본문 텍스트
<p className="text-base text-gray-600 leading-relaxed">
  위키 시스템을 사용하여 문서를 관리하세요.
</p>

// 보조 정보
<span className="text-sm text-gray-500">
  마지막 수정: 2024년 1월 15일
</span>
```

---

## 📐 간격 및 레이아웃

### 간격 시스템

| 이름 | 크기 | 용도 | Tailwind |
|------|------|------|----------|
| xs | 4px | 아주 작은 간격 | `p-1`, `m-1` |
| sm | 8px | 작은 간격 | `p-2`, `m-2` |
| md | 16px | 기본 간격 | `p-4`, `m-4` |
| lg | 24px | 큰 간격 | `p-6`, `m-6` |
| xl | 32px | 아주 큰 간격 | `p-8`, `m-8` |
| 2xl | 48px | 섹션 간격 | `p-12`, `m-12` |

### 레이아웃 패턴

#### 1. 컨테이너 패딩
```tsx
// 메인 컨테이너
<div className="p-6">
  {/* 내용 */}
</div>

// 카드 컨테이너
<div className="p-4 rounded-md border">
  {/* 카드 내용 */}
</div>
```

#### 2. 컴포넌트 간격
```tsx
// 수직 간격
<div className="space-y-4">
  <ComponentA />
  <ComponentB />
  <ComponentC />
</div>

// 수평 간격
<div className="flex space-x-2">
  <Button>확인</Button>
  <Button>취소</Button>
</div>
```

#### 3. 그리드 시스템
```tsx
// 2열 레이아웃
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>왼쪽 컨텐츠</div>
  <div>오른쪽 컨텐츠</div>
</div>

// 자동 크기 조정
<div className="grid grid-cols-auto-fit gap-4">
  <Card>카드 1</Card>
  <Card>카드 2</Card>
  <Card>카드 3</Card>
</div>
```

---

## 🧩 컴포넌트 디자인

### 1. 버튼 (Buttons)

#### 기본 스타일
```tsx
// 주요 버튼
<button className="
  px-4 py-2 
  bg-blue-500 hover:bg-blue-600 
  text-white font-medium 
  rounded-md 
  transition-colors duration-200
  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
">
  주요 액션
</button>

// 보조 버튼
<button className="
  px-4 py-2 
  bg-gray-200 hover:bg-gray-300 
  text-gray-800 font-medium 
  rounded-md 
  transition-colors duration-200
">
  보조 액션
</button>
```

#### 크기 변형
```tsx
// 작은 버튼
<button className="px-3 py-1.5 text-sm">작음</button>

// 기본 버튼
<button className="px-4 py-2 text-base">기본</button>

// 큰 버튼
<button className="px-6 py-3 text-lg">큼</button>
```

### 2. 카드 (Cards)

#### 기본 카드
```tsx
<div className="
  bg-white 
  border border-gray-200 
  rounded-md 
  p-6 
  shadow-sm 
  hover:shadow-md 
  transition-shadow duration-200
">
  <h3 className="text-lg font-semibold mb-2">카드 제목</h3>
  <p className="text-gray-600">카드 내용</p>
</div>
```

#### 카드 변형
```tsx
// 강조 카드
<div className="
  bg-blue-50 
  border border-blue-200 
  rounded-md p-6
">
  강조된 내용
</div>

// 경고 카드
<div className="
  bg-yellow-50 
  border border-yellow-200 
  rounded-md p-6
">
  주의가 필요한 내용
</div>
```

### 3. 입력 필드 (Input Fields)

#### 기본 입력 필드
```tsx
<input className="
  w-full 
  px-3 py-2 
  border border-gray-300 
  rounded-md 
  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
  placeholder-gray-400
" 
placeholder="텍스트를 입력하세요" />
```

#### 라벨과 함께
```tsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    파일명
  </label>
  <input className="
    w-full px-3 py-2 
    border border-gray-300 rounded-md 
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  " />
</div>
```

### 4. 배지 (Badges)

#### 상태 배지
```tsx
// NEW 배지
<span className="
  inline-flex items-center 
  px-2 py-1 
  rounded-full 
  text-xs font-medium 
  bg-red-100 text-red-800
">
  NEW
</span>

// UPDATE 배지
<span className="
  inline-flex items-center 
  px-2 py-1 
  rounded-full 
  text-xs font-medium 
  bg-yellow-100 text-yellow-800
">
  UPDATE
</span>
```

### 5. 알림 (Notifications)

#### 알림 컨테이너
```tsx
<div className="
  fixed top-4 right-4 
  w-80 
  bg-white 
  border border-gray-200 
  rounded-md 
  shadow-lg 
  p-4
">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      {/* 아이콘 */}
    </div>
    <div className="ml-3 w-0 flex-1">
      <p className="text-sm font-medium text-gray-900">
        알림 제목
      </p>
      <p className="mt-1 text-sm text-gray-500">
        알림 메시지
      </p>
    </div>
  </div>
</div>
```

---

## 📱 반응형 디자인

### 브레이크포인트

| 크기 | 최소 너비 | Tailwind |
|------|-----------|----------|
| Mobile | 0px | `기본` |
| Tablet | 768px | `md:` |
| Desktop | 1024px | `lg:` |
| Large Desktop | 1280px | `xl:` |
| Extra Large | 1536px | `2xl:` |

### 반응형 패턴

#### 1. 레이아웃 조정
```tsx
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4 
  md:gap-6
">
  {/* 그리드 아이템 */}
</div>
```

#### 2. 텍스트 크기 조정
```tsx
<h1 className="
  text-2xl 
  md:text-3xl 
  lg:text-4xl 
  font-bold
">
  반응형 제목
</h1>
```

#### 3. 간격 조정
```tsx
<div className="
  p-4 
  md:p-6 
  lg:p-8
">
  반응형 패딩
</div>
```

#### 4. 표시/숨김
```tsx
<div className="
  block 
  md:hidden
">
  모바일에서만 표시
</div>

<div className="
  hidden 
  md:block
">
  태블릿 이상에서 표시
</div>
```

---

## 🎬 애니메이션

### 전환 효과 (Transitions)

#### 기본 전환
```css
/* 색상 변화 */
.transition-colors {
  transition: color 200ms ease-in-out, 
              background-color 200ms ease-in-out;
}

/* 크기 변화 */
.transition-transform {
  transition: transform 200ms ease-in-out;
}

/* 투명도 변화 */
.transition-opacity {
  transition: opacity 300ms ease-in-out;
}
```

#### 호버 효과
```tsx
// 버튼 호버
<button className="
  transform 
  hover:scale-105 
  transition-transform 
  duration-200
">
  호버 시 커짐
</button>

// 카드 호버
<div className="
  shadow-md 
  hover:shadow-lg 
  transition-shadow 
  duration-200
">
  호버 시 그림자 증가
</div>
```

### 키프레임 애니메이션

#### 페이드 인
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 300ms ease-in-out;
}
```

#### 슬라이드 인
```css
@keyframes slideInRight {
  from { 
    transform: translateX(100%); 
    opacity: 0; 
  }
  to { 
    transform: translateX(0); 
    opacity: 1; 
  }
}

.animate-slide-in-right {
  animation: slideInRight 300ms ease-out;
}
```

### 사용 예제

```tsx
// 알림 애니메이션
<div className="
  animate-slide-in-right
  transition-all duration-300 ease-out
">
  새로운 알림
</div>

// 모달 애니메이션
<div className="
  animate-fade-in
  transition-opacity duration-200
">
  <div className="
    transform scale-95 
    transition-transform duration-200
  ">
    모달 내용
  </div>
</div>
```

---

## 🎨 색상 사용 가이드라인

### 접근성 고려사항

1. **색상 대비**: 최소 4.5:1 비율 유지
2. **색맹 고려**: 색상만으로 정보를 전달하지 않음
3. **포커스 표시**: 키보드 탐색 시 명확한 포커스 표시

### 색상 조합 예제

```tsx
// 좋은 대비 예제
<div className="bg-gray-900 text-white">
  높은 대비 텍스트
</div>

<div className="bg-blue-500 text-white">
  읽기 쉬운 조합
</div>

// 피해야 할 조합
<div className="bg-gray-300 text-gray-400">
  낮은 대비 - 피하세요
</div>
```

---

## 🔧 개발자 도구

### 디자인 토큰 확인

```typescript
// 디자인 토큰 객체
export const designTokens = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  }
};
```

### 스타일 유틸리티

```typescript
// 클래스 이름 조합 유틸리티
export function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// 사용 예제
const buttonClasses = cn(
  'px-4 py-2 rounded-md font-medium',
  'transition-colors duration-200',
  isPrimary && 'bg-blue-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
);
```

---

**더 자세한 정보는 [컴포넌트 가이드](components.md)와 [개발 표준](../DEVELOPMENT_STANDARDS.md)을 참조하세요.**