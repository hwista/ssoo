/**
 * useEditorState - editor 도메인 내부 편집 상태 훅
 *
 * 기능:
 * - markdown 내용 편집
 * - 커서 위치 및 선택 영역 계산
 * - 실행 취소/다시 실행
 * - 저장 상태 관리
 *
 * 사용처: common/editor/Editor.tsx
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { logger } from '@/lib/utils/errorUtils';
import {
  createHistoryEntry,
  createInitialHistoryState,
  historyReducer,
} from './history';

export interface EditorCursorPosition {
  line: number;
  column: number;
  position: number;
}

export interface EditorSelection {
  start: EditorCursorPosition;
  end: EditorCursorPosition;
  text: string;
}

export interface UseEditorStateOptions {
  maxHistorySize?: number;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
}

export interface UseEditorStateReturn {
  content: string;
  originalContent: string;
  hasUnsavedChanges: boolean;
  cursorPosition: EditorCursorPosition | null;
  selection: EditorSelection | null;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  setContent: (content: string) => void;
  updateContent: (content: string) => void;
  resetContent: (newContent: string) => void;
  setCursorPosition: (position: number) => void;
  setSelection: (start: number, end: number) => void;
  getSelectedText: () => string;
  insertText: (text: string, replaceSelection?: boolean) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  getPositionFromLineColumn: (line: number, column: number) => number;
  markAsSaved: () => void;
  clearHistory: () => void;
}

export const useEditorState = (
  initialContent: string = '',
  options: UseEditorStateOptions = {}
): UseEditorStateReturn => {
  const { maxHistorySize = 50, onContentChange, onSave } = options;

  const [content, setContentState] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cursorPosition, setCursorPositionState] = useState<EditorCursorPosition | null>(null);
  const [selection, setSelectionState] = useState<EditorSelection | null>(null);
  const [historyState, dispatchHistory] = useReducer(
    historyReducer,
    initialContent,
    createInitialHistoryState
  );

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPositionRef = useRef<number | null>(null);

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.entries.length - 1;

  useEffect(() => {
    const hasChanges = content !== originalContent;
    setHasUnsavedChanges(hasChanges);
    onContentChange?.(content);
  }, [content, originalContent, onContentChange]);

  const getLineAtPosition = useCallback(
    (position: number): number => content.slice(0, position).split('\n').length,
    [content]
  );

  const getColumnAtPosition = useCallback(
    (position: number): number => {
      const beforeCursor = content.slice(0, position);
      const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
      return position - lastNewlineIndex;
    },
    [content]
  );

  const syncCursorState = useCallback(
    (position: number) => {
      setCursorPositionState({
        line: getLineAtPosition(position),
        column: getColumnAtPosition(position),
        position,
      });
    },
    [getColumnAtPosition, getLineAtPosition]
  );

  useLayoutEffect(() => {
    if (pendingCursorPositionRef.current === null || !editorRef.current) return;

    const position = pendingCursorPositionRef.current;
    pendingCursorPositionRef.current = null;
    editorRef.current.setSelectionRange(position, position);
    syncCursorState(position);
  }, [content, syncCursorState]);

  const updateContent = useCallback(
    (newContent: string) => {
      const cursor = editorRef.current?.selectionStart ?? 0;
      setContentState(newContent);
      dispatchHistory({
        type: 'push',
        entry: createHistoryEntry(newContent, cursor),
        maxHistorySize,
      });
      logger.debug('에디터 내용 업데이트', {
        contentLength: newContent.length,
      });
    },
    [maxHistorySize]
  );

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  const resetContent = useCallback((newContent: string) => {
    setContentState(newContent);
    setOriginalContent(newContent);
    setHasUnsavedChanges(false);
    setCursorPositionState(null);
    setSelectionState(null);
    pendingCursorPositionRef.current = null;
    dispatchHistory({
      type: 'reset',
      entry: createHistoryEntry(newContent, 0),
    });
    logger.debug('에디터 내용 리셋', { contentLength: newContent.length });
  }, []);

  const setCursorPosition = useCallback(
    (position: number) => {
      if (!editorRef.current) return;

      editorRef.current.setSelectionRange(position, position);
      editorRef.current.focus();
      syncCursorState(position);
    },
    [syncCursorState]
  );

  const setSelection = useCallback(
    (start: number, end: number) => {
      if (!editorRef.current) return;

      editorRef.current.setSelectionRange(start, end);
      editorRef.current.focus();

      setSelectionState({
        start: {
          line: getLineAtPosition(start),
          column: getColumnAtPosition(start),
          position: start,
        },
        end: {
          line: getLineAtPosition(end),
          column: getColumnAtPosition(end),
          position: end,
        },
        text: content.slice(start, end),
      });
    },
    [content, getColumnAtPosition, getLineAtPosition]
  );

  const getSelectedText = useCallback((): string => {
    if (!editorRef.current) return '';

    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    return content.slice(start, end);
  }, [content]);

  const insertText = useCallback(
    (text: string, replaceSelection: boolean = true) => {
      if (!editorRef.current) return;

      const start = editorRef.current.selectionStart;
      const end = replaceSelection ? editorRef.current.selectionEnd : start;
      const newContent = content.slice(0, start) + text + content.slice(end);
      pendingCursorPositionRef.current = start + text.length;
      updateContent(newContent);
    },
    [content, updateContent]
  );

  const undo = useCallback(() => {
    if (!canUndo) return;

    const nextIndex = historyState.index - 1;
    const entry = historyState.entries[nextIndex];
    if (!entry) return;

    pendingCursorPositionRef.current = entry.cursorPosition;
    setContentState(entry.content);
    dispatchHistory({ type: 'move', index: nextIndex });
    logger.debug('실행 취소', { historyIndex: nextIndex });
  }, [canUndo, historyState.entries, historyState.index]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const nextIndex = historyState.index + 1;
    const entry = historyState.entries[nextIndex];
    if (!entry) return;

    pendingCursorPositionRef.current = entry.cursorPosition;
    setContentState(entry.content);
    dispatchHistory({ type: 'move', index: nextIndex });
    logger.debug('다시 실행', { historyIndex: nextIndex });
  }, [canRedo, historyState.entries, historyState.index]);

  const save = useCallback(async () => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      await onSave(content);
      setOriginalContent(content);
      setHasUnsavedChanges(false);
      logger.info('파일 저장 완료');
    } catch (error) {
      logger.error('파일 저장 실패', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave]);

  const markAsSaved = useCallback(() => {
    setOriginalContent(content);
    setHasUnsavedChanges(false);
  }, [content]);

  const clearHistory = useCallback(() => {
    dispatchHistory({
      type: 'clear',
      entry: createHistoryEntry(content, editorRef.current?.selectionStart ?? 0),
    });
  }, [content]);

  const getPositionFromLineColumn = useCallback(
    (line: number, column: number): number => {
      const lines = content.split('\n');
      let position = 0;

      for (let i = 0; i < line - 1 && i < lines.length; i += 1) {
        position += lines[i].length + 1;
      }

      return position + Math.min(column - 1, lines[line - 1]?.length || 0);
    },
    [content]
  );

  return {
    content,
    originalContent,
    hasUnsavedChanges,
    cursorPosition,
    selection,
    canUndo,
    canRedo,
    isSaving,
    editorRef,
    setContent,
    updateContent,
    resetContent,
    setCursorPosition,
    setSelection,
    getSelectedText,
    insertText,
    undo,
    redo,
    save,
    getPositionFromLineColumn,
    markAsSaved,
    clearHistory,
  };
};
