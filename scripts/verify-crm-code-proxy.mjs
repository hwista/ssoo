import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
let observed;
function load(file,imports={}) {
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(new URL(file,root),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{Request,Response,Headers,URL,AbortController,console,fetch:async(url,init)=>{observed={url,init};return Response.json({success:true,data:{id:'42'}},{status:201});}})(name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name);},module,module.exports);
  return module.exports;
}
const shared=load('packages/web-auth/src/server-api-proxy.ts',{'./session-cookie-retry':{}});
const helpers=shared.createServerApiProxyHelpers({resolveServerApiBaseUrl:()=> 'http://backend.test/api',defaultHeaders:{'X-SSOO-App':'crm'}});
const imports={'@/app/api/_shared/serverApiProxy':helpers};
const collection=load('apps/web/crm/src/app/api/codes/route.ts',imports);
const item=load('apps/web/crm/src/app/api/codes/[...path]/route.ts',imports);
for(const [method,handler,path] of [['POST',collection.POST,[]],['PUT',item.PUT,['42']],['DELETE',item.DELETE,['42']],['DELETE',item.DELETE,['42','permanent']]]) {
  const body={codeGroup:'payment_term',codeValue:'test',displayNameKo:'시험',reason:'검증',expectedUpdatedAt:'2026-11-06T00:00:00.000Z'};
  const request=new Request('http://crm.test/api/codes',{method,headers:{authorization:'Bearer test-only',cookie:'session=test-only','content-type':'application/json'},body:JSON.stringify(body)});
  const response=await handler(request,{params:Promise.resolve({path})});
  assert.equal(response.status,201);
  assert.equal(observed.init.method,method);
  assert.equal(observed.init.headers.get('content-type'),'application/json');
  assert.equal(observed.init.headers.get('authorization'),'Bearer test-only');
  assert.equal(observed.init.headers.get('cookie'),'session=test-only');
  assert.equal(observed.init.headers.get('x-ssoo-app'),'crm');
  assert.deepEqual(JSON.parse(observed.init.body),body);
  assert.equal(observed.url,'http://backend.test/api/codes'+(path.length?'/'+path.join('/'):''));
}
observed=null;
assert.equal((await item.GET(new Request('http://crm.test/api/codes/other'),{params:Promise.resolve({path:['other']})})).status,404);
assert.equal(observed,null);
console.log('[crm-code-proxy] POST/PUT/DELETE JSON body, audit fields, auth forwarding and invalid path passed');
