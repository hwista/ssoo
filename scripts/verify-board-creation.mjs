import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(new URL('../apps/web/sns/src/lib/validations/board.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { toCreateBoardInput, BOARD_TYPES } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const valid = { boardCode: 'board', boardName: '게시판', boardType: 'general', description: '' };
const results = [];
function check(name, run) { run(); results.push({ name, passed: true }); }
check('trim mandatory fields and omit optional blank description', () => {
  assert.deepEqual(toCreateBoardInput({ ...valid, boardCode: ' board ', boardName: ' 게시판 ', description: '   ' }), { ...valid, description: undefined });
});
for (const field of ['boardCode', 'boardName']) {
  check(`reject blank ${field}`, () => assert.throws(() => toCreateBoardInput({ ...valid, [field]: '  ' })));
}
for (const [field, max] of [['boardCode', 50], ['boardName', 200], ['description', 1000]]) {
  check(`${field} exact limit passes and excess fails`, () => {
    assert.equal(toCreateBoardInput({ ...valid, [field]: '가'.repeat(max) })[field].length, max);
    assert.throws(() => toCreateBoardInput({ ...valid, [field]: '가'.repeat(max + 1) }));
  });
}
check('four offered types pass; unknown or blank type fails', () => {
  assert.equal(BOARD_TYPES.length, 4);
  for (const { value } of BOARD_TYPES) assert.equal(toCreateBoardInput({ ...valid, boardType: value }).boardType, value);
  for (const value of ['', 'unknown']) assert.throws(() => toCreateBoardInput({ ...valid, boardType: value }));
});
check('validation leaves original draft unchanged for retry', () => {
  const draft = { ...valid, boardCode: '  ', description: '  입력 유지  ' };
  const before = { ...draft };
  assert.throws(() => toCreateBoardInput(draft));
  assert.deepEqual(draft, before);
});
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
