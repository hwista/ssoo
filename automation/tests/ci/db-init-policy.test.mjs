import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDbInitPolicy } from '../../../packages/database/scripts/db-init-policy.mjs';

const fixture = {
  tableCount: 0, databaseUrl: 'postgresql://user:secret@postgres/ssoo_local_test',
  baselineMode: 'compat', nodeEnv: 'development',
};
test('existing DB defaults to upgrade, including pre-baseline compatibility DBs', () => {
  assert.equal(assertDbInitPolicy({ ...fixture, tableCount: 100 }), 'upgrade');
  assert.equal(assertDbInitPolicy({ ...fixture, tableCount: 100, baselineMode: 'strict' }), 'upgrade');
  assert.throws(() => assertDbInitPolicy(fixture), /Empty database/u);
});
test('reference bootstrap is explicit and only allowed before application tables exist', () => {
  assert.equal(assertDbInitPolicy({ ...fixture, mode: 'bootstrap', baselineMode: 'strict' }), 'bootstrap');
  assert.throws(() => assertDbInitPolicy({ ...fixture, mode: 'bootstrap', tableCount: 1 }), /empty database/u);
});
test('demo provisioning is local, disposable, empty and forbidden under production/strict modes', () => {
  assert.equal(assertDbInitPolicy({ ...fixture, mode: 'demo' }), 'demo');
  for (const overrides of [
    { tableCount: 1 }, { baselineMode: 'strict' }, { nodeEnv: 'production' },
    { databaseUrl: 'postgresql://user:secret@remote/ssoo_test' },
    { databaseUrl: 'postgresql://user:secret@postgres/ssoo_prod' },
    { databaseUrl: 'invalid-secret-url' },
  ]) {
    assert.throws(() => assertDbInitPolicy({ ...fixture, mode: 'demo', ...overrides }),
      (error) => error instanceof Error && !error.message.includes('secret'));
  }
});
test('invalid modes/counts fail closed', () => {
  for (const mode of ['auto', 'all', '', 'DEMO']) {
    assert.throws(() => assertDbInitPolicy({ ...fixture, mode }), /DB_INIT_SEED_MODE/u);
  }
  for (const tableCount of ['', -1, undefined, 'NaN']) {
    assert.throws(() => assertDbInitPolicy({ ...fixture, tableCount }), /count is invalid/u);
  }
});
