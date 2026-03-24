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
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import {
  useCreateSystemCatalog,
  useDeactivateSystemCatalog,
  useSystemCatalogList,
  useSystemCatalogTree,
  useUpdateSystemCatalog,
} from '@/hooks/queries/useSystemCatalogs';
import type {
  CreateSystemCatalogRequest,
  SystemCatalogItem,
  UpdateSystemCatalogRequest,
} from '@/lib/api/endpoints/systemCatalogs';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface SystemCatalogFormData {
  catalogCode: string;
  catalogName: string;
  parentCode: string;
  sortOrder: number;
  description: string;
  memo: string;
}

const INITIAL_FORM: SystemCatalogFormData = {
  catalogCode: '',
  catalogName: '',
  parentCode: '',
  sortOrder: 0,
  description: '',
  memo: '',
};

function buildDepthMap(items: SystemCatalogItem[]) {
  const map = new Map(items.map((item) => [item.catalogCode, item]));
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
    getDepth(item.catalogCode);
  }

  return depthMap;
}

function buildDescendantSet(items: SystemCatalogItem[], rootCode: string) {
  const byParent = new Map<string, SystemCatalogItem[]>();
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
    if (!current || descendants.has(current.catalogCode)) continue;
    descendants.add(current.catalogCode);
    queue.push(...(byParent.get(current.catalogCode) ?? []));
  }

  return descendants;
}

export function SystemCatalogManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemCatalogFormData>(INITIAL_FORM);

  const { data: listResponse, isLoading, error, refetch } = useSystemCatalogList({
    page,
    pageSize,
    search: search || undefined,
  });
  const { data: treeResponse } = useSystemCatalogTree();

  const createMutation = useCreateSystemCatalog();
  const updateMutation = useUpdateSystemCatalog();
  const deactivateMutation = useDeactivateSystemCatalog();

  const items = useMemo(() => listResponse?.data?.items ?? [], [listResponse]);
  const treeItems = useMemo(() => treeResponse?.data ?? [], [treeResponse]);
  const totalPages = listResponse?.data?.totalPages ?? 0;
  const depthMap = useMemo(() => buildDepthMap(treeItems), [treeItems]);
  const editingItem = useMemo(
    () => treeItems.find((item) => item.id === editingId) ?? null,
    [treeItems, editingId],
  );

  const parentCandidates = useMemo(() => {
    if (!editingItem) return treeItems;
    const excluded = buildDescendantSet(treeItems, editingItem.catalogCode);
    excluded.add(editingItem.catalogCode);
    return treeItems.filter((item) => !excluded.has(item.catalogCode));
  }, [treeItems, editingItem]);

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

  const handleOpenEdit = useCallback((item: SystemCatalogItem) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormData({
      catalogCode: item.catalogCode,
      catalogName: item.catalogName,
      parentCode: item.parentCode ?? '',
      sortOrder: item.sortOrder,
      description: item.description ?? '',
      memo: item.memo ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((item: SystemCatalogItem) => {
    if (!confirm(`"${item.catalogName}" 카탈로그를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(item.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateSystemCatalogRequest = {
        catalogCode: formData.catalogCode,
        catalogName: formData.catalogName,
        ...(formData.parentCode && { parentCode: formData.parentCode }),
        sortOrder: formData.sortOrder,
        ...(formData.description && { description: formData.description }),
        ...(formData.memo && { memo: formData.memo }),
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateSystemCatalogRequest = {
        catalogName: formData.catalogName,
        parentCode: formData.parentCode || undefined,
        sortOrder: formData.sortOrder,
        description: formData.description || undefined,
        memo: formData.memo || undefined,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [createMutation, editingId, formData, formMode, updateMutation]);

  const updateField = useCallback(<K extends keyof SystemCatalogFormData>(field: K, value: SystemCatalogFormData[K]) => {
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
          <h1 className="text-lg font-semibold">시스템 카탈로그 관리</h1>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          카탈로그 추가
        </Button>
      </div>

      <div className="px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-2 max-w-md">
          <Input
            placeholder="카탈로그명 또는 코드 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState message="시스템 카탈로그를 불러오는 중..." />
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {search ? '검색 결과가 없습니다.' : '등록된 시스템 카탈로그가 없습니다.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">코드</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">카탈로그명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">부모</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">정렬</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">상태</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const depth = depthMap.get(item.catalogCode) ?? 0;

                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.catalogCode}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">
                        {'\u00A0'.repeat(depth * 4)}
                        {item.catalogName}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.parentCode ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">{item.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {item.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(item)}
                          disabled={!item.isActive}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
        <div className="flex items-center justify-center gap-2 px-6 py-3 border-t bg-white">
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => prev - 1)} disabled={page <= 1}>
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={page >= totalPages}
          >
            다음
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '시스템 카탈로그 추가' : '시스템 카탈로그 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 시스템 카탈로그를 추가합니다.' : '시스템 카탈로그 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">카탈로그 코드</label>
                <Input
                  value={formData.catalogCode}
                  onChange={(e) => updateField('catalogCode', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="MES"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">카탈로그명</label>
                <Input
                  value={formData.catalogName}
                  onChange={(e) => updateField('catalogName', e.target.value)}
                  placeholder="Manufacturing Execution System"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">부모 카탈로그</label>
                <Select
                  value={formData.parentCode || '__none__'}
                  onValueChange={(value) => updateField('parentCode', value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상위 카탈로그 없음" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">없음</SelectItem>
                    {parentCandidates.map((candidate) => {
                      const depth = depthMap.get(candidate.catalogCode) ?? 0;
                      return (
                        <SelectItem key={candidate.id} value={candidate.catalogCode}>
                          {'\u00A0'.repeat(depth * 2)}
                          {candidate.catalogCode} - {candidate.catalogName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <label className="text-sm font-medium mb-1.5 block">정렬 순서</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => updateField('sortOrder', parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="카탈로그 설명"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">메모</label>
              <Input
                value={formData.memo}
                onChange={(e) => updateField('memo', e.target.value)}
                placeholder="메모"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? '처리 중...' : formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
