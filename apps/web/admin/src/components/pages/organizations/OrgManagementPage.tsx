'use client';

import { useState, useCallback } from 'react';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from '@/hooks/queries/useCodes';
import type { CodeItem, CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';

const DEPT_GROUP = 'USER_DEPARTMENT';

type FormMode = 'create' | 'edit';

interface OrgFormData {
  codeValue: string;
  displayNameKo: string;
  displayNameEn: string;
  description: string;
  sortOrder: number;
}

const INITIAL_FORM: OrgFormData = {
  codeValue: '',
  displayNameKo: '',
  displayNameEn: '',
  description: '',
  sortOrder: 0,
};

export function OrgManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrgFormData>(INITIAL_FORM);

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

  const handleDeactivate = useCallback(
    (dept: CodeItem) => {
      if (!confirm(`"${dept.displayNameKo}" 조직을 비활성화하시겠습니까?`)) return;
      deactivateMutation.mutate(dept.id);
    },
    [deactivateMutation],
  );

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
      updateMutation.mutate(
        { id: editingId, data: req },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(
    <K extends keyof OrgFormData>(field: K, value: OrgFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">조직 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">부서 및 조직 코드를 관리합니다</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          조직 추가
        </Button>
      </div>

      {/* Table Card */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            로딩 중...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-destructive">목록을 불러오지 못했습니다.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Building2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">등록된 조직이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">조직코드</TableHead>
                <TableHead className="w-[150px]">조직명</TableHead>
                <TableHead className="w-[150px]">조직명(영문)</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[80px] text-center">정렬순서</TableHead>
                <TableHead className="w-[80px] text-center">상태</TableHead>
                <TableHead className="w-[100px] text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-mono text-xs">{dept.codeValue}</TableCell>
                  <TableCell>{dept.displayNameKo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dept.displayNameEn ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dept.description ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">{dept.sortOrder}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        dept.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {dept.isActive ? '활성' : '비활성'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(dept)}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeactivate(dept)}
                        disabled={!dept.isActive}
                        title="비활성화"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '조직 추가' : '조직 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 조직을 추가합니다.' : '조직 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직코드 *</label>
                <Input
                  value={formData.codeValue}
                  onChange={(e) => updateField('codeValue', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="DEV, QA, PM 등"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직명 *</label>
                <Input
                  value={formData.displayNameKo}
                  onChange={(e) => updateField('displayNameKo', e.target.value)}
                  placeholder="개발팀"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직명(영문)</label>
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
                placeholder="조직 설명 (선택)"
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
