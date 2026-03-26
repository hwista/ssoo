'use client';

import { FileText } from 'lucide-react';
import { CollapsibleSection } from '@/components/templates/page-frame/sidecar';

export function TemplateSaveSection({
  enabled,
  templateDraft,
  onTemplateDraftChange,
}: {
  enabled: boolean;
  templateDraft?: {
    name: string;
    description: string;
    scope: 'personal' | 'global';
  };
  onTemplateDraftChange?: (update: {
    name?: string;
    description?: string;
    scope?: 'personal' | 'global';
  }) => void;
}) {
  return (
    <CollapsibleSection icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />} title="템플릿 저장" defaultOpen={enabled}>
      <div className="space-y-3">
        <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/20 px-3 py-2 text-caption text-ssoo-primary/75">
          현재 저장은 위키 문서가 아니라 템플릿만 생성합니다. 본문은 템플릿 마크다운으로, 메타데이터는 템플릿 사이드카로 저장됩니다.
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-ssoo-primary">템플릿 이름</label>
          <input
            type="text"
            value={templateDraft?.name ?? ''}
            onChange={(event) => onTemplateDraftChange?.({ name: event.target.value })}
            placeholder="예: 프로젝트 1Pager"
            className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-2 text-body-sm text-ssoo-primary outline-none focus:border-ssoo-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-ssoo-primary">설명</label>
          <textarea
            value={templateDraft?.description ?? ''}
            onChange={(event) => onTemplateDraftChange?.({ description: event.target.value })}
            placeholder="템플릿 용도와 사용 맥락을 간단히 적어주세요."
            rows={3}
            className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-2 text-body-sm text-ssoo-primary outline-none focus:border-ssoo-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm text-ssoo-primary">공개 범위</label>
          <select
            value={templateDraft?.scope ?? 'personal'}
            onChange={(event) => onTemplateDraftChange?.({ scope: event.target.value as 'personal' | 'global' })}
            className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-2 text-body-sm text-ssoo-primary outline-none focus:border-ssoo-primary"
          >
            <option value="personal">내 템플릿</option>
            <option value="global">공통 템플릿</option>
          </select>
        </div>
        <div className="rounded-md border border-dashed border-ssoo-content-border px-3 py-2 text-caption text-ssoo-primary/60">
          템플릿 저장 시 위키 문서 파일과 문서용 사이드카는 생성되지 않습니다.
        </div>
      </div>
    </CollapsibleSection>
  );
}
