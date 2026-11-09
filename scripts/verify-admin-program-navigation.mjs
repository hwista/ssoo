import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(new URL('../apps/web/admin/package.json', import.meta.url));
const root = new URL('../', import.meta.url);
const memory = new Map();
const sessionStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
function load(path, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(path, root), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, URLSearchParams, sessionStorage })(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
const nav = load('apps/web/admin/src/components/layout/navigation.ts');
const routes = load('apps/web/admin/src/lib/constants/routes.ts');
const policy = load('packages/web-shell/src/route-policy.ts');
const routeOptions = { allowedPaths: routes.ADMIN_ROOT_ENTRY_PATHS, allowedPrefixes: routes.ADMIN_ALLOWED_PATH_PREFIXES, fallbackPath: '/not-found', mode: 'rewrite' };
const expectedPaths = ['/organizations', '/users', '/memberships', '/accounts', '/applications', '/service-grants', '/roles', '/organization-permissions', '/user-permissions', '/access-diagnosis', '/approval-authorities', '/approvals', '/operation-history', '/codes', '/auth', '/email-operations', '/ai-operations'];
assert.deepEqual(Array.from(nav.ADMIN_NAV_GROUPS.flatMap(group => group.items.map(item => item.href))), expectedPaths);
for (const path of expectedPaths) {
  assert.ok(fs.existsSync(new URL(`apps/web/admin/src/app/(main)${path}/page.tsx`, root)), `reloadable route ${path}`);
  assert.equal(nav.getAdminTabOptions(path).path, path);
  assert.equal(policy.resolveSsooRoutePolicyDecision(path, routeOptions).action, 'next', `middleware allows ${path}`);
  assert.notEqual(nav.getAdminTabOptions(path).title, '대시보드');
}
for (const [oldPath, newPath] of [
  ['/roles?tab=inspect&userId=17', '/access-diagnosis?userId=17'],
  ['/roles?tab=organization-permissions', '/organization-permissions'],
  ['/roles?tab=user-permissions', '/user-permissions'],
  ['/roles?tab=approval-authorities', '/approval-authorities'],
  ['/roles?tab=audit', '/operation-history?view=events'],
  ['/roles?tab=catalog', '/roles?tab=catalog'],
  ['/users?search=Kim&create=1', '/users?search=Kim&create=1'],
  ['/approvals?view=registration', '/approvals?view=registration'],
]) {
  assert.equal(nav.getAdminTabOptions(oldPath).path, newPath);
  assert.equal(nav.getAdminNavItem(oldPath).href, newPath.split('?')[0]);
}
assert.equal(policy.resolveSsooRoutePolicyDecision('/unknown-program', routeOptions).action, 'rewrite');
const messages = [];
const home = load('packages/web-shell/src/home-navigation.ts');
const { useTabStore: store } = load('apps/web/admin/src/stores/tab.store.ts', {
  '@ssoo/web-shell': { ...home, ssooToast: { warning: message => messages.push(message) } },
});
store.setState({ maxTabs: 3 });
store.getState().openTab(nav.getAdminTabOptions('/users?search=Kim'));
store.getState().openTab(nav.getAdminTabOptions('/memberships'));
const before = store.getState().tabs;
assert.equal(store.getState().openTab(nav.getAdminTabOptions('/email-operations')), '');
assert.equal(messages.length, 1, 'capacity failure is explained');
assert.match(messages[0], /탭을 닫은 뒤/);
assert.equal(store.getState().tabs, before, 'never discard open work at capacity');
assert.equal(store.getState().openTab(nav.getAdminTabOptions('/users?search=Lee')), 'users');
assert.equal(store.getState().tabs.find(tab => tab.id === 'users').path, '/users?search=Lee');
store.getState().closeTab('memberships');
assert.equal(store.getState().openTab(nav.getAdminTabOptions('/email-operations')), 'email-operations');
assert.equal(store.getState().openTab(nav.getAdminTabOptions('/')), 'home');
console.log('[admin-program-navigation] 17 direct programs, legacy contextual routes, tab reuse and capacity recovery passed');

// Every common-management entry must declare the appropriate page recipe. A shared
// outer MDI adapter alone does not satisfy the final-page assembly contract.
const recipes = [
  ['/organizations', 'organizations/OrgManagementPage.tsx', 'SsooDataWorkspacePage'],
  ['/users', 'users/UserManagementPage.tsx', 'SsooDataWorkspacePage'],
  ['/memberships', 'access/MembershipManagementPanel.tsx', 'SsooDataWorkspacePage'],
  ['/accounts', 'users/UserManagementPage.tsx', 'SsooDataWorkspacePage'],
  ['/applications', 'access/ApplicationManagementPage.tsx', 'SsooDataWorkspacePage'],
  ['/service-grants', 'access/ServiceGrantManagementPanel.tsx', 'SsooDataWorkspacePage'],
  ['/roles', 'roles/AccessManagementPage.tsx', 'SsooWorkspacePage'],
  ['/organization-permissions', 'roles/CommonPermissionsPanel.tsx', 'SsooDataWorkspacePage'],
  ['/user-permissions', 'roles/CommonPermissionsPanel.tsx', 'SsooDataWorkspacePage'],
  ['/access-diagnosis', 'roles/AccessManagementPage.tsx', 'SsooWorkspacePage'],
  ['/approval-authorities', 'roles/AccessManagementPage.tsx', 'SsooWorkspacePage'],
  ['/approvals', 'access/ApprovalsPage.tsx', 'SsooWorkspacePage'],
  ['/operation-history', 'access/OperationHistoryButton.tsx', 'SsooDataWorkspacePage'],
  ['/codes', 'codes/CodeManagementPage.tsx', 'SsooDataWorkspacePage'],
  ['/auth', 'auth/AuthPolicyPage.tsx', 'SsooSettingsPage'],
  ['/email-operations', 'auth/EmailOperationsPage.tsx', 'SsooWorkspacePage'],
  ['/ai-operations', 'ai/AiOperationsPage.tsx', 'SsooWorkspacePage'],
];
assert.deepEqual(recipes.map(([path]) => path), expectedPaths);
for (const [path, filename, recipe] of recipes) {
  const source = fs.readFileSync(new URL(`apps/web/admin/src/components/pages/${filename}`, root), 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tags = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(tags.includes(recipe), `${path}: actual JSX uses ${recipe}`);
  assert.ok(!tags.includes('h1'), `${path}: page title belongs to the shared recipe`);
  if (recipe !== 'SsooSettingsPage') assert.ok(!tags.includes('SsooSettingsPage'), `${path}: operational data is not configuration`);
  const breadcrumb = nav.getAdminBreadcrumb(path);
  assert.equal(breadcrumb.at(-1).label, nav.getAdminNavItem(path).label);
  assert.equal(breadcrumb[0].label, nav.ADMIN_NAV_GROUPS.find(group => group.items.some(item => item.href === path)).title);
}
console.log('[admin-templates] all 17 program recipes, title ownership and Korean breadcrumb mappings passed.');

// Context must survive encoding, route normalization and existing-tab reuse.
const context = load('apps/web/admin/src/components/pages/access/program-context.ts');
for (const route of ['/memberships', '/service-grants', '/organization-permissions', '/user-permissions', '/approval-authorities', '/operation-history']) {
  const value = context.programPath(route, { userId: '17', organizationId: '2550', serviceCode: 'pms' });
  assert.equal(nav.getAdminTabOptions(value).path, value);
  assert.equal(context.readProgramContext(value).userId, '17');
  assert.equal(context.readProgramContext(value).organizationId, '2550');
}
assert.equal(context.programPath('/users?create=1', { search: '김 & Lee+' }), '/users?create=1&search=%EA%B9%80+%26+Lee%2B');
assert.equal(context.readProgramContext('/memberships?userId=invalid').userId, undefined);
const now = Date.parse('2026-11-06T00:00:00Z');
assert.ok(context.periodIssue('2026-11-07', '2026-11-06'));
assert.ok(context.periodIssue('', '2026-11-05', true, now));
assert.equal(context.periodIssue('', '', true, now), null);
assert.equal(context.periodIssue('2026-11-05', '2026-11-07', true, now), null);
for (const file of ['access/UserParticipationDialog.tsx', 'organizations/OrganizationRelationsPanel.tsx']) {
  const source = fs.readFileSync(new URL(`apps/web/admin/src/components/pages/${file}`, root), 'utf8');
  assert.doesNotMatch(source, /import.*(?:MembershipManagementPanel|ServiceGrantManagementPanel|CommonPermissionsPanel)/, `${file}: owns links, never embedded editors`);
}
console.log('[admin-program-navigation] contextual routing, period boundaries and program ownership passed');
