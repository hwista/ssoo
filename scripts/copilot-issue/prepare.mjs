#!/usr/bin/env node

import {
  buildExecutionBranchName,
  buildGitLabStateNote,
  buildManagedIssueLabels,
  buildNormalizedSpec,
  checkoutExecutionBranch,
  ensureCleanWorktree,
  ensureDir,
  fetchLatestStructuredNote,
  fetchIssues,
  getArtifactDir,
  getIssueNotePath,
  getManifestPath,
  getNormalizedSpecPath,
  getPrepareNotePath,
  getRepoRoot,
  getVerificationReportMarkdownPath,
  getVerificationReportPath,
  hasFlag,
  ISSUE_LABELS,
  parseCliOptions,
  postIssueNote,
  printUsage,
  relativeToRepo,
  resolveBaseBranch,
  resolveGitLabContext,
  resolveOperatorIdentity,
  updateIssueLabels,
  validateIssue,
  writeJson,
  writeText,
} from './common.mjs';

const argv = process.argv.slice(2);
const options = parseCliOptions(argv);
const allowTakeover = hasFlag(argv, ['takeover', 'supersede']);
const takeoverMode = hasFlag(argv, ['supersede']) ? 'supersede' : allowTakeover ? 'takeover' : null;

if (options.help) {
  printUsage('copilot:issue:prepare', [
    '',
    'Prepare mode checks the GitLab issue contract, creates/checks out the execution branch,',
    'and writes the normalized spec plus manifest under .runtime/copilot-issue/<issue-key>/',
    '',
    'Ownership options:',
    '  --takeover          Explicitly reclaim an in-progress issue after writing superseded lineage',
    '  --supersede         Same as --takeover, but records the handoff as a supersede action',
  ]);
  process.exit(0);
}

const repoRoot = getRepoRoot();
const gitLabContext = await resolveGitLabContext(repoRoot);
const operator = resolveOperatorIdentity(repoRoot, gitLabContext);
const baseBranch = resolveBaseBranch(repoRoot, { override: options.baseBranch });

const rawIssues = await fetchIssues(gitLabContext, options.issueIids);
const preparedIssues = rawIssues.map((issue) => {
  const result = validateIssue(issue);
  if (result.errors.length > 0) {
    throw new Error(result.errors.join('\n'));
  }
  return result.issue;
});

const issueKey = options.issueKey;
const artifactDir = getArtifactDir(repoRoot, issueKey);
const branchName = buildExecutionBranchName(preparedIssues);
const latestStructuredNotes = new Map(
  await Promise.all(
    preparedIssues.map(async (issue) => [
      issue.iid,
      await fetchLatestStructuredNote(gitLabContext, issue.iid),
    ]),
  ),
);
const ownershipConflicts = preparedIssues
  .map((issue) => resolveOwnershipConflict(issue, latestStructuredNotes.get(issue.iid)?.payload ?? null, branchName))
  .filter((conflict) => conflict !== null);
if (ownershipConflicts.length > 0 && !allowTakeover) {
  throw new Error([
    'active issue ownership conflict detected. 다른 operator/branch가 이미 claim한 issue는 자동으로 침범하지 않습니다.',
    ...ownershipConflicts.map((conflict) => [
      `- !${conflict.issue.iid}: activeBranch=\`${conflict.activeBranch ?? 'unknown'}\`, plannedBranch=\`${branchName}\`, activeOperator=\`${conflict.activeOperator}\``,
      '  필요하면 `--takeover` 또는 `--supersede`를 명시하고, superseded lineage note를 남기세요.',
    ].join('\n')),
  ].join('\n'));
}
const supersededBranches = ownershipConflicts
  .map((conflict) => conflict.activeBranch)
  .filter((branch) => branch && branch !== branchName);
const manifestPath = getManifestPath(repoRoot, issueKey);
const normalizedSpecPath = getNormalizedSpecPath(repoRoot, issueKey);
const prepareNotePath = getPrepareNotePath(repoRoot, issueKey);
const issueNotePath = getIssueNotePath(repoRoot, issueKey);
const verificationReportPath = getVerificationReportPath(repoRoot, issueKey);
const verificationReportMarkdownPath = getVerificationReportMarkdownPath(repoRoot, issueKey);
const preparedAt = new Date().toISOString();

const manifestBase = {
  schemaVersion: 2,
  issuePlatform: 'gitlab',
  issueKey,
  mode: options.mode,
  topology: options.mode === 'batch' ? 'batch' : 'single',
  executionLabel: ISSUE_LABELS.ready,
  labels: ISSUE_LABELS,
  operator,
  baseBranch: baseBranch.branchName,
  baseRef: baseBranch.ref,
  baseSource: baseBranch.source,
  branchName,
  reflectedBranches: [],
  artifactDir: relativeToRepo(repoRoot, artifactDir),
  normalizedSpecPath: relativeToRepo(repoRoot, normalizedSpecPath),
  manifestPath: relativeToRepo(repoRoot, manifestPath),
  prepareNotePath: relativeToRepo(repoRoot, prepareNotePath),
  issueNotePath: relativeToRepo(repoRoot, issueNotePath),
  verificationReportPath: relativeToRepo(repoRoot, verificationReportPath),
  verificationReportMarkdownPath: relativeToRepo(repoRoot, verificationReportMarkdownPath),
  preparedAt,
  registry: {
    phase: 'prepare',
    stateLabel: ISSUE_LABELS.inProgress,
    verificationStatus: 'not-run',
    supersededBranch: supersededBranches[0] ?? null,
    supersededBranches,
    takeoverMode,
    noteTimestamp: preparedAt,
  },
  ownership: {
    takeoverMode,
    conflicts: ownershipConflicts.map((conflict) => ({
      issueIid: conflict.issue.iid,
      activeBranch: conflict.activeBranch,
      activeOperator: conflict.activeOperator,
      activePhase: conflict.activePhase,
    })),
  },
  issues: preparedIssues,
};

const normalizedSpec = buildNormalizedSpec(manifestBase);
const prepareNote = buildGitLabStateNote(manifestBase, {
  phase: 'prepare',
  stateLabel: ISSUE_LABELS.inProgress,
  verificationStatus: 'not-run',
  noteTimestamp: preparedAt,
});

if (options.dryRun) {
  console.log('# copilot:issue:prepare dry-run');
  console.log(`- issue key: ${manifestBase.issueKey}`);
  console.log(`- mode: ${manifestBase.mode}`);
  console.log(`- topology: ${manifestBase.topology}`);
  console.log(`- base branch: ${manifestBase.baseBranch}`);
  console.log(`- base ref: ${manifestBase.baseRef}`);
  console.log(`- execution branch: ${manifestBase.branchName}`);
  console.log(`- reflected branches: ${manifestBase.reflectedBranches.length > 0 ? manifestBase.reflectedBranches.join(', ') : '(none yet)'}`);
  console.log(`- target state label: ${ISSUE_LABELS.inProgress}`);
  console.log(`- takeover mode: ${takeoverMode ?? 'none'}`);
  if (ownershipConflicts.length > 0) {
    console.log(`- superseded branches: ${supersededBranches.join(', ')}`);
  }
  console.log(`- artifact dir: ${manifestBase.artifactDir}`);
  console.log('');
  console.log(normalizedSpec);
  console.log('');
  console.log('--- prepare note ---');
  console.log(prepareNote);
  process.exit(0);
}

ensureCleanWorktree(repoRoot);
ensureDir(artifactDir);
const checkoutMode = checkoutExecutionBranch(repoRoot, branchName, baseBranch.ref);

const manifest = {
  ...manifestBase,
  checkoutMode,
};
const prepareRegistryNote = buildGitLabStateNote(manifest, {
  phase: 'prepare',
  stateLabel: ISSUE_LABELS.inProgress,
  verificationStatus: 'not-run',
  noteTimestamp: preparedAt,
  checkoutMode,
  supersededBranch: supersededBranches[0] ?? null,
});

writeJson(manifestPath, manifest);
writeText(normalizedSpecPath, normalizedSpec);
writeText(prepareNotePath, prepareRegistryNote);

for (const issue of preparedIssues) {
  const nextLabels = buildManagedIssueLabels(issue.labels, {
    stateLabel: ISSUE_LABELS.inProgress,
    mode: manifest.mode,
  });
  await updateIssueLabels(gitLabContext, issue.iid, nextLabels);
  await postIssueNote(gitLabContext, issue.iid, prepareRegistryNote);
}

console.log(`✓ prepared ${manifest.mode} issue flow`);
console.log(`  base branch:      ${manifest.baseBranch} (${manifest.baseSource})`);
console.log(`  base ref:         ${manifest.baseRef}`);
console.log(`  execution branch: ${branchName} (${checkoutMode})`);
console.log(`  manifest:         ${relativeToRepo(repoRoot, manifestPath)}`);
console.log(`  normalized spec:  ${relativeToRepo(repoRoot, normalizedSpecPath)}`);
console.log(`  prepare note:     ${relativeToRepo(repoRoot, prepareNotePath)}`);

function resolveOwnershipConflict(issue, latestPayload, plannedBranch) {
  const activeByLabel = issue.executionState === 'in-progress';
  const activeByPayload = latestPayload?.stateLabel === ISSUE_LABELS.inProgress;
  if (!activeByLabel && !activeByPayload) {
    return null;
  }

  const activeBranch = latestPayload?.executionBranch ?? null;
  if (activeBranch === plannedBranch) {
    return null;
  }

  return {
    issue,
    activeBranch,
    activeOperator: latestPayload?.operator?.displayName ?? 'unknown-operator',
    activePhase: latestPayload?.phase ?? 'unknown',
  };
}
