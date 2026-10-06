import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual editor transformations without importing React/browser dependencies.
const source = fs.readFileSync(new URL('../apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['createDraftLine', 'createEmptyDraft', 'parseDraftNumber', 'parseDraftAmount', 'getDraftLineAmount', 'getMarginRate', 'getLinkedRevenueCategory', 'createLinkedRevenueLine', 'syncLinkedRevenueLines', 'patchDraftLine', 'formatDraftDuration', 'toUpsertPayload', 'getDraftDiscountAmount'];
const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(ast)).join('\n');
const ctx = vm.createContext({});
vm.runInContext(ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
let checks = 0;
const check = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
let draft = ctx.createEmptyDraft();
check(draft.region, 'unspecified', 'new opportunity does not assume domestic');
check(draft.revenueLines.length, 0, 'new form has no phantom revenue row');
draft.costLines = [ctx.createDraftLine('costLines', { id: 'a', category: 'product', label: 'A', quantity: '3', unitPrice: '12345' })];
draft = ctx.patchDraftLine(draft, 'costLines', 0, { revenueLinked: true });
check(draft.revenueLines[0].unitPrice, '12345', 'empty linked price follows cost');
draft = ctx.patchDraftLine(draft, 'revenueLines', 0, { marginRate: '20' });
check(draft.revenueLines[0].unitPrice, '15431', '20% gross margin uses rounded selling price');
draft = ctx.patchDraftLine(draft, 'revenueLines', 0, { truncUnit: '1000' });
check(ctx.getDraftLineAmount(draft.revenueLines[0]), 46000, 'selling price supports truncation');
draft.costLines.push(ctx.createDraftLine('costLines', { id: 'b', category: 'external-cost', label: 'B' }));
draft = ctx.patchDraftLine(draft, 'costLines', 1, { unitPrice: '100' });
check(draft.revenueLines[0].unitPrice, '15431', 'unrelated cost edit preserves selling override');
draft = ctx.patchDraftLine(draft, 'costLines', 0, { quantity: '4' });
check(draft.revenueLines[0].unitPrice, '12345', 'own cost edit resynchronizes selling price');
check(draft.revenueLines[0].truncUnit, '1000', 'own cost edit preserves revenue truncation');
draft = ctx.patchDraftLine(draft, 'revenueLines', 0, { unitPrice: '10000' });
check(draft.revenueLines[0].marginRate, '-23.45', 'negative margin is represented');
draft.revenueLines[0].amount = '50000';
draft = ctx.patchDraftLine(draft, 'revenueLines', 0, { quantity: '0' });
check(ctx.toUpsertPayload(draft).revenueLines[0].amount, 0, 'zero quantity cannot revive stored amount');
check(ctx.toUpsertPayload(draft).revenueLines[0].quantity, 0, 'zero survives serialization');
draft = ctx.patchDraftLine(draft, 'costLines', 0, { revenueLinked: false });
check(draft.revenueLines.length, 0, 'unlink removes revenue');
draft.revenueLines = [ctx.createDraftLine('revenueLines', { department: 'DX센터', quantity: '2', unitPrice: '5000' })];
check(ctx.toUpsertPayload(draft).revenueLines[0].label, 'DX센터', 'department-only service remains saveable');
check(ctx.getMarginRate('0', '10000'), '100.00', 'zero cost margin');
check(ctx.formatDraftDuration('2026-09-01', '2026-10-02'), '1개월 1일', 'source thirty-day duration');
for (const [quantity, unitPrice, truncUnit, expected] of [
  [0.1, 9999, 1000, 0], [2.3, 100, 10, 230], [0.29, 100, 1, 29],
  [0.5, 123, 0, 62], [0.01, 19999, 100, 100], [1.234, 1000, 0, 1230],
]) {
  check(ctx.getDraftLineAmount(ctx.createDraftLine('revenueLines', {
    quantity: String(quantity), unitPrice: String(unitPrice), truncUnit: String(truncUnit),
  })), expected, `exact quantity ${quantity} × price ${unitPrice}, truncation ${truncUnit}`);
}
check(ctx.getDraftDiscountAmount(1000, 'rate', '12.345'), 124, 'discount precision matches stored rate');
check(ctx.getDraftDiscountAmount(1000, 'amount', '1200'), 1000, 'amount discount caps at subtotal');
check(ctx.getDraftDiscountAmount(1000, 'amount', '1.499'), 1, 'amount discount rounds once');
const contractSource = fs.readFileSync(new URL('../apps/web/crm/src/components/pages/contracts/ContractUpsertPanel.tsx', import.meta.url), 'utf8');
const contractAst = ts.createSourceFile('contract.tsx', contractSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const contractNames = ['parseNumber', 'calculateLineAmount', 'calculateDiscountAmount'];
const contractDeclarations = contractAst.statements.filter(node => ts.isFunctionDeclaration(node) && contractNames.includes(node.name?.text)).map(node => node.getText(contractAst)).join('\n');
const contract = vm.createContext({});
vm.runInContext(ts.transpileModule(contractDeclarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contract);
for (const [quantity, unitPrice, truncUnit, expected] of [
  [0.1, 9999, 1000, 0], [2.3, 100, 10, 230], [0.29, 100, 1, 29],
  [0.5, 123, 0, 62], [0.01, 19999, 100, 100], [1.234, 1000, 0, 1230],
]) {
  check(contract.calculateLineAmount({ quantity: String(quantity), unitPrice: String(unitPrice), truncUnit: String(truncUnit), amount: '999' }), expected, `contract boundary ${quantity} × ${unitPrice}, truncation ${truncUnit}`);
}
check(contract.calculateLineAmount({ quantity: '0', unitPrice: '100', amount: '999' }), 0, 'contract zero cannot revive stored amount');
check(contract.calculateDiscountAmount(1000, 'rate', '12.345'), 124, 'contract normalized rate');
check(contract.calculateDiscountAmount(1000, 'amount', '1.499'), 1, 'contract amount discount rounds once');
for (const [file, normalize] of [
  ['reports/reportsPreviewQuery.ts', 'normalizeReportsPreviewQuery'],
  ['contracts/contractPerformanceQuery.ts', 'normalizeContractPerformanceQuery'],
  ['business-plan/businessPlanPreviewQuery.ts', 'normalizeBusinessPlanPreviewQuery'],
  ['business-plan-performance/businessPlanPerformancePreviewQuery.ts', 'normalizeBusinessPlanPerformancePreviewQuery'],
  ['cost-plan/costPlanPreviewQuery.ts', 'normalizeCostPlanPreviewQuery'],
]) {
  const querySource = fs.readFileSync(new URL(`../apps/web/crm/src/components/pages/${file}`, import.meta.url), 'utf8');
  const queryContext = vm.createContext({ exports: {}, URL, URLSearchParams });
  vm.runInContext(ts.transpileModule(querySource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, queryContext);
  check(queryContext.exports[normalize]('/?region=unspecified').region, 'unspecified', `${file} preserves unspecified selection`);
}
console.log(`[crm-source-form] ${checks} editor regression checks passed.`);
