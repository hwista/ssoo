import fs from 'fs';
import path from 'path';
import { simpleGit, type SimpleGit } from 'simple-git';
import type {
  GitRepositoryBindingStatus,
  GitResult,
  GitSyncStatus,
} from './git.service.js';
import { configService } from './dms-config.service.js';
import { buildParityStatus, computeSyncState } from './git-sync.util.js';

export function listWorkingTreeEntriesAt(rootPath: string): string[] {
  try {
    return fs.readdirSync(rootPath);
  } catch {
    return [];
  }
}

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

export async function getRepositoryBindingStatus(
  remote = 'origin',
): Promise<GitResult<GitRepositoryBindingStatus>> {
  const rootBinding = configService.getDocumentRootBinding();
  const configuredRoot = rootBinding.resolvedPath;
  const configuredRootExists = fs.existsSync(configuredRoot);
  const workingTreeEntries = configuredRootExists
    ? listWorkingTreeEntriesAt(configuredRoot)
    : [];
  const visibleEntries = workingTreeEntries.filter((entry) => entry !== '.git');
  const hasGitMetadata = workingTreeEntries.includes('.git');
  const bootstrapRemoteUrl = configService.getGitBootstrapRemoteUrl();
  const bootstrapBranch = configService.getGitBootstrapBranch();
  const autoInit = configService.getAutoInit();
  const gitAvailable = await isGitBinaryAvailable();

  const baseBinding: Omit<GitRepositoryBindingStatus, 'state' | 'parityStatus' | 'syncState'> = {
    appRoot: rootBinding.appRoot,
    configuredRootInput: rootBinding.effectiveInput,
    configuredRoot,
    configuredRootExists,
    configuredRootRelativeToAppRoot: rootBinding.relativeToAppRoot,
    actualGitRoot: undefined,
    rootRelation: 'not-inside-repository',
    rootMismatch: false,
    reason: undefined,
    gitAvailable,
    isRepository: false,
    hasGitMetadata,
    visibleEntryCount: visibleEntries.length,
    branch: undefined,
    remoteName: remote,
    remoteUrl: undefined,
    syncStatus: undefined,
    bootstrapRemoteUrl,
    bootstrapBranch,
    autoInit,
    reconcileRequired: false,
  };

  if (!gitAvailable) {
    return {
      success: true,
      data: {
        ...baseBinding,
        state: 'git-unavailable',
        syncState: 'unavailable',
        parityStatus: buildParityStatus(remote, undefined, 'PARITY_UNAVAILABLE: Git not available'),
        reason: 'Git not available',
      },
    };
  }

  const git = simpleGit(configuredRoot);
  let isRepository = false;
  try {
    isRepository = configuredRootExists ? await git.checkIsRepo() : false;
  } catch {
    isRepository = false;
  }

  if (!isRepository) {
    const reconcileRequired = visibleEntries.length > 0;
    const reason = reconcileRequired
      ? (
        bootstrapRemoteUrl
          ? 'Configured root is non-empty but not a Git repository; reconcile is required before bootstrap clone.'
          : 'Configured root is non-empty but not a Git repository; reconcile is required before Git initialization.'
      )
      : (
        bootstrapRemoteUrl
          ? 'Configured root is empty; runtime will bootstrap clone on initialization.'
          : (
            autoInit
              ? 'Configured root is empty; runtime will initialize a local Git repository on demand.'
              : 'Git auto initialization is disabled for this configured root.'
          )
      );

    return {
      success: true,
      data: {
        ...baseBinding,
        state: reconcileRequired ? 'reconcile-needed' : 'uninitialized',
        syncState: 'unavailable',
        parityStatus: buildParityStatus(remote, undefined, `PARITY_UNAVAILABLE: ${reason}`),
        reason,
        reconcileRequired,
      },
    };
  }

  let actualGitRoot: string | undefined;
  try {
    actualGitRoot = (await git.raw(['rev-parse', '--show-toplevel'])).trim() || undefined;
  } catch {
    actualGitRoot = undefined;
  }

  const remoteDetails = await resolveRemoteDetails(git, remote);
  const branchResult = await resolveCurrentBranchWithGit(git);
  const syncResult = branchResult.success
    ? await inspectSyncStatusWithGit(git, remote, branchResult.data)
    : { success: false as const, error: branchResult.error };
  const parityStatus = syncResult.success
    ? buildParityStatus(remote, syncResult.data)
    : buildParityStatus(remote, undefined, `PARITY_CHECK_FAILED: ${syncResult.error}`);

  return {
    success: true,
    data: {
      ...baseBinding,
      actualGitRoot,
      rootRelation: !actualGitRoot
        ? 'not-inside-repository'
        : path.resolve(actualGitRoot) === configuredRoot
          ? 'exact'
          : 'configured-subdirectory',
      rootMismatch: Boolean(actualGitRoot && path.resolve(actualGitRoot) !== configuredRoot),
      state: 'ready',
      reason: actualGitRoot && path.resolve(actualGitRoot) !== configuredRoot
        ? `Configured root is nested under actual Git root ${actualGitRoot}`
        : undefined,
      isRepository: true,
      branch: branchResult.success ? branchResult.data : undefined,
      remoteUrl: syncResult.success ? syncResult.data.remoteUrl : remoteDetails.remoteUrl,
      syncState: syncResult.success ? syncResult.data.state : 'unavailable',
      syncStatus: syncResult.success ? syncResult.data : undefined,
      parityStatus,
    },
  };
}
