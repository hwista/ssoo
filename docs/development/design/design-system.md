# DMS 디자인 시스템

> 최종 업데이트: 2026-02-02

마크다운 위키 시스템의 일관된 디자인 언어와 UI 구성 요소에 대한 가이드입니다.

---

## 1. 디자인 원칙

### 1.1 핵심 가치

| 원칙 | 설명 |
|------|------|
| **일관성** | 모든 컴포넌트가 동일한 디자인 패턴을 따름 |
| **직관성** | 명확한 시각적 계층 구조, 쉬운 인터페이스 |
| **접근성** | WCAG 2.1 AA 준수, 키보드 탐색 지원 |
| **효율성** | 최소한의 클릭으로 목표 달성 |

---

## 2. 색상 체계

### 2.1 주요 색상 (Primary Colors)

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

### 2.2 시맨틱 색상 (Semantic Colors)

| 색상 | 값 | 용도 |
|------|-----|------|
| `--success` | #10b981 | 성공, 완료 |
| `--warning` | #f59e0b | 경고, 주의 |
| `--error` | #ef4444 | 오류, 위험 |
| `--info` | #3b82f6 | 정보, 알림 |
| `--primary` | #3b82f6 | 주요 버튼, 링크 |
| `--secondary` | #6b7280 | 보조 요소 |
| `--accent` | #8b5cf6 | 강조 요소 |

### 2.3 다크 모드

```css
/* 라이트 모드 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
}

/* 다크 모드 */
[data-theme="dark"] {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
}
```

---

## 3. 타이포그래피

### 3.1 폰트 스택

```css
/* 기본 폰트 */
font-family: 
  "Pretendard Variable", Pretendard, 
  -apple-system, BlinkMacSystemFont, 
  system-ui, Roboto, "Segoe UI", 
  "Apple SD Gothic Neo", "Noto Sans KR", 
  sans-serif;

/* 코드 폰트 */
font-family: 
  "Fira Code", "JetBrains Mono", 
  "SF Mono", Monaco, Consolas, 
  monospace;
```

### 3.2 텍스트 스케일

| 이름 | 크기 | Tailwind | 용도 |
|------|------|----------|------|
| H1 | 36px / 2.25rem | `text-4xl` | 페이지 제목 |
| H2 | 30px / 1.875rem | `text-3xl` | 섹션 제목 |
| H3 | 24px / 1.5rem | `text-2xl` | 서브섹션 |
| H4 | 20px / 1.25rem | `text-xl` | 컴포넌트 제목 |
| Large | 18px / 1.125rem | `text-lg` | 강조 텍스트 |
| Base | 16px / 1rem | `text-base` | 본문 텍스트 |
| Small | 14px / 0.875rem | `text-sm` | 부가 정보 |
| XSmall | 12px / 0.75rem | `text-xs` | 라벨, 캡션 |

---

## 4. 간격 및 레이아웃

### 4.1 간격 시스템

| 이름 | 크기 | Tailwind | 용도 |
|------|------|----------|------|
| xs | 4px | `p-1`, `m-1` | 아주 작은 간격 |
| sm | 8px | `p-2`, `m-2` | 작은 간격 |
| md | 16px | `p-4`, `m-4` | 기본 간격 |
| lg | 24px | `p-6`, `m-6` | 큰 간격 |
| xl | 32px | `p-8`, `m-8` | 아주 큰 간격 |
| 2xl | 48px | `p-12`, `m-12` | 섹션 간격 |

### 4.2 레이아웃 구조

```
┌─────────────────────────────────────────────────────┐
│                      Header                          │
├──────────────┬──────────────────────────────────────┤
│   Sidebar    │             Main Content              │
│   (280px)    │                                       │
│              │  ┌─────────────────────────────────┐  │
│  TreeView    │  │         WikiEditor              │  │
│  + Search    │  │                                 │  │
│              │  │                                 │  │
│              │  └─────────────────────────────────┘  │
├──────────────┴──────────────────────────────────────┤
│                      Footer                          │
└─────────────────────────────────────────────────────┘
```

### 4.3 반응형 브레이크포인트

| 이름 | 크기 | Tailwind | 용도 |
|------|------|----------|------|
| Mobile | < 640px | `sm:` | 모바일 뷰 |
| Tablet | 640px - 1024px | `md:`, `lg:` | 태블릿 뷰 |
| Desktop | > 1024px | `xl:`, `2xl:` | 데스크탑 뷰 |

---

## 5. 컴포넌트 스타일 가이드

### 5.1 버튼

```tsx
// Primary Button
<Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
  저장
</Button>

// Secondary Button
<Button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md">
  취소
</Button>

// Danger Button
<Button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md">
  삭제
</Button>

// Icon Button
<Button className="p-2 hover:bg-gray-100 rounded-md">
  <Icon size={16} />
</Button>
```

### 5.2 입력 필드

```tsx
<Input 
  className="w-full px-3 py-2 border border-gray-300 rounded-md 
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="검색어 입력..."
/>
```

### 5.3 카드

```tsx
<Card className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
  <CardHeader className="text-lg font-semibold text-gray-900 mb-2">
    제목
  </CardHeader>
  <CardContent className="text-gray-600">
    내용
  </CardContent>
</Card>
```

### 5.4 알림 (Notification)

| 타입 | 배경색 | 아이콘 |
|------|--------|--------|
| Success | `bg-green-50 border-green-500` | CheckCircle |
| Error | `bg-red-50 border-red-500` | XCircle |
| Warning | `bg-yellow-50 border-yellow-500` | AlertTriangle |
| Info | `bg-blue-50 border-blue-500` | Info |

---

## 6. 아이콘 시스템

### 6.1 아이콘 라이브러리

- **Lucide React** (`lucide-react` ^0.548.0)
- **Fluent UI Icons** (`@fluentui/react-icons`)

### 6.2 아이콘 크기

| 크기 | 픽셀 | 용도 |
|------|------|------|
| xs | 12px | 인라인 아이콘 |
| sm | 16px | 버튼 내 아이콘 |
| md | 20px | 기본 아이콘 |
| lg | 24px | 헤더 아이콘 |
| xl | 32px | 빈 상태 아이콘 |

### 6.3 주요 아이콘 매핑

| 기능 | 아이콘 |
|------|--------|
| 파일 | `FileText` |
| 폴더 | `Folder`, `FolderOpen` |
| 검색 | `Search` |
| 추가 | `Plus` |
| 삭제 | `Trash2` |
| 편집 | `Edit`, `Pencil` |
| 저장 | `Save` |
| 설정 | `Settings` |
| 닫기 | `X` |
| 메뉴 | `Menu`, `MoreVertical` |

---

## 7. 애니메이션

### 7.1 트랜지션

```css
/* 기본 트랜지션 */
.transition-base {
  transition: all 150ms ease-in-out;
}

/* 색상 트랜지션 */
.transition-colors {
  transition: color, background-color, border-color 150ms ease-in-out;
}

/* 트랜스폼 트랜지션 */
.transition-transform {
  transition: transform 200ms ease-out;
}
```

### 7.2 애니메이션 효과

| 이름 | 용도 | Tailwind |
|------|------|----------|
| Fade In | 요소 나타남 | `animate-fade-in` |
| Slide In | 사이드바 열림 | `animate-slide-in` |
| Pulse | 로딩 상태 | `animate-pulse` |
| Spin | 스피너 | `animate-spin` |

---

## 8. 에디터 스타일

### 8.1 에디터 영역

```css
.editor-content {
  min-height: 400px;
  padding: 24px;
  font-size: 16px;
  line-height: 1.75;
}

.editor-content:focus {
  outline: none;
}
```

### 8.2 코드 블록

```css
.code-block {
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  font-family: "Fira Code", monospace;
  font-size: 14px;
  overflow-x: auto;
}
```

### 8.3 인용문

```css
.blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  color: #6b7280;
  font-style: italic;
}
```

---

## 9. 관련 문서

- [components.md](../guides/components.md) - 컴포넌트 상세 가이드
- [tech-stack.md](../architecture/tech-stack.md) - UI 라이브러리 정보
