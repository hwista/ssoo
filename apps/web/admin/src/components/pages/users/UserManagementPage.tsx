'use client';

import { useState, useCallback } from 'react';
import { Search, Plus, Pencil, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/hooks/queries/useUsers';
import type {
  UserItem,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/lib/api/endpoints/users';

const ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'manager', label: '매니저' },
  { value: 'user', label: '사용자' },
  { value: 'viewer', label: '뷰어' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  user: '사용자',
  viewer: '뷰어',
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

export function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const limit = 20;
  const { data: response, isLoading, error: listError, refetch } = useUserList({
    page,
    limit,
    search: search || undefined,
    roleCode: roleFilter || undefined,
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();

  const users = response?.data ?? [];
  const total = response?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch],
  );

  const openCreateDialog = useCallback(() => {
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((user: UserItem) => {
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
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!editingUser && !form.loginId.trim()) errors.loginId = '로그인 ID를 입력하세요';
    if (!editingUser && !form.password) errors.password = '비밀번호를 입력하세요';
    if (form.password) {
      if (form.password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다';
      else if (!/[a-zA-Z]/.test(form.password)) errors.password = '영문자를 포함해야 합니다';
      else if (!/\d/.test(form.password)) errors.password = '숫자를 포함해야 합니다';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) errors.password = '특수문자를 포함해야 합니다';
    }
    if (!form.userName.trim()) errors.userName = '이름을 입력하세요';
    if (!form.email.trim()) errors.email = '이메일을 입력하세요';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '올바른 이메일 형식이 아닙니다';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, editingUser]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
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
    }
  }, [form, editingUser, validateForm, createMutation, updateMutation]);

  const handleDeactivate = useCallback(
    async (user: UserItem) => {
      if (!window.confirm(`'${user.userName}' 사용자를 비활성화하시겠습니까?`)) return;
      try {
        await deactivateMutation.mutateAsync(user.id);
      } catch {
        window.alert('사용자 비활성화에 실패했습니다.');
      }
    },
    [deactivateMutation],
  );

  const updateField = useCallback((field: keyof UserFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">시스템 사용자 계정 관리</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          사용자 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="이름, 로그인ID, 이메일 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="역할 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Card */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            로딩 중...
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-destructive">목록을 불러오지 못했습니다.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            사용자가 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">로그인ID</TableHead>
                <TableHead className="w-[100px]">이름</TableHead>
                <TableHead className="w-[180px]">이메일</TableHead>
                <TableHead className="w-[80px]">역할</TableHead>
                <TableHead className="w-[100px]">부서</TableHead>
                <TableHead className="w-[70px]">상태</TableHead>
                <TableHead className="w-[140px]">최종로그인</TableHead>
                <TableHead className="w-[80px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.loginId}</TableCell>
                  <TableCell>{user.userName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.roleCode === 'admin'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {ROLE_LABEL[user.roleCode] ?? user.roleCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{user.departmentCode ?? '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(user.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {user.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivate(user)}
                          title="비활성화"
                          disabled={deactivateMutation.isPending}
                        >
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-muted-foreground">
              총 {total}명 (페이지 {page}/{totalPages})
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '사용자 수정' : '사용자 추가'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '사용자 정보를 수정합니다.' : '새 사용자를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Login ID */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">로그인 ID *</label>
              <Input
                value={form.loginId}
                onChange={(e) => updateField('loginId', e.target.value)}
                disabled={!!editingUser}
                placeholder="로그인 ID"
              />
              {formErrors.loginId && (
                <p className="text-xs text-destructive">{formErrors.loginId}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                비밀번호 {editingUser ? '(변경 시에만 입력)' : '*'}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={editingUser ? '변경하지 않으려면 비워두세요' : '비밀번호 (8자 이상)'}
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">이름 *</label>
                <Input
                  value={form.userName}
                  onChange={(e) => updateField('userName', e.target.value)}
                  placeholder="이름"
                />
                {formErrors.userName && (
                  <p className="text-xs text-destructive">{formErrors.userName}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">표시명</label>
                <Input
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="표시명"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">이메일 *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="이메일"
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">전화번호</label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* Role + Department + Position */}
            <div className="grid grid-cols-3 gap-3">
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
                <label className="text-sm font-medium">부서</label>
                <Input
                  value={form.departmentCode}
                  onChange={(e) => updateField('departmentCode', e.target.value)}
                  placeholder="부서 코드"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">직급</label>
                <Input
                  value={form.positionCode}
                  onChange={(e) => updateField('positionCode', e.target.value)}
                  placeholder="직급 코드"
                />
              </div>
            </div>

            {/* Primary Affiliation + Employee Number */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Primary 소속</label>
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
                <label className="text-sm font-medium">사번</label>
                <Input
                  value={form.employeeNumber}
                  onChange={(e) => updateField('employeeNumber', e.target.value)}
                  placeholder="사번"
                />
              </div>
            </div>

            {/* Company + Customer ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">외부 회사명</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="외부 회사명"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">고객사 ID</label>
                <Input
                  value={form.customerId}
                  onChange={(e) => updateField('customerId', e.target.value)}
                  placeholder="고객사 ID"
                />
              </div>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive px-1">{submitError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? '저장 중...' : editingUser ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
