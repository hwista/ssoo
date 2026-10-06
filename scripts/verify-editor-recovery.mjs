import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = new URL('../apps/web/dms/', import.meta.url);
const require = createRequire(new URL('package.json', root));
function load(relativePath, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(relativePath, root), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Error, console, AbortController, DOMException, setTimeout, clearTimeout })(
    name => Object.hasOwn(imports, name) ? imports[name] : require(name), module, module.exports,
  );
  return module.exports;
}
const core = load('src/lib/api/core.ts', {
  '@/lib/constants/common': { ERROR_MESSAGES: { NETWORK_ERROR: '연결 실패' } },
  './sharedAuth': { fetchWithSharedAuth: () => { throw new Error('Unexpected transport call'); } },
});
const pending = [];
const deferred = () => new Promise(resolve => pending.push(resolve));
let metadataResponse = { success: true };
const { useEditorMultiStore } = load('src/stores/editor-core.store.ts', {
  '@/lib/api/core': core,
  '@/lib/api/endpoints/files': { fileApi: { update: deferred, getMetadata: async () => ({ success: true }), updateMetadata: async () => metadataResponse }, contentApi: { save: deferred } },
  '@/lib/api/endpoints/templates': { templateApi: { upsert: deferred } },
  '@/lib/utils/errorUtils': { logger: { info() {}, warn() {}, error() {} }, PerformanceTimer: class { end() {} } },
  '@/lib/utils/linkUtils': { normalizeDocumentPath: path => path },
  '@/lib/user-scope': { isUserScopeTransition: () => false, registerUserScopedReset() {} },
  './file.store': { isDmsPageLifecycleTransition: () => false, useFileStore: { getState: () => ({ refreshFileTree: async () => {} }), subscribe: () => () => {} } },
});
const store = useEditorMultiStore;
const tab = 'draft';
const handlers = { getMarkdown: () => 'local draft' };
function reset() {
  store.getState().resetAllEditors();
  store.getState()._updateTab(tab, { content: 'saved original', currentFilePath: 'test.md', isEditing: true, hasUnsavedChanges: true, documentMetadata: { revisionSeq: 1 }, editorHandlers: handlers });
}
let checks = 0;
for (const method of ['saveFile', 'saveFileKeepEditing', 'saveContent']) {
  reset();
  const action = store.getState()[method](tab, 'test.md', 'local draft');
  let state = store.getState()._getTab(tab);
  assert.equal(state.isLoading, false, `${method}: save cannot activate document loading surface`);
  assert.equal(state.isSaving, true);
  assert.equal(state.editorHandlers, handlers);
  checks++;
  pending.shift()({ success: false, status: 503, error: 'injected failure' });
  await assert.rejects(action, error => error.status === 503);
  state = store.getState()._getTab(tab);
  assert.equal(state.error, null, `${method}: save cannot overwrite load error`);
  assert.equal(state.saveError.status, 503);
  assert.equal(state.isEditing, true);
  assert.equal(state.hasUnsavedChanges, true);
  assert.equal(state.content, 'saved original');
  assert.equal(state.isSaving, false);
  checks++;
  const retry = store.getState()[method](tab, 'test.md', 'local draft');
  assert.equal(store.getState()._getTab(tab).saveError, null);
  pending.shift()({ success: true, data: { metadata: { revisionSeq: 2 } } });
  await retry;
  assert.equal(store.getState()._getTab(tab).content, 'local draft');
  checks++;
}
reset();
const conflict = store.getState().saveContent(tab, 'test.md', 'local draft');
pending.shift()({ success: false, status: 409, details: { serverContent: 'new server version', currentRevisionSeq: 2 }, error: 'conflict' });
await assert.rejects(conflict, error => core.getDocumentConflictDetails(error)?.serverContent === 'new server version');
assert.equal(store.getState()._getTab(tab).error, null);
checks++;
reset();
store.getState()._updateTab(tab, { pendingMetadataUpdate: { title: 'unsaved title' } });
metadataResponse = { success: false, status: 503, error: 'metadata failure' };
const partialSave = store.getState().saveFile(tab, 'test.md', 'local draft');
pending.shift()({ success: true, data: { metadata: { revisionSeq: 2 } } });
await assert.rejects(partialSave);
assert.equal(store.getState()._getTab(tab).isEditing, true, 'metadata failure cannot exit editor after body save');
assert.equal(store.getState()._getTab(tab).pendingMetadataUpdate.title, 'unsaved title');
assert.equal(store.getState()._getTab(tab).error, null);
checks++;
console.log(`[editor-recovery] ${checks} in-flight save, retained editor, retry, conflict and partial metadata checks passed.`);
