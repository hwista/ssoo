import { simpleGit, type SimpleGit } from 'simple-git';
import type { GitResult, GitSyncStatus } from './git.service.js';
import { computeSyncState } from './git-sync.util.js';

export async function isGitBinaryAvailable(): Promise<boolean> {
  try {
    await simpleGit().version();
    return true;
  } catch {
    return false;
  }
}

export async function resolveCurrentBranchWithGit(
  git: SimpleGit,
): Promise<GitResult<string>> {
  try {
    const branch = await git.branchLocal();
    const current = branch.current?.trim();
    if (!current) {
      return { success: false, error: 'Git branch lookup failed' };
    }
    return { success: true, data: current };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Git branch lookup failed',
    };
  }
}

export async function resolveRemoteDetails(
  git: SimpleGit,
  remote: string,
): Promise<{ remoteConfigured: boolean; remoteUrl?: string }> {
  const remotes = await git.getRemotes(true);
  const entry = remotes.find((candidate) => candidate.name === remote);
  return {
    remoteConfigured: Boolean(entry),
    remoteUrl: entry?.refs.push || entry?.refs.fetch || undefined,
  };
}

export async function inspectSyncStatusWithGit(
  git: SimpleGit,
  remote = 'origin',
  branchHint?: string,
): Promise<GitResult<GitSyncStatus>> {
  const branchResult = branchHint
    ? { success: true as const, data: branchHint }
    : await resolveCurrentBranchWithGit(git);
  if (!branchResult.success) {
    return branchResult as GitResult<GitSyncStatus>;
  }

  const branch = branchResult.data;
  try {
    const remoteRef = `${remote}/${branch}`;
    const remoteDetails = await resolveRemoteDetails(git, remote);
    if (!remoteDetails.remoteConfigured) {
      return {
        success: true,
        data: {
          branch,
          remote,
          remoteUrl: remoteDetails.remoteUrl,
          remoteRef,
          remoteConfigured: false,
          remoteExists: false,
          canPushFastForward: true,
          remoteAhead: false,
          localAhead: false,
          diverged: false,
          aheadCount: 0,
          behindCount: 0,
          state: 'local-only',
        },
      };
    }

    await git.fetch(remote);

    let remoteExists = true;
    try {
      await git.raw(['rev-parse', '--verify', remoteRef]);
    } catch {
      remoteExists = false;
    }

    if (!remoteExists) {
      return {
        success: true,
        data: {
          branch,
          remote,
          remoteUrl: remoteDetails.remoteUrl,
          remoteRef,
          remoteConfigured: true,
          remoteExists: false,
          canPushFastForward: true,
          remoteAhead: false,
          localAhead: false,
          diverged: false,
          aheadCount: 0,
          behindCount: 0,
          state: 'remote-missing',
        },
      };
    }

    const countsRaw = await git.raw([
      'rev-list',
      '--left-right',
      '--count',
      `${remoteRef}...HEAD`,
    ]);
    const [behindText, aheadText] = countsRaw.trim().split(/\s+/);
    const aheadCount = Number.parseInt(aheadText ?? '0', 10) || 0;
    const behindCount = Number.parseInt(behindText ?? '0', 10) || 0;
    return {
      success: true,
      data: {
        branch,
        remote,
        remoteUrl: remoteDetails.remoteUrl,
        remoteRef,
        remoteConfigured: true,
        remoteExists: true,
        canPushFastForward: behindCount === 0,
        remoteAhead: behindCount > 0,
        localAhead: aheadCount > 0,
        diverged: aheadCount > 0 && behindCount > 0,
        aheadCount,
        behindCount,
        state: computeSyncState({
          remoteConfigured: true,
          remoteExists: true,
          aheadCount,
          behindCount,
        }),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Git sync inspection failed',
    };
  }
}
