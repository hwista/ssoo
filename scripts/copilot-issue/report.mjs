#!/usr/bin/env node

import {
  buildGitLabStateNote,
  buildManagedIssueLabels,
  fetchIssues,
  getIssueNotePath,
  getManifestPath,
  getRepoRoot,
  getVerificationReportPath,
  ISSUE_LABELS,
  parseCliOptions,
  postIssueNote,
  printUsage,
  readJson,
  relativeToRepo,
  resolveGitLabContext,
  updateIssueLabels,
  writeJson,
  writeText,
} from './common.mjs';

const options = parseCliOptions(process.argv.slice(2), { allowManifest: true });

if (options.help) {
  printUsage('copilot:issue:report', [
    '',
    'Report mode posts the local verification summary back to each GitLab issue as a note,',
    'and stores the exact note body under .runtime/copilot-issue/<issue-key>/issue-note.md',
  ]);
  process.exit(0);
}

const repoRoot = getRepoRoot();
const manifestPath = options.manifestPath ?? getManifestPath(repoRoot, options.issueKey);
const manifest = readJson(manifestPath);
const reportPath = getVerificationReportPath(repoRoot, manifest.issueKey);
const report = readJson(reportPath);
const issueNotePath = getIssueNotePath(repoRoot, manifest.issueKey);
const nextStateLabel = report.status === 'passed'
  ? ISSUE_LABELS.verified
  : ISSUE_LABELS.blocked;
const issueNote = buildGitLabStateNote(manifest, {
  phase: 'report',
  stateLabel: nextStateLabel,
  verificationStatus: report.status,
  noteTimestamp: report.verifiedAt,
  report,
});

if (options.dryRun) {
  console.log('# copilot:issue:report dry-run');
  console.log(`- target state label: ${nextStateLabel}`);
  console.log(issueNote);
  process.exit(0);
}

const gitLabContext = await resolveGitLabContext(repoRoot);
const currentIssues = await fetchIssues(gitLabContext, manifest.issues.map((issue) => issue.iid));
for (const issue of currentIssues) {
  const nextLabels = buildManagedIssueLabels(Array.isArray(issue.labels) ? issue.labels : [], {
    stateLabel: nextStateLabel,
    mode: manifest.mode,
  });
  await updateIssueLabels(gitLabContext, issue.iid, nextLabels);
  await postIssueNote(gitLabContext, issue.iid, issueNote);
}

writeText(issueNotePath, issueNote);
writeJson(manifestPath, {
  ...manifest,
  issueNotePath: relativeToRepo(repoRoot, issueNotePath),
  reportedAt: report.verifiedAt,
  registry: {
    ...(manifest.registry ?? {}),
    phase: 'report',
    stateLabel: nextStateLabel,
    verificationStatus: report.status,
    noteTimestamp: report.verifiedAt,
  },
});

console.log(`✓ reported to ${manifest.issues.length} GitLab issue(s)`);
console.log(`  state label: ${nextStateLabel}`);
console.log(`  issue note: ${relativeToRepo(repoRoot, issueNotePath)}`);
