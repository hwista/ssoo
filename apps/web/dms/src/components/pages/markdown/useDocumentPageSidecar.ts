'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { docAssistApi } from '@/lib/api';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import { useBodyLinks } from '@/hooks/useBodyLinks';
import { resolveTitlePathRecommendation } from '@/lib/utils/titlePathRecommendation';
import type { DocumentMetadata } from '@/types';
import {
  buildDocumentSidecarDiffSnapshot,
  buildDocumentSidecarMetadata,
  buildMarkdownToc,
  deriveDefaultTemplateName,
} from './documentPageUtils';
import type {
  RecommendationStatus,
  TemplateSaveDraft,
} from './documentPageTypes';

interface UseDocumentPageSidecarParams {
  content: string;
  documentMetadata: DocumentMetadata | null;
  fileMetadata: { createdAt: Date | null; modifiedAt: Date | null };
  filePath: string | null;
  isCreateMode: boolean;
  createPath: string;
  setCreatePath: (path: string) => void;
  getCurrentDraftContent: () => string;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function useDocumentPageSidecar({
  content,
  documentMetadata,
  fileMetadata,
  filePath,
  isCreateMode,
  createPath,
  setCreatePath,
  getCurrentDraftContent,
  setLocalDocumentMetadata,
  setHasUnsavedChanges,
}: UseDocumentPageSidecarParams) {
  const [pendingSuggestedInfoTitle, setPendingSuggestedInfoTitle] = useState<string | null>(null);
  const [pendingSuggestedInfoPath, setPendingSuggestedInfoPath] = useState<string | null>(null);
  const [pendingInfoPathValidationMessage, setPendingInfoPathValidationMessage] = useState('');
  const [titleRecommendationStatus, setTitleRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathRecommendationStatus, setPathRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathValidationMessage, setPathValidationMessage] = useState('');
  const [saveAsTemplateOnly, setSaveAsTemplateOnly] = useState(false);
  const [templateSaveDraft, setTemplateSaveDraft] = useState<TemplateSaveDraft>({
    name: '',
    description: '',
    scope: 'personal',
  });
  const [originalMetaSnapshot, setOriginalMetaSnapshot] = useState(
    buildDocumentSidecarDiffSnapshot(null) as ReturnType<typeof buildDocumentSidecarDiffSnapshot> | null,
  );
  const [pendingFileMove, setPendingFileMove] = useState<string | null>(null);

  useEffect(() => {
    if (templateSaveDraft.name.trim().length > 0) return;
    const fallbackPath = filePath || createPath;
    const nextName = deriveDefaultTemplateName(content, fallbackPath);
    setTemplateSaveDraft((prev) => (
      prev.name.trim().length > 0 || prev.name === nextName
        ? prev
        : { ...prev, name: nextName }
    ));
  }, [content, createPath, filePath, templateSaveDraft.name]);

  const htmlContent = useMemo(() => (content ? markdownToHtmlSync(content) : ''), [content]);
  const toc = useMemo(() => buildMarkdownToc(content), [content]);
  const metadata = useMemo(
    () => buildDocumentSidecarMetadata(content, documentMetadata, fileMetadata),
    [content, documentMetadata, fileMetadata],
  );
  const tags = useMemo(() => documentMetadata?.tags || [], [documentMetadata]);
  const liveBodyLinks = useBodyLinks(getCurrentDraftContent());

  const applySuggestedInfoTitle = useCallback((title: string, setDisplaySuggestedTitle?: (title: string) => void) => {
    setDisplaySuggestedTitle?.(title);
    setLocalDocumentMetadata({ title });
  }, [setLocalDocumentMetadata]);

  const applySuggestedInfoPath = useCallback((path: string, setDisplayCreatePath?: (path: string) => void) => {
    setDisplayCreatePath?.(path);
    setCreatePath(path);
  }, [setCreatePath]);

  const consumeTitlePathRecommendation = useCallback((
    resolved: ReturnType<typeof resolveTitlePathRecommendation>,
    mode: 'suggest' | 'auto',
    helpers?: { setDisplaySuggestedTitle?: (title: string) => void; setDisplayCreatePath?: (path: string) => void },
  ) => {
    setTitleRecommendationStatus(resolved.titleStatus);
    setPathRecommendationStatus(resolved.pathStatus);

    if (mode === 'auto') {
      setPendingSuggestedInfoTitle(null);
      setPendingSuggestedInfoPath(null);
      setPendingInfoPathValidationMessage('');
      setPathValidationMessage(resolved.pathValidationMessage ?? '');
      if (resolved.title) {
        applySuggestedInfoTitle(resolved.title, helpers?.setDisplaySuggestedTitle);
      }
      if (resolved.path) {
        applySuggestedInfoPath(resolved.path, helpers?.setDisplayCreatePath);
      }
      return;
    }

    setPathValidationMessage('');
    setPendingSuggestedInfoTitle(resolved.title || null);
    setPendingSuggestedInfoPath(resolved.path || null);
    setPendingInfoPathValidationMessage(resolved.path ? '' : (resolved.pathValidationMessage ?? ''));
  }, [applySuggestedInfoPath, applySuggestedInfoTitle]);

  const requestInfoRecommendation = useCallback(async () => {
    const draftContent = getCurrentDraftContent();
    if (!draftContent.trim()) return;

    setTitleRecommendationStatus('loading');
    setPathRecommendationStatus('loading');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');

    try {
      const res = await docAssistApi.recommendTitleAndPath({ currentContent: draftContent });
      if (res.success && res.data) {
        const resolved = resolveTitlePathRecommendation(res.data, { fallbackContent: draftContent });
        consumeTitlePathRecommendation(resolved, 'suggest');
      } else {
        setTitleRecommendationStatus('error');
        setPathRecommendationStatus('error');
      }
    } catch {
      setTitleRecommendationStatus('error');
      setPathRecommendationStatus('error');
    }
  }, [consumeTitlePathRecommendation, getCurrentDraftContent]);

  const handleAcceptSuggestedInfoTitle = useCallback((setDisplaySuggestedTitle?: (title: string) => void) => {
    if (!pendingSuggestedInfoTitle) return;
    applySuggestedInfoTitle(pendingSuggestedInfoTitle, setDisplaySuggestedTitle);
    setPendingSuggestedInfoTitle(null);
  }, [applySuggestedInfoTitle, pendingSuggestedInfoTitle]);

  const handleDismissSuggestedInfoTitle = useCallback(() => {
    setPendingSuggestedInfoTitle(null);
  }, []);

  const handleAcceptSuggestedInfoPath = useCallback((setDisplayCreatePath?: (path: string) => void) => {
    if (!pendingSuggestedInfoPath) return;
    if (isCreateMode) {
      applySuggestedInfoPath(pendingSuggestedInfoPath, setDisplayCreatePath);
    } else if (filePath && pendingSuggestedInfoPath !== filePath) {
      setPendingFileMove(pendingSuggestedInfoPath);
      setHasUnsavedChanges(true);
    }
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, [applySuggestedInfoPath, filePath, isCreateMode, pendingSuggestedInfoPath, setHasUnsavedChanges]);

  const handleDismissSuggestedInfoPath = useCallback(() => {
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, []);

  const handleMetadataChange = useCallback((update: Partial<DocumentMetadata>) => {
    setLocalDocumentMetadata(update);
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges, setLocalDocumentMetadata]);

  const handleFileMove = useCallback((newPath: string) => {
    if (!filePath || newPath === filePath) return;
    setPendingFileMove(newPath);
    setHasUnsavedChanges(true);
  }, [filePath, setHasUnsavedChanges]);

  const currentSidecarFilePath = isCreateMode ? createPath : (pendingFileMove ?? filePath ?? '');
  const originalInfoDocumentTitle = isCreateMode
    ? ''
    : (originalMetaSnapshot?.title || filePath?.split('/').pop()?.replace(/\.md$/, '') || '');
  const originalInfoFilePath = isCreateMode ? '' : (filePath ?? '');

  const resetSuggestionState = useCallback(() => {
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
    setTitleRecommendationStatus('idle');
    setPathRecommendationStatus('idle');
    setPathValidationMessage('');
    setPendingFileMove(null);
  }, []);

  return {
    pendingSuggestedInfoTitle,
    setPendingSuggestedInfoTitle,
    pendingSuggestedInfoPath,
    setPendingSuggestedInfoPath,
    pendingInfoPathValidationMessage,
    setPendingInfoPathValidationMessage,
    titleRecommendationStatus,
    setTitleRecommendationStatus,
    pathRecommendationStatus,
    setPathRecommendationStatus,
    pathValidationMessage,
    setPathValidationMessage,
    saveAsTemplateOnly,
    setSaveAsTemplateOnly,
    templateSaveDraft,
    setTemplateSaveDraft,
    originalMetaSnapshot,
    setOriginalMetaSnapshot,
    pendingFileMove,
    setPendingFileMove,
    htmlContent,
    toc,
    metadata,
    tags,
    liveBodyLinks,
    currentSidecarFilePath,
    originalInfoDocumentTitle,
    originalInfoFilePath,
    consumeTitlePathRecommendation,
    requestInfoRecommendation,
    handleAcceptSuggestedInfoTitle,
    handleDismissSuggestedInfoTitle,
    handleAcceptSuggestedInfoPath,
    handleDismissSuggestedInfoPath,
    handleMetadataChange,
    handleFileMove,
    resetSuggestionState,
  };
}
