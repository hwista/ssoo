import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
for (const ca of ['unset', 'valid', 'missing', 'empty', 'directory']) {
  test(`verify runner TLS CA: ${ca}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-tls-'));
    try {
      const source = path.join(root, 'source');
      fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
      fs.writeFileSync(path.join(source, 'scripts/ci/release-job.sh'), 'touch "$TLS_TEST_PREPARED"\n');
      const git = (...args) => {
        const r = spawnSync('git', ['-C', source, ...args], { encoding: 'utf8' });
        assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
      };
      git('init', '-q'); git('add', '.');
      git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'fixture');
      const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, 'docker'), '#!/bin/bash\nif [[ "$1" == build ]]; then printf "%s\\0" "$@" > "$TLS_TEST_ARGS"; fi\n', { mode: 0o755 });
      const cert = path.join(root, 'extra ca.pem');
      if (ca === 'valid' || ca === 'empty') fs.writeFileSync(cert, ca === 'valid' ? 'fixture CA bytes' : '');
      if (ca === 'directory') fs.mkdirSync(cert);
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`,
        CI_PROJECT_DIR: source, CI_COMMIT_SHA: git('rev-parse', 'HEAD'), APP_DIR: root,
        CI_RELEASE_STATE_DIR: path.join(root, 'state'), CI_APP_LOCK_FILE: path.join(root, 'lock'),
        TLS_TEST_ARGS: path.join(root, 'args'), TLS_TEST_PREPARED: path.join(root, 'prepared') };
      delete env.CI_VERIFY_TLS_CA_CERT_FILE;
      if (ca !== 'unset') env.CI_VERIFY_TLS_CA_CERT_FILE = cert;
      const r = spawnSync('bash', [path.join(repo, 'scripts/ci/run-app-job.sh'), 'verify'], { env, encoding: 'utf8' });
      if (ca === 'unset' || ca === 'valid') {
        assert.equal(r.status, 0, r.stderr);
        assert.ok(fs.existsSync(env.TLS_TEST_PREPARED));
        const args = fs.readFileSync(env.TLS_TEST_ARGS, 'utf8').split('\0').filter(Boolean);
        assert.equal(args.includes('--secret'), ca === 'valid');
        if (ca === 'valid') assert.equal(args[args.indexOf('--secret') + 1], `id=ssoo_tls_ca,src=${cert}`);
        assert.ok(!args.some(arg => arg.includes('/etc/ssl/certs/ca-certificates.crt')));
      } else {
        assert.equal(r.status, 2, r.stderr);
        assert.match(r.stderr, /CI_VERIFY_TLS_CA_CERT_FILE must be/);
        assert.ok(!fs.existsSync(env.TLS_TEST_ARGS));
        assert.ok(!fs.existsSync(env.TLS_TEST_PREPARED), 'reject invalid CA before retention or other prepare actions');
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}
