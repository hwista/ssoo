import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const requirePms = createRequire(new URL('apps/web/pms/package.json', root));
const zod = requirePms('zod');
function loadSchema(name, imports = {}) {
  const source = fs.readFileSync(new URL(`apps/web/pms/src/lib/validations/${name}.ts`, root), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`)(id => {
    if (id === 'zod') return zod;
    if (id === './zod') return configuredZod;
    if (id in imports) return imports[id];
    throw new Error(`Unexpected schema import: ${id}`);
  }, module, module.exports);
  return module.exports;
}
const configuredZod = loadSchema('zod');
assert.equal(configuredZod.z.config().jitless, true);
let dynamicCodeCalls = 0;
const originalFunction = globalThis.Function;
try {
  globalThis.Function = function () { dynamicCodeCalls += 1; throw new Error('CSP disallows dynamic code'); };
  assert.deepEqual(configuredZod.z.object({ value: configuredZod.z.string() }).parse({ value: 'valid' }), { value: 'valid' });
} finally { globalThis.Function = originalFunction; }
assert.equal(dynamicCodeCalls, 0, 'Validation must not probe or use dynamic code under CSP');
const common = loadSchema('common');
const auth = loadSchema('auth', { './common': common });
const project = loadSchema('project', { './common': common });
const plain = value => JSON.parse(JSON.stringify(value));

for (const [schema, message] of [[common.requiredString, '필수 입력입니다.'], [common.requiredEmail, '이메일을 입력하세요.'], [common.requiredDate, '날짜를 선택하세요.'], [common.requiredSelect, '선택하세요.']]) {
  for (const value of [undefined, '']) {
    const result = schema.safeParse(value);
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, message);
  }
}
assert.equal(common.requiredPositiveNumber.safeParse(undefined).error.issues[0].message, '숫자를 입력하세요.');
assert.equal(common.requiredPositiveNumber.safeParse(-1).success, false);
assert.equal(common.optionalString.parse(''), undefined);
assert.equal(common.emailField.parse(''), undefined);
assert.equal(common.requiredEmail.safeParse('not-an-email').success, false);
assert.equal(common.requiredEmail.parse('operator@example.com'), 'operator@example.com');
assert.equal(common.amountField.parse(null), undefined);
assert.equal(common.amountField.parse(0), 0);
assert.equal(common.dateField.safeParse('wrong').success, false);
assert.deepEqual(plain(project.createProjectSchema.parse({ projectName: '검증 프로젝트' })), { projectName: '검증 프로젝트', statusCode: 'request', stageCode: 'waiting' });
// Omitted update fields must never reset an existing project's status or stage.
assert.deepEqual(plain(project.updateProjectSchema.parse({})), {});
assert.deepEqual(plain(project.updateProjectSchema.parse({ description: '변경' })), { description: '변경' });
assert.equal(project.projectStatusCodeSchema.safeParse('invalid').error.issues[0].message, '유효한 상태를 선택하세요.');
assert.equal(project.projectStageCodeSchema.safeParse('invalid').error.issues[0].message, '유효한 단계를 선택하세요.');
assert.equal(project.projectDoneResultCodeSchema.safeParse('invalid').error.issues[0].message, '유효한 결과를 선택하세요.');
assert.equal(project.createProjectSchema.safeParse({ projectName: 'x'.repeat(201) }).success, false);
const mismatch = auth.changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'NewPassword123!', confirmPassword: 'different' });
assert.equal(mismatch.success, false);
assert.equal(mismatch.error.issues[0].message, '비밀번호가 일치하지 않습니다.');
assert.deepEqual(plain(mismatch.error.issues[0].path), ['confirmPassword']);
const { zodResolver } = requirePms('@hookform/resolvers/zod');
const resolver = zodResolver(auth.loginSchema);
const invalid = await resolver({ loginId: '', password: '' }, {}, { criteriaMode: 'firstError', shouldUseNativeValidation: false, fields: {} });
assert.equal(invalid.errors.loginId.message, '필수 입력입니다.');
assert.equal(invalid.errors.password.message, '필수 입력입니다.');
const valid = await resolver({ loginId: 'operator', password: 'test-only' }, {}, { criteriaMode: 'firstError', shouldUseNativeValidation: false, fields: {} });
assert.deepEqual(plain(valid.values), { loginId: 'operator', password: 'test-only' });
assert.deepEqual(plain(valid.errors), {});
// Stage forms submit parsed values, including optional blanks, numeric IDs and a coerced version.
for (const [schema, values, expected] of [
  [project.upsertRequestDetailSchema, { requestOwnerUserId: 12, requestReceivedAt: '', memo: '요청' }, { requestOwnerUserId: 12, memo: '요청' }],
  [project.upsertProposalDetailSchema, { proposalVersion: '2', proposalDueAt: '', proposalSubmittedAt: '', decisionDeadlineAt: '', memo: '제안' }, { proposalVersion: 2, memo: '제안' }],
  [project.upsertExecutionDetailSchema, { nextProjectId: 42, deliveryMethodCode: '', contractSignedAt: '', memo: '수행' }, { nextProjectId: 42, memo: '수행' }],
  [project.upsertTransitionDetailSchema, { operationOwnerUserId: 12, operationStartAt: '', operationReservedAt: '', transitionDueAt: '', memo: '전환' }, { operationOwnerUserId: 12, memo: '전환' }],
]) {
  const result = await zodResolver(schema)(values, {}, { criteriaMode: 'firstError', shouldUseNativeValidation: false, fields: {} });
  assert.deepEqual(plain(result.errors), {});
  assert.deepEqual(plain(result.values), expected);
  assert.equal(schema.safeParse({ memo: 'x'.repeat(2001) }).success, false);
}
// The upstream collection fix must reject the bound before walking invalid elements.
let parsedElements = 0;
const bounded = zod.z.array(zod.z.unknown().transform(value => { parsedElements += 1; return value; })).max(2);
assert.equal(bounded.safeParse([1, 2, 3]).success, false);
assert.equal(parsedElements, 0);
console.log('[pms-validation] CSP-safe parsing, required messages, optional values, create/update semantics, password confirmation, stage form resolvers and collection bound passed');
