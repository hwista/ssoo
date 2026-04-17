'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upsertExecutionDetailSchema } from '@/lib/validations/project';
import type { UpsertExecutionDetailInput } from '@/lib/validations/project';
import { useProjectAccess, useUpsertExecutionDetail } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import type { ProjectExecutionDetail } from '@/lib/api/endpoints/projects';

interface Props {
  projectId: number;
  detail: ProjectExecutionDetail | null;
  onSaved: () => void;
}

export function ExecutionDetailTab({ projectId, detail, onSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const upsertMutation = useUpsertExecutionDetail();
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<UpsertExecutionDetailInput>({
    resolver: zodResolver(upsertExecutionDetailSchema),
    defaultValues: {
      contractSignedAt: detail?.contractSignedAt ?? '',
      contractAmount: detail?.contractAmount ? String(detail.contractAmount) : '',
      contractUnitCode: detail?.contractUnitCode ?? '',
      billingTypeCode: detail?.billingTypeCode ?? '',
      deliveryMethodCode: detail?.deliveryMethodCode ?? '',
      nextProjectId: detail?.nextProjectId ? Number(detail.nextProjectId) : undefined,
      memo: detail?.memo ?? '',
    },
  });

  const handleSave = async (data: UpsertExecutionDetailInput) => {
    try {
      await upsertMutation.mutateAsync({
        id: projectId,
        data: {
          ...data,
          nextProjectId: data.nextProjectId ? String(data.nextProjectId) : undefined,
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
            <p className="text-muted-foreground mb-1">계약 체결일</p>
            <p>{detail?.contractSignedAt ? new Date(detail.contractSignedAt).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">계약 금액</p>
            <p>{detail?.contractAmount ? `${Number(detail.contractAmount).toLocaleString()} ${detail.contractUnitCode || ''}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">청구 유형</p>
            <p>{detail?.billingTypeCode || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">납품 방식</p>
            <p>{detail?.deliveryMethodCode || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">후속 프로젝트 ID</p>
            <p>{detail?.nextProjectId ? String(detail.nextProjectId) : '-'}</p>
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
              ? '아직 등록된 수행 상세 정보가 없습니다. 편집 버튼을 눌러 입력하세요.'
              : '아직 등록된 수행 상세 정보가 없습니다.'}
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
        <FormField label="계약 체결일">
          <Input type="date" {...form.register('contractSignedAt')} />
        </FormField>
        <FormField label="계약 금액">
          <Input {...form.register('contractAmount')} placeholder="금액" />
        </FormField>
        <FormField label="계약 단위">
          <Input {...form.register('contractUnitCode')} placeholder="예: KRW, USD" />
        </FormField>
        <FormField label="청구 유형">
          <Input {...form.register('billingTypeCode')} placeholder="예: 일시불, 분할" />
        </FormField>
        <FormField label="납품 방식">
          <Input {...form.register('deliveryMethodCode')} placeholder="예: 온프레미스, 클라우드" />
        </FormField>
        <FormField label="후속 프로젝트 ID">
          <Input {...form.register('nextProjectId')} />
        </FormField>
        <div className="col-span-2 lg:col-span-3">
          <FormField label="메모">
            <Textarea {...form.register('memo')} rows={2} />
          </FormField>
        </div>
      </div>
    </div>
  );
}
