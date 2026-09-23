'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import {
  DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY,
  type DmsCrmContractExportPolicy,
} from '@ssoo/types/dms';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DeepPartialClient, DmsSettingsConfigClient } from '@/lib/api/endpoints/settings';

type ContractExportPolicyAnchorKey = 'status' | 'policy' | 'paths';

interface ContractExportPolicySectionProps {
  policy?: DmsCrmContractExportPolicy | null;
  isSavingSettings?: boolean;
  onUpdateSettings?: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  anchorIds?: Partial<Record<ContractExportPolicyAnchorKey, string>>;
}

function cloneDefaultPolicy(): DmsCrmContractExportPolicy {
  return { ...DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY };
}

function normalizeRootPath(value: string, fallback: string): string {
  const normalized = (value.trim() || fallback)
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return segments.join('/') || fallback;
}

function normalizePolicy(policy: DmsCrmContractExportPolicy): DmsCrmContractExportPolicy {
  const fallback = cloneDefaultPolicy();
  return {
    policyKey: policy.policyKey.trim() || fallback.policyKey,
    policyVersion: policy.policyVersion.trim() || fallback.policyVersion,
    organizationScope: policy.organizationScope.trim() || fallback.organizationScope,
    markdownRecordRootPath: normalizeRootPath(
      policy.markdownRecordRootPath,
      fallback.markdownRecordRootPath,
    ),
    storageArtifactRootPath: normalizeRootPath(
      policy.storageArtifactRootPath,
      fallback.storageArtifactRootPath,
    ),
  };
}

function toPolicyDraft(policy?: DmsCrmContractExportPolicy | null): DmsCrmContractExportPolicy {
  return normalizePolicy(policy ?? cloneDefaultPolicy());
}

function getValidationError(policy: DmsCrmContractExportPolicy): string | null {
  if (!policy.policyKey.trim()) return '정책 식별자를 입력하세요.';
  if (!policy.policyVersion.trim()) return '정책 버전을 입력하세요.';
  if (!policy.organizationScope.trim()) return '적용 조직을 입력하세요.';
  if (!policy.markdownRecordRootPath.trim()) return '문서 기록 저장 경로를 입력하세요.';
  if (!policy.storageArtifactRootPath.trim()) return '산출물 저장 경로를 입력하세요.';
  return null;
}

function isSamePolicy(left: DmsCrmContractExportPolicy, right: DmsCrmContractExportPolicy): boolean {
  return JSON.stringify(normalizePolicy(left)) === JSON.stringify(normalizePolicy(right));
}

export function ContractExportPolicySection({
  policy,
  isSavingSettings = false,
  onUpdateSettings,
  anchorIds = {},
}: ContractExportPolicySectionProps) {
  const persistedPolicy = useMemo(() => toPolicyDraft(policy), [policy]);
  const [draft, setDraft] = useState<DmsCrmContractExportPolicy>(persistedPolicy);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    setDraft(persistedPolicy);
    setSaveState('idle');
  }, [persistedPolicy]);

  const validationError = getValidationError(draft);
  const hasChanges = !isSamePolicy(draft, persistedPolicy);
  const resolvedRecordPreview = `${normalizeRootPath(draft.markdownRecordRootPath, cloneDefaultPolicy().markdownRecordRootPath)}/${draft.organizationScope.trim() || 'global'}/CRM-CT-001`;
  const resolvedArtifactPreview = `${normalizeRootPath(draft.storageArtifactRootPath, cloneDefaultPolicy().storageArtifactRootPath)}/${draft.organizationScope.trim() || 'global'}/CRM-CT-001`;

  const updateDraftField = (field: keyof DmsCrmContractExportPolicy, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaveState('idle');
  };

  const resetDraft = () => {
    setDraft(persistedPolicy);
    setSaveState('idle');
  };

  const resetToDefault = () => {
    setDraft(cloneDefaultPolicy());
    setSaveState('idle');
  };

  const savePolicy = async () => {
    if (validationError || !onUpdateSettings) return;
    const nextPolicy = normalizePolicy(draft);
    const partial = {
      system: {
        crmContractExportPolicy: nextPolicy,
      },
    } as DeepPartialClient<DmsSettingsConfigClient>;
    const success = await onUpdateSettings(partial);
    setSaveState(success ? 'saved' : 'failed');
  };

  return (
    <div className="space-y-3 pb-20">
      <article
        id={anchorIds.status}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3 [container-type:inline-size]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 적용 정책</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">{persistedPolicy.policyKey}</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              CRM 계약 lifecycle은 이 정책으로 markdown evidence와 Word/PDF artifact 경로를 결정합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-caption ssoo-tone-success-surface">
            {persistedPolicy.organizationScope}
          </span>
        </div>
        <dl className="mt-3 grid gap-2 text-caption text-ssoo-primary/75 md:grid-cols-2 [@container(max-width:559px)]:grid-cols-1">
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">정책 버전</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] text-label-md text-ssoo-primary">{persistedPolicy.policyVersion}</dd>
          </div>
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">산출물 기본 경로</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] text-label-md text-ssoo-primary">
              {persistedPolicy.storageArtifactRootPath}
            </dd>
          </div>
        </dl>
      </article>

      <article
        id={anchorIds.policy}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3 [container-type:inline-size]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label-strong text-ssoo-primary">정책 식별자</h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {saveState === 'saved' && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption ssoo-tone-success-surface">
                <Check className="h-3.5 w-3.5" />
                저장됨
              </span>
            )}
            {saveState === 'failed' && (
              <span className="rounded-full border px-2 py-0.5 text-caption ssoo-tone-danger-surface">저장 실패</span>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 [@container(max-width:559px)]:grid-cols-1">
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">정책 식별자</span>
            <Input
              value={draft.policyKey}
              onChange={(event) => updateDraftField('policyKey', event.target.value)}
              placeholder="dms-crm-contract-export-standard"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">정책 버전</span>
            <Input
              value={draft.policyVersion}
              onChange={(event) => updateDraftField('policyVersion', event.target.value)}
              placeholder="dms-crm-contract-export-standard@2026-07-10"
            />
          </label>
          <label className="min-w-0 space-y-1 md:col-span-2 [@container(max-width:559px)]:col-span-1">
            <span className="text-caption text-ssoo-primary/70">적용 조직</span>
            <Input
              value={draft.organizationScope}
              onChange={(event) => updateDraftField('organizationScope', event.target.value)}
              placeholder="global"
            />
          </label>
        </div>
      </article>

      <article
        id={anchorIds.paths}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3 [container-type:inline-size]"
      >
        <h3 className="text-label-strong text-ssoo-primary">산출 경로</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2 [@container(max-width:559px)]:grid-cols-1">
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">문서 기록 저장 경로</span>
            <Input
              value={draft.markdownRecordRootPath}
              onChange={(event) => updateDraftField('markdownRecordRootPath', event.target.value)}
              placeholder="_generated/crm-contract-lifecycle"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">산출물 저장 경로</span>
            <Input
              value={draft.storageArtifactRootPath}
              onChange={(event) => updateDraftField('storageArtifactRootPath', event.target.value)}
              placeholder="_assets/crm-contract-lifecycle"
            />
          </label>
        </div>
        <dl className="mt-3 grid gap-2 text-caption text-ssoo-primary/75 md:grid-cols-2 [@container(max-width:559px)]:grid-cols-1">
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">문서 기록 경로 미리보기</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] text-label-md text-ssoo-primary">{resolvedRecordPreview}</dd>
          </div>
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">산출물 경로 미리보기</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] text-label-md text-ssoo-primary">{resolvedArtifactPreview}</dd>
          </div>
        </dl>

        {validationError && <p className="mt-3 text-caption text-destructive">{validationError}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetDraft}
            disabled={!hasChanges || isSavingSettings}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            되돌리기
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetToDefault}
            disabled={isSavingSettings}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            기본값
          </Button>
          <Button
            type="button"
            onClick={() => {
              void savePolicy();
            }}
            disabled={!hasChanges || Boolean(validationError) || isSavingSettings || !onUpdateSettings}
            className="gap-1"
          >
            {isSavingSettings ? <LoadingSpinner className="text-current" /> : <Save className="h-4 w-4" />}
            {isSavingSettings ? '저장 중' : '저장'}
          </Button>
        </div>
      </article>
    </div>
  );
}
