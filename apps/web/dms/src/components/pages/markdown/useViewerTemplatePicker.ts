'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { templateApi } from '@/lib/api/endpoints/templates';
import { templateKeys } from '@/hooks/queries/useTemplates';
import { toast } from '@/lib/toast';
import type { TemplateItem } from '@/types/template';
import type { OpenTabOptions } from '@/types/tab';
import type { TemplateConversionPendingData } from '@/stores/new-doc.store';

interface UseViewerTemplatePickerParams {
  filePath: string | null;
  content: string;
  /** createReferencedTemplate에서 pending store의 sourceTitle로만 사용 — 저장 draft 제목과 무관 */
  documentTitle?: string;
  openTab: (options: OpenTabOptions) => string;
  setTemplateConversionPending: (tabId: string, data: TemplateConversionPendingData) => void;
  clearTemplateConversionPending: (tabId: string) => void;
}

interface UseViewerTemplatePickerResult {
  isViewerTemplatePickerOpen: boolean;
  viewerReferenceTemplates: TemplateItem[];
  previewTemplate: TemplateItem | null;
  isCheckingReferenceTemplates: boolean;
  startViewerTemplateFlow: () => void;
  closeViewerTemplatePicker: () => void;
  openViewerTemplatePreview: (template: TemplateItem) => void;
  returnFromPreviewToPicker: () => void;
  createReferencedTemplate: () => void;
}

export function useViewerTemplatePicker({
  filePath,
  content,
  documentTitle,
  openTab,
  setTemplateConversionPending,
  clearTemplateConversionPending,
}: UseViewerTemplatePickerParams): UseViewerTemplatePickerResult {
  const queryClient = useQueryClient();
  const [viewerReferenceTemplates, setViewerReferenceTemplates] = useState<TemplateItem[]>([]);
  const [isViewerTemplatePickerOpen, setIsViewerTemplatePickerOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [isCheckingReferenceTemplates, setIsCheckingReferenceTemplates] = useState(false);

  const createReferencedTemplate = useCallback(() => {
    const targetTabId = `new-template-${crypto.randomUUID()}`;
    setTemplateConversionPending(targetTabId, {
      sourceFilePath: filePath ?? '',
      sourceTitle: documentTitle,
      sourceContent: content,
    });
    const openedId = openTab({
      id: targetTabId,
      title: '새 템플릿',
      path: '/doc/new-template',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
    if (!openedId) {
      clearTemplateConversionPending(targetTabId);
      toast.error('새 템플릿 탭을 열지 못했습니다.', {
        description: '열린 탭 수를 확인하세요.',
      });
      return;
    }
    setIsViewerTemplatePickerOpen(false);
  }, [clearTemplateConversionPending, content, documentTitle, filePath, openTab, setTemplateConversionPending]);

  const startViewerTemplateFlow = useCallback(() => {
    if (!filePath) return;
    void (async () => {
      setIsCheckingReferenceTemplates(true);
      setPreviewTemplate(null);
      try {
        const response = await queryClient.fetchQuery({
          queryKey: templateKeys.byReferenceDocument(filePath),
          queryFn: () => templateApi.listByReferenceDocument(filePath),
          staleTime: 5 * 60 * 1000,
        });
        if (!response.success) {
          toast.error('템플릿 전환 준비에 실패했습니다.', {
            description: '잠시 후 다시 시도해주세요.',
          });
          return;
        }
        const items = Array.isArray(response.data) ? response.data : [];
        if (items.length > 0) {
          setViewerReferenceTemplates(items);
          setIsViewerTemplatePickerOpen(true);
          return;
        }
        createReferencedTemplate();
      } catch {
        toast.error('템플릿 전환 준비에 실패했습니다.', {
          description: '잠시 후 다시 시도해주세요.',
        });
      } finally {
        setIsCheckingReferenceTemplates(false);
      }
    })();
  }, [createReferencedTemplate, filePath, queryClient]);

  const openViewerTemplatePreview = useCallback((template: TemplateItem) => {
    setPreviewTemplate(template);
    setIsViewerTemplatePickerOpen(false);
  }, []);

  const returnFromPreviewToPicker = useCallback(() => {
    setPreviewTemplate(null);
    setIsViewerTemplatePickerOpen(true);
  }, []);

  /** idempotent — 이미 false여도 안전. 상태만 닫고 side effect 없음 */
  const closeViewerTemplatePicker = useCallback(() => {
    setIsViewerTemplatePickerOpen(false);
  }, []);

  return {
    isViewerTemplatePickerOpen,
    viewerReferenceTemplates,
    previewTemplate,
    isCheckingReferenceTemplates,
    startViewerTemplateFlow,
    closeViewerTemplatePicker,
    openViewerTemplatePreview,
    returnFromPreviewToPicker,
    createReferencedTemplate,
  };
}
