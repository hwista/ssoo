import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = new URL('../apps/web/dms/', import.meta.url);
const require = createRequire(new URL('package.json', root));
function load(file, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, root), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Error, SyntaxError, console, TextDecoder, setTimeout, clearTimeout })(
    name => Object.hasOwn(imports, name) ? imports[name] : require(name), module, module.exports,
  );
  return module.exports;
}
let response;
const streaming = load('src/lib/api/streaming.ts', { './sharedAuth': { fetchWithSharedAuth: async () => response } });
const { streamAssistantAsk } = load('src/components/common/assistant/chat/assistantChatUtils.ts', {
  '@/lib/api/streaming': streaming, '@/lib/api/endpoints/files': { fileApi: {} },
});
const { useAssistantSessionStore: store } = load('src/stores/assistant-session.store.ts', {
  '@/lib/user-scope': { registerUserScopedReset() {}, shouldResetPersistedUserState: () => false },
  'zustand/middleware': { persist: initializer => initializer, createJSONStorage: () => undefined },
});
let searchResponse;
const { useAssistantMessageActions } = load('src/components/common/assistant/chat/useAssistantMessageActions.ts', {
  react: { useCallback: callback => callback }, '@/stores': { useAssistantSessionStore: selector => selector(store.getState()) },
  '@/lib/api/core': { getErrorMessage: value => value.error },
  '@/lib/api/endpoints/ai': { aiApi: { search: async () => searchResponse } },
  '@/lib/assistant/assistantHelp': {}, './assistantChatUtils': {
    streamAssistantAsk, createAssistantMessageId: () => 'search-failure', formatBlockedSourcesNotice: () => '',
  },
});
const actions = useAssistantMessageActions();
const latest = () => store.getState().messages.at(-1);
let checks = 0;
searchResponse = { success: false, error: '검색 일시 실패' };
await actions.runSearch('검증');
assert.match(latest().error, /검색 일시 실패/); assert.equal(latest().text, ''); checks++;

response = new Response('서비스 일시 중단', { status: 503 });
await actions.runAsk([]);
assert.equal(latest().error, '서비스 일시 중단'); assert.equal(latest().pending, false);
assert.doesNotMatch(latest().text, /중단했습니다|비어 있습니다/); checks++;

response = new Response('data: {"type":"text-delta","delta":"부분 응답 보존"}\n\ndata: {"type":"error","errorText":"생성 실패"}\n\n');
await actions.runAsk([]);
assert.equal(latest().text, '부분 응답 보존'); assert.equal(latest().error, '생성 실패');
assert.equal(latest().pending, false);
assert.equal(store.getState().sessions.find(session => session.id === store.getState().activeSessionId).messages.at(-1).error, '생성 실패'); checks++;

response = new Response('data: {"type":"text-delta","delta":"정상 응답"}\n\ndata: [DONE]\n\n');
await actions.runAsk([]);
assert.equal(latest().text, '정상 응답'); assert.equal(latest().error, undefined); assert.equal(latest().pending, false); checks++;

const controller = new AbortController(); controller.abort();
response = new Response('');
await actions.runAsk([], { signal: controller.signal });
assert.equal(latest().text, '사용자가 응답 수신을 중단했습니다.'); assert.equal(latest().error, undefined); checks++;
console.log(`[assistant-error-recovery] ${checks} search/HTTP/stream failure, partial text, persisted state, success and cancellation contracts passed`);
