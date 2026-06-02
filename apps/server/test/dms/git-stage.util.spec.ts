import { filterStageableGitManagedFiles } from '../../src/modules/dms/runtime/git-stage.util.js';

describe('git-stage.util', () => {
  it('drops vanished untracked markdown paths before git add', () => {
    const result = filterStageableGitManagedFiles(
      ['codex-lock-ui/mpurxpyw.md'],
      [],
      () => false,
    );

    expect(result).toEqual([]);
  });

  it('keeps existing untracked markdown paths', () => {
    const result = filterStageableGitManagedFiles(
      ['launch-smoke/a.md'],
      [],
      (filePath) => filePath === 'launch-smoke/a.md',
    );

    expect(result).toEqual(['launch-smoke/a.md']);
  });

  it('keeps tracked deleted markdown paths so deletions can be committed', () => {
    const result = filterStageableGitManagedFiles(
      ['docs/deleted.md'],
      ['docs/deleted.md'],
      () => false,
    );

    expect(result).toEqual(['docs/deleted.md']);
  });

  it('normalizes, dedupes, and ignores non-markdown paths', () => {
    const result = filterStageableGitManagedFiles(
      ['docs\\a.md', 'docs/a.md', 'docs/a.png'],
      ['docs/a.md', 'docs/a.png'],
      () => false,
    );

    expect(result).toEqual(['docs/a.md']);
  });
});
