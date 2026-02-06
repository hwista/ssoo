# Editor 컴포넌트 아키텍처

DMS 문서 편집기의 설계 및 컴포넌트 구조를 설명합니다.

## 개요

Editor 컴포넌트는 DMS의 핵심 문서 편집 기능을 제공합니다. Tiptap 기반의 블록 에디터와 마크다운 직접 편집 모드를 지원합니다.

## 컴포넌트 구조

```
editor/
├── Editor.tsx         # 메인 에디터 (Toolbar + Content 조합)
├── Toolbar.tsx        # 상단 툴바 (모드 전환, 저장, 취소)
├── Content.tsx        # 본문 영역 (모드에 따라 BlockEditor 또는 textarea)
├── BlockEditor.tsx    # Tiptap 블록 에디터
├── BlockToolbar.tsx   # BlockEditor 내부 서식 툴바
├── SlashCommand.tsx   # 슬래시 명령 팝업
├── editor.css         # 에디터 전용 스타일
└── index.ts           # 컴포넌트 export
```

## 컴포넌트 관계

```
Editor.tsx
├── Toolbar.tsx          (모드 전환, 저장 버튼)
└── Content.tsx          (본문 렌더링)
    └── BlockEditor.tsx  (block 모드)
        ├── BlockToolbar.tsx  (서식 툴바)
        └── SlashCommand.tsx  (슬래시 명령)
    └── textarea         (markdown 모드)
```

## 주요 컴포넌트

### Editor

메인 진입점 컴포넌트. Viewer 패턴과 동일한 슬롯 구조를 따릅니다.

**책임:**
- 에디터 모드 상태 관리 (block/markdown)
- 콘텐츠 변환 (HTML ↔ Markdown)
- 저장/취소 액션 처리
- 자동저장 기능 (useEditor 훅)

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

Tiptap 기반 WYSIWYG 에디터.

**책임:**
- 리치 텍스트 편집
- 블록 단위 콘텐츠 관리
- 서식 적용 (bold, italic, heading 등)

**내부 컴포넌트:**
- `BlockToolbar`: 선택 텍스트 서식 변경
- `SlashCommand`: `/` 입력 시 명령 팝업

## 상태 관리

```
useEditorStore (전역)
├── content         # 원본 마크다운 콘텐츠
├── currentFilePath # 현재 파일 경로
├── isEditing       # 편집 모드 여부
├── fileMetadata    # 파일 메타데이터
└── saveFile()      # 저장 액션

useEditor (로컬 훅)
├── content         # 편집 중인 콘텐츠
├── hasUnsavedChanges
├── isAutoSaveEnabled
├── save()          # 수동 저장
└── updateContent() # 콘텐츠 변경
```

## 설계 결정

### Viewer 패턴 적용

Editor는 Viewer와 동일한 슬롯 구조를 따릅니다:
- `Toolbar`: 상단 액션 영역
- `Content`: 본문 렌더링 영역

**이유:** UI 일관성 유지, 레이아웃 코드 재사용

### Block/Markdown 듀얼 모드

**이유:**
- Block 모드: 일반 사용자를 위한 직관적 편집
- Markdown 모드: 파워 유저를 위한 직접 편집

**변환:**
- Block → Markdown: `htmlToMarkdown()` 사용
- Markdown → Block: `markdownToHtmlSync()` 사용

### 자동저장

useEditor 훅에서 자동저장 기능을 제공합니다:
- 변경 후 일정 시간 대기
- 대기 시간 경과 시 자동 저장
- 카운트다운 표시

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
| 2025-02-06 | 초기 문서 작성 |
