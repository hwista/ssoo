'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import {
  useAddMember,
  useProjectAccess,
  useProjectMembers,
  useProjectMemberUserLookup,
  useRemoveMember,
} from '@/hooks/queries/useProjects';
import { useCodesByGroup } from '@/hooks/queries/useCodes';
import type { CodeItem } from '@/lib/api/endpoints/codes';
import type { ProjectMember } from '@/lib/api/endpoints/projects';
import { formatPmsDate } from '@/lib/pms-format';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SsooSearchInput } from '@ssoo/web-shell';

const PROJECT_MEMBER_ROLE_GROUP = 'PROJECT_MEMBER_ROLE';

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
  roleCode: string;
  accessLevel: MemberAccessLevel;
  isPhaseOwner: boolean;
  allocationRate: number;
}

interface RoleOption {
  code: string;
  label: string;
}

const createInitialForm = (roleCode = ''): MemberFormState => ({
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
  const {
    data: roleCodesResponse,
    isLoading: isLoadingRoleCodes,
    isError: isRoleCodesError,
    error: roleCodesError,
    refetch: refetchRoleCodes,
  } = useCodesByGroup(PROJECT_MEMBER_ROLE_GROUP);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState(createInitialForm());
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const {
    data: userLookupResponse,
    isLoading: isLoadingUserLookup,
    isError: isUserLookupError,
    error: userLookupError,
    refetch: refetchUserLookup,
  } = useProjectMemberUserLookup(
    projectId,
    { search: userSearch, limit: 20 },
    { enabled: showAddDialog && canManageMembers },
  );

  const roleOptions = useMemo<RoleOption[]>(() => {
    if (!roleCodesResponse?.success) {
      return [];
    }

    return (roleCodesResponse.data ?? [])
      .filter((code: CodeItem) => code.isActive)
      .map((code: CodeItem) => ({
        code: code.codeValue,
        label: code.displayNameKo,
      }));
  }, [roleCodesResponse]);

  const roleLabels = useMemo(
    () => roleOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.code] = option.label;
      return acc;
    }, {}),
    [roleOptions],
  );

  const hasRoleOptions = roleOptions.length > 0;
  const userOptions = userLookupResponse?.data ?? [];
  const selectedUser = userOptions.find((user) => user.userId === selectedUserId);
  const canOpenAddDialog = canManageMembers && !isLoadingRoleCodes && hasRoleOptions;
  const roleCodeStatusMessage = isRoleCodesError
    ? `역할 코드를 불러오지 못했습니다: ${roleCodesError?.message ?? '알 수 없는 오류'}`
    : !isLoadingRoleCodes && !hasRoleOptions
      ? '프로젝트 멤버 역할 코드가 없습니다. 코드 관리에서 PROJECT_MEMBER_ROLE 그룹을 먼저 활성화하세요.'
      : null;

  useEffect(() => {
    if (!hasRoleOptions) {
      return;
    }

    if (!roleOptions.some((option) => option.code === formData.roleCode)) {
      setFormData((prev) => ({
        ...prev,
        roleCode: roleOptions[0]?.code ?? '',
      }));
    }
  }, [formData.roleCode, hasRoleOptions, roleOptions]);

  const handleAdd = async () => {
    if (!canManageMembers || !selectedUserId || !formData.roleCode || !hasRoleOptions) {
      return;
    }

    await addMember.mutateAsync({
      projectId,
      data: {
        userId: selectedUserId,
        roleCode: formData.roleCode,
        organizationId: selectedUser?.primaryOrganizationId ?? undefined,
        accessLevel: formData.accessLevel,
        isPhaseOwner: formData.isPhaseOwner,
        allocationRate: formData.allocationRate,
      },
    });
    setShowAddDialog(false);
    setUserSearch('');
    setSelectedUserId('');
    setFormData(createInitialForm(roleOptions[0]?.code ?? ''));
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
          <Button
            size="sm"
            disabled={!canOpenAddDialog}
            onClick={() => {
              setFormData(createInitialForm(roleOptions[0]?.code ?? ''));
              setUserSearch('');
              setSelectedUserId('');
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4" />
            멤버 추가
          </Button>
        )}
      </div>

      {canManageMembers && roleCodeStatusMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-sm text-ssoo-warning">
          <span>{roleCodeStatusMessage}</span>
          {isRoleCodesError && (
            <Button variant="outline" size="sm" onClick={() => refetchRoleCodes()}>
              다시 시도
            </Button>
          )}
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 멤버가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-left p-3 font-medium">이름</TableHead>
                  <TableHead className="text-left p-3 font-medium">역할</TableHead>
                  <TableHead className="text-left p-3 font-medium">권한등급</TableHead>
                  <TableHead className="text-center p-3 font-medium">Phase 담당</TableHead>
                  <TableHead className="text-left p-3 font-medium">부서</TableHead>
                  <TableHead className="text-center p-3 font-medium">투입률</TableHead>
                  <TableHead className="text-left p-3 font-medium">배정일</TableHead>
                <TableHead className="text-center p-3 font-medium w-16">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {members.map((m: ProjectMember) => (
                <TableRow key={`${m.userId}-${m.roleCode}`} className="hover:bg-muted/30">
                  <TableCell className="p-3">{m.user?.displayName || m.user?.userName || '-'}</TableCell>
                  <TableCell className="p-3">
                    <span className="inline-flex items-center rounded-full bg-ssoo-info-bg px-2 py-0.5 text-xs font-medium text-ssoo-info">
                      {roleLabels[m.roleCode] || m.roleCode}
                    </span>
                  </TableCell>
                  <TableCell className="p-3">
                    <span className="inline-flex items-center rounded-full bg-ssoo-success-bg px-2 py-0.5 text-xs font-medium text-ssoo-success">
                      {ACCESS_LEVEL_LABELS[m.accessLevel]}
                    </span>
                  </TableCell>
                  <TableCell className="p-3 text-center">{m.isPhaseOwner ? '예' : '-'}</TableCell>
                  <TableCell className="p-3 text-muted-foreground">{m.user?.departmentCode || '-'}</TableCell>
                  <TableCell className="p-3 text-center">{m.allocationRate}%</TableCell>
                  <TableCell className="p-3 text-muted-foreground">
                    {formatPmsDate(m.assignedAt)}
                  </TableCell>
                  <TableCell className="p-3 text-center">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <label className="text-sm font-medium">사용자 검색</label>
              <SsooSearchInput
                id="pms-project-member-lookup-input"
                name="pms-project-member-lookup-query"
                ariaLabel="프로젝트 멤버 사용자 검색"
                intent="entity-lookup"
                placeholder="이름, 로그인 ID, 이메일"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setSelectedUserId('');
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">추가할 사용자</label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isLoadingUserLookup || userOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingUserLookup ? '조회 중...' : '사용자 선택'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      조회 결과 없음
                    </SelectItem>
                  ) : (
                    userOptions.map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        {(user.displayName || user.userName)}
                        {user.loginId ? ` · ${user.loginId}` : ''}
                        {user.primaryOrganizationName ? ` · ${user.primaryOrganizationName}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {isUserLookupError ? (
                <SsooErrorNotice className="gap-3 px-3 py-2">
                  <span>{userLookupError?.message ?? '사용자 목록을 불러오지 못했습니다.'}</span>
                  <Button variant="outline" size="sm" onClick={() => refetchUserLookup()}>
                    다시 시도
                  </Button>
                </SsooErrorNotice>
              ) : selectedUser ? (
                <p className="text-xs text-muted-foreground">
                  {[selectedUser.email, selectedUser.primaryOrganizationName, selectedUser.departmentCode]
                    .filter(Boolean)
                    .join(' · ') || '소속 정보 없음'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  활성 공용 사용자 조회 결과에서 프로젝트 멤버를 선택합니다.
                </p>
              )}
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
              disabled={
                !selectedUserId
                || !formData.roleCode
                || addMember.isPending
                || !canManageMembers
                || !hasRoleOptions
              }
            >
              {addMember.isPending ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
