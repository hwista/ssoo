'use client';
import { ProgramContext } from '../access/ProgramContext';
import { readProgramContext } from '../access/program-context';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { SsooErrorNotice, showSsooErrorAlert } from '@ssoo/web-shell';
import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { OrganizationRelationsPanel } from './OrganizationRelationsPanel';
import { SsooDataWorkspacePage, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Badge, NativeSelect } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateOrganization,
  useDeactivateOrganization,
  useOrganizationList,
  useUpdateOrganization,
} from '@/hooks/queries/useOrganizations';
import type {
  CreateOrganizationRequest,
  OrganizationItem,
  UpdateOrganizationRequest,
} from '@/lib/api/endpoints/organizations';

const ROOT_ORG_VALUE = '__root__';
const ORG_TYPES = [
  { value: 'company', label: '회사' },
  { value: 'division', label: '본부/부문' },
  { value: 'department', label: '부서' },
  { value: 'team', label: '팀' },
  { value: 'external', label: '외부 조직' },
] as const;

interface OrganizationForm {
  orgCode: string;
  orgName: string;
  orgType: string;
  scope: 'internal' | 'external';
  levelType: string;
  parentOrgId: string;
  memo: string;
}

const INITIAL_FORM: OrganizationForm = {
  orgCode: '',
  orgName: '',
  orgType: 'department',
  scope: 'internal',
  levelType: 'department',
  parentOrgId: ROOT_ORG_VALUE,
  memo: '',
};

export function OrgManagementPage({ path = '' }: { path?: string }) {
  const { organizationId } = readProgramContext(path);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(Boolean(organizationId));
  const [editing, setEditing] = useState<OrganizationItem | null>(null);
  const [membershipOrganization, setMembershipOrganization] = useState<OrganizationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OrganizationForm>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const listQuery = useOrganizationList(includeInactive);
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const deactivateMutation = useDeactivateOrganization();
  const organizations = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const activeOrganizations = useMemo(
    () => organizations.filter((organization) => organization.isActive),
    [organizations],
  );

  const organizationPaths = useMemo(() => {
    const byId = new Map(organizations.map((organization) => [organization.orgId, organization]));
    return new Map(organizations.map((organization) => {
      const names: string[] = [];
      const visited = new Set<string>();
      let current: OrganizationItem | undefined = organization;
      while (current && !visited.has(current.orgId)) {
        visited.add(current.orgId); names.unshift(current.orgName);
        current = current.parentOrgId ? byId.get(current.parentOrgId) : undefined;
      }
      return [organization.orgId, `${names.join(' › ')} (${organization.orgCode})`];
    }));
  }, [organizations]);

  const openCreate = useCallback((parent?: OrganizationItem) => {
    setEditing(null);
    const type = activeOrganizations.some((organization) => organization.orgType === 'company') ? 'team' : 'company';
    setForm({ ...INITIAL_FORM, orgType: parent ? 'team' : type, levelType: parent ? 'team' : type, parentOrgId: parent?.orgId ?? ROOT_ORG_VALUE });
    setFormError(null);
    setDialogOpen(true);
  }, [activeOrganizations]);

  const openEdit = useCallback((organization: OrganizationItem) => {
    setEditing(organization);
    setForm({
      orgCode: organization.orgCode,
      orgName: organization.orgName,
      orgType: organization.orgType,
      scope: organization.scope === 'external' ? 'external' : 'internal',
      levelType: organization.levelType ?? '',
      parentOrgId: organization.parentOrgId ?? ROOT_ORG_VALUE,
      memo: organization.memo ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const updateField = useCallback(<K extends keyof OrganizationForm>(key: K, value: OrganizationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value,
      ...(key === 'orgType' && (!current.levelType || current.levelType === current.orgType) ? { levelType: value } : {}),
    }));
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.orgCode.trim() || !form.orgName.trim()) {
      setFormError('조직 코드와 조직명은 필수입니다.');
      return;
    }
    const common = {
      orgName: form.orgName.trim(),
      orgType: form.orgType,
      scope: form.scope,
      levelType: form.levelType.trim() || undefined,
      parentOrgId: form.parentOrgId === ROOT_ORG_VALUE ? null : form.parentOrgId,
      memo: form.memo.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.orgId, data: common as UpdateOrganizationRequest });
      } else {
        await createMutation.mutateAsync({
          ...common,
          orgCode: form.orgCode.trim(),
        } as CreateOrganizationRequest);
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '조직 저장에 실패했습니다.');
    }
  }, [createMutation, editing, form, updateMutation]);

  const columns = useMemo<SsooDataGridColumnDef<OrganizationItem>[]>(() => [
    { accessorKey: 'orgName', header: '조직 · 관리 작업', size: 240, cell: ({ row }) => <div className="space-y-2 py-1"><p className="font-medium">{row.original.orgName}</p><p className="text-xs text-muted-foreground">{organizationPaths.get(row.original.orgId)}</p><Button variant="outline" size="sm" title="조직 연결 정보" aria-label="조직 연결 정보" onClick={() => setMembershipOrganization(row.original)}><Users className="h-3.5 w-3.5" />연결 정보</Button>{row.original.isActive && <Button variant="outline" size="sm" onClick={() => openCreate(row.original)}>하위 조직 추가</Button>}</div> },
    {
      accessorKey: 'orgCode',
      header: '조직 코드',
      size: 140,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.orgCode}</span>,
    },

    {
      accessorKey: 'parent',
      header: '상위 조직',
      size: 180,
      cell: ({ row }) => (row.original.parentOrgId ? organizationPaths.get(row.original.parentOrgId) : null) ?? '최상위',
    },
    {
      accessorKey: 'orgType',
      header: '유형',
      size: 110,
      cell: ({ row }) => ORG_TYPES.find((item) => item.value === row.original.orgType)?.label ?? ({ internal: '내부 조직', external: '외부 조직' }[row.original.orgType] ?? row.original.orgType),
    },
    {
      accessorKey: 'activeMemberCount',
      header: '소속',
      size: 80,
      cell: ({ row }) => `${row.original.activeMemberCount}명`,
    },
    {
      accessorKey: 'activeChildCount',
      header: '하위',
      size: 80,
      cell: ({ row }) => `${row.original.activeChildCount}개`,
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 90,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.isActive ? '활성' : '비활성'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '정보·상태 변경',
      size: 150,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">

          <Button variant="outline" size="sm" title="수정" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />정보 수정
          </Button>
          {row.original.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              title="비활성화"
              disabled={deactivateMutation.isPending}
              onClick={async () => {
                if (!window.confirm(`${row.original.orgName} 조직을 비활성화하시겠습니까?`)) return;
                try {
                  await deactivateMutation.mutateAsync(row.original.orgId);
                } catch (error) {
                  showSsooErrorAlert(error instanceof Error ? error.message : '조직 비활성화에 실패했습니다.');
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />비활성화
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              title="재활성화"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: row.original.orgId, data: { isActive: true } })}
            >
              <RotateCcw className="h-3.5 w-3.5 text-ssoo-success" />재활성화
            </Button>
          )}
          {!dialogOpen && updateMutation.isError && updateMutation.variables?.id === row.original.orgId && <SsooErrorNotice compact className="basis-full" error={updateMutation.error} />}
        </div>
      ),
    },
  ], [deactivateMutation, dialogOpen, openCreate, openEdit, organizationPaths, updateMutation]);

  return (
    <>
      <SsooDataWorkspacePage compact
        breadcrumbItems={getAdminBreadcrumb('/organizations')}
        title="회사·조직 관리"
        description="회사는 최상위 조직으로, 팀은 소속 회사를 상위 조직으로 지정합니다. 연결 정보에서 영향 범위를 확인하고 소속·이용권·권한 담당 프로그램으로 이동합니다."
        toolbar={{
          actions: [{ label: '조직 추가', icon: <Plus className="h-4 w-4" />, onClick: () => openCreate() }],
          filters: [{ key: 'search', type: 'text', id: 'admin-org-filter-input', name: 'admin-org-filter-query', ariaLabel: '조직 이름·코드 검색', placeholder: '조직 이름·코드·상위 경로', width: '280px' }, {
            key: 'status',
            type: 'select',
            placeholder: '활성 조직',
            options: [
              { label: '활성 조직', value: 'active' },
              { label: '비활성 포함', value: 'all' },
            ],
            width: '160px',
          }],
          filterValues: { search, status: includeInactive ? 'all' : 'active' },
          onFilterValuesChange: (values) => { setIncludeInactive(values.status === 'all'); setSearch(String(values.search ?? '')); },
          collapsible: false,
        }}
        statusSlot={organizationId ? <ProgramContext context={{ organizationId }} basePath="/organizations" /> : undefined}
        table={{
          fitViewport: true, mobileSummaryColumns: ['orgName', 'parent', 'isActive', 'actions'],
          columns,
          data: organizations.filter(org => (!organizationId || org.orgId === organizationId) && (organizationPaths.get(org.orgId) ?? '').toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => (organizationPaths.get(a.orgId) ?? '').localeCompare(organizationPaths.get(b.orgId) ?? '', 'ko')),
          loading: listQuery.isLoading,
          error: listQuery.error,
          onRetry: () => listQuery.refetch(),
          emptyState: <div className="text-sm text-muted-foreground">등록된 실제 조직이 없습니다.</div>,
        }}
      />

      <Dialog open={Boolean(membershipOrganization)} onOpenChange={(open) => { if (!open) setMembershipOrganization(null); }}><DialogContent className="max-h-[90dvh] grid-cols-1 overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>조직 연결 정보</DialogTitle><DialogDescription>{membershipOrganization?.orgName} · {membershipOrganization?.orgCode}</DialogDescription></DialogHeader>{membershipOrganization ? <OrganizationRelationsPanel key={membershipOrganization.orgId} organizationId={membershipOrganization.orgId} onNavigate={() => setMembershipOrganization(null)} /> : null}</DialogContent></Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '조직 수정' : '조직 추가'}</DialogTitle>
            <DialogDescription>회사와 팀을 등록합니다. 조직 코드는 이름이 같은 조직을 구분하는 고유값이며, 등록 후 변경할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                조직 코드
                <Input
                  value={form.orgCode}
                  disabled={Boolean(editing)}
                  onChange={(event) => updateField('orgCode', event.target.value)}
                  placeholder="PLATFORM-DEV"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                조직명
                <Input value={form.orgName} onChange={(event) => updateField('orgName', event.target.value)} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                조직 유형
                <NativeSelect value={form.orgType} onChange={(event) => updateField('orgType', event.target.value)}>
                  {ORG_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </NativeSelect>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                범위
                <NativeSelect
                  value={form.scope}
                  onChange={(event) => updateField('scope', event.target.value as OrganizationForm['scope'])}
                >
                  <option value="internal">내부</option>
                  <option value="external">외부</option>
                </NativeSelect>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                상위 조직
                <NativeSelect value={form.parentOrgId} onChange={(event) => updateField('parentOrgId', event.target.value)}>
                  <option value={ROOT_ORG_VALUE}>최상위</option>
                  {activeOrganizations
                    .filter((organization) => {
                      const visited = new Set<string>();
                      let current: OrganizationItem | undefined = organization;
                      while (current && !visited.has(current.orgId)) {
                        if (current.orgId === editing?.orgId) return false;
                        visited.add(current.orgId);
                        current = organizations.find(item => item.orgId === current?.parentOrgId);
                      }
                      return true;
                    })
                    .map((organization) => (
                      <option key={organization.orgId} value={organization.orgId}>
                        {organizationPaths.get(organization.orgId)}
                      </option>
                    ))}
                </NativeSelect>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                조직 분류 코드 (선택)
                <Input value={form.levelType} onChange={(event) => updateField('levelType', event.target.value)} /><span className="text-xs font-normal text-muted-foreground">조직 유형에 따라 자동 입력됩니다. 별도 운영 기준이 없다면 그대로 두세요.</span>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              운영 메모
              <Input value={form.memo} onChange={(event) => updateField('memo', event.target.value)} />
            </label>
          </div>
          {formError && <SsooErrorNotice as="p" compact error={formError} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={() => void handleSubmit()} disabled={createMutation.isPending || updateMutation.isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
