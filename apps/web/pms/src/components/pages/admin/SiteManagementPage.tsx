'use client';

import { useCallback, useMemo, useState } from 'react';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { useCodesByGroup } from '@/hooks/queries/useCodes';
import { useCustomerList } from '@/hooks/queries/useCustomers';
import {
  useCreateSite,
  useDeactivateSite,
  useSiteList,
  useSiteTree,
  useUpdateSite,
} from '@/hooks/queries/useSites';
import type { CreateSiteRequest, SiteItem, UpdateSiteRequest } from '@/lib/api/endpoints/sites';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface SiteFormData {
  siteCode: string;
  siteName: string;
  siteType: string;
  customerId: string;
  parentCode: string;
  sortOrder: number;
  address: string;
  region: string;
  contactPerson: string;
  contactPhone: string;
  description: string;
  memo: string;
}

const INITIAL_FORM: SiteFormData = {
  siteCode: '',
  siteName: '',
  siteType: '',
  customerId: '',
  parentCode: '',
  sortOrder: 0,
  address: '',
  region: '',
  contactPerson: '',
  contactPhone: '',
  description: '',
  memo: '',
};

function buildDepthMap(items: SiteItem[]) {
  const map = new Map(items.map((item) => [item.siteCode, item]));
  const depthMap = new Map<string, number>();

  const getDepth = (code: string): number => {
    const cached = depthMap.get(code);
    if (cached !== undefined) return cached;

    const node = map.get(code);
    if (!node || !node.parentCode) {
      depthMap.set(code, 0);
      return 0;
    }

    const depth = getDepth(node.parentCode) + 1;
    depthMap.set(code, depth);
    return depth;
  };

  for (const item of items) {
    getDepth(item.siteCode);
  }

  return depthMap;
}

function buildDescendantSet(items: SiteItem[], rootCode: string) {
  const byParent = new Map<string, SiteItem[]>();
  for (const item of items) {
    if (!item.parentCode) continue;
    const children = byParent.get(item.parentCode) ?? [];
    children.push(item);
    byParent.set(item.parentCode, children);
  }

  const descendants = new Set<string>();
  const queue = [...(byParent.get(rootCode) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || descendants.has(current.siteCode)) continue;
    descendants.add(current.siteCode);
    queue.push(...(byParent.get(current.siteCode) ?? []));
  }

  return descendants;
}

export function SiteManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(INITIAL_FORM);

  const selectedCustomerId = customerFilter === 'all' ? undefined : customerFilter;
  const listFilters = {
    page,
    pageSize,
    search: search || undefined,
    customerId: selectedCustomerId,
  };

  const { data: listResponse, isLoading, error, refetch } = useSiteList(listFilters);
  const { data: treeResponse } = useSiteTree(selectedCustomerId);
  const { data: customersResponse } = useCustomerList({ page: 1, pageSize: 1000 });
  const { data: siteTypeResponse } = useCodesByGroup('SITE_TYPE');

  const createMutation = useCreateSite();
  const updateMutation = useUpdateSite();
  const deactivateMutation = useDeactivateSite();

  const items = useMemo(() => listResponse?.data?.items ?? [], [listResponse]);
  const treeItems = useMemo(() => treeResponse?.data ?? [], [treeResponse]);
  const customers = useMemo(() => customersResponse?.data?.items ?? [], [customersResponse]);
  const siteTypes = useMemo(() => siteTypeResponse?.data ?? [], [siteTypeResponse]);
  const totalPages = listResponse?.data?.totalPages ?? 0;
  const depthMap = useMemo(() => buildDepthMap(treeItems), [treeItems]);

  const customerNameMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.customerName])),
    [customers],
  );
  const siteTypeNameMap = useMemo(
    () => new Map(siteTypes.map((code) => [code.codeValue, code.displayNameKo])),
    [siteTypes],
  );
  const siteMap = useMemo(() => new Map(treeItems.map((item) => [item.siteCode, item])), [treeItems]);
  const editingItem = useMemo(
    () => treeItems.find((item) => item.id === editingId) ?? null,
    [editingId, treeItems],
  );

  const currentCustomerId = formMode === 'edit' ? editingItem?.customerId ?? formData.customerId : formData.customerId;
  const parentCandidates = useMemo(() => {
    const sameCustomer = treeItems.filter((item) => item.customerId === currentCustomerId);
    if (!editingItem) return sameCustomer;

    const excluded = buildDescendantSet(treeItems, editingItem.siteCode);
    excluded.add(editingItem.siteCode);
    return sameCustomer.filter((item) => !excluded.has(item.siteCode));
  }, [currentCustomerId, editingItem, treeItems]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleCustomerFilterChange = useCallback((value: string) => {
    setCustomerFilter(value);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      customerId: selectedCustomerId ?? '',
    });
    setDialogOpen(true);
  }, [selectedCustomerId]);

  const handleOpenEdit = useCallback((item: SiteItem) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormData({
      siteCode: item.siteCode,
      siteName: item.siteName,
      siteType: item.siteType ?? '',
      customerId: item.customerId,
      parentCode: item.parentCode ?? '',
      sortOrder: item.sortOrder,
      address: item.address ?? '',
      region: item.region ?? '',
      contactPerson: item.contactPerson ?? '',
      contactPhone: item.contactPhone ?? '',
      description: item.description ?? '',
      memo: item.memo ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((item: SiteItem) => {
    if (!confirm(`"${item.siteName}" 사이트를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(item.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateSiteRequest = {
        siteCode: formData.siteCode,
        siteName: formData.siteName,
        customerId: formData.customerId,
        ...(formData.siteType && { siteType: formData.siteType }),
        ...(formData.parentCode && { parentCode: formData.parentCode }),
        sortOrder: formData.sortOrder,
        ...(formData.address && { address: formData.address }),
        ...(formData.region && { region: formData.region }),
        ...(formData.contactPerson && { contactPerson: formData.contactPerson }),
        ...(formData.contactPhone && { contactPhone: formData.contactPhone }),
        ...(formData.description && { description: formData.description }),
        ...(formData.memo && { memo: formData.memo }),
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateSiteRequest = {
        siteName: formData.siteName,
        siteType: formData.siteType || undefined,
        parentCode: formData.parentCode || undefined,
        sortOrder: formData.sortOrder,
        address: formData.address || undefined,
        region: formData.region || undefined,
        contactPerson: formData.contactPerson || undefined,
        contactPhone: formData.contactPhone || undefined,
        description: formData.description || undefined,
        memo: formData.memo || undefined,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [createMutation, editingId, formData, formMode, updateMutation]);

  const updateField = useCallback(<K extends keyof SiteFormData>(field: K, value: SiteFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (error) {
    return <ErrorState error={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">사이트 관리</h1>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          사이트 추가
        </Button>
      </div>

      <div className="px-6 py-3 border-b bg-white flex items-center gap-2">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <Input
            placeholder="사이트명 또는 코드 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={customerFilter} onValueChange={handleCustomerFilterChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="고객사 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 고객사</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.customerName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState message="사이트를 불러오는 중..." />
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {search || selectedCustomerId ? '검색 결과가 없습니다.' : '등록된 사이트가 없습니다.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">코드</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">사이트명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">유형</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">고객사</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">부모</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">정렬</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">상태</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const depth = depthMap.get(item.siteCode) ?? 0;
                const parent = item.parentCode ? siteMap.get(item.parentCode) : null;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.siteCode}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">{'\u00A0'.repeat(depth * 4)}</span>
                        <span className={cn(depth > 0 && 'text-gray-700')}>{item.siteName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{item.siteType ? (siteTypeNameMap.get(item.siteType) ?? item.siteType) : '-'}</td>
                    <td className="px-4 py-2.5">{customerNameMap.get(item.customerId) ?? item.customerId}</td>
                    <td className="px-4 py-2.5">{parent?.siteName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">{item.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600',
                      )}>
                        {item.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeactivate(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
          <p className="text-sm text-muted-foreground">
            페이지 {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              이전
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
              다음
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '사이트 추가' : '사이트 수정'}</DialogTitle>
            <DialogDescription>
              고객별 사이트와 하위 구조를 관리합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">사이트 코드</label>
              <Input
                value={formData.siteCode}
                onChange={(e) => updateField('siteCode', e.target.value)}
                disabled={formMode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">사이트명</label>
              <Input
                value={formData.siteName}
                onChange={(e) => updateField('siteName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">유형</label>
              <Select value={formData.siteType || '__empty__'} onValueChange={(value) => updateField('siteType', value === '__empty__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택 안 함</SelectItem>
                  {siteTypes.map((code) => (
                    <SelectItem key={code.id} value={code.codeValue}>
                      {code.displayNameKo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">고객사</label>
              <Select
                value={formData.customerId || '__empty__'}
                onValueChange={(value) => {
                  updateField('customerId', value === '__empty__' ? '' : value);
                  updateField('parentCode', '');
                }}
                disabled={formMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="고객사 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">부모 사이트</label>
              <Select
                value={formData.parentCode || '__empty__'}
                onValueChange={(value) => updateField('parentCode', value === '__empty__' ? '' : value)}
                disabled={!currentCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="부모 사이트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">없음</SelectItem>
                  {parentCandidates.map((candidate) => {
                    const depth = depthMap.get(candidate.siteCode) ?? 0;
                    return (
                      <SelectItem key={candidate.id} value={candidate.siteCode}>
                        {'\u00A0'.repeat(depth * 4)}
                        {candidate.siteCode} - {candidate.siteName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">정렬 순서</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">주소</label>
              <Input
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">지역</label>
              <Input
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">현장 담당자</label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => updateField('contactPerson', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">담당자 연락처</label>
              <Input
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">메모</label>
              <Input
                value={formData.memo}
                onChange={(e) => updateField('memo', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>
              {formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
