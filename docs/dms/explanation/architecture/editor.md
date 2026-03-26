# Editor 컴포넌트 아키텍처

DMS 문서 편집기의 설계 및 컴포넌트 구조를 설명합니다.

## 개요

Editor 컴포넌트는 DMS의 핵심 문서 편집 기능을 제공합니다. 현재는 CodeMirror 기반 블록 편집기와 editor 도메인 내부 runtime 훅을 중심으로 구성됩니다.

## 컴포넌트 구조

```
editor/
├── Editor.tsx         # 메인 에디터 (Toolbar + Content 조합)
├── Toolbar.tsx        # 상단 툴바 (모드 전환, 저장, 취소)
├── Content.tsx        # 본문 영역 (모드에 따라 BlockEditor 또는 textarea)
├── block-editor/
│   ├── BlockEditor.tsx
│   ├── BlockEditorPanels.tsx
│   ├── blockEditorCommands.ts
│   ├── blockEditorExtensions.ts
│   ├── useBlockEditorSlashState.ts
│   └── useBlockEditorView.ts
├── useEditorState.ts
├── useEditorPersistence.ts
├── useEditorRuntimeEffects.ts
├── useEditorInteractions.ts
└── index.ts           # 컴포넌트 export
```

## 컴포넌트 관계

```
Editor.tsx
├── Toolbar.tsx          (모드 전환, 저장 버튼)
└── Content.tsx          (본문 렌더링)
    └── block-editor/BlockEditor.tsx
        ├── BlockEditorPanels.tsx
        └── useBlockEditorSlashState.ts
```

## 주요 컴포넌트

### Editor

메인 진입점 컴포넌트. Viewer 패턴과 동일한 슬롯 구조를 따릅니다.

**책임:**
- 에디터 모드 상태 관리 (block/markdown)
- 저장/취소 액션 처리
- editor runtime state 조립 (`useEditorState`)

**Props:**
```typescript
interface EditorProps {
  className?: string;  // 추가 스타일
}
```

### Toolbar

상단 고정 툴바. 에디터 모드 전환 및 파일 액션을 제공합니다.

**책임:**
- 블록/마크다운 모드 전환 버튼
- 저장/취소 버튼
- 파일 메타데이터 표시 (선택적)

**디자인 규칙:**
- 버튼은 컨테이너 없이 직접 배치
- design-system.md의 컨트롤 높이 표준 준수

### Content

본문 렌더링 영역. 에디터 모드에 따라 다른 컴포넌트를 렌더링합니다.

**책임:**
- block 모드: BlockEditor 렌더링
- markdown 모드: textarea 렌더링
- 콘텐츠 변경 이벤트 전달

### BlockEditor

CodeMirror 기반 markdown block editor 입니다.

**책임:**
- 리치 텍스트 편집
- 블록 단위 콘텐츠 관리
- 서식 적용 (bold, italic, heading 등)
- 변경 하이라이팅 (원본 대비 문자 수준 diff 표시)

**내부 구성:**
- `BlockEditorPanels`: preview / slash panel
- `blockEditorCommands`: 명령 적용
- `blockEditorExtensions`: CodeMirror 확장 (diff 하이라이팅 포함)
- `useBlockEditorView`: editor view lifecycle, `originalContent` 전달

## 상태 관리

```
useEditorStore (전역)
├── content         # 원본 마크다운 콘텐츠
├── currentFilePath # 현재 파일 경로
├── isEditing       # 편집 모드 여부
├── fileMetadata    # 파일 메타데이터
└── saveFile()      # 저장 액션

useEditorState (editor 내부 훅)
├── content         # 편집 중인 콘텐츠
├── hasUnsavedChanges
├── save()          # 수동 저장
└── updateContent() # 콘텐츠 변경
```

## 변경 하이라이팅 (Diff)

에디터 내에서 원본 문서 대비 변경된 부분을 실시간으로 하이라이팅합니다.

### 아키텍처

```
originalContentFacet (Facet<string>)
  → changedLinesField (StateField<DecorationSet>)
    → computeCharLevelDecorations()
      → fast-diff(original, current)
        → Decoration.mark (추가) / Decoration.widget (삭제)
```

### 핵심 구성 (`blockEditorExtensions.ts`)

| 구성요소 | 역할 |
|---------|------|
| `originalContentFacet` | Facet으로 원본 콘텐츠를 에디터에 전달 |
| `changedLinesField` | StateField — 문서 변경/facet 변경 시 diff 재계산 |
| `computeCharLevelDecorations()` | `fast-diff`로 전체 문서 비교, 문자 단위 Decoration 생성 |
| `DeletedTextWidget` | WidgetType — 삭제된 텍스트를 인라인 위젯으로 표시 |

### 스타일

| CSS 클래스 | 용도 |
|-----------|------|
| `.cm-changedText` | 추가/수정 텍스트 배경 하이라이트 |
| `.cm-deletedText` | 삭제 텍스트 (취소선 + 회색 + 배경) |

### DiffTextInput (공용 컴포넌트)

textarea에서도 동일한 diff 하이라이팅을 제공하는 공용 컴포넌트입니다.

- 위치: `components/common/DiffTextInput.tsx`
- 패턴: textarea 텍스트를 투명하게 → 뒤에 diff 오버레이 렌더링
- 스크롤 동기화: `onScroll` 핸들러로 textarea ↔ 오버레이 scrollTop/Left 싱크
- 사용처: 요약 섹션 (SummarySection)

## 설계 결정

### Viewer 패턴 적용

Editor는 Viewer와 동일한 슬롯 구조를 따릅니다:
- `Toolbar`: 상단 액션 영역
- `Content`: 본문 렌더링 영역

**이유:** UI 일관성 유지, 레이아웃 코드 재사용

### Runtime 훅 분리

현재 editor 는 runtime state, persistence, interaction, CodeMirror lifecycle 을 별도 훅/헬퍼로 분리해 page/common 경계를 유지합니다.

## 스타일 가이드

### 폰트

design-system.md에 정의된 폰트 표준을 따릅니다:
- 본문: `Pretendard, Noto Sans KR, sans-serif`
- 크기: `14px` (기본)

### 컨트롤 높이

모든 버튼/입력 컨트롤은 높이 표준을 준수합니다:
- 기본: Tailwind `h-*` 클래스 사용
- 세부 값: design-system.md 참조

### 컨테이너 규칙

- 버튼 그룹에 불필요한 컨테이너 사용 금지
- 요청된 컨트롤만 생성

## 관련 문서

- [design-system.md](../../design/design-system.md) - 디자인 시스템 표준
- [viewer.md](./viewer.md) - Viewer 컴포넌트 아키텍처

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-16 | 변경 하이라이팅 시스템 추가 (문자 수준 diff, DiffTextInput 공용 컴포넌트) |
| 2025-02-06 | 초기 문서 작성 |
