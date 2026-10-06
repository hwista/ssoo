import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { simpleGit } from 'simple-git';
import {
  buildDmsGitOptions,
  createDmsGitClient,
} from '../../src/modules/dms/runtime/git-client.util.js';

describe('DMS Git client configuration', () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('trusts only the resolved document root for each Git command', () => {
    const documentRoot = path.join(process.cwd(), 'documents', '..', 'documents');
    const resolvedRoot = path.resolve(documentRoot);

    expect(buildDmsGitOptions(documentRoot)).toEqual({
      baseDir: resolvedRoot,
      config: [`safe.directory=${resolvedRoot}`],
    });
  });

  it('does not use a wildcard safe-directory exception', () => {
    const options = buildDmsGitOptions('/var/lib/ssoo/dms/documents');

    expect(options.config).toEqual([
      'safe.directory=/var/lib/ssoo/dms/documents',
    ]);
    expect(options.config).not.toContain('safe.directory=*');
  });

  it('allows the exact document repository when Git reports a different owner', async () => {
    const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-git-safe-directory-'));
    temporaryDirectories.push(repositoryRoot);
    execFileSync('git', ['init', repositoryRoot], { stdio: 'ignore' });

    // simple-git 4 requires an explicit allowlist for this Git test-only flag.
    const allowEnvironment = ['GIT_TEST_ASSUME_DIFFERENT_OWNER'];
    const untrustedGit = simpleGit({ baseDir: repositoryRoot, allowEnvironment }).env(
      'GIT_TEST_ASSUME_DIFFERENT_OWNER',
      '1',
    );
    await expect(untrustedGit.status()).rejects.toThrow(/dubious ownership/);

    const trustedGit = simpleGit({ ...buildDmsGitOptions(repositoryRoot), allowEnvironment }).env(
      'GIT_TEST_ASSUME_DIFFERENT_OWNER',
      '1',
    );
    await expect(trustedGit.status()).resolves.toBeDefined();
    await expect(createDmsGitClient(repositoryRoot).status()).resolves.toBeDefined();
  });
});
