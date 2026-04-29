import type { DocumentIsolationState } from '@ssoo/types/dms';
import type { DocumentPublishState, DocumentSoftLock } from './collaboration.service.js';
import {
  filterGitManagedDocumentPaths,
  isGitManagedDocumentPath,
  normalizePath,
  resolveGitManagedPrimaryPath,
} from './collaboration-paths.util.js';

export interface PathReleaseOverride {
  path: string;
  mode: 'force-lock' | 'force-unlock';
  reason?: string;
  appliedAt: string;
  actorUserId: string;
  actorLoginId: string;
  actorDisplayName: string;
}

export function sanitizePublishState(state: DocumentPublishState): DocumentPublishState | null {
  const affectedPaths = filterGitManagedDocumentPaths([
    state.path,
    ...(state.affectedPaths ?? []),
  ]);
  const primaryPath = resolveGitManagedPrimaryPath(state.path, affectedPaths);
  if (!primaryPath) {
    return null;
  }
  return {
    ...state,
    path: primaryPath,
    affectedPaths,
  };
}

export function sanitizeSoftLock(lock: DocumentSoftLock): DocumentSoftLock | null {
  const normalizedPath = normalizePath(lock.path);
  if (!isGitManagedDocumentPath(normalizedPath)) {
    return null;
  }
  return {
    ...lock,
    path: normalizedPath,
  };
}

export function sanitizeIsolationState(
  isolation: DocumentIsolationState,
): DocumentIsolationState | null {
  const affectedPaths = filterGitManagedDocumentPaths([
    isolation.primaryPath,
    isolation.path,
    ...(isolation.affectedPaths ?? []),
  ]);
  const primaryPath = resolveGitManagedPrimaryPath(isolation.primaryPath, affectedPaths);
  if (!primaryPath) {
    return null;
  }
  return {
    ...isolation,
    path: isGitManagedDocumentPath(isolation.path)
      ? normalizePath(isolation.path)
      : primaryPath,
    primaryPath,
    affectedPaths,
  };
}

export function sanitizePathOverride(override: PathReleaseOverride): PathReleaseOverride | null {
  const normalizedPath = normalizePath(override.path);
  if (!isGitManagedDocumentPath(normalizedPath)) {
    return null;
  }
  return {
    ...override,
    path: normalizedPath,
  };
}
