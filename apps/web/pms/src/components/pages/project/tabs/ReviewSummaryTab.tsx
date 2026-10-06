'use client';

import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileOutput,
  GitCompareArrows,
  MessageSquareText,
  Plus,
  Repeat2,
  Send,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { ssooToast as toast } from '@ssoo/web-shell';
import {
  useCreateEvent,
  useCreateProjectIssue,
  useProjectAccess,
  useProjectChangeRequests,
  useProjectCloseConditions,
  useProjectControlIssues,
  useProjectDeliverables,
  useProjectEvents,
  useProjectHandoffs,
  useProjectMembers,
  useProjectRisks,
  useUpdateProjectIssue,
  useUpdateEvent,
} from '@/hooks/queries/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import type {
  CloseConditionItem,
  DeliverableItem,
  ProjectChangeRequestItem,
  ProjectEventItem,
  ProjectHandoff,
  ProjectIssueItem,
  ProjectMember,
  ProjectRiskItem,
} from '@/lib/api/endpoints/projects';
import { formatPmsDateTime } from '@/lib/pms-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { EventRollupSummary } from './EventRollupSummary';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

type ReviewSignalKind =
  | 'issue'
  | 'risk'
  | 'change'
  | 'deliverable'
  | 'closeCondition'
  | 'handoff';

interface ReviewSignal {
  kind: ReviewSignalKind;
  title: string;
  status: string;
  action: string;
}

interface ReviewMetrics {
  completedReviewEvents: number;
  totalReviewEvents: number;
  readyReviewEvents: number;
  completedDeliverables: number;
  totalDeliverables: number;
  checkedCloseConditions: number;
  totalCloseConditions: number;
  feedbackSignals: number;
  openLaunchFeedbackIssues: number;
  totalLaunchFeedbackIssues: number;
}

interface PmrPrrReadinessCheck {
  label: string;
  passed: boolean;
  detail: string;
}

type PmrPrrPublicationCycle = 'weekly' | 'monthly';
type PmrPrrWorkflowStatus = 'planned' | 'approval_requested' | 'approved' | 'rejected' | 'completed';
type PmrPrrRepeatCount = '1' | '4' | '12';
type PmrPrrApprovalPolicy = 'single_approver' | 'phase_owner_then_approver' | 'project_owner_then_approver';
type PmrPrrNotificationAudience = 'approver_only' | 'approver_and_project_owner' | 'approval_line_and_active_members';

const EVENT_TYPE_LABELS: Record<string, string> = {
  general: '일반',
  meeting: '미팅',
  report: '보고',
  review: '리뷰',
  handoff: '인계',
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  planned: '예정',
  completed: '완료',
  cancelled: '취소',
};

const PMR_PRR_WORKFLOW_STATUS_LABELS: Record<PmrPrrWorkflowStatus, string> = {
  planned: '발행 예정',
  approval_requested: '승인 요청',
  approved: '승인 완료',
  rejected: '반려',
  completed: '발행 완료',
};

const PMR_PRR_PUBLICATION_CYCLE_LABELS: Record<PmrPrrPublicationCycle, string> = {
  weekly: '주간',
  monthly: '월간',
};

const PMR_PRR_REPEAT_COUNT_LABELS: Record<PmrPrrRepeatCount, string> = {
  '1': '이번 차수만',
  '4': '4차수 반복 예약',
  '12': '12차수 반복 예약',
};

const PMR_PRR_APPROVAL_POLICY_LABELS: Record<PmrPrrApprovalPolicy, string> = {
  single_approver: '지정 승인자 1인 결재',
  phase_owner_then_approver: '단계 책임자 확인 후 지정 승인자 결재',
  project_owner_then_approver: '프로젝트 담당자 확인 후 지정 승인자 결재',
};

const PMR_PRR_NOTIFICATION_AUDIENCE_LABELS: Record<PmrPrrNotificationAudience, string> = {
  approver_only: '승인자만 알림',
  approver_and_project_owner: '승인자와 프로젝트 담당자 알림',
  approval_line_and_active_members: '결재선과 활성 멤버 알림',
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: '등록',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
  deferred: '보류',
};

const RISK_STATUS_LABELS: Record<string, string> = {
  identified: '식별',
  monitoring: '모니터링',
  mitigated: '대응완료',
  closed: '종결',
};

const CHANGE_STATUS_LABELS: Record<string, string> = {
  requested: '요청',
  reviewing: '검토중',
  approved: '승인',
  rejected: '반려',
  implemented: '반영완료',
};

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  not_submitted: '미제출',
  before_submit: '미제출',
  submitted: '제출',
  confirmed: '확정',
  approved: '승인',
  rejected: '반려',
  final: '최종',
  not_required: '면제',
};

const HANDOFF_STATUS_LABELS: Record<ProjectHandoff['handoffStatusCode'], string> = {
  pending: '대기',
  accepted: '수락',
  rejected: '반려',
  cancelled: '취소',
};

const SIGNAL_KIND_LABELS: Record<ReviewSignalKind, string> = {
  issue: '이슈',
  risk: '리스크',
  change: '변경',
  deliverable: '산출물',
  closeCondition: '종료조건',
  handoff: '인수인계',
};

const SIGNAL_KIND_STYLES: Record<ReviewSignalKind, string> = {
  issue: 'bg-ssoo-danger-bg text-ssoo-danger border-ssoo-danger-border',
  risk: 'bg-ssoo-warning-bg text-ssoo-warning border-ssoo-warning-border',
  change: 'bg-ssoo-accent-bg text-ssoo-accent border-ssoo-accent-border',
  deliverable: 'bg-ssoo-info-bg text-ssoo-info border-ssoo-info-border',
  closeCondition: 'bg-ssoo-success-bg text-ssoo-success border-ssoo-success-border',
  handoff: 'bg-muted text-muted-foreground border-border',
};

const QUICK_ISSUE_TYPE_LABELS: Record<string, string> = {
  inquiry: '문의',
  improvement: '개선',
  impediment: '장애',
  bug: '버그',
};

const QUICK_PRIORITY_LABELS: Record<string, string> = {
  normal: '보통',
  high: '높음',
  critical: '긴급',
  low: '낮음',
};

const INITIAL_FEEDBACK_FORM = {
  issueTypeCode: 'inquiry',
  priorityCode: 'normal',
  issueTitle: '',
  description: '',
};

const INITIAL_REVIEW_EVENT_FORM = {
  eventTypeCode: 'review',
  statusCode: 'planned',
  eventName: '',
  scheduledAt: '',
  summary: '',
};

const REVIEW_SNAPSHOT_LIMIT = 30;
const REVIEW_VISIBLE_ITEM_LIMIT = 20;
const REVIEW_SNAPSHOT_NOTICE = 'PMR/PRR 자동 보고서가 아닌 런칭 피드백 공유용 파일입니다.';
const PMR_PRR_LEDGER_MEMO = 'pmr-prr-ledger';
const PMR_PRR_WORKFLOW_MEMO = 'pmr-prr-workflow';
const PMR_PRR_LEDGER_NOTICE =
  'PMR/PRR 발행 원장은 프로젝트 이벤트 기반 1차 이력입니다. 정기 발행·승인 워크플로우는 프로젝트 이벤트 상태 전환으로 운영합니다.';
const PMR_PRR_WORKFLOW_NOTICE =
  'PMR/PRR 정기 발행·승인 워크플로우는 프로젝트 이벤트의 발행 예정, 승인 요청, 승인 완료, 반려, 발행 완료 상태로 운영합니다. 예약 시간이 지난 발행 예정 건은 서버 백그라운드 rollover가 승인 요청으로 자동 전환합니다.';
const PMR_PRR_DRAFT_NOTICE =
  'PMR/PRR 초안은 현재 PMS 실행 데이터 기준이며 발행 원장과 정기 발행·승인 워크플로우는 프로젝트 이벤트로 기록합니다.';

function toDatetimeLocalInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createInitialPmrPrrPublicationForm() {
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 7);
  scheduledAt.setHours(17, 0, 0, 0);

  return {
    cycle: 'weekly' as PmrPrrPublicationCycle,
    repeatCount: '1' as PmrPrrRepeatCount,
    approvalPolicy: 'phase_owner_then_approver' as PmrPrrApprovalPolicy,
    notificationAudience: 'approval_line_and_active_members' as PmrPrrNotificationAudience,
    scheduledAt: toDatetimeLocalInput(scheduledAt),
    ownerUserId: '',
    summary: '',
  };
}

function addPublicationCycleDate(
  date: Date,
  cycle: PmrPrrPublicationCycle,
  offset: number,
) {
  const nextDate = new Date(date);
  if (cycle === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + offset);
  } else {
    nextDate.setDate(nextDate.getDate() + (offset * 7));
  }
  return nextDate;
}

function isOutputDone(statusCode: string) {
  return ['confirmed', 'approved', 'final', 'not_required'].includes(statusCode);
}

function isOpenIssue(item: ProjectIssueItem) {
  return !['resolved', 'closed'].includes(item.statusCode);
}

function isLaunchFeedbackIssue(item: ProjectIssueItem) {
  return item.memo === 'review-feedback';
}

function isPmrPrrWorkflowEvent(item: ProjectEventItem) {
  return item.memo === PMR_PRR_LEDGER_MEMO || item.memo === PMR_PRR_WORKFLOW_MEMO;
}

function isPmrPrrScheduledWorkflowEvent(item: ProjectEventItem) {
  return item.memo === PMR_PRR_WORKFLOW_MEMO;
}

function labelPmrPrrWorkflowStatus(value: string) {
  return PMR_PRR_WORKFLOW_STATUS_LABELS[value as PmrPrrWorkflowStatus]
    ?? labelOf(EVENT_STATUS_LABELS, value);
}

function isFeedbackIssueTerminal(statusCode: string) {
  return ['resolved', 'closed'].includes(statusCode);
}

function isActiveRisk(item: ProjectRiskItem) {
  return !['mitigated', 'closed'].includes(item.statusCode);
}

function isActiveChange(item: ProjectChangeRequestItem) {
  return ['requested', 'reviewing', 'approved'].includes(item.statusCode);
}

function isReviewEvent(item: ProjectEventItem) {
  return ['report', 'review', 'meeting', 'handoff'].includes(item.eventTypeCode);
}

function labelOf(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}

function getProjectMemberDisplayName(member: ProjectMember) {
  return member.user?.displayName
    || member.user?.userName
    || '사용자 정보 조회 필요';
}

function buildPmrPrrApproverOptions(members: ProjectMember[]) {
  const options = new Map<string, { value: string; label: string; description: string; roles: string[] }>();

  for (const member of members) {
    if (!member.isActive) {
      continue;
    }

    const value = String(member.userId);
    const existing = options.get(value);
    if (existing) {
      if (!existing.roles.includes(member.roleCode)) {
        existing.roles.push(member.roleCode);
      }
      continue;
    }

    const description = [
      member.user?.email,
      member.user?.departmentCode,
      member.user?.positionCode,
      member.accessLevel,
    ].filter(Boolean).join(' · ');

    options.set(value, {
      value,
      label: getProjectMemberDisplayName(member),
      description: description || '프로젝트 멤버',
      roles: member.roleCode ? [member.roleCode] : [],
    });
  }

  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function formatPmrPrrApproverLabel(members: ProjectMember[], ownerUserId?: number | string | null) {
  if (!ownerUserId) {
    return '승인자 미지정';
  }

  const userId = String(ownerUserId);
  const matched = buildPmrPrrApproverOptions(members).find((option) => option.value === userId);
  return matched ? matched.label : '사용자 정보 조회 필요';
}

function isSameUserId(left?: number | string | null, right?: number | string | null) {
  return Boolean(left && right && String(left) === String(right));
}

function isPmrPrrWorkflowApprover(event: ProjectEventItem, currentUserId?: string | null) {
  return isSameUserId(event.ownerUserId, currentUserId);
}

function selectDefaultPmrPrrApproverId(
  members: ProjectMember[],
  policy: PmrPrrApprovalPolicy,
  currentUserId?: string | null,
) {
  const activeMembers = members.filter((member) => member.isActive);
  const currentUserMember = currentUserId
    ? activeMembers.find((member) => isSameUserId(member.userId, currentUserId))
    : undefined;
  const candidates = [
    ...(currentUserMember ? [currentUserMember] : []),
    ...(policy === 'phase_owner_then_approver'
      ? activeMembers.filter((member) => member.isPhaseOwner)
      : []),
    ...(policy === 'project_owner_then_approver'
      ? activeMembers.filter((member) => member.accessLevel === 'owner')
      : []),
    ...activeMembers.filter((member) => member.accessLevel === 'owner'),
    ...activeMembers.filter((member) => member.isPhaseOwner),
    ...activeMembers,
  ];

  return candidates[0]?.userId ? String(candidates[0].userId) : '';
}

function summarizePmrPrrNames(labels: string[]) {
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));
  if (uniqueLabels.length === 0) {
    return '대상 없음';
  }
  if (uniqueLabels.length <= 3) {
    return uniqueLabels.join(', ');
  }
  return `${uniqueLabels.slice(0, 3).join(', ')} 외 ${uniqueLabels.length - 3}명`;
}

function buildPmrPrrApprovalLineLabels(
  members: ProjectMember[],
  policy: PmrPrrApprovalPolicy,
  ownerUserId?: string,
) {
  const activeMembers = members.filter((member) => member.isActive);
  const approverLabel = formatPmrPrrApproverLabel(members, ownerUserId);
  const approverUserId = ownerUserId ? String(ownerUserId) : '';
  const reviewerLabels =
    policy === 'phase_owner_then_approver'
      ? activeMembers
          .filter((member) => member.isPhaseOwner && String(member.userId) !== approverUserId)
          .map(getProjectMemberDisplayName)
      : policy === 'project_owner_then_approver'
        ? activeMembers
            .filter((member) => member.accessLevel === 'owner' && String(member.userId) !== approverUserId)
            .map(getProjectMemberDisplayName)
        : [];

  return [
    ...reviewerLabels,
    approverLabel,
  ].filter((label) => label && label !== '승인자 미지정');
}

function buildPmrPrrNotificationTargetLabels(
  members: ProjectMember[],
  policy: PmrPrrApprovalPolicy,
  audience: PmrPrrNotificationAudience,
  ownerUserId?: string,
) {
  const activeMembers = members.filter((member) => member.isActive);
  if (audience === 'approval_line_and_active_members') {
    return activeMembers.map(getProjectMemberDisplayName);
  }

  const approvalLineLabels = buildPmrPrrApprovalLineLabels(members, policy, ownerUserId);
  if (audience === 'approver_and_project_owner') {
    return [
      ...approvalLineLabels,
      ...activeMembers
        .filter((member) => member.accessLevel === 'owner')
        .map(getProjectMemberDisplayName),
    ];
  }

  return ownerUserId ? [formatPmrPrrApproverLabel(members, ownerUserId)] : [];
}

function getPmrPrrWorkflowSummaryField(event: ProjectEventItem, label: string) {
  const source = event.summary || event.description || '';
  const matched = source.match(new RegExp(`${label}:\\s*([^·]+)`));
  return matched?.[1]?.trim() || null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toComparableId(value: number | string | bigint | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compareEventRecency(left: ProjectEventItem, right: ProjectEventItem) {
  return toComparableId(right.eventId) - toComparableId(left.eventId);
}

function compareIssueRecency(left: ProjectIssueItem, right: ProjectIssueItem) {
  return toComparableId(right.projectIssueId) - toComparableId(left.projectIssueId);
}

function createCode(prefix: string, projectId: number) {
  return `${prefix}-${projectId}-${Date.now().toString(36).toUpperCase()}`;
}

function buildSignals({
  issues,
  risks,
  changes,
  deliverables,
  closeConditions,
  handoffs,
}: {
  issues: ProjectIssueItem[];
  risks: ProjectRiskItem[];
  changes: ProjectChangeRequestItem[];
  deliverables: DeliverableItem[];
  closeConditions: CloseConditionItem[];
  handoffs: ProjectHandoff[];
}): ReviewSignal[] {
  const issueSignals = issues.filter(isOpenIssue).map((item) => ({
    kind: 'issue' as const,
    title: item.issueTitle,
    status: labelOf(ISSUE_STATUS_LABELS, item.statusCode),
    action: '담당자 응답 또는 해결 상태 확인',
  }));

  const riskSignals = risks.filter(isActiveRisk).map((item) => ({
    kind: 'risk' as const,
    title: item.riskTitle,
    status: labelOf(RISK_STATUS_LABELS, item.statusCode),
    action: item.responsePlan ? '대응 계획 이행 여부 확인' : '대응 계획 보강',
  }));

  const changeSignals = changes.filter(isActiveChange).map((item) => ({
    kind: 'change' as const,
    title: item.changeTitle,
    status: labelOf(CHANGE_STATUS_LABELS, item.statusCode),
    action: item.statusCode === 'approved' ? '반영 일정 확인' : '검토 결과 확정',
  }));

  const deliverableSignals = deliverables
    .filter((item) => !isOutputDone(item.submissionStatusCode))
    .map((item) => ({
      kind: 'deliverable' as const,
      title: item.deliverable?.deliverableName ?? item.deliverableName ?? item.deliverableCode,
      status: labelOf(DELIVERABLE_STATUS_LABELS, item.submissionStatusCode),
      action: item.submissionStatusCode === 'submitted' ? '리뷰 결과 확정' : '제출 또는 보완 요청',
    }));

  const closeConditionSignals = closeConditions
    .filter((item) => !item.isChecked)
    .map((item) => ({
      kind: 'closeCondition' as const,
      title: item.conditionCode,
      status: item.requiresDeliverable ? '산출물 필요' : '미체크',
      action: '종료조건 충족 여부 확인',
    }));

  const handoffSignals = handoffs
    .filter((item) => item.handoffStatusCode === 'pending')
    .map((item) => ({
      kind: 'handoff' as const,
      title: item.conditionNote || item.assignedRoleCode || item.toPhaseCode,
      status: HANDOFF_STATUS_LABELS[item.handoffStatusCode],
      action: '수락 또는 반려 확인',
    }));

  return [
    ...issueSignals,
    ...riskSignals,
    ...changeSignals,
    ...deliverableSignals,
    ...closeConditionSignals,
    ...handoffSignals,
  ];
}

function cleanSnapshotText(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || '-';
}

function appendSnapshotItems<T>({
  lines,
  title,
  items,
  emptyText,
  formatItem,
}: {
  lines: string[];
  title: string;
  items: T[];
  emptyText: string;
  formatItem: (item: T, index: number) => string[];
}) {
  lines.push('', `## ${title}`);

  if (items.length === 0) {
    lines.push(`- ${emptyText}`);
    return;
  }

  items.slice(0, REVIEW_SNAPSHOT_LIMIT).forEach((item, index) => {
    lines.push(...formatItem(item, index));
  });

  if (items.length > REVIEW_SNAPSHOT_LIMIT) {
    lines.push(`- 외 ${items.length - REVIEW_SNAPSHOT_LIMIT}건은 화면에서 확인 필요`);
  }
}

function buildLaunchReviewSnapshot({
  projectId,
  generatedAt,
  metrics,
  feedbackSignals,
  launchFeedbackIssues,
  reviewEvents,
}: {
  projectId: number;
  generatedAt: string;
  metrics: {
    completedReviewEvents: number;
    totalReviewEvents: number;
    readyReviewEvents: number;
    completedDeliverables: number;
    totalDeliverables: number;
    checkedCloseConditions: number;
    totalCloseConditions: number;
    feedbackSignals: number;
    openLaunchFeedbackIssues: number;
    totalLaunchFeedbackIssues: number;
  };
  feedbackSignals: ReviewSignal[];
  launchFeedbackIssues: ProjectIssueItem[];
  reviewEvents: ProjectEventItem[];
}) {
  const lines = [
    '# PMS 런칭 리뷰 스냅샷',
    '',
    `- 프로젝트: ${projectId}`,
    `- 생성 시각: ${formatPmsDateTime(generatedAt)}`,
    `- 기준: ${REVIEW_SNAPSHOT_NOTICE}`,
    '',
    '## 요약',
    `- 보고/리뷰 이벤트: ${metrics.completedReviewEvents}/${metrics.totalReviewEvents}`,
    `- 연결 준비 완료 이벤트: ${metrics.readyReviewEvents}건`,
    `- 산출물 완료: ${metrics.completedDeliverables}/${metrics.totalDeliverables}`,
    `- 종료조건 확인: ${metrics.checkedCloseConditions}/${metrics.totalCloseConditions}`,
    `- 피드백 큐: ${metrics.feedbackSignals}건`,
    `- 열린 런칭 피드백: ${metrics.openLaunchFeedbackIssues}/${metrics.totalLaunchFeedbackIssues}`,
  ];

  appendSnapshotItems({
    lines,
    title: '확인 필요 신호',
    items: feedbackSignals,
    emptyText: '현재 피드백을 요청할 미해결 항목이 없습니다.',
    formatItem: (signal) => [
      `- [${SIGNAL_KIND_LABELS[signal.kind]}] ${cleanSnapshotText(signal.title)}`
        + ` / 상태: ${signal.status}`
        + ` / 확인할 일: ${cleanSnapshotText(signal.action)}`,
    ],
  });

  appendSnapshotItems({
    lines,
    title: '수집된 런칭 피드백',
    items: launchFeedbackIssues,
    emptyText: '아직 수집된 런칭 피드백 이슈가 없습니다.',
    formatItem: (issue) => [
      `- [${labelOf(ISSUE_STATUS_LABELS, issue.statusCode)}] ${cleanSnapshotText(issue.issueTitle)}`
        + ` / 유형: ${labelOf(QUICK_ISSUE_TYPE_LABELS, issue.issueTypeCode)}`
        + ` / 우선순위: ${labelOf(QUICK_PRIORITY_LABELS, issue.priorityCode)}`
        + ` / 등록: ${formatPmsDateTime(issue.reportedAt)}`,
      `  - 내용: ${cleanSnapshotText(issue.description)}`,
      `  - 해결: ${cleanSnapshotText(issue.resolution)}`,
    ],
  });

  appendSnapshotItems({
    lines,
    title: '보고/리뷰 이벤트',
    items: reviewEvents,
    emptyText: '보고 또는 리뷰 이벤트가 아직 없습니다.',
    formatItem: (event) => [
      `- [${labelOf(EVENT_STATUS_LABELS, event.statusCode)}] ${cleanSnapshotText(event.eventName)}`
        + ` / 유형: ${labelOf(EVENT_TYPE_LABELS, event.eventTypeCode)}`
        + ` / 일시: ${formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}`
        + ` / 준비: ${event.rollup?.readiness.isReady ? '완료' : '확인 필요'}`,
      `  - 요약: ${cleanSnapshotText(event.summary || event.description)}`,
    ],
  });

  lines.push('', '---', REVIEW_SNAPSHOT_NOTICE);

  return lines.join('\n');
}

function formatReportCheck(label: string, passed: boolean, detail: string) {
  return `- [${passed ? '충족' : '확인 필요'}] ${label}: ${detail}`;
}

function buildPmrPrrLedgerSummary({
  metrics,
  decision,
  readinessChecks,
}: {
  metrics: ReviewMetrics;
  decision: string;
  readinessChecks: PmrPrrReadinessCheck[];
}) {
  const failedChecks = readinessChecks.filter((item) => !item.passed);
  const failedText =
    failedChecks.length > 0
      ? failedChecks.map((item) => `${item.label} ${item.detail}`).join(', ')
      : '확인 필요 항목 없음';

  return [
    `판정: ${decision}`,
    `보고/리뷰 이벤트 ${metrics.completedReviewEvents}/${metrics.totalReviewEvents}`,
    `산출물 ${metrics.completedDeliverables}/${metrics.totalDeliverables}`,
    `종료조건 ${metrics.checkedCloseConditions}/${metrics.totalCloseConditions}`,
    `확인 필요: ${failedText}`,
  ].join(' · ');
}

function buildPmrPrrWorkflowSummary({
  cycleLabel,
  repeatLabel,
  approverLabel,
  approvalPolicyLabel,
  approvalLineLabel,
  notificationAudienceLabel,
  notificationTargetLabel,
  decision,
  metrics,
  readinessChecks,
  note,
}: {
  cycleLabel: string;
  repeatLabel: string;
  approverLabel: string;
  approvalPolicyLabel: string;
  approvalLineLabel: string;
  notificationAudienceLabel: string;
  notificationTargetLabel: string;
  decision: string;
  metrics: ReviewMetrics;
  readinessChecks: PmrPrrReadinessCheck[];
  note?: string;
}) {
  const baseSummary = buildPmrPrrLedgerSummary({
    metrics,
    decision,
    readinessChecks,
  });
  const trimmedNote = note?.trim();

  return [
    `주기: ${cycleLabel}`,
    `반복: ${repeatLabel}`,
    `승인자: ${approverLabel}`,
    `결재선 정책: ${approvalPolicyLabel}`,
    `결재선: ${approvalLineLabel}`,
    `알림 수신: ${notificationAudienceLabel}`,
    `알림 대상: ${notificationTargetLabel}`,
    baseSummary,
    trimmedNote ? `비고: ${trimmedNote}` : '',
  ].filter(Boolean).join(' · ');
}

function buildPmrPrrWorkflowTransitionSummary({
  event,
  nextStatusLabel,
  generatedAt,
}: {
  event: ProjectEventItem;
  nextStatusLabel: string;
  generatedAt: string;
}) {
  const previous = event.summary || event.description || event.eventName;

  return [
    previous,
    `${nextStatusLabel}: ${formatPmsDateTime(generatedAt)}`,
  ].filter(Boolean).join(' · ');
}

function getPmrPrrWorkflowActionLabel(
  event: ProjectEventItem,
  canManage: boolean,
  currentUserId?: string | null,
) {
  if (!canManage) {
    return '상태 전환 권한이 없습니다.';
  }
  if (!event.ownerUserId && event.statusCode !== 'completed') {
    return '승인자 지정 후 승인 요청을 보낼 수 있습니다.';
  }
  if (event.statusCode === 'approval_requested' && !isPmrPrrWorkflowApprover(event, currentUserId)) {
    return '승인·반려는 지정 승인자만 처리할 수 있습니다.';
  }
  if (event.statusCode === 'approval_requested') {
    return '승인 요청 상태입니다.';
  }
  if (event.statusCode === 'approved') {
    return '발행 완료 처리가 필요합니다.';
  }
  if (event.statusCode === 'rejected') {
    return '반려된 발행 건입니다. 승인 요청을 다시 보낼 수 있습니다.';
  }
  if (event.statusCode === 'completed') {
    return '발행 완료된 건입니다.';
  }
  return '승인 요청 대기 상태입니다.';
}

function buildPmrPrrReadinessChecks({
  metrics,
  launchFeedbackIssues,
  issues,
  risks,
  changes,
  deliverables,
  closeConditions,
  handoffs,
}: {
  metrics: ReviewMetrics;
  launchFeedbackIssues: ProjectIssueItem[];
  issues: ProjectIssueItem[];
  risks: ProjectRiskItem[];
  changes: ProjectChangeRequestItem[];
  deliverables: DeliverableItem[];
  closeConditions: CloseConditionItem[];
  handoffs: ProjectHandoff[];
}): PmrPrrReadinessCheck[] {
  const openIssues = issues
    .filter((item) => !isLaunchFeedbackIssue(item))
    .filter(isOpenIssue);
  const activeRisks = risks.filter(isActiveRisk);
  const activeChanges = changes.filter(isActiveChange);
  const pendingDeliverables = deliverables.filter((item) => !isOutputDone(item.submissionStatusCode));
  const pendingCloseConditions = closeConditions.filter((item) => !item.isChecked);
  const pendingHandoffs = handoffs.filter((item) => item.handoffStatusCode === 'pending');
  const openFeedbackIssues = launchFeedbackIssues.filter(isOpenIssue);

  return [
    {
      label: '산출물',
      passed: pendingDeliverables.length === 0,
      detail: `${metrics.completedDeliverables}/${metrics.totalDeliverables} 완료`,
    },
    {
      label: '종료조건',
      passed: pendingCloseConditions.length === 0,
      detail: `${metrics.checkedCloseConditions}/${metrics.totalCloseConditions} 확인`,
    },
    {
      label: '통제 이슈',
      passed: openIssues.length === 0,
      detail: `열림 ${openIssues.length}건`,
    },
    {
      label: '리스크',
      passed: activeRisks.length === 0,
      detail: `활성 ${activeRisks.length}건`,
    },
    {
      label: '변경요청',
      passed: activeChanges.length === 0,
      detail: `진행 ${activeChanges.length}건`,
    },
    {
      label: '인수인계',
      passed: pendingHandoffs.length === 0,
      detail: `대기 ${pendingHandoffs.length}건`,
    },
    {
      label: '런칭 피드백',
      passed: openFeedbackIssues.length === 0,
      detail: `열림 ${openFeedbackIssues.length}/${metrics.totalLaunchFeedbackIssues}건`,
    },
  ];
}

function buildPmrPrrDraftReport({
  projectId,
  generatedAt,
  metrics,
  feedbackSignals,
  launchFeedbackIssues,
  reviewEvents,
  issues,
  risks,
  changes,
  deliverables,
  closeConditions,
  handoffs,
}: {
  projectId: number;
  generatedAt: string;
  metrics: ReviewMetrics;
  feedbackSignals: ReviewSignal[];
  launchFeedbackIssues: ProjectIssueItem[];
  reviewEvents: ProjectEventItem[];
  issues: ProjectIssueItem[];
  risks: ProjectRiskItem[];
  changes: ProjectChangeRequestItem[];
  deliverables: DeliverableItem[];
  closeConditions: CloseConditionItem[];
  handoffs: ProjectHandoff[];
}) {
  const openIssues = issues
    .filter((item) => !isLaunchFeedbackIssue(item))
    .filter(isOpenIssue);
  const activeRisks = risks.filter(isActiveRisk);
  const activeChanges = changes.filter(isActiveChange);
  const pendingHandoffs = handoffs.filter((item) => item.handoffStatusCode === 'pending');
  const readinessChecks = buildPmrPrrReadinessChecks({
    metrics,
    launchFeedbackIssues,
    issues,
    risks,
    changes,
    deliverables,
    closeConditions,
    handoffs,
  });
  const isReleaseReady = readinessChecks.every((item) => item.passed);
  const lines = [
    '# PMS PMR/PRR 초안',
    '',
    `- 프로젝트: ${projectId}`,
    `- 생성 시각: ${formatPmsDateTime(generatedAt)}`,
    `- 범위: ${PMR_PRR_DRAFT_NOTICE}`,
    '',
    '## PMR 초안',
    `- 보고/리뷰 이벤트: ${metrics.completedReviewEvents}/${metrics.totalReviewEvents}`,
    `- 연결 준비 완료 이벤트: ${metrics.readyReviewEvents}건`,
    `- 피드백 큐: ${metrics.feedbackSignals}건`,
    `- 열린 통제 이슈: ${openIssues.length}건`,
    `- 활성 리스크: ${activeRisks.length}건`,
    `- 진행 변경요청: ${activeChanges.length}건`,
    `- 대기 인수인계: ${pendingHandoffs.length}건`,
    '',
    '## PRR 초안',
    `- 판정 초안: ${isReleaseReady ? '릴리즈 준비 충족' : '확인 필요 항목 존재'}`,
    ...readinessChecks.map((item) => formatReportCheck(item.label, item.passed, item.detail)),
  ];

  appendSnapshotItems({
    lines,
    title: 'PMR 주요 보고 이벤트',
    items: reviewEvents,
    emptyText: '보고 또는 리뷰 이벤트가 아직 없습니다.',
    formatItem: (event) => [
      `- [${labelOf(EVENT_STATUS_LABELS, event.statusCode)}] ${cleanSnapshotText(event.eventName)}`
        + ` / 유형: ${labelOf(EVENT_TYPE_LABELS, event.eventTypeCode)}`
        + ` / 일시: ${formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}`
        + ` / 준비: ${event.rollup?.readiness.isReady ? '완료' : '확인 필요'}`,
      `  - 요약: ${cleanSnapshotText(event.summary || event.description)}`,
    ],
  });

  appendSnapshotItems({
    lines,
    title: 'PRR 확인 필요 항목',
    items: feedbackSignals,
    emptyText: '현재 PRR 확인 필요 항목이 없습니다.',
    formatItem: (signal) => [
      `- [${SIGNAL_KIND_LABELS[signal.kind]}] ${cleanSnapshotText(signal.title)}`
        + ` / 상태: ${signal.status}`
        + ` / 조치: ${cleanSnapshotText(signal.action)}`,
    ],
  });

  appendSnapshotItems({
    lines,
    title: '런칭 피드백 처리 현황',
    items: launchFeedbackIssues,
    emptyText: '수집된 런칭 피드백 이슈가 없습니다.',
    formatItem: (issue) => [
      `- [${labelOf(ISSUE_STATUS_LABELS, issue.statusCode)}] ${cleanSnapshotText(issue.issueTitle)}`
        + ` / 우선순위: ${labelOf(QUICK_PRIORITY_LABELS, issue.priorityCode)}`
        + ` / 해결: ${cleanSnapshotText(issue.resolution)}`,
    ],
  });

  lines.push('', '---', PMR_PRR_DRAFT_NOTICE);

  return lines.join('\n');
}

function downloadTextFile(fileName: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function CompactField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-caption-2xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function FeedbackSignalBadge({ kind }: { kind: ReviewSignalKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SIGNAL_KIND_STYLES[kind]}`}
    >
      {SIGNAL_KIND_LABELS[kind]}
    </span>
  );
}

function ReviewEventCard({ event }: { event: ProjectEventItem }) {
  return (
    <div className="space-y-3 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{event.eventName}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {event.summary || event.description || '-'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CompactField label="유형" value={labelOf(EVENT_TYPE_LABELS, event.eventTypeCode)} />
        <CompactField label="상태" value={labelOf(EVENT_STATUS_LABELS, event.statusCode)} />
        <CompactField
          label="일시"
          value={formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}
        />
        <CompactField
          label="준비"
          value={event.rollup?.readiness.isReady ? '완료' : '확인 필요'}
        />
      </div>
      <EventRollupSummary rollup={event.rollup} showByStatus />
    </div>
  );
}

function PmrPrrWorkflowActions({
  event,
  canManage,
  currentUserId,
  isUpdating,
  onStatusChange,
}: {
  event: ProjectEventItem;
  canManage: boolean;
  currentUserId?: string | null;
  isUpdating: boolean;
  onStatusChange: (event: ProjectEventItem, statusCode: PmrPrrWorkflowStatus) => void;
}) {
  if (!isPmrPrrScheduledWorkflowEvent(event)) {
    return (
      <span className="text-xs text-muted-foreground">수동 기록</span>
    );
  }

  if (event.statusCode === 'completed') {
    return (
      <span className="text-xs font-medium text-ssoo-success">발행 완료</span>
    );
  }

  if (event.statusCode === 'approval_requested') {
    const canApprove = canManage && isPmrPrrWorkflowApprover(event, currentUserId);

    return (
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          data-testid="pms-review-pmr-prr-approve-action"
          disabled={!canApprove || isUpdating}
          onClick={() => onStatusChange(event, 'approved')}
        >
          <ThumbsUp className="h-4 w-4" />
          승인
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          data-testid="pms-review-pmr-prr-reject-action"
          disabled={!canApprove || isUpdating}
          onClick={() => onStatusChange(event, 'rejected')}
        >
          <XCircle className="h-4 w-4" />
          반려
        </Button>
      </div>
    );
  }

  if (event.statusCode === 'approved') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full sm:w-auto"
        data-testid="pms-review-pmr-prr-publish-action"
        disabled={!canManage || isUpdating}
        onClick={() => onStatusChange(event, 'completed')}
      >
        <CheckCircle2 className="h-4 w-4" />
        발행 완료
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full sm:w-auto"
      data-testid="pms-review-pmr-prr-approval-request-action"
      disabled={!canManage || isUpdating || !event.ownerUserId}
      onClick={() => onStatusChange(event, 'approval_requested')}
    >
      <Send className="h-4 w-4" />
      승인 요청
    </Button>
  );
}

function PmrPrrLedgerEventCard({
  event,
  approverLabel,
  canManage,
  currentUserId,
  isUpdating,
  onStatusChange,
}: {
  event: ProjectEventItem;
  approverLabel: string;
  canManage: boolean;
  currentUserId?: string | null;
  isUpdating: boolean;
  onStatusChange: (event: ProjectEventItem, statusCode: PmrPrrWorkflowStatus) => void;
}) {
  return (
    <div
      className="space-y-3 border-b px-4 py-3 last:border-b-0"
      data-testid="pms-review-pmr-prr-ledger-item"
      data-pmr-prr-event-id={String(event.eventId)}
      data-pmr-prr-status-code={event.statusCode}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{event.eventName}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {event.summary || event.description || '-'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CompactField
          label="발행일"
          value={formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}
        />
        <CompactField label="상태" value={labelPmrPrrWorkflowStatus(event.statusCode)} />
        <CompactField label="승인자" value={approverLabel} />
        <CompactField
          label="결재선"
          value={getPmrPrrWorkflowSummaryField(event, '결재선 정책') ?? '기본 결재선'}
        />
        <CompactField
          label="알림"
          value={getPmrPrrWorkflowSummaryField(event, '알림 수신') ?? '승인자 알림'}
        />
      </div>
      <div>
        <p className="mb-2 text-caption-2xs font-medium text-muted-foreground">
          {getPmrPrrWorkflowActionLabel(event, canManage, currentUserId)}
        </p>
        <PmrPrrWorkflowActions
          event={event}
          canManage={canManage}
          currentUserId={currentUserId}
          isUpdating={isUpdating}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  );
}

function FeedbackSignalCard({ signal }: { signal: ReviewSignal }) {
  return (
    <div className="space-y-3 border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{signal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{signal.action}</p>
        </div>
        <FeedbackSignalBadge kind={signal.kind} />
      </div>
      <CompactField label="상태" value={signal.status} />
    </div>
  );
}

function LaunchFeedbackIssueCard({
  issue,
  canManage,
  isUpdating,
  onStatusChange,
}: {
  issue: ProjectIssueItem;
  canManage: boolean;
  isUpdating: boolean;
  onStatusChange: (issue: ProjectIssueItem, statusCode: string) => void;
}) {
  const isTerminal = isFeedbackIssueTerminal(issue.statusCode);

  return (
    <div
      className="space-y-3 border-b px-4 py-3 last:border-b-0"
      data-testid="pms-review-launch-feedback-item"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{issue.issueTitle}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {issue.description || '상세 내용 없음'}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-ssoo-primary/15 bg-ssoo-sitemap-bg px-2 py-0.5 text-xs font-semibold text-ssoo-primary">
          {labelOf(QUICK_PRIORITY_LABELS, issue.priorityCode)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CompactField label="유형" value={labelOf(QUICK_ISSUE_TYPE_LABELS, issue.issueTypeCode)} />
        <CompactField label="상태" value={labelOf(ISSUE_STATUS_LABELS, issue.statusCode)} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Select
          value={issue.statusCode}
          onValueChange={(statusCode) => onStatusChange(issue, statusCode)}
          disabled={!canManage || isUpdating}
        >
          <SelectTrigger
            className="h-8 w-full text-xs sm:w-32"
            data-testid="pms-review-feedback-status-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ISSUE_STATUS_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          data-testid="pms-review-feedback-resolve-action"
          disabled={!canManage || isUpdating || isTerminal}
          onClick={() => onStatusChange(issue, 'resolved')}
        >
          <CheckCircle2 className="h-4 w-4" />
          해결
        </Button>
      </div>
    </div>
  );
}

export function ReviewSummaryTab({ projectId }: { projectId: number }) {
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: eventResponse, isLoading: isLoadingEvents } = useProjectEvents(projectId);
  const { data: deliverableResponse } = useProjectDeliverables(projectId);
  const { data: closeConditionResponse } = useProjectCloseConditions(projectId);
  const { data: issueResponse } = useProjectControlIssues(projectId);
  const { data: riskResponse } = useProjectRisks(projectId);
  const { data: changeResponse } = useProjectChangeRequests(projectId);
  const { data: handoffResponse } = useProjectHandoffs(projectId);
  const { data: memberResponse } = useProjectMembers(projectId);
  const createProjectIssue = useCreateProjectIssue();
  const updateProjectIssue = useUpdateProjectIssue();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const canManageFeedback = accessResponse?.data?.features.canManageIssues ?? false;

  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showReviewEventDialog, setShowReviewEventDialog] = useState(false);
  const [showPmrPrrPublicationDialog, setShowPmrPrrPublicationDialog] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(INITIAL_FEEDBACK_FORM);
  const [reviewEventForm, setReviewEventForm] = useState(INITIAL_REVIEW_EVENT_FORM);
  const [pmrPrrWorkflowEventOverrides, setPmrPrrWorkflowEventOverrides] = useState<
    Record<string, ProjectEventItem>
  >({});
  const [pmrPrrPublicationForm, setPmrPrrPublicationForm] = useState(
    createInitialPmrPrrPublicationForm,
  );

  const events = useMemo(
    () => (eventResponse?.data ?? []).map((event) => (
      pmrPrrWorkflowEventOverrides[String(event.eventId)] ?? event
    )),
    [eventResponse?.data, pmrPrrWorkflowEventOverrides],
  );
  const deliverables = useMemo(() => deliverableResponse?.data ?? [], [deliverableResponse?.data]);
  const closeConditions = useMemo(
    () => closeConditionResponse?.data ?? [],
    [closeConditionResponse?.data],
  );
  const issues = useMemo(() => issueResponse?.data ?? [], [issueResponse?.data]);
  const risks = useMemo(() => riskResponse?.data ?? [], [riskResponse?.data]);
  const changes = useMemo(() => changeResponse?.data ?? [], [changeResponse?.data]);
  const handoffs = useMemo(() => handoffResponse?.data ?? [], [handoffResponse?.data]);
  const members = useMemo(() => memberResponse?.data ?? [], [memberResponse?.data]);
  const pmrPrrApproverOptions = useMemo(() => buildPmrPrrApproverOptions(members), [members]);

  const reviewEvents = useMemo(() => events.filter(isReviewEvent), [events]);
  const pmrPrrWorkflowEvents = useMemo(
    () => reviewEvents.filter(isPmrPrrWorkflowEvent),
    [reviewEvents],
  );
  const launchFeedbackIssues = useMemo(() => issues.filter(isLaunchFeedbackIssue), [issues]);
  const visiblePmrPrrWorkflowEvents = useMemo(
    () => [...pmrPrrWorkflowEvents]
      .sort(compareEventRecency)
      .slice(0, REVIEW_VISIBLE_ITEM_LIMIT),
    [pmrPrrWorkflowEvents],
  );
  const visibleLaunchFeedbackIssues = useMemo(
    () => [...launchFeedbackIssues]
      .sort(compareIssueRecency)
      .slice(0, REVIEW_VISIBLE_ITEM_LIMIT),
    [launchFeedbackIssues],
  );
  const visibleReviewEvents = useMemo(
    () => [...reviewEvents]
      .sort(compareEventRecency)
      .slice(0, REVIEW_VISIBLE_ITEM_LIMIT),
    [reviewEvents],
  );
  const openLaunchFeedbackIssues = useMemo(
    () => launchFeedbackIssues.filter(isOpenIssue),
    [launchFeedbackIssues],
  );
  const feedbackSignals = useMemo(
    () =>
      buildSignals({
        issues,
        risks,
        changes,
        deliverables,
        closeConditions,
        handoffs,
      }),
    [issues, risks, changes, deliverables, closeConditions, handoffs],
  );

  const completedReviewEvents = reviewEvents.filter((item) => item.statusCode === 'completed').length;
  const readyReviewEvents = reviewEvents.filter((item) => item.rollup?.readiness.isReady).length;
  const completedDeliverables = deliverables.filter((item) => isOutputDone(item.submissionStatusCode)).length;
  const checkedCloseConditions = closeConditions.filter((item) => item.isChecked).length;
  const reviewMetrics: ReviewMetrics = {
    completedReviewEvents,
    totalReviewEvents: reviewEvents.length,
    readyReviewEvents,
    completedDeliverables,
    totalDeliverables: deliverables.length,
    checkedCloseConditions,
    totalCloseConditions: closeConditions.length,
    feedbackSignals: feedbackSignals.length,
    openLaunchFeedbackIssues: openLaunchFeedbackIssues.length,
    totalLaunchFeedbackIssues: launchFeedbackIssues.length,
  };
  const pmrPrrReadinessChecks = buildPmrPrrReadinessChecks({
    metrics: reviewMetrics,
    launchFeedbackIssues,
    issues,
    risks,
    changes,
    deliverables,
    closeConditions,
    handoffs,
  });
  const isPmrPrrDraftReady = pmrPrrReadinessChecks.every((item) => item.passed);

  const handleCreateFeedbackIssue = async () => {
    try {
      await createProjectIssue.mutateAsync({
        projectId,
        data: {
          issueCode: createCode('FB', projectId),
          issueTitle: feedbackForm.issueTitle.trim(),
          description: feedbackForm.description.trim() || undefined,
          issueTypeCode: feedbackForm.issueTypeCode,
          statusCode: 'open',
          priorityCode: feedbackForm.priorityCode,
          memo: 'review-feedback',
        },
      });
      toast.success('피드백 이슈를 등록했습니다.');
      setFeedbackForm(INITIAL_FEEDBACK_FORM);
      setShowFeedbackDialog(false);
    } catch (error) {
      toast.error('피드백 이슈를 등록하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 입력값을 확인해주세요.'),
      });
    }
  };

  const handleCreateReviewEvent = async () => {
    try {
      await createEvent.mutateAsync({
        projectId,
        data: {
          eventCode: createCode('REV', projectId),
          eventName: reviewEventForm.eventName.trim(),
          eventTypeCode: reviewEventForm.eventTypeCode,
          statusCode: reviewEventForm.statusCode,
          scheduledAt: reviewEventForm.scheduledAt || undefined,
          summary: reviewEventForm.summary.trim() || undefined,
          memo: 'review-feedback',
        },
      });
      toast.success('리뷰 이벤트를 등록했습니다.');
      setReviewEventForm(INITIAL_REVIEW_EVENT_FORM);
      setShowReviewEventDialog(false);
    } catch (error) {
      toast.error('리뷰 이벤트를 등록하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 입력값을 확인해주세요.'),
      });
    }
  };

  const handleUpdateLaunchFeedbackStatus = async (
    issue: ProjectIssueItem,
    statusCode: string,
  ) => {
    const isTerminal = isFeedbackIssueTerminal(statusCode);

    try {
      await updateProjectIssue.mutateAsync({
        projectId,
        projectIssueId: String(issue.projectIssueId),
        data: {
          statusCode,
          resolvedAt: isTerminal ? new Date().toISOString() : null,
          resolution: isTerminal
            ? issue.resolution || '리뷰 탭에서 런칭 피드백 처리 완료'
            : null,
        },
      });
      toast.success(isTerminal ? '피드백을 해결 처리했습니다.' : '피드백 상태를 갱신했습니다.');
    } catch (error) {
      toast.error('피드백 상태를 갱신하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 이슈 상태를 확인해주세요.'),
      });
    }
  };

  const handleDownloadSnapshot = () => {
    const generatedAt = new Date().toISOString();
    const content = buildLaunchReviewSnapshot({
      projectId,
      generatedAt,
      metrics: reviewMetrics,
      feedbackSignals,
      launchFeedbackIssues,
      reviewEvents,
    });
    const timestamp = generatedAt.replace(/[:.]/g, '-');

    downloadTextFile(`pms-launch-review-${projectId}-${timestamp}.md`, content);
    toast.success('리뷰 스냅샷을 다운로드했습니다.', {
      description: REVIEW_SNAPSHOT_NOTICE,
    });
  };

  const handleDownloadPmrPrrDraft = () => {
    const generatedAt = new Date().toISOString();
    const content = buildPmrPrrDraftReport({
      projectId,
      generatedAt,
      metrics: reviewMetrics,
      feedbackSignals,
      launchFeedbackIssues,
      reviewEvents,
      issues,
      risks,
      changes,
      deliverables,
      closeConditions,
      handoffs,
    });
    const timestamp = generatedAt.replace(/[:.]/g, '-');

    downloadTextFile(`pms-pmr-prr-draft-${projectId}-${timestamp}.md`, content);
    toast.success('PMR/PRR 초안을 다운로드했습니다.', {
      description: PMR_PRR_DRAFT_NOTICE,
    });
  };

  const handleCreatePmrPrrLedgerEntry = async () => {
    const generatedAt = new Date().toISOString();
    const decision = isPmrPrrDraftReady ? '릴리즈 준비 충족' : '확인 필요 항목 존재';

    try {
      await createEvent.mutateAsync({
        projectId,
        data: {
          eventCode: createCode('PMRPRR', projectId),
          eventName: `PMR/PRR 발행 기록 - ${decision}`,
          eventTypeCode: 'report',
          statusCode: 'completed',
          occurredAt: generatedAt,
          summary: buildPmrPrrLedgerSummary({
            metrics: reviewMetrics,
            decision,
            readinessChecks: pmrPrrReadinessChecks,
          }),
          description: PMR_PRR_LEDGER_NOTICE,
          memo: PMR_PRR_LEDGER_MEMO,
        },
      });
      toast.success('PMR/PRR 발행 원장에 기록했습니다.', {
        description: PMR_PRR_LEDGER_NOTICE,
      });
    } catch (error) {
      toast.error('PMR/PRR 발행 원장을 기록하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 이벤트 저장 상태를 확인해주세요.'),
      });
    }
  };

  const handleCreatePmrPrrPublicationWorkflow = async () => {
    const generatedAt = new Date().toISOString();
    const decision = isPmrPrrDraftReady ? '릴리즈 준비 충족' : '확인 필요 항목 존재';
    const cycleLabel = PMR_PRR_PUBLICATION_CYCLE_LABELS[pmrPrrPublicationForm.cycle];
    const repeatCount = Number(pmrPrrPublicationForm.repeatCount);
    const repeatLabel = PMR_PRR_REPEAT_COUNT_LABELS[pmrPrrPublicationForm.repeatCount];
    const approverLabel = formatPmrPrrApproverLabel(members, pmrPrrPublicationForm.ownerUserId);
    const approvalPolicyLabel = PMR_PRR_APPROVAL_POLICY_LABELS[pmrPrrPublicationForm.approvalPolicy];
    const approvalLineLabel = summarizePmrPrrNames(
      buildPmrPrrApprovalLineLabels(
        members,
        pmrPrrPublicationForm.approvalPolicy,
        pmrPrrPublicationForm.ownerUserId,
      ),
    );
    const notificationAudienceLabel =
      PMR_PRR_NOTIFICATION_AUDIENCE_LABELS[pmrPrrPublicationForm.notificationAudience];
    const notificationTargetLabel = summarizePmrPrrNames(
      buildPmrPrrNotificationTargetLabels(
        members,
        pmrPrrPublicationForm.approvalPolicy,
        pmrPrrPublicationForm.notificationAudience,
        pmrPrrPublicationForm.ownerUserId,
      ),
    );
    const baseScheduledAt = pmrPrrPublicationForm.scheduledAt
      ? new Date(pmrPrrPublicationForm.scheduledAt)
      : new Date(generatedAt);

    try {
      for (let index = 0; index < repeatCount; index += 1) {
        const scheduledAt = addPublicationCycleDate(
          baseScheduledAt,
          pmrPrrPublicationForm.cycle,
          index,
        ).toISOString();
        const sequenceLabel = repeatCount > 1 ? ` (${index + 1}/${repeatCount})` : '';

        await createEvent.mutateAsync({
          projectId,
          data: {
            eventCode: createCode(`PMRPRR-SCH${index + 1}`, projectId),
            eventName: `PMR/PRR 정기 발행 - ${cycleLabel}${sequenceLabel}`,
            eventTypeCode: 'report',
            statusCode: 'planned',
            scheduledAt,
            ownerUserId: pmrPrrPublicationForm.ownerUserId || undefined,
            summary: buildPmrPrrWorkflowSummary({
              cycleLabel,
              repeatLabel,
              approverLabel,
              approvalPolicyLabel,
              approvalLineLabel,
              notificationAudienceLabel,
              notificationTargetLabel,
              decision,
              metrics: reviewMetrics,
              readinessChecks: pmrPrrReadinessChecks,
              note: pmrPrrPublicationForm.summary,
            }),
            description: PMR_PRR_WORKFLOW_NOTICE,
            memo: PMR_PRR_WORKFLOW_MEMO,
          },
        });
      }

      toast.success(
        repeatCount > 1
          ? `PMR/PRR 정기 발행 ${repeatCount}차수를 예약했습니다.`
          : 'PMR/PRR 정기 발행을 예약했습니다.',
        {
          description: pmrPrrPublicationForm.ownerUserId
            ? '결재선과 수신 정책에 따라 PMS 공통 알림을 생성했습니다.'
            : PMR_PRR_WORKFLOW_NOTICE,
        },
      );
      setPmrPrrPublicationForm(createInitialPmrPrrPublicationForm());
      setShowPmrPrrPublicationDialog(false);
    } catch (error) {
      toast.error('PMR/PRR 정기 발행을 예약하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 이벤트 저장 상태를 확인해주세요.'),
      });
    }
  };

  const handleOpenPmrPrrPublicationDialog = () => {
    setPmrPrrPublicationForm((form) => ({
      ...form,
      ownerUserId:
        form.ownerUserId
        || selectDefaultPmrPrrApproverId(members, form.approvalPolicy, currentUserId),
    }));
    setShowPmrPrrPublicationDialog(true);
  };

  const handleUpdatePmrPrrWorkflowStatus = async (
    event: ProjectEventItem,
    statusCode: PmrPrrWorkflowStatus,
  ) => {
    const generatedAt = new Date().toISOString();
    const nextStatusLabel = labelPmrPrrWorkflowStatus(statusCode);

    try {
      const response = await updateEvent.mutateAsync({
        projectId,
        eventId: String(event.eventId),
        data: {
          statusCode,
          summary: buildPmrPrrWorkflowTransitionSummary({
            event,
            nextStatusLabel,
            generatedAt,
          }),
          description: event.description || PMR_PRR_WORKFLOW_NOTICE,
          memo: event.memo || PMR_PRR_WORKFLOW_MEMO,
          ...(statusCode === 'completed' ? { occurredAt: generatedAt } : {}),
        },
      });
      const updatedEvent = response.data;
      if (updatedEvent) {
        setPmrPrrWorkflowEventOverrides((current) => ({
          ...current,
          [String(updatedEvent.eventId)]: updatedEvent,
        }));
      }
      toast.success(`PMR/PRR 워크플로우를 ${nextStatusLabel} 상태로 변경했습니다.`);
    } catch (error) {
      toast.error('PMR/PRR 워크플로우 상태를 변경하지 못했습니다.', {
        description: getErrorMessage(error, '권한 또는 이벤트 상태를 확인해주세요.'),
      });
    }
  };

  return (
    <div className="space-y-4" data-testid="pms-review-summary-tab">
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4" />
            리뷰 피드백 수집
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            사용자 확인 사항은 정식 이슈로, 리뷰 일정과 결과는 프로젝트 이벤트로 남깁니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="pms-review-pmr-prr-workflow-action"
            disabled={!canManageFeedback || createEvent.isPending}
            onClick={handleOpenPmrPrrPublicationDialog}
          >
            <CalendarClock className="h-4 w-4" />
            정기 발행 예약
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="pms-review-pmr-prr-ledger-action"
            disabled={!canManageFeedback || createEvent.isPending}
            onClick={handleCreatePmrPrrLedgerEntry}
          >
            <ClipboardCheck className="h-4 w-4" />
            원장 기록
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="pms-review-pmr-prr-draft-download-action"
            onClick={handleDownloadPmrPrrDraft}
          >
            <FileOutput className="h-4 w-4" />
            PMR/PRR 초안
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="pms-review-snapshot-download-action"
            onClick={handleDownloadSnapshot}
          >
            <FileOutput className="h-4 w-4" />
            스냅샷 다운로드
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="pms-review-feedback-issue-action"
            disabled={!canManageFeedback}
            onClick={() => setShowFeedbackDialog(true)}
          >
            <Plus className="h-4 w-4" />
            피드백 이슈
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            data-testid="pms-review-event-action"
            disabled={!canManageFeedback}
            onClick={() => setShowReviewEventDialog(true)}
          >
            <Plus className="h-4 w-4" />
            리뷰 이벤트
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="보고/리뷰 이벤트"
          value={`${completedReviewEvents}/${reviewEvents.length}`}
          detail={`연결 준비 완료 ${readyReviewEvents}건`}
          icon={MessageSquareText}
        />
        <MetricCard
          label="피드백 큐"
          value={`${feedbackSignals.length}건`}
          detail={`런칭 피드백 열림 ${openLaunchFeedbackIssues.length}건`}
          icon={AlertCircle}
        />
        <MetricCard
          label="산출물"
          value={`${completedDeliverables}/${deliverables.length}`}
          detail="확정/승인/최종/면제 기준"
          icon={FileOutput}
        />
        <MetricCard
          label="종료조건"
          value={`${checkedCloseConditions}/${closeConditions.length}`}
          detail="전 상태 기준 체크 현황"
          icon={ClipboardCheck}
        />
      </div>

      <section className="rounded-lg border bg-card" data-testid="pms-review-pmr-prr-readiness">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardCheck className="h-4 w-4" />
              PMR/PRR 준비도
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              현재 PMS 실행 데이터 기준 초안 판정입니다. 발행 원장, 반복 예약, 승인자 알림, 만기 예약 자동 rollover는 프로젝트 이벤트로 기록합니다.
            </p>
          </div>
          <span
            className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
            data-testid="pms-review-pmr-prr-decision"
          >
            {isPmrPrrDraftReady ? '릴리즈 준비 충족' : '확인 필요 항목 존재'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {pmrPrrReadinessChecks.map((check) => (
            <div
              key={check.label}
              className="min-w-0 rounded-md border border-ssoo-content-border bg-muted/30 p-3"
              data-testid="pms-review-pmr-prr-check"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{check.label}</span>
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-ssoo-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-ssoo-warning" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card" data-testid="pms-review-pmr-prr-ledger">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileOutput className="h-4 w-4" />
              PMR/PRR 발행·승인 원장
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              프로젝트 이벤트에 저장된 PMR/PRR 발행 이력, 반복 예약, 승인자와 알림 상태입니다.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            최근 {visiblePmrPrrWorkflowEvents.length} / 전체 {pmrPrrWorkflowEvents.length}
          </span>
        </div>
        {pmrPrrWorkflowEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            아직 기록된 PMR/PRR 발행 이력이 없습니다.
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {visiblePmrPrrWorkflowEvents.map((event) => (
                <PmrPrrLedgerEventCard
                  key={String(event.eventId)}
                  event={event}
                  approverLabel={formatPmrPrrApproverLabel(members, event.ownerUserId)}
                  canManage={canManageFeedback}
                  currentUserId={currentUserId}
                  isUpdating={updateEvent.isPending}
                  onStatusChange={handleUpdatePmrPrrWorkflowStatus}
                />
              ))}
            </div>
            <div className="hidden overflow-hidden md:block">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="p-3 text-left font-medium">기록</TableHead>
                    <TableHead className="p-3 text-left font-medium">요약</TableHead>
                    <TableHead className="p-3 text-left font-medium">발행일</TableHead>
                    <TableHead className="p-3 text-left font-medium">승인자</TableHead>
                    <TableHead className="p-3 text-center font-medium">상태</TableHead>
                    <TableHead className="p-3 text-right font-medium">승인/발행</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {visiblePmrPrrWorkflowEvents.map((event) => (
                    <TableRow
                      key={String(event.eventId)}
                      className="hover:bg-muted/20"
                      data-testid="pms-review-pmr-prr-ledger-item"
                      data-pmr-prr-event-id={String(event.eventId)}
                      data-pmr-prr-status-code={event.statusCode}
                    >
                      <TableCell className="p-3 font-medium text-foreground">
                        {event.eventName}
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">
                        <span className="line-clamp-2">{event.summary || event.description || '-'}</span>
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">
                        {formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">
                        {formatPmrPrrApproverLabel(members, event.ownerUserId)}
                      </TableCell>
                      <TableCell className="p-3 text-center text-xs">
                        {labelPmrPrrWorkflowStatus(event.statusCode)}
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        <PmrPrrWorkflowActions
                          event={event}
                          canManage={canManageFeedback}
                          currentUserId={currentUserId}
                          isUpdating={updateEvent.isPending}
                          onStatusChange={handleUpdatePmrPrrWorkflowStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card" data-testid="pms-review-launch-feedback-list">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4" />
              수집된 런칭 피드백
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              리뷰 탭에서 등록한 피드백 이슈를 처리 상태까지 이어서 관리합니다.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            열림 {openLaunchFeedbackIssues.length} / 최근 {visibleLaunchFeedbackIssues.length} / 전체 {launchFeedbackIssues.length}
          </span>
        </div>
        {launchFeedbackIssues.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            아직 수집된 런칭 피드백 이슈가 없습니다.
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {visibleLaunchFeedbackIssues.map((issue) => (
                <LaunchFeedbackIssueCard
                  key={String(issue.projectIssueId)}
                  issue={issue}
                  canManage={canManageFeedback}
                  isUpdating={updateProjectIssue.isPending}
                  onStatusChange={handleUpdateLaunchFeedbackStatus}
                />
              ))}
            </div>
            <div className="hidden overflow-hidden md:block">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="p-3 text-left font-medium">피드백</TableHead>
                    <TableHead className="p-3 text-center font-medium">유형</TableHead>
                    <TableHead className="p-3 text-center font-medium">상태</TableHead>
                    <TableHead className="p-3 text-center font-medium">우선순위</TableHead>
                    <TableHead className="p-3 text-center font-medium">처리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {visibleLaunchFeedbackIssues.map((issue) => (
                    <TableRow
                      key={String(issue.projectIssueId)}
                      className="hover:bg-muted/20"
                      data-testid="pms-review-launch-feedback-item"
                    >
                      <TableCell className="p-3">
                        <div className="font-medium text-foreground">{issue.issueTitle}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {issue.description || '상세 내용 없음'}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center text-xs">
                        {labelOf(QUICK_ISSUE_TYPE_LABELS, issue.issueTypeCode)}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Select
                          value={issue.statusCode}
                          onValueChange={(statusCode) =>
                            handleUpdateLaunchFeedbackStatus(issue, statusCode)
                          }
                          disabled={!canManageFeedback || updateProjectIssue.isPending}
                        >
                          <SelectTrigger
                            className="mx-auto h-7 w-28 text-xs"
                            data-testid="pms-review-feedback-status-select"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ISSUE_STATUS_LABELS).map(([code, label]) => (
                              <SelectItem key={code} value={code}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-3 text-center text-xs">
                        {labelOf(QUICK_PRIORITY_LABELS, issue.priorityCode)}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mx-auto"
                          data-testid="pms-review-feedback-resolve-action"
                          disabled={
                            !canManageFeedback
                            || updateProjectIssue.isPending
                            || isFeedbackIssueTerminal(issue.statusCode)
                          }
                          onClick={() => handleUpdateLaunchFeedbackStatus(issue, 'resolved')}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          해결
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card" data-testid="pms-review-event-list">
        <div className="border-b px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4" />
            보고/리뷰 이벤트
          </h3>
        </div>
        {isLoadingEvents ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            이벤트를 불러오는 중...
          </div>
        ) : reviewEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            보고 또는 리뷰 이벤트가 아직 없습니다.
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {visibleReviewEvents.map((event) => (
                <ReviewEventCard key={String(event.eventId)} event={event} />
              ))}
            </div>
            <div className="hidden overflow-hidden md:block">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="p-3 text-left font-medium">이벤트</TableHead>
                    <TableHead className="p-3 text-center font-medium">유형</TableHead>
                    <TableHead className="p-3 text-center font-medium">상태</TableHead>
                    <TableHead className="p-3 text-left font-medium">일시</TableHead>
                    <TableHead className="p-3 text-left font-medium">연결 요약</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {visibleReviewEvents.map((event) => (
                    <TableRow key={String(event.eventId)} className="hover:bg-muted/20">
                      <TableCell className="p-3">
                        <div className="font-medium text-foreground">{event.eventName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.summary || event.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center text-xs">
                        {labelOf(EVENT_TYPE_LABELS, event.eventTypeCode)}
                      </TableCell>
                      <TableCell className="p-3 text-center text-xs">
                        {labelOf(EVENT_STATUS_LABELS, event.statusCode)}
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">
                        {formatPmsDateTime(event.occurredAt ?? event.scheduledAt)}
                      </TableCell>
                      <TableCell className="p-3">
                        <EventRollupSummary rollup={event.rollup} showByStatus />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card" data-testid="pms-review-feedback-queue">
        <div className="border-b px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4" />
            피드백 큐
          </h3>
        </div>
        {feedbackSignals.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            현재 피드백을 요청할 미해결 항목이 없습니다.
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {feedbackSignals.map((signal, index) => (
                <FeedbackSignalCard key={`${signal.kind}-${index}`} signal={signal} />
              ))}
            </div>
            <div className="hidden overflow-hidden md:block">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="p-3 text-left font-medium">구분</TableHead>
                    <TableHead className="p-3 text-left font-medium">항목</TableHead>
                    <TableHead className="p-3 text-center font-medium">상태</TableHead>
                    <TableHead className="p-3 text-left font-medium">확인할 일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {feedbackSignals.map((signal, index) => (
                    <TableRow key={`${signal.kind}-${index}`} className="hover:bg-muted/20">
                      <TableCell className="p-3">
                        <FeedbackSignalBadge kind={signal.kind} />
                      </TableCell>
                      <TableCell className="p-3 font-medium text-foreground">{signal.title}</TableCell>
                      <TableCell className="p-3 text-center text-xs text-muted-foreground">
                        {signal.status}
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">{signal.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitCompareArrows className="h-4 w-4" />
          리뷰 범위
        </h3>
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-3">
          <div className="rounded-md bg-muted/40 px-3 py-2">PMR/PRR은 현재 데이터 기반 준비도 화면, 초안 다운로드, 프로젝트 이벤트 기반 발행 원장, 반복 예약 생성, 만기 예약 자동 rollover, 승인자 지정과 알림까지 제공합니다.</div>
          <div className="rounded-md bg-muted/40 px-3 py-2">계약·대금 판단은 CRM 스냅샷을 참조만 합니다.</div>
          <div className="rounded-md bg-muted/40 px-3 py-2">이 탭은 PMS 실행 이벤트와 피드백 후보를 묶고, launch feedback 을 정식 이슈/이벤트로 수집합니다.</div>
        </div>
      </section>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent
          className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
          data-testid="pms-review-feedback-dialog"
        >
          <DialogHeader>
            <DialogTitle>피드백 이슈 등록</DialogTitle>
            <DialogDescription>
              사용자 확인·개선 요청·장애 제보를 프로젝트 정식 이슈로 남깁니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="피드백 제목"
              data-testid="pms-review-feedback-title-input"
              value={feedbackForm.issueTitle}
              onChange={(event) =>
                setFeedbackForm({ ...feedbackForm, issueTitle: event.target.value })
              }
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={feedbackForm.issueTypeCode}
                onValueChange={(value) =>
                  setFeedbackForm({ ...feedbackForm, issueTypeCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUICK_ISSUE_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={feedbackForm.priorityCode}
                onValueChange={(value) =>
                  setFeedbackForm({ ...feedbackForm, priorityCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUICK_PRIORITY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="상세 피드백"
              data-testid="pms-review-feedback-description-input"
              rows={4}
              value={feedbackForm.description}
              onChange={(event) =>
                setFeedbackForm({ ...feedbackForm, description: event.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowFeedbackDialog(false)}
            >
              취소
            </Button>
            <Button
              className="w-full sm:w-auto"
              data-testid="pms-review-feedback-submit"
              onClick={handleCreateFeedbackIssue}
              disabled={!feedbackForm.issueTitle.trim() || createProjectIssue.isPending}
            >
              {createProjectIssue.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPmrPrrPublicationDialog} onOpenChange={setShowPmrPrrPublicationDialog}>
        <DialogContent
          className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
          data-testid="pms-review-pmr-prr-workflow-dialog"
        >
          <DialogHeader>
            <DialogTitle>PMR/PRR 정기 발행 예약</DialogTitle>
            <DialogDescription>
              현재 준비도 판정을 기준으로 반복 발행 건을 만들고 결재선과 수신 정책에 따라 PMS 알림을 보냅니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={pmrPrrPublicationForm.cycle}
                onValueChange={(value) =>
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    cycle: value as PmrPrrPublicationCycle,
                  })
                }
              >
                <SelectTrigger data-testid="pms-review-pmr-prr-workflow-cycle-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PMR_PRR_PUBLICATION_CYCLE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                data-testid="pms-review-pmr-prr-workflow-scheduled-at-input"
                value={pmrPrrPublicationForm.scheduledAt}
                onChange={(event) =>
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    scheduledAt: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={pmrPrrPublicationForm.repeatCount}
                onValueChange={(value) =>
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    repeatCount: value as PmrPrrRepeatCount,
                  })
                }
              >
                <SelectTrigger data-testid="pms-review-pmr-prr-workflow-repeat-count-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PMR_PRR_REPEAT_COUNT_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pmrPrrPublicationForm.ownerUserId || '__none'}
                onValueChange={(value) =>
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    ownerUserId: value === '__none' ? '' : value,
                  })
                }
              >
                <SelectTrigger data-testid="pms-review-pmr-prr-workflow-approver-select">
                  <SelectValue placeholder="승인자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">승인자 미지정</SelectItem>
                  {pmrPrrApproverOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      프로젝트 멤버 없음
                    </SelectItem>
                  ) : (
                    pmrPrrApproverOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        {option.roles.length > 0 ? ` · ${option.roles.join('/')}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={pmrPrrPublicationForm.approvalPolicy}
                onValueChange={(value) => {
                  const approvalPolicy = value as PmrPrrApprovalPolicy;
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    approvalPolicy,
                    ownerUserId:
                      pmrPrrPublicationForm.ownerUserId
                      || selectDefaultPmrPrrApproverId(members, approvalPolicy, currentUserId),
                  });
                }}
              >
                <SelectTrigger data-testid="pms-review-pmr-prr-workflow-approval-policy-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PMR_PRR_APPROVAL_POLICY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pmrPrrPublicationForm.notificationAudience}
                onValueChange={(value) =>
                  setPmrPrrPublicationForm({
                    ...pmrPrrPublicationForm,
                    notificationAudience: value as PmrPrrNotificationAudience,
                  })
                }
              >
                <SelectTrigger data-testid="pms-review-pmr-prr-workflow-notification-audience-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PMR_PRR_NOTIFICATION_AUDIENCE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2"
              data-testid="pms-review-pmr-prr-workflow-notification-preview"
            >
              <div className="flex items-center gap-2">
                <Repeat2 className="h-4 w-4" />
                {PMR_PRR_REPEAT_COUNT_LABELS[pmrPrrPublicationForm.repeatCount]}
              </div>
              <div className="flex items-center gap-2">
                <UserRoundCheck className="h-4 w-4" />
                {formatPmrPrrApproverLabel(members, pmrPrrPublicationForm.ownerUserId)}
              </div>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {PMR_PRR_NOTIFICATION_AUDIENCE_LABELS[pmrPrrPublicationForm.notificationAudience]}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {PMR_PRR_APPROVAL_POLICY_LABELS[pmrPrrPublicationForm.approvalPolicy]}
              </div>
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                {summarizePmrPrrNames(
                  buildPmrPrrNotificationTargetLabels(
                    members,
                    pmrPrrPublicationForm.approvalPolicy,
                    pmrPrrPublicationForm.notificationAudience,
                    pmrPrrPublicationForm.ownerUserId,
                  ),
                )}
              </div>
            </div>
            <Textarea
              placeholder="승인자에게 남길 발행 메모"
              data-testid="pms-review-pmr-prr-workflow-summary-input"
              rows={4}
              value={pmrPrrPublicationForm.summary}
              onChange={(event) =>
                setPmrPrrPublicationForm({
                  ...pmrPrrPublicationForm,
                  summary: event.target.value,
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowPmrPrrPublicationDialog(false)}
            >
              취소
            </Button>
            <Button
              className="w-full sm:w-auto"
              data-testid="pms-review-pmr-prr-workflow-submit"
              onClick={handleCreatePmrPrrPublicationWorkflow}
              disabled={
                !pmrPrrPublicationForm.scheduledAt
                || !pmrPrrPublicationForm.ownerUserId
                || createEvent.isPending
              }
            >
              {createEvent.isPending ? '예약 중...' : '예약'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewEventDialog} onOpenChange={setShowReviewEventDialog}>
        <DialogContent
          className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
          data-testid="pms-review-event-dialog"
        >
          <DialogHeader>
            <DialogTitle>리뷰 이벤트 등록</DialogTitle>
            <DialogDescription>
              리뷰 회의, 보고, 인수 확인 같은 피드백 세션을 프로젝트 이벤트로 남깁니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="리뷰 이벤트 이름"
              data-testid="pms-review-event-name-input"
              value={reviewEventForm.eventName}
              onChange={(event) =>
                setReviewEventForm({ ...reviewEventForm, eventName: event.target.value })
              }
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={reviewEventForm.eventTypeCode}
                onValueChange={(value) =>
                  setReviewEventForm({ ...reviewEventForm, eventTypeCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS)
                    .filter(([code]) => ['meeting', 'report', 'review', 'handoff'].includes(code))
                    .map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={reviewEventForm.statusCode}
                onValueChange={(value) =>
                  setReviewEventForm({ ...reviewEventForm, statusCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="datetime-local"
              data-testid="pms-review-event-scheduled-at-input"
              value={reviewEventForm.scheduledAt}
              onChange={(event) =>
                setReviewEventForm({ ...reviewEventForm, scheduledAt: event.target.value })
              }
            />
            <Textarea
              placeholder="리뷰 요약 또는 확인할 내용"
              data-testid="pms-review-event-summary-input"
              rows={4}
              value={reviewEventForm.summary}
              onChange={(event) =>
                setReviewEventForm({ ...reviewEventForm, summary: event.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowReviewEventDialog(false)}
            >
              취소
            </Button>
            <Button
              className="w-full sm:w-auto"
              data-testid="pms-review-event-submit"
              onClick={handleCreateReviewEvent}
              disabled={!reviewEventForm.eventName.trim() || createEvent.isPending}
            >
              {createEvent.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
