'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateUniqueFilename } from '@/lib/utils';
import { getDocumentFilePath } from './documentPageUtils';
import type { CreateEntryType, EditorSurfaceMode, PageMode } from './documentPageTypes';
import type { EditorRef } from './_components/editor';

interface TabSummary {
  id: string;
  path?: string;
}

interface UseDocumentPageModeParams {
  tabId: string | null;
  tabs: TabSummary[];
  isEditing: boolean;
  updateTab: (tabId: string, update: { isEditing?: boolean; title?: string }) => void;
  removeTabEditor: () => void;
  content: string;
  editorHandlers: { getMarkdown?: () => string } | null;
}

export function useDocumentPageMode({
  tabId,
  tabs,
  isEditing,
  updateTab,
  removeTabEditor,
  content,
  editorHandlers,
}: UseDocumentPageModeParams) {
  const [mode, setMode] = useState<PageMode>('viewer');
  const [surfaceMode, setSurfaceMode] = useState<EditorSurfaceMode>('edit');
  const [createPath, setCreatePath] = useState('drafts/new-doc.md');
  const [displayCreatePath, setDisplayCreatePath] = useState('');
  const [displaySuggestedTitle, setDisplaySuggestedTitle] = useState('');
  const [liveEditorContent, setLiveEditorContent] = useState<string | null>(null);
  const editorRef = useRef<EditorRef | null>(null);
  const [generatedFileName] = useState(() => generateUniqueFilename());

  useEffect(() => {
    return () => {
      removeTabEditor();
    };
  }, [removeTabEditor]);

  useEffect(() => {
    if (mode !== 'create') {
      setMode(isEditing ? 'editor' : 'viewer');
    }
  }, [isEditing, mode]);

  useEffect(() => {
    if (mode === 'viewer') {
      setSurfaceMode('edit');
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'editor' && mode !== 'create') {
      setSurfaceMode('edit');
    }
  }, [mode]);

  useEffect(() => {
    if (!tabId) return;
    updateTab(tabId, { isEditing: mode === 'editor' || mode === 'create' });
  }, [mode, tabId, updateTab]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);

  const createEntryType = useMemo<CreateEntryType>(() => {
    const path = activeTab?.path;
    if (path === '/doc/new') return 'launcher';
    if (path === '/doc/new-doc') return 'doc';
    if (path === '/doc/new-template') return 'template';
    if (path === '/doc/new-ai-summary') return 'ai-summary';
    return null;
  }, [activeTab?.path]);

  const isCreateMode = createEntryType !== null && createEntryType !== 'launcher';
  const filePath = useMemo(() => getDocumentFilePath(activeTab?.path), [activeTab?.path]);

  const handleEditorContentChange = useCallback((editorContent: string) => {
    setLiveEditorContent(editorContent);
  }, []);

  const getCurrentDraftContent = useCallback(() => (
    editorHandlers?.getMarkdown?.()
    ?? editorRef.current?.getMarkdown?.()
    ?? liveEditorContent
    ?? content
  ), [content, editorHandlers, liveEditorContent]);

  return {
    mode,
    setMode,
    surfaceMode,
    setSurfaceMode,
    createPath,
    setCreatePath,
    displayCreatePath,
    setDisplayCreatePath,
    displaySuggestedTitle,
    setDisplaySuggestedTitle,
    liveEditorContent,
    setLiveEditorContent,
    editorRef,
    generatedFileName,
    activeTab,
    createEntryType,
    isCreateMode,
    filePath,
    handleEditorContentChange,
    getCurrentDraftContent,
  };
}
