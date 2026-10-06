'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';

import { useMemo, useState } from 'react';
import { Check, Plus, Route, Trash2, X } from 'lucide-react';
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
import type {
  CloseoutApprovalDecisionStatusCode,
  ProjectCloseoutApprovalStep,
  ProjectMember,
} from '@/lib/api/endpoints/projects';

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
  skipped: '건너뜀',
};

const APPROVAL_STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-ssoo-info-bg text-ssoo-info',
  approved: 'bg-ssoo-success-bg text-ssoo-success',
  rejected: 'bg-ssoo-danger-bg text-ssoo-danger',
  skipped: 'bg-ssoo-accent-bg text-ssoo-accent',
};

interface ApprovalRouteMemberOption {
  value: string;
  label: string;
}

interface CloseoutApprovalRoutePanelProps {
  title: string;
  steps: ProjectCloseoutApprovalStep[];
  members: ProjectMember[];
  disabled?: boolean;
  isSaving?: boolean;
  isDeciding?: boolean;
  onSave: (approverUserIds: string[]) => Promise<void>;
  onDecide: (approvalStepId: string, approvalStatusCode: CloseoutApprovalDecisionStatusCode) => Promise<void>;
}

export function CloseoutApprovalRoutePanel({
  title,
  steps,
  members,
  disabled = false,
  isSaving = false,
  isDeciding = false,
  onSave,
  onDecide,
}: CloseoutApprovalRoutePanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const memberOptions = useMemo(() => buildMemberOptions(members), [members]);
  const [approverUserIds, setApproverUserIds] = useState<string[]>([]);
  const sortedSteps = [...steps].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const pendingSteps = sortedSteps.filter((step) => step.approvalStatusCode === 'pending');

  const openDialog = () => {
    const currentRoute = sortedSteps
      .filter((step) => step.isActive)
      .map((step) => String(step.approverUserId));
    setApproverUserIds(currentRoute.length > 0 ? currentRoute : [memberOptions[0]?.value ?? '']);
    setShowDialog(true);
  };

  const updateApprover = (index: number, value: string) => {
    setApproverUserIds((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addStep = () => {
    setApproverUserIds((current) => [...current, '']);
  };

  const removeStep = (index: number) => {
    setApproverUserIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const saveRoute = async () => {
    const selected = approverUserIds.filter(Boolean);
    await onSave(selected);
    setShowDialog(false);
  };

  const hasDuplicateApprover = new Set(approverUserIds.filter(Boolean)).size !== approverUserIds.filter(Boolean).length;
  const canSave = approverUserIds.some(Boolean) && !hasDuplicateApprover;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Route className="h-3.5 w-3.5" />
            {title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sortedSteps.length === 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-caption-xs text-muted-foreground">
                승인선 없음
              </span>
            ) : (
              sortedSteps.map((step) => (
                <span
                  key={String(step.approvalStepId)}
                  className={`rounded-full px-2 py-0.5 text-caption-xs font-medium ${APPROVAL_STATUS_CLASSES[step.approvalStatusCode] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {step.sequenceNo}. {formatApproverLabel(memberOptions, step.approverUserId)} · {APPROVAL_STATUS_LABELS[step.approvalStatusCode] ?? step.approvalStatusCode}
                </span>
              ))
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={openDialog}
          disabled={disabled || memberOptions.length === 0}
        >
          <Route className="h-4 w-4" />
          승인선 설정
        </Button>
      </div>

      {pendingSteps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pendingSteps.map((step) => (
            <div key={String(step.approvalStepId)} className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDecide(String(step.approvalStepId), 'approved')}
                disabled={disabled || isDeciding}
              >
                <Check className="h-4 w-4" />
                {step.sequenceNo}단계 승인
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDecide(String(step.approvalStepId), 'rejected')}
                disabled={disabled || isDeciding}
              >
                <X className="h-4 w-4" />
                {step.sequenceNo}단계 반려
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              현재 프로젝트 멤버를 순서대로 지정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {approverUserIds.map((approverUserId, index) => (
              <div key={`${index}-${approverUserId}`} className="flex items-center gap-2">
                <div className="w-14 text-xs font-medium text-muted-foreground">{index + 1}단계</div>
                <Select value={approverUserId} onValueChange={(value) => updateApprover(index, value)}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="승인자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  disabled={approverUserIds.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {hasDuplicateApprover && (
              <SsooErrorNotice as="p" compact>같은 승인자는 한 승인선에 한 번만 지정할 수 있습니다.</SsooErrorNotice>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={addStep}
              disabled={approverUserIds.length >= 5}
            >
              <Plus className="h-4 w-4" />
              승인 단계 추가
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              취소
            </Button>
            <Button onClick={saveRoute} disabled={!canSave || isSaving}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildMemberOptions(members: ProjectMember[]): ApprovalRouteMemberOption[] {
  const options = new Map<string, ApprovalRouteMemberOption>();
  for (const member of members) {
    if (!member.isActive) {
      continue;
    }
    const value = String(member.userId);
    if (options.has(value)) {
      continue;
    }
    const displayName = member.user?.displayName?.trim()
      || member.user?.userName?.trim()
      || `사용자 ${value}`;
    options.set(value, {
      value,
      label: `${displayName} · ${member.roleCode}`,
    });
  }
  return [...options.values()];
}

function formatApproverLabel(options: ApprovalRouteMemberOption[], userId: number | string) {
  const value = String(userId);
  return options.find((option) => option.value === value)?.label ?? `사용자 ${value}`;
}
