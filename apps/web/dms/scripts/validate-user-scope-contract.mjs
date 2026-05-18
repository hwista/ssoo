import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function read(relPath) {
  const absPath = path.join(projectRoot, relPath);
  return fs.readFileSync(absPath, 'utf8');
}

const checks = [
  {
    file: 'src/lib/user-scope.ts',
    patterns: [
      'export function isUserScopeTransition',
      'export function shouldResetPersistedUserState',
      'export function getCurrentUserScopeId',
      'function getCurrentAccessToken',
      'AUTH_TOKEN_BOUNDARY_PREV',
      'function emitUserChangeListener',
      'if (lastUserId !== null)',
      'emitUserChangeListener(listener, lastUserId, null);',
      'const didTokenChange = nextAccessToken !== lastAccessToken;',
      'emitUserChangeListener(fn, null, prev)',
      'listeners.forEach((fn) => emitUserChangeListener(fn, next, prev));',
    ],
    description: 'user-scope exposes shared transition helpers and replays current scope',
  },
  {
    file: 'src/app/providers.tsx',
    patterns: [
      'function QueryCacheUserScopeSync',
      'useAuthStore.subscribe',
      'lastAccessToken',
      'nextAccessToken',
      'queryClient.clear();',
      '<QueryCacheUserScopeSync queryClient={queryClient} />',
    ],
    description: 'query cache is cleared on auth user changes',
  },
  {
    file: 'src/stores/file.store.ts',
    patterns: [
      'filesOwnerUserId',
      'beginFileTreeRequest',
      'invalidateFileTreeRequests',
      'isCurrentFileTreeRequest',
      'getCurrentUserScopeId',
      'filesOwnerUserId: requestScope.userId',
    ],
    description: 'file tree responses are scoped to the current logged-in user',
  },
  {
    file: 'src/app/(main)/layout.tsx',
    patterns: [
      'const currentUserId = useAuthStore',
      '!currentUserId',
      'currentUserId, isAuthenticated, refreshFileTree',
    ],
    description: 'main layout refreshes file tree only after current user is known',
  },
  {
    file: 'src/components/layout/sidebar/FileTree.tsx',
    patterns: [
      'const currentUserId = useAuthStore',
      'filesOwnerUserId === currentUserId',
      'const sourceFiles = isCurrentFileTree ? files : [];',
    ],
    description: 'sidebar file tree renders only current-user files',
  },
  ...[
    'src/stores/tab.store.ts',
    'src/stores/file.store.ts',
    'src/stores/ai-search.store.ts',
    'src/stores/assistant-session.store.ts',
  ].map((file) => ({
    file,
    patterns: [
      'shouldResetPersistedUserState',
      'ownerUserId',
      'registerUserScopedReset',
    ],
    description: `${file} handles persisted user-scoped ownership`,
  })),
  ...[
    'src/stores/access.store.ts',
    'src/stores/assistant-context.store.ts',
    'src/stores/assistant-panel.store.ts',
    'src/stores/confirm.store.ts',
    'src/stores/editor-core.store.ts',
    'src/stores/git.store.ts',
    'src/stores/new-doc.store.ts',
    'src/stores/settings-shell.store.ts',
    'src/stores/settings.store.ts',
    'src/stores/sidebar.store.ts',
    'src/features/access/dialog-store.ts',
  ].map((file) => ({
    file,
    patterns: [
      'isUserScopeTransition',
      'registerUserScopedReset',
    ],
    description: `${file} resets on auth scope transitions`,
  })),
  {
    file: 'src/stores/sidebar.store.ts',
    patterns: [
      'USER_SCOPE_RESET_EXPANDED_SECTIONS',
      "const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['bookmarks'];",
      'const FILE_TREE_SECTION',
      'function toNonFileTreeSections',
      'function resolveUserScopeId',
      'getCurrentUserScopeId',
      'const initialFileTreeOwnerUserId = resolveUserScopeId(ownerUserId);',
      'isFileTreeOpen: initialFileTreeOwnerUserId !== null',
      'fileTreeOwnerUserId: initialFileTreeOwnerUserId',
      'fileTreeResetEpoch: state.fileTreeResetEpoch + 1',
      'state.isFileTreeOpen',
      'searchOwnerUserId: initialFileTreeOwnerUserId',
      'expandedSections: USER_SCOPE_RESET_EXPANDED_SECTIONS',
      'expandedFolders: new Set()',
      "searchQuery: ''",
    ],
    forbiddenPatterns: [
      "const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['bookmarks', 'fileTree'];",
      'userScopeResetVersion',
    ],
    description: 'sidebar file tree section stays open while exploration state resets on user-scope reset',
  },
  {
    file: 'src/components/layout/sidebar/Sidebar.tsx',
    patterns: [
      'isFileTreeExpanded',
      'isFileTreeOpen',
      'fileTreeOwnerUserId === currentUserId',
      'fileTreeResetEpoch',
      'key={`file-tree-section-${currentUserId',
      'key={`file-tree-${currentUserId',
    ],
    description: 'sidebar renders file tree expansion only for the current user scope',
  },
  {
    file: 'src/components/layout/sidebar/FileTree.tsx',
    patterns: [
      'fileTreeOwnerUserId === currentUserId',
      'expandedFolders.has(node.path)',
      'searchOwnerUserId === currentUserId',
      'fileTreeResetEpoch',
    ],
    description: 'file tree nodes ignore stale expansion and search state from previous users',
  },
  {
    file: 'src/components/layout/sidebar/Search.tsx',
    patterns: [
      'searchOwnerUserId === currentUserId',
      'value={scopedSearchQuery}',
    ],
    description: 'file tree search input ignores stale query state from previous users',
  },
  {
    file: 'src/components/layout/UserMenu.tsx',
    patterns: [
      'resetDmsFileTreeSession();',
      'await logout();',
    ],
    description: 'logout clears file tree UI and data before leaving the account',
  },
  {
    file: 'src/app/(auth)/login/page.tsx',
    patterns: [
      'resetDmsFileTreeSession();',
      'if (!hasHydrated || isAuthenticated) return;',
      'await login(loginId, password);',
    ],
    description: 'login screen clears file tree state before the next account enters',
  },
  {
    file: 'src/lib/file-tree-session.ts',
    patterns: [
      'export function resetDmsFileTreeSession',
      'useSidebarStore.getState().resetUserState();',
      'useFileStore.getState().clearFiles();',
    ],
    description: 'file tree hard reset clears both UI state and file data',
  },
  {
    file: 'src/components/layout/AppLayout.tsx',
    patterns: [
      'sidebarAutoExpandSections',
      "['bookmarks', 'openTabs', 'changes']",
      'const nextExpandedSections = sidebarAutoExpandSections.filter',
      'key={`dms-sidebar-${currentUserId',
    ],
    forbiddenPatterns: [
      "['bookmarks', 'openTabs', 'fileTree', 'changes']",
      'skippedSidebarSettingsResetVersionRef',
      'userScopeResetVersion',
    ],
    description: 'sidebar settings never auto-reopen file tree',
  },
  {
    file: 'src/components/pages/settings/_config/settingsPageConfig.ts',
    patterns: [
      "key: 'personal.sidebar.sections.bookmarks'",
      "key: 'personal.sidebar.sections.openTabs'",
      "key: 'personal.sidebar.sections.changes'",
    ],
    forbiddenPatterns: [
      "key: 'personal.sidebar.sections.fileTree'",
    ],
    description: 'settings UI does not expose file tree auto-open preference',
  },
  {
    file: 'src/stores/settings.store.ts',
    patterns: [
      'beginSettingsRequest',
      'invalidateSettingsRequests',
      'isCurrentSettingsRequest',
      'getCurrentUserScopeId',
    ],
    description: 'settings responses are scoped to the current logged-in user',
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.file);
  for (const pattern of check.patterns) {
    if (!text.includes(pattern)) {
      failures.push(`- ${check.description} (${check.file}) missing pattern: ${pattern}`);
    }
  }
  for (const pattern of check.forbiddenPatterns ?? []) {
    if (text.includes(pattern)) {
      failures.push(`- ${check.description} (${check.file}) still contains forbidden pattern: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[user-scope-contract] failed');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('[user-scope-contract] passed');
