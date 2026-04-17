'use client';

import * as React from 'react';
import { templateApi } from '@/lib/api/endpoints/templates';
import { toast } from '@/lib/toast';
import type { DocumentMetadata } from '@/types';
import type { TemplateGeneration, TemplateItem, TemplateOriginType, TemplateReferenceDoc } from '@/types/template';

interface UseTemplateSaveFlowParams {
  enabled: boolean;
  editorContent: string;
  filePath: string | null;
  documentTitle?: string;
  sourceDocument?: { path: string; title?: string; content: string } | null;
  documentMetadata: DocumentMetadata | null;
  replaceContent: (newContent: string) => void;
  replaceLocalDocumentMetadata: (next: DocumentMetadata | null) => void;
  discardPendingMetadata: () => Promise<void>;
  /** 템플릿 전환/선택 완료 후 호출 — 메타데이터 자동 생성 트리거 */
  onConvertComplete?: (generatedContent: string) => void;
}

interface UseTemplateSaveFlowResult {
  templateModeEnabled: boolean;
  isTemplatePickerOpen: boolean;
  isConvertingToTemplate: boolean;
  referenceTemplates: TemplateItem[];
  currentTemplateId: string | null;
  saveTarget: 'document' | 'template';
  templateOriginType: TemplateOriginType;
  templateReferenceDocuments: TemplateReferenceDoc[];
  templateGeneration: TemplateGeneration;
  toggleTemplateMode: (on: boolean) => void;
  handleTemplateSelected: (item: TemplateItem) => void;
  handleAiConvertRequested: () => Promise<void>;
  handleTemplatePickerClose: () => void;
  cancelAiConvert: () => void;
  addTemplateReference: (ref: TemplateReferenceDoc) => void;
  removeTemplateReference: (path: string) => void;
  setCurrentTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  setTemplateReferenceDocuments: React.Dispatch<React.SetStateAction<TemplateReferenceDoc[]>>;
}

export function useTemplateSaveFlow({
  enabled,
  editorContent,
  filePath,
  documentTitle,
  sourceDocument,
  documentMetadata,
  replaceContent,
  replaceLocalDocumentMetadata,
  discardPendingMetadata,
  onConvertComplete,
}: UseTemplateSaveFlowParams): UseTemplateSaveFlowResult {
  const originalContentRef = React.useRef<string | null>(null);
  const originalMetadataRef = React.useRef<DocumentMetadata | null>(null);
  const cachedTemplateContentRef = React.useRef<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const [templateModeEnabled, setTemplateModeEnabled] = React.useState(enabled);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);
  const [isConvertingToTemplate, setIsConvertingToTemplate] = React.useState(false);
  const [referenceTemplates, setReferenceTemplates] = React.useState<TemplateItem[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = React.useState<string | null>(null);
  const [templateGeneration, setTemplateGeneration] = React.useState<TemplateGeneration>({ source: 'manual' });
  const [templateReferenceDocuments, setTemplateReferenceDocuments] = React.useState<TemplateReferenceDoc[]>([]);
  const autoConvertSourceKeyRef = React.useRef<string | null>(null);
  const prevSourceKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // enabled(isGeneratedTemplateMode)가 true로 전환되면 활성화
    // 저장 후 create 모드 종료 시 enabled가 false가 되어도 유지 (sticky)
    if (enabled) {
      setTemplateModeEnabled(true);
    }
  }, [enabled]);

  // templateReferenceDocuments 초기값 seed
  React.useEffect(() => {
    const sourceKey = sourceDocument
      ? `src:${sourceDocument.path}`
      : filePath
        ? `file:${filePath}`
        : enabled ? 'generated' : null;

    if (sourceKey === prevSourceKeyRef.current) return;
    prevSourceKeyRef.current = sourceKey;

    if (sourceDocument) {
      setTemplateReferenceDocuments([{
        path: sourceDocument.path,
        title: sourceDocument.title,
        source: 'current-document',
        kind: 'document',
      }]);
      return;
    }
    if (!enabled && filePath) {
      setTemplateReferenceDocuments([{
        path: filePath,
        title: documentTitle || documentMetadata?.title,
        source: 'current-document',
        kind: 'document',
      }]);
      return;
    }
    if (enabled) {
      setTemplateReferenceDocuments([]);
    }
  }, [documentMetadata?.title, documentTitle, enabled, filePath, sourceDocument]);

  const addTemplateReference = React.useCallback((ref: TemplateReferenceDoc) => {
    setTemplateReferenceDocuments((prev) => {
      if (prev.some((r) => r.path === ref.path)) return prev;
      return [...prev, ref];
    });
  }, []);

  const removeTemplateReference = React.useCallback((path: string) => {
    setTemplateReferenceDocuments((prev) => prev.filter((r) => r.path !== path));
  }, []);

  const templateOriginType: TemplateOriginType = sourceDocument ? 'referenced' : (enabled ? 'generated' : 'referenced');

  const cancelAiConvert = React.useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsConvertingToTemplate(false);
  }, []);

  const restoreOriginalState = React.useCallback(async () => {
    cancelAiConvert();
    if (originalContentRef.current !== null) {
      replaceContent(originalContentRef.current);
    }
    await discardPendingMetadata();
    replaceLocalDocumentMetadata(originalMetadataRef.current);
    setTemplateModeEnabled(enabled);
    setIsTemplatePickerOpen(false);
    setReferenceTemplates([]);
    setCurrentTemplateId(null);
    setTemplateGeneration({ source: 'manual' });
  }, [cancelAiConvert, discardPendingMetadata, enabled, replaceContent, replaceLocalDocumentMetadata]);

  const handleAiConvertRequested = React.useCallback(async (override?: {
    documentContent?: string;
    documentPath?: string;
  }) => {
    if (enabled && !sourceDocument) return;
    setIsTemplatePickerOpen(false);
    setTemplateModeEnabled(true);
    setTemplateGeneration({ source: 'ai', taskKey: 'document-to-template' });

    if (cachedTemplateContentRef.current) {
      replaceContent(cachedTemplateContentRef.current);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsConvertingToTemplate(true);

    let accumulated = '';
    const documentContent = override?.documentContent ?? sourceDocument?.content ?? editorContent;
    const documentPath = override?.documentPath ?? sourceDocument?.path ?? filePath ?? undefined;
    const success = await templateApi.convertToTemplateStream(
      {
        documentContent,
        documentPath,
      },
      {
        onTextDelta: (delta) => {
          accumulated += delta;
          replaceContent(accumulated);
        },
      },
      { signal: controller.signal },
    ).catch(() => false);

    abortControllerRef.current = null;
    setIsConvertingToTemplate(false);

    if (success && accumulated.trim()) {
      cachedTemplateContentRef.current = accumulated;
      onConvertComplete?.(accumulated);
      return;
    }

    if (!controller.signal.aborted) {
      toast.error('템플릿 초안 생성에 실패했습니다.', {
        description: '잠시 후 다시 시도해주세요.',
      });
      await restoreOriginalState();
    }
  }, [editorContent, enabled, filePath, onConvertComplete, replaceContent, restoreOriginalState, sourceDocument]);

  React.useEffect(() => {
    if (!sourceDocument) {
      autoConvertSourceKeyRef.current = null;
      return;
    }

    const sourceKey = `${sourceDocument.path}::${sourceDocument.content.length}`;
    if (autoConvertSourceKeyRef.current === sourceKey) return;

    autoConvertSourceKeyRef.current = sourceKey;
    originalContentRef.current = editorContent;
    originalMetadataRef.current = documentMetadata;
    void handleAiConvertRequested({
      documentContent: sourceDocument.content,
      documentPath: sourceDocument.path,
    });
  }, [documentMetadata, editorContent, handleAiConvertRequested, sourceDocument]);

  const handleTemplateSelected = React.useCallback((item: TemplateItem) => {
    setTemplateModeEnabled(true);
    setCurrentTemplateId(item.id);
    setTemplateGeneration({ source: 'manual', profileKey: item.id });
    replaceContent(item.content);
    setIsTemplatePickerOpen(false);
    onConvertComplete?.(item.content);
  }, [onConvertComplete, replaceContent]);

  const toggleTemplateMode = React.useCallback((on: boolean) => {
    if (enabled) {
      setTemplateModeEnabled(true);
      return;
    }

    if (!on) {
      void restoreOriginalState();
      return;
    }

    originalContentRef.current = editorContent;
    originalMetadataRef.current = documentMetadata;

    if (cachedTemplateContentRef.current) {
      setTemplateModeEnabled(true);
      setTemplateGeneration({ source: 'ai', taskKey: 'document-to-template' });
      replaceContent(cachedTemplateContentRef.current);
      return;
    }

    if (!filePath) {
      void handleAiConvertRequested();
      return;
    }

    void (async () => {
      setIsConvertingToTemplate(true);
      try {
        const response = await templateApi.listByReferenceDocument(filePath).catch(() => null);
        const items = response?.success && Array.isArray(response.data) ? response.data : [];
        if (items.length > 0) {
          setReferenceTemplates(items);
          setIsTemplatePickerOpen(true);
          setTemplateModeEnabled(true);
          return;
        }
      } finally {
        setIsConvertingToTemplate(false);
      }
      await handleAiConvertRequested();
    })();
  }, [documentMetadata, editorContent, enabled, filePath, handleAiConvertRequested, replaceContent, restoreOriginalState]);

  return {
    templateModeEnabled,
    isTemplatePickerOpen,
    isConvertingToTemplate,
    referenceTemplates,
    currentTemplateId,
    saveTarget: templateModeEnabled ? 'template' : 'document',
    templateOriginType,
    templateReferenceDocuments,
    templateGeneration,
    toggleTemplateMode,
    handleTemplateSelected,
    handleAiConvertRequested,
    handleTemplatePickerClose: () => setIsTemplatePickerOpen(false),
    cancelAiConvert,
    addTemplateReference,
    removeTemplateReference,
    setCurrentTemplateId,
    setTemplateReferenceDocuments,
  };
}
