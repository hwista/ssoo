'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { input } from 'zod';
import { upsertProposalDetailSchema } from '@/lib/validations/project';
import type { UpsertProposalDetailInput } from '@/lib/validations/project';
import { useProjectAccess, useProjectMembers, useUpsertProposalDetail } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import type { ProjectProposalDetail } from '@/lib/api/endpoints/projects';
import { formatPmsAmount, formatPmsDate } from '@/lib/pms-format';
import {
  formatProjectMemberOwnerLabel,
  ProjectMemberOwnerSelect,
} from './ProjectMemberOwnerSelect';

interface Props {
  projectId: number;
  detail: ProjectProposalDetail | null;
  onSaved: () => void;
}

export function ProposalDetailTab({ projectId, detail, onSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const upsertMutation = useUpsertProposalDetail();
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: membersResponse } = useProjectMembers(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<input<typeof upsertProposalDetailSchema>, unknown, UpsertProposalDetailInput>({
    resolver: zodResolver(upsertProposalDetailSchema),
    defaultValues: {
      proposalOwnerUserId: detail?.proposalOwnerUserId ? Number(detail.proposalOwnerUserId) : undefined,
      proposalDueAt: detail?.proposalDueAt ?? '',
      proposalSubmittedAt: detail?.proposalSubmittedAt ?? '',
      proposalVersion: detail?.proposalVersion ?? undefined,
      estimateAmount: detail?.estimateAmount ? String(detail.estimateAmount) : '',
      estimateUnitCode: detail?.estimateUnitCode ?? '',
      proposalScopeSummary: detail?.proposalScopeSummary ?? '',
      decisionDeadlineAt: detail?.decisionDeadlineAt ?? '',
      memo: detail?.memo ?? '',
    },
  });
  const proposalOwnerUserId = form.watch('proposalOwnerUserId');
  const proposalOwnerLabel = formatProjectMemberOwnerLabel(
    membersResponse?.data ?? [],
    detail?.proposalOwnerUserId,
  );

  const handleSave = async (data: UpsertProposalDetailInput) => {
    try {
      await upsertMutation.mutateAsync({
        id: projectId,
        data: {
          ...data,
          proposalOwnerUserId: data.proposalOwnerUserId ? String(data.proposalOwnerUserId) : undefined,
        },
      });
      setIsEditing(false);
      onSaved();
    } catch {
      // handled by mutation
    }
  };

  if (!isEditing) {
    return (
        <div>
          <div className="flex justify-end mb-3">
            {canEditProject && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                편집
              </Button>
            )}
          </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">제안 담당자</p>
            <p>{proposalOwnerLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">제안 마감일</p>
            <p>{formatPmsDate(detail?.proposalDueAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">제안 제출일</p>
            <p>{formatPmsDate(detail?.proposalSubmittedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">제안 버전</p>
            <p>{detail?.proposalVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">견적 금액</p>
            <p>{formatPmsAmount(detail?.estimateAmount, detail?.estimateUnitCode ?? '')}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">의사결정 마감일</p>
            <p>{formatPmsDate(detail?.decisionDeadlineAt)}</p>
          </div>
          <div className="col-span-2 lg:col-span-3">
            <p className="text-muted-foreground mb-1">제안 범위 요약</p>
            <p className="whitespace-pre-wrap">{detail?.proposalScopeSummary || '-'}</p>
          </div>
          {detail?.memo && (
            <div className="col-span-2 lg:col-span-3">
              <p className="text-muted-foreground mb-1">메모</p>
              <p className="whitespace-pre-wrap">{detail.memo}</p>
            </div>
          )}
        </div>
        {!detail && (
          <p className="text-center text-muted-foreground text-sm py-4">
            {canEditProject
              ? '아직 등록된 제안 상세 정보가 없습니다. 편집 버튼을 눌러 입력하세요.'
              : '아직 등록된 제안 상세 정보가 없습니다.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          <X className="h-3.5 w-3.5 mr-1" />
          취소
        </Button>
        <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={upsertMutation.isPending || !canEditProject}>
          <Save className="h-3.5 w-3.5 mr-1" />
          저장
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField label="제안 담당자">
          <ProjectMemberOwnerSelect
            projectId={projectId}
            value={proposalOwnerUserId}
            disabled={!canEditProject}
            onChange={(userId) =>
              form.setValue(
                'proposalOwnerUserId',
                userId ? Number(userId) : undefined,
                { shouldDirty: true, shouldTouch: true },
              )
            }
          />
        </FormField>
        <FormField label="제안 마감일">
          <Input type="date" {...form.register('proposalDueAt')} />
        </FormField>
        <FormField label="제안 제출일">
          <Input type="date" {...form.register('proposalSubmittedAt')} />
        </FormField>
        <FormField label="제안 버전">
          <Input type="number" {...form.register('proposalVersion', { valueAsNumber: true })} />
        </FormField>
        <FormField label="견적 금액">
          <Input {...form.register('estimateAmount')} placeholder="금액" />
        </FormField>
        <FormField label="견적 단위">
          <Input {...form.register('estimateUnitCode')} placeholder="예: KRW, USD" />
        </FormField>
        <FormField label="의사결정 마감일">
          <Input type="date" {...form.register('decisionDeadlineAt')} />
        </FormField>
        <div className="col-span-2 lg:col-span-3">
          <FormField label="제안 범위 요약">
            <Textarea {...form.register('proposalScopeSummary')} rows={3} />
          </FormField>
        </div>
        <div className="col-span-2 lg:col-span-3">
          <FormField label="메모">
            <Textarea {...form.register('memo')} rows={2} />
          </FormField>
        </div>
      </div>
    </div>
  );
}
