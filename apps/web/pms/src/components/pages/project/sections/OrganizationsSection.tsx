'use client';

import { useState } from 'react';
import { Building2, Link2, Plus, X } from 'lucide-react';
import {
  useCreateProjectOrg,
  useProjectAccess,
  useProjectOrgs,
  useRemoveProjectOrg,
} from '@/hooks/queries';
import type { ProjectOrgItem, ProjectOrgRoleCode } from '@/lib/api/endpoints/projects';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmStore } from '@/stores/confirm.store';

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

interface OrganizationsSectionProps {
  projectId: number;
}

export function OrganizationsSection({ projectId }: OrganizationsSectionProps) {
  const [organizationId, setOrganizationId] = useState('');
  const [roleCode, setRoleCode] = useState<Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>>(
    'supplier',
  );
  const { data, isLoading, error } = useProjectOrgs(projectId);
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;
  const createProjectOrg = useCreateProjectOrg();
  const removeProjectOrg = useRemoveProjectOrg();
  const { confirm } = useConfirmStore();
  const projectOrgs = data?.data ?? [];

  const handleAdd = async () => {
    const trimmedOrganizationId = organizationId.trim();

    if (!/^\d+$/.test(trimmedOrganizationId)) {
      toast.error('조직 ID 형식을 확인해주세요.', {
        description: '공급사/협력사는 숫자 Organization ID 로만 연결할 수 있습니다.',
      });
      return;
    }

    try {
      await createProjectOrg.mutateAsync({
        projectId,
        data: {
          roleCode,
          organizationId: trimmedOrganizationId,
        },
      });
      setOrganizationId('');
      toast.success(`${ROLE_LABELS[roleCode]} 연결을 추가했습니다.`);
    } catch (createError) {
      toast.error(`${ROLE_LABELS[roleCode]} 연결을 추가하지 못했습니다.`, {
        description: getErrorMessage(createError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleRemove = async (projectOrg: ProjectOrgItem) => {
    const organizationName = projectOrg.organization?.orgName ?? `조직 ${projectOrg.organizationId}`;
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
          <code>supplier/partner</code> 는 여기서 직접 연결하며, 가능하면{' '}
          <code>Organization(scope=external)</code> 를 사용하세요.
        </p>
      </div>

      {canEditProject ? (
        <div className="mb-4 rounded-md border border-dashed bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[140px,1fr,auto]">
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
               <label className="text-xs font-medium text-muted-foreground">조직 ID</label>
               <Input
                 placeholder="예: 12345"
                 value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleAdd}
                disabled={createProjectOrg.isPending || organizationId.trim().length === 0}
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
        <p className="text-sm text-destructive">조직 정보를 불러오지 못했습니다.</p>
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
                className="flex flex-col gap-3 rounded-md border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {organization?.orgName ?? `조직 ${projectOrg.organizationId}`}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {organization?.orgCode ?? `ID ${projectOrg.organizationId}`}
                    {organization?.levelType ? ` · ${organization.levelType}` : ''}
                    {projectOrg.memo ? ` · ${projectOrg.memo}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {ROLE_LABELS[projectOrg.roleCode] ?? projectOrg.roleCode}
                  </span>
                  {scopeLabel ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {scopeLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
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
