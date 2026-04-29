import { isMarkdownFile } from '../runtime/file-utils.js';

export const PRESENCE_TTL_MS = 30_000;

export function normalizePath(pathValue: string): string {
  return pathValue.trim().replace(/\\/g, '/');
}

export function isGitManagedDocumentPath(pathValue: string): boolean {
  return isMarkdownFile(normalizePath(pathValue));
}

export function filterGitManagedDocumentPaths(
  paths: Iterable<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      Array.from(paths)
        .map((item) => normalizePath(item ?? ''))
        .filter((item) => isGitManagedDocumentPath(item)),
    ),
  );
}

export function resolveGitManagedPrimaryPath(
  primaryPath: string,
  affectedPaths: string[],
): string | null {
  const normalizedPrimaryPath = normalizePath(primaryPath);
  if (isGitManagedDocumentPath(normalizedPrimaryPath)) {
    return normalizedPrimaryPath;
  }
  return affectedPaths[0] ?? null;
}

export function pathsOverlap(left: string, right: string): boolean {
  return left === right
    || left.startsWith(`${right}/`)
    || right.startsWith(`${left}/`);
}

export function getTimestampMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isExpired(lastSeenAt: string, ttlMs: number = PRESENCE_TTL_MS): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() > ttlMs;
}

export function hasSameSerializedValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildPresenceKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}
