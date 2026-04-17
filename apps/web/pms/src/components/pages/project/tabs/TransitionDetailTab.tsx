'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upsertTransitionDetailSchema } from '@/lib/validations/project';
import type { UpsertTransitionDetailInput } from '@/lib/validations/project';
import { useProjectAccess, useUpsertTransitionDetail } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import type { ProjectTransitionDetail } from '@/lib/api/endpoints/projects';

interface Props {
  projectId: number;
  detail: ProjectTransitionDetail | null;
  onSaved: () => void;
}

export function TransitionDetailTab({ projectId, detail, onSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const upsertMutation = useUpsertTransitionDetail();
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<UpsertTransitionDetailInput>({
    resolver: zodResolver(upsertTransitionDetailSchema),
    defaultValues: {
      operationOwnerUserId: detail?.operationOwnerUserId ? Number(detail.operationOwnerUserId) : undefined,
      operationReservedAt: detail?.operationReservedAt ?? '',
      operationStartAt: detail?.operationStartAt ?? '',
      transitionDueAt: detail?.transitionDueAt ?? '',
      transitionSummary: detail?.transitionSummary ?? '',
      memo: detail?.memo ?? '',
    },
  });

  const handleSave = async (data: UpsertTransitionDetailInput) => {
    try {
      await upsertMutation.mutateAsync({
        id: projectId,
        data: {
          ...data,
          operationOwnerUserId: data.operationOwnerUserId ? String(data.operationOwnerUserId) : undefined,
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
            <p className="text-muted-foreground mb-1">운영 담당자 ID</p>
            <p>{detail?.operationOwnerUserId ? String(detail.operationOwnerUserId) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">운영 예정일</p>
            <p>{detail?.operationReservedAt ? new Date(detail.operationReservedAt).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">운영 시작일</p>
            <p>{detail?.operationStartAt ? new Date(detail.operationStartAt).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">전환 마감일</p>
            <p>{detail?.transitionDueAt ? new Date(detail.transitionDueAt).toLocaleDateString() : '-'}</p>
          </div>
          <div className="col-span-2 lg:col-span-3">
            <p className="text-muted-foreground mb-1">전환 요약</p>
            <p className="whitespace-pre-wrap">{detail?.transitionSummary || '-'}</p>
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
              ? '아직 등록된 전환 상세 정보가 없습니다. 편집 버튼을 눌러 입력하세요.'
              : '아직 등록된 전환 상세 정보가 없습니다.'}
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
        <FormField label="운영 담당자 ID">
          <Input {...form.register('operationOwnerUserId')} />
        </FormField>
        <FormField label="운영 예정일">
          <Input type="date" {...form.register('operationReservedAt')} />
        </FormField>
        <FormField label="운영 시작일">
          <Input type="date" {...form.register('operationStartAt')} />
        </FormField>
        <FormField label="전환 마감일">
          <Input type="date" {...form.register('transitionDueAt')} />
        </FormField>
        <div className="col-span-2 lg:col-span-3">
          <FormField label="전환 요약">
            <Textarea {...form.register('transitionSummary')} rows={3} />
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
