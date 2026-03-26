'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Database } from 'lucide-react';
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
  useCodeGroups,
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from '@/hooks/queries/useCodes';
import type { CodeItem, CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';
import { cn } from '@/lib/utils';

type FormMode = 'create' | 'edit';

interface CodeFormData {
  codeGroup: string;
  codeValue: string;
  parentCode: string;
  displayNameKo: string;
  displayNameEn: string;
  description: string;
  sortOrder: number;
}

const INITIAL_FORM: CodeFormData = {
  codeGroup: '',
  codeValue: '',
  parentCode: '',
  displayNameKo: '',
  displayNameEn: '',
  description: '',
  sortOrder: 0,
};

export function CodeManagementPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CodeFormData>(INITIAL_FORM);

  const { data: groupsResponse, isLoading: groupsLoading, error: groupsError, refetch: refetchGroups } = useCodeGroups();
  const { data: codesResponse, isLoading: codesLoading } = useCodesByGroup(selectedGroup);

  const createMutation = useCreateCode();
  const updateMutation = useUpdateCode();
  const deactivateMutation = useDeactivateCode();

  const groups = groupsResponse?.data ?? [];
  const codes = codesResponse?.data ?? [];

  const handleGroupClick = useCallback((codeGroup: string) => {
    setSelectedGroup(codeGroup);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData({ ...INITIAL_FORM, codeGroup: selectedGroup });
    setDialogOpen(true);
  }, [selectedGroup]);

  const handleOpenEdit = useCallback((code: CodeItem) => {
    setFormMode('edit');
    setEditingId(code.id);
    setFormData({
      codeGroup: code.codeGroup,
      codeValue: code.codeValue,
      parentCode: code.parentCode ?? '',
      displayNameKo: code.displayNameKo,
      displayNameEn: code.displayNameEn ?? '',
      description: code.description ?? '',
      sortOrder: code.sortOrder,
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((code: CodeItem) => {
    if (!confirm(`"${code.displayNameKo}" 코드를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(code.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateCodeRequest = {
        codeGroup: formData.codeGroup,
        codeValue: formData.codeValue,
        displayNameKo: formData.displayNameKo,
        ...(formData.parentCode && { parentCode: formData.parentCode }),
        ...(formData.displayNameEn && { displayNameEn: formData.displayNameEn }),
        ...(formData.description && { description: formData.description }),
        sortOrder: formData.sortOrder,
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false) });
    } else if (editingId) {
      const req: UpdateCodeRequest = {
        displayNameKo: formData.displayNameKo,
        displayNameEn: formData.displayNameEn || undefined,
        description: formData.description || undefined,
        parentCode: formData.parentCode || undefined,
        sortOrder: formData.sortOrder,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(<K extends keyof CodeFormData>(field: K, value: CodeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (groupsLoading) {
    return <LoadingState message="코드 그룹을 불러오는 중..." fullHeight />;
  }

  if (groupsError) {
    return <ErrorState error={groupsError.message} onRetry={() => refetchGroups()} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-title-card">코드 관리</h1>
        </div>
      </div>

      {/* Content: 2-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Code Groups */}
        <div className="w-72 border-r bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b bg-white">
            <h2 className="text-label-md text-muted-foreground">코드 그룹</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {groups.length === 0 ? (
              <p className="p-4 text-body-sm text-muted-foreground">등록된 코드 그룹이 없습니다.</p>
            ) : (
              <ul className="py-1">
                {groups.map((g) => (
                  <li key={g.codeGroup}>
                    <button
                      onClick={() => handleGroupClick(g.codeGroup)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-body-sm flex items-center justify-between transition-colors',
                        selectedGroup === g.codeGroup
                          ? 'bg-ssoo-primary/10 text-ssoo-primary text-label-md'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <span className="truncate">{g.codeGroup}</span>
                      <span className={cn(
                        'text-caption px-1.5 py-0.5 rounded-full',
                        selectedGroup === g.codeGroup
                          ? 'bg-ssoo-primary/20 text-ssoo-primary'
                          : 'bg-gray-200 text-gray-500',
                      )}>
                        {g.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Panel: Codes in selected group */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedGroup ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-body-sm">좌측에서 코드 그룹을 선택하세요.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                <h2 className="text-label-strong">{selectedGroup}</h2>
                <Button size="sm" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  코드 추가
                </Button>
              </div>

              <div className="flex-1 overflow-auto">
                {codesLoading ? (
                  <LoadingState message="코드 목록을 불러오는 중..." />
                ) : codes.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-body-sm text-muted-foreground">이 그룹에 등록된 코드가 없습니다.</p>
                  </div>
                ) : (
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">코드값</th>
                        <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">한국어명</th>
                        <th className="text-left px-4 py-2.5 text-label-md text-muted-foreground">영어명</th>
                        <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-20">정렬</th>
                        <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-20">상태</th>
                        <th className="text-center px-4 py-2.5 text-label-md text-muted-foreground w-24">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((code) => (
                        <tr key={code.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-code-line-number">{code.codeValue}</td>
                          <td className="px-4 py-2.5">{code.displayNameKo}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{code.displayNameEn ?? '-'}</td>
                          <td className="px-4 py-2.5 text-center">{code.sortOrder}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-label-sm',
                              code.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500',
                            )}>
                              {code.isActive ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(code)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivate(code)}
                                disabled={!code.isActive}
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
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '코드 추가' : '코드 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 코드를 추가합니다.' : '코드 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">코드 그룹</label>
                <Input
                  value={formData.codeGroup}
                  onChange={(e) => updateField('codeGroup', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="CODE_GROUP"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">코드 값</label>
                <Input
                  value={formData.codeValue}
                  onChange={(e) => updateField('codeValue', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="code_value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-md mb-1.5 block">한국어명</label>
                <Input
                  value={formData.displayNameKo}
                  onChange={(e) => updateField('displayNameKo', e.target.value)}
                  placeholder="표시 이름"
                />
              </div>
              <div>
                <label className="text-label-md mb-1.5 block">영어명</label>
                <Input
                  value={formData.displayNameEn}
                  onChange={(e) => updateField('displayNameEn', e.target.value)}
                  placeholder="Display Name"
                />
              </div>
            </div>

            <div>
              <label className="text-label-md mb-1.5 block">상위 코드</label>
              <Input
                value={formData.parentCode}
                onChange={(e) => updateField('parentCode', e.target.value)}
                placeholder="parent_code (선택)"
              />
            </div>

            <div>
              <label className="text-label-md mb-1.5 block">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="코드 설명 (선택)"
              />
            </div>

            <div className="w-32">
              <label className="text-label-md mb-1.5 block">정렬 순서</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
              />
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
              {createMutation.isPending || updateMutation.isPending ? '처리 중...' : formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
