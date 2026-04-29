import type {
  GitRemoteParityStatus,
  GitSyncState,
  GitSyncStatus,
} from './git.service.js';
import { buildSyncBlockedReason } from './git-paths.util.js';

export function computeSyncState(input: {
  remoteConfigured: boolean;
  remoteExists: boolean;
  aheadCount: number;
  behindCount: number;
}): GitSyncState {
  if (!input.remoteConfigured) {
    return 'local-only';
  }
  if (!input.remoteExists) {
    return 'remote-missing';
  }
  if (input.aheadCount > 0 && input.behindCount > 0) {
    return 'diverged';
  }
  if (input.behindCount > 0) {
    return 'remote-ahead';
  }
  if (input.aheadCount > 0) {
    return 'local-ahead';
  }
  return 'in-sync';
}

export function buildParityStatus(
  remote: string,
  syncStatus?: GitSyncStatus,
  reason?: string,
): GitRemoteParityStatus {
  if (!syncStatus) {
    return {
      remote,
      verified: false,
      canTreatLocalAsCanonical: false,
      reason,
    };
  }

  if (!syncStatus.remoteConfigured) {
    return {
      remote,
      verified: false,
      canTreatLocalAsCanonical: false,
      syncStatus,
      reason: reason ?? `PARITY_UNAVAILABLE: remote '${remote}' is not configured`,
    };
  }

  if (!syncStatus.remoteExists) {
    return {
      remote,
      verified: false,
      canTreatLocalAsCanonical: false,
      syncStatus,
      reason: reason ?? `PARITY_UNAVAILABLE: remote branch ${syncStatus.remoteRef} does not exist`,
    };
  }

  if (!syncStatus.canPushFastForward) {
    return {
      remote,
      verified: true,
      canTreatLocalAsCanonical: false,
      syncStatus,
      reason: reason ?? buildSyncBlockedReason(syncStatus),
    };
  }

  return {
    remote,
    verified: true,
    canTreatLocalAsCanonical: true,
    syncStatus,
    reason,
  };
}
