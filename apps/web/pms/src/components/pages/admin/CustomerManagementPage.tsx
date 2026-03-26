'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import {
  useCustomerList,
  useCreateCustomer,
  useUpdateCustomer,
  useDeactivateCustomer,
} from '@/hooks/queries/useCustomers';
import type {
  CustomerItem,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/lib/api/endpoints/customers';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface CustomerFormData {
  customerCode: string;
  customerName: string;
  customerType: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
  website: string;
  memo: string;
}

const INITIAL_FORM: CustomerFormData = {
  customerCode: '',
  customerName: '',
  customerType: '',
  industry: '',
  address: '',
  phone: '',
  email: '',
  contactPerson: '',
  contactPhone: '',
  website: '',
  memo: '',
};

export function CustomerManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(INITIAL_FORM);

  const { data: response, isLoading, error, refetch } = useCustomerList({
    page,
    pageSize,
    search: search || undefined,
  });

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deactivateMutation = useDeactivateCustomer();

  const customers = useMemo(() => response?.data?.items ?? [], [response]);
  const total = response?.data?.total ?? 0;
  const totalPages = response?.data?.totalPages ?? 0;

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((customer: CustomerItem) => {
    setFormMode('edit');
    setEditingId(customer.id);
    setFormData({
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      customerType: customer.customerType ?? '',
      industry: customer.industry ?? '',
      address: customer.address ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      contactPerson: customer.contactPerson ?? '',
      contactPhone: customer.contactPhone ?? '',
      website: customer.website ?? '',
      memo: customer.memo ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((customer: CustomerItem) => {
    if (!confirm(`"${customer.customerName}" 고객사를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(customer.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateCustomerRequest = {
        customerCode: formData.customerCode,
        customerName: formData.customerName,
        ...(formData.customerType && { customerType: formData.customerType }),
        ...(formData.industry && { industry: formData.industry }),
        ...(formData.address && { address: formData.address }),
        ...(formData.phone && { phone: formData.phone }),
        ...(formData.email && { email: formData.email }),
        ...(formData.contactPerson && { contactPerson: formData.contactPerson }),
        ...(formData.contactPhone && { contactPhone: formData.contactPhone }),
        ...(formData.website && { website: formData.website }),
        ...(formData.memo && { memo: formData.memo }),
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateCustomerRequest = {
        customerName: formData.customerName,
        customerType: formData.customerType || undefined,
        industry: formData.industry || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        contactPerson: formData.contactPerson || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        memo: formData.memo || undefined,
      };
      updateMutation.mutate(
        { id: editingId, data: req },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(<K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (error) {
    return <ErrorState error={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-title-card">고객사 관리</h1>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          고객사 추가
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-2 max-w-md">
          <Input
            placeholder="고객사명 또는 코드 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState message="고객사 목록을 불러오는 중..." />
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-body-sm text-muted-foreground">
              {search ? '검색 결과가 없습니다.' : '등록된 고객사가 없습니다.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground w-32">코드</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">고객사명</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground w-32">연락처</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground w-28">담당자</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground w-28">업종</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-20">상태</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-code-line-number">{customer.customerCode}</td>
                  <td className="px-4 py-2.5 text-label-md">{customer.customerName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.phone ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.contactPerson ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.industry ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-label-sm',
                      customer.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500',
                    )}>
                      {customer.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(customer)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(customer)}
                        disabled={!customer.isActive}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
          <span className="text-body-sm text-muted-foreground">
            전체 {total}건 / {page}/{totalPages}페이지
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '고객사 추가' : '고객사 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 고객사를 등록합니다.' : '고객사 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">고객사 코드 *</label>
                <Input
                  value={formData.customerCode}
                  onChange={(e) => updateField('customerCode', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="CUST-001"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">고객사명 *</label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="고객사명"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">고객사 유형</label>
                <Input
                  value={formData.customerType}
                  onChange={(e) => updateField('customerType', e.target.value)}
                  placeholder="대기업, 중소기업, 공공기관 등"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">업종</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="제조, IT, 금융 등"
                />
              </div>
            </div>

            <div>
              <label className="text-label-md mb-1.5 block">주소</label>
              <Input
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="주소"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">대표 전화번호</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="02-1234-5678"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">대표 이메일</label>
                <Input
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">담당자명</label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">담당자 연락처</label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div>
              <label className="text-label-md mb-1.5 block">웹사이트</label>
              <Input
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.company.com"
              />
            </div>

            <div>
              <label className="text-label-md mb-1.5 block">메모</label>
              <Input
                value={formData.memo}
                onChange={(e) => updateField('memo', e.target.value)}
                placeholder="메모 (선택)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !formData.customerCode ||
                !formData.customerName
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? '처리 중...'
                : formMode === 'create'
                  ? '추가'
                  : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
