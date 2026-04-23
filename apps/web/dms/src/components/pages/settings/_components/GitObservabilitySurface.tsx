import {
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  Link2,
} from 'lucide-react';
import type { SettingsRuntimeGitClient } from '@/lib/api/endpoints/settings';

function InfoRow({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/20 px-3 py-2">
      <p className="text-badge text-ssoo-primary/60">{label}</p>
      <p className={`mt-1 text-body-sm text-ssoo-primary ${breakAll ? 'break-all' : ''}`}>{value}</p>
    </div>
  );
}

function formatBindingState(state: SettingsRuntimeGitClient['state']) {
  switch (state) {
    case 'ready':
      return '바인딩 확인됨';
    case 'uninitialized':
      return '초기화 대기';
    case 'reconcile-needed':
      return 'reconcile 필요';
    case 'git-unavailable':
      return 'Git 사용 불가';
    default:
      return state;
  }
}

function formatSyncState(git: SettingsRuntimeGitClient) {
  switch (git.syncState) {
    case 'in-sync':
      return '원격과 동일';
    case 'local-ahead':
      return `로컬 선행 (+${git.syncStatus?.aheadCount ?? 0})`;
    case 'remote-ahead':
      return `원격 선행 (-${git.syncStatus?.behindCount ?? 0})`;
    case 'diverged':
      return `분기됨 (local +${git.syncStatus?.aheadCount ?? 0} / remote +${git.syncStatus?.behindCount ?? 0})`;
    case 'remote-missing':
      return '원격 브랜치 없음';
    case 'local-only':
      return '원격 미구성';
    default:
      return '동기 상태 미확인';
  }
}

function formatParityState(git: SettingsRuntimeGitClient) {
  if (!git.parityStatus.verified) {
    return 'Parity 확인 불가';
  }
  return git.parityStatus.canTreatLocalAsCanonical ? 'Parity 통과' : 'Parity 차단';
}

function formatRootRelation(git: SettingsRuntimeGitClient) {
  switch (git.rootRelation) {
    case 'exact':
      return 'configured root 와 actual Git root 가 일치합니다.';
    case 'configured-subdirectory':
      return git.actualGitRoot
        ? `configured root 가 actual Git root(${git.actualGitRoot}) 하위 경로에 있습니다. Git 명령은 actual root 기준으로 동작합니다.`
        : 'actual Git root 를 확인하지 못했습니다.';
    case 'not-inside-repository':
      return 'configured root 에서 Git working tree 를 확인하지 못했습니다.';
    default:
      return git.rootRelation;
  }
}

function getStatusTone(git: SettingsRuntimeGitClient) {
  if (git.state === 'reconcile-needed' || (git.parityStatus.verified && !git.parityStatus.canTreatLocalAsCanonical)) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      pillClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (git.state === 'ready' && git.syncState === 'in-sync') {
    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      pillClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    icon: <GitCommitHorizontal className="h-4 w-4" />,
    pillClassName: 'border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/80',
  };
}

export function GitObservabilitySurface({
  git,
}: {
  git: SettingsRuntimeGitClient | null;
}) {
  if (!git) {
    return null;
  }

  const tone = getStatusTone(git);
  const actualRemote = git.remoteUrl ? `${git.remoteName} · ${git.remoteUrl}` : `${git.remoteName} · (미구성)`;
  const configuredBootstrap = git.bootstrapRemoteUrl
    ? `${git.bootstrapRemoteUrl}${git.bootstrapBranch ? ` · branch ${git.bootstrapBranch}` : ''}`
    : '설정 없음';
  const driftNote = git.bootstrapRemoteUrl && git.remoteUrl && git.bootstrapRemoteUrl !== git.remoteUrl
    ? 'configured bootstrap remote 와 actual origin URL 이 다릅니다. 다음 initialize/rebind 전까지 현재 repo binding 이 우선됩니다.'
    : null;
  const reason = git.reason ?? git.parityStatus.reason;

  return (
    <section className="mb-3 space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">문서 정본 바인딩 / Git 운영 상태</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">현재 runtime 이 실제로 바라보는 문서 저장소</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              configured root, actual Git root, remote/branch, sync/parity, reconcile-needed 상태를 함께 보여 줍니다.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${tone.pillClassName}`}>
            {tone.icon}
            {formatBindingState(git.state)}
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <InfoRow label="Configured root (resolved)" value={git.configuredRoot} breakAll />
          <InfoRow label="Actual Git root" value={git.actualGitRoot ?? '감지되지 않음'} breakAll />
          <InfoRow label="Actual remote" value={actualRemote} breakAll />
          <InfoRow label="Actual branch" value={git.branch ?? '브랜치 미확인'} />
          <InfoRow label="Configured bootstrap" value={configuredBootstrap} breakAll />
          <InfoRow label="Root relation" value={formatRootRelation(git)} breakAll />
        </div>

        {git.configuredRootRelativeToAppRoot && (
          <p className="mt-3 text-caption text-ssoo-primary/70">
            상대 경로 설정값 <span className="font-medium">{git.configuredRootInput}</span> 은 app root
            {' '}
            <span className="font-medium">{git.appRoot}</span>
            {' '}
            기준으로 해석됩니다.
          </p>
        )}

        {reason && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-800">
            {reason}
          </div>
        )}

        {driftNote && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-800">
            {driftNote}
          </div>
        )}
      </article>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <FolderGit2 className="h-4 w-4" />
            Working tree
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">
            {git.isRepository ? 'Git 저장소 연결됨' : 'Git 저장소 아님'}
          </p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            visible entries {git.visibleEntryCount} · .git {git.hasGitMetadata ? '있음' : '없음'}
          </p>
        </article>

        <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <GitBranch className="h-4 w-4" />
            Sync state
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">{formatSyncState(git)}</p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            ahead {git.syncStatus?.aheadCount ?? 0} · behind {git.syncStatus?.behindCount ?? 0} · diverged
            {' '}
            {git.syncStatus?.diverged ? 'yes' : 'no'}
          </p>
        </article>

        <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <Link2 className="h-4 w-4" />
            Publish parity
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">{formatParityState(git)}</p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            repo-wide reconcile/publish 기준 · {git.parityStatus.verified ? 'verified' : 'unverified'}
          </p>
        </article>
      </div>
    </section>
  );
}
