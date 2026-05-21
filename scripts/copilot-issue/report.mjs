#!/usr/bin/env node

import {
  buildGitLabIssueNote,
  getIssueNotePath,
  getManifestPath,
  getRepoRoot,
  getVerificationReportPath,
  parseCliOptions,
  postIssueNote,
  printUsage,
  readJson,
  relativeToRepo,
  resolveGitLabContext,
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
const issueNote = buildGitLabIssueNote(manifest, report);
const issueNotePath = getIssueNotePath(repoRoot, manifest.issueKey);

if (options.dryRun) {
  console.log('# copilot:issue:report dry-run');
  console.log(issueNote);
  process.exit(0);
}

const gitLabContext = await resolveGitLabContext(repoRoot);
for (const issue of manifest.issues) {
  await postIssueNote(gitLabContext, issue.iid, issueNote);
}

writeText(issueNotePath, issueNote);

console.log(`✓ reported to ${manifest.issues.length} GitLab issue(s)`);
console.log(`  issue note: ${relativeToRepo(repoRoot, issueNotePath)}`);
