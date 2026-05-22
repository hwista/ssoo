#!/usr/bin/env node

import {
  buildExecutionBranchName,
  buildGitLabStateNote,
  buildManagedIssueLabels,
  buildNormalizedSpec,
  checkoutExecutionBranch,
  ensureCleanWorktree,
  ensureDir,
  fetchIssues,
  getArtifactDir,
  getIssueNotePath,
  getManifestPath,
  getNormalizedSpecPath,
  getPrepareNotePath,
  getRepoRoot,
  getVerificationReportMarkdownPath,
  getVerificationReportPath,
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

const options = parseCliOptions(process.argv.slice(2));

if (options.help) {
  printUsage('copilot:issue:prepare', [
    '',
    'Prepare mode checks the GitLab issue contract, creates/checks out the execution branch,',
    'and writes the normalized spec plus manifest under .runtime/copilot-issue/<issue-key>/',
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
    supersededBranch: null,
    noteTimestamp: preparedAt,
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
  console.log(`- target state label: ${ISSUE_LABELS.inProgress}`);
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
