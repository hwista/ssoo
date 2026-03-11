// ============================================
// Domain-Common Editor Modules
// `common/editor` 는 문서 편집 도메인에 특화된 공통 기능 모듈입니다.
// 현재는 편집 UI와 일부 orchestration 이 함께 있어, 1차 단계에서는 이동보다 내부 책임 분리를 우선합니다.
// ============================================

// 에디터
export { Editor, DOCUMENT_WIDTH } from './Editor';
export type { EditorProps, EditorRef } from './Editor';

export { Content } from './Content';
export type { ContentProps } from './Content';

export { BlockEditor } from './block-editor/BlockEditor';
export type { BlockEditorProps, BlockEditorRef } from './block-editor/BlockEditor';
export { EditorToolbar } from './Toolbar';
export type { EditorToolbarProps, ToolbarCommandId } from './Toolbar';
