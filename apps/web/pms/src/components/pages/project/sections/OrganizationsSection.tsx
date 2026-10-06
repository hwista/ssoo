'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useState } from 'react';
import { Building2, Link2, Plus, X } from 'lucide-react';
import {
  useCreateProjectOrg,
  useProjectAccess,
  useProjectOrgLookup,
  useProjectOrgs,
  useRemoveProjectOrg,
} from '@/hooks/queries';
import type { ProjectOrgItem, ProjectOrgRoleCode } from '@/lib/api/endpoints/projects';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmStore } from '@/stores/confirm.store';
import { SsooSearchInput } from '@ssoo/web-shell';

const PROJECT_ORG_COMPAT_SOURCE = 'pms-project-org-compat';

const ROLE_LABELS = {
  owner: '소유조직',
  customer: '고객사',
  supplier: '공급사',
  partner: '협력사',
} as const;

const EXPLICIT_ROLE_OPTIONS: Array<{
  value: Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>;
  label: string;
}> = [
  { value: 'supplier', label: ROLE_LABELS.supplier },
  { value: 'partner', label: ROLE_LABELS.partner },
];

const SCOPE_LABELS: Record<string, string> = {
  internal: '내부',
  external: '외부',
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const formatOrganizationName = (projectOrg: ProjectOrgItem) =>
  projectOrg.organization?.orgName ?? '조직 정보 조회 필요';

const formatOrganizationCaption = (projectOrg: ProjectOrgItem) => {
  const organization = projectOrg.organization;
  const parts = [
    organization?.orgCode ?? '공용 조직 기준정보 조회 필요',
    organization?.levelType,
    projectOrg.memo,
  ].filter(Boolean);

  return parts.join(' · ');
};

interface OrganizationsSectionProps {
  projectId: number;
}

export function OrganizationsSection({ projectId }: OrganizationsSectionProps) {
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [roleCode, setRoleCode] = useState<Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>>(
    'supplier',
  );
  const { data, isLoading, error } = useProjectOrgs(projectId);
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;
  const { data: organizationLookupResponse, isLoading: isOrganizationLookupLoading } =
    useProjectOrgLookup(
      projectId,
      { search: organizationSearch, scope: 'external', limit: 20 },
      { enabled: canEditProject },
    );
  const createProjectOrg = useCreateProjectOrg();
  const removeProjectOrg = useRemoveProjectOrg();
  const { confirm } = useConfirmStore();
  const projectOrgs = data?.data ?? [];
  const organizationOptions = organizationLookupResponse?.data ?? [];
  const selectedOrganization = organizationOptions.find(
    (organization) => organization.organizationId === selectedOrganizationId,
  );

  const handleAdd = async () => {
    if (!selectedOrganizationId) {
      toast.error('연결할 공용 조직을 선택해주세요.', {
        description: '공급사/협력사는 활성 공용 조직 조회 결과에서 선택합니다.',
      });
      return;
    }

    try {
      await createProjectOrg.mutateAsync({
        projectId,
        data: {
          roleCode,
          organizationId: selectedOrganizationId,
        },
      });
      setSelectedOrganizationId('');
      toast.success(`${ROLE_LABELS[roleCode]} 연결을 추가했습니다.`, {
        description: selectedOrganization
          ? `${selectedOrganization.organizationName} · ${selectedOrganization.organizationCode}`
          : undefined,
      });
    } catch (createError) {
      toast.error(`${ROLE_LABELS[roleCode]} 연결을 추가하지 못했습니다.`, {
        description: getErrorMessage(createError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleRemove = async (projectOrg: ProjectOrgItem) => {
    const organizationName = formatOrganizationName(projectOrg);
    const confirmed = await confirm({
      title: `${ROLE_LABELS[projectOrg.roleCode]} 연결을 제거할까요?`,
      description: `${organizationName} 와(과)의 직접 연결을 해제합니다.`,
      confirmText: '제거',
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeProjectOrg.mutateAsync({
        projectId,
        organizationId: String(projectOrg.organizationId),
        roleCode: projectOrg.roleCode,
      });
      toast.success(`${ROLE_LABELS[projectOrg.roleCode]} 연결을 제거했습니다.`);
    } catch (removeError) {
      toast.error(`${ROLE_LABELS[projectOrg.roleCode]} 연결을 제거하지 못했습니다.`, {
        description: getErrorMessage(removeError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">연결 조직</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <code>owner/customer</code> 는 현재 프로젝트 기준 정보에서 자동 반영됩니다.{' '}
          <code>supplier/partner</code> 는 활성 공용 조직 조회 결과에서 선택해 연결합니다.
        </p>
      </div>

      {canEditProject ? (
        <div className="mb-4 rounded-md border border-dashed bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-[140px,minmax(180px,1fr),minmax(220px,1.25fr),auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">역할</label>
              <Select
                value={roleCode}
                onValueChange={(value: Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>) =>
                  setRoleCode(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPLICIT_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">조직 검색</label>
              <SsooSearchInput
                id="pms-project-organization-lookup-input"
                name="pms-project-organization-lookup-query"
                ariaLabel="프로젝트 연결 조직 검색"
                intent="entity-lookup"
                placeholder="조직명 또는 코드"
                value={organizationSearch}
                onChange={(event) => setOrganizationSearch(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">연결 조직</label>
              <Select
                value={selectedOrganizationId}
                onValueChange={setSelectedOrganizationId}
                disabled={isOrganizationLookupLoading || organizationOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isOrganizationLookupLoading ? '조회 중...' : '공용 조직 선택'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizationOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      조회 결과 없음
                    </SelectItem>
                  ) : (
                    organizationOptions.map((organization) => (
                      <SelectItem
                        key={organization.organizationId}
                        value={organization.organizationId}
                      >
                        {organization.organizationName} · {organization.organizationCode}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleAdd}
                disabled={createProjectOrg.isPending || !selectedOrganizationId}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                추가
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            이 영역에서는 supplier/partner 만 직접 관리합니다. owner/customer 는 기준
            정보에서 자동 반영됩니다.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">조직 정보를 불러오는 중...</p>
      ) : error ? (
        <SsooErrorNotice as="p" compact>조직 정보를 불러오지 못했습니다.</SsooErrorNotice>
      ) : projectOrgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          현재 연결된 프로젝트 조직이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {projectOrgs.map((projectOrg) => {
            const organization = projectOrg.organization;
            const scopeLabel = organization?.scope
              ? SCOPE_LABELS[organization.scope] ?? organization.scope
              : null;
            const isExplicitRole = projectOrg.roleCode === 'supplier' || projectOrg.roleCode === 'partner';
            const isCompatibilityRow = projectOrg.lastSource === PROJECT_ORG_COMPAT_SOURCE;
            const provenanceLabel = isCompatibilityRow
              ? '기준 반영'
              : isExplicitRole
                ? '직접 연결'
                : '직접 편집';

            return (
              <div
                key={`${projectOrg.organizationId}-${projectOrg.roleCode}`}
                className="flex flex-col gap-3 rounded-md border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{formatOrganizationName(projectOrg)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {formatOrganizationCaption(projectOrg)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-ssoo-info-bg px-2 py-0.5 text-xs font-medium text-ssoo-info">
                    {ROLE_LABELS[projectOrg.roleCode] ?? projectOrg.roleCode}
                  </span>
                  {scopeLabel ? (
                    <span className="inline-flex items-center rounded-full bg-ssoo-success-bg px-2 py-0.5 text-xs font-medium text-ssoo-success">
                      {scopeLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {provenanceLabel}
                  </span>
                  {canEditProject && isExplicitRole ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removeProjectOrg.isPending}
                      onClick={() => handleRemove(projectOrg)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
