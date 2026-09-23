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
      return '저장소 연결 확인됨';
    case 'uninitialized':
      return '초기화 대기';
    case 'reconcile-needed':
      return '정합성 확인 필요';
    case 'git-unavailable':
      return 'Git 사용 불가';
    default:
      return state;
  }
}

function formatInstanceEnv(instanceEnv: SettingsRuntimeGitClient['instanceEnv']) {
  switch (instanceEnv) {
    case 'prod':
      return 'prod (운영 서버)';
    case 'dev':
      return 'dev (개발/로컬 서버)';
    case 'local-test':
      return 'local-test (격리 테스트)';
    default:
      return instanceEnv;
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
    return '게시 정합성 확인 불가';
  }
  return git.parityStatus.canTreatLocalAsCanonical ? '게시 정합성 정상' : '게시 정합성 차단';
}

function formatRootRelation(git: SettingsRuntimeGitClient) {
  switch (git.rootRelation) {
    case 'exact':
      return '설정된 기준 폴더와 실제 저장소 폴더가 일치합니다.';
    case 'configured-subdirectory':
      return git.actualGitRoot
        ? `설정된 기준 폴더가 실제 저장소 폴더(${git.actualGitRoot}) 하위 경로에 있습니다. Git 명령은 실제 저장소 폴더를 기준으로 동작합니다.`
        : '실제 저장소 폴더를 확인하지 못했습니다.';
    case 'not-inside-repository':
      return '설정된 기준 폴더에서 문서 작업 폴더를 확인하지 못했습니다.';
    default:
      return git.rootRelation;
  }
}

function formatBindingSeverity(git: SettingsRuntimeGitClient) {
  switch (git.bindingSeverity) {
    case 'fatal':
      return '시작 차단';
    case 'blocking':
      return '변경 차단';
    default:
      return '정상';
  }
}

function getStatusTone(git: SettingsRuntimeGitClient) {
  if (git.bindingSeverity === 'fatal') {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      pillClassName: 'ssoo-tone-danger-surface',
    };
  }

  if (git.bindingSeverity === 'blocking') {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      pillClassName: 'ssoo-tone-warning-surface',
    };
  }

  if (git.state === 'reconcile-needed' || (git.parityStatus.verified && !git.parityStatus.canTreatLocalAsCanonical)) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      pillClassName: 'ssoo-tone-warning-surface',
    };
  }

  if (git.state === 'ready' && git.syncState === 'in-sync') {
    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      pillClassName: 'ssoo-tone-success-surface',
    };
  }

  return {
    icon: <GitCommitHorizontal className="h-4 w-4" />,
    pillClassName: 'border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/80',
  };
}

function redactUrlCredentials(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/^(https?:\/\/)([^:@\s]+):([^@\s]+)@/, '$1$2:***@');
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
  const actualRemote = git.remoteUrl ? `${git.remoteName} · ${redactUrlCredentials(git.remoteUrl)}` : `${git.remoteName} · (미구성)`;
  const configuredBootstrap = git.bootstrapRemoteUrl
    ? `${redactUrlCredentials(git.bootstrapRemoteUrl)}${git.bootstrapBranch ? ` · branch ${git.bootstrapBranch}` : ''}`
    : '원격 미사용 (local-test)';
  const expectedRemote = redactUrlCredentials(git.expectedRemoteUrl) ?? '원격 미사용 (local-test)';
  const reason = git.bindingReason ?? git.reason ?? git.parityStatus.reason;

  return (
    <section className="mb-3 space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">문서 저장소 연결·운영 상태</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">현재 서비스가 사용하는 문서 저장소</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              설정된 역할과 실제 저장소·원격·브랜치, 동기화·게시 정합성, 변경 차단 상태를 함께 보여 줍니다.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${tone.pillClassName}`}>
            {tone.icon}
            {formatBindingState(git.state)}
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <InfoRow label="실행 환경" value={formatInstanceEnv(git.instanceEnv)} />
          <InfoRow label="연결 보호 상태" value={formatBindingSeverity(git)} />
          <InfoRow label="설정된 기준 폴더" value={git.configuredRoot} breakAll />
          <InfoRow label="실제 저장소 폴더" value={git.actualGitRoot ?? '감지되지 않음'} breakAll />
          <InfoRow label="예정 원격 저장소" value={expectedRemote} breakAll />
          <InfoRow label="실제 원격 저장소" value={actualRemote} breakAll />
          <InfoRow label="실제 브랜치" value={git.branch ?? '브랜치 미확인'} />
          <InfoRow label="초기 연결 설정" value={configuredBootstrap} breakAll />
          <InfoRow label="폴더 관계" value={formatRootRelation(git)} breakAll />
        </div>

        {git.configuredRootRelativeToAppRoot && (
          <p className="mt-3 text-caption text-ssoo-primary/70">
            상대 경로 설정값 <span className="font-medium">{git.configuredRootInput}</span> 은 앱 기준 폴더
            {' '}
            <span className="font-medium">{git.appRoot}</span>
            {' '}
            기준으로 해석됩니다.
          </p>
        )}

        {reason && (
          <div
            className={[
              'mt-3 rounded-lg border px-3 py-2 text-body-sm',
              git.bindingSeverity === 'fatal'
                ? 'ssoo-tone-danger-surface'
                : 'ssoo-tone-warning-surface',
            ].join(' ')}
          >
            {reason}
          </div>
        )}
      </article>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <FolderGit2 className="h-4 w-4" />
            작업 폴더
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">
            {git.isRepository ? 'Git 저장소 연결됨' : 'Git 저장소 아님'}
          </p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            표시 항목 수 {git.visibleEntryCount} · .git {git.hasGitMetadata ? '있음' : '없음'}
          </p>
        </article>

        <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <GitBranch className="h-4 w-4" />
            동기화 상태
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">{formatSyncState(git)}</p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            로컬 선행 {git.syncStatus?.aheadCount ?? 0} · 원격 선행 {git.syncStatus?.behindCount ?? 0} · 분기 여부
            {' '}
            {git.syncStatus?.diverged ? '있음' : '없음'}
          </p>
        </article>

        <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <Link2 className="h-4 w-4" />
            게시 정합성
          </div>
          <p className="mt-2 text-label-strong text-ssoo-primary">{formatParityState(git)}</p>
          <p className="mt-1 text-body-sm text-ssoo-primary/80">
            전체 저장소의 정합성·게시 기준 · {git.parityStatus.verified ? '확인됨' : '미확인'}
          </p>
        </article>
      </div>
    </section>
  );
}
