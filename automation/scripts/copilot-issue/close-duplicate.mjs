#!/usr/bin/env node

import {
  buildDuplicateCloseNote,
  buildManagedIssueLabels,
  closeIssue,
  ensureDir,
  fetchIssue,
  getArtifactDir,
  getDuplicateNotePath,
  getRepoRoot,
  hasFlag,
  ISSUE_LABELS,
  postIssueNote,
  readOptionValue,
  relativeToRepo,
  resolveGitLabContext,
  resolveOperatorIdentity,
  updateIssueLabels,
  writeText,
} from './common.mjs';

const argv = process.argv.slice(2);
const help = hasFlag(argv, ['help']);

if (help) {
  console.log([
    'Usage: pnpm run copilot:issue:close-duplicate -- --issue <iid> --canonical <iid> --reason <text> [--dry-run]',
    '',
    'This is the explicit user-handled close path for duplicates.',
    'It must only be run after a user or operator explicitly decides the issue should be closed as duplicate.',
    '',
    'Options:',
    '  --issue <iid>       GitLab issue IID to close',
    '  --canonical <iid>   Canonical issue IID that remains open/active',
    '  --reason <text>     Short reason recorded in the close note',
    '  --dry-run           Print resolved actions without mutating GitLab',
  ].join('\n'));
  process.exit(0);
}

const issueIid = parseIssueIid(readOptionValue(argv, ['issue']));
const canonicalIid = parseIssueIid(readOptionValue(argv, ['canonical']));
const reason = readOptionValue(argv, ['reason']) ?? '';
const dryRun = hasFlag(argv, ['dry-run']);

if (canonicalIid === issueIid) {
  throw new Error('duplicate canonical issue must be different from the issue being closed.');
}

if (!reason.trim()) {
  throw new Error('`--reason <text>` is required for duplicate close audit.');
}

const repoRoot = getRepoRoot();
const gitLabContext = await resolveGitLabContext(repoRoot);
const operator = resolveOperatorIdentity(repoRoot, gitLabContext);
const issue = await fetchIssue(gitLabContext, issueIid);
const canonicalIssue = await fetchIssue(gitLabContext, canonicalIid);

if (issue.state !== 'opened') {
  throw new Error(`GitLab issue !${issueIid} must be opened before duplicate close. Current state: ${issue.state}`);
}

const issueKey = `issue-${issueIid}`;
const artifactDir = getArtifactDir(repoRoot, issueKey);
const duplicateNotePath = getDuplicateNotePath(repoRoot, issueKey);
const note = buildDuplicateCloseNote({
  issue,
  canonicalIssue,
  reason,
  operator,
  noteTimestamp: new Date().toISOString(),
});

if (dryRun) {
  console.log('# copilot:issue:close-duplicate dry-run');
  console.log(`- issue: !${issueIid}`);
  console.log(`- canonical: !${canonicalIid}`);
  console.log('- action: post duplicate close note, then close issue');
  console.log('');
  console.log(note);
  process.exit(0);
}

ensureDir(artifactDir);
const nextLabels = buildManagedIssueLabels(Array.isArray(issue.labels) ? issue.labels : [], {
  stateLabel: ISSUE_LABELS.blocked,
  mode: 'single',
});
await updateIssueLabels(gitLabContext, issueIid, nextLabels);
await postIssueNote(gitLabContext, issueIid, note);
await closeIssue(gitLabContext, issueIid);
writeText(duplicateNotePath, note);

console.log(`✓ closed GitLab issue !${issueIid} as explicit duplicate of !${canonicalIid}`);
console.log(`  note: ${relativeToRepo(repoRoot, duplicateNotePath)}`);

function parseIssueIid(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid issue iid: ${value}`);
  }
  return parsed;
}
