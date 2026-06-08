#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ISSUE_LABELS = Object.freeze({
  ready: 'ai-exec-ready',
  inProgress: 'ai/in-progress',
  verified: 'ai/verified',
  blocked: 'ai/blocked',
  batch: 'ai/batch',
  mergeReady: 'ai/merge-ready',
});

export const EXECUTION_LABEL = ISSUE_LABELS.ready;

export const STRUCTURED_NOTE_MARKERS = Object.freeze({
  v1: '<!-- copilot-issue-registry:v1 -->',
  v2: '<!-- copilot-issue-registry:v2 -->',
});

const EXECUTION_STATE_LABELS = [
  ISSUE_LABELS.ready,
  ISSUE_LABELS.inProgress,
  ISSUE_LABELS.verified,
  ISSUE_LABELS.blocked,
];

const MANAGED_FLOW_LABELS = [
  ...EXECUTION_STATE_LABELS,
  ISSUE_LABELS.batch,
];

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
    key: 'web-sns-typecheck',
    title: 'Type Check (SNS)',
    command: ['pnpm', '--filter', 'web-sns', 'exec', 'tsc', '--noEmit'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/sns/')),
  },
  {
    key: 'web-sns-build',
    title: 'Build (SNS)',
    command: ['pnpm', 'build:web-sns'],
    matches: (files) => files.some((file) => file.startsWith('apps/web/sns/')),
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
    '  --base <branch>      Base branch to diff/branch from (default: current branch for prepare, manifest base for verify/report/merge)',
    '  --manifest <path>    Explicit manifest path (verify/report/merge)',
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

  const rawIssueIids = issue
    ? [parseIssueIid(issue)]
    : issues
      ? issues
        .split(',')
        .map((value) => parseIssueIid(value.trim()))
      : [];

  const issueIids = normalizeIssueIids(rawIssueIids);

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
  const sortedIssues = sortIssuesByIid(issues);
  const primary = sortedIssues[0];
  if (sortedIssues.length === 1) {
    const slug = slugify(primary?.title ?? 'work', 40) || 'work';
    return `ai/issue-${primary.iid}-${slug}`;
  }

  const targetAreas = dedupe(
    sortedIssues.flatMap((issue) => toListItems(issue.sections?.targetArea ?? '')),
  );
  const batchSlug = slugify(targetAreas.slice(0, 2).join('-'), 24) || 'batch';
  return `ai/issues-${sortedIssues.map((issue) => issue.iid).join('-')}-${batchSlug}`;
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

export function resolveOperatorIdentity(repoRoot, gitLabContext) {
  const gitLabUser = gitLabContext.gitLabUser || null;
  const gitUserName = readGitConfig(repoRoot, 'user.name') || null;
  const gitUserEmail = readGitConfig(repoRoot, 'user.email') || null;
  const localUser = process.env.USER || process.env.USERNAME || null;

  return {
    gitLabUser,
    gitUserName,
    gitUserEmail,
    localUser,
    displayName: gitLabUser || gitUserName || localUser || 'unknown-operator',
  };
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

export function remoteTrackingBranchExists(repoRoot, branchName, remoteName = 'origin') {
  return runCommand('git', ['show-ref', '--verify', '--quiet', `refs/remotes/${remoteName}/${branchName}`], {
    cwd: repoRoot,
    allowFailure: true,
  }).status === 0;
}

export function resolveBranchReference(repoRoot, branchName, { remoteName = 'origin', fetchRemote = false } = {}) {
  if (localBranchExists(repoRoot, branchName)) {
    return {
      exists: true,
      ref: branchName,
      source: 'local',
    };
  }

  if (remoteTrackingBranchExists(repoRoot, branchName, remoteName)) {
    return {
      exists: true,
      ref: `${remoteName}/${branchName}`,
      source: 'remote-tracking',
    };
  }

  if (fetchRemote && remoteBranchExists(repoRoot, branchName, remoteName)) {
    fetchRemoteTrackingBranch(repoRoot, branchName, remoteName);
    return {
      exists: true,
      ref: `${remoteName}/${branchName}`,
      source: 'remote-fetched',
    };
  }

  return {
    exists: false,
    ref: branchName,
    source: 'missing',
  };
}

export function resolveBaseBranch(repoRoot, { override = null } = {}) {
  const branchName = override ?? getCurrentBranch(repoRoot);
  if (!branchName) {
    throw new Error('base branch를 결정할 수 없습니다. 현재 브랜치를 확인하거나 `--base <branch>`를 지정하세요.');
  }

  if (!override && isExecutionBranchName(branchName)) {
    throw new Error('현재 브랜치가 execution branch입니다. `--base <branch>`를 지정하거나 base 브랜치로 checkout한 뒤 다시 시도하세요.');
  }

  const branchRef = resolveBranchReference(repoRoot, branchName);
  if (!branchRef.exists) {
    throw new Error(`base branch \`${branchName}\`를 찾을 수 없습니다. 로컬 브랜치 또는 origin tracking branch를 확인하세요.`);
  }

  return {
    branchName,
    ref: branchRef.ref,
    source: branchRef.source,
  };
}

export function checkoutExecutionBranch(repoRoot, branchName, baseRef) {
  if (localBranchExists(repoRoot, branchName)) {
    runCommand('git', ['checkout', branchName], { cwd: repoRoot });
    return 'existing-local';
  }

  const remoteBranch = resolveBranchReference(repoRoot, branchName, { fetchRemote: true });
  if (remoteBranch.exists) {
    runCommand('git', ['checkout', '-b', branchName, '--track', remoteBranch.ref], { cwd: repoRoot });
    return remoteBranch.source === 'remote-fetched' ? 'existing-remote-fetched' : 'existing-remote';
  }

  runCommand('git', ['checkout', '-b', branchName, baseRef], { cwd: repoRoot });
  return 'created';
}

export function collectChangedFiles(repoRoot, baseRef) {
  const output = gitOutput(['diff', '--name-only', `${baseRef}...HEAD`], { cwd: repoRoot });
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

export function getPrepareNotePath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'prepare-note.md');
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

export function getDuplicateTriageArtifactPath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'duplicate-triage.json');
}

export function getDuplicateNotePath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'duplicate-note.md');
}

export function getMergeNotePath(repoRoot, issueKey) {
  return path.join(getArtifactDir(repoRoot, issueKey), 'merge-note.md');
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
    `- Topology: \`${manifest.topology ?? getTopology(manifest.mode)}\``,
    `- Operator: \`${manifest.operator?.displayName ?? 'unknown-operator'}\``,
    `- Base branch: \`${manifest.baseBranch}\``,
    `- Base ref: \`${manifest.baseRef ?? manifest.baseBranch}\``,
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
    '- current slice는 issue registration -> duplicate triage comment -> prepare -> local verification/report -> branch push -> merge finalize까지다.',
    '- duplicate suspected issue는 triage 단계에서 자동 close하지 않고 comment-first / user-handled close로 처리한다.',
    '- executionBranch와 reflectedBranches는 서로 다른 audit field로 유지한다.',
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
    `- Topology: \`${manifest.topology ?? getTopology(manifest.mode)}\``,
    `- Base branch: \`${manifest.baseBranch}\``,
    `- Base ref: \`${manifest.baseRef ?? manifest.baseBranch}\``,
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
  const stateLabel = report.status === 'passed'
    ? ISSUE_LABELS.verified
    : ISSUE_LABELS.blocked;

  return buildGitLabStateNote(manifest, {
    phase: 'report',
    stateLabel,
    verificationStatus: report.status,
    noteTimestamp: report.verifiedAt,
    report,
  });
}

export function buildGitLabStateNote(
  manifest,
  {
    phase,
    stateLabel,
    verificationStatus,
    noteTimestamp = new Date().toISOString(),
    report = null,
    checkoutMode = null,
    supersededBranch = null,
    reflectedBranches = null,
    terminalReason = null,
    merge = null,
    duplicate = null,
  },
) {
  const issueLines = sortIssuesByIid(manifest.issues)
    .map((issue) => `- !${issue.iid} ${issue.title}`);
  const changedFileLines = report
    ? report.changedFiles.length > 0
      ? report.changedFiles.map((file) => `- \`${file}\``)
      : ['- (no changed files detected against the recorded base branch)']
    : ['- (not run yet)'];
  const matrixLines = report
    ? report.commands.map((entry) => {
      const icon = entry.status === 'passed'
        ? '✅'
        : entry.status === 'failed'
          ? '❌'
          : '⏭️';
      return `- ${icon} \`${entry.commandDisplay}\``;
    })
    : ['- `not-run`'];
  const artifactPaths = {
    manifest: manifest.manifestPath,
    normalizedSpec: manifest.normalizedSpecPath,
    prepareNote: manifest.prepareNotePath ?? null,
    verificationReport: manifest.verificationReportPath ?? null,
    verificationReportMarkdown: manifest.verificationReportMarkdownPath ?? null,
    issueNote: manifest.issueNotePath ?? null,
  };
  const artifactLines = Object.entries(artifactPaths)
    .filter(([, value]) => value)
    .map(([label, value]) => `- ${label}: \`${value}\``);
  const reflectedBranchList = normalizeStringList(reflectedBranches ?? manifest.reflectedBranches ?? []);
  const notePayload = {
    version: 2,
    phase,
    stateLabel,
    verificationStatus,
    noteTimestamp,
    issueKey: manifest.issueKey,
    topology: manifest.topology ?? getTopology(manifest.mode),
    operator: manifest.operator ?? { displayName: 'unknown-operator' },
    baseBranch: manifest.baseBranch,
    baseRef: manifest.baseRef ?? manifest.baseBranch,
    executionBranch: manifest.branchName,
    reflectedBranches: reflectedBranchList,
    checkoutMode: checkoutMode ?? manifest.checkoutMode ?? null,
    participatingIssues: sortIssuesByIid(manifest.issues).map((issue) => issue.iid),
    artifactPaths,
    supersededBranch: supersededBranch ?? manifest.registry?.supersededBranch ?? null,
    terminalReason,
    merge,
    duplicate,
    reportStatus: report?.status ?? null,
  };
  const nextAction = resolveNextAction({ phase, report, merge, duplicate });
  const reflectedLines = reflectedBranchList.length > 0
    ? reflectedBranchList.map((branch) => `- \`${branch}\``)
    : ['- (none yet)'];
  const mergeLines = merge
    ? Object.entries(merge).map(([key, value]) => `- ${key}: \`${formatPayloadValue(value)}\``)
    : ['- (not applicable)'];
  const duplicateLines = duplicate
    ? Object.entries(duplicate).map(([key, value]) => `- ${key}: \`${formatPayloadValue(value)}\``)
    : ['- (not applicable)'];

  return [
    '## Copilot local operator registry',
    '',
    STRUCTURED_NOTE_MARKERS.v2,
    '',
    `- Phase: \`${phase}\``,
    `- State label: \`${stateLabel}\``,
    `- Verification status: \`${verificationStatus}\``,
    `- Topology: \`${notePayload.topology}\``,
    `- Operator: \`${notePayload.operator.displayName}\``,
    `- Base branch: \`${notePayload.baseBranch}\``,
    `- Base ref: \`${notePayload.baseRef}\``,
    `- Execution branch: \`${notePayload.executionBranch}\``,
    `- Reflected branches: \`${reflectedBranchList.length > 0 ? reflectedBranchList.join(', ') : 'none'}\``,
    `- Checkout mode: \`${notePayload.checkoutMode ?? 'n/a'}\``,
    `- Superseded branch: \`${notePayload.supersededBranch ?? 'none'}\``,
    `- Terminal reason: \`${terminalReason ?? 'none'}\``,
    `- Timestamp: \`${noteTimestamp}\``,
    '',
    '### Participating issues',
    '',
    ...issueLines,
    '',
    '### Reflected branches',
    '',
    ...reflectedLines,
    '',
    '### Changed files',
    '',
    ...changedFileLines,
    '',
    '### Verification matrix',
    '',
    ...matrixLines,
    '',
    '### Local artifacts',
    '',
    ...artifactLines,
    '',
    '### Merge audit',
    '',
    ...mergeLines,
    '',
    '### Duplicate audit',
    '',
    ...duplicateLines,
    '',
    '### Next action',
    '',
    nextAction,
    '',
    '### Structured payload',
    '',
    '```json',
    JSON.stringify(notePayload, null, 2),
    '```',
  ].join('\n');
}

export function buildDuplicateTriageNote({
  issue,
  canonicalIssue,
  reason,
  operator,
  candidates = [],
  noteTimestamp = new Date().toISOString(),
}) {
  const duplicate = {
    policy: 'comment-first-user-handled-close',
    suspectedDuplicate: true,
    canonicalIssueIid: Number(canonicalIssue.iid),
    canonicalIssueTitle: canonicalIssue.title ?? null,
    canonicalIssueUrl: canonicalIssue.webUrl ?? canonicalIssue.web_url ?? null,
    reason,
    candidates: candidates.map((candidate) => ({
      iid: Number(candidate.iid),
      title: candidate.title,
      state: candidate.state ?? candidate.issueState ?? null,
      webUrl: candidate.webUrl ?? candidate.web_url ?? null,
    })),
  };

  return buildGitLabStateNote(
    {
      issueKey: `issue-${issue.iid}`,
      mode: 'single',
      topology: 'single',
      operator,
      baseBranch: null,
      baseRef: null,
      branchName: null,
      reflectedBranches: [],
      issues: [normalizeIssueForNote(issue)],
      artifactPaths: {},
    },
    {
      phase: 'duplicate-triage',
      stateLabel: ISSUE_LABELS.blocked,
      verificationStatus: 'not-run',
      noteTimestamp,
      duplicate,
    },
  );
}

export function buildDuplicateCloseNote({
  issue,
  canonicalIssue,
  reason,
  operator,
  noteTimestamp = new Date().toISOString(),
}) {
  const duplicate = {
    policy: 'explicit-user-handled-close',
    suspectedDuplicate: true,
    canonicalIssueIid: Number(canonicalIssue.iid),
    canonicalIssueTitle: canonicalIssue.title ?? null,
    canonicalIssueUrl: canonicalIssue.webUrl ?? canonicalIssue.web_url ?? null,
    reason,
    closeSource: 'explicit-user-or-operator-instruction',
  };

  return buildGitLabStateNote(
    {
      issueKey: `issue-${issue.iid}`,
      mode: 'single',
      topology: 'single',
      operator,
      baseBranch: null,
      baseRef: null,
      branchName: null,
      reflectedBranches: [],
      issues: [normalizeIssueForNote(issue)],
      artifactPaths: {},
    },
    {
      phase: 'duplicate-close',
      stateLabel: ISSUE_LABELS.blocked,
      verificationStatus: 'not-run',
      noteTimestamp,
      terminalReason: 'duplicate-explicit-close',
      duplicate,
    },
  );
}

export async function resolveGitLabContext(repoRoot) {
  const remoteUrlResult = runCommand('git', ['config', '--get', 'remote.origin.url'], {
    cwd: repoRoot,
    allowFailure: true,
  });
  const remoteUrl = remoteUrlResult.status === 0 ? remoteUrlResult.stdout.trim() : '';
  const parsedRemote = remoteUrl
    ? parseGitLabRemote(remoteUrl)
    : {
      hostUrl: '',
      projectPath: '',
      credentialUser: '',
      credentialToken: '',
    };
  const hostUrl = process.env.GL_HOST_URL
    || readGitConfig(repoRoot, 'codex.gitlabHostUrl')
    || parsedRemote.hostUrl;
  const projectPath = process.env.GL_PROJECT_PATH
    || readGitConfig(repoRoot, 'codex.gitlabProjectPath')
    || parsedRemote.projectPath;
  const gitLabUser = process.env.GL_USER || readGitConfig(repoRoot, 'codex.gitlabUser') || parsedRemote.credentialUser;
  const gitLabToken = process.env.GL_TOKEN || readGitConfig(repoRoot, 'codex.gitlabToken') || parsedRemote.credentialToken;

  if (!gitLabToken) {
    throw new Error('GitLab API access requires GL_TOKEN, local git config codex.gitlabToken, or remote.origin.url credentials.');
  }

  if (!hostUrl || !projectPath) {
    throw new Error('GitLab API context requires host/project information. Configure `GL_HOST_URL`/`GL_PROJECT_PATH` or local git config `codex.gitlabHostUrl`/`codex.gitlabProjectPath` when the remote URL is not enough.');
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

export async function fetchIssueNotes(gitLabContext, issueIid, { perPage = 100 } = {}) {
  const params = new URLSearchParams({
    sort: 'desc',
    order_by: 'created_at',
    per_page: String(perPage),
  });
  return gitLabFetchJson(gitLabContext, `/projects/${gitLabContext.projectId}/issues/${issueIid}/notes?${params.toString()}`);
}

export async function fetchLatestStructuredNote(gitLabContext, issueIid) {
  const notes = await fetchIssueNotes(gitLabContext, issueIid);
  return findLatestStructuredNote(notes);
}

export async function fetchDuplicateCandidateIssues(
  gitLabContext,
  issue,
  { candidateIids = [], state = 'all', perPage = 20 } = {},
) {
  const searchQuery = buildDuplicateSearchQuery(issue);
  const params = new URLSearchParams({
    state,
    scope: 'all',
    search: searchQuery,
    in: 'title,description',
    per_page: String(perPage),
  });
  const searchedIssues = searchQuery
    ? await gitLabFetchJson(gitLabContext, `/projects/${gitLabContext.projectId}/issues?${params.toString()}`)
    : [];
  const explicitIssues = candidateIids.length > 0
    ? await fetchIssues(gitLabContext, candidateIids)
    : [];
  const candidates = [...explicitIssues, ...searchedIssues]
    .filter((candidate) => Number(candidate.iid) !== Number(issue.iid));
  const byIid = new Map();
  for (const candidate of candidates) {
    byIid.set(Number(candidate.iid), summarizeIssueCandidate(candidate));
  }
  return [...byIid.values()].sort((left, right) => {
    const leftUpdated = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightUpdated = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightUpdated - leftUpdated;
  });
}

export async function updateIssueLabels(gitLabContext, issueIid, labels) {
  return gitLabFetchJson(
    gitLabContext,
    `/projects/${gitLabContext.projectId}/issues/${issueIid}`,
    {
      method: 'PUT',
      body: {
        labels: labels.join(','),
      },
    },
  );
}

export async function updateIssueState(gitLabContext, issueIid, stateEvent) {
  return gitLabFetchJson(
    gitLabContext,
    `/projects/${gitLabContext.projectId}/issues/${issueIid}`,
    {
      method: 'PUT',
      body: {
        state_event: stateEvent,
      },
    },
  );
}

export async function closeIssue(gitLabContext, issueIid) {
  return updateIssueState(gitLabContext, issueIid, 'close');
}

export function buildManagedIssueLabels(currentLabels, { stateLabel, mode }) {
  const nextLabels = currentLabels.filter((label) => !MANAGED_FLOW_LABELS.includes(label));
  nextLabels.push(stateLabel);
  if ((mode ?? 'single') === 'batch') {
    nextLabels.push(ISSUE_LABELS.batch);
  }

  return dedupe(nextLabels).sort((left, right) => left.localeCompare(right));
}

export function validateIssue(issue) {
  const sections = parseIssueSections(issue.description ?? '');
  const errors = [];

  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  if (issue.state !== 'opened') {
    errors.push(`GitLab issue !${issue.iid}는 opened 상태여야 합니다. 현재 상태: \`${issue.state}\``);
  }

  let executionState = null;
  try {
    executionState = resolveExecutionState(labels);
  } catch (error) {
    errors.push(`GitLab issue !${issue.iid}의 execution label 상태가 충돌합니다. ${error.message}`);
  }

  if (!executionState) {
    errors.push(`GitLab issue !${issue.iid}에는 \`${ISSUE_LABELS.ready}\`, \`${ISSUE_LABELS.inProgress}\`, \`${ISSUE_LABELS.verified}\`, \`${ISSUE_LABELS.blocked}\` 중 하나가 필요합니다.`);
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
      issueState: issue.state,
      executionState,
      labels,
      assignee: normalizeIssueAssignee(issue.assignee),
      assignees: normalizeIssueAssignees(issue.assignees),
      sections,
    },
    errors,
  };
}

export function findLatestStructuredNote(notes) {
  for (const note of notes ?? []) {
    const payload = parseStructuredPayloadFromNoteBody(note.body ?? '');
    if (payload) {
      return {
        note,
        payload,
      };
    }
  }
  return null;
}

export function parseStructuredPayloadFromNoteBody(body) {
  if (!body.includes(STRUCTURED_NOTE_MARKERS.v1) && !body.includes(STRUCTURED_NOTE_MARKERS.v2)) {
    return null;
  }

  const jsonBlocks = [...body.matchAll(/```json\s*([\s\S]*?)```/g)];
  for (let index = jsonBlocks.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(jsonBlocks[index][1]);
      if (parsed && typeof parsed === 'object' && parsed.phase) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
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

export function normalizeIssueIids(issueIids) {
  return [...new Set(issueIids)].sort((left, right) => left - right);
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

function sortIssuesByIid(issues) {
  return [...issues].sort((left, right) => left.iid - right.iid);
}

function getTopology(mode) {
  return mode === 'batch' ? 'batch' : 'single';
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return dedupe(
    values
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0),
  );
}

function resolveNextAction({ phase, report, merge, duplicate }) {
  if (phase === 'prepare') {
    return '- checkout된 execution branch에서 구현을 진행한 뒤 `pnpm run copilot:issue:verify -- ...`와 `pnpm run copilot:issue:report -- ...`를 이어간다.';
  }

  if (phase === 'duplicate-triage') {
    return '- duplicate suspected 상태다. 자동 close하지 말고 사용자가 GitLab에서 직접 close하거나 `copilot:issue:close-duplicate`를 명시적으로 실행할 때까지 issue를 open/blocked로 둔다.';
  }

  if (phase === 'duplicate-close') {
    return '- explicit duplicate close 지시에 따라 canonical issue reference를 남긴 뒤 issue를 close한다.';
  }

  if (phase === 'merge-finalize') {
    if (merge?.pushStatus === 'verified') {
      return '- merge target remote push/publish 검증이 끝났으므로 issue를 close한다.';
    }
    return '- merge는 local에서 확인됐지만 remote push/publish 검증이 실패했으므로 issue를 open 상태와 `ai/blocked` label로 유지한다.';
  }

  if (duplicate?.suspectedDuplicate) {
    return '- duplicate suspected 상태다. 사용자 결정 전 자동 close하지 않는다.';
  }

  return report?.status === 'passed'
    ? '- GitLab issue state/note를 확인하고 execution branch를 push 상태로 유지한다.'
    : '- 실패 원인을 수정한 뒤 같은 execution branch에서 verify/report를 다시 수행한다.';
}

function formatPayloadValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return String(value);
}

function normalizeIssueForNote(issue) {
  return {
    iid: Number(issue.iid),
    title: issue.title,
    webUrl: issue.webUrl ?? issue.web_url ?? null,
    issueState: issue.issueState ?? issue.state ?? null,
    executionState: issue.executionState ?? null,
    labels: Array.isArray(issue.labels) ? issue.labels : [],
    assignee: normalizeIssueAssignee(issue.assignee),
    assignees: normalizeIssueAssignees(issue.assignees),
    sections: issue.sections ?? Object.fromEntries(REQUIRED_SECTIONS.map((section) => [section.key, ''])),
  };
}

function normalizeIssueAssignee(assignee) {
  if (!assignee || typeof assignee !== 'object') {
    return null;
  }
  return {
    id: assignee.id ?? null,
    username: assignee.username ?? null,
    name: assignee.name ?? null,
    displayName: assignee.name ?? assignee.username ?? null,
    webUrl: assignee.web_url ?? assignee.webUrl ?? null,
  };
}

function normalizeIssueAssignees(assignees) {
  if (!Array.isArray(assignees)) {
    return [];
  }
  return assignees
    .map((assignee) => normalizeIssueAssignee(assignee))
    .filter((assignee) => assignee !== null);
}

function buildDuplicateSearchQuery(issue) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'issue']);
  const tokens = String(issue.title ?? '')
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
  return dedupe(tokens).slice(0, 6).join(' ');
}

function summarizeIssueCandidate(issue) {
  return {
    iid: Number(issue.iid),
    title: issue.title,
    state: issue.state,
    labels: Array.isArray(issue.labels) ? issue.labels : [],
    webUrl: issue.web_url ?? issue.webUrl ?? null,
    updatedAt: issue.updated_at ?? issue.updatedAt ?? null,
  };
}

function isExecutionBranchName(branchName) {
  return branchName.startsWith('ai/');
}

function resolveExecutionState(labels) {
  const activeLabels = EXECUTION_STATE_LABELS.filter((label) => labels.includes(label));
  if (activeLabels.length > 1) {
    throw new Error(`동시에 둘 이상의 state label이 존재합니다: ${activeLabels.join(', ')}`);
  }

  if (activeLabels.length === 0) {
    return null;
  }

  if (activeLabels[0] === ISSUE_LABELS.ready) {
    return 'ready';
  }

  if (activeLabels[0] === ISSUE_LABELS.inProgress) {
    return 'in-progress';
  }

  if (activeLabels[0] === ISSUE_LABELS.verified) {
    return 'verified';
  }

  return 'blocked';
}

function parseIssueIid(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid issue iid: ${value}`);
  }
  return parsed;
}

export function readOptionValue(argv, names) {
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

export function hasFlag(argv, names) {
  return names.some((name) => argv.includes(`--${name}`));
}

function parseGitLabRemote(remoteUrl) {
  if (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://')) {
    const parsed = new URL(remoteUrl);
    return {
      hostUrl: `${parsed.protocol}//${parsed.host}`,
      projectPath: parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, ''),
      credentialUser: parsed.username ? decodeURIComponent(parsed.username) : '',
      credentialToken: parsed.password ? decodeURIComponent(parsed.password) : '',
    };
  }

  if (remoteUrl.startsWith('ssh://')) {
    const parsed = new URL(remoteUrl);
    return {
      hostUrl: `https://${parsed.hostname}`,
      projectPath: parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, ''),
      credentialUser: parsed.username ? decodeURIComponent(parsed.username) : '',
      credentialToken: '',
    };
  }

  const scpLikeMatch = /^(?:([^@]+)@)?([^:]+):(.+)$/.exec(remoteUrl);
  if (scpLikeMatch) {
    const [, user = '', host, projectPath] = scpLikeMatch;
    return {
      hostUrl: `https://${host}`,
      projectPath: projectPath.replace(/^\/+/, '').replace(/\.git$/, ''),
      credentialUser: user ? decodeURIComponent(user) : '',
      credentialToken: '',
    };
  }

  throw new Error('Unsupported GitLab remote format. Use http(s), ssh://, or git@host:path.git, or configure codex.gitlabHostUrl / codex.gitlabProjectPath.');
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

export function readGitConfig(repoRoot, key) {
  const result = runCommand('git', ['config', '--local', '--get', key], {
    cwd: repoRoot,
    allowFailure: true,
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function remoteBranchExists(repoRoot, branchName, remoteName = 'origin') {
  const remoteUrl = readGitConfig(repoRoot, `remote.${remoteName}.url`);
  if (!remoteUrl) {
    return false;
  }

  return runCommand(
    'git',
    ['ls-remote', '--exit-code', '--heads', remoteName, `refs/heads/${branchName}`],
    {
      cwd: repoRoot,
      allowFailure: true,
    },
  ).status === 0;
}

function fetchRemoteTrackingBranch(repoRoot, branchName, remoteName = 'origin') {
  runCommand(
    'git',
    ['fetch', remoteName, `refs/heads/${branchName}:refs/remotes/${remoteName}/${branchName}`],
    { cwd: repoRoot },
  );
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
