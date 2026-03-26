'use client';

import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useProjectMembers, useAddMember, useRemoveMember } from '@/hooks/queries/useProjects';
import type { ProjectMember } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLE_LABELS: Record<string, string> = {
  pm: 'PM',
  pmo: 'PMO',
  am: '영업담당',
  sm: 'SM담당',
  developer: '개발자',
  consultant: '컨설턴트',
  architect: '아키텍트',
  qa: '품질관리',
  reviewer: '검수자',
  customer_rep: '고객대표',
};

const INITIAL_FORM = { userId: '', roleCode: 'developer', allocationRate: 100 };

interface Props {
  projectId: number;
}

export function MembersTab({ projectId }: Props) {
  const { data, isLoading } = useProjectMembers(projectId);
  const members = data?.data ?? [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  const handleAdd = async () => {
    await addMember.mutateAsync({
      projectId,
      data: {
        userId: formData.userId,
        roleCode: formData.roleCode,
        allocationRate: formData.allocationRate,
      },
    });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleRemove = async (userId: string, roleCode: string) => {
    await removeMember.mutateAsync({ projectId, userId, roleCode });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-label-strong flex items-center gap-2">
          <Users className="h-4 w-4" />
          프로젝트 멤버 ({members.length})
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          멤버 추가
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-body-sm text-muted-foreground py-8 text-center">
          아직 등록된 멤버가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-label-md">이름</th>
                <th className="text-left p-3 text-label-md">역할</th>
                <th className="text-left p-3 text-label-md">부서</th>
                <th className="text-center p-3 text-label-md">투입률</th>
                <th className="text-left p-3 text-label-md">배정일</th>
                <th className="text-center p-3 text-label-md w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m: ProjectMember) => (
                <tr key={`${m.userId}-${m.roleCode}`} className="hover:bg-muted/30">
                  <td className="p-3">{m.user?.displayName || m.user?.userName || '-'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-label-sm text-blue-700">
                      {ROLE_LABELS[m.roleCode] || m.roleCode}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{m.user?.departmentCode || '-'}</td>
                  <td className="p-3 text-center">{m.allocationRate}%</td>
                  <td className="p-3 text-muted-foreground">
                    {m.assignedAt ? new Date(m.assignedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removeMember.isPending}
                      onClick={() => handleRemove(String(m.userId), m.roleCode)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>멤버 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 멤버를 배정합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-label-md">사용자 ID</label>
              <Input
                placeholder="사용자 ID를 입력하세요"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-label-md">역할</label>
              <Select
                value={formData.roleCode}
                onValueChange={(value) => setFormData({ ...formData, roleCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-label-md">투입률 (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.allocationRate}
                onChange={(e) =>
                  setFormData({ ...formData, allocationRate: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.userId.trim() || addMember.isPending}
            >
              {addMember.isPending ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
