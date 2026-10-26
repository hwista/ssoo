import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');

export function runnerEnvironment() {
  const result = spawnSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const env = { ...process.env };
  // Git hooks export repository-local paths (notably GIT_INDEX_FILE). They must
  // not follow subprocesses into a fixture repository or its linked worktrees.
  for (const name of result.stdout.trim().split('\n')) delete env[name];
  return env;
}

// Docker is mocked in these tests. Keep the runner intact but isolate the
// Windows probe as on a Linux CI host; never touch the user's maintenance state.
export function runnerFixture(root) {
  const runner = path.join(root, 'runner/scripts/ci/run-app-job.sh');
  const gate = path.join(root, 'runner/scripts/storage/windows-gate.sh');
  fs.mkdirSync(path.dirname(runner), { recursive: true });
  fs.mkdirSync(path.dirname(gate), { recursive: true });
  fs.copyFileSync(path.join(repo, 'scripts/ci/run-app-job.sh'), runner);
  fs.writeFileSync(gate, fs.readFileSync(path.join(repo, 'scripts/storage/windows-gate.sh'), 'utf8')
    .replace('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '/nonexistent-fixture-windows'));
  return runner;
}
