import fs from 'node:fs';
import type { DocumentIsolationState } from '@ssoo/types/dms';
import type { DocumentPublishState, DocumentSoftLock } from './collaboration.service.js';
import type { PathReleaseOverride } from './collaboration-sanitizers.util.js';
import { hasSameSerializedValue } from './collaboration-paths.util.js';
import { createDmsLogger } from '../runtime/dms-logger.js';

const logger = createDmsLogger('DmsCollaborationState');

export interface PersistedState {
  publishStates: Record<string, DocumentPublishState>;
  softLocks: Record<string, DocumentSoftLock>;
  pathIsolations?: Record<string, DocumentIsolationState>;
  pathOverrides?: Record<string, PathReleaseOverride>;
}

export function readPersistedStateFile(filePath: string): PersistedState | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as PersistedState;
  } catch (error) {
    logger.warn('collaboration persisted state load 실패', error instanceof Error ? { message: error.message } : undefined);
    return null;
  }
}

export function writePersistedStateFile(filePath: string, payload: PersistedState): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  } catch (error) {
    logger.warn('collaboration persisted state save 실패', error instanceof Error ? { message: error.message } : undefined);
  }
}

interface HydrateOptions<T extends { path: string }> {
  skip?: (sanitized: T) => boolean;
}

/**
 * 영속화된 entry 맵을 sanitize 후 target Map 에 적재한다.
 * 키 변경, sanitize 로 인한 값 변경, sanitize 실패 또는 skip 시 true 반환 (재저장 필요).
 */
export function hydrateSanitizedMap<T extends { path: string }>(
  entries: Record<string, T> | undefined,
  sanitize: (value: T) => T | null,
  target: Map<string, T>,
  options: HydrateOptions<T> = {},
): boolean {
  let needsResave = false;
  for (const [pathValue, value] of Object.entries(entries ?? {})) {
    const sanitized = sanitize(value);
    if (!sanitized || options.skip?.(sanitized)) {
      needsResave = true;
      continue;
    }
    if (pathValue !== sanitized.path || !hasSameSerializedValue(value, sanitized)) {
      needsResave = true;
    }
    target.set(sanitized.path, sanitized);
  }
  return needsResave;
}
