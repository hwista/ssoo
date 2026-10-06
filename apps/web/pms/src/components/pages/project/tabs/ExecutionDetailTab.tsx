'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upsertExecutionDetailSchema } from '@/lib/validations/project';
import type { UpsertExecutionDetailInput } from '@/lib/validations/project';
import { useProjectAccess, useProjectList, useUpsertExecutionDetail } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Save, X } from 'lucide-react';
import type { Project, ProjectExecutionDetail } from '@/lib/api/endpoints/projects';
import { formatPmsAmount, formatPmsDate } from '@/lib/pms-format';
import { SsooSearchInput } from '@ssoo/web-shell';

type ExecutionEditableInput = Pick<UpsertExecutionDetailInput, 'deliveryMethodCode' | 'nextProjectId' | 'memo'>;

const executionEditableSchema = upsertExecutionDetailSchema.pick({
  deliveryMethodCode: true,
  nextProjectId: true,
  memo: true,
});

const EMPTY_PROJECT_VALUE = '__none__';

const formatProjectOption = (project: Project) =>
  `${project.projectName} · PRJ-${String(project.id).padStart(6, '0')} · ${project.statusCode}/${project.stageCode}`;

const formatProjectContext = (project: Project) =>
  [project.customerName, project.plantSiteName, project.systemInstanceName].filter(Boolean).join(' · ');

interface Props {
  projectId: number;
  detail: ProjectExecutionDetail | null;
  onSaved: () => void;
}

export function ExecutionDetailTab({ projectId, detail, onSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [projectSearch, setProjectSearch] = useState(() => (
    detail?.nextProjectId ? String(detail.nextProjectId) : ''
  ));
  const upsertMutation = useUpsertExecutionDetail();
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<ExecutionEditableInput>({
    resolver: zodResolver(executionEditableSchema),
    defaultValues: {
      deliveryMethodCode: detail?.deliveryMethodCode ?? '',
      nextProjectId: detail?.nextProjectId ? Number(detail.nextProjectId) : undefined,
      memo: detail?.memo ?? '',
    },
  });
  const watchedNextProjectId = form.watch('nextProjectId');
  const selectedNextProjectId = watchedNextProjectId ? String(watchedNextProjectId) : '';
  const projectLookupSearch = projectSearch.trim() || selectedNextProjectId || (detail?.nextProjectId ? String(detail.nextProjectId) : '');
  const {
    data: projectLookupResponse,
    isLoading: isProjectLookupLoading,
    isError: isProjectLookupError,
    refetch: refetchProjectLookup,
  } = useProjectList(
    { search: projectLookupSearch, page: 1, pageSize: 20 },
    { enabled: canEditProject || Boolean(detail?.nextProjectId) },
  );
  const projectOptions = useMemo(() => (
    (projectLookupResponse?.data?.items ?? []).filter((project) => String(project.id) !== String(projectId))
  ), [projectId, projectLookupResponse]);
  const selectedNextProject = projectOptions.find(
    (project) => String(project.id) === (selectedNextProjectId || String(detail?.nextProjectId ?? '')),
  );

  useEffect(() => {
    if (isEditing) {
      return;
    }
    form.reset({
      deliveryMethodCode: detail?.deliveryMethodCode ?? '',
      nextProjectId: detail?.nextProjectId ? Number(detail.nextProjectId) : undefined,
      memo: detail?.memo ?? '',
    });
    setProjectSearch(detail?.nextProjectId ? String(detail.nextProjectId) : '');
  }, [detail, form, isEditing]);

  const handleSave = async (data: ExecutionEditableInput) => {
    try {
      await upsertMutation.mutateAsync({
        id: projectId,
        data: {
          deliveryMethodCode: data.deliveryMethodCode,
          nextProjectId: data.nextProjectId ? String(data.nextProjectId) : undefined,
          memo: data.memo,
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
            <p>{formatPmsDate(detail?.contractSignedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">계약 금액</p>
            <p>{formatPmsAmount(detail?.contractAmount, detail?.contractUnitCode ?? '')}</p>
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
            <p className="text-muted-foreground mb-1">후속 프로젝트</p>
            <p>
              {selectedNextProject
                ? formatProjectOption(selectedNextProject)
                : detail?.nextProjectId
                  ? isProjectLookupLoading
                    ? '프로젝트 조회 중...'
                    : '프로젝트 정보 조회 필요'
                  : '-'}
            </p>
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
        <div className="col-span-2 lg:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4 rounded border border-border bg-muted/20 p-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">계약 체결일</p>
            <p>{formatPmsDate(detail?.contractSignedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">계약 금액</p>
            <p>{formatPmsAmount(detail?.contractAmount, detail?.contractUnitCode ?? '')}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">청구 유형</p>
            <p>{detail?.billingTypeCode || '-'}</p>
          </div>
        </div>
        <FormField label="납품 방식">
          <Input {...form.register('deliveryMethodCode')} placeholder="예: 온프레미스, 클라우드" />
        </FormField>
        <div className="col-span-2 lg:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.8fr),minmax(240px,1.2fr)]">
          <FormField label="프로젝트 검색">
            <SsooSearchInput
              id="pms-execution-next-project-lookup-input"
              name="pms-execution-next-project-lookup-query"
              ariaLabel="후속 프로젝트 검색"
              intent="entity-lookup"
              placeholder="프로젝트명 또는 번호"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
            />
          </FormField>
          <FormField label="후속 프로젝트">
            <Select
              value={selectedNextProjectId || EMPTY_PROJECT_VALUE}
              onValueChange={(value) => {
                form.setValue(
                  'nextProjectId',
                  value === EMPTY_PROJECT_VALUE ? undefined : Number(value),
                  { shouldDirty: true, shouldValidate: true },
                );
              }}
              disabled={isProjectLookupLoading || (projectOptions.length === 0 && !selectedNextProjectId)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isProjectLookupLoading ? '조회 중...' : '프로젝트 선택'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_PROJECT_VALUE}>선택 안함</SelectItem>
                {selectedNextProjectId && !selectedNextProject ? (
                  <SelectItem value={selectedNextProjectId}>
                    프로젝트 정보 조회 필요
                  </SelectItem>
                ) : null}
                {projectOptions.map((project) => (
                  <SelectItem key={String(project.id)} value={String(project.id)}>
                    {formatProjectOption(project)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            {isProjectLookupError ? (
              <SsooErrorNotice as="span" compact>
                프로젝트 조회 결과를 불러오지 못했습니다.{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => void refetchProjectLookup()}
                >
                  다시 조회
                </Button>
              </SsooErrorNotice>
            ) : selectedNextProject ? (
              formatProjectContext(selectedNextProject) || '선택한 프로젝트를 후속 프로젝트로 저장합니다.'
            ) : (
              '조회 가능한 프로젝트 중 후속으로 연결할 대상을 선택합니다.'
            )}
          </p>
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
