'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Content } from '@/components/common/viewer/Content';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import type { TemplateItem } from '@/types/template';

interface TemplatePreviewDialogProps {
  template: TemplateItem | null;
  onClose: () => void;
}

export function TemplatePreviewDialog({ template, onClose }: TemplatePreviewDialogProps) {
  const previewHtml = React.useMemo(() => {
    if (!template?.content) return '';
    return markdownToHtmlSync(template.content);
  }, [template?.content]);

  return (
    <Dialog open={template !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col overflow-hidden p-0">
        <div className="h-12 shrink-0">
          <DialogTitle className="sr-only">{template?.name ?? '템플릿 미리보기'}</DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Content
            content={previewHtml}
            zoomLevel={100}
            variant="embedded"
            showSurface={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
