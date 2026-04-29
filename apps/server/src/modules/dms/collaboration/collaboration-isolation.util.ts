import type { DocumentIsolationState, DocumentMutationAction } from '@ssoo/types/dms';
import { HttpException } from '@nestjs/common';
import type { GitPathParityStatus } from '../runtime/git.service.js';
import type { DocumentPublishState, PublishStatus } from './collaboration.service.js';
import {
  filterGitManagedDocumentPaths,
  getTimestampMs,
} from './collaboration-paths.util.js';
import type { PathReleaseOverride } from './collaboration-sanitizers.util.js';

export const BLOCKED_MUTATION_ACTIONS: readonly DocumentMutationAction[] = [
  'write',
  'updateMetadata',
  'rename',
  'delete',
  'upload',
  'resync',
  'publish',
];

export type PathParityResult =
  | { success: true; data: GitPathParityStatus }
  | { success: false; error: string };

export function resolveTrackedPaths(
  primaryPath: string,
  publishState: DocumentPublishState,
  isolation: DocumentIsolationState | null,
): string[] {
  return filterGitManagedDocumentPaths([
    primaryPath,
    ...(publishState.affectedPaths ?? []),
    ...(isolation?.affectedPaths ?? []),
  ]);
}

export function shouldAutoReleasePublishIsolation(
  currentState: DocumentPublishState,
  currentIsolation: DocumentIsolationState | null,
  pathParity: PathParityResult,
): boolean {
  return pathParity.success
    && pathParity.data.verified
    && pathParity.data.clean
    && (currentState.status !== 'clean' || Boolean(currentIsolation));
}

export function resolveRefreshStatus(
  currentState: DocumentPublishState,
  currentIsolation: DocumentIsolationState | null,
  pathParity: PathParityResult,
): PublishStatus {
  if (!pathParity.success || !pathParity.data.verified) {
    return currentState.status;
  }

  if (pathParity.data.clean) {
    return 'clean';
  }

  if (pathParity.data.remoteAheadPaths.length > 0) {
    return currentState.status === 'clean' && !currentIsolation ? 'clean' : 'sync-blocked';
  }

  if (pathParity.data.localAheadPaths.length > 0) {
    return 'committed-unpushed';
  }

  if (pathParity.data.workingTreePaths.length > 0) {
    return 'dirty-uncommitted';
  }

  return currentState.status;
}

export function resolveRefreshError(
  currentState: DocumentPublishState,
  pathParity: PathParityResult,
): string | undefined {
  if (!pathParity.success) {
    return pathParity.error;
  }

  if (pathParity.data.clean) {
    return undefined;
  }

  return pathParity.data.reason ?? currentState.lastError;
}

export function buildOperatorLockIsolation(override: PathReleaseOverride): DocumentIsolationState {
  const actorLabel = `${override.actorDisplayName}(${override.actorLoginId})`;
  return {
    path: override.path,
    primaryPath: override.path,
    status: 'force-locked',
    source: 'operator',
    reasonCode: 'operator-forced-lock',
    reason: override.reason?.trim() || `운영자 ${actorLabel} 이 경로를 강제 잠금했습니다.`,
    isolatedAt: override.appliedAt,
    blockedActions: [...BLOCKED_MUTATION_ACTIONS],
    affectedPaths: [override.path],
    releaseStrategy: 'manual',
  };
}

export function isForceUnlockActive(
  override: PathReleaseOverride,
  isolation: DocumentIsolationState,
): boolean {
  return getTimestampMs(override.appliedAt) >= getTimestampMs(isolation.isolatedAt);
}

export function buildIsolationException(
  action: DocumentMutationAction,
  requestedPath: string,
  isolation: DocumentIsolationState,
): HttpException {
  return new HttpException({
    error: isolation.source === 'operator'
      ? '문서 경로가 운영자에 의해 강제 잠금되어 있어 변경 작업을 수행할 수 없습니다.'
      : '문서 경로가 격리되어 있어 reconcile 전까지 변경 작업을 수행할 수 없습니다.',
    details: {
      action,
      requestedPath,
      isolation,
    },
  }, 423);
}
