'use client';

import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Server, Trash2 } from 'lucide-react';
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
import { useSiteTree } from '@/hooks/queries/useSites';
import {
  useCreateSystemInstance,
  useDeactivateSystemInstance,
  useSystemInstanceList,
  useSystemInstanceTree,
  useUpdateSystemInstance,
} from '@/hooks/queries/useSystemInstances';
import { useSystemCatalogTree } from '@/hooks/queries/useSystemCatalogs';
import { useUserList } from '@/hooks/queries/useUsers';
import type {
  CreateSystemInstanceRequest,
  SystemInstanceItem,
  UpdateSystemInstanceRequest,
} from '@/lib/api/endpoints/systemInstances';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface SystemInstanceFormData {
  instanceCode: string;
  instanceName: string;
  systemCatalogId: string;
  customerId: string;
  siteId: string;
  parentCode: string;
  sortOrder: number;
  operatorType: string;
  operatorUserId: string;
  version: string;
  description: string;
  memo: string;
}

const INITIAL_FORM: SystemInstanceFormData = {
  instanceCode: '',
  instanceName: '',
  systemCatalogId: '',
  customerId: '',
  siteId: '',
  parentCode: '',
  sortOrder: 0,
  operatorType: '',
  operatorUserId: '',
  version: '',
  description: '',
  memo: '',
};

function buildDepthMap(items: SystemInstanceItem[]) {
  const map = new Map(items.map((item) => [item.instanceCode, item]));
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
    getDepth(item.instanceCode);
  }

  return depthMap;
}

function buildDescendantSet(items: SystemInstanceItem[], rootCode: string) {
  const byParent = new Map<string, SystemInstanceItem[]>();
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
    if (!current || descendants.has(current.instanceCode)) continue;
    descendants.add(current.instanceCode);
    queue.push(...(byParent.get(current.instanceCode) ?? []));
  }

  return descendants;
}

export function SystemInstanceManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [operatorTypeFilter, setOperatorTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemInstanceFormData>(INITIAL_FORM);

  const selectedCustomerId = customerFilter === 'all' ? undefined : customerFilter;
  const selectedSiteId = siteFilter === 'all' ? undefined : siteFilter;
  const selectedCatalogId = catalogFilter === 'all' ? undefined : catalogFilter;
  const selectedOperatorType = operatorTypeFilter === 'all' ? undefined : operatorTypeFilter;

  const listFilters = {
    page,
    pageSize,
    search: search || undefined,
    customerId: selectedCustomerId,
    siteId: selectedSiteId,
    systemCatalogId: selectedCatalogId,
    operatorType: selectedOperatorType,
  };

  const { data: listResponse, isLoading, error, refetch } = useSystemInstanceList(listFilters);
  const { data: treeResponse } = useSystemInstanceTree(selectedCustomerId, selectedSiteId);
  const { data: customersResponse } = useCustomerList({ page: 1, pageSize: 1000 });
  const { data: sitesResponse } = useSiteTree(selectedCustomerId);
  const { data: catalogsResponse } = useSystemCatalogTree();
  const { data: operatorTypesResponse } = useCodesByGroup('SYSTEM_OPERATOR_TYPE');
  const { data: usersResponse } = useUserList({ page: 1, limit: 1000 });

  const createMutation = useCreateSystemInstance();
  const updateMutation = useUpdateSystemInstance();
  const deactivateMutation = useDeactivateSystemInstance();

  const items = useMemo(() => listResponse?.data?.items ?? [], [listResponse]);
  const treeItems = useMemo(() => treeResponse?.data ?? [], [treeResponse]);
  const customers = useMemo(() => customersResponse?.data?.items ?? [], [customersResponse]);
  const sites = useMemo(() => sitesResponse?.data ?? [], [sitesResponse]);
  const catalogs = useMemo(() => catalogsResponse?.data ?? [], [catalogsResponse]);
  const operatorTypes = useMemo(() => operatorTypesResponse?.data ?? [], [operatorTypesResponse]);
  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse]);
  const totalPages = listResponse?.data?.totalPages ?? 0;

  const depthMap = useMemo(() => buildDepthMap(treeItems), [treeItems]);
  const catalogDepthMap = useMemo(() => {
    const map = new Map(catalogs.map((item) => [item.catalogCode, item]));
    const depth = new Map<string, number>();
    const getDepth = (code: string): number => {
      const cached = depth.get(code);
      if (cached !== undefined) return cached;
      const node = map.get(code);
      if (!node || !node.parentCode) {
        depth.set(code, 0);
        return 0;
      }
      const value = getDepth(node.parentCode) + 1;
      depth.set(code, value);
      return value;
    };
    for (const item of catalogs) getDepth(item.catalogCode);
    return depth;
  }, [catalogs]);

  const customerNameMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.customerName])),
    [customers],
  );
  const siteNameMap = useMemo(() => new Map(sites.map((site) => [site.id, site.siteName])), [sites]);
  const catalogNameMap = useMemo(() => new Map(catalogs.map((catalog) => [catalog.id, catalog.catalogName])), [catalogs]);
  const operatorTypeNameMap = useMemo(
    () => new Map(operatorTypes.map((code) => [code.codeValue, code.displayNameKo])),
    [operatorTypes],
  );
  const userNameMap = useMemo(
    () => new Map(users.map((user) => [user.id, user.displayName || user.userName])),
    [users],
  );
  const editingItem = useMemo(
    () => treeItems.find((item) => item.id === editingId) ?? null,
    [editingId, treeItems],
  );

  const currentCustomerId = formMode === 'edit' ? editingItem?.customerId ?? formData.customerId : formData.customerId;
  const currentSiteId = formMode === 'edit' ? editingItem?.siteId ?? formData.siteId : formData.siteId;

  const availableSites = useMemo(
    () => sites.filter((site) => site.customerId === currentCustomerId),
    [currentCustomerId, sites],
  );

  const parentCandidates = useMemo(() => {
    const sameCustomer = treeItems.filter((item) => item.customerId === currentCustomerId);
    const sameScope = sameCustomer.filter((item) => item.siteId === currentSiteId);
    if (!editingItem) return sameScope;

    const excluded = buildDescendantSet(treeItems, editingItem.instanceCode);
    excluded.add(editingItem.instanceCode);
    return sameScope.filter((item) => !excluded.has(item.instanceCode));
  }, [currentCustomerId, currentSiteId, editingItem, treeItems]);

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
    setFormData({
      ...INITIAL_FORM,
      customerId: selectedCustomerId ?? '',
      siteId: selectedSiteId ?? '',
      systemCatalogId: selectedCatalogId ?? '',
    });
    setDialogOpen(true);
  }, [selectedCatalogId, selectedCustomerId, selectedSiteId]);

  const handleOpenEdit = useCallback((item: SystemInstanceItem) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormData({
      instanceCode: item.instanceCode,
      instanceName: item.instanceName,
      systemCatalogId: item.systemCatalogId,
      customerId: item.customerId,
      siteId: item.siteId,
      parentCode: item.parentCode ?? '',
      sortOrder: item.sortOrder,
      operatorType: item.operatorType ?? '',
      operatorUserId: item.operatorUserId ?? '',
      version: item.version ?? '',
      description: item.description ?? '',
      memo: item.memo ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((item: SystemInstanceItem) => {
    if (!confirm(`"${item.instanceName}" 시스템 인스턴스를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(item.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateSystemInstanceRequest = {
        instanceCode: formData.instanceCode,
        instanceName: formData.instanceName,
        systemCatalogId: formData.systemCatalogId,
        customerId: formData.customerId,
        siteId: formData.siteId,
        ...(formData.parentCode && { parentCode: formData.parentCode }),
        sortOrder: formData.sortOrder,
        ...(formData.operatorType && { operatorType: formData.operatorType }),
        ...(formData.operatorUserId && { operatorUserId: formData.operatorUserId }),
        ...(formData.version && { version: formData.version }),
        ...(formData.description && { description: formData.description }),
        ...(formData.memo && { memo: formData.memo }),
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateSystemInstanceRequest = {
        instanceName: formData.instanceName,
        systemCatalogId: formData.systemCatalogId,
        siteId: formData.siteId,
        parentCode: formData.parentCode || undefined,
        sortOrder: formData.sortOrder,
        operatorType: formData.operatorType || undefined,
        operatorUserId: formData.operatorUserId || undefined,
        version: formData.version || undefined,
        description: formData.description || undefined,
        memo: formData.memo || undefined,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [createMutation, editingId, formData, formMode, updateMutation]);

  const updateField = useCallback(<K extends keyof SystemInstanceFormData>(field: K, value: SystemInstanceFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (error) {
    return <ErrorState error={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">시스템 인스턴스 관리</h1>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          시스템 인스턴스 추가
        </Button>
      </div>

      <div className="px-6 py-3 border-b bg-white flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <Input
            placeholder="인스턴스명 또는 코드 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={customerFilter} onValueChange={(value) => { setCustomerFilter(value); setSiteFilter('all'); setPage(1); }}>
          <SelectTrigger className="w-56">
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
        <Select value={siteFilter} onValueChange={(value) => { setSiteFilter(value); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="사이트 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 사이트</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.siteName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catalogFilter} onValueChange={(value) => { setCatalogFilter(value); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="시스템 종류 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 시스템 종류</SelectItem>
            {catalogs.map((catalog) => (
              <SelectItem key={catalog.id} value={catalog.id}>
                {catalog.catalogName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={operatorTypeFilter} onValueChange={(value) => { setOperatorTypeFilter(value); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="운영유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 운영유형</SelectItem>
            {operatorTypes.map((code) => (
              <SelectItem key={code.id} value={code.codeValue}>
                {code.displayNameKo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState message="시스템 인스턴스를 불러오는 중..." />
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {search || selectedCustomerId || selectedSiteId || selectedCatalogId || selectedOperatorType ? '검색 결과가 없습니다.' : '등록된 시스템 인스턴스가 없습니다.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">코드</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">인스턴스명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">시스템종류</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">고객사</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">사이트</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">운영유형</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">운영담당</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">정렬</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">상태</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const depth = depthMap.get(item.instanceCode) ?? 0;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.instanceCode}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">{'\u00A0'.repeat(depth * 4)}</span>
                        <span className={cn(depth > 0 && 'text-gray-700')}>{item.instanceName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{catalogNameMap.get(item.systemCatalogId) ?? item.systemCatalogId}</td>
                    <td className="px-4 py-2.5">{customerNameMap.get(item.customerId) ?? item.customerId}</td>
                    <td className="px-4 py-2.5">{siteNameMap.get(item.siteId) ?? item.siteId}</td>
                    <td className="px-4 py-2.5">{item.operatorType ? (operatorTypeNameMap.get(item.operatorType) ?? item.operatorType) : '-'}</td>
                    <td className="px-4 py-2.5">{item.operatorUserId ? (userNameMap.get(item.operatorUserId) ?? item.operatorUserId) : '-'}</td>
                    <td className="px-4 py-2.5 text-center">{item.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600',
                        )}
                      >
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
          <p className="text-sm text-muted-foreground">페이지 {page} / {totalPages}</p>
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '시스템 인스턴스 추가' : '시스템 인스턴스 수정'}</DialogTitle>
            <DialogDescription>고객/사이트별 시스템 인스턴스를 관리합니다.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">인스턴스 코드</label>
              <Input value={formData.instanceCode} onChange={(e) => updateField('instanceCode', e.target.value)} disabled={formMode === 'edit'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">인스턴스명</label>
              <Input value={formData.instanceName} onChange={(e) => updateField('instanceName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">고객사</label>
              <Select
                value={formData.customerId || '__empty__'}
                onValueChange={(value) => {
                  updateField('customerId', value === '__empty__' ? '' : value);
                  updateField('siteId', '');
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
              <label className="text-sm font-medium">사이트</label>
              <Select
                value={formData.siteId || '__empty__'}
                onValueChange={(value) => {
                  updateField('siteId', value === '__empty__' ? '' : value);
                  updateField('parentCode', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="사이트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택</SelectItem>
                  {availableSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">시스템 종류</label>
              <Select value={formData.systemCatalogId || '__empty__'} onValueChange={(value) => updateField('systemCatalogId', value === '__empty__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="시스템 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택</SelectItem>
                  {catalogs.map((catalog) => (
                    <SelectItem key={catalog.id} value={catalog.id}>
                      {'\u00A0'.repeat((catalogDepthMap.get(catalog.catalogCode) ?? 0) * 4)}
                      {catalog.catalogName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">부모 인스턴스</label>
              <Select
                value={formData.parentCode || '__empty__'}
                onValueChange={(value) => updateField('parentCode', value === '__empty__' ? '' : value)}
                disabled={!currentCustomerId || !currentSiteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="부모 인스턴스 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">없음</SelectItem>
                  {parentCandidates.map((candidate) => {
                    const depth = depthMap.get(candidate.instanceCode) ?? 0;
                    return (
                      <SelectItem key={candidate.id} value={candidate.instanceCode}>
                        {'\u00A0'.repeat(depth * 4)}
                        {candidate.instanceCode} - {candidate.instanceName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">운영유형</label>
              <Select value={formData.operatorType || '__empty__'} onValueChange={(value) => updateField('operatorType', value === '__empty__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="운영유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택 안 함</SelectItem>
                  {operatorTypes.map((code) => (
                    <SelectItem key={code.id} value={code.codeValue}>
                      {code.displayNameKo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">운영담당</label>
              <Select value={formData.operatorUserId || '__empty__'} onValueChange={(value) => updateField('operatorUserId', value === '__empty__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="운영담당 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">선택 안 함</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName || user.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">정렬 순서</label>
              <Input type="number" value={formData.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">버전</label>
              <Input value={formData.version} onChange={(e) => updateField('version', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">메모</label>
              <Input value={formData.memo} onChange={(e) => updateField('memo', e.target.value)} />
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
