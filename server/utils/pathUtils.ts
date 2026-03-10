import { PATH_SEPARATORS } from '@/lib/constants/path';

export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  return inputPath
    .replace(/\\\\/g, PATH_SEPARATORS.UNIX)
    .replace(/\\/g, PATH_SEPARATORS.UNIX);
}
