'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Menu, ChevronRight, ChevronDown } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import {
  useMenuAdminList,
  useCreateMenu,
  useUpdateMenu,
  useDeactivateMenu,
} from '@/hooks/queries/useMenuAdmin';
import type {
  MenuAdminItem,
  CreateMenuAdminRequest,
  UpdateMenuAdminRequest,
} from '@/lib/api/endpoints/menusAdmin';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface MenuFormData {
  menuCode: string;
  menuName: string;
  menuNameEn: string;
  menuType: string;
  parentMenuId: string;
  menuPath: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  isAdminMenu: boolean;
  openType: string;
  description: string;
}

const INITIAL_FORM: MenuFormData = {
  menuCode: '',
  menuName: '',
  menuNameEn: '',
  menuType: 'menu',
  parentMenuId: '',
  menuPath: '',
  icon: '',
  sortOrder: 0,
  isVisible: true,
  isAdminMenu: false,
  openType: 'tab',
  description: '',
};

const MENU_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  group: { label: '그룹', color: 'bg-purple-100 text-purple-800' },
  menu: { label: '메뉴', color: 'bg-blue-100 text-blue-800' },
  action: { label: '액션', color: 'bg-amber-100 text-amber-800' },
};

/** 트리 구조 플랫 렌더링을 위해 부모-자식 순서로 정렬 */
function buildOrderedList(menus: MenuAdminItem[]): MenuAdminItem[] {
  const childrenMap = new Map<string | null, MenuAdminItem[]>();
  for (const m of menus) {
    const parentKey = m.parentMenuId ?? '__root__';
    const list = childrenMap.get(parentKey) ?? [];
    list.push(m);
    childrenMap.set(parentKey, list);
  }

  const result: MenuAdminItem[] = [];
  function walk(parentId: string | null) {
    const key = parentId ?? '__root__';
    const children = childrenMap.get(key);
    if (!children) return;
    children.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const child of children) {
      result.push(child);
      walk(child.id);
    }
  }
  walk(null);
  return result;
}

/** 접힘/펼침 상태에서 표시할 행 필터링 */
function getVisibleRows(
  ordered: MenuAdminItem[],
  collapsed: Set<string>,
): MenuAdminItem[] {
  const hiddenParents = new Set<string>();
  const visible: MenuAdminItem[] = [];

  for (const m of ordered) {
    if (m.parentMenuId && hiddenParents.has(m.parentMenuId)) {
      hiddenParents.add(m.id);
      continue;
    }
    visible.push(m);
    if (collapsed.has(m.id)) {
      hiddenParents.add(m.id);
    }
  }
  return visible;
}

export function MenuManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(INITIAL_FORM);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: menusResponse, isLoading, error, refetch } = useMenuAdminList();
  const createMutation = useCreateMenu();
  const updateMutation = useUpdateMenu();
  const deactivateMutation = useDeactivateMenu();

  const menus = menusResponse?.data ?? [];

  const orderedMenus = useMemo(() => buildOrderedList(menus), [menus]);

  const visibleMenus = useMemo(
    () => getVisibleRows(orderedMenus, collapsed),
    [orderedMenus, collapsed],
  );

  // 자식이 있는 메뉴 ID 집합
  const hasChildrenSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of menus) {
      if (m.parentMenuId) s.add(m.parentMenuId);
    }
    return s;
  }, [menus]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: MenuAdminItem) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormData({
      menuCode: item.menuCode,
      menuName: item.menuName,
      menuNameEn: item.menuNameEn ?? '',
      menuType: item.menuType,
      parentMenuId: item.parentMenuId ?? '',
      menuPath: item.menuPath ?? '',
      icon: item.icon ?? '',
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
      isAdminMenu: item.isAdminMenu,
      openType: item.openType,
      description: item.description ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback(
    (item: MenuAdminItem) => {
      if (!confirm(`"${item.menuName}" 메뉴를 비활성화하시겠습니까?\n하위 메뉴도 함께 비활성화됩니다.`)) return;
      deactivateMutation.mutate(item.id);
    },
    [deactivateMutation],
  );

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateMenuAdminRequest = {
        menuCode: formData.menuCode,
        menuName: formData.menuName,
        ...(formData.menuNameEn && { menuNameEn: formData.menuNameEn }),
        menuType: formData.menuType,
        ...(formData.parentMenuId && { parentMenuId: formData.parentMenuId }),
        ...(formData.menuPath && { menuPath: formData.menuPath }),
        ...(formData.icon && { icon: formData.icon }),
        sortOrder: formData.sortOrder,
        isVisible: formData.isVisible,
        isAdminMenu: formData.isAdminMenu,
        openType: formData.openType,
        ...(formData.description && { description: formData.description }),
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateMenuAdminRequest = {
        menuName: formData.menuName,
        menuNameEn: formData.menuNameEn || undefined,
        menuType: formData.menuType,
        parentMenuId: formData.parentMenuId || undefined,
        menuPath: formData.menuPath || undefined,
        icon: formData.icon || undefined,
        sortOrder: formData.sortOrder,
        isVisible: formData.isVisible,
        isAdminMenu: formData.isAdminMenu,
        openType: formData.openType,
        description: formData.description || undefined,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(<K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 부모 메뉴 후보 (group 타입만, 수정 시 자기 자신 제외)
  const parentCandidates = useMemo(
    () =>
      menus.filter(
        (m) => m.menuType === 'group' && m.id !== editingId,
      ),
    [menus, editingId],
  );

  if (isLoading) {
    return <LoadingState message="메뉴를 불러오는 중..." fullHeight />;
  }

  if (error) {
    return <ErrorState error={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Menu className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-title-card">메뉴 관리</h1>
          <span className="text-body-sm text-muted-foreground ml-2">
            총 {menus.length}개
          </span>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {menus.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-body-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b bg-gray-50 sticky top-0 z-10">
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground min-w-[240px]">메뉴명</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">메뉴코드</th>
                <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">경로</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-20">유형</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-24">관리자메뉴</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-20">표시</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-16">정렬</th>
                <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleMenus.map((item) => {
                const hasChildren = hasChildrenSet.has(item.id);
                const isCollapsed = collapsed.has(item.id);
                const indent = (item.menuLevel - 1) * 20;
                const typeInfo = MENU_TYPE_LABELS[item.menuType] ?? {
                  label: item.menuType,
                  color: 'bg-gray-100 text-gray-600',
                };

                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center" style={{ paddingLeft: indent }}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleCollapse(item.id)}
                            className="mr-1 p-0.5 rounded hover:bg-gray-200 transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="w-[22px] inline-block" />
                        )}
                        <span className={cn(item.menuLevel === 1 && 'text-label-md')}>
                          {item.menuName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-code-line-number text-muted-foreground">{item.menuCode}</td>
                    <td className="px-4 py-2.5 font-mono text-code-line-number text-muted-foreground">{item.menuPath ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-label-sm', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.isAdminMenu ? (
                        <span className="px-2 py-0.5 rounded text-label-sm bg-red-100 text-red-800">관리자</span>
                      ) : (
                        <span className="text-muted-foreground text-caption">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-label-sm',
                          item.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {item.isVisible ? '표시' : '숨김'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">{item.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(item)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '메뉴 추가' : '메뉴 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 메뉴를 추가합니다.' : '메뉴 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 메뉴코드, 메뉴명 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">메뉴 코드</label>
                <Input
                  value={formData.menuCode}
                  onChange={(e) => updateField('menuCode', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="menu.code"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">메뉴명</label>
                <Input
                  value={formData.menuName}
                  onChange={(e) => updateField('menuName', e.target.value)}
                  placeholder="메뉴 이름"
                />
              </div>
            </div>

            {/* 영문명, 유형 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">영문명</label>
                <Input
                  value={formData.menuNameEn}
                  onChange={(e) => updateField('menuNameEn', e.target.value)}
                  placeholder="Menu Name"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">유형</label>
                <Select value={formData.menuType} onValueChange={(v) => updateField('menuType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">그룹</SelectItem>
                    <SelectItem value="menu">메뉴</SelectItem>
                    <SelectItem value="action">액션</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 부모 메뉴, 경로 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">부모 메뉴</label>
                <Select
                  value={formData.parentMenuId || '__none__'}
                  onValueChange={(v) => updateField('parentMenuId', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="없음 (최상위)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">없음 (최상위)</SelectItem>
                    {parentCandidates.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.menuName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">경로</label>
                <Input
                  value={formData.menuPath}
                  onChange={(e) => updateField('menuPath', e.target.value)}
                  placeholder="/path"
                />
              </div>
            </div>

            {/* 아이콘, 정렬순서, 열기방식 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">아이콘</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => updateField('icon', e.target.value)}
                  placeholder="lucide 아이콘명"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">정렬 순서</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">열기 방식</label>
                <Select value={formData.openType} onValueChange={(v) => updateField('openType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tab">탭</SelectItem>
                    <SelectItem value="modal">모달</SelectItem>
                    <SelectItem value="external">외부</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="text-label-md mb-1.5 block">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="메뉴 설명 (선택)"
              />
            </div>

            {/* 체크박스 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-body-sm">
                <Checkbox
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => updateField('isVisible', checked === true)}
                />
                사이드바 표시
              </label>
              <label className="flex items-center gap-2 text-body-sm">
                <Checkbox
                  checked={formData.isAdminMenu}
                  onCheckedChange={(checked) => updateField('isAdminMenu', checked === true)}
                />
                관리자 전용
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
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
