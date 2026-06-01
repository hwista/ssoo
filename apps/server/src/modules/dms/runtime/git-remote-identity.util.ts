function normalizeRepoPath(repoPath: string): string {
  return repoPath
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/\.git$/i, '');
}

export function normalizeGitRemoteIdentity(remoteUrl: string | undefined): string | null {
  const trimmed = remoteUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const scpStyleMatch = trimmed.match(/^(?:[^@/]+@)?([^:/]+):(?!\/\/)(.+)$/);
  if (scpStyleMatch) {
    const [, host, repoPath] = scpStyleMatch;
    const normalizedPath = normalizeRepoPath(repoPath);
    return normalizedPath ? `${host.toLowerCase()}/${normalizedPath}` : null;
  }

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = normalizeRepoPath(parsed.pathname);
    return normalizedPath ? `${parsed.hostname.toLowerCase()}/${normalizedPath}` : null;
  } catch {
    return null;
  }
}

export function gitRemoteIdentitiesMatch(
  left: string | undefined,
  right: string | undefined,
): boolean {
  const leftIdentity = normalizeGitRemoteIdentity(left);
  const rightIdentity = normalizeGitRemoteIdentity(right);
  return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
}
