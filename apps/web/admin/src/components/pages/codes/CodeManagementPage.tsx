'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NativeSelect } from '@ssoo/web-ui';
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
  useCodesByGroup,
  useCreateCode,
  useDeactivateCode,
  useRemoveCodePermanently,
  useUpdateCode,
} from '@/hooks/queries/useCodes';
import type { CodeItem } from '@/lib/api/endpoints/codes';

const SOURCE_CODE_GROUPS = [
  { value: 'biz_type', label: '사업구분' },
  { value: 'group_type', label: '계열구분' },
  { value: 'payment_term', label: '수금조건' },
] as const;

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
  const [selectedGroup, setSelectedGroup] = useState(() => sourceCompatible ? 'all' : 'payment_term');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
      if (!labels.has(group.codeGroup)) labels.set(group.codeGroup, group.codeGroup);
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
  const blocked = pending || fetching || Boolean(loadError);

  const openCreate = () => {
    if (blocked) return;
    setNotice(null);
    setEditing(null);
    setForm(emptyForm(selectedGroup === 'all' ? 'payment_term' : selectedGroup));
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: CodeItem) => {
    if (blocked) return;
    setNotice(null);
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
    const codeGroup = form.codeGroup.trim();
    const codeValue = form.codeValue.trim();
    const displayNameKo = form.displayNameKo.trim();
    const sortOrder = Number(form.sortOrder);
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
          data: { codeGroup, codeValue, displayNameKo, sortOrder },
        });
        setNotice('코드가 수정되었습니다.');
      } else {
        await createMutation.mutateAsync({ codeGroup, codeValue, displayNameKo, sortOrder });
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
        await deactivateMutation.mutateAsync(item.id);
      } else {
        await updateMutation.mutateAsync({ id: item.id, data: { isActive: true } });
      }
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
      await removeMutation.mutateAsync(item.id);
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

  return (
    <main
      className="flex min-h-full flex-col gap-5 bg-muted/20 p-4 sm:p-6"
      data-testid="admin-code-management"
      data-source-surface={sourceCompatible ? 'codes' : undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{sourceCompatible ? '코드 관리' : '공통코드 관리'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sourceCompatible ? '수금조건 등 시스템 코드를 관리합니다.' : 'CRM의 수금조건·사업구분·계열구분과 플랫폼 공통 코드를 관리합니다.'}</p>
        </div>
        <div className="flex gap-2">
          {!sourceCompatible ? (
            <Button variant="outline" onClick={refreshCodes} disabled={fetching}>
              <RefreshCw className="mr-2 h-4 w-4" />새로고침
            </Button>
          ) : null}
          <Button onClick={openCreate} disabled={blocked}>{sourceCompatible ? '+ 코드 추가' : <><Plus className="mr-2 h-4 w-4" />코드 추가</>}</Button>
        </div>
      </header>

      {sourceCompatible ? (
        <p className="rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
          ☆ &nbsp;관리자 전용 페이지입니다. 코드 변경 사항은 즉시 적용됩니다.
        </p>
      ) : null}

      <section className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm font-medium">
          <label htmlFor={sourceCompatible ? 'code-filter-type' : 'code-group-filter'}>코드 유형</label>
          <NativeSelect
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
            id={sourceCompatible ? 'code-filter-type' : 'code-group-filter'}
            data-testid="code-group-filter"
          >
            {sourceCompatible ? <option value="all">전체 코드유형</option> : null}
            {groups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5 text-sm font-medium">
          <label htmlFor={sourceCompatible ? 'code-filter-status' : 'code-status-filter'}>상태</label>
          <NativeSelect
            className="h-10 rounded-md border bg-background px-3 text-sm"
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

      {loadError ? <SsooErrorNotice error={loadError} actions={[{ label: '다시 조회', onClick: refreshCodes, disabled: fetching }]} /> : null}
      {notice ? <p className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg p-3 text-sm text-ssoo-success">{notice}</p> : null}
      {error ? <SsooErrorNotice as="p" compact className="p-3" error={error} /> : null}

      <section className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[780px] text-sm">
            <TableHeader className="bg-muted/60 text-left text-xs text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 py-3">{sourceCompatible ? '코드유형' : '유형'}</TableHead>
                <TableHead className="px-4 py-3">코드값</TableHead>
                <TableHead className="px-4 py-3">코드명</TableHead>
                <TableHead className="px-4 py-3 text-center">{sourceCompatible ? '순서' : '정렬'}</TableHead>
                <TableHead className="px-4 py-3 text-center">상태</TableHead>
                <TableHead className="px-4 py-3 text-right">{sourceCompatible ? '작업' : '관리'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {codesLoading ? (
                <TableRow><TableCell colSpan={6} className="px-4 py-10 text-center text-muted-foreground">코드를 불러오는 중입니다.</TableCell></TableRow>
              ) : codes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="px-4 py-10 text-center text-muted-foreground">코드가 없습니다.</TableCell></TableRow>
              ) : codes.map((item) => (
                <TableRow key={item.id} data-testid={`code-row-${item.codeValue}`}>
                  <TableCell className="px-4 py-3">{groups.find((group) => group.value === item.codeGroup)?.label ?? item.codeGroup}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs">{item.codeValue}</TableCell>
                  <TableCell className="px-4 py-3 font-medium">{item.displayNameKo}</TableCell>
                  <TableCell className="px-4 py-3 text-center">{item.sortOrder}</TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <span className={item.isActive ? 'text-ssoo-success' : 'text-muted-foreground'}>{item.isActive ? '활성' : '비활성'}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)} disabled={blocked}><Pencil className="mr-1 h-3.5 w-3.5" />수정</Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleActive(item)} disabled={blocked}>
                        {item.isActive ? '비활성화' : '활성화'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void remove(item)} disabled={blocked || item.isActive}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <footer className="border-t px-4 py-3 text-xs text-muted-foreground">{codes.length}건 표시 중</footer>
      </section>

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
            {error ? <SsooErrorNotice as="p" compact error={error} /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={() => void save()} disabled={blocked} data-testid="code-form-save">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default CodeManagementPage;
