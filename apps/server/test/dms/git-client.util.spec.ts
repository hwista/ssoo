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

  const credentialEnvironment = {
    DMS_GIT_HTTP_AUTH_SCOPE: 'https://git.example.test',
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'credential.https://git.example.test.helper',
    GIT_CONFIG_VALUE_0: '!f() { cat /run/secrets/dms_git_http_credentials; }; f',
    GIT_CONFIG_KEY_1: 'credential.https://git.example.test.useHttpPath',
    GIT_CONFIG_VALUE_1: 'false',
  };

  it('passes the exact container credential helper to real Git without allowing inherited variables', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-git-credential-'));
    temporaryDirectories.push(root);
    execFileSync('git', ['init', root], { stdio: 'ignore' });
    const options = buildDmsGitOptions(root, credentialEnvironment);
    expect(options).not.toHaveProperty('allowEnvironment');
    expect(options.unsafe).toEqual({ allowUnsafeCredentialHelper: true });
    const git = simpleGit(options);
    await expect(git.raw(['config', '--get', credentialEnvironment.GIT_CONFIG_KEY_0]))
      .resolves.toBe(`${credentialEnvironment.GIT_CONFIG_VALUE_0}\n`);
    await expect(git.raw(['config', '--get', credentialEnvironment.GIT_CONFIG_KEY_1]))
      .resolves.toBe('false\n');
  });

  it.each([
    { GIT_CONFIG_COUNT: '3' },
    { GIT_CONFIG_VALUE_0: '!arbitrary-command' },
    { GIT_CONFIG_KEY_0: 'core.sshCommand' },
    { GIT_CONFIG_VALUE_1: 'true' },
    { DMS_GIT_HTTP_AUTH_SCOPE: 'https://user:secret@git.example.test' },
    { DMS_GIT_HTTP_AUTH_SCOPE: 'https://git.example.test/path' },
  ])('does not propagate altered or unscoped credential environment: %o', (override) => {
    const options = buildDmsGitOptions('/documents', { ...credentialEnvironment, ...override });
    expect(options.config)
      .toEqual(['safe.directory=/documents']);
    expect(options).not.toHaveProperty('unsafe');
  });
});
