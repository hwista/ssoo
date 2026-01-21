/**
 * useEditor - 에디터 상태 및 기능을 관리하는 커스텀 훅
 * 
 * 기능:
 * - 에디터 내용 관리
 * - 커서 위치 및 선택 영역 관리
 * - 실행 취소/다시 실행
 * - 자동 저장
 * - 임시 저장 및 복원
 * 
 * 사용처: WikiEditor, MarkdownToolbar
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/errorUtils';

export interface EditorCursorPosition {
  line: number;
  column: number;
  position: number; // absolute position in text
}

export interface EditorSelection {
  start: EditorCursorPosition;
  end: EditorCursorPosition;
  text: string;
}

export interface UseEditorOptions {
  autoSaveInterval?: number; // 자동 저장 간격 (ms)
  maxHistorySize?: number; // 실행 취소 히스토리 최대 크기
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  onAutoSave?: (content: string) => Promise<void>;
}

export interface UseEditorReturn {
  // 에디터 상태
  content: string;
  originalContent: string;
  hasUnsavedChanges: boolean;
  isAutoSaveEnabled: boolean;
  lastSaveTime: Date | null;
  autoSaveCountdown: number;
  
  // 커서 및 선택
  cursorPosition: EditorCursorPosition | null;
  selection: EditorSelection | null;
  
  // 실행 취소/다시 실행
  canUndo: boolean;
  canRedo: boolean;
  
  // 저장 상태
  isSaving: boolean;
  
  // 에디터 참조
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // 내용 관리
  setContent: (content: string) => void;
  updateContent: (content: string) => void;
  resetContent: (newContent: string) => void;
  
  // 커서 및 선택 관리
  setCursorPosition: (position: number) => void;
  setSelection: (start: number, end: number) => void;
  getSelectedText: () => string;
  insertText: (text: string, replaceSelection?: boolean) => void;
  
  // 실행 취소/다시 실행
  undo: () => void;
  redo: () => void;
  
  // 저장 관리
  save: () => Promise<void>;
  autoSave: () => Promise<void>;
  setAutoSaveEnabled: (enabled: boolean) => void;
  
  // 유틸리티
  getLineAtPosition: (position: number) => number;
  getColumnAtPosition: (position: number) => number;
  getPositionFromLineColumn: (line: number, column: number) => number;
  
  // 상태 관리
  markAsSaved: () => void;
  clearHistory: () => void;
}

interface HistoryEntry {
  content: string;
  cursorPosition: number;
  timestamp: Date;
}

/**
 * 에디터 상태 및 기능을 관리하는 커스텀 훅
 */
export const useEditor = (
  initialContent: string = '',
  options: UseEditorOptions = {}
): UseEditorReturn => {
  const {
    autoSaveInterval = 30000, // 30초
    maxHistorySize = 50,
    onContentChange,
    onSave,
    onAutoSave
  } = options;

  // 기본 상태
  const [content, setContentState] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 커서 및 선택 상태
  const [cursorPosition, setCursorPositionState] = useState<EditorCursorPosition | null>(null);
  const [selection, setSelectionState] = useState<EditorSelection | null>(null);

  // 히스토리 관리
  const [history, setHistory] = useState<HistoryEntry[]>([{
    content: initialContent,
    cursorPosition: 0,
    timestamp: new Date()
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // computed states
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 내용 변경 시 변경 상태 업데이트
  useEffect(() => {
    const hasChanges = content !== originalContent;
    setHasUnsavedChanges(hasChanges);
    onContentChange?.(content);
  }, [content, originalContent, onContentChange]);

  // 자동 저장 스케줄링
  const autoSave = useCallback(async () => {
    if (!onAutoSave) return;
    
    try {
      await onAutoSave(content);
      setLastSaveTime(new Date());
      logger.debug('자동 저장 완료');
    } catch (error) {
      logger.error('자동 저장 실패', error);
    }
  }, [content, onAutoSave]);

  useEffect(() => {
    if (!isAutoSaveEnabled || !hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      setAutoSaveCountdown(0);
      return;
    }

    // 카운트다운 시작
    let countdown = autoSaveInterval / 1000;
    setAutoSaveCountdown(countdown);

    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      setAutoSaveCountdown(countdown);
      
      if (countdown <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 1000);

    // 자동 저장 타이머
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChanges && isAutoSaveEnabled) {
        autoSave();
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isAutoSaveEnabled, hasUnsavedChanges, autoSaveInterval, autoSave]);

  // 내용 업데이트 (히스토리에 추가)
  const updateContent = useCallback((newContent: string) => {
    setContentState(newContent);
    
    // 히스토리에 추가
    const newEntry: HistoryEntry = {
      content: newContent,
      cursorPosition: editorRef.current?.selectionStart || 0,
      timestamp: new Date()
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      
      // 최대 크기 제한
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => prev + 1);
    logger.debug('에디터 내용 업데이트', { 
      contentLength: newContent.length,
      historySize: history.length 
    });
  }, [historyIndex, maxHistorySize, history.length]);

  // 내용 설정 (히스토리에 추가하지 않음)
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  // 내용 리셋 (새 파일 로드 시)
  const resetContent = useCallback((newContent: string) => {
    setContentState(newContent);
    setOriginalContent(newContent);
    setHasUnsavedChanges(false);
    
    // 히스토리 초기화
    setHistory([{
      content: newContent,
      cursorPosition: 0,
      timestamp: new Date()
    }]);
    setHistoryIndex(0);
    
    logger.debug('에디터 내용 리셋', { contentLength: newContent.length });
  }, []);

  // 커서 위치 설정
  const getLineAtPosition = useCallback((position: number): number => {
    return content.slice(0, position).split('\n').length;
  }, [content]);

  const getColumnAtPosition = useCallback((position: number): number => {
    const beforeCursor = content.slice(0, position);
    const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
    return position - lastNewlineIndex;
  }, [content]);

  const setCursorPosition = useCallback((position: number) => {
    if (editorRef.current) {
      editorRef.current.setSelectionRange(position, position);
      editorRef.current.focus();
      
      const line = getLineAtPosition(position);
      const column = getColumnAtPosition(position);
      
      setCursorPositionState({ line, column, position });
    }
  }, [getLineAtPosition, getColumnAtPosition]);

  // 선택 영역 설정
  const setSelection = useCallback((start: number, end: number) => {
    if (editorRef.current) {
      editorRef.current.setSelectionRange(start, end);
      editorRef.current.focus();
      
      const startPos = {
        line: getLineAtPosition(start),
        column: getColumnAtPosition(start),
        position: start
      };
      const endPos = {
        line: getLineAtPosition(end),
        column: getColumnAtPosition(end),
        position: end
      };
      
      setSelectionState({
        start: startPos,
        end: endPos,
        text: content.slice(start, end)
      });
    }
  }, [content, getLineAtPosition, getColumnAtPosition]);

  // 선택된 텍스트 가져오기
  const getSelectedText = useCallback((): string => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      return content.slice(start, end);
    }
    return '';
  }, [content]);

  // 텍스트 삽입
  const insertText = useCallback((text: string, replaceSelection: boolean = true) => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = replaceSelection ? editorRef.current.selectionEnd : start;
      
      const newContent = content.slice(0, start) + text + content.slice(end);
      updateContent(newContent);
      
      // 커서를 삽입된 텍스트 뒤로 이동
      setTimeout(() => {
        setCursorPosition(start + text.length);
      }, 0);
    }
  }, [content, updateContent, setCursorPosition]);

  // 실행 취소
  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      const entry = history[newIndex];
      
      setContentState(entry.content);
      setHistoryIndex(newIndex);
      
      // 커서 위치 복원
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setSelectionRange(entry.cursorPosition, entry.cursorPosition);
        }
      }, 0);
      
      logger.debug('실행 취소', { historyIndex: newIndex });
    }
  }, [canUndo, historyIndex, history]);

  // 다시 실행
  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];
      
      setContentState(entry.content);
      setHistoryIndex(newIndex);
      
      // 커서 위치 복원
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setSelectionRange(entry.cursorPosition, entry.cursorPosition);
        }
      }, 0);
      
      logger.debug('다시 실행', { historyIndex: newIndex });
    }
  }, [canRedo, historyIndex, history]);

  // 저장 관리
  const save = useCallback(async () => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave(content);
      setOriginalContent(content);
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      logger.info('파일 저장 완료');
    } catch (error) {
      logger.error('파일 저장 실패', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave]);

  // 저장됨으로 마크
  const markAsSaved = useCallback(() => {
    setOriginalContent(content);
    setHasUnsavedChanges(false);
    setLastSaveTime(new Date());
  }, [content]);

  // 히스토리 클리어
  const clearHistory = useCallback(() => {
    setHistory([{
      content,
      cursorPosition: 0,
      timestamp: new Date()
    }]);
    setHistoryIndex(0);
  }, [content]);

  // 유틸리티 함수들
  const getPositionFromLineColumn = useCallback((line: number, column: number): number => {
    const lines = content.split('\n');
    let position = 0;
    
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    return position + Math.min(column - 1, lines[line - 1]?.length || 0);
  }, [content]);

  return {
    // 에디터 상태
    content,
    originalContent,
    hasUnsavedChanges,
    isAutoSaveEnabled,
    lastSaveTime,
    autoSaveCountdown,
    
    // 커서 및 선택
    cursorPosition,
    selection,
    
    // 실행 취소/다시 실행
    canUndo,
    canRedo,
    
    // 저장 상태
    isSaving,
    
    // 에디터 참조
    editorRef,
    
    // 내용 관리
    setContent,
    updateContent,
    resetContent,
    
    // 커서 및 선택 관리
    setCursorPosition,
    setSelection,
    getSelectedText,
    insertText,
    
    // 실행 취소/다시 실행
    undo,
    redo,
    
    // 저장 관리
    save,
    autoSave,
    setAutoSaveEnabled: setIsAutoSaveEnabled,
    
    // 유틸리티
    getLineAtPosition,
    getColumnAtPosition,
    getPositionFromLineColumn,
    
    // 상태 관리
    markAsSaved,
    clearHistory
  };
};