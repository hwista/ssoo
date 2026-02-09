// ============================================
// Editor Components
// 문서 편집 관련 컴포넌트 (DMS 전용)
// Viewer와 대응하는 슬롯 컴포넌트
// ============================================

// 새 에디터 (옵시디언 스타일 라이브 프리뷰)
export { Editor, DOCUMENT_WIDTH } from './Editor';
export type { EditorProps } from './Editor';

export { Content } from './Content';
export type { ContentProps } from './Content';

// 기존 컴포넌트 (내부 사용)
export { BlockEditor } from './BlockEditor';
export type { BlockEditorProps, BlockEditorRef } from './BlockEditor';

export { default as BlockToolbar } from './BlockToolbar';
export { default as SlashCommand } from './SlashCommand';

// 확장
export { LivePreview } from './extensions/LivePreview';
