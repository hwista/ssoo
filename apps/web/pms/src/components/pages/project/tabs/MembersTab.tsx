'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useProjectAccess, useProjectMembers, useAddMember, useRemoveMember } from '@/hooks/queries/useProjects';
import { useCodesByGroup } from '@/hooks/queries/useCodes';
import type { ProjectMember } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const PROJECT_MEMBER_ROLE_GROUP = 'PROJECT_MEMBER_ROLE';
const DEFAULT_ROLE_CODE = 'developer';

const DEFAULT_ROLE_OPTIONS = [
  { code: 'pm', label: 'PM' },
  { code: 'pmo', label: 'PMO' },
  { code: 'am', label: '영업담당' },
  { code: 'sm', label: 'SM담당' },
  { code: 'developer', label: '개발자' },
  { code: 'consultant', label: '컨설턴트' },
  { code: 'architect', label: '아키텍트' },
  { code: 'qa', label: '품질관리' },
  { code: 'reviewer', label: '검수자' },
  { code: 'customer_rep', label: '고객대표' },
] as const;

const ACCESS_LEVEL_OPTIONS = [
  { value: 'owner', label: '소유' },
  { value: 'participant', label: '참여' },
  { value: 'contributor', label: '기여' },
] as const;

const ACCESS_LEVEL_LABELS: Record<(typeof ACCESS_LEVEL_OPTIONS)[number]['value'], string> = {
  owner: '소유',
  participant: '참여',
  contributor: '기여',
};

type MemberAccessLevel = (typeof ACCESS_LEVEL_OPTIONS)[number]['value'];

interface MemberFormState {
  userId: string;
  roleCode: string;
  accessLevel: MemberAccessLevel;
  isPhaseOwner: boolean;
  allocationRate: number;
}

const createInitialForm = (roleCode = DEFAULT_ROLE_CODE): MemberFormState => ({
  userId: '',
  roleCode,
  accessLevel: 'participant',
  isPhaseOwner: false,
  allocationRate: 100,
});

interface Props {
  projectId: number;
}

export function MembersTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data, isLoading } = useProjectMembers(projectId);
  const members = data?.data ?? [];
  const canManageMembers = accessResponse?.data?.features.canManageMembers ?? false;
  const { data: roleCodesResponse } = useCodesByGroup(PROJECT_MEMBER_ROLE_GROUP);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(createInitialForm());
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  const roleOptions = useMemo(() => {
    const apiOptions = roleCodesResponse?.success && roleCodesResponse.data?.length
      ? roleCodesResponse.data.map((code) => ({
          code: code.codeValue,
          label: code.displayNameKo,
        }))
      : [];

    return apiOptions.length > 0 ? apiOptions : [...DEFAULT_ROLE_OPTIONS];
  }, [roleCodesResponse]);

  const roleLabels = useMemo(
    () => roleOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.code] = option.label;
      return acc;
    }, {}),
    [roleOptions],
  );

  useEffect(() => {
    if (roleOptions.length === 0) {
      return;
    }

    if (!roleOptions.some((option) => option.code === formData.roleCode)) {
      setFormData((prev) => ({
        ...prev,
        roleCode: roleOptions[0]?.code ?? DEFAULT_ROLE_CODE,
      }));
    }
  }, [formData.roleCode, roleOptions]);

  const handleAdd = async () => {
    await addMember.mutateAsync({
      projectId,
        data: {
          userId: formData.userId,
          roleCode: formData.roleCode,
          accessLevel: formData.accessLevel,
          isPhaseOwner: formData.isPhaseOwner,
          allocationRate: formData.allocationRate,
        },
      });
    setShowAddDialog(false);
    setFormData(createInitialForm(roleOptions[0]?.code ?? DEFAULT_ROLE_CODE));
  };

  const handleRemove = async (userId: string, roleCode: string) => {
    await removeMember.mutateAsync({ projectId, userId, roleCode });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          프로젝트 멤버 ({members.length})
        </h3>
        {canManageMembers && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            멤버 추가
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 멤버가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">이름</th>
                  <th className="text-left p-3 font-medium">역할</th>
                  <th className="text-left p-3 font-medium">권한등급</th>
                  <th className="text-center p-3 font-medium">Phase 담당</th>
                  <th className="text-left p-3 font-medium">부서</th>
                  <th className="text-center p-3 font-medium">투입률</th>
                  <th className="text-left p-3 font-medium">배정일</th>
                <th className="text-center p-3 font-medium w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m: ProjectMember) => (
                <tr key={`${m.userId}-${m.roleCode}`} className="hover:bg-muted/30">
                  <td className="p-3">{m.user?.displayName || m.user?.userName || '-'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {roleLabels[m.roleCode] || m.roleCode}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {ACCESS_LEVEL_LABELS[m.accessLevel]}
                    </span>
                  </td>
                  <td className="p-3 text-center">{m.isPhaseOwner ? '예' : '-'}</td>
                  <td className="p-3 text-muted-foreground">{m.user?.departmentCode || '-'}</td>
                  <td className="p-3 text-center">{m.allocationRate}%</td>
                  <td className="p-3 text-muted-foreground">
                    {m.assignedAt ? new Date(m.assignedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {canManageMembers ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={removeMember.isPending}
                        onClick={() => handleRemove(String(m.userId), m.roleCode)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
              <label className="text-sm font-medium">사용자 ID</label>
              <Input
                placeholder="사용자 ID를 입력하세요"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">역할</label>
              <Select
                value={formData.roleCode}
                onValueChange={(value) => setFormData({ ...formData, roleCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">권한 등급</label>
              <Select
                value={formData.accessLevel}
                onValueChange={(value: MemberAccessLevel) =>
                  setFormData({ ...formData, accessLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id="phase-owner"
                checked={formData.isPhaseOwner}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPhaseOwner: checked === true })
                }
              />
              <label htmlFor="phase-owner" className="text-sm font-medium">
                현재 phase 담당자로 지정
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">투입률 (%)</label>
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
              disabled={!formData.userId.trim() || addMember.isPending || !canManageMembers}
            >
              {addMember.isPending ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
