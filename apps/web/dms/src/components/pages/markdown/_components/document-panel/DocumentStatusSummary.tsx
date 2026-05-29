'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Lock,
  RefreshCw,
  RotateCcw,
  Unlock,
  UserPen,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  CollaborationMemberClient,
  DocumentCollaborationSnapshotClient,
  DocumentPathIsolationStateClient,
  DocumentPublishStateClient,
  DocumentSoftLockClient,
  GitSyncStatusClient,
} from '@/lib/api/collaborationApi';

type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'muted';

interface StatusMeta {
  label: string;
  detail: string;
  tone: StatusTone;
  icon: LucideIcon;
  animate?: boolean;
}

interface DocumentStatusSummaryProps {
  snapshot: DocumentCollaborationSnapshotClient;
  currentUserLoginId?: string;
  onRefreshPublishState?: () => Promise<void> | void;
  onRetryPublish?: () => Promise<void> | void;
}

const toneClassNames: Record<StatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  muted: 'border-ssoo-content-border bg-white text-ssoo-primary/55',
};

const summaryToneClassNames: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  muted: 'bg-ssoo-content-bg text-ssoo-primary/60',
};

const blockedActionLabels: Record<DocumentPathIsolationStateClient['blockedActions'][number], string> = {
  write: '작성',
  updateMetadata: '정보 수정',
  rename: '이름 변경',
  delete: '삭제',
  upload: '업로드',
  resync: '저장소 새로고침',
  publish: '원격 반영',
};

function formatDateTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatNames(members: CollaborationMemberClient[]): string {
  const names = members.map((member) => member.displayName || member.loginId);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}명`;
}

function formatSyncSummary(syncStatus?: GitSyncStatusClient): string | null {
  if (!syncStatus) return null;

  if (!syncStatus.remoteConfigured) {
    return '원격 저장소가 설정되지 않았습니다.';
  }

  if (!syncStatus.remoteExists || syncStatus.state === 'remote-missing') {
    return '원격 브랜치를 찾지 못했습니다.';
  }

  switch (syncStatus.state) {
    case 'in-sync':
      return '원격과 동일합니다.';
    case 'local-ahead':
      return `원격 반영 대기 ${syncStatus.aheadCount}건`;
    case 'remote-ahead':
      return `원격 변경 확인 필요 ${syncStatus.behindCount}건`;
    case 'diverged':
      return `로컬 ${syncStatus.aheadCount}건 / 원격 ${syncStatus.behindCount}건 확인 필요`;
    case 'local-only':
      return '로컬에서만 관리 중입니다.';
    default:
      return '원격 상태를 확인할 수 없습니다.';
  }
}

function getPublishMeta(status: DocumentPublishStateClient['status']): StatusMeta {
  switch (status) {
    case 'clean':
      return {
        label: '동기화 완료',
        detail: '원격 반영이 완료되었습니다.',
        tone: 'success',
        icon: CheckCircle2,
      };
    case 'dirty-uncommitted':
      return {
        label: '반영 대기',
        detail: '저장된 변경을 원격에 반영해야 합니다.',
        tone: 'warning',
        icon: CloudUpload,
      };
    case 'publishing':
      return {
        label: '반영 중',
        detail: '변경 내용을 원격에 반영하는 중입니다.',
        tone: 'info',
        icon: RefreshCw,
        animate: true,
      };
    case 'committed-unpushed':
      return {
        label: '반영 대기',
        detail: '변경 내용이 준비되었고 원격 반영을 기다리고 있습니다.',
        tone: 'warning',
        icon: CloudUpload,
      };
    case 'sync-blocked':
      return {
        label: '동기화 충돌',
        detail: '원격 상태 확인이 필요해 변경 작업이 제한될 수 있습니다.',
        tone: 'danger',
        icon: AlertTriangle,
      };
    case 'push-failed':
      return {
        label: '반영 실패',
        detail: '변경 내용을 원격에 반영하지 못했습니다.',
        tone: 'danger',
        icon: AlertTriangle,
      };
    default:
      return {
        label: '상태 확인',
        detail: '문서 상태를 확인할 수 없습니다.',
        tone: 'warning',
        icon: AlertTriangle,
      };
  }
}

function buildPublishDetail(state: DocumentPublishStateClient, isolation: DocumentPathIsolationStateClient | null): string {
  const meta = getPublishMeta(state.status);
  const lines = [meta.detail];
  const syncSummary = formatSyncSummary(state.syncStatus);
  const actor = state.lastActorDisplayName || state.lastActorLoginId;
  const queuedAt = formatDateTime(state.lastQueuedAt);
  const publishedAt = formatDateTime(state.lastPublishedAt);
  const affectedPaths = state.affectedPaths ?? [];

  if (syncSummary) lines.push(`원격 상태: ${syncSummary}`);
  if (actor) lines.push(`최근 작업자: ${actor}`);
  if (queuedAt) lines.push(`최근 요청: ${queuedAt}`);
  if (publishedAt) lines.push(`최근 반영: ${publishedAt}`);
  if (affectedPaths.length > 0) {
    const label = affectedPaths.length === 1 ? affectedPaths[0] : `${affectedPaths[0]} 외 ${affectedPaths.length - 1}개`;
    lines.push(`관련 문서: ${label}`);
  }
  if (state.lastError) lines.push(`오류: ${state.lastError}`);
  if (isolation) {
    lines.push(`수동 확인 필요: ${isolation.reason}`);
    lines.push(`제한 작업: ${isolation.blockedActions.map((action) => blockedActionLabels[action]).join(', ')}`);
  }

  return lines.join('\n');
}

function getPresenceMeta(members: CollaborationMemberClient[], currentUserLoginId?: string): StatusMeta {
  const otherMembers = currentUserLoginId
    ? members.filter((member) => member.loginId !== currentUserLoginId)
    : members;
  const otherEditors = otherMembers.filter((member) => member.mode === 'edit');

  if (otherEditors.length > 0) {
    return {
      label: '함께 편집 중',
      detail: `편집 중: ${formatNames(otherEditors)}`,
      tone: 'warning',
      icon: UserPen,
    };
  }

  if (otherMembers.length > 0) {
    return {
      label: '공동 열람',
      detail: `열람 중: ${formatNames(otherMembers)}`,
      tone: 'info',
      icon: Users,
    };
  }

  return {
    label: '단독 작업',
    detail: '다른 사용자는 이 문서를 보고 있지 않습니다.',
    tone: 'muted',
    icon: Users,
  };
}

function getLockMeta(lock: DocumentSoftLockClient | null, currentUserLoginId?: string): StatusMeta {
  if (!lock) {
    return {
      label: '잠금 없음',
      detail: '현재 편집 잠금이 없습니다.',
      tone: 'muted',
      icon: Unlock,
    };
  }

  const owner = lock.displayName || lock.loginId;
  const acquiredAt = formatDateTime(lock.acquiredAt);
  const sameUser = Boolean(currentUserLoginId && lock.loginId === currentUserLoginId);

  return {
    label: sameUser ? '내 잠금' : '잠금 있음',
    detail: [
      sameUser ? '현재 내가 편집 잠금을 보유 중입니다.' : `잠금 보유: ${owner}`,
      acquiredAt ? `시작: ${acquiredAt}` : null,
    ].filter(Boolean).join('\n'),
    tone: sameUser ? 'info' : 'warning',
    icon: Lock,
  };
}

function getSummary(snapshot: DocumentCollaborationSnapshotClient, currentUserLoginId?: string): { label: string; tone: StatusTone } {
  const publishStatus = snapshot.publishState.status;
  const hasPublishProblem = publishStatus === 'sync-blocked' || publishStatus === 'push-failed' || Boolean(snapshot.isolation);
  if (hasPublishProblem) {
    return { label: '조치 필요', tone: 'danger' };
  }

  const hasPendingPublish = publishStatus === 'dirty-uncommitted' || publishStatus === 'committed-unpushed' || publishStatus === 'publishing';
  const hasOtherEditor = snapshot.members.some((member) => member.mode === 'edit' && (!currentUserLoginId || member.loginId !== currentUserLoginId));
  const hasOtherLock = Boolean(snapshot.softLock && (!currentUserLoginId || snapshot.softLock.loginId !== currentUserLoginId));
  if (hasPendingPublish || hasOtherEditor || hasOtherLock) {
    return { label: '주의', tone: 'warning' };
  }

  return { label: '정상', tone: 'success' };
}

function StatusIcon({
  meta,
  detail,
}: {
  meta: StatusMeta;
  detail?: string;
}) {
  const Icon = meta.icon;
  const content = detail || meta.detail;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-white',
        toneClassNames[meta.tone]
      )}
      aria-label={meta.label}
      title={content}
    >
      <Icon className={cn('h-3.5 w-3.5', meta.animate && 'animate-spin')} />
    </button>
  );
}

function ActionIconButton({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-7 w-7 border-ssoo-content-border bg-white text-ssoo-primary/70 hover:bg-ssoo-sitemap-bg"
      aria-label={label}
      title={detail}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

export function DocumentStatusSummary({
  snapshot,
  currentUserLoginId,
  onRefreshPublishState,
  onRetryPublish,
}: DocumentStatusSummaryProps) {
  const publishMeta = getPublishMeta(snapshot.publishState.status);
  const presenceMeta = getPresenceMeta(snapshot.members, currentUserLoginId);
  const lockMeta = getLockMeta(snapshot.softLock, currentUserLoginId);
  const summary = getSummary(snapshot, currentUserLoginId);
  const canRefresh = Boolean(
    onRefreshPublishState
    && (snapshot.isolation || snapshot.publishState.status === 'sync-blocked' || snapshot.publishState.status === 'push-failed')
  );
  const canRetry = Boolean(
    onRetryPublish
    && !snapshot.isolation
    && (snapshot.publishState.status === 'sync-blocked' || snapshot.publishState.status === 'push-failed')
  );
  const showSummaryBadge = summary.tone !== 'success';
  const visibleStatusItems = [
    {
      key: 'publish',
      meta: publishMeta,
      detail: buildPublishDetail(snapshot.publishState, snapshot.isolation),
    },
    presenceMeta.tone !== 'muted' ? {
      key: 'presence',
      meta: presenceMeta,
    } : null,
    snapshot.softLock ? {
      key: 'lock',
      meta: lockMeta,
    } : null,
  ].filter((item): item is { key: string; meta: StatusMeta; detail?: string } => Boolean(item));

  return (
    <section className="border-b border-ssoo-content-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-label-md text-ssoo-primary">
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
            <Activity className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">상태</span>
        </span>
        {showSummaryBadge ? (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-badge', summaryToneClassNames[summary.tone])}>
            {summary.label}
          </span>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
          {visibleStatusItems.map((item) => (
            <StatusIcon key={item.key} meta={item.meta} detail={item.detail} />
          ))}
          {(canRefresh || canRetry) ? (
            <span className="mx-0.5 h-5 w-px bg-ssoo-content-border" aria-hidden />
          ) : null}
          {canRefresh && onRefreshPublishState ? (
            <ActionIconButton
              icon={RefreshCw}
              label="상태 새로고침"
              detail="원격 상태를 다시 확인합니다."
              onClick={() => void onRefreshPublishState()}
            />
          ) : null}
          {canRetry && onRetryPublish ? (
            <ActionIconButton
              icon={RotateCcw}
              label="원격 반영 재시도"
              detail="실패한 원격 반영을 다시 시도합니다."
              onClick={() => void onRetryPublish()}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
