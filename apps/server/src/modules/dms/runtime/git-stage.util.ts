import { isMarkdownFile } from './file-utils.js';
import { normalizeGitPath } from './git-paths.util.js';

export function filterStageableGitManagedFiles(
  files: Iterable<string>,
  trackedFiles: Iterable<string>,
  fileExists: (normalizedFile: string) => boolean,
): string[] {
  const trackedSet = new Set(
    Array.from(trackedFiles)
      .map((item) => normalizeGitPath(item))
      .filter((item) => isMarkdownFile(item)),
  );

  return Array.from(
    new Set(
      Array.from(files)
        .map((item) => normalizeGitPath(item))
        .filter((item) => isMarkdownFile(item))
        .filter((item) => trackedSet.has(item) || fileExists(item)),
    ),
  );
}
