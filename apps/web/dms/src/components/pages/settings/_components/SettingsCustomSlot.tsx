'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import type { DeepPartialClient, DmsSettingsConfigClient } from '@/lib/api/endpoints/settings';
import { ApprovalRoutePolicySection } from './ApprovalRoutePolicySection';
import { ContractExportPolicySection } from './ContractExportPolicySection';
import { DocumentAccessSurface } from './DocumentAccessSurface';
import { TemplateSection } from './TemplateSection';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
  usage: 'general' | 'crm-quote-document' | 'crm-contract-document' | 'crm-opportunity-contract-document';
}

type SettingsCustomSlotKey =
  | 'document-access'
  | 'admin-templates'
  | 'approval-route-policy'
  | 'contract-export-policy';

interface SettingsCustomSlotProps {
  slotKey: SettingsCustomSlotKey;
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
  config?: DmsSettingsConfigClient | null;
  isSavingSettings?: boolean;
  onUpdateSettings?: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  anchorIds?: Record<string, string>;
}

function AdminTemplatesSurface({
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
}: Omit<SettingsCustomSlotProps, 'slotKey'>) {
  return (
    <div className="space-y-3">
      <article id={anchorIds.status} className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 사용 가능</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">관리자 템플릿 관리</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              기존 템플릿 관리 기능은 문서 도메인 관리 업무로 유지합니다. 마켓플레이스와 공개/개인 템플릿 관리는
              별도 설정 항목으로 분리합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-caption ssoo-tone-success-surface">
            사용 가능
          </span>
        </div>
      </article>

      <TemplateSection
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        hasTemplateLoadError={hasTemplateLoadError}
        onReloadTemplates={onReloadTemplates}
        templateDraft={templateDraft}
        setTemplateDraft={setTemplateDraft}
        onSave={onSave}
        onDelete={onDelete}
        onUploadDocx={onUploadDocx}
        onConfirmReview={onConfirmReview}
        reviewConfirmingTemplateId={reviewConfirmingTemplateId}
        uploadingDocxTemplateId={uploadingDocxTemplateId}
        anchorIds={anchorIds}
      />
    </div>
  );
}

export function SettingsCustomSlot({
  slotKey,
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
  config,
  isSavingSettings,
  onUpdateSettings,
  anchorIds,
}: SettingsCustomSlotProps) {
  if (slotKey === 'document-access') {
    return <DocumentAccessSurface anchorIds={anchorIds} />;
  }

  if (slotKey === 'approval-route-policy') {
    return (
      <ApprovalRoutePolicySection
        policy={config?.system?.crmContractApprovalRoute ?? null}
        isSavingSettings={isSavingSettings}
        onUpdateSettings={onUpdateSettings}
        anchorIds={anchorIds}
      />
    );
  }

  if (slotKey === 'contract-export-policy') {
    return (
      <ContractExportPolicySection
        policy={config?.system?.crmContractExportPolicy ?? null}
        isSavingSettings={isSavingSettings}
        onUpdateSettings={onUpdateSettings}
        anchorIds={anchorIds}
      />
    );
  }

  return (
    <AdminTemplatesSurface
      templates={templates}
      isLoadingTemplates={isLoadingTemplates}
      hasTemplateLoadError={hasTemplateLoadError}
      onReloadTemplates={onReloadTemplates}
      templateDraft={templateDraft}
      setTemplateDraft={setTemplateDraft}
      onSave={onSave}
      onDelete={onDelete}
      onUploadDocx={onUploadDocx}
      onConfirmReview={onConfirmReview}
      reviewConfirmingTemplateId={reviewConfirmingTemplateId}
      uploadingDocxTemplateId={uploadingDocxTemplateId}
      anchorIds={anchorIds}
    />
  );
}
