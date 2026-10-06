import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(new URL('../apps/web/dms/package.json', import.meta.url));
const root = new URL('../', import.meta.url);
const memory = new Map();
const sessionStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
function load(path, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(path, root), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, URLSearchParams, sessionStorage })(
    name => Object.hasOwn(imports, name) ? imports[name] : require(name), module, module.exports,
  );
  return module.exports;
}
const home = load('packages/web-shell/src/home-navigation.ts');
const crm = load('apps/web/crm/src/lib/crmNavigation.ts', { '@ssoo/web-shell': home });
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(JSON.stringify(actual), JSON.stringify(expected), message); checks++; };
for (const [input, expected] of [
  ['/', '/'], ['/?sourceSurface=dashboard', '/'], ['/opportunities?sourceSurface=dashboard', '/'],
  ['/?selected=sample', '/opportunities?selected=sample'], ['/?create=opportunity', '/opportunities?create=opportunity'],
  ['/?sourceSurface=list&search=test', '/opportunities?sourceSurface=list&search=test'],
  ['/?sourceSurface=form&selected=sample', '/opportunities?sourceSurface=form&selected=sample'],
  ['/contracts?selected=sample', '/contracts?selected=sample'],
]) equal(crm.normalizeCrmNavigationPath(input), expected, input);

for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
  memory.clear();
  const imports = {
    '@ssoo/web-shell': home,
    '@ssoo/web-auth': { shouldResetPersistedUserState: (next, previous) => next !== previous },
    '@/lib/constants/routes': { APP_HOME_PATH: '/' },
    '@/lib/crmNavigation': crm,
    '@/lib/user-scope': { registerUserScopedReset() {}, shouldResetPersistedUserState: (next, previous) => next !== previous },
  };
  const module = load(`apps/web/${app}/src/stores/tab.store.ts`, imports);
  const store = module.useTabStore;
  const entry = module.HOME_TAB ?? module[`${app.toUpperCase()}_HOME_TAB`];
  const homeId = app === 'pms' ? entry.menuCode : entry.id;
  const domain = { id: 'work', menuCode: 'work', menuId: 'work', path: '/work', title: '작성 중', closable: true };
  store.getState().openTab(domain);
  const work = store.getState().tabs.find(tab => tab.id === 'work');
  if (app === 'dms') store.getState().updateTab('work', { isEditing: true });
  const retained = store.getState().tabs.find(tab => tab.id === 'work');
  const result = store.getState().openTab({ id: 'old-dashboard', menuCode: 'dashboard', menuId: 'old', path: entry.path, title: '대시보드', closable: true, params: { legacy: 'dashboard' } });
  equal(result, homeId, `${app}: aliases activate home`);
  equal(store.getState().tabs.length, 2, `${app}: no duplicate home`);
  assert.equal(store.getState().tabs.find(tab => tab.id === 'work'), retained); checks++;
  store.getState().closeTab(homeId);
  equal(store.getState().tabs.length, 2, `${app}: cannot close home`);
  store.getState().reorderTabs(0, 1);
  store.getState().reorderTabs(1, 0);
  equal(store.getState().tabs[0].id, homeId, `${app}: fixed first home`);
  store.setState({ maxTabs: 2 });
  equal(store.getState().openTab({ ...domain, path: entry.path }), homeId, `${app}: home remains accessible at capacity`);
  equal(home.isSsooSidebarDestination(entry.path, entry), false, `${app}: no sidebar duplicate`);
  equal(home.isSsooSidebarDestination('/work', entry), true, `${app}: domain stays visible`);
  const old = { ...work, id: 'old-dashboard', path: entry.path, title: 'duplicate', closable: true };
  const normalized = home.normalizeSsooHomeTabs([retained, old, store.getState().tabs[0]], old.id, entry, () => store.getState().tabs[0]);
  equal(normalized.tabs.map(tab => tab.id), [homeId, 'work'], `${app}: hydration merges only home`);
  assert.equal(normalized.tabs[1], retained); checks++;
  equal(normalized.activeTabId, homeId, `${app}: alias selection restored`);
}

// Real CRM persisted-state migration retains the former root workspace and all
// unrelated tabs; only the old dashboard entry is merged into the new home.
memory.clear();
const date = new Date().toISOString();
memory.set('crm-mdi-tabs', JSON.stringify({ version: 0, state: { activeTabId: 'crm-source-dashboard', tabs: [
  { id: 'home', path: '/?selected=erp', title: '홈', closable: false, openedAt: date, lastActiveAt: date },
  { id: 'crm-source-dashboard', path: '/?sourceSurface=dashboard', title: '대시보드', closable: true, openedAt: date, lastActiveAt: date },
  { id: '/contracts', path: '/contracts?selected=kept', title: '계약', closable: true, openedAt: date, lastActiveAt: date },
] } }));
const { useTabStore } = load('apps/web/crm/src/stores/tab.store.ts', { '@ssoo/web-shell': home, '@/lib/crmNavigation': crm });
await useTabStore.persist.rehydrate();
equal(useTabStore.getState().tabs.map(tab => [tab.id, tab.path]), [['home', '/'], ['crm-opportunity-workspace', '/opportunities?selected=erp'], ['/contracts', '/contracts?selected=kept']], 'CRM persisted work is retained');
equal(useTabStore.getState().activeTabId, 'home', 'CRM old dashboard maps to home');
const routes = load('apps/web/crm/src/lib/crmWorkspaceRoutes.ts', {
  '@ssoo/web-shell': home, '@/stores/tab.store': { CRM_HOME_TAB: crm.CRM_HOME_ENTRY }, './crmNavigation': crm,
});
equal(routes.getCrmWorkspaceTabOptions('/?sourceSurface=dashboard').id, 'home', 'legacy dashboard tab identity');
equal(routes.getCrmWorkspaceTabOptions('/?selected=erp').id, 'crm-opportunity-workspace', 'legacy selection stays in workspace');
equal(routes.getCrmWorkspaceTabOptions('/opportunities').title, crm.CRM_OPPORTUNITY_WORKSPACE_TITLE, 'workspace title source');
console.log(`[home-navigation] ${checks} route, sidebar, fixed-home, capacity, tab preservation and persisted-state checks passed.`);

// Display projection must not alter access lookups or original DB menu data.
const pmsHome = home.defineSsooHomeEntry({ id: 'HOME', path: '/home', pageTitle: '홈' });
const { useMenuStore } = load('apps/web/pms/src/stores/menu.store.ts', {
  '@ssoo/web-shell': home, './tab.store': { HOME_TAB: pmsHome }, '@/lib/api/endpoints/menus': { menusApi: {} },
});
const menu = (menuCode, menuPath, isVisible = true) => ({ menuCode, menuPath, isVisible, accessType: 'read', children: [] });
const original = [menu('dashboard', '/home'), menu('hidden', '/hidden', false), { ...menu('group', undefined), children: [menu('alias', '/home?old=1'), menu('work', '/work')] }];
useMenuStore.getState().setMenus(original, []);
equal(useMenuStore.getState().generalMenus.map(m => m.menuCode), ['group'], 'PMS filters home and hidden rows');
equal(useMenuStore.getState().generalMenus[0].children.map(m => m.menuCode), ['work'], 'PMS recursive home alias filtering');
equal(useMenuStore.getState().getMenuAccess('dashboard'), 'read', 'PMS home permission retained');
equal(useMenuStore.getState().getMenuAccess('hidden'), 'read', 'PMS hidden permission retained');
equal(original[2].children.length, 2, 'PMS source menu untouched');
useMenuStore.getState().setFavorites([menu('dashboard', '/home'), menu('work', '/work')]);
equal(useMenuStore.getState().favorites.map(m => m.menuCode), ['work'], 'PMS legacy home favorite filtered');
console.log(`[home-navigation] ${checks} total checks including PMS display/access separation passed.`);
