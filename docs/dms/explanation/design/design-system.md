# DMS 디자인 시스템

> 최종 업데이트: 2026-02-09

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

> **PMS/DMS 통합 표준**: 두 앱 모두 동일한 시스템 폰트를 사용합니다.

```css
/* 기본 폰트 (font-sans) - 시스템 폰트 */
font-family: 
  -apple-system, BlinkMacSystemFont, 
  'Segoe UI', Roboto, Oxygen, 
  Ubuntu, Cantarell, 'Open Sans', 
  'Helvetica Neue', sans-serif;

/* 코드 폰트 (font-mono) */
font-family: 
  "Fira Code", "JetBrains Mono", 
  "SF Mono", Monaco, Consolas, 
  monospace;
```

### 3.2 폰트 적용 규칙

> **핵심 원칙**: 폰트는 전역에서 정의하고, 개별 컴포넌트는 상속받는다.

#### 정의 위치

| 파일 | 역할 | 수정 가능 |
|------|------|----------|
| `tailwind.config.js` | `fontFamily.sans`, `fontFamily.mono` 정의 | ✅ 유일한 정의 위치 |
| `globals.css` | `body`에 `font-sans` 적용 | ✅ 전역 적용 |
| 컴포넌트 | 상속받음 | ❌ 개별 정의 금지 |

#### 허용되는 클래스

| 클래스 | 용도 |
|--------|------|
| `font-sans` | 일반 텍스트 (기본, 생략 가능) |
| `font-mono` | 코드, 마크다운 에디터 |

#### 금지되는 패턴

```tsx
// ❌ 금지: 컴포넌트에서 직접 폰트 정의
style={{ fontFamily: 'Arial, sans-serif' }}
className="font-['Roboto']"

// ❌ 금지: CSS 파일에서 개별 폰트 정의
.my-component {
  font-family: Arial, sans-serif;
}

// ✅ 허용: Tailwind 클래스 사용
className="font-mono"  // 코드용
className="font-sans"  // 명시적 일반 텍스트
```

#### 예외 처리

제3자 컴포넌트나 특수 요구사항이 있는 경우:

1. 예외 보고 템플릿으로 사용자 승인 필요
2. 승인 후 `// eslint-disable-line design/font-override` 주석 추가
3. 이유를 코드 주석에 명시

### 3.3 텍스트 스케일

> **핵심 원칙**: DMS 신규 UI는 raw `text-sm` / `text-xs` 보다는 `tailwind.config.js` 에 정의된 **semantic typography token** 을 우선 사용합니다.

#### 일반 UI 토큰

| 토큰 | 크기 / 줄높이 / 굵기 | 용도 |
|------|----------------------|------|
| `text-title-page` | 28px / 36px / 700 | 페이지 메인 타이틀 |
| `text-title-section` | 24px / 32px / 600 | 큰 섹션 제목 |
| `text-title-subsection` | 20px / 28px / 600 | 서브섹션 제목 |
| `text-title-card` | 18px / 28px / 600 | 카드/패널 제목 |
| `text-body-md` | 14px / 24px / 400 | 기본 본문 |
| `text-body-sm` | 14px / 20px / 400 | 조밀한 본문, 리스트, 입력값 |
| `text-control-lg` | 16px / 24px / 400 | 큰 입력/강조 컨트롤 |
| `text-label-md` | 14px / 20px / 500 | 일반 라벨, 버튼 텍스트 |
| `text-label-sm` | 12px / 16px / 500 | 작은 라벨 |
| `text-label-strong` | 14px / 20px / 600 | 강조 라벨, 카드 행 제목 |
| `text-caption` | 12px / 16px / 400 | 보조 설명, 메타 정보 |
| `text-badge` | 12px / 16px / 600 | 배지, 상태 요약 |

#### 코드/에디터 토큰

| 토큰 | 크기 / 줄높이 / 굵기 | 용도 |
|------|----------------------|------|
| `text-code-inline` | 13px / 1.5 / 400 | 인라인 코드 |
| `text-code-block` | 13px / 1.625 / 400 | 코드 블록, JSON/텍스트 raw editor |
| `text-code-line-number` | 12px / 16px / 500 | 라인 넘버 |

#### 적용 기준

- 일반 텍스트는 기본 상속(`font-sans`) 또는 semantic text token을 사용합니다.
- 코드/JSON/에디터 surface는 `font-mono` 와 `text-code-*` 토큰을 함께 사용합니다.
- 기존 레거시 영역에 남아 있는 `text-sm`, `text-xs` 는 점진적으로 semantic token으로 정리하되, 신규/수정 코드에서는 token 우선 원칙을 따릅니다.

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

### 컨트롤 높이 표준

| 크기 | Tailwind 클래스 | 실제 높이 | 용도 |
|------|----------------|----------|------|
| **Small** | `h-control-h-sm` | 32px | 인라인 아이콘 버튼, 밀집 UI |
| **Default** | `h-control-h` | 36px | **표준** - 버튼, 입력, 탭, 메뉴 |
| **Large** | `h-control-h-lg` | 44px | 강조가 필요한 CTA |

**인라인 아이콘 버튼**
- 닫기/즐겨찾기/검색 클리어 등: `h-control-h-sm w-control-h-sm`

**드롭다운/컨텍스트 메뉴**
- 메뉴 항목 높이: `h-control-h` (표준 컨트롤과 동일)

### 컨트롤 컨테이너 원칙 (⚠️ 중요)

**원칙: 요청한 컨트롤만 생성, 컨테이너로 감싸지 않음**

AI가 컨트롤(버튼, 입력, 토글 등) 생성 요청을 받았을 때:
- **요청한 컨트롤만 출력** - 컨테이너는 요청하지 않았으므로 추가하지 않음
- 컨테이너가 필요하다고 판단되면 → **예외 보고 후 사용자 승인 필요**

```tsx
// ✅ 올바른 예시: 컨테이너 없이 직접 배치
<div className="flex items-center gap-2">
  <Button className="h-control-h">버튼</Button>
  <Input className="h-control-h" />
</div>

// ❌ 금지 예시: 요청하지 않은 컨테이너에 높이 지정
<div className="h-control-h flex items-center">  {/* 요청 안 함 */}
  <ToggleGroup>...</ToggleGroup>
</div>
```

**허용된 컨테이너 사용 케이스**:

| 케이스 | 컨테이너 규격 | 예시 |
|--------|-------------|------|
| 툴바 바/패널 | `min-h-[52px] px-4 py-2` | Header, viewer/Toolbar |
| TabBar | 레이아웃 규칙 (53px) | TabBar.tsx |
| 모달/다이얼로그 | 별도 규정 | ConfirmDialog |

**컨테이너 없이 구현할 수 없는 경우**:

→ 반드시 예외 보고 후 진행 ([예외 보고 프로세스](.github/copilot-instructions.md))

```markdown
## ⚠️ 디자인 규칙 예외 요청

| 항목 | 내용 |
|------|------|
| **위반 규칙** | 디자인 > 컨테이너 원칙 |
| **위반 파일** | [파일 경로] |
| **위반 사유** | [왜 컨테이너가 필요한지] |
| **적용할 컨테이너 규격** | [min-h, padding 등] |
```

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

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-02 | 실제 DMS typography token(`text-title-*`, `text-body-*`, `text-label-*`, `text-code-*`) 기준으로 문서를 정렬하고 settings JSON editor 적용 기준을 반영 |
| 2026-02-09 | 뷰어 줌 컨트롤 높이 표준 적용 (h-control-h-sm → h-control-h, 32px → 36px) |
| 2026-02-06 | 컨트롤 컨테이너 원칙 추가 (컨테이너 없이 컨트롤만 사용, 예외 보고 프로세스) |
| 2026-02-02 | 최초 작성 - 디자인 시스템 문서화 |
