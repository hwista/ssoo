'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Handshake, Send } from 'lucide-react';
import { useAuth } from '@/hooks';
import { useUserList } from '@/hooks/queries';
import { useCompleteHandoff, useConfirmHandoff, useCreateHandoff } from '@/hooks/queries/useProjects';
import type { CreateHandoffRequest, Project } from '@/lib/api/endpoints/projects';
import type { UserItem } from '@/lib/api/endpoints/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HANDOFF_TYPE_OPTIONS = [
  { value: 'PRE_TO_PM', label: '제안 → PM' },
  { value: 'PRE_TO_CONTRACT_OWNER', label: '제안 → 계약 담당' },
  { value: 'EXEC_TO_CONTRACT_OWNER', label: '수행 → 계약 이행 담당' },
  { value: 'EXEC_TO_SM', label: '수행 → SM' },
] as const;

interface HandoffSectionProps {
  projectId: number;
  project: Project;
  onHandoffChanged: () => void;
}

export function HandoffSection({ projectId, project, onHandoffChanged }: HandoffSectionProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateHandoffRequest>({
    handoffTypeCode: HANDOFF_TYPE_OPTIONS[0].value,
    handoffUserId: '',
  });

  const { data: usersResponse } = useUserList({ page: 1, limit: 100 });
  const createHandoff = useCreateHandoff();
  const confirmHandoff = useConfirmHandoff();
  const completeHandoff = useCompleteHandoff();

  const currentUserId = user?.userId ?? null;
  const users = useMemo(
    () => (usersResponse?.data ?? []).filter((candidate) => candidate.isActive),
    [usersResponse],
  );
  const handoffUser = useMemo(
    () => users.find((candidate) => candidate.id === String(project.handoffUserId)),
    [project.handoffUserId, users],
  );

  const canCreate =
    !!currentUserId &&
    String(project.currentOwnerUserId ?? '') === currentUserId &&
    (!project.handoffStatusCode || project.handoffStatusCode === 'done');
  const canConfirm =
    !!currentUserId &&
    project.handoffStatusCode === 'waiting' &&
    String(project.handoffUserId ?? '') === currentUserId;
  const canComplete =
    !!currentUserId &&
    project.handoffStatusCode === 'in_progress' &&
    String(project.handoffUserId ?? '') === currentUserId;

  const handleCreate = async () => {
    await createHandoff.mutateAsync({ id: projectId, data: formData });
    setDialogOpen(false);
    setFormData({ handoffTypeCode: HANDOFF_TYPE_OPTIONS[0].value, handoffUserId: '' });
    onHandoffChanged();
  };

  const handleConfirm = async () => {
    await confirmHandoff.mutateAsync(projectId);
    onHandoffChanged();
  };

  const handleComplete = async () => {
    await completeHandoff.mutateAsync(projectId);
    onHandoffChanged();
  };

  const renderStatus = () => {
    if (!project.handoffStatusCode || project.handoffStatusCode === 'done') {
      return (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">활성 핸드오프 없음</p>
            <p className="text-xs text-muted-foreground">필요 시 현재 오너가 새 핸드오프를 생성할 수 있습니다.</p>
          </div>
          {canCreate && (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              핸드오프 생성
            </Button>
          )}
        </div>
      );
    }

    const userLabel = handoffUser?.displayName || handoffUser?.userName || project.handoffUserId || '-';
    const typeLabel = HANDOFF_TYPE_OPTIONS.find((option) => option.value === project.handoffTypeCode)?.label ?? project.handoffTypeCode;

    return (
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {project.handoffStatusCode === 'waiting' ? '대기' : '진행중'}
            </span>
            <span className="font-medium">{typeLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            수신자: {userLabel}
            {project.handoffRequestedAt ? ` · 요청 ${new Date(project.handoffRequestedAt).toLocaleString('ko-KR')}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canConfirm && (
            <Button size="sm" onClick={handleConfirm} disabled={confirmHandoff.isPending} className="gap-1.5">
              <Handshake className="h-3.5 w-3.5" />
              수락
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={handleComplete} disabled={completeHandoff.isPending} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              완료
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">핸드오프</span>
        </div>
        <div className="ml-auto w-full">{renderStatus()}</div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>핸드오프 생성</DialogTitle>
            <DialogDescription>핸드오프 타입과 수신자를 선택합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">핸드오프 타입</label>
              <Select
                value={formData.handoffTypeCode}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, handoffTypeCode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="핸드오프 타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  {HANDOFF_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">수신자</label>
              <Select
                value={formData.handoffUserId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, handoffUserId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="수신자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((candidate: UserItem) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.displayName || candidate.userName} ({candidate.loginId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.handoffUserId || createHandoff.isPending}
            >
              {createHandoff.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
