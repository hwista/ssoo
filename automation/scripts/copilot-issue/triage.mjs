#!/usr/bin/env node

import {
  buildDuplicateTriageNote,
  buildManagedIssueLabels,
  ensureDir,
  fetchDuplicateCandidateIssues,
  fetchIssue,
  getArtifactDir,
  getDuplicateNotePath,
  getDuplicateTriageArtifactPath,
  getRepoRoot,
  hasFlag,
  ISSUE_LABELS,
  postIssueNote,
  readOptionValue,
  relativeToRepo,
  resolveGitLabContext,
  resolveOperatorIdentity,
  updateIssueLabels,
  writeJson,
  writeText,
} from './common.mjs';

const argv = process.argv.slice(2);
const help = hasFlag(argv, ['help']);

if (help) {
  console.log([
    'Usage: pnpm run copilot:issue:triage -- --issue <iid> [--candidate <iid,csv>] [--dry-run]',
    '   or: pnpm run copilot:issue:triage -- --issue <iid> --comment-duplicate --canonical <iid> --reason <text> [--dry-run]',
    '',
    'Duplicate triage is comment-first only. This command never closes an issue.',
    '',
    'Options:',
    '  --issue <iid>          GitLab issue IID to triage',
    '  --candidate <csv>      Additional candidate issue IIDs to include',
    '  --candidates <csv>     Same as --candidate',
    '  --comment-duplicate    Apply an AI/operator duplicate judgment as a GitLab comment',
    '  --canonical <iid>      Canonical issue IID when commenting a suspected duplicate',
    '  --reason <text>        Short duplicate judgment reason for the comment',
    '  --dry-run              Print resolved actions without mutating GitLab',
  ].join('\n'));
  process.exit(0);
}

const issueIid = parseIssueIid(readOptionValue(argv, ['issue']));
const candidateIids = parseIssueCsv(readOptionValue(argv, ['candidate', 'candidates']));
const shouldCommentDuplicate = hasFlag(argv, ['comment-duplicate']);
const canonicalIidValue = readOptionValue(argv, ['canonical']);
const reason = readOptionValue(argv, ['reason']) ?? '';
const canonicalIid = canonicalIidValue ? parseIssueIid(canonicalIidValue) : null;
const dryRun = hasFlag(argv, ['dry-run']);

if (shouldCommentDuplicate && !canonicalIid) {
  throw new Error('`--comment-duplicate` requires `--canonical <iid>`.');
}

if (shouldCommentDuplicate && !reason.trim()) {
  throw new Error('`--comment-duplicate` requires `--reason <text>`.');
}

if (canonicalIid && canonicalIid === issueIid) {
  throw new Error('duplicate canonical issue must be different from the triaged issue.');
}

const repoRoot = getRepoRoot();
const gitLabContext = await resolveGitLabContext(repoRoot);
const operator = resolveOperatorIdentity(repoRoot, gitLabContext);
const issue = await fetchIssue(gitLabContext, issueIid);
const candidateSet = new Set(candidateIids);
if (canonicalIid) {
  candidateSet.add(canonicalIid);
}
const candidates = await fetchDuplicateCandidateIssues(gitLabContext, issue, {
  candidateIids: [...candidateSet],
});
const canonicalIssue = canonicalIid
  ? candidates.find((candidate) => Number(candidate.iid) === canonicalIid) ?? await fetchIssue(gitLabContext, canonicalIid)
  : null;
const issueKey = `issue-${issueIid}`;
const artifactDir = getArtifactDir(repoRoot, issueKey);
const artifactPath = getDuplicateTriageArtifactPath(repoRoot, issueKey);
const duplicateNotePath = getDuplicateNotePath(repoRoot, issueKey);
const triagedAt = new Date().toISOString();
const artifact = {
  schemaVersion: 1,
  policy: 'comment-first-user-handled-close',
  issueIid,
  operator,
  generatedAt: triagedAt,
  candidates,
  decision: shouldCommentDuplicate
    ? {
      suspectedDuplicate: true,
      canonicalIssueIid: canonicalIid,
      reason,
      action: 'comment-only-blocked-no-close',
    }
    : {
      suspectedDuplicate: null,
      action: 'candidate-artifact-only',
    },
};
const duplicateNote = shouldCommentDuplicate
  ? buildDuplicateTriageNote({
    issue,
    canonicalIssue,
    reason,
    operator,
    candidates,
    noteTimestamp: triagedAt,
  })
  : null;

if (dryRun) {
  console.log('# copilot:issue:triage dry-run');
  console.log(`- issue: !${issueIid}`);
  console.log(`- candidates: ${candidates.length}`);
  console.log(`- comment duplicate: ${shouldCommentDuplicate ? 'yes' : 'no'}`);
  if (canonicalIid) {
    console.log(`- canonical: !${canonicalIid}`);
  }
  console.log('');
  console.log(JSON.stringify(artifact, null, 2));
  if (duplicateNote) {
    console.log('');
    console.log('--- duplicate triage note ---');
    console.log(duplicateNote);
  }
  process.exit(0);
}

ensureDir(artifactDir);
writeJson(artifactPath, artifact);

if (duplicateNote) {
  const nextLabels = buildManagedIssueLabels(Array.isArray(issue.labels) ? issue.labels : [], {
    stateLabel: ISSUE_LABELS.blocked,
    mode: 'single',
  });
  await updateIssueLabels(gitLabContext, issueIid, nextLabels);
  await postIssueNote(gitLabContext, issueIid, duplicateNote);
  writeText(duplicateNotePath, duplicateNote);
}

console.log(`✓ triaged GitLab issue !${issueIid}`);
console.log(`  candidates: ${candidates.length}`);
console.log(`  artifact:   ${relativeToRepo(repoRoot, artifactPath)}`);
if (duplicateNote) {
  console.log('  result:     duplicate suspected comment posted; issue left open/blocked');
  console.log(`  note:       ${relativeToRepo(repoRoot, duplicateNotePath)}`);
}

function parseIssueIid(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid issue iid: ${value}`);
  }
  return parsed;
}

function parseIssueCsv(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => parseIssueIid(entry.trim()));
}
