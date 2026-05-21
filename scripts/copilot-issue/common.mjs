#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const EXECUTION_LABEL = 'ai-exec-ready';

export const REQUIRED_SECTIONS = [
  { key: 'problemStatement', heading: 'Problem statement' },
  { key: 'expectedOutcome', heading: 'Expected outcome / acceptance criteria' },
  { key: 'outOfScope', heading: 'Out of scope' },
  { key: 'targetArea', heading: 'Target area' },
  { key: 'constraintsNotes', heading: 'Constraints / notes' },
];

const BASELINE_COMMANDS = [
  {
    key: 'codex-verify-sync',
    title: 'Codex Sync Verify',
    command: ['pnpm', 'run', 'codex:verify-sync'],
  },
  {
    key: 'codex-preflight',
    title: 'Codex Preflight',
    command: ['pnpm', 'run', 'codex:preflight'],
  },
  {
    key: 'codex-push-guard',
    title: 'Codex Push Guard',
    command: ['pnpm', 'run', 'codex:push-guard'],
  },
  {
    key: 'lint',
    title: 'Lint',
    command: ['pnpm', 'lint'],
  },
];

const AREA_COMMANDS = [
  {
    key: 'server-typecheck',
    title: 'Type Check (Server)',
    command: ['pnpm', '--filter', 'server', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/server/')),
  },
  {
    key: 'server-build',
    title: 'Build (Server)',
    command: ['pnpm', 'build:server'],
    matches: (files) => files.some((file) => file.startsWith('apps/server/')),
  },
  {
    key: 'web-pms-typecheck',
    title: 'Type Check (PMS)',
    command: ['pnpm', '--filter', 'web-pms', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/pms/')),
  },
  {
    key: 'web-pms-build',
    title: 'Build (PMS)',
    command: ['pnpm', 'build:web-pms'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/pms/')),
  },
  {
    key: 'web-cms-typecheck',
    title: 'Type Check (CMS)',
    command: ['pnpm', '--filter', 'web-cms', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/cms/')),
  },
  {
    key: 'web-cms-build',
    title: 'Build (CMS)',
    command: ['pnpm', 'build:web-cms'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/cms/')),
  },
  {
    key: 'web-dms-typecheck',
    title: 'Type Check (DMS)',
    command: ['pnpm', '--filter', 'web-dms', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/dms/')),
  },
  {
    key: 'web-dms-build',
    title: 'Build (DMS)',
    command: ['pnpm', 'build:web-dms'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/dms/')),
  },
  {
    key: 'web-admin-typecheck',
    title: 'Type Check (Admin)',
    command: ['pnpm', '--filter', 'web-admin', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/admin/')),
  },
  {
    key: 'web-admin-build',
    title: 'Build (Admin)',
    command: ['pnpm', 'build:web-admin'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/admin/')),
  },
  {
    key: 'database-build',
    title: 'Build (@ssoo/database)',
    command: ['pnpm', '--filter', '@ssoo/database', 'build'],
    matches: (files) => files.some((file) => file.startsWith('packages/database/')) || files.some(isAccessBoundaryFile),
  },
  {
    key: 'access-verify-ci',
    title: 'Access Verification Pack',
    command: ['pnpm', 'verify:access-ci'],
    matches: (files) => files.some((file) => file.startsWith('packages/database/')) || files.some(isAccessBoundaryFile),
  },
  {
    key: 'types-build',
    title: 'Build (@ssoo/types)',
    command: ['pnpm', '--filter', '@ssoo/types', 'build'],
    matches: (files) => files.some((file) => file.startsWith('packages/types/')),
  },
];

export function printUsage(scriptName, detailLines = []) {
  const lines = [
    `Usage: pnpm run ${scriptName} -- --issue <iid> [--base <branch>] [--dry-run]`,
    `   or: pnpm run ${scriptName} -- --issues <iid1,iid2> [--base <branch>] [--dry-run]`,
    '',
    'Options:',
    '  --issue <iid>        Single GitLab issue IID',
    '  --issues <csv>       Batch GitLab issue IIDs (for n:1 current slice)',
    '  --base <branch>      Base branch to diff/branch from (default: current branch for prepare, manifest base for verify/report)',
    '  --manifest <path>    Explicit manifest path (verify/report only)',
    '  --dry-run            Print the resolved actions without mutating state',
    '  --help               Show this help',
  ];
  for (const line of detailLines) {
    lines.push(line);
  }
  console.log(lines.join('\n'));
}

export function parseCliOptions(argv, { allowManifest = false } = {}) {
  const help = argv.includes('--help');
  const dryRun = argv.includes('--dry-run');
  const issue = readOptionValue(argv, ['issue']);
  const issues = readOptionValue(argv, ['issues']);
  const baseBranch = readOptionValue(argv, ['base', 'base-branch']);
  const manifestPath = allowManifest ? readOptionValue(argv, ['manifest']) : null;

  if (help) {
    return {
      help,
      dryRun,
      baseBranch: baseBranch ?? null,
      issueIids: [],
      issueKey: null,
      mode: null,
      manifestPath: manifestPath ?? null,
    };
  }

  if (issue && issues) {
    throw new Error('`--issue`와 `--issues`를 동시에 사용할 수 없습니다.');
  }

  if (!issue && !issues && !manifestPath) {
    throw new Error('`--issue`, `--issues`, 또는 `--manifest` 중 하나는 필요합니다.');
  }

  const issueIids = issue
    ? [parseIssueIid(issue)]
    : issues
      ? issues
        .split(',')
        .map((value) => parseIssueIid(value.trim()))
      : [];

  return {
    help,
    dryRun,
    baseBranch: baseBranch ?? null,
    issueIids,
    issueKey: issueIids.length > 0 ? resolveIssueKey(issueIids) : null,
    mode: issueIids.length > 1 ? 'batch' : 'single',
    manifestPath: manifestPath ?? null,
  };
}

export function resolveIssueKey(issueIids) {
  return issueIids.length === 1
    ? `issue-${issueIids[0]}`
    : `issues-${issueIids.join('-')}`;
}

export function buildExecutionBranchName(issues) {
  const primary = issues[0];
  const slug = slugify(primary?.title ?? 'work', issues.length === 1 ? 40 : 28) || 'work';
  return issues.length === 1
    ? `ai/issue-${primary.iid}-${slug}`
    : `ai/issues-${issues.map((issue) => issue.iid).join('-')}-${slug}`;
}

export function slugify(value, maxLength = 48) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

export function getRepoRoot() {
  return gitOutput(['rev-parse', '--show-toplevel']);
}

export function getCurrentBranch(repoRoot) {
  return gitOutput(['branch', '--show-current'], { cwd: repoRoot });
}

export function ensureCleanWorktree(repoRoot) {
  const status = gitOutput(['status', '--porcelain'], { cwd: repoRoot });
  if (status.trim().length > 0) {
    throw new Error('dirty worktree에서는 prepare를 진행할 수 없습니다. 먼저 변경사항을 정리하세요.');
  }
}

export function localBranchExists(repoRoot, branchName) {
  return runCommand('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], {
    cwd: repoRoot,
    allowFailure: true,
  }).status === 0;
}

export function checkoutExecutionBranch(repoRoot, branchName, baseBranch) {
  if (localBranchExists(repoRoot, branchName)) {
    runCommand('git', ['checkout', branchName], { cwd: repoRoot });
    return 'existing';
  }

  runCommand('git', ['checkout', '-b', branchName, baseBranch], { cwd: repoRoot });
  return 'created';
}

export function collectChangedFiles(repoRoot, baseBranch) {
  const output = gitOutput(['diff', '--name-only', `${baseBranch}...HEAD`], { cwd: repoRoot });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function resolveVerificationCommands(changedFiles) {
  const commands = [...BASELINE_COMMANDS];
  for (const descriptor of AREA_COMMANDS) {
    if (descriptor.matches(changedFiles) && !commands.some((existing) => existing.key === descriptor.key)) {
      commands.push(descriptor);
    }
  }
  return commands;
}

export function getArtifactDir(repoRoot, issueKey) {
  return path.join(repoRoot, '.runtime', 'copilot-issue', issueKey);
}

export function getManifestPath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'manifest.json');
}

export function getNormalizedSpecPath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'normalized-spec.md');
}

export function getVerificationReportPath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'verification-report.json');
}

export function getVerificationReportMarkdownPath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'verification-report.md');
}

export function getIssueNotePath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'issue-note.md');
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf-8');
}

export function relativeToRepo(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath) || '.';
}

export function buildNormalizedSpec(manifest) {
  const issueLines = manifest.issues
    .map((issue) => `- !${issue.iid} ${issue.title} (${issue.webUrl})`)
    .join('\n');
  const targetAreas = dedupe(
    manifest.issues.flatMap((issue) => toListItems(issue.sections.targetArea)),
  );

  const targetAreaBlock = targetAreas.length > 0
    ? targetAreas.map((entry) => `- ${entry}`).join('\n')
    : '- (not specified)';

  const sectionBlocks = manifest.issues.map((issue) => [
    `## Issue !${issue.iid}`,
    '',
    `### Problem statement`,
    issue.sections.problemStatement,
    '',
    `### Expected outcome / acceptance criteria`,
    issue.sections.expectedOutcome,
    '',
    `### Out of scope`,
    issue.sections.outOfScope,
    '',
    `### Constraints / notes`,
    issue.sections.constraintsNotes,
    '',
  ].join('\n'));

  return [
    '# Copilot local operator execution spec',
    '',
    '## Execution context',
    '',
    '- Issue platform: GitLab',
    `- Issue key: \`${manifest.issueKey}\``,
    `- Mode: \`${manifest.mode}\``,
    `- Base branch: \`${manifest.baseBranch}\``,
    `- Execution branch: \`${manifest.branchName}\``,
    `- Required label: \`${manifest.executionLabel}\``,
    '',
    '## Participating issues',
    '',
    issueLines,
    '',
    '## Target area',
    '',
    targetAreaBlock,
    '',
    '## Operator contract',
    '',
    '- issue가 canonical tracking record다.',
    '- current slice에서는 `--issue` / `--issues`만 허용한다.',
    '- 1:n split는 열지 않는다.',
    '- current slice는 issue registration -> local verification/report까지다.',
    '',
    ...sectionBlocks,
  ].join('\n').trimEnd();
}

export function renderVerificationReportMarkdown(manifest, report) {
  const changedFileLines = report.changedFiles.length > 0
    ? report.changedFiles.map((file) => `- \`${file}\``).join('\n')
    : '- (no changed files detected against the recorded base branch)';

  const commandLines = report.commands.map((entry) => {
    const icon = entry.status === 'passed'
      ? '✅'
      : entry.status === 'failed'
        ? '❌'
        : '⏭️';
    return `- ${icon} \`${entry.commandDisplay}\``;
  }).join('\n');

  const nextAction = report.status === 'passed'
    ? '변경 사항을 검토한 뒤 `pnpm run copilot:issue:report -- ...`로 GitLab issue note를 남긴다.'
    : '실패 원인을 수정한 뒤 같은 issue key로 `pnpm run copilot:issue:verify -- ...`를 다시 실행한다.';

  return [
    '# Copilot local operator verification report',
    '',
    '## Execution summary',
    '',
    `- Status: \`${report.status}\``,
    `- Issue key: \`${manifest.issueKey}\``,
    `- Base branch: \`${manifest.baseBranch}\``,
    `- Execution branch: \`${manifest.branchName}\``,
    '',
    '## Participating issues',
    '',
    ...manifest.issues.map((issue) => `- !${issue.iid} ${issue.title}`),
    '',
    '## Changed files',
    '',
    changedFileLines,
    '',
    '## Verification matrix',
    '',
    commandLines,
    '',
    '## Next action',
    '',
    `- ${nextAction}`,
    `- Local artifact dir: \`${report.artifactDir}\``,
  ].join('\n');
}

export function buildGitLabIssueNote(manifest, report) {
  const changedFiles = report.changedFiles.length > 0
    ? report.changedFiles.map((file) => `- \`${file}\``).join('\n')
    : '- (no changed files detected against the recorded base branch)';
  const matrix = report.commands.map((entry) => {
    const icon = entry.status === 'passed'
      ? '✅'
      : entry.status === 'failed'
        ? '❌'
        : '⏭️';
    return `- ${icon} \`${entry.commandDisplay}\``;
  }).join('\n');

  return [
    '## Copilot local operator report',
    '',
    `- Status: \`${report.status}\``,
    `- Base branch: \`${manifest.baseBranch}\``,
    `- Execution branch: \`${manifest.branchName}\``,
    `- Issue key: \`${manifest.issueKey}\``,
    '',
    '### Changed files',
    '',
    changedFiles,
    '',
    '### Verification matrix',
    '',
    matrix,
    '',
    '### Local artifacts',
    '',
    `- \`${report.artifactDir}/verification-report.md\``,
    `- \`${report.artifactDir}/normalized-spec.md\``,
    '',
    '### Next action',
    '',
    report.status === 'passed'
      ? '- 브랜치 diff를 검토한 뒤 다음 승인/보고 단계로 넘긴다.'
      : '- 실패 원인을 수정한 뒤 같은 issue key로 verify/report를 다시 수행한다.',
  ].join('\n');
}

export async function resolveGitLabContext(repoRoot) {
  const remoteUrl = gitOutput(['config', '--get', 'remote.origin.url'], { cwd: repoRoot });
  const { hostUrl, projectPath, credentialUser, credentialToken } = parseGitLabRemote(remoteUrl);
  const gitLabUser = process.env.GL_USER || readGitConfig(repoRoot, 'codex.gitlabUser') || credentialUser;
  const gitLabToken = process.env.GL_TOKEN || readGitConfig(repoRoot, 'codex.gitlabToken') || credentialToken;

  if (!gitLabToken) {
    throw new Error('GitLab API access requires GL_TOKEN, local git config codex.gitlabToken, or remote.origin.url credentials.');
  }

  return {
    hostUrl,
    projectPath,
    projectId: encodeURIComponent(projectPath),
    apiBaseUrl: `${hostUrl.replace(/\/$/, '')}/api/v4`,
    gitLabUser,
    gitLabToken,
  };
}

export async function fetchIssues(gitLabContext, issueIids) {
  return Promise.all(issueIids.map((issueIid) => fetchIssue(gitLabContext, issueIid)));
}

export async function fetchIssue(gitLabContext, issueIid) {
  return gitLabFetchJson(gitLabContext, `/projects/${gitLabContext.projectId}/issues/${issueIid}`);
}

export async function postIssueNote(gitLabContext, issueIid, body) {
  return gitLabFetchJson(
    gitLabContext,
    `/projects/${gitLabContext.projectId}/issues/${issueIid}/notes`,
    {
      method: 'POST',
      body: { body },
    },
  );
}

export function validateIssue(issue) {
  const sections = parseIssueSections(issue.description ?? '');
  const errors = [];

  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  if (!labels.includes(EXECUTION_LABEL)) {
    errors.push(`GitLab issue !${issue.iid}에는 \`${EXECUTION_LABEL}\` label이 필요합니다.`);
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!sections[section.key]) {
      errors.push(`GitLab issue !${issue.iid}의 \`${section.heading}\` 섹션이 비어 있습니다.`);
    }
  }

  return {
    issue: {
      iid: Number(issue.iid),
      title: issue.title,
      webUrl: issue.web_url,
      labels,
      sections,
    },
    errors,
  };
}

function parseIssueSections(body) {
  const sectionMap = new Map();
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let currentHeading = null;
  let buffer = [];

  const flush = () => {
    if (!currentHeading) {
      return;
    }
    sectionMap.set(normalizeHeading(currentHeading), sanitizeTemplateText(buffer.join('\n')));
  };

  for (const line of lines) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(line.trim());
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1];
      buffer = [];
      continue;
    }

    if (currentHeading) {
      buffer.push(line);
    }
  }

  flush();

  return Object.fromEntries(
    REQUIRED_SECTIONS.map((section) => [
      section.key,
      sectionMap.get(normalizeHeading(section.heading)) ?? '',
    ]),
  );
}

function sanitizeTemplateText(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeHeading(value) {
  return value.trim().toLowerCase();
}

function toListItems(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
}

function dedupe(values) {
  return [...new Set(values)];
}

function parseIssueIid(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid issue iid: ${value}`);
  }
  return parsed;
}

function readOptionValue(argv, names) {
  for (const name of names) {
    const flag = `--${name}`;
    const index = argv.indexOf(flag);
    if (index >= 0) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${flag} 값이 필요합니다.`);
      }
      return value;
    }
  }
  return null;
}

function parseGitLabRemote(remoteUrl) {
  if (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://')) {
    throw new Error('Only http(s) GitLab remotes are supported for the local operator issue flow.');
  }

  const parsed = new URL(remoteUrl);
  return {
    hostUrl: `${parsed.protocol}//${parsed.host}`,
    projectPath: parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, ''),
    credentialUser: parsed.username ? decodeURIComponent(parsed.username) : '',
    credentialToken: parsed.password ? decodeURIComponent(parsed.password) : '',
  };
}

async function gitLabFetchJson(gitLabContext, pathname, { method = 'GET', body = null } = {}) {
  const response = await fetch(`${gitLabContext.apiBaseUrl}${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': gitLabContext.gitLabToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  if (!response.ok) {
    const summary = rawText.slice(0, 400).replace(/\s+/g, ' ').trim();
    throw new Error(`GitLab API ${method} ${pathname} failed (${response.status}): ${summary}`);
  }

  return rawText ? JSON.parse(rawText) : null;
}

function isAccessBoundaryFile(filePath) {
  return (
    filePath.startsWith('packages/web-auth/')
    || filePath.startsWith('apps/server/src/modules/common/auth/')
    || filePath.includes('/access/')
    || filePath.includes('/auth/')
  );
}

function readGitConfig(repoRoot, key) {
  const result = runCommand('git', ['config', '--local', '--get', key], {
    cwd: repoRoot,
    allowFailure: true,
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function gitOutput(args, options = {}) {
  const result = runCommand('git', args, options);
  return result.stdout.trim();
}

export function runCommand(command, args, { cwd, allowFailure = false, env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: env ?? process.env,
    encoding: 'utf-8',
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [
        `${command} ${args.join(' ')} failed with exit code ${result.status}.`,
        stderr || stdout || 'no output',
      ].join('\n'),
    );
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
