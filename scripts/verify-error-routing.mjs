import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const roots = ['apps/web', 'packages/web-auth/src', 'packages/web-shell/src'];
const implementations = new Set(['packages/web-shell/src/error-recovery.tsx', 'packages/web-shell/src/error-toast.tsx', 'packages/web-shell/src/fatal-error.tsx']);
// Numeric counters and lifecycle labels describe records; they do not present an error payload.
const dataValues = new Map([
  ['apps/web/pms/src/components/pages/admin/MasterDataPage.tsx', new Set(['result.summary.error', "status === 'create' ? '생성' : status === 'update' ? '갱신' : status === 'error' ? '오류' : '건너뜀'"])],
]);
const errorValue = /(?:\berror\b|\w*Error(?:Message)?\b|\b\w*Errors\b|failReason|failureReason)/;
const errorCopy = /(?:불러오지 못했습니다|저장하지 못했습니다|처리하지 못했습니다|저장 실패|추천 오류|권한이 없습니다)/;
function filesAt(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', '.next', 'dist', 'storybook-static'].includes(entry.name) ? [] : filesAt(name);
    return /\.(?:ts|tsx)$/.test(name) && !/\.(?:stories|spec|test)\./.test(name) ? [name] : [];
  });
}
export function inspect(file, text) {
  if (implementations.has(file)) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];
  const canonical = new Map();
  function report(node, reason) { findings.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${reason}`); }
  function isHandled(node) {
    for (let current = node.parent; current; current = current.parent) {
      if (!ts.isJsxElement(current)) continue;
      const opening = current.openingElement;
      const name = canonical.get(opening.tagName.getText(source));
      if (name?.startsWith('SsooError')) return true;
      if (name === 'SsooSidebarState' || name === 'SsooSettingsBanner') {
        const key = name === 'SsooSidebarState' ? 'variant' : 'tone';
        const value = name === 'SsooSidebarState' ? 'error' : 'danger';
        if (opening.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === key && prop.initializer && ts.isStringLiteral(prop.initializer) && prop.initializer.text === value)) return true;
      }
    }
    return false;
  }
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const module = statement.moduleSpecifier.text;
    const binding = statement.importClause?.namedBindings;
    if (module === 'sonner') {
      if (statement.importClause?.name || binding && ts.isNamespaceImport(binding)) report(statement, 'raw toast namespace/default import bypasses the shared error template');
      if (binding && ts.isNamedImports(binding) && binding.elements.some(item => ['toast', 'Toaster'].includes((item.propertyName ?? item.name).text))) report(statement, 'import ssooToast/SsooToaster from @ssoo/web-shell instead of raw sonner notification exports');
    }
    if ((module === '@ssoo/web-shell' || module.startsWith('./error-')) && binding && ts.isNamedImports(binding)) {
      for (const item of binding.elements) canonical.set(item.name.text, (item.propertyName ?? item.name).text);
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && /^(?:(?:window|globalThis)\.)?alert$/.test(node.expression.getText(source))) {
      const message = node.arguments[0];
      if (!message || !ts.isStringLiteral(message) || /오류|실패|못|권한|error|fail/i.test(message.text)) report(node, 'error alert must use showSsooErrorAlert or an inline shared error template');
    }
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'role' && node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text === 'alert' && !isHandled(node)) {
      // A wrapper around a shared notice is still delegated, not an independent alert renderer.
      const element = node.parent.parent.parent;
      if (!element.getText(source).includes('SsooErrorNotice')) report(node, 'raw alert surface must delegate to the shared error template');
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent) && !isHandled(node)) {
      const value = node.expression.getText(source);
      let containsJsx = false;
      function findJsx(child) { if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) containsJsx = true; else ts.forEachChild(child, findJsx); }
      findJsx(node.expression);
      if (!containsJsx && errorValue.test(value) && !dataValues.get(file)?.has(value)) report(node, 'error value rendered outside a shared template: ' + value.slice(0,120));
    }
    if (ts.isJsxText(node) && errorCopy.test(node.text) && !isHandled(node)) report(node, 'error copy rendered outside a shared template: ' + node.text.trim());
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings;
}
if (process.argv.includes('--self-test')) {
  const cases = [
    ["import {toast as notify} from 'sonner'; notify.error('failed');", 1],
    ["import * as notices from 'sonner';", 1],
    ["import {Toaster} from 'sonner';", 1],
    ["window.alert(error.message)", 1],
    ["globalThis.alert('저장 실패')", 1],
    ["window.alert('저장했습니다.')", 0],
    ["const View=()=> <p>{error.message}</p>", 1],
    ["const View=()=> <p>{loadError ?? '-'}</p>", 1],
    ["const View=()=> <p>이미지를 불러오지 못했습니다.</p>", 1],
    ["const View=()=> <div role='alert'>문제</div>", 1],
    ["import {SsooErrorNotice as Notice} from '@ssoo/web-shell'; const View=()=> <Notice>{error.message}</Notice>", 0],
    ["import {SsooSettingsBanner} from '@ssoo/web-shell'; const View=()=> <SsooSettingsBanner tone='danger'>{error}</SsooSettingsBanner>", 0],
    ["import {SsooSettingsBanner} from '@ssoo/web-shell'; const View=()=> <SsooSettingsBanner tone='success'>{error}</SsooSettingsBanner>", 1],
  ];
  for (const [source, count] of cases) assert.equal(inspect('apps/web/example.tsx', source).length, count, source);
  console.log(`[error-routing] ${cases.length} bypass/alias/delegation guard checks passed`);
} else {
  const files = roots.flatMap(filesAt);
  const findings = files.flatMap(file => inspect(file, fs.readFileSync(file, 'utf8')));
  if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
  else console.log(`[error-routing] ${files.length} web source files checked: raw error alerts/toasts and recognized error render bypasses 0`);
}
