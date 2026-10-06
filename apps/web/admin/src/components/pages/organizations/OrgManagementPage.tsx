'use client';

import { SsooErrorNotice, showSsooErrorAlert } from '@ssoo/web-shell';
import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
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

export function OrgManagementPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<OrganizationItem | null>(null);
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

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  }, []);

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
    setForm((current) => ({ ...current, [key]: value }));
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
    {
      accessorKey: 'orgCode',
      header: '조직 코드',
      size: 140,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.orgCode}</span>,
    },
    { accessorKey: 'orgName', header: '조직명', size: 180 },
    {
      accessorKey: 'parent',
      header: '상위 조직',
      size: 180,
      cell: ({ row }) => row.original.parent?.orgName ?? '최상위',
    },
    {
      accessorKey: 'orgType',
      header: '유형',
      size: 110,
      cell: ({ row }) => ORG_TYPES.find((item) => item.value === row.original.orgType)?.label ?? row.original.orgType,
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
      header: '작업',
      size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="수정" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {row.original.isActive ? (
            <Button
              variant="ghost"
              size="icon"
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
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="재활성화"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: row.original.orgId, data: { isActive: true } })}
            >
              <RotateCcw className="h-3.5 w-3.5 text-ssoo-success" />
            </Button>
          )}
        </div>
      ),
    },
  ], [deactivateMutation, openEdit, updateMutation]);

  return (
    <>
      <SsooDataWorkspacePage
        breadcrumb={['admin', 'organizations']}
        toolbar={{
          actions: [{ label: '조직 추가', icon: <Plus className="h-4 w-4" />, onClick: openCreate }],
          filters: [{
            key: 'status',
            type: 'select',
            placeholder: '활성 조직',
            options: [
              { label: '활성 조직', value: 'active' },
              { label: '비활성 포함', value: 'all' },
            ],
            width: '160px',
          }],
          filterValues: { status: includeInactive ? 'all' : 'active' },
          onFilterValuesChange: (values) => setIncludeInactive(values.status === 'all'),
          collapsible: false,
        }}
        table={{
          columns,
          data: organizations,
          loading: listQuery.isLoading,
          error: listQuery.error,
          onRetry: () => listQuery.refetch(),
          emptyState: <div className="text-sm text-muted-foreground">등록된 실제 조직이 없습니다.</div>,
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '조직 수정' : '조직 추가'}</DialogTitle>
            <DialogDescription>공용 조직 마스터와 상하위 계층에 즉시 반영됩니다.</DialogDescription>
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
                    .filter((organization) => organization.orgId !== editing?.orgId)
                    .map((organization) => (
                      <option key={organization.orgId} value={organization.orgId}>
                        {organization.orgName} ({organization.orgCode})
                      </option>
                    ))}
                </NativeSelect>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                레벨 유형
                <Input value={form.levelType} onChange={(event) => updateField('levelType', event.target.value)} />
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
