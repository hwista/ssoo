import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { assertDisposableDbPushTarget } from './db-push-target.mjs';
import {
  assertMigrationHistory,
  assertNativeContract,
  assertTriggerContract,
  extractCreateTriggerContracts,
  extractCreateTriggerNames,
  readMigrationContract,
  readTriggerContract,
} from './launch-database-contract.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const expectedMigrations = [
  { name: '0_launch_baseline', checksum: 'baseline-checksum' },
  { name: '20260720010000_add_launch_native_constraints', checksum: 'native-checksum' },
  { name: '20260722090000_remove_sharepoint_storage_provider', checksum: 'storage-checksum' },
  { name: '20260813090000_add_crm_launch_operations', checksum: 'crm-operations-checksum' },
  { name: '20260813100000_add_crm_business_plan_source_parity', checksum: 'crm-business-plan-parity-checksum' },
  { name: '20260813110000_add_crm_internal_cost_source_grid', checksum: 'crm-internal-cost-source-checksum' },
  { name: '20260813120000_add_crm_ams_source_workspace', checksum: 'crm-ams-source-checksum' },
  { name: '20260814090000_add_crm_contract_party_identity', checksum: 'crm-contract-party-checksum' },
  { name: '20260814100000_add_crm_opportunity_contract_document', checksum: 'crm-opportunity-contract-document-checksum' },
];
const validHistory = expectedMigrations.map((migration) => ({
  migration_name: migration.name,
  checksum: migration.checksum,
  finished_at: new Date('2026-07-20T00:00:00Z'),
  rolled_back_at: null,
}));

test('TC-DB-01: accepts the exact completed launch migration history', () => {
  assert.doesNotThrow(() => assertMigrationHistory(expectedMigrations, validHistory));
});

test('TC-DB-02: rejects missing, unexpected, incomplete, and changed migrations', () => {
  assert.throws(
    () => assertMigrationHistory(expectedMigrations, [
      { ...validHistory[0], checksum: 'changed' },
      {
        migration_name: 'unexpected',
        checksum: 'unexpected',
        finished_at: null,
        rolled_back_at: null,
      },
    ]),
    /missing=.*native_constraints,.*remove_sharepoint_storage_provider,.*crm_launch_operations,.*crm_business_plan_source_parity,.*crm_internal_cost_source_grid,.*crm_ams_source_workspace,.*crm_contract_party_identity,.*crm_opportunity_contract_document; unexpected=unexpected; incomplete=unexpected; checksum-mismatch=0_launch_baseline/u,
  );
});

test('TC-DB-03: accepts only the exact enabled trigger contract', () => {
  assert.doesNotThrow(() => assertTriggerContract(
    [
      { schema: 'common', table: 'table_a', name: 'trg_a' },
      { schema: 'pms', table: 'table_b', name: 'trg_b' },
    ],
    [
      { schema_name: 'common', table_name: 'table_a', trigger_name: 'trg_a', enabled: true },
      { schema_name: 'pms', table_name: 'table_b', trigger_name: 'trg_b', enabled: true },
    ],
  ));
  assert.throws(
    () => assertTriggerContract(
      [
        { schema: 'common', table: 'table_a', name: 'trg_a' },
        { schema: 'pms', table: 'table_b', name: 'trg_b' },
      ],
      [
        { schema_name: 'common', table_name: 'table_a', trigger_name: 'trg_a', enabled: false },
        { schema_name: 'pms', table_name: 'table_extra', trigger_name: 'trg_extra', enabled: true },
      ],
    ),
    /missing=pms\.table_b\.trg_b; unexpected=pms\.table_extra\.trg_extra; disabled=common\.table_a\.trg_a/u,
  );
});

test('TC-DB-04: rejects an incomplete native database contract', () => {
  assert.doesNotThrow(() => assertNativeContract({ check_a: true, check_b: true }));
  assert.throws(
    () => assertNativeContract({ check_a: true, check_b: false }),
    /check_b/u,
  );
});

test('TC-DB-05: extracts quoted and unquoted trigger names', () => {
  assert.deepEqual(
    extractCreateTriggerNames('CREATE TRIGGER trg_a AFTER INSERT; CREATE TRIGGER "trg_b" AFTER UPDATE;'),
    ['trg_a', 'trg_b'],
  );
  assert.deepEqual(
    extractCreateTriggerContracts(
      'CREATE TRIGGER trg_a AFTER INSERT ON common.table_a; '
        + 'CREATE TRIGGER "trg_b" AFTER UPDATE ON "pms"."table_b";',
    ),
    [
      { name: 'trg_a', schema: 'common', table: 'table_a' },
      { name: 'trg_b', schema: 'pms', table: 'table_b' },
    ],
  );
});

test('TC-DB-06: repository launch migrations and triggers form the expected contract', () => {
  const migrations = readMigrationContract(packageRoot);
  const triggers = readTriggerContract(packageRoot, migrations);
  assert.deepEqual(
    migrations.map((migration) => migration.name),
    [
      '0_launch_baseline',
      '20260720010000_add_launch_native_constraints',
      '20260722090000_remove_sharepoint_storage_provider',
      '20260813090000_add_crm_launch_operations',
      '20260813100000_add_crm_business_plan_source_parity',
      '20260813110000_add_crm_internal_cost_source_grid',
      '20260813120000_add_crm_ams_source_workspace',
      '20260814090000_add_crm_contract_party_identity',
      '20260814100000_add_crm_opportunity_contract_document',
      '20260820090000_add_dms_home_hub',
      '20260917090000_add_crm_contract_approval',
      '20260917100000_add_pms_user_settings',
    ],
  );
  assert.equal(triggers.length, 84);
  assert.ok(triggers.some((trigger) => trigger.name === 'trg_crm_contract_m_h_record'));
  assert.ok(triggers.some((trigger) => trigger.name === 'trg_crm_contract_approval_m_h_record'));
  assert.ok(triggers.some((trigger) => trigger.name === 'trg_crm_config_m_h_record'));
  assert.ok(triggers.some((trigger) => trigger.name === 'trg_crm_operation_attempt_m_h_record'));
  assert.ok(triggers.some((trigger) => trigger.name === 'trg_dm_user_document_activity_h'));
});

test('TC-DB-07: runtime verification is wired into managed init, production, and CI', () => {
  const dbInit = fs.readFileSync(path.join(repoRoot, 'scripts', 'db-init-entrypoint.sh'), 'utf8');
  const productionCompose = fs.readFileSync(path.join(repoRoot, 'compose.production.yaml'), 'utf8');
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'pr-validation.yml'), 'utf8');

  assert.match(dbInit, /DB_INIT_BASELINE_MODE/u);
  assert.match(dbInit, /db:runtime:verify -- --phase=schema/u);
  assert.match(dbInit, /pnpm --filter @ssoo\/database db:runtime:verify\n/u);
  assert.match(productionCompose, /DB_INIT_BASELINE_MODE: strict/u);
  assert.match(workflow, /pnpm db:runtime:verify/u);
});

test('TC-DB-08: db push accepts existing local development targets', () => {
  assert.deepEqual(
    assertDisposableDbPushTarget({
      databaseUrl: 'postgresql://user:secret@localhost:5432/ssoo_dev?schema=public',
      nodeEnv: 'development',
      baselineMode: 'compat',
    }),
    { databaseName: 'ssoo_dev', host: 'localhost' },
  );
  assert.doesNotThrow(() => assertDisposableDbPushTarget({
    databaseUrl: 'postgresql://user:secret@postgres:5432/ssoo_launch_candidate?schema=public',
    baselineMode: 'compat',
  }));
});

test('TC-DB-09: db push rejects production modes and non-disposable targets without exposing credentials', () => {
  const secret = 'never-print-this-password';
  for (const fixture of [
    {
      databaseUrl: `postgresql://user:${secret}@postgres:5432/ssoo_dev`,
      baselineMode: 'strict',
    },
    {
      databaseUrl: `postgresql://user:${secret}@10.10.10.10:5432/ssoo_dev`,
      baselineMode: 'compat',
    },
    {
      databaseUrl: `postgresql://user:${secret}@localhost:5432/ssoo_prod`,
      baselineMode: 'compat',
    },
  ]) {
    assert.throws(
      () => assertDisposableDbPushTarget(fixture),
      (error) => error instanceof Error && !error.message.includes(secret),
    );
  }
});
