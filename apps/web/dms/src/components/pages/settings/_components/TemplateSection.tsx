import type { Dispatch, SetStateAction } from 'react';
import { BadgeCheck, Check, FileUp, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { NativeSelect, Textarea } from '@ssoo/web-ui';
import { formatTemplateUpdatedAt } from '../_utils/templatePresentation';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
  usage: 'general' | 'crm-quote-document' | 'crm-contract-document' | 'crm-opportunity-contract-document';
}

export function TemplateSection({
  templates,
  isLoadingTemplates,
  hasTemplateLoadError,
  onReloadTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
  onUploadDocx,
  onConfirmReview,
  reviewConfirmingTemplateId,
  uploadingDocxTemplateId,
  anchorIds = {},
}: {
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
  hasTemplateLoadError: boolean;
  onReloadTemplates: () => void;
  templateDraft: TemplateDraft;
  setTemplateDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onSave: () => void;
  onDelete: (template: TemplateItem) => void;
  onUploadDocx?: (template: TemplateItem, file: File) => void;
  onConfirmReview?: (template: TemplateItem) => void;
  reviewConfirmingTemplateId?: string | null;
  uploadingDocxTemplateId?: string | null;
  anchorIds?: Partial<Record<'template-create' | 'template-list', string>>;
}) {
  return (
    <div className="space-y-3 pb-20">
      <article id={anchorIds['template-create']} className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <h3 className="text-label-strong text-ssoo-primary">템플릿 추가</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">템플릿 이름</span>
            <Input
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="템플릿 이름"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">설명</span>
            <Input
              value={templateDraft.description}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="설명"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">공개 범위</span>
            <NativeSelect
              value={templateDraft.scope}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, scope: event.target.value as TemplateScope }))}
            >
              <option value="personal">개인 템플릿</option>
              <option value="global">전역 템플릿</option>
            </NativeSelect>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">서식 종류</span>
            <NativeSelect
              value={templateDraft.kind}
              onChange={(event) => setTemplateDraft((prev) => ({
                ...prev,
                kind: event.target.value as TemplateKind,
                ...(event.target.value === 'folder' ? { usage: 'general' as const } : {}),
              }))}
            >
              <option value="document">문서 템플릿</option>
              <option value="folder">폴더 템플릿</option>
            </NativeSelect>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">사용 목적</span>
            <NativeSelect
              value={templateDraft.usage}
              disabled={templateDraft.kind !== 'document'}
              onChange={(event) => setTemplateDraft((prev) => ({
                ...prev,
                usage: event.target.value as TemplateDraft['usage'],
              }))}
            >
              <option value="general">일반 문서</option>
              <option value="crm-quote-document">CRM 견적서</option>
              <option value="crm-contract-document">CRM 계약서</option>
              <option value="crm-opportunity-contract-document">CRM 영업기회 계약서</option>
            </NativeSelect>
          </label>
        </div>
        <label className="mt-2 block space-y-1">
          <span className="text-caption text-ssoo-primary/70">템플릿 본문</span>
          <Textarea
            value={templateDraft.content}
            onChange={(event) => setTemplateDraft((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="템플릿 본문 (마크다운/텍스트)"
            className="min-h-[120px]"
          />
        </label>
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            템플릿 저장
          </Button>
        </div>
      </article>

      <article id={anchorIds['template-list']} className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <h3 className="text-label-strong text-ssoo-primary">템플릿 목록</h3>
        {hasTemplateLoadError && !isLoadingTemplates && (
          <div role="alert" className="mt-2 space-y-2">
            <p className="text-caption text-destructive">
              템플릿 목록을 불러오지 못했습니다. 잠시 후 다시 불러와 주세요.
            </p>
            <Button type="button" variant="outline" onClick={onReloadTemplates}>
              다시 불러오기
            </Button>
          </div>
        )}
        {isLoadingTemplates ? (
          <div className="mt-2">
            <LoadingSpinner message="템플릿을 불러오는 중입니다." className="text-caption text-ssoo-primary/70" />
          </div>
        ) : templates.length === 0 && hasTemplateLoadError ? null : templates.length === 0 ? (
          <p className="mt-2 text-caption text-ssoo-primary/70">등록된 템플릿이 없습니다.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {templates.map((template) => {
              const isCrmDocumentTemplate = template.id === 'crm-quote-v1'
                || template.id === 'crm-contract-v1'
                || template.id === 'crm-opportunity-contract-v1'
                || template.generation?.taskKey === 'crm-quote-document'
                || template.generation?.taskKey === 'crm-contract-document'
                || template.generation?.taskKey === 'crm-opportunity-contract-document';
              const isReviewConfirmed = template.reviewConfirmation?.status === 'confirmed';
              const isReviewConfirming = reviewConfirmingTemplateId === template.id;
              const isDocxUploading = uploadingDocxTemplateId === template.id;

              return (
                <div key={template.id} className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-label-strong text-ssoo-primary">{template.name}</p>
                      <p className="text-caption text-ssoo-primary/70">
                        {template.scope === 'global' ? '전역' : '개인'} · {template.kind === 'document' ? '문서' : '폴더'} · {formatTemplateUpdatedAt(template.updatedAt)}
                      </p>
                      {template.description && <p className="mt-0.5 text-caption text-ssoo-primary/70">{template.description}</p>}
                      {template.kind === 'document' && (
                        <p className="mt-1 text-caption text-ssoo-primary/70">
                          {template.docxTemplate
                            ? `DOCX · ${template.docxTemplate.fileName} · ${Math.ceil(template.docxTemplate.size / 1024)} KB · ${template.docxTemplate.origin === 'uploaded' ? '업로드' : '자동 생성'}`
                            : 'DOCX binary 미등록'}
                        </p>
                      )}
                      {isCrmDocumentTemplate && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-ssoo-primary/70">
                          <span className={`rounded-full border px-2 py-0.5 ${isReviewConfirmed ? 'ssoo-tone-success-surface' : 'ssoo-tone-warning-surface'}`}>
                            {isReviewConfirmed ? '검토 확정' : '검토 대기'}
                          </span>
                          {template.reviewConfirmation?.confirmedAt && (
                            <span>{template.reviewConfirmation.confirmedAt.slice(0, 10)}</span>
                          )}
                          {template.reviewConfirmation?.confirmedByLoginId && (
                            <span>{template.reviewConfirmation.confirmedByLoginId}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2">
                      {template.kind === 'document' && onUploadDocx && (
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <label className={isDocxUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>
                            <FileUp className="h-3.5 w-3.5" />
                            {isDocxUploading ? '업로드 중' : template.docxTemplate?.origin === 'uploaded' ? 'DOCX 교체' : 'DOCX 업로드'}
                            <Input
                              type="file"
                              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="sr-only"
                              disabled={isDocxUploading}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  onUploadDocx(template, file);
                                }
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </Button>
                      )}
                      {isCrmDocumentTemplate && onConfirmReview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onConfirmReview(template)}
                          disabled={isReviewConfirmed || isReviewConfirming}
                          className="gap-1"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {isReviewConfirmed ? '확정됨' : isReviewConfirming ? '확정 중' : '검토 확정'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onDelete(template)}
                        className="h-8 w-8 text-ssoo-primary/70 hover:border-destructive/40 hover:text-destructive"
                        aria-label={`${template.name} 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
