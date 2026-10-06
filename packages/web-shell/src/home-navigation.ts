/** Platform home identity; domain pages and permission decisions remain app-owned. */
export interface SsooHomeEntry {
  id: string;
  title: '홈';
  pageTitle: string;
  path: string;
  closable: false;
}

export function defineSsooHomeEntry(entry: Pick<SsooHomeEntry, 'path' | 'pageTitle'> & { id?: string }): SsooHomeEntry {
  return { id: entry.id ?? 'home', title: '홈', pageTitle: entry.pageTitle, path: entry.path, closable: false };
}

export function isSsooHomeEntry(entry: { id?: string; path?: string }, home: SsooHomeEntry): boolean {
  return entry.id === home.id || entry.path?.split(/[?#]/, 1)[0] === home.path;
}

export function isSsooSidebarDestination(path: string | undefined, home: SsooHomeEntry): boolean {
  return !path || !isSsooHomeEntry({ path }, home);
}

/** Merge only home aliases. Preserve domain tabs, identities and editor metadata. */
export function normalizeSsooHomeTabs<T extends { id: string; path?: string; title: string; closable: boolean }>(
  tabs: readonly T[], activeTabId: string | null, home: SsooHomeEntry, createHome: () => T,
): { tabs: T[]; activeTabId: string } {
  const homeTabs = tabs.filter((tab) => isSsooHomeEntry(tab, home));
  const homeTab = { ...(homeTabs[0] ?? createHome()), id: home.id, title: home.title, path: home.path, closable: false };
  const nextTabs = [homeTab, ...tabs.filter((tab) => !isSsooHomeEntry(tab, home))];
  const nextActive = homeTabs.some((tab) => tab.id === activeTabId) ? home.id : activeTabId;
  return { tabs: nextTabs, activeTabId: nextTabs.some((tab) => tab.id === nextActive) ? nextActive! : home.id };
}
