'use client';

import { EditorDialog } from '@/components/common/editor-dialog';
import type { TemplateItem } from '@/types/template';

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateItem[];
  title?: string;
  description?: string;
  confirmLabel?: string;
  onSelectTemplate: (item: TemplateItem) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  title = '이 문서로 만들어진 템플릿',
  description = '기존 템플릿을 미리 보거나, 현재 문서를 기준으로 새 AI 템플릿을 생성할 수 있습니다.',
  confirmLabel = 'AI 템플릿 작성',
  onSelectTemplate,
  onConfirm,
  onCancel,
}: TemplatePickerDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          onCancel();
        }
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="취소"
      onConfirm={onConfirm}
      isValid
    >
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {templates.map((template) => (
          <button
            key={`${template.scope}-${template.id}`}
            type="button"
            onClick={() => onSelectTemplate(template)}
            className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-3 text-left transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-body-sm font-medium text-ssoo-primary">{template.name}</div>
                <div className="truncate text-caption text-ssoo-primary/60">
                  {template.ownerId || 'Unknown'} · {template.updatedAt}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-ssoo-content-border px-2 py-0.5 text-caption text-ssoo-primary/70">
                {template.scope === 'global' ? '공통' : '개인'}
              </span>
            </div>
          </button>
        ))}
        {templates.length === 0 ? (
          <div className="rounded-md border border-dashed border-ssoo-content-border px-3 py-6 text-center text-body-sm text-ssoo-primary/60">
            연결된 템플릿이 없습니다.
          </div>
        ) : null}
      </div>
    </EditorDialog>
  );
}
