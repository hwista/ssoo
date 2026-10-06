import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
for (const kind of ['checkout', 'worktree', 'missing', 'dangling']) {
  test(`preflight Git context: ${kind}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-git-'));
    try {
      const source = path.join(root, 'source');
      fs.mkdirSync(path.join(source, '.codex/hooks'), { recursive: true });
      fs.copyFileSync(path.join(repo, '.codex/hooks/preflight.sh'), path.join(source, '.codex/hooks/preflight.sh'));
      const git = (...args) => {
        const r = spawnSync('git', ['-C', source, ...args], { encoding: 'utf8' });
        assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
      };
      let checkout = source;
      if (kind === 'checkout' || kind === 'worktree') {
        git('init', '-q'); git('add', '.');
        git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'fixture');
        if (kind === 'worktree') {
          checkout = path.join(root, 'worktree');
          git('worktree', 'add', '--detach', checkout, 'HEAD');
          assert.ok(fs.statSync(path.join(checkout, '.git')).isFile());
        }
      }
      if (kind === 'dangling') fs.writeFileSync(path.join(source, '.git'), `gitdir: ${root}/absent\n`);
      // Only downstream package checks are stubbed: the preflight entrypoint
      // and all Git commands exercise a real checkout/worktree (or invalid one).
      const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
      for (const cmd of ['node', 'pnpm']) fs.writeFileSync(path.join(bin, cmd), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      const r = spawnSync('bash', [path.join(checkout, '.codex/hooks/preflight.sh')], {
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LSWIKI_HARNESS_RUN_ID: '' }, encoding: 'utf8' });
      if (kind === 'checkout' || kind === 'worktree') {
        assert.equal(r.status, 0, r.stderr + r.stdout);
        assert.match(r.stdout, /no changed files detected/);
      } else {
        assert.equal(r.status, 1, r.stderr + r.stdout);
        assert.match(r.stdout, /valid Git working tree not found/);
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}
