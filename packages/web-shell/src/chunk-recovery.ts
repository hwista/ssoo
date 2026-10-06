export function isSsooChunkError(error: unknown): boolean {
  return error instanceof Error && /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(`${error.name} ${error.message}`);
}

/** Shared by lazy imports and error boundaries so one failure cannot trigger multiple reload loops. */
export function recoverSsooChunkOnce(error: unknown): boolean {
  if (typeof window === 'undefined' || !isSsooChunkError(error)) return false;
  try {
    const key = 'ssoo:chunk-recovery-attempted';
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    window.location.reload();
    return true;
  } catch {
    // Private browsing/storage failure must not break manual recovery.
    return false;
  }
}
