'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { DocumentAccessSurface } from './DocumentAccessSurface';
import { TemplateSection } from './TemplateSection';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
}

type SettingsCustomSlotKey = 'document-access' | 'admin-templates';

interface SettingsCustomSlotProps {
  slotKey: SettingsCustomSlotKey;
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
  templateDraft: TemplateDraft;
  setTemplateDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onSave: () => void;
  onDelete: (template: TemplateItem) => void;
}

function AdminTemplatesSurface({
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: Omit<SettingsCustomSlotProps, 'slotKey'>) {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 사용 가능</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">관리자 템플릿 관리</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              기존 템플릿 관리 기능은 이 항목으로 재배치합니다. 마켓플레이스와 공개/개인 템플릿 관리는 별도
              설정 항목으로 분리합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-caption text-emerald-700">
            사용 가능
          </span>
        </div>
      </article>

      <TemplateSection
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        templateDraft={templateDraft}
        setTemplateDraft={setTemplateDraft}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

export function SettingsCustomSlot({
  slotKey,
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: SettingsCustomSlotProps) {
  if (slotKey === 'document-access') {
    return <DocumentAccessSurface />;
  }

  return (
    <AdminTemplatesSurface
      templates={templates}
      isLoadingTemplates={isLoadingTemplates}
      templateDraft={templateDraft}
      setTemplateDraft={setTemplateDraft}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
