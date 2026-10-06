import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const source = fs.readFileSync(new URL('../apps/web/crm/src/lib/sourceOpportunityTotals.ts', import.meta.url), 'utf8');
vm.runInNewContext(`(function(module,exports){${ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`, {})(module, module.exports);
const { getSourceOpportunityRevenue, getSourceOpportunityCost, formatSourceListAmount } = module.exports;
const fixture = {
  revenueLines: [{ quantity: 3, unitPrice: 12345, amount: 37000 }, { quantity: 0.5, unitPrice: 123, amount: 60 }],
  costLines: [{ quantity: 1, unitPrice: 1234, amount: 1000 }, { quantity: 1, unitPrice: 2345, amount: 2000 }, { quantity: 1, unitPrice: 3456, amount: 3000 }],
};
assert.equal(getSourceOpportunityRevenue(fixture), 37096.5, 'revenue ignores stored truncation');
assert.equal(getSourceOpportunityCost(fixture), 7035, 'all cost categories ignore stored truncation');
assert.equal(getSourceOpportunityRevenue({ revenueLines: [] }), 0);
assert.equal(getSourceOpportunityCost({ costLines: [] }), 0);
for (const [value, expected] of [[0, '0만'], [100, '0.01만'], [6172.5, '0.617만'], [37096.5, '3.71만'], [99999999, '10,000만'], [100000000, '1.0억'], [-100, '-0.01만'], [-100000000, '-1.0억']]) assert.equal(formatSourceListAmount(value), expected);
console.log('[crm-source-list] 12 raw calculation and source-unit formatting checks passed.');
