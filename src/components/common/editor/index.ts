// ============================================
// Editor Components
// 문서 편집 관련 컴포넌트 (DMS 전용)
// Viewer와 대응하는 슬롯 컴포넌트
// ============================================

// 새 에디터 (Viewer 패턴)
export { Editor, DOCUMENT_WIDTH } from './Editor';
export type { EditorProps, EditorMode } from './Editor';

export { Toolbar } from './Toolbar';
export type { ToolbarProps } from './Toolbar';

export { Content } from './Content';
export type { ContentProps } from './Content';

// 기존 컴포넌트 (내부 사용)
export { BlockEditor } from './BlockEditor';
export type { BlockEditorProps, BlockEditorRef } from './BlockEditor';

export { default as EditorToolbar } from './EditorToolbar';
export { default as SlashCommand } from './SlashCommand';

// 레거시 (deprecated - 향후 제거 예정)
export { default as MarkdownEditor } from './MarkdownEditor';
