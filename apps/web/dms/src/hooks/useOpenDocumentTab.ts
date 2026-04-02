import { useCallback } from 'react';
import { useOpenTabWithConfirm } from './useOpenTabWithConfirm';
import type { ContentType } from '@/types/content-metadata';

export interface OpenDocumentTabOptions {
  path: string;
  title?: string;
  activate?: boolean;
  /** 콘텐츠 타입 — 'document'(기본) 또는 'template' */
  contentType?: ContentType;
}

export function useOpenDocumentTab() {
  const openTabWithConfirm = useOpenTabWithConfirm();

  return useCallback(async ({ path, title, activate = true, contentType = 'document' }: OpenDocumentTabOptions) => {
    const normalizedPath = path.replace(/^\/+/, '');
    if (!normalizedPath) return;

    const isTemplate = contentType === 'template';
    const idPrefix = isTemplate ? 'template' : 'file';
    const defaultTitle = isTemplate ? '템플릿' : '문서';
    const icon = isTemplate ? 'FileTemplate' : 'FileText';

    await openTabWithConfirm({
      id: `${idPrefix}-${encodeURIComponent(normalizedPath)}`,
      title: title || normalizedPath.split('/').pop() || defaultTitle,
      path: `/doc/${encodeURIComponent(normalizedPath)}`,
      icon,
      closable: true,
      activate,
    });
  }, [openTabWithConfirm]);
}
