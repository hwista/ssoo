'use client';

import { useState, useCallback } from 'react';
import { Network, Plus, Pencil, Trash2 } from 'lucide-react';
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
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from '@/hooks/queries/useCodes';
import type { CodeItem, CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';
import { cn } from '@/lib/utils';

const DEPT_GROUP = 'USER_DEPARTMENT';

type FormMode = 'create' | 'edit';

interface DeptFormData {
  codeValue: string;
  displayNameKo: string;
  displayNameEn: string;
  description: string;
  sortOrder: number;
}

const INITIAL_FORM: DeptFormData = {
  codeValue: '',
  displayNameKo: '',
  displayNameEn: '',
  description: '',
  sortOrder: 0,
};

export function DeptManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DeptFormData>(INITIAL_FORM);

  const { data: codesResponse, isLoading, error, refetch } = useCodesByGroup(DEPT_GROUP);
  const createMutation = useCreateCode();
  const updateMutation = useUpdateCode();
  const deactivateMutation = useDeactivateCode();

  const departments = codesResponse?.data ?? [];

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((dept: CodeItem) => {
    setFormMode('edit');
    setEditingId(dept.id);
    setFormData({
      codeValue: dept.codeValue,
      displayNameKo: dept.displayNameKo,
      displayNameEn: dept.displayNameEn ?? '',
      description: dept.description ?? '',
      sortOrder: dept.sortOrder,
    });
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback((dept: CodeItem) => {
    if (!confirm(`"${dept.displayNameKo}" 부서를 비활성화하시겠습니까?`)) return;
    deactivateMutation.mutate(dept.id);
  }, [deactivateMutation]);

  const handleSubmit = useCallback(() => {
    if (formMode === 'create') {
      const req: CreateCodeRequest = {
        codeGroup: DEPT_GROUP,
        codeValue: formData.codeValue,
        displayNameKo: formData.displayNameKo,
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
        sortOrder: formData.sortOrder,
      };
      updateMutation.mutate({ id: editingId, data: req }, { onSuccess: () => setDialogOpen(false) });
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(<K extends keyof DeptFormData>(field: K, value: DeptFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <LoadingState message="부서 목록을 불러오는 중..." fullHeight />;
  }

  if (error) {
    return <ErrorState error={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">부서 관리</h1>
            <p className="text-sm text-muted-foreground">부서 코드를 관리합니다</p>
          </div>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Network className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">등록된 부서가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">부서코드</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">부서명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">부서명(영문)</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">설명</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">정렬순서</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">상태</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">액션</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{dept.codeValue}</td>
                  <td className="px-4 py-2.5">{dept.displayNameKo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{dept.displayNameEn ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{dept.description ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center">{dept.sortOrder}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      dept.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500',
                    )}>
                      {dept.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(dept)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(dept)}
                        disabled={!dept.isActive}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '부서 추가' : '부서 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 부서를 추가합니다.' : '부서 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">부서코드</label>
                <Input
                  value={formData.codeValue}
                  onChange={(e) => updateField('codeValue', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="DEV, QA, PM 등"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">부서명</label>
                <Input
                  value={formData.displayNameKo}
                  onChange={(e) => updateField('displayNameKo', e.target.value)}
                  placeholder="개발팀"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">부서명(영문)</label>
                <Input
                  value={formData.displayNameEn}
                  onChange={(e) => updateField('displayNameEn', e.target.value)}
                  placeholder="Development (선택)"
                />
              </div>
              <div className="w-32">
                <label className="text-sm font-medium mb-1.5 block">정렬순서</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="부서 설명 (선택)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? '처리 중...' : formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
