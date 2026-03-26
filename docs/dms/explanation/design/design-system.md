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

> **전역 표준**: PMS/CHS/DMS는 동일한 sans/mono 스택을 사용합니다.

```css
/* 기본 폰트 (font-sans) - 시스템 폰트 */
font-family: 
  -apple-system, BlinkMacSystemFont, system-ui,
  Roboto, "Segoe UI", "Noto Sans KR", sans-serif;

/* 코드 폰트 (font-mono) */
font-family: 
  ui-monospace, SFMono-Regular,
  Menlo, Monaco, Consolas, monospace;
```

### 3.2 폰트 적용 규칙

> **핵심 원칙**: 폰트는 전역에서 정의하고, 개별 컴포넌트는 상속받는다.

#### 정의 위치

| 파일 | 역할 | 수정 가능 |
|------|------|----------|
| `tailwind.config.js` | `fontFamily.sans`, `fontFamily.mono`, semantic fontSize 정의 | ✅ 정본 구현 |
| `globals.css` | CSS 변수 + 기존 alias(`heading-*`, `body-text`) 유지 | ✅ 전역 적용 |
| 컴포넌트 | 상속받음 | ❌ 개별 정의 금지 |

#### 허용되는 클래스

| 클래스 | 용도 |
|--------|------|
| `font-sans` | 일반 텍스트 (기본, 생략 가능) |
| `font-mono` | 코드, 마크다운 에디터 |
| `text-title-*`, `text-body-*`, `text-label-*`, `text-caption`, `text-code-*` | semantic typography token |

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

### 3.3 시맨틱 타이포 토큰

| 토큰 | 크기 | 행간 | 굵기 | 용도 |
|------|------|------|------|------|
| `text-title-page` | 28px | 36px | 700 | 페이지 제목 |
| `text-title-section` | 24px | 32px | 600 | 섹션 제목 |
| `text-title-subsection` | 20px | 28px | 600 | 하위 섹션 제목 |
| `text-title-card` | 18px | 28px | 600 | 카드/패널 타이틀 |
| `text-body-md` | 14px | 24px | 400 | 기본 본문 |
| `text-body-sm` | 14px | 20px | 400 | 촘촘한 본문 |
| `text-label-md` | 14px | 20px | 500 | 기본 라벨 |
| `text-label-sm` | 12px | 16px | 500 | 작은 라벨 |
| `text-label-strong` | 14px | 20px | 600 | 강조 라벨 |
| `text-caption` | 12px | 16px | 400 | 캡션/보조 설명 |
| `text-control-lg` | 16px | 24px | 400 | 큰 컨트롤 텍스트 |
| `text-badge` | 12px | 16px | 600 | badge/chip 라벨 |
| `text-code-inline` | 13px | 1.5 | 400 | 인라인 코드, 경로, 식별자 |
| `text-code-block` | 13px | 1.625 | 400 | 코드 블록 본문 |
| `text-code-line-number` | 12px | 16px | 500 | 줄번호, gutter |

기존 `heading-1/2/3`, `body-text`, `body-text-muted`는 하위 호환 alias로 유지합니다.

### 3.4 Density-Driven Typography Model

#### Role Layers

| 계층 | 목적 | 기본 토큰 |
|------|------|-----------|
| `header` | 페이지/섹션/하위섹션 위계 | `text-title-page`, `text-title-section`, `text-title-subsection` |
| `title` | 카드/패널/블록 제목 | `text-title-card` |
| `body` | 사용자가 읽는 기본 데이터 | `text-body-md`, `text-body-sm` |
| `detail` | 메타/시간/경로/보조 설명 | `text-caption` |
| `label` | 조작/식별용 텍스트의 독립 역할 계층 | `text-label-md`, `text-label-sm`, `text-label-strong` |
| `badge` | 압축된 상태/태그/카운트 | `text-badge` |
| `code` | 코드/경로/기술 텍스트 | `text-code-inline`, `text-code-block`, `text-code-line-number` |
| `annotation` | diff marker, warning, correction label | `text-label-sm`, `text-badge`, `text-caption` 재사용 |

#### Density

| 밀도 | 설명 | 예시 표면 |
|------|------|-----------|
| `spacious` | 위계 강조, 여백이 넉넉함 | page header, section header, empty state title |
| `normal` | 일반 입력/카드/폼/상세 | article body, form content, dialog description |
| `dense` | 스캔/조작 중심의 높은 밀도 | sidebar item, picker row, result card meta, history row |
| `exception` | 일반 읽기 모드가 아닌 특수 표면 | line number, diff overlay, mermaid fallback |

토큰 선택 순서는 `slot 역할 -> density -> 허용 token` 입니다. raw class 조합은 보조 힌트일 뿐 최종 판단 기준이 아닙니다.

### 3.5 Slot-Based Token Contract

| 슬롯 | 허용 토큰 계층 |
|------|----------------|
| `Header.title` | `header`, `title` |
| `Card.title` | `title` |
| `Card.description` | `body`, `detail` |
| `Form.label` | `label` |
| `Form.hint`, `Form.error` | `detail` |
| `Sidebar.itemLabel` | `body-sm`, `label-md` |
| `Sidebar.meta` | `detail` |
| `Picker.sectionTitle` | `label-strong`, `badge` |
| `Picker.itemMeta` | `detail` |
| `ResultCard.title` | `title` |
| `ResultCard.summary` | `body` |
| `ResultCard.meta`, `ResultCard.path`, `ResultCard.snippet` | `detail` |
| `Badge/Chip.text` | `badge`, `label` |
| `Diff.marker` | `annotation` |
| `LineNumber` | `code-line-number` |
| `Avatar.initials` | `label intent + container-scaled` |

### 3.6 Container-Scaled Text

- 아바타/아이콘 내부처럼 컨테이너 크기에 종속되는 텍스트는 semantic intent를 먼저 정합니다.
- `UserAvatar` 이니셜은 `label` intent를 가지며 기준 token은 `text-label-sm` 입니다.
- 실제 font-size는 컨테이너 크기에 비례해 런타임 스케일할 수 있습니다.

### 3.7 컨트롤 타이포 매핑

- Button `sm`: `text-caption`
- Button `default`: `text-label-md`
- Button `lg`, Textarea 기본: `text-control-lg`
- Dropdown/Select/Input item/trigger: `text-body-sm`
- Dropdown shortcut, Tooltip: `text-caption`
- Badge: `text-badge`

### 3.8 Typography Guard Rules

- `text-sm font-medium`, `text-xs font-medium`, `text-sm font-semibold`, `text-lg font-semibold`, `text-xs font-semibold`, `text-lg font-medium`, `body-text font-medium` raw 조합은 금지합니다.
- `text-[10px]`, `text-[11px]` 같은 arbitrary font-size는 금지합니다.
- standalone `text-xl`, `text-2xl`, `font-bold`는 금지합니다. Phase 8 기준 `text-title-subsection`, `text-title-section`, weight가 포함된 semantic token으로 닫습니다.
- semantic token에 raw weight override(`text-title-card font-bold`, `text-label-md font-semibold`)를 추가하는 패턴은 금지합니다.
- `badge/chip/chart/table cell` 내부 텍스트도 역할/밀도 기준 정규화 대상입니다.
- 새 token은 기존 role layer로 설명하기 어렵고, 서로 다른 2개 이상 컴포넌트에서 반복되는 독립 역할일 때만 추가합니다.

#### Phase 8 Structural Exceptions

- `UserAvatar.tsx`: container-scaled text
- viewer zoom (`fontSize: ${zoomLevel}%`)
- CodeMirror `HighlightStyle` em-relative sizes
- `SplitDiffViewer.tsx` CSS custom property references
- `global-error.tsx` CSS 미로드 fallback
- `*.stories.tsx` checker 제외 파일

### 3.9 Document Content Typography Layer

- DMS 문서 본문은 UI token 계층과 별도의 document content 계층으로 취급합니다.
- viewer 본문 `prose-base`, block editor 본문, diff 본문은 모두 `16px`를 유지합니다.
- `text-body-md` 14px는 일반 UI 본문용이며, 문서 읽기/편집/비교 본문을 대체하지 않습니다.

```css
:root {
  --doc-content-font-size: 1rem;
  --doc-content-line-height: 1.625;
  --doc-line-number-font-size: 0.875rem;
  --doc-line-number-font-weight: 500;
}
```

- `--doc-content-*`는 editor/diff 본문 parity용 변수입니다.
- `--doc-line-number-*`는 diff line number 정형화용 변수입니다.
- button prominence 문제는 문서 본문 크기 문제가 아니라 weight/contrast/density 문제이므로 별도 QA 항목으로 다룹니다.

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
  <CardHeader className="text-title-card text-gray-900 mb-2">
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
| 2026-02-09 | 뷰어 줌 컨트롤 높이 표준 적용 (h-control-h-sm → h-control-h, 32px → 36px) |
| 2026-02-06 | 컨트롤 컨테이너 원칙 추가 (컨테이너 없이 컨트롤만 사용, 예외 보고 프로세스) |
| 2026-02-02 | 최초 작성 - 디자인 시스템 문서화 |
