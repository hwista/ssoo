import path from 'path';

export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  return inputPath
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/');
}

export function normalizeRelativePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  const sanitizedInput = normalizePath(inputPath.trim());
  if (!sanitizedInput) {
    return '';
  }

  return normalizePath(path.normalize(sanitizedInput).replace(/^[/\\]+/, ''));
}

export function resolveContainedPath(rootDir: string, inputPath: string): {
  targetPath: string;
  safeRelPath: string;
  valid: boolean;
} {
  const normalizedInput = normalizeRelativePath(inputPath);
  const targetPath = path.resolve(rootDir, normalizedInput);
  const relativePath = path.relative(rootDir, targetPath);
  const valid = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

  return {
    targetPath,
    safeRelPath: normalizePath(relativePath),
    valid,
  };
}
