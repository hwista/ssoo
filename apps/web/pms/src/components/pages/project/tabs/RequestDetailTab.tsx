'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upsertRequestDetailSchema } from '@/lib/validations/project';
import type { UpsertRequestDetailInput } from '@/lib/validations/project';
import { useUpsertRequestDetail } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import type { ProjectRequestDetail } from '@/lib/api/endpoints/projects';

interface Props {
  projectId: number;
  detail: ProjectRequestDetail | null;
  onSaved: () => void;
}

export function RequestDetailTab({ projectId, detail, onSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const upsertMutation = useUpsertRequestDetail();

  const form = useForm<UpsertRequestDetailInput>({
    resolver: zodResolver(upsertRequestDetailSchema),
    defaultValues: {
      requestSourceCode: detail?.requestSourceCode ?? '',
      requestChannelCode: detail?.requestChannelCode ?? '',
      requestSummary: detail?.requestSummary ?? '',
      requestReceivedAt: detail?.requestReceivedAt ?? '',
      requestPriorityCode: detail?.requestPriorityCode ?? '',
      requestOwnerUserId: detail?.requestOwnerUserId ? Number(detail.requestOwnerUserId) : undefined,
      memo: detail?.memo ?? '',
    },
  });

  const handleSave = async (data: UpsertRequestDetailInput) => {
    try {
      await upsertMutation.mutateAsync({
        id: projectId,
        data: {
          ...data,
          requestOwnerUserId: data.requestOwnerUserId ? String(data.requestOwnerUserId) : undefined,
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
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            편집
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-body-sm">
          <div>
            <p className="text-muted-foreground mb-1">요청 출처</p>
            <p>{detail?.requestSourceCode || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">접수 채널</p>
            <p>{detail?.requestChannelCode || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">접수일</p>
            <p>{detail?.requestReceivedAt ? new Date(detail.requestReceivedAt).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">우선순위</p>
            <p>{detail?.requestPriorityCode || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">담당자 ID</p>
            <p>{detail?.requestOwnerUserId ? String(detail.requestOwnerUserId) : '-'}</p>
          </div>
          <div className="col-span-2 lg:col-span-3">
            <p className="text-muted-foreground mb-1">요청 요약</p>
            <p className="whitespace-pre-wrap">{detail?.requestSummary || '-'}</p>
          </div>
          {detail?.memo && (
            <div className="col-span-2 lg:col-span-3">
              <p className="text-muted-foreground mb-1">메모</p>
              <p className="whitespace-pre-wrap">{detail.memo}</p>
            </div>
          )}
        </div>
        {!detail && (
          <p className="text-center text-muted-foreground text-body-sm py-4">
            아직 등록된 요청 상세 정보가 없습니다. 편집 버튼을 눌러 입력하세요.
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
        <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={upsertMutation.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" />
          저장
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField label="요청 출처">
          <Input {...form.register('requestSourceCode')} placeholder="예: RFP, 고객문의" />
        </FormField>
        <FormField label="접수 채널">
          <Input {...form.register('requestChannelCode')} placeholder="예: email, phone" />
        </FormField>
        <FormField label="접수일">
          <Input type="date" {...form.register('requestReceivedAt')} />
        </FormField>
        <FormField label="우선순위">
          <Input {...form.register('requestPriorityCode')} placeholder="예: high, normal, low" />
        </FormField>
        <FormField label="담당자 ID">
          <Input {...form.register('requestOwnerUserId')} placeholder="담당자 ID" />
        </FormField>
        <div className="col-span-2 lg:col-span-3">
          <FormField label="요청 요약">
            <Textarea {...form.register('requestSummary')} rows={3} placeholder="요청 내용을 요약하세요" />
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
