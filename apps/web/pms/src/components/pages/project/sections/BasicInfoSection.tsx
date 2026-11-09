'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/validations/zod';
import { useProjectAccess, useUpdateProject } from '@/hooks/queries';
import { useCustomerList } from '@/hooks/queries/useCustomers';
import { usePlantSites, useSystemInstances } from '@/hooks/queries/usePmsMaster';
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
import type { Project, ProjectStageCode, ProjectStatusCode } from '@/lib/api/endpoints/projects';
import {
  formatCustomerLookupCaption,
  formatCustomerOrganizationAnchorLabel,
  formatProjectCustomerName,
  formatProjectCustomerOrganizationLabel,
  formatProjectPlantSiteLabel,
  formatProjectSystemInstanceLabel,
} from '@/lib/project-display';
import { formatPmsDate } from '@/lib/pms-format';
import { OrganizationsSection } from './OrganizationsSection';
import { RelationsSection } from './RelationsSection';

const statusLabels: Record<ProjectStatusCode, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const stageLabels: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행',
  done: '완료',
};

const EMPTY_SELECT_VALUE = '__none__';

const basicInfoSchema = z.object({
  projectName: z.string().min(1, '프로젝트명을 입력하세요').max(200, '최대 200자까지 입력 가능합니다.'),
  customerId: z.string().optional(),
  plantId: z.string().optional(),
  systemInstanceId: z.string().optional(),
  description: z.string().max(2000, '최대 2000자까지 입력 가능합니다.').optional(),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface BasicInfoSectionProps {
  project: Project;
  onUpdated: () => void;
}

export function BasicInfoSection({ project, onUpdated }: BasicInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateProject = useUpdateProject();
  const { data: accessResponse } = useProjectAccess(project.id);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      projectName: project.projectName,
      customerId: toSelectValue(project.customerId),
      plantId: toSelectValue(project.plantId),
      systemInstanceId: toSelectValue(project.systemInstanceId),
      description: project.memo ?? '',
    },
  });
  const selectedCustomerId = form.watch('customerId');
  const selectedPlantId = form.watch('plantId');
  const { data: customersData } = useCustomerList({ page: 1, pageSize: 100 });
  const siteFilters = useMemo(() => ({
    page: 1,
    pageSize: 100,
    ...(selectedCustomerId && { customerId: selectedCustomerId }),
  }), [selectedCustomerId]);
  const instanceFilters = useMemo(() => ({
    page: 1,
    pageSize: 100,
    ...(selectedCustomerId && { customerId: selectedCustomerId }),
    ...(selectedPlantId && { siteId: selectedPlantId }),
  }), [selectedCustomerId, selectedPlantId]);
  const siteQuery = usePlantSites(siteFilters);
  const instanceQuery = useSystemInstances(instanceFilters);
  const customers = customersData?.data?.items ?? [];
  const sites = useMemo(() => siteQuery.data?.data?.items ?? [], [siteQuery.data]);
  const instances = useMemo(() => instanceQuery.data?.data?.items ?? [], [instanceQuery.data]);
  const projectCustomerId = toSelectValue(project.customerId);
  const lookupCustomer = customers.find((customer) => customer.id === projectCustomerId);
  const lookupCustomerLabel = findLabel(
    customers.map((customer) => ({
      value: customer.id,
      label: customer.customerName,
      caption: formatCustomerLookupCaption(customer),
    })),
    projectCustomerId,
  );
  const projectCustomerLabel = formatProjectCustomerName(project);
  const customerLabel = projectCustomerLabel === projectCustomerId || projectCustomerLabel === '-'
    ? lookupCustomerLabel
    : projectCustomerLabel;
  const hasProjectCustomerOrganization = Boolean(
    project.customerOrganizationId
      || project.customerOrganizationCode
      || project.customerOrganizationName,
  );
  const lookupCustomerOrganizationLabel = lookupCustomer
    ? formatCustomerOrganizationAnchorLabel(lookupCustomer)
    : '공용 조직 미연결';
  const customerOrganizationLabel = hasProjectCustomerOrganization
    ? formatProjectCustomerOrganizationLabel(project)
    : lookupCustomerOrganizationLabel;
  const projectPlantId = toSelectValue(project.plantId);
  const lookupSiteLabel = findLabel(
    sites.map((site) => ({
      value: site.siteId,
      label: site.siteName,
      caption: site.siteCode,
    })),
    projectPlantId,
  );
  const projectPlantSiteLabel = formatProjectPlantSiteLabel(project);
  const siteLabel = projectPlantSiteLabel === projectPlantId || projectPlantSiteLabel === '-'
    ? lookupSiteLabel
    : projectPlantSiteLabel;
  const projectSystemInstanceId = toSelectValue(project.systemInstanceId);
  const lookupInstanceLabel = findLabel(
    instances.map((instance) => ({
      value: instance.systemInstanceId,
      label: instance.instanceName,
      caption: instance.instanceCode,
    })),
    projectSystemInstanceId,
  );
  const projectSystemInstanceLabel = formatProjectSystemInstanceLabel(project);
  const instanceLabel = projectSystemInstanceLabel === projectSystemInstanceId || projectSystemInstanceLabel === '-'
    ? lookupInstanceLabel
    : projectSystemInstanceLabel;

  useEffect(() => {
    const selectedSite = form.getValues('plantId');
    if (!selectedSite || siteQuery.isLoading) return;
    if (!sites.some((site) => site.siteId === selectedSite)) {
      form.setValue('plantId', '');
      form.setValue('systemInstanceId', '');
    }
  }, [form, siteQuery.isLoading, sites]);

  useEffect(() => {
    const selectedInstance = form.getValues('systemInstanceId');
    if (!selectedInstance || instanceQuery.isLoading) return;
    if (!instances.some((instance) => instance.systemInstanceId === selectedInstance)) {
      form.setValue('systemInstanceId', '');
    }
  }, [form, instanceQuery.isLoading, instances]);

  const handleSave = async (data: BasicInfoFormData) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          projectName: data.projectName,
          customerId: data.customerId || null,
          plantId: data.plantId || null,
          systemInstanceId: data.systemInstanceId || null,
          description: data.description,
        },
      });
      setIsEditing(false);
      onUpdated();
    } catch {
      // error handled by mutation
    }
  };

  if (!isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">기본 정보</h2>
          {canEditProject && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              편집
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">프로젝트명</p>
            <p className="font-medium">{project.projectName}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">상태</p>
            <span className="px-2 py-1 rounded text-xs font-medium bg-ssoo-info-bg text-ssoo-info">
              {statusLabels[project.statusCode]}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">단계</p>
            <span className="px-2 py-1 rounded text-xs font-medium bg-ssoo-success-bg text-ssoo-success">
              {stageLabels[project.stageCode]}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">등록일</p>
            <p>{formatPmsDate(project.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">고객사</p>
            <p>{customerLabel}</p>
            {customerLabel !== '-' && (
              <p className="mt-1 text-xs text-muted-foreground">{customerOrganizationLabel}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground mb-1">플랜트/사이트</p>
            <p>{siteLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">시스템 인스턴스</p>
            <p>{instanceLabel}</p>
          </div>
          {project.memo && (
            <div className="col-span-2 lg:col-span-4">
              <p className="text-muted-foreground mb-1">메모</p>
              <p className="whitespace-pre-wrap">{project.memo}</p>
            </div>
          )}
          <div className="col-span-2 lg:col-span-4">
            <OrganizationsSection projectId={project.id} />
          </div>
          <div className="col-span-2 lg:col-span-4">
            <RelationsSection projectId={project.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">기본 정보 편집</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <X className="h-3.5 w-3.5 mr-1" />
            취소
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSave)}
            disabled={updateProject.isPending || !canEditProject}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            저장
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <FormField
          label="프로젝트명"
          required
          error={form.formState.errors.projectName?.message}
        >
          <Input {...form.register('projectName')} />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="고객사" error={form.formState.errors.customerId?.message}>
            <Controller
              name="customerId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="고객사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택 안함</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customerName} · {formatCustomerLookupCaption(customer)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="플랜트/사이트" error={form.formState.errors.plantId?.message}>
            <Controller
              name="plantId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="플랜트/사이트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택 안함</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.siteId} value={site.siteId}>
                        {site.siteName} · {site.siteCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="시스템 인스턴스" error={form.formState.errors.systemInstanceId?.message}>
            <Controller
              name="systemInstanceId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="시스템 인스턴스를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택 안함</SelectItem>
                    {instances.map((instance) => (
                      <SelectItem key={instance.systemInstanceId} value={instance.systemInstanceId}>
                        {instance.instanceName} · {instance.instanceCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="메모" error={form.formState.errors.description?.message}>
          <Textarea {...form.register('description')} rows={3} />
        </FormField>
        <OrganizationsSection projectId={project.id} />
        <RelationsSection projectId={project.id} />
      </div>
    </div>
  );
}

function toSelectValue(value: number | string | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function findLabel(
  options: Array<{ value: string; label: string; caption?: string | null }>,
  value: string,
) {
  if (!value) return '-';
  const option = options.find((item) => item.value === value);
  if (!option) return value;
  return option.caption ? `${option.label} · ${option.caption}` : option.label;
}
