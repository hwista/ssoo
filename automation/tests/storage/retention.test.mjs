import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { releaseRetention } from '../../../scripts/storage/retention.mjs';
import { cli, SERVICES } from '../../../scripts/ci/release-state.mjs';

const now = Date.parse('2026-10-26T10:00:00Z');
const record = (id, status, days = 0, rest = {}) => ({ id, status, checkedAt: new Date(now - days * 86400_000).toISOString(), ...rest });
test('current plus three previous successful releases, pinned releases and interrupted recovery are protected', () => {
  const records = [record('current', 'committed'), ...[1, 2, 3, 4, 5].map((n) => record(`old${n}`, 'committed', n)),
    record('recovery', 'recovery-required', 100), record('in-flight', 'db-applying', 100), record('unknown', 'unknown', 100),
    record('pinned', 'committed', 100, { pinned: true })];
  const result = releaseRetention(records, 'current', now);
  assert.deepEqual(result.retiredIds, ['old4', 'old5']);
  assert.ok(result.protectedIds.includes('recovery'));
});
test('expired pending releases are retired, attempted and recent ones remain protected', () => {
  const result = releaseRetention([record('expired', 'built', 8), record('young', 'built', 6), record('attempted', 'built', 8, { attempted: true }),
    record('rolled', 'rolled-back', 8), { id: 'missing-state' }], null, now);
  assert.deepEqual(result.retiredIds, ['expired', 'rolled']);
  assert.deepEqual(result.protectedIds, ['young', 'attempted', 'missing-state']);
});
test('invalid timestamps fail closed; current and explicit pins override retirement', () => {
  assert.throws(() => releaseRetention([record('future', 'built', -5)], null, now));
  assert.throws(() => releaseRetention([{ id: 'broken', checkedAt: 'bad' }], null, now));
  assert.deepEqual(releaseRetention([{ id: 'current', retired: true }, { id: 'pin', pinned: true, retired: true }], 'current', now).retiredIds, []);
});
test('retired pipeline cannot deploy even while its image still exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-retired-'));
  try {
    fs.writeFileSync(path.join(root, 'retired.json'), '{}');
    assert.throws(() => cli('check-staging', root, root), /Release retired/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('CI retirement keeps current pointer, all containers and grace period, and persists audit decision', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-selection-'));
  try {
    const images = [], releases = [];
    for (let n = 1; n <= 6; n++) {
      const sha = String(n).repeat(40), id = `${n}-${sha}`, imageId = `sha256:${String(n).repeat(64)}`;
      const manifest = { schemaVersion: 1, releaseId: id, targetCommit: sha, services: Object.fromEntries(SERVICES.map((s) => [s,
        { imageRef: `app-${s}:${sha}`, imageId, sourceCommit: sha, inputHash: 'a'.repeat(64), runtimeHash: 'b'.repeat(64) }])) };
      const dir = path.join(root, id); fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'release.json'), JSON.stringify(manifest));
      fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ id, status: 'committed', checkedAt: new Date(Date.now() - (10 - n) * 86400_000).toISOString() }));
      images.push({ Id: imageId, Created: '2026-01-01', RepoTags: [`app-server:${sha}`] });
      releases.push({ manifest, dir });
    }
    const current = releases.at(-1); fs.writeFileSync(path.join(root, 'last-successful.json'), JSON.stringify(current.manifest));
    fs.writeFileSync(path.join(current.dir, 'retention-images.json'), JSON.stringify(images));
    fs.writeFileSync(path.join(current.dir, 'retention-containers.json'), JSON.stringify([{ Image: images[0].Id }]));
    const lines = [], original = console.log;
    try { console.log = (line) => lines.push(line); cli('retired-images', root, current.dir); } finally { console.log = original; }
    assert.deepEqual(lines, [images[1].RepoTags[0]]);
    assert.ok(fs.existsSync(path.join(releases[1].dir, 'retired.json')));
    assert.ok(fs.existsSync(path.join(current.dir, 'retention-decision.json')));
    assert.ok(fs.existsSync(path.join(releases[1].dir, 'release.json')), 'audit manifest preserved');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('CI retirement reclaims fresh verify images but keeps container, recovery and deployment protections', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-verify-'));
  try {
    const image = (n, service = 'ci-verify', Created = new Date().toISOString()) => ({
      Id: `sha256:${n.repeat(64)}`, Created, RepoTags: [`app-${service}:${n.repeat(40)}`],
    });
    const disposable = image('1'), running = image('2'), stopped = image('3'), recovery = image('4');
    const mixed = image('5'); mixed.RepoTags.push(`app-server:${'5'.repeat(40)}`);
    const youngApp = image('6', 'server'), oldApp = image('7', 'server', '2026-01-01');
    const unknown = image('8', 'ci-verify', 'invalid');
    const sha = '4'.repeat(40), id = `1-${sha}`, dir = path.join(root, id);
    fs.mkdirSync(dir);
    const manifest = { schemaVersion: 1, releaseId: id, targetCommit: sha,
      services: Object.fromEntries(SERVICES.map((s) => [s, { imageRef: `app-${s}:${sha}`, imageId: recovery.Id,
        sourceCommit: sha, inputHash: 'a'.repeat(64), runtimeHash: 'b'.repeat(64) }])) };
    fs.writeFileSync(path.join(dir, 'release.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ status: 'recovery-required' }));
    fs.writeFileSync(path.join(dir, 'retention-images.json'), JSON.stringify([
      disposable, running, stopped, recovery, mixed, youngApp, oldApp, unknown, disposable,
    ]));
    fs.writeFileSync(path.join(dir, 'retention-containers.json'), JSON.stringify([
      { Image: running.Id, State: { Running: true } }, { Image: stopped.Id, State: { Running: false } },
    ]));
    const lines = [], original = console.log;
    try { console.log = (line) => lines.push(line); cli('retired-images', root, dir); } finally { console.log = original; }
    assert.deepEqual(new Set(lines), new Set([disposable.RepoTags[0], oldApp.RepoTags[0]]));
    assert.equal(lines.length, 2, 'duplicate inspect entries must not cause duplicate removals');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
