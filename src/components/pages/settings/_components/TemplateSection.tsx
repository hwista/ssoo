import type { Dispatch, SetStateAction } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
}

export function TemplateSection({
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: {
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
  templateDraft: TemplateDraft;
  setTemplateDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onSave: () => void;
  onDelete: (template: TemplateItem) => void;
}) {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-ssoo-primary">템플릿 추가</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={templateDraft.name}
            onChange={(event) => setTemplateDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="템플릿 이름"
            className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm text-ssoo-primary focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          />
          <input
            value={templateDraft.description}
            onChange={(event) => setTemplateDraft((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="설명"
            className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm text-ssoo-primary focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          />
          <select
            value={templateDraft.scope}
            onChange={(event) => setTemplateDraft((prev) => ({ ...prev, scope: event.target.value as TemplateScope }))}
            className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm text-ssoo-primary focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          >
            <option value="personal">개인 템플릿</option>
            <option value="global">전역 템플릿</option>
          </select>
          <select
            value={templateDraft.kind}
            onChange={(event) => setTemplateDraft((prev) => ({ ...prev, kind: event.target.value as TemplateKind }))}
            className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm text-ssoo-primary focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          >
            <option value="document">문서 템플릿</option>
            <option value="folder">폴더 템플릿</option>
          </select>
        </div>
        <textarea
          value={templateDraft.content}
          onChange={(event) => setTemplateDraft((prev) => ({ ...prev, content: event.target.value }))}
          placeholder="템플릿 본문 (마크다운/텍스트)"
          className="mt-2 min-h-[120px] w-full rounded-md border border-ssoo-content-border px-3 py-2 text-sm text-ssoo-primary focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-control-h items-center gap-1 rounded-md bg-ssoo-primary px-3 text-sm font-medium text-white hover:bg-ssoo-primary/90"
          >
            <Check className="h-4 w-4" />
            템플릿 저장
          </button>
        </div>
      </article>

      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-ssoo-primary">템플릿 목록</h3>
        {isLoadingTemplates ? (
          <div className="mt-2">
            <LoadingSpinner message="템플릿을 불러오는 중입니다." className="text-xs text-ssoo-primary/70" />
          </div>
        ) : templates.length === 0 ? (
          <p className="mt-2 text-xs text-ssoo-primary/70">등록된 템플릿이 없습니다.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ssoo-primary">{template.name}</p>
                    <p className="text-xs text-ssoo-primary/70">
                      {template.scope === 'global' ? '전역' : '개인'} · {template.kind === 'document' ? '문서' : '폴더'} · {template.updatedAt.slice(0, 10)}
                    </p>
                    {template.description && <p className="mt-0.5 text-xs text-ssoo-primary/70">{template.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(template)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ssoo-content-border text-ssoo-primary/70 hover:border-destructive/40 hover:text-destructive"
                    aria-label={`${template.name} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
