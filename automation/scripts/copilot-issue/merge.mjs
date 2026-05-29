#!/usr/bin/env node

import {
  buildGitLabStateNote,
  buildManagedIssueLabels,
  closeIssue,
  ensureDir,
  fetchIssues,
  fetchLatestStructuredNote,
  getArtifactDir,
  getCurrentBranch,
  getManifestPath,
  getMergeNotePath,
  getRepoRoot,
  hasFlag,
  ISSUE_LABELS,
  parseCliOptions,
  postIssueNote,
  printUsage,
  readGitConfig,
  readJson,
  readOptionValue,
  relativeToRepo,
  resolveGitLabContext,
  resolveOperatorIdentity,
  runCommand,
  updateIssueLabels,
  writeJson,
  writeText,
} from './common.mjs';

const argv = process.argv.slice(2);
const options = parseCliOptions(argv, { allowManifest: true });

if (options.help) {
  printUsage('copilot:issue:merge', [
    '',
    'Merge finalize checks that the execution branch is reflected into the target branch,',
    'verifies the target branch remote push/publish state, records merge audit fields,',
    'and closes GitLab issues only after remote verification passes.',
    '',
    'Merge options:',
    '  --target <branch>       Merge target/reflected branch (default: development)',
    '  --target-branch <name>  Same as --target',
    '  --remote <name>         Remote to verify (default: origin)',
    '  --merged-by <name>      Explicit merge owner name',
  ]);
  process.exit(0);
}

const targetBranch = readOptionValue(argv, ['target', 'target-branch']) ?? 'development';
const remoteName = readOptionValue(argv, ['remote']) ?? 'origin';
const mergedByOverride = readOptionValue(argv, ['merged-by']);
const dryRun = hasFlag(argv, ['dry-run']);
const repoRoot = getRepoRoot();
const manifestPath = options.manifestPath ?? getManifestPath(repoRoot, options.issueKey);
const manifest = readJson(manifestPath);
const operator = dryRun
  ? resolveOperatorIdentity(repoRoot, { gitLabUser: null })
  : resolveOperatorIdentity(repoRoot, await resolveGitLabContext(repoRoot));
const mergeCommit = gitRevParse(repoRoot, 'HEAD');
const currentBranch = getCurrentBranch(repoRoot);
const publishMarkerKey = process.env.WORKSPACE_PUBLISH_MARKER_KEY ?? 'codex.gitlabLastPublished';
const publishedCommit = readGitConfig(repoRoot, publishMarkerKey) || null;
const mergedBy = resolveMergedBy({ manifest, operator, mergedByOverride });
const mergeCheck = verifyMergeState({
  repoRoot,
  manifest,
  targetBranch,
  remoteName,
  currentBranch,
  mergeCommit,
  publishMarkerKey,
  publishedCommit,
});
const pushStatus = mergeCheck.failures.length > 0 ? 'failed' : 'verified';
const reflectedBranches = pushStatus === 'verified'
  ? mergeReflectedBranches(manifest.reflectedBranches, targetBranch)
  : normalizeStringList(manifest.reflectedBranches);
const mergeAudit = {
  mergeTargetBranch: targetBranch,
  mergeCommit,
  mergedBy,
  executionBranch: manifest.branchName,
  currentBranch,
  remoteName,
  pushStatus,
  publishedRemoteRef: `${remoteName}/${targetBranch}`,
  publishedCommit: mergeCheck.remoteCommit,
  workspacePublishMarkerKey: publishMarkerKey,
  workspacePublishMarkerCommit: publishedCommit,
  branchIncluded: mergeCheck.branchIncluded,
  failureReasons: mergeCheck.failures,
};
const finalizedAt = new Date().toISOString();
const note = buildGitLabStateNote(
  {
    ...manifest,
    operator,
    reflectedBranches,
  },
  {
    phase: 'merge-finalize',
    stateLabel: pushStatus === 'verified' ? ISSUE_LABELS.verified : ISSUE_LABELS.blocked,
    verificationStatus: pushStatus === 'verified' ? 'passed' : 'failed',
    noteTimestamp: finalizedAt,
    reflectedBranches,
    terminalReason: pushStatus === 'verified' ? 'merged' : null,
    merge: mergeAudit,
  },
);
const mergeNotePath = getMergeNotePath(repoRoot, manifest.issueKey);

if (dryRun) {
  console.log('# copilot:issue:merge dry-run');
  console.log(`- issue key: ${manifest.issueKey}`);
  console.log(`- target branch: ${targetBranch}`);
  console.log(`- current branch: ${currentBranch}`);
  console.log(`- merge commit: ${mergeCommit}`);
  console.log(`- push status: ${pushStatus}`);
  if (mergeCheck.failures.length > 0) {
    for (const failure of mergeCheck.failures) {
      console.log(`- failure: ${failure}`);
    }
  }
  console.log('');
  console.log(note);
  process.exit(0);
}

ensureDir(getArtifactDir(repoRoot, manifest.issueKey));
const gitLabContext = await resolveGitLabContext(repoRoot);
const currentIssues = await fetchIssues(gitLabContext, manifest.issues.map((issue) => issue.iid));
const terminalFingerprint = buildMergeFingerprint(mergeAudit);

for (const issue of currentIssues) {
  const latest = await fetchLatestStructuredNote(gitLabContext, issue.iid);
  const alreadyNoted = latest?.payload
    ? buildMergeFingerprint(latest.payload.merge ?? {}) === terminalFingerprint
    : false;
  const nextLabels = buildManagedIssueLabels(Array.isArray(issue.labels) ? issue.labels : [], {
    stateLabel: pushStatus === 'verified' ? ISSUE_LABELS.verified : ISSUE_LABELS.blocked,
    mode: manifest.mode,
  });

  await updateIssueLabels(gitLabContext, issue.iid, nextLabels);
  if (!alreadyNoted) {
    await postIssueNote(gitLabContext, issue.iid, note);
  }
  if (pushStatus === 'verified' && issue.state === 'opened') {
    await closeIssue(gitLabContext, issue.iid);
  }
}

writeText(mergeNotePath, note);
writeJson(manifestPath, {
  ...manifest,
  operator,
  reflectedBranches,
  merge: mergeAudit,
  mergeNotePath: relativeToRepo(repoRoot, mergeNotePath),
  mergedAt: finalizedAt,
  registry: {
    ...(manifest.registry ?? {}),
    phase: 'merge-finalize',
    stateLabel: pushStatus === 'verified' ? ISSUE_LABELS.verified : ISSUE_LABELS.blocked,
    verificationStatus: pushStatus === 'verified' ? 'passed' : 'failed',
    noteTimestamp: finalizedAt,
    terminalReason: pushStatus === 'verified' ? 'merged' : null,
  },
});

if (pushStatus === 'verified') {
  console.log(`✓ finalized merge for ${manifest.issues.length} GitLab issue(s)`);
  console.log(`  target: ${targetBranch}`);
  console.log(`  commit: ${mergeCommit}`);
  console.log(`  note:   ${relativeToRepo(repoRoot, mergeNotePath)}`);
} else {
  console.log(`✗ merge finalize blocked for ${manifest.issues.length} GitLab issue(s)`);
  console.log(`  target: ${targetBranch}`);
  console.log(`  commit: ${mergeCommit}`);
  for (const failure of mergeCheck.failures) {
    console.log(`  failure: ${failure}`);
  }
  console.log(`  note:   ${relativeToRepo(repoRoot, mergeNotePath)}`);
  process.exit(1);
}

function verifyMergeState({
  repoRoot,
  manifest,
  targetBranch,
  remoteName,
  currentBranch,
  mergeCommit,
  publishMarkerKey,
  publishedCommit,
}) {
  const failures = [];
  if (currentBranch !== targetBranch) {
    failures.push(`current branch must be ${targetBranch}, got ${currentBranch || '(detached)'}`);
  }

  const worktreeStatus = runCommand('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    allowFailure: true,
  });
  if (worktreeStatus.status !== 0 || worktreeStatus.stdout.trim()) {
    failures.push('worktree must be clean before merge finalize closes issues');
  }

  let branchIncluded = false;
  if (manifest.branchName) {
    const branchCheck = runCommand('git', ['merge-base', '--is-ancestor', manifest.branchName, 'HEAD'], {
      cwd: repoRoot,
      allowFailure: true,
    });
    branchIncluded = branchCheck.status === 0;
    if (!branchIncluded) {
      failures.push(`execution branch ${manifest.branchName} is not an ancestor of HEAD`);
    }
  } else {
    failures.push('manifest is missing execution branch');
  }

  const fetchResult = runCommand('git', ['fetch', remoteName, `refs/heads/${targetBranch}:refs/remotes/${remoteName}/${targetBranch}`], {
    cwd: repoRoot,
    allowFailure: true,
  });
  if (fetchResult.status !== 0) {
    failures.push(`failed to fetch ${remoteName}/${targetBranch}: ${fetchResult.stderr.trim() || fetchResult.stdout.trim() || 'no output'}`);
  }

  const remoteCommitResult = runCommand('git', ['rev-parse', `${remoteName}/${targetBranch}`], {
    cwd: repoRoot,
    allowFailure: true,
  });
  const remoteCommit = remoteCommitResult.status === 0 ? remoteCommitResult.stdout.trim() : null;
  if (!remoteCommit) {
    failures.push(`unable to resolve ${remoteName}/${targetBranch}`);
  } else if (remoteCommit !== mergeCommit) {
    failures.push(`${remoteName}/${targetBranch} (${remoteCommit}) does not match local HEAD (${mergeCommit})`);
  }

  if (targetBranch === 'development' && publishedCommit !== mergeCommit) {
    failures.push(`${publishMarkerKey} (${publishedCommit ?? 'missing'}) does not match local HEAD (${mergeCommit})`);
  }

  return {
    branchIncluded,
    remoteCommit,
    failures,
  };
}

function resolveMergedBy({ manifest, operator, mergedByOverride }) {
  if (mergedByOverride) {
    return mergedByOverride;
  }
  const firstAssignee = manifest.issues
    .flatMap((issue) => Array.isArray(issue.assignees) ? issue.assignees : [])
    .find((assignee) => assignee?.displayName);
  return firstAssignee?.displayName
    ?? operator.gitLabUser
    ?? operator.displayName
    ?? operator.gitUserName
    ?? 'unknown-merge-owner';
}

function gitRevParse(repoRoot, ref) {
  const result = runCommand('git', ['rev-parse', ref], { cwd: repoRoot });
  return result.stdout.trim();
}

function mergeReflectedBranches(existingBranches, targetBranch) {
  return normalizeStringList([...(Array.isArray(existingBranches) ? existingBranches : []), targetBranch]);
}

function normalizeStringList(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0),
  )];
}

function buildMergeFingerprint(mergeAudit) {
  return [
    mergeAudit.mergeTargetBranch ?? '',
    mergeAudit.mergeCommit ?? '',
    mergeAudit.pushStatus ?? '',
    mergeAudit.publishedRemoteRef ?? '',
    mergeAudit.publishedCommit ?? '',
    JSON.stringify(mergeAudit.failureReasons ?? []),
  ].join('|');
}
