'use client';

import { useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { useAddCareer } from '@/hooks/queries/useProfiles';

interface AddCareerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  projectName: '',
  roleName: '',
  companyName: '',
  startDate: '',
  endDate: '',
};

export function AddCareerDialog({
  open,
  onOpenChange,
}: AddCareerDialogProps) {
  const [form, setForm] = useState(initialForm);
  const addCareer = useAddCareer();

  const handleChange =
    (field: keyof typeof initialForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async () => {
    if (!form.projectName || !form.roleName || !form.startDate) {
      toast.error('필수 항목을 입력하세요.');
      return;
    }

    try {
      await addCareer.mutateAsync({
        projectName: form.projectName,
        roleName: form.roleName,
        companyName: form.companyName || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      });
      toast.success('경력을 추가했습니다.');
      setForm(initialForm);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '경력 추가에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>경력 추가</DialogTitle>
          <DialogDescription>
            프로젝트 이력을 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="career-project-name">프로젝트명</Label>
            <Input
              id="career-project-name"
              value={form.projectName}
              onChange={handleChange('projectName')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="career-role-name">역할명</Label>
            <Input
              id="career-role-name"
              value={form.roleName}
              onChange={handleChange('roleName')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="career-company-name">회사명</Label>
            <Input
              id="career-company-name"
              value={form.companyName}
              onChange={handleChange('companyName')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="career-start-date">시작일</Label>
            <Input
              id="career-start-date"
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="career-end-date">종료일</Label>
            <Input
              id="career-end-date"
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={addCareer.isPending}>
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
