'use client';

import { programPath } from '../access/program-context';
import { resolveCommonSearchResultHref } from '@ssoo/web-auth';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { SsooErrorNotice, SsooDataWorkspacePage, SsooDataGrid, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, Textarea } from '@ssoo/web-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCodeGroups,
  useCodeUsage,
  useCodesByGroup,
  useCreateCode,
  useDeactivateCode,
  useRemoveCodePermanently,
  useUpdateCode,
} from '@/hooks/queries/useCodes';
import { OperationHistoryButton } from '../access/OperationHistoryButton';
import type { CodeItem } from '@/lib/api/endpoints/codes';

const SOURCE_CODE_GROUPS = [
  { value: 'biz_type', label: '사업구분' },
  { value: 'group_type', label: '계열구분' },
  { value: 'payment_term', label: '수금조건' },
] as const;

const PLATFORM_CODE_LABELS: Record<string, string> = {
  USER_TYPE: '사용자 유형',
  USER_STATUS: '사용자 상태',
  USER_ROLE: '사용자 역할',
  USER_DEPARTMENT: '사용자 부서',
  USER_POSITION: '직급·직책',
  UNIT: '단위',
};

interface CodeForm {
  codeGroup: string;
  codeValue: string;
  displayNameKo: string;
  sortOrder: string;
}

function emptyForm(codeGroup: string): CodeForm {
  return { codeGroup, codeValue: '', displayNameKo: '', sortOrder: '0' };
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
    return response?.data?.error?.message ?? response?.data?.message ?? '요청 처리에 실패했습니다.';
  }
  return error instanceof Error ? error.message : '요청 처리에 실패했습니다.';
}

interface CodeManagementPageProps {
  path?: string;
}

export function CodeManagementPage({ path }: CodeManagementPageProps) {
  const searchParams = useSearchParams();
  const sourceCompatible = searchParams.get('mode') === 'source-compatible'
    || new URLSearchParams(path?.split('?')[1] ?? '').get('mode') === 'source-compatible';
  const [selectedGroup, setSelectedGroup] = useState(() => new URLSearchParams(path?.split('?')[1]).get('codeGroup') || (sourceCompatible ? 'all' : 'USER_ROLE'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(() => new URLSearchParams(path?.split('?')[1]).has('codeGroup') ? 'all' : 'active');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<{ item: CodeItem; kind: 'toggle' | 'remove' } | null>(null);
  const [usageCode, setUsageCode] = useState<CodeItem | null>(null);
  const usage = useCodeUsage(usageCode?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CodeItem | null>(null);
  const [form, setForm] = useState<CodeForm>(() => emptyForm(selectedGroup));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupsQuery = useCodeGroups();
  const codesQuery = useCodesByGroup(selectedGroup === 'all' ? '' : selectedGroup);
  const businessTypeQuery = useCodesByGroup(sourceCompatible ? 'biz_type' : '');
  const groupTypeQuery = useCodesByGroup(sourceCompatible ? 'group_type' : '');
  const paymentTermQuery = useCodesByGroup(sourceCompatible ? 'payment_term' : '');
  const createMutation = useCreateCode();
  const updateMutation = useUpdateCode();
  const deactivateMutation = useDeactivateCode();
  const removeMutation = useRemoveCodePermanently();

  const groups = useMemo(() => {
    const labels = new Map<string, string>(SOURCE_CODE_GROUPS.map((item) => [item.value, item.label]));
    for (const group of groupsQuery.data?.data ?? []) {
      if (!labels.has(group.codeGroup)) labels.set(group.codeGroup, PLATFORM_CODE_LABELS[group.codeGroup] ?? group.codeGroup);
    }
    return Array.from(labels, ([value, label]) => ({ value, label }));
  }, [groupsQuery.data]);

  const sourceCodes = useMemo(() => [
    ...(businessTypeQuery.data?.data ?? []),
    ...(groupTypeQuery.data?.data ?? []),
    ...(paymentTermQuery.data?.data ?? []),
  ].sort((left, right) => left.codeGroup.localeCompare(right.codeGroup) || left.sortOrder - right.sortOrder || left.codeValue.localeCompare(right.codeValue)), [businessTypeQuery.data, groupTypeQuery.data, paymentTermQuery.data]);

  const codes = useMemo(() => {
    const source = sourceCompatible && selectedGroup === 'all'
      ? sourceCodes
      : codesQuery.data?.data ?? [];
    return source.filter((item) => (
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? item.isActive
          : !item.isActive
    ));
  }, [codesQuery.data, selectedGroup, sourceCodes, sourceCompatible, statusFilter]);

  const codesLoading = sourceCompatible && selectedGroup === 'all'
    ? businessTypeQuery.isLoading || groupTypeQuery.isLoading || paymentTermQuery.isLoading
    : codesQuery.isLoading;

  const activeQueries = sourceCompatible && selectedGroup === 'all'
    ? [businessTypeQuery, groupTypeQuery, paymentTermQuery] : [codesQuery];
  const loadError = groupsQuery.error ?? activeQueries.find((query) => query.error)?.error;
  const fetching = groupsQuery.isFetching || activeQueries.some((query) => query.isFetching);

  const pending = createMutation.isPending
    || updateMutation.isPending
    || deactivateMutation.isPending
    || removeMutation.isPending;
  const groupOwner = groupsQuery.data?.data?.find(group => group.codeGroup === selectedGroup)?.owner;
  const editable = groupOwner === 'platform';
  const blocked = pending || fetching || Boolean(loadError) || !editable;

  const openCreate = () => {
    if (blocked) return;
    setNotice(null);
    setReason('');
    setEditing(null);
    setForm(emptyForm(selectedGroup === 'all' ? 'payment_term' : selectedGroup));
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: CodeItem) => {
    if (blocked) return;
    setNotice(null);
    setReason('');
    setEditing(item);
    setForm({
      codeGroup: item.codeGroup,
      codeValue: item.codeValue,
      displayNameKo: item.displayNameKo,
      sortOrder: String(item.sortOrder),
    });
    setError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    if (blocked) return;
    setNotice(null);
    if (!reason.trim()) { setError('변경 사유를 입력해 주세요.'); return; }
    const codeGroup = form.codeGroup.trim();
    const codeValue = form.codeValue.trim();
    const displayNameKo = form.displayNameKo.trim();
    const sortOrder = Number(form.sortOrder);
    if (!groupsQuery.data?.data?.some(group => group.codeGroup === codeGroup && group.owner === 'platform') && !codeGroup.startsWith('USER_') && codeGroup !== 'UNIT') { setError('플랫폼 소유 코드 그룹을 선택하세요.'); return; }
    if (!codeGroup || !codeValue || !displayNameKo) {
      setError('코드 유형, 코드값, 코드명은 필수입니다.');
      return;
    }
    if (!form.sortOrder.trim() || !Number.isSafeInteger(sortOrder) || sortOrder < -2147483648 || sortOrder > 2147483647) {
      setError('정렬 순서는 정수여야 합니다.');
      return;
    }

    try {
      setError(null);
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { codeGroup, codeValue, displayNameKo, sortOrder, reason: reason.trim(), expectedUpdatedAt: editing.updatedAt },
        });
        setNotice('코드가 수정되었습니다.');
      } else {
        await createMutation.mutateAsync({ codeGroup, codeValue, displayNameKo, sortOrder, reason: reason.trim() });
        setNotice('코드가 추가되었습니다.');
      }
      setSelectedGroup(codeGroup);
      setDialogOpen(false);
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  };

  const toggleActive = async (item: CodeItem) => {
    if (blocked) return;
    setNotice(null);
    try {
      setError(null);
      if (item.isActive) {
        await deactivateMutation.mutateAsync({ id: item.id, data: { reason: reason.trim(), expectedUpdatedAt: item.updatedAt } });
      } else {
        await updateMutation.mutateAsync({ id: item.id, data: { isActive: true, reason: reason.trim(), expectedUpdatedAt: item.updatedAt } });
      }
      setAction(null);
      setNotice(`코드가 ${item.isActive ? '비활성화' : '활성화'}되었습니다.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  };

  const remove = async (item: CodeItem) => {
    if (blocked) return;
    setNotice(null);
    if (item.isActive) {
      setError('활성 코드는 먼저 비활성화해야 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`“${item.displayNameKo}” 코드를 영구 삭제하시겠습니까?`)) return;
    try {
      setError(null);
      await removeMutation.mutateAsync({ id: item.id, data: { reason: reason.trim(), expectedUpdatedAt: item.updatedAt } });
      setAction(null);
      setNotice('코드가 삭제되었습니다.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  };

  const refreshCodes = () => {
    void groupsQuery.refetch();
    if (sourceCompatible && selectedGroup === 'all') {
      void Promise.all([
        businessTypeQuery.refetch(),
        groupTypeQuery.refetch(),
        paymentTermQuery.refetch(),
      ]);
      return;
    }
    void codesQuery.refetch();
  };

  const columns: SsooDataGridColumnDef<CodeItem>[] = [
    { id: 'group', header: sourceCompatible ? '코드유형' : '유형', size: 160, cell: ({ row: { original: item } }) => groups.find(group => group.value === item.codeGroup)?.label ?? item.codeGroup },
    { accessorKey: 'codeValue', header: '코드값', size: 140 },
    { accessorKey: 'displayNameKo', header: '코드명', size: 180 },
    { accessorKey: 'sortOrder', header: sourceCompatible ? '순서' : '정렬', size: 70 },
    { id: 'status', header: '상태', size: 90, cell: ({ row: { original: item } }) => item.isActive ? '활성' : '비활성' },
    { id: 'actions', header: sourceCompatible ? '작업' : '관리', size: 350, cell: ({ row: { original: item } }) => <div className="flex flex-wrap gap-2" data-testid={`code-row-${item.codeValue}`}>
      <Button size="sm" variant="outline" onClick={() => setUsageCode(item)}>참조·이력</Button>
      {editable && <><Button size="sm" variant="outline" onClick={() => openEdit(item)} disabled={blocked}><Pencil className="h-3.5 w-3.5" />수정</Button>
      <Button size="sm" variant="outline" onClick={() => { setError(null); setReason(''); setAction({ item, kind: 'toggle' }); }} disabled={blocked}>{item.isActive ? '비활성화' : '활성화'}</Button>
      <Button size="sm" variant="outline" onClick={() => { setError(null); setReason(''); setAction({ item, kind: 'remove' }); }} disabled={blocked}><Trash2 className="h-3.5 w-3.5" />삭제</Button></>}
    </div> },
  ];
  return <>
    <SsooDataWorkspacePage compact title={sourceCompatible ? '코드 관리' : '공통코드 관리'} description={sourceCompatible ? '수금조건 등 시스템 코드를 관리합니다.' : '플랫폼 공통 코드를 관리합니다. 앱 소유 코드는 조회 후 담당 앱에서 변경합니다.'}
      breadcrumbItems={getAdminBreadcrumb('/codes')}
      toolbar={{ filterSummary: `${selectedGroup === 'all' ? '전체 코드유형' : groups.find(group => group.value === selectedGroup)?.label ?? selectedGroup} · ${statusFilter === 'all' ? '전체 상태' : statusFilter === 'active' ? '활성' : '비활성'}`, actions: [
        ...(!sourceCompatible ? [{ label: '새로고침', variant: 'outline' as const, icon: <RefreshCw className="h-4 w-4" />, onClick: refreshCodes, disabled: fetching }] : []),
        ...(editable ? [{ label: '코드 추가', icon: <Plus className="h-4 w-4" />, onClick: openCreate, disabled: blocked }] : []),
      ], filterSlot: (
      <section className="grid w-full gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm font-medium">
          <label htmlFor={sourceCompatible ? 'code-filter-type' : 'code-group-filter'}>코드 유형</label>
          <NativeSelect
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
            id={sourceCompatible ? 'code-filter-type' : 'code-group-filter'}
            data-testid="code-group-filter"
          >
            {sourceCompatible ? <option value="all">전체 코드유형</option> : null}
            {groups.map((group) => <option key={group.value} value={group.value}>{group.label}{groupsQuery.data?.data?.find(item => item.codeGroup === group.value)?.owner === 'platform' ? '' : ' · 앱 코드'}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5 text-sm font-medium">
          <label htmlFor={sourceCompatible ? 'code-filter-status' : 'code-status-filter'}>상태</label>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            id={sourceCompatible ? 'code-filter-status' : 'code-status-filter'}
            data-testid="code-status-filter"
          >
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </NativeSelect>
        </div>
      </section>
      ) }}
      statusSlot={<>
        {sourceCompatible ? <p className="text-sm text-ssoo-warning">☆ 관리자 전용 페이지입니다. 코드 변경 사항은 즉시 적용됩니다.</p> : null}
<div className="flex flex-wrap items-center gap-3 text-sm"><span>{editable ? '플랫폼 공통 코드' : '앱 소유 코드 · 조회 전용'}</span>{(groupOwner === 'crm' || selectedGroup === 'all') && <a className="underline" href={resolveCommonSearchResultHref({ sourceApp: 'crm', target: { sourceApp: 'crm', path: programPath('/operations/settings?view=codes', { codeGroup: selectedGroup === 'all' ? undefined : selectedGroup }) } }) || undefined}>CRM 업무 코드 관리 ↗</a>}{groupOwner === 'pms' && <a className="underline" href={resolveCommonSearchResultHref({ sourceApp: 'pms', target: { sourceApp: 'pms', path: '/admin/code' } }) || undefined}>PMS 코드 관리 ↗</a>}{groupOwner === 'unclassified' && <span>소유 앱 확인 필요</span>}</div>
      {loadError ? <SsooErrorNotice error={loadError} actions={[{ label: '다시 조회', onClick: refreshCodes, disabled: fetching }]} /> : null}
      {notice ? <p className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg p-3 text-sm text-ssoo-success">{notice}</p> : null}
      {error ? <SsooErrorNotice as="p" compact className="p-3" error={error} /> : null}

      </>}
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="admin-code-management" data-source-surface={sourceCompatible ? 'codes' : undefined}>
        <SsooDataGrid columns={columns} data={codes} loading={codesLoading} fitViewport mobileSummaryColumns={['displayNameKo', 'codeValue', 'status', 'actions']} enableSorting={false} emptyState="코드가 없습니다." />
        <p className="shrink-0 px-4 py-3 text-xs text-muted-foreground">{codes.length}건 표시 중</p>
      </div>
    </SsooDataWorkspacePage>
      <Dialog open={!!usageCode} onOpenChange={open => { if (!open) setUsageCode(null); }}>
        <DialogContent className="grid-cols-1"><DialogHeader><DialogTitle>코드 참조·이력</DialogTitle><DialogDescription>{usageCode?.codeGroup} · {usageCode?.codeValue} · {usageCode?.displayNameKo}</DialogDescription></DialogHeader>
          {usage.isError ? <SsooErrorNotice error={usage.error} actions={[{ label: '참조 다시 조회', onClick: () => usage.refetch() }]} /> : !usage.data ? <p role="status">참조를 확인하는 중...</p> : <div className="min-w-0 space-y-3 text-sm"><p>소유 범위: {usage.data.owner} · 확인한 직접 참조 {usage.data.total}건</p>{usage.data.references.map(reference => <p key={reference.name}>{reference.name}: {reference.count}건</p>)}<p className="text-muted-foreground">{usage.data.coverage}</p><p>참조 중인 코드의 유형·값 변경, 비활성화와 영구 삭제는 제한됩니다. 표시명과 정렬은 수정할 수 있습니다.</p></div>}
          {usageCode && <OperationHistoryButton filter={{ category: 'code', subjectId: usageCode.id }} onNavigate={() => setUsageCode(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!action} onOpenChange={open => { if (!open && !pending) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>코드 상태 변경</DialogTitle><DialogDescription>{action?.item.displayNameKo} · {action?.kind === 'remove' ? '영구 삭제' : action?.item.isActive ? '비활성화' : '활성화'}</DialogDescription></DialogHeader><label className="grid gap-2 text-sm">코드 상태 변경 사유<Textarea maxLength={2000} value={reason} disabled={pending} onChange={event => setReason(event.target.value)} /></label>{error && <SsooErrorNotice error={error} />}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => setAction(null)}>취소</Button><Button disabled={blocked || !reason.trim()} onClick={() => { if (action) void (action.kind === 'remove' ? remove(action.item) : toggleActive(action.item)); }}>변경 적용</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!pending) setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '코드 수정' : '코드 추가'}</DialogTitle>
            <DialogDescription>코드 유형과 값의 조합은 중복될 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-1.5 text-sm font-medium">코드 유형<Input disabled={pending} value={form.codeGroup} onChange={(event) => setForm((current) => ({ ...current, codeGroup: event.target.value }))} data-testid="code-form-group" /></label>
            <label className="grid gap-1.5 text-sm font-medium">코드값<Input disabled={pending} value={form.codeValue} onChange={(event) => setForm((current) => ({ ...current, codeValue: event.target.value }))} data-testid="code-form-value" /></label>
            <label className="grid gap-1.5 text-sm font-medium">코드명<Input disabled={pending} value={form.displayNameKo} onChange={(event) => setForm((current) => ({ ...current, displayNameKo: event.target.value }))} data-testid="code-form-name" /></label>
            <label className="grid gap-1.5 text-sm font-medium">정렬 순서<Input type="number" disabled={pending} value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} data-testid="code-form-sort" /></label>
            <label className="grid gap-1.5 text-sm font-medium">코드 변경 사유<Textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} disabled={pending} /></label>
            {error ? <SsooErrorNotice as="p" compact error={error} /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={() => void save()} disabled={blocked || !reason.trim()} data-testid="code-form-save">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
}

export default CodeManagementPage;
