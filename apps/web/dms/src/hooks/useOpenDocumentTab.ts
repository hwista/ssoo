import { useCallback } from 'react';
import { useOpenTabWithConfirm } from './useOpenTabWithConfirm';

export interface OpenDocumentTabOptions {
  path: string;
  title?: string;
  activate?: boolean;
}

export function useOpenDocumentTab() {
  const openTabWithConfirm = useOpenTabWithConfirm();

  return useCallback(async ({ path, title, activate = true }: OpenDocumentTabOptions) => {
    const normalizedPath = path.replace(/^\/+/, '');
    if (!normalizedPath) return;

    await openTabWithConfirm({
      id: `file-${encodeURIComponent(normalizedPath)}`,
      title: title || normalizedPath.split('/').pop() || '문서',
      path: `/doc/${encodeURIComponent(normalizedPath)}`,
      icon: 'FileText',
      closable: true,
      activate,
    });
  }, [openTabWithConfirm]);
}
