'use client';

import type { ProjectEventRollup } from '@ssoo/types/pms';

const PROJECT_STATUS_LABELS: Record<string, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  not_submitted: '미제출',
  submitted: '제출',
  confirmed: '확정',
  approved: '승인',
  rejected: '반려',
  not_required: '면제',
};

interface EventRollupSummaryProps {
  rollup?: ProjectEventRollup | null;
  className?: string;
  showByStatus?: boolean;
}

function getDeliverableStatusLabel(statusCode: string) {
  return DELIVERABLE_STATUS_LABELS[statusCode] ?? statusCode;
}

function getProjectStatusLabel(statusCode: string) {
  return PROJECT_STATUS_LABELS[statusCode] ?? statusCode;
}

export function EventRollupSummary({
  rollup,
  className,
  showByStatus = false,
}: EventRollupSummaryProps) {
  if (!rollup) {
    return null;
  }

  const hasLinkedOutputs =
    rollup.deliverables.total > 0 || rollup.closeConditions.total > 0;
  const deliverableStatuses = Object.entries(rollup.deliverables.byStatus).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
            !hasLinkedOutputs
              ? 'bg-slate-100 text-slate-600'
              : rollup.readiness.isReady
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
          }`}
        >
          {!hasLinkedOutputs
            ? '연결 없음'
            : rollup.readiness.isReady
              ? '준비됨'
              : '대기 중'}
        </span>
        {rollup.statusCodes.map((statusCode) => (
          <span
            key={statusCode}
            className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700"
          >
            {getProjectStatusLabel(statusCode)}
          </span>
        ))}
        <span>산출물 {rollup.deliverables.completed}/{rollup.deliverables.total}</span>
        <span>종료조건 {rollup.closeConditions.checked}/{rollup.closeConditions.total}</span>
        {rollup.readiness.blockingDeliverables > 0 && (
          <span>미완료 산출물 {rollup.readiness.blockingDeliverables}</span>
        )}
        {rollup.readiness.blockingCloseConditions > 0 && (
          <span>미체크 조건 {rollup.readiness.blockingCloseConditions}</span>
        )}
        {rollup.closeConditions.requiresDeliverable > 0 && (
          <span>산출물 필요 {rollup.closeConditions.requiresDeliverable}</span>
        )}
      </div>
      {showByStatus && deliverableStatuses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {deliverableStatuses.map(([statusCode, count]) => (
            <span
              key={statusCode}
              className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5"
            >
              {getDeliverableStatusLabel(statusCode)} {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
