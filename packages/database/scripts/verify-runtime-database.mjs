import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';
import {
  applicationSchemas,
  assertMigrationHistory,
  assertNativeContract,
  assertTriggerContract,
  readMigrationContract,
  readTriggerContract,
} from './launch-database-contract.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaBin = path.join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const databaseUrl = process.env.DATABASE_URL;
const phaseArgument = process.argv.slice(2).find((argument) => argument.startsWith('--phase='));
const phase = phaseArgument?.slice('--phase='.length) ?? 'full';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Runtime database verification has no implicit target.');
}
if (!['schema', 'full'].includes(phase)) {
  throw new Error(`Invalid runtime database verification phase: ${phase}`);
}

function runPrisma(args, { acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(prismaBin, args, {
      cwd: packageRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const output = chunk.toString();
      stdout += output;
      process.stdout.write(output);
    });
    child.stderr.on('data', (chunk) => {
      const output = chunk.toString();
      stderr += output;
      process.stderr.write(output);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const exitCode = code ?? 1;
      if (!acceptedExitCodes.includes(exitCode)) {
        reject(new Error(`Prisma command failed (${args.join(' ')}), exit=${exitCode}\n${stderr}`));
        return;
      }
      resolve({ code: exitCode, stdout, stderr });
    });
  });
}

const migrations = readMigrationContract(packageRoot);
const expectedTriggers = phase === 'full' ? readTriggerContract(packageRoot, migrations) : [];
const client = new Client({ connectionString: databaseUrl });
let databaseName = '<unknown>';

await client.connect();
try {
  const identity = await client.query(
    `SELECT current_database() AS database_name,
            to_regclass('public._prisma_migrations') IS NOT NULL AS migration_table_exists`,
  );
  databaseName = identity.rows[0]?.database_name ?? databaseName;
  if (identity.rows[0]?.migration_table_exists !== true) {
    throw new Error('Runtime database is pre-baseline: public._prisma_migrations is missing.');
  }

  const migrationHistory = await client.query(
    `SELECT migration_name, checksum, finished_at, rolled_back_at
       FROM public._prisma_migrations
      ORDER BY started_at`,
  );
  assertMigrationHistory(migrations, migrationHistory.rows);

  const nativeContract = await client.query(
    `SELECT
       to_regclass('dms.dm_chat_session_m') IS NOT NULL AS chat_session_table_exists,
       to_regclass('crm.crm_business_plan_performance_actual_d') IS NOT NULL AS performance_table_exists,
       to_regclass('crm.crm_report_confirmation_m') IS NOT NULL AS confirmation_table_exists,
       (
         SELECT COUNT(*) = 10
           FROM pg_constraint
          WHERE conname IN (
            'ck_dm_chat_session_m_messages_array',
            'ck_pr_project_closeout_approval_step_m_target_type',
            'ck_pr_project_closeout_approval_step_m_status',
            'ck_pr_project_closeout_approval_step_m_sequence',
            'ck_pr_task_effort_log_m_actual_hours',
            'ck_pr_legacy_issue_archive_m_reason',
            'ck_crm_contract_approval_actor',
            'ck_crm_contract_approval_state',
            'ck_crm_contract_approval_reason',
            'ck_pr_user_settings_view'
          )
       ) AS native_checks_exist,
       (
         SELECT COUNT(*) = 7
           FROM pg_indexes
          WHERE indexname IN (
            'ux_crm_report_confirmation_m_active_basis',
            'ux_pr_project_closeout_approval_step_m_sequence',
            'ux_crm_business_plan_m_confirmed_year',
            'ux_crm_contract_dms_handoff_m_active_contract_template',
            'ux_crm_quote_dms_handoff_m_active_opportunity_template',
            'ux_crm_cost_plan_accounting_handoff_m_active_basis',
            'ux_crm_contract_approval_pending'
          )
       ) AS native_partial_indexes_exist,
       EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'crm'
            AND table_name = 'crm_cost_plan_accounting_handoff_m'
            AND column_name = 'execution_evidence_snapshot'
       ) AS execution_evidence_column_exists,
       (
         SELECT COUNT(*) = 4
           FROM information_schema.columns
          WHERE table_schema = 'crm'
            AND (
              (table_name = 'crm_contract_m' AND column_name IN ('client_contact', 'owner_user_id'))
              OR (table_name = 'crm_contract_h' AND column_name IN ('client_contact', 'owner_user_id'))
            )
       ) AS contract_party_columns_exist,
       EXISTS (
         SELECT 1
           FROM pg_constraint
          WHERE conname = 'fk_crm_contract_m_owner_user'
            AND conrelid = 'crm.crm_contract_m'::regclass
            AND confrelid = 'common.cm_user_m'::regclass
            AND confdeltype = 'n'
            AND confupdtype = 'c'
       ) AS contract_owner_fk_exists,
       to_regclass('crm.ix_crm_contract_m_owner_user') IS NOT NULL
         AS contract_owner_index_exists`,
  );
  assertNativeContract(nativeContract.rows[0]);

  if (phase === 'full') {
    const triggers = await client.query(
      `SELECT schema_contract.nspname AS schema_name,
              table_contract.relname AS table_name,
              trigger_contract.tgname AS trigger_name,
              trigger_contract.tgenabled = 'O' AS enabled
         FROM pg_trigger trigger_contract
         JOIN pg_class table_contract ON table_contract.oid = trigger_contract.tgrelid
         JOIN pg_namespace schema_contract ON schema_contract.oid = table_contract.relnamespace
        WHERE NOT trigger_contract.tgisinternal
          AND schema_contract.nspname = ANY($1::text[])
        ORDER BY trigger_contract.tgname`,
      [applicationSchemas],
    );
    assertTriggerContract(expectedTriggers, triggers.rows);
  }
} finally {
  await client.end();
}

await runPrisma(['migrate', 'status', '--config', 'prisma.launch.config.ts']);
const diff = await runPrisma(
  [
    'migrate',
    'diff',
    '--from-schema-datasource',
    'prisma/schema.prisma',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--exit-code',
  ],
  { acceptedExitCodes: [0, 2] },
);
if (diff.code === 2) {
  throw new Error('Runtime database has schema drift from prisma/schema.prisma.');
}

console.log(
  `[db-runtime] release-ready database contract passed: database=${databaseName}, `
    + `phase=${phase}, migrations=${migrations.length}, `
    + `triggers=${phase === 'full' ? expectedTriggers.length : 'deferred'}, schema-drift=0`,
);
