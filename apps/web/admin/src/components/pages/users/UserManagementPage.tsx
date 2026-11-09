'use client';
import { ACCOUNT_STATUS_LABELS } from '../access/operating-labels';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { ProgramContext } from '../access/ProgramContext';
import { programPath } from '../access/program-context';
import { getAdminBreadcrumb } from '@/components/layout/navigation';


import { SsooErrorNotice, showSsooErrorAlert } from '@ssoo/web-shell';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { KeyRound, LockOpen, LogOut, Plus } from 'lucide-react';
import { UserParticipationDialog } from '@/components/pages/access/UserParticipationDialog';
import { OperationHistoryButton } from '@/components/pages/access/OperationHistoryButton';
import {
  SsooDataWorkspacePage,
  SsooWorkspacePage,
  SsooSearchInput,
  type SsooDataGridColumnDef,
  type SsooDataWorkspaceFilterValues,
} from '@ssoo/web-shell';
import { useTabStore } from '@/stores/tab.store';
import { useAuthStore } from '@/stores/auth.store';
import { NativeSelect } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useUserList,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
} from '@/hooks/queries/useUsers';
import {
  useRequestUserPasswordReset,
  useRevokeUserSessions,
  useUnlockUserAccount,
  useUserAccountOperations,
} from '@/hooks/queries/useAuthAdmin';
import type {
  UserItem,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/lib/api/endpoints/users';

const ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'manager', label: '매니저' },
  { value: 'user', label: '사용자' },
  { value: 'viewer', label: '조회자' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  user: '사용자',
  viewer: '조회자',
};

const PRIMARY_AFFILIATION_OPTIONS = [
  { value: 'internal', label: '내부' },
  { value: 'external', label: '외부' },
] as const;

const EMPTY_SELECT_VALUE = '__none__';

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UserParticipation({ user }: { user: UserItem }) {
  return <div className="space-y-1 text-xs">
    <p>{user.platformStatus === 'active' ? '플랫폼 참여 승인됨' : user.platformStatus === 'suspended' ? '플랫폼 참여 정지' : '소속 승인 대기'}</p>
    <p className="whitespace-normal text-muted-foreground">{user.approvedOrganizations?.length ? user.approvedOrganizations.join(', ') : '승인된 소속 없음'}</p>
  </div>;
}

interface UserFormData {
  loginId: string;
  password: string;
  userName: string;
  displayName: string;
  email: string;
  phone: string;
  roleCode: string;
  departmentCode: string;
  positionCode: string;
  employeeNumber: string;
  companyName: string;
  customerId: string;
  primaryAffiliationType: string;
}

const INITIAL_FORM: UserFormData = {
  loginId: '',
  password: '',
  userName: '',
  displayName: '',
  email: '',
  phone: '',
  roleCode: 'user',
  departmentCode: '',
  positionCode: '',
  employeeNumber: '',
  companyName: '',
  customerId: '',
  primaryAffiliationType: 'internal',
};

interface UserManagementPageProps {
  path?: string;
  mode?: 'users' | 'accounts';
}

export function UserManagementPage({ path, mode = 'users' }: UserManagementPageProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const openTab = useTabStore(state => state.openTab);
  const activeTabPath = useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.path);
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const submitPending = useRef(false);
  const createIntentHandled = useRef(false);
  const accountIntentHandled = useRef('');
  const pathParams = useMemo(() => new URLSearchParams(path?.split('?')[1] ?? ''), [path]);
  const sourceCompatible = searchParams.get('mode') === 'source-compatible'
    || pathParams.get('mode') === 'source-compatible';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(mode === 'users' && !pathParams.get('search') && !pathParams.get('userId') ? 'active' : 'all');
  const [filterValues, setFilterValues] = useState<SsooDataWorkspaceFilterValues>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [operationsUser, setOperationsUser] = useState<UserItem | null>(null);
  const [participationUser, setParticipationUser] = useState<UserItem | null>(null);
  const [operationsMessage, setOperationsMessage] = useState<string | null>(null);
  const [operationsError, setOperationsError] = useState<string | null>(null);

  const limit = 20;
  const { data: response, isLoading, isFetching, error: listError, refetch } = useUserList({
    userId: /^\d+$/.test(pathParams.get('userId') ?? '') ? pathParams.get('userId')! : undefined,
    page: sourceCompatible ? 1 : page,
    limit: sourceCompatible ? 100 : limit,
    search: sourceCompatible ? undefined : search || undefined,
    roleCode: sourceCompatible ? undefined : roleFilter || undefined,
    isActive: sourceCompatible || statusFilter === 'all' ? undefined : statusFilter === 'active',
  }, sourceCompatible);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const accountQuery = useUserAccountOperations(operationsUser?.id ?? null);
  const revokeSessionsMutation = useRevokeUserSessions();
  const unlockMutation = useUnlockUserAccount();
  const passwordResetMutation = useRequestUserPasswordReset();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationBusy = isSaving || deactivateMutation.isPending || reactivateMutation.isPending || passwordResetMutation.isPending;
  const blocked = isFetching || Boolean(listError) || mutationBusy;
  const operationsBusy = revokeSessionsMutation.isPending || unlockMutation.isPending || passwordResetMutation.isPending;
  const pathSearch = pathParams.get('search')?.trim() ?? '';
  const accountUserId = pathParams.get('userId') ?? '';
  const isActivePage = path ? activeTabPath === path : pathname === '/users';
  const shouldOpenCreateDialog = isActivePage && (pathParams.get('create') === '1' || (!path && searchParams.get('create') === '1'));

  const users = useMemo(() => response?.data ?? [], [response?.data]);
  const total = response?.meta?.total ?? 0;
  const departments = useMemo(() => Array.from(new Set(
    users.map((user) => user.departmentCode?.trim()).filter((value): value is string => Boolean(value)),
  )).sort((a, b) => a.localeCompare(b, 'ko')), [users]);
  const sourceUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ko');
    return users.filter((user) => {
      const matchesSearch = !normalizedSearch || [user.loginId, user.userName, user.departmentCode ?? '']
        .some((value) => value.toLocaleLowerCase('ko').includes(normalizedSearch));
      const matchesDepartment = !departmentFilter || user.departmentCode === departmentFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? user.isActive : !user.isActive);
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, search, statusFilter, users]);
  const activeUserCount = users.filter((user) => user.isActive).length;
  const inactiveUserCount = users.length - activeUserCount;
  const adminUserCount = users.filter((user) => user.roleCode === 'admin').length;
  const handleSearch = useCallback((values: SsooDataWorkspaceFilterValues) => {
    setSearch(values.search?.trim() ?? '');
    setRoleFilter(values.roleCode ?? '');
    setStatusFilter((values.status as 'all' | 'active' | 'inactive') || 'all');
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilterValues({});
    setSearch('');
    setRoleFilter('');
    setStatusFilter('all');
    setPage(1);
  }, []);

  const openCreateDialog = useCallback(() => {
    if (blocked) return;
    setSubmitError(null);
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }, [blocked]);

  useEffect(() => {
    setFilterValues((prev) => ({ ...prev, search: pathSearch, ...(pathSearch ? { status: 'all' } : {}) }));
    setSearch(pathSearch);
    if (pathSearch) setStatusFilter('all');
    setPage(1);
  }, [pathSearch]);

  useEffect(() => {
    const intent = mode === 'accounts' ? accountUserId : '';
    if (!intent) { accountIntentHandled.current = ''; return; }
    const target = users.find(user => user.id === intent);
    if (isActivePage && target && accountIntentHandled.current !== intent) {
      accountIntentHandled.current = intent;
      setOperationsUser(target);
      setOperationsMessage(null);
      setOperationsError(null);
    }
  }, [accountUserId, isActivePage, mode, users]);

  useEffect(() => {
    if (!shouldOpenCreateDialog) createIntentHandled.current = false;
    if (shouldOpenCreateDialog && !blocked && !createIntentHandled.current) {
      createIntentHandled.current = true;
      openCreateDialog();
    }
  }, [openCreateDialog, shouldOpenCreateDialog, blocked]);

  const openEditDialog = useCallback((user: UserItem) => {
    if (blocked) return;
    setSubmitError(null);
    setEditingUser(user);
    setForm({
      loginId: user.loginId,
      password: '',
      userName: user.userName,
      displayName: user.displayName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      roleCode: user.roleCode,
      departmentCode: user.departmentCode ?? '',
      positionCode: user.positionCode ?? '',
      employeeNumber: user.employeeNumber ?? '',
      companyName: user.companyName ?? '',
      customerId: user.customerId ?? '',
      primaryAffiliationType: user.primaryAffiliationType ?? 'internal',
    });
    setFormErrors({});
    setDialogOpen(true);
  }, [blocked]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!editingUser && !form.loginId.trim()) errors.loginId = '로그인 ID를 입력하세요';
    if (!editingUser && !form.password) errors.password = '비밀번호를 입력하세요';
    if (form.password) {
      if (form.password.length > 100) errors.password = '비밀번호는 100자 이하여야 합니다';
      else if (form.password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다';
      else if (!/[a-zA-Z]/.test(form.password)) errors.password = '영문자를 포함해야 합니다';
      else if (!/\d/.test(form.password)) errors.password = '숫자를 포함해야 합니다';
      else if (!/[!@#$%^&*]/.test(form.password)) errors.password = '특수문자를 포함해야 합니다';
    }
    if (!form.userName.trim()) errors.userName = '이름을 입력하세요';
    if (!form.email.trim()) errors.email = '이메일을 입력하세요';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '올바른 이메일 형식이 아닙니다';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, editingUser]);

  const handleSubmit = useCallback(async () => {
    if (blocked || submitPending.current || !validateForm()) return;
    submitPending.current = true;
    setSubmitError(null);

    try {
      if (editingUser) {
        const updateData: UpdateUserRequest = {};
        if (form.userName !== editingUser.userName) updateData.userName = form.userName;
        if (form.displayName !== (editingUser.displayName ?? ''))
          updateData.displayName = form.displayName;
        if (form.email !== editingUser.email) updateData.email = form.email;
        if (form.phone !== (editingUser.phone ?? '')) updateData.phone = form.phone;
        if (form.roleCode !== editingUser.roleCode) updateData.roleCode = form.roleCode;
        if (form.departmentCode !== (editingUser.departmentCode ?? ''))
          updateData.departmentCode = form.departmentCode;
        if (form.positionCode !== (editingUser.positionCode ?? ''))
          updateData.positionCode = form.positionCode;
        if (form.employeeNumber !== (editingUser.employeeNumber ?? ''))
          updateData.employeeNumber = form.employeeNumber;
        if (form.companyName !== (editingUser.companyName ?? ''))
          updateData.companyName = form.companyName;
        if (form.customerId !== (editingUser.customerId ?? ''))
          updateData.customerId = form.customerId;
        if (form.primaryAffiliationType !== (editingUser.primaryAffiliationType ?? 'internal'))
          updateData.primaryAffiliationType = form.primaryAffiliationType as 'internal' | 'external';
        if (form.password) updateData.password = form.password;

        await updateMutation.mutateAsync({ id: editingUser.id, data: updateData });
      } else {
        const createData: CreateUserRequest = {
          loginId: form.loginId,
          password: form.password,
          userName: form.userName,
          email: form.email,
          ...(form.displayName && { displayName: form.displayName }),
          ...(form.phone && { phone: form.phone }),
          ...(form.roleCode && { roleCode: form.roleCode }),
          ...(form.departmentCode && { departmentCode: form.departmentCode }),
          ...(form.positionCode && { positionCode: form.positionCode }),
          ...(form.employeeNumber && { employeeNumber: form.employeeNumber }),
          ...(form.companyName && { companyName: form.companyName }),
          ...(form.customerId && { customerId: form.customerId }),
          ...(form.primaryAffiliationType && {
            primaryAffiliationType: form.primaryAffiliationType as 'internal' | 'external',
          }),
        };
        await createMutation.mutateAsync(createData);
      }
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setSubmitError(message);
    } finally {
      submitPending.current = false;
    }
  }, [blocked, form, editingUser, validateForm, createMutation, updateMutation]);

  const handleDeactivate = useCallback(
    async (user: UserItem) => {
      if (blocked) return;
      if (!window.confirm(`'${user.userName}' 사용자를 비활성화하시겠습니까?`)) return;
      try {
        await deactivateMutation.mutateAsync(user.id);
      } catch (error) {
        showSsooErrorAlert(error instanceof Error ? error.message : '사용자 비활성화에 실패했습니다.');
      }
    },
    [blocked, deactivateMutation],
  );

  const handleReactivate = useCallback(async (user: UserItem) => {
    if (blocked) return;
    if (!window.confirm(`'${user.userName}' 사용자를 재활성화하시겠습니까? 기존 세션은 모두 회수됩니다.`)) return;
    try {
      await reactivateMutation.mutateAsync(user.id);
    } catch (error) {
      showSsooErrorAlert(error instanceof Error ? error.message : '사용자 재활성화에 실패했습니다.');
    }
  }, [blocked, reactivateMutation]);

  const openAccountOperations = useCallback((user: UserItem) => {
    setOperationsUser(user);
    setOperationsMessage(null);
    setOperationsError(null);
  }, []);

  const columns = useMemo<SsooDataGridColumnDef<UserItem>[]>(() => [
    {
      accessorKey: 'userName', header: '사용자', size: 200,
      cell: ({ row }) => <div className="space-y-1"><span className="font-medium">{row.original.userName}</span><p className="break-all text-xs text-muted-foreground">{row.original.loginId}</p></div>,
    },
    {
      accessorKey: 'email',
      header: '이메일',
      size: 180,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'roleCode',
      header: '역할',
      size: 90,
      cell: ({ row }) => {
        const roleCode = row.original.roleCode;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              roleCode === 'admin'
                ? 'bg-ssoo-danger-bg text-ssoo-danger'
                : 'bg-ssoo-info-bg text-ssoo-info'
            }`}
          >
            {ROLE_LABEL[roleCode] ?? roleCode}
          </span>
        );
      },
    },
    {
      accessorKey: 'departmentCode',
      header: '인사 부서 코드',
      size: 110,
      cell: ({ row }) => <span className="text-sm">{row.original.departmentCode ?? '-'}</span>,
    },
    {
      accessorKey: 'isActive',
      header: '계정 / 참여 상태',
      size: 220,
      cell: ({ row }) => (
        <div className="space-y-1"><span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            row.original.isActive
              ? 'bg-ssoo-success-bg text-ssoo-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {row.original.isActive ? '계정 활성' : '계정 비활성'}
        </span><UserParticipation user={row.original} /></div>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: '최종로그인',
      size: 150,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.lastLoginAt)}</span>,
    },
    {
      id: 'actions',
      header: '작업',
      size: mode === 'accounts' ? 280 : 350,
      cell: ({ row: { original: user } }) => (
        <div className="flex flex-wrap gap-1">
          {mode === 'users' ? <>
            <Button size="sm" disabled={blocked} onClick={() => openEditDialog(user)}>정보 수정</Button>
            <Button variant="outline" size="sm" onClick={() => openTab(getAdminTabOptions(programPath('/memberships', { userId: user.id })))}>소속 관리 ↗</Button>
            <Button variant="outline" size="sm" onClick={() => setParticipationUser(user)}>사용자 상세</Button>
            {user.isSystemUser && <Button variant="link" size="sm" onClick={() => openTab(getAdminTabOptions(programPath('/accounts', { userId: user.id, search: user.loginId })))}>계정 복구 ↗</Button>}
          </> : <>
            {user.isSystemUser && <Button size="sm" onClick={() => openAccountOperations(user)}>계정 상태·복구</Button>}
            <Button variant="outline" size="sm" disabled={blocked || user.id === currentUserId} onClick={() => void (user.isActive ? handleDeactivate(user) : handleReactivate(user))}>{user.isActive ? '계정 중지' : '계정 재활성화'}</Button>
            <Button variant="link" size="sm" onClick={() => openTab(getAdminTabOptions(programPath('/users', { userId: user.id, search: user.loginId })))}>기본정보 ↗</Button>
          </>}
        </div>
      ),
    },
  ], [blocked, handleDeactivate, handleReactivate, openAccountOperations, openEditDialog, mode, openTab, currentUserId]);

  const updateField = useCallback((field: keyof UserFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return (
    <>
      {sourceCompatible ? (
        <SsooWorkspacePage compact title="계정 관리" description="시스템 사용자 계정을 조회하고 관리합니다. 계정 등록 후 관리자가 소속을 배치하거나 직원이 소속을 신청할 수 있습니다. 부서 코드 입력만으로 소속이나 서비스 이용 권한이 생기지 않습니다."
          breadcrumbItems={getAdminBreadcrumb('/users')} scrollBody
          contentDataAttributes={{ 'data-testid': 'admin-user-management-source', 'data-source-surface': 'users' }}
          headerActions={{ extraActions: [{ label: '+ 신규 계정 등록', onClick: openCreateDialog, disabled: blocked }] }}>
          <p className="rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
            ☆ &nbsp;관리자 전용 페이지입니다.
          </p>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '전체 계정', value: users.length, note: '등록된 계정', tone: 'text-foreground' },
              { label: '활성 계정', value: activeUserCount, note: '로그인 가능', tone: 'text-ssoo-success' },
              { label: '비활성 계정', value: inactiveUserCount, note: '로그인 불가', tone: 'text-muted-foreground' },
              { label: '관리자 계정', value: adminUserCount, note: '시스템 관리자', tone: 'text-ssoo-info' },
            ].map((metric) => (
              <article key={metric.label} className="rounded-lg border bg-background p-4">
                <label className="text-sm text-muted-foreground">{metric.label}</label>
                <p className={`mt-1 text-2xl font-semibold ${metric.tone}`}>{metric.value}개</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{metric.note}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_180px_180px]">
            <SsooSearchInput
              id="admin-search"
              name="admin-user-directory-search-query"
              ariaLabel="아이디, 이름 또는 부서 검색"
              intent="data-filter"
              placeholder="아이디, 이름, 부서 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <NativeSelect
              id="admin-filter-dept"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">전체 부서</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </NativeSelect>
            <NativeSelect
              id="admin-filter-status"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </NativeSelect>
          </section>

          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1120px] text-sm">
                <TableHeader className="bg-muted/60 text-xs text-muted-foreground">
                  <TableRow>
                    <TableHead>아이디</TableHead><TableHead>이름</TableHead><TableHead>인사 부서 코드</TableHead>
                    <TableHead>역할</TableHead><TableHead>상태</TableHead><TableHead>최근 로그인</TableHead>
                    <TableHead>연락처</TableHead><TableHead>이메일</TableHead><TableHead>계정 유형</TableHead><TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">계정을 불러오는 중입니다.</TableCell></TableRow>
                  ) : listError ? (
                    <TableRow><TableCell colSpan={10}><SsooErrorNotice message="계정 조회에 실패했습니다." actions={[{ label: '다시 시도', onClick: () => refetch() }]} /></TableCell></TableRow>
                  ) : sourceUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">조건에 맞는 계정이 없습니다.</TableCell></TableRow>
                  ) : sourceUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`source-user-row-${user.loginId}`}>
                      <TableCell className="font-mono">{user.loginId}</TableCell>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell>{user.departmentCode ?? '-'}</TableCell>
                      <TableCell>{ROLE_LABEL[user.roleCode] ?? user.roleCode}</TableCell>
                      <TableCell><span className={user.isActive ? 'text-ssoo-success' : 'text-muted-foreground'}>{user.isActive ? '계정 활성' : '계정 비활성'}</span><UserParticipation user={user} /></TableCell>
                      <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                      <TableCell>{user.phone ?? '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.roleCode === 'admin' ? '관리자' : '일반'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" onClick={() => openEditDialog(user)} disabled={blocked}>정보 수정</Button>
                          <Button size="sm" variant="outline" onClick={() => setParticipationUser(user)}>사용자 상세</Button>
                          <Button size="sm" variant="outline" onClick={() => openTab(getAdminTabOptions(programPath('/accounts', { userId: user.id, search: user.loginId })))}>계정 복구 ↗</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          <footer className="text-xs text-muted-foreground">{sourceUsers.length}개 표시 중 (전체 {users.length}개)</footer>
        </SsooWorkspacePage>
      ) : (
        <SsooDataWorkspacePage compact
          statusSlot={accountUserId ? <ProgramContext context={{ userId: accountUserId }} basePath={mode === 'accounts' ? '/accounts' : '/users'} /> : undefined}
          breadcrumbItems={getAdminBreadcrumb(mode === 'accounts' ? '/accounts' : '/users')}
          title={mode === 'accounts' ? '계정 상태·복구' : '사용자 관리'}
          description={mode === 'accounts' ? '계정 중지·잠금 해제·세션 회수·비밀번호 복구를 처리합니다.' : '사용자 기본정보와 기본 역할을 관리합니다. 조직 소속은 소속 관리에서 배치합니다.'}
          toolbar={{
            filterSummary: [search ? `검색: ${search}` : '전체 사용자', roleFilter ? `역할: ${ROLE_LABEL[roleFilter] ?? roleFilter}` : '', statusFilter === 'active' ? '활성 계정' : statusFilter === 'inactive' ? '중지 계정' : '전체 상태'].filter(Boolean).join(' · '),
            actions: [
              {
                label: mode === 'accounts' ? '사용자 관리 ↗' : '사용자 추가',
                variant: mode === 'accounts' ? 'outline' : 'default',
                icon: mode === 'accounts' ? undefined : <Plus className="h-4 w-4" />,
                onClick: mode === 'accounts' ? () => openTab(getAdminTabOptions('/users')) : openCreateDialog,
                disabled: blocked,
              },
            ],
            filters: [
              {
                key: 'search',
                type: 'text',
                id: mode === 'accounts' ? 'admin-account-filter-search-input' : 'admin-user-filter-search-input',
                name: mode === 'accounts' ? 'admin-account-filter-search-query' : 'admin-user-filter-search-query',
                ariaLabel: '이름, 로그인ID, 이메일 검색',
                placeholder: '이름, 로그인ID, 이메일 검색',
                width: '280px',
              },
              { key: 'roleCode', type: 'select', placeholder: '역할 전체', options: ROLE_OPTIONS, width: '160px' },
              { key: 'status', type: 'select', placeholder: '전체 상태', options: [{ label: '전체 상태', value: 'all' }, { label: '활성 계정', value: 'active' }, { label: '중지 계정', value: 'inactive' }], width: '150px' },
            ],
            filterValues: { ...filterValues, status: filterValues.status ?? statusFilter },
            onFilterValuesChange: setFilterValues,
            onSearch: handleSearch,
            onReset: handleReset,
          }}
          table={{
            fitViewport: true, mobileSummaryColumns: mode === 'accounts' ? ['userName', 'isActive', 'lastLoginAt', 'actions'] : ['userName', 'roleCode', 'isActive', 'actions'],
            enableColumnVisibility: true,
            defaultColumnVisibility: mode === 'accounts' ? { roleCode: false, departmentCode: false } : { email: false, departmentCode: false, lastLoginAt: false },
            columns,
            data: users,
            loading: isLoading,
            error: listError,
            onRetry: () => refetch(),
            pagination: {
              page,
              pageSize: limit,
              total,
              onPageChange: setPage,
            },
          }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!isSaving) setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '사용자 수정' : '사용자 추가'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '사용자 정보를 수정합니다.' : '계정을 생성합니다. 새 사용자는 로그인 후 조직 소속과 서비스 이용을 신청하고 각각 승인받아야 합니다.'}
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isSaving} className="grid gap-4 py-2" data-ssoo-credential-region="managed-user">
            {/* Login ID */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="managed-user-login-id">로그인 ID *</label>
              <Input
                id="managed-user-login-id"
                name="managed-user-login-id"
                autoComplete="off"
                data-ssoo-input-intent="managed-credential-username"
                data-form-type="other"
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                value={form.loginId}
                onChange={(e) => updateField('loginId', e.target.value)}
                disabled={!!editingUser}
                placeholder="로그인 ID"
              />
              {formErrors.loginId && (
                <SsooErrorNotice as="p" compact error={formErrors.loginId} />
              )}
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="managed-user-new-password">
                비밀번호 {editingUser ? '(변경 시에만 입력)' : '*'}
              </label>
              <Input
                id="managed-user-new-password"
                name="managed-user-new-password"
                type="password"
                autoComplete="new-password"
                data-ssoo-input-intent="managed-credential-new-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={editingUser ? '변경하지 않으려면 비워두세요' : '비밀번호 (8자 이상)'}
              />
              {formErrors.password && (
                <SsooErrorNotice as="p" compact error={formErrors.password} />
              )}
            </div>

            {/* Name row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-userName">이름 *</label>
                <Input id="admin-user-userName"
                  value={form.userName}
                  onChange={(e) => updateField('userName', e.target.value)}
                  placeholder="이름"
                />
                {formErrors.userName && (
                  <SsooErrorNotice as="p" compact error={formErrors.userName} />
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-displayName">표시명</label>
                <Input id="admin-user-displayName"
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="표시명"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="managed-user-email">이메일 *</label>
                <Input
                  id="managed-user-email"
                  name="managed-user-email"
                  type="email"
                  autoComplete="off"
                  data-ssoo-input-intent="managed-credential-email"
                  data-form-type="other"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="이메일"
                />
                {formErrors.email && (
                  <SsooErrorNotice as="p" compact error={formErrors.email} />
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-phone">전화번호</label>
                <Input id="admin-user-phone"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* Role + Department + Position */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">역할</label>
                <Select value={form.roleCode} onValueChange={(v) => updateField('roleCode', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-departmentCode">인사 부서 코드 (선택)</label>
                <Input id="admin-user-departmentCode"
                  value={form.departmentCode}
                  onChange={(e) => updateField('departmentCode', e.target.value)}
                  placeholder="부서 코드"
                /><p className="text-xs text-muted-foreground">인사 참고 정보입니다. 실제 소속은 본인 신청과 관리자 승인으로 정해집니다.</p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-positionCode">직급</label>
                <Input id="admin-user-positionCode"
                  value={form.positionCode}
                  onChange={(e) => updateField('positionCode', e.target.value)}
                  placeholder="직급 코드"
                />
              </div>
            </div>

            {/* Primary Affiliation + Employee Number */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">인사 소속 구분</label>
                <Select
                  value={form.primaryAffiliationType || EMPTY_SELECT_VALUE}
                  onValueChange={(v) =>
                    updateField('primaryAffiliationType', v === EMPTY_SELECT_VALUE ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="primary 소속을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택 안함</SelectItem>
                    {PRIMARY_AFFILIATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-employeeNumber">사번</label>
                <Input id="admin-user-employeeNumber"
                  value={form.employeeNumber}
                  onChange={(e) => updateField('employeeNumber', e.target.value)}
                  placeholder="사번"
                />
              </div>
            </div>

            {/* Company + Customer ID */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-companyName">외부 회사명</label>
                <Input id="admin-user-companyName"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="외부 회사명"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="admin-user-customerId">고객사 ID</label>
                <Input id="admin-user-customerId"
                  value={form.customerId}
                  onChange={(e) => updateField('customerId', e.target.value)}
                  placeholder="고객사 ID"
                />
              </div>
            </div>
          </fieldset>

          {submitError && (
            <SsooErrorNotice as="p" compact className="px-1" error={submitError} />
          )}

          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={blocked}>
              {isSaving ? '저장 중...' : editingUser ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {participationUser ? <UserParticipationDialog user={participationUser} onClose={() => setParticipationUser(null)} /> : null}
      <Dialog open={Boolean(operationsUser)} onOpenChange={(open) => {
        if (!open && !operationsBusy) setOperationsUser(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>계정·세션 운영</DialogTitle>
            <DialogDescription>
              {operationsUser?.userName} · {operationsUser?.loginId}
            </DialogDescription>
          </DialogHeader>

          {accountQuery.isFetching ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">계정 상태를 확인하는 중...</div>
          ) : accountQuery.isError || !accountQuery.data?.data ? (
            <SsooErrorNotice className="p-4" actions={[{ label: '계정 상태 다시 조회', onClick: () => void accountQuery.refetch() }]}>
              계정 상태 조회에 실패했습니다.
            </SsooErrorNotice>
          ) : (() => {
            const account = accountQuery.data.data;
            return (
              <div className="space-y-4 py-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">계정 상태</p>
                    <p className="mt-1 text-sm font-medium">{ACCOUNT_STATUS_LABELS[account.authAccount?.accountStatusCode ?? 'missing'] ?? account.authAccount?.accountStatusCode}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">로그인 잠금</p>
                    <p className="mt-1 text-sm font-medium">
                      {account.authAccount?.lockedUntil ? `~ ${formatDateTime(account.authAccount.lockedUntil)}` : '잠금 없음'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">활성 세션</p>
                    <p className="mt-1 text-sm font-medium">{account.sessionSummary.active}개</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!operationsUser || !window.confirm('이 사용자의 모든 활성 세션을 회수하시겠습니까?')) return;
                      setOperationsError(null);
                      setOperationsMessage(null);
                      try {
                        const result = await revokeSessionsMutation.mutateAsync(operationsUser.id);
                        setOperationsMessage(`${result.data?.revokedCount ?? 0}개 세션을 회수했습니다.`);
                      } catch (error) {
                        setOperationsError(error instanceof Error ? error.message : '세션 회수에 실패했습니다.');
                      }
                    }}
                    disabled={operationsBusy || account.sessionSummary.active === 0}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    전체 강제 로그아웃
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!operationsUser) return;
                      setOperationsError(null);
                      setOperationsMessage(null);
                      try {
                        await unlockMutation.mutateAsync(operationsUser.id);
                        setOperationsMessage('로그인 실패 횟수와 잠금을 초기화했습니다.');
                      } catch (error) {
                        setOperationsError(error instanceof Error ? error.message : '잠금 해제에 실패했습니다.');
                      }
                    }}
                    disabled={operationsBusy || (!account.authAccount?.lockedUntil && !account.authAccount?.loginFailCount)}
                  >
                    <LockOpen className="mr-1 h-4 w-4" />
                    잠금 해제
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!operationsUser || !window.confirm(`${account.email}로 비밀번호 재설정 절차를 시작하시겠습니까?`)) return;
                      setOperationsError(null);
                      setOperationsMessage(null);
                      try {
                        await passwordResetMutation.mutateAsync(operationsUser.id);
                        setOperationsMessage('비밀번호 재설정 요청을 접수했습니다. 인증 메일 운영에서 전달 상태를 확인하세요.');
                      } catch (error) {
                        setOperationsError(error instanceof Error ? error.message : '재설정 요청에 실패했습니다.');
                      }
                    }}
                    disabled={operationsBusy}
                  >
                    <KeyRound className="mr-1 h-4 w-4" />
                    재설정 메일 요청
                  </Button>
                  <OperationHistoryButton filter={{ userId: account.userId }} label="사용자 변경 이력" onNavigate={() => setOperationsUser(null)} />
                </div>

                {operationsMessage && (
                  <p className="rounded-lg border border-ssoo-success/30 bg-ssoo-success-bg p-3 text-sm text-ssoo-success">
                    {operationsMessage}
                  </p>
                )}
                {operationsError && (
                  <SsooErrorNotice as="p" compact className="p-3" error={operationsError} />
                )}

                <section className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">최근 세션</h3>
                    <p className="mt-1 text-xs text-muted-foreground">최근 최대 50건 · 활성 세션 수는 전체 기준이며 토큰 원문은 노출하지 않습니다.</p>
                  </div>
                  <div className="divide-y">
                    {account.sessions.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">기록된 세션이 없습니다.</p>
                    ) : account.sessions.map((session) => (
                      <div key={session.sessionId} className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-[120px_1fr_auto]">
                        <span className="font-medium">{session.issuedApp}</span>
                        <span className="truncate text-muted-foreground" title={session.userAgent ?? undefined}>
                          {session.userAgent ?? 'user-agent 없음'}
                        </span>
                        <span className={session.active ? 'text-ssoo-success' : 'text-muted-foreground'}>
                          {session.active ? '활성' : session.revokedAt ? `회수 · ${session.revokeReason ?? '-'}` : '만료'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
