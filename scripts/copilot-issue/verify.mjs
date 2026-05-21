#!/usr/bin/env node

import path from 'node:path';
import {
  collectChangedFiles,
  ensureDir,
  getArtifactDir,
  getManifestPath,
  getRepoRoot,
  getVerificationReportMarkdownPath,
  getVerificationReportPath,
  parseCliOptions,
  printUsage,
  readJson,
  relativeToRepo,
  renderVerificationReportMarkdown,
  resolveVerificationCommands,
  runCommand,
  writeJson,
  writeText,
} from './common.mjs';

const options = parseCliOptions(process.argv.slice(2), { allowManifest: true });

if (options.help) {
  printUsage('copilot:issue:verify', [
    '',
    'Verify mode runs the baseline plus changed-area commands described in WS-008,',
    'and writes a local verification report under .runtime/copilot-issue/<issue-key>/',
  ]);
  process.exit(0);
}

const repoRoot = getRepoRoot();
const manifestPath = options.manifestPath ?? getManifestPath(repoRoot, options.issueKey);
const manifest = readJson(manifestPath);
const artifactDir = getArtifactDir(repoRoot, manifest.issueKey);
const reportPath = getVerificationReportPath(repoRoot, manifest.issueKey);
const reportMarkdownPath = getVerificationReportMarkdownPath(repoRoot, manifest.issueKey);
const logDir = path.join(artifactDir, 'logs');

const changedFiles = collectChangedFiles(repoRoot, manifest.baseBranch);
const commands = resolveVerificationCommands(changedFiles);

if (options.dryRun) {
  console.log('# copilot:issue:verify dry-run');
  console.log(`- issue key: ${manifest.issueKey}`);
  console.log(`- base branch: ${manifest.baseBranch}`);
  console.log(`- execution branch: ${manifest.branchName}`);
  console.log(`- changed files: ${changedFiles.length}`);
  for (const command of commands) {
    console.log(`- ${command.command.join(' ')}`);
  }
  process.exit(0);
}

ensureDir(logDir);

let hasFailure = false;
const commandResults = [];

for (const command of commands) {
  const commandDisplay = command.command.join(' ');
  const logPath = path.join(logDir, `${command.key}.log`);

  if (hasFailure) {
    commandResults.push({
      key: command.key,
      title: command.title,
      commandDisplay,
      status: 'skipped',
      exitCode: null,
      logPath: relativeToRepo(repoRoot, logPath),
    });
    continue;
  }

  console.log(`→ ${commandDisplay}`);
  const startedAt = new Date().toISOString();
  const result = runCommand(command.command[0], command.command.slice(1), {
    cwd: repoRoot,
    allowFailure: true,
  });
  const finishedAt = new Date().toISOString();

  const output = [
    `# ${commandDisplay}`,
    '',
    '## stdout',
    result.stdout || '(empty)',
    '',
    '## stderr',
    result.stderr || '(empty)',
  ].join('\n');
  writeText(logPath, output);

  const status = result.status === 0 ? 'passed' : 'failed';
  if (status === 'failed') {
    hasFailure = true;
  }

  commandResults.push({
    key: command.key,
    title: command.title,
    commandDisplay,
    status,
    exitCode: result.status,
    logPath: relativeToRepo(repoRoot, logPath),
    startedAt,
    finishedAt,
  });
}

const report = {
  schemaVersion: 1,
  issueKey: manifest.issueKey,
  status: hasFailure ? 'failed' : 'passed',
  baseBranch: manifest.baseBranch,
  branchName: manifest.branchName,
  artifactDir: manifest.artifactDir,
  changedFiles,
  commands: commandResults,
  verifiedAt: new Date().toISOString(),
};

writeJson(reportPath, report);
writeText(reportMarkdownPath, renderVerificationReportMarkdown(manifest, report));

console.log(`✓ verification ${report.status}`);
console.log(`  report: ${relativeToRepo(repoRoot, reportPath)}`);
console.log(`  markdown: ${relativeToRepo(repoRoot, reportMarkdownPath)}`);

if (hasFailure) {
  process.exit(1);
}
