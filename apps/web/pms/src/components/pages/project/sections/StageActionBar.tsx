'use client';

import { useState } from 'react';
import { Play, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdvanceStage, useTransitionReadiness } from '@/hooks/queries/useProjects';
import type { DoneResultCode } from '@/lib/api/endpoints/projects';

const DONE_RESULT_OPTIONS: Record<string, { value: DoneResultCode; label: string }[]> = {
  request: [
    { value: 'accepted', label: '채용 (제안 단계로)' },
    { value: 'rejected', label: '거절' },
    { value: 'hold', label: '보류' },
  ],
  proposal: [
    { value: 'won', label: '수주 (수행 단계로)' },
    { value: 'lost', label: '실주' },
    { value: 'hold', label: '보류' },
  ],
  execution: [
    { value: 'completed', label: '완료' },
    { value: 'transfer_pending', label: '전환 필요 (전환 단계로)' },
    { value: 'linked', label: '프로젝트 연계' },
    { value: 'cancelled', label: '취소' },
    { value: 'hold', label: '보류' },
  ],
  transition: [
    { value: 'transferred', label: '전환 완료' },
    { value: 'cancelled', label: '취소' },
  ],
};

const STATUS_LABELS: Record<string, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const STAGE_LABELS: Record<string, string> = {
  waiting: '대기',
  in_progress: '진행중',
  done: '완료',
};

const RESULT_LABELS: Record<string, string> = {
  accepted: '채용',
  rejected: '거절',
  won: '수주',
  lost: '실주',
  completed: '완료',
  transfer_pending: '전환 필요',
  linked: '연계',
  cancelled: '취소',
  transferred: '전환완료',
  hold: '보류',
};

interface StageActionBarProps {
  projectId: number;
  statusCode: string;
  stageCode: string;
  doneResultCode?: string | null;
  onTransitioned: () => void;
}

export function StageActionBar({
  projectId,
  statusCode,
  stageCode,
  doneResultCode,
  onTransitioned,
}: StageActionBarProps) {
  const [showResultPicker, setShowResultPicker] = useState(false);
  const advanceMutation = useAdvanceStage();
  const { data: readinessResponse } = useTransitionReadiness(
    stageCode === 'in_progress' ? projectId : undefined,
  );
  const readiness = readinessResponse?.data ?? null;

  const handleStart = async () => {
    try {
      await advanceMutation.mutateAsync({
        id: projectId,
        data: { targetStage: 'in_progress' },
      });
      onTransitioned();
    } catch {
      // error handled by mutation
    }
  };

  const handleComplete = async (resultCode: DoneResultCode) => {
    try {
      await advanceMutation.mutateAsync({
        id: projectId,
        data: { targetStage: 'done', doneResultCode: resultCode },
      });
      setShowResultPicker(false);
      onTransitioned();
    } catch {
      // error handled by mutation
    }
  };

  const stageBadgeClass =
    stageCode === 'waiting'
      ? 'bg-gray-100 text-gray-700'
      : stageCode === 'in_progress'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-green-50 text-green-700';

  return (
    <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-2.5">
      {/* Current state display */}
      <div className="flex items-center gap-2 text-body-sm">
        <span className="text-label-md">
          {STATUS_LABELS[statusCode] || statusCode}
        </span>
        <span className="text-muted-foreground">·</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-sm ${stageBadgeClass}`}
        >
          {STAGE_LABELS[stageCode] || stageCode}
        </span>
        {doneResultCode && (
          <>
            <span className="text-muted-foreground">→</span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-label-sm bg-purple-50 text-purple-700">
              {RESULT_LABELS[doneResultCode] || doneResultCode}
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {stageCode === 'waiting' && (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={advanceMutation.isPending}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            시작
          </Button>
        )}

        {stageCode === 'in_progress' && (
          <div className="flex items-center gap-2">
            {readiness && !readiness.canComplete && (
              <div className="flex items-center gap-2 text-body-sm">
                {readiness.deliverables.pending > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    산출물 {readiness.deliverables.approved}/{readiness.deliverables.total}
                  </span>
                )}
                {readiness.closeConditions.unchecked > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    종료조건 {readiness.closeConditions.checked}/{readiness.closeConditions.total}
                  </span>
                )}
              </div>
            )}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowResultPicker(!showResultPicker)}
                disabled={advanceMutation.isPending}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                완료
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showResultPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowResultPicker(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-md border bg-white shadow-lg py-1">
                    {(DONE_RESULT_OPTIONS[statusCode] || []).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleComplete(option.value)}
                        disabled={advanceMutation.isPending}
                        className="w-full text-left px-3 py-2 text-body-sm hover:bg-muted/50 disabled:opacity-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {stageCode === 'done' && (
          <span className="text-caption text-muted-foreground">단계 완료</span>
        )}
      </div>
    </div>
  );
}
