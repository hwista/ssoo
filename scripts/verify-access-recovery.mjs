import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Exercise the actual stores with deferred transport, including responses after account reset.
let checks = 0;
for (const app of ['pms', 'dms', 'sns']) {
  const root = new URL(`../apps/web/${app}/`, import.meta.url);
  const require = createRequire(new URL('package.json', root));
  const pending = [];
  const request = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
  const menuSnapshots = [];
  const menu = { getState: () => ({ applyAccessSnapshot: value => menuSnapshots.push(value), clearMenu: () => menuSnapshots.push(null) }) };
  const module = { exports: {} };
  const filename = new URL('src/stores/access.store.ts', root);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const requireModule = name => {
    if (name === '@/lib/api') return { accessApi: { me: request }, getErrorMessage: () => '조회 실패' };
    if (name === '@/lib/api/endpoints/menus') return { menusApi: { getMyMenus: request } };
    if (name === './menu.store') return { useMenuStore: menu };
    if (name === '@/lib/user-scope') return { registerUserScopedReset: () => {}, isUserScopeTransition: () => true };
    return require(name);
  };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Error })(requireModule, module, module.exports);
  const store = module.exports.useAccessStore;
  const response = snapshot => app === 'sns' ? { data: { success: true, data: snapshot } } : { success: true, data: snapshot };
  const old = { userId: 'old' };
  const current = { userId: 'current' };

  const staleLoad = store.getState().hydrate();
  store.getState().reset();
  pending.shift().resolve(response(old));
  await staleLoad;
  assert.equal(store.getState().snapshot, null, `${app}: stale response after reset must be ignored`);
  assert.equal(store.getState().hasLoaded, false);
  checks++;

  const staleFailure = store.getState().hydrate();
  store.getState().reset();
  const newLoad = store.getState().hydrate();
  pending.shift().reject(new Error('old account failed'));
  await staleFailure;
  assert.equal(store.getState().isLoading, true, `${app}: old failure must not end new loading`);
  assert.equal(store.getState().error, null);
  pending.shift().resolve(response(current));
  await newLoad;
  assert.equal(store.getState().snapshot, current);
  checks++;

  const refresh = store.getState().hydrate();
  pending.shift().reject(new Error('network unavailable'));
  await refresh;
  assert.equal(store.getState().snapshot, current, `${app}: failed refresh retains the last snapshot`);
  assert.equal(store.getState().error, 'network unavailable');
  checks++;

  const retry = store.getState().hydrate();
  pending.shift().resolve(response(current));
  await retry;
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isLoading, false);
  checks++;
}
console.log(`[access-recovery] ${checks} account reset, stale response and retry checks passed.`);
