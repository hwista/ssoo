#!/usr/bin/env node

import {
  buildExecutionBranchName,
  buildNormalizedSpec,
  checkoutExecutionBranch,
  ensureCleanWorktree,
  ensureDir,
  fetchIssues,
  getArtifactDir,
  getCurrentBranch,
  getManifestPath,
  getNormalizedSpecPath,
  getRepoRoot,
  parseCliOptions,
  printUsage,
  relativeToRepo,
  resolveGitLabContext,
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
const baseBranch = options.baseBranch ?? getCurrentBranch(repoRoot);

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

const manifest = {
  schemaVersion: 1,
  issuePlatform: 'gitlab',
  issueKey,
  mode: options.mode,
  executionLabel: 'ai-exec-ready',
  baseBranch,
  branchName,
  artifactDir: relativeToRepo(repoRoot, artifactDir),
  normalizedSpecPath: relativeToRepo(repoRoot, normalizedSpecPath),
  manifestPath: relativeToRepo(repoRoot, manifestPath),
  preparedAt: new Date().toISOString(),
  issues: preparedIssues,
};

const normalizedSpec = buildNormalizedSpec(manifest);

if (options.dryRun) {
  console.log('# copilot:issue:prepare dry-run');
  console.log(`- issue key: ${manifest.issueKey}`);
  console.log(`- mode: ${manifest.mode}`);
  console.log(`- base branch: ${manifest.baseBranch}`);
  console.log(`- execution branch: ${manifest.branchName}`);
  console.log(`- artifact dir: ${manifest.artifactDir}`);
  console.log('');
  console.log(normalizedSpec);
  process.exit(0);
}

ensureCleanWorktree(repoRoot);
ensureDir(artifactDir);
const checkoutMode = checkoutExecutionBranch(repoRoot, branchName, baseBranch);

writeJson(manifestPath, manifest);
writeText(normalizedSpecPath, normalizedSpec);

console.log(`✓ prepared ${manifest.mode} issue flow`);
console.log(`  base branch:      ${baseBranch}`);
console.log(`  execution branch: ${branchName} (${checkoutMode})`);
console.log(`  manifest:         ${relativeToRepo(repoRoot, manifestPath)}`);
console.log(`  normalized spec:  ${relativeToRepo(repoRoot, normalizedSpecPath)}`);
