import type {
  GitCommitAuthor,
  GitPathParityStatus,
  GitSyncStatus,
} from './git.service.js';

export function normalizeGitPath(pathValue: string): string {
  return pathValue.trim().replace(/\\/g, '/');
}

export function pathsOverlap(left: string, right: string): boolean {
  return left === right
    || left.startsWith(`${right}/`)
    || right.startsWith(`${left}/`);
}

export function parseGitPathList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((item) => normalizeGitPath(item))
        .filter(Boolean),
    ),
  );
}

export function summarizePaths(paths: string[]): string {
  if (paths.length <= 2) {
    return paths.join(', ');
  }
  return `${paths.slice(0, 2).join(', ')} (+${paths.length - 2} more)`;
}

export function buildSyncBlockedReason(sync: GitSyncStatus): string {
  if (sync.diverged) {
    return `SYNC_BLOCKED: local HEAD diverged from ${sync.remoteRef} (local +${sync.aheadCount}, remote +${sync.behindCount})`;
  }
  if (sync.remoteAhead) {
    return `SYNC_BLOCKED: remote branch ${sync.remoteRef} is ahead of local HEAD by ${sync.behindCount} commit(s)`;
  }
  return `SYNC_BLOCKED: local HEAD cannot fast-forward ${sync.remoteRef}`;
}

export function buildPathParityReason(
  status: Omit<GitPathParityStatus, 'reason'>,
): string | undefined {
  if (status.remoteAheadPaths.length > 0) {
    return `PATH_SYNC_BLOCKED: remote changes pending for ${summarizePaths(status.remoteAheadPaths)}`;
  }
  if (status.localAheadPaths.length > 0) {
    return `PATH_PENDING_LOCAL: local commits not yet published for ${summarizePaths(status.localAheadPaths)}`;
  }
  if (status.workingTreePaths.length > 0) {
    return `PATH_DIRTY: uncommitted changes remain for ${summarizePaths(status.workingTreePaths)}`;
  }
  return undefined;
}

export function buildCommitAuthorArgs(
  author?: string | GitCommitAuthor,
): Record<string, string> | undefined {
  if (!author) {
    return undefined;
  }
  if (typeof author === 'string') {
    return { '--author': `${author} <${author}@dms>` };
  }
  return { '--author': `${author.name} <${author.email}>` };
}

export function buildCommitMessage(message: string, footerLines: string[] = []): string {
  if (footerLines.length === 0) {
    return message;
  }
  return `${message}\n\n${footerLines.join('\n')}`;
}
