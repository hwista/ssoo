import fs from 'node:fs';

export const policy = JSON.parse(fs.readFileSync(new URL('./policy.json', import.meta.url), 'utf8'));
for (const key of ['previousSuccessfulReleases', 'pendingReleaseDays', 'orphanImageHours', 'cacheUnusedHours', 'minimumFreeGiB', 'deploymentMinimumFreeGiB', 'windowsMinimumFreeGiB', 'reportRetentionDays']) {
  if (!Number.isSafeInteger(policy[key]) || policy[key] < 1) throw new Error(`Invalid storage policy: ${key}`);
}
if (!/^[1-9][0-9]*(GB|MB|GiB|MiB)$/.test(policy.cacheKeepStorage)) throw new Error('Invalid cache retention size');

// Records remain as audit evidence. Retirement releases their image protection only.
export function releaseRetention(records, currentId, now = Date.now()) {
  const committed = records.filter((r) => r.status === 'committed' && r.id !== currentId);
  for (const r of records) {
    if (r.checkedAt && (!Number.isFinite(Date.parse(r.checkedAt)) || Date.parse(r.checkedAt) > now + 30_000)) {
      throw new Error(`Invalid release timestamp: ${r.id}`);
    }
  }
  committed.sort((a, b) => Date.parse(b.checkedAt || 0) - Date.parse(a.checkedAt || 0));
  const recent = new Set(committed.slice(0, policy.previousSuccessfulReleases).map((r) => r.id));
  const protectedIds = [], retiredIds = [];
  for (const r of records) {
    const age = r.checkedAt ? now - Date.parse(r.checkedAt) : 0;
    const expiredPending = !r.attempted && ['prepared', 'built', 'rehearsed'].includes(r.status)
      && age > policy.pendingReleaseDays * 86400_000;
    const expiredRollback = r.status === 'rolled-back' && age > policy.pendingReleaseDays * 86400_000;
    const retired = r.retired || (r.status === 'committed' && Boolean(r.checkedAt) && !recent.has(r.id)) || expiredPending || expiredRollback;
    // Unknown/interrupted/recovery-required states never expire automatically.
    (r.id === currentId || r.pinned || !retired ? protectedIds : retiredIds).push(r.id);
  }
  return { protectedIds, retiredIds };
}
