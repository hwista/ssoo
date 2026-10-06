import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = `ssoo_test_common_code_${process.pid}_${Date.now()}`;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the disposable migration test.');
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/postgres';
adminUrl.searchParams.delete('schema');
const targetUrl = new URL(adminUrl);
targetUrl.pathname = `/${name}`;
const admin = new Client({ connectionString: adminUrl.toString() });
const db = new Client({ connectionString: targetUrl.toString() });
const latest = '20260930100000_move_common_codes';
const migrations = path.join(root, 'prisma/launch-migrations');
const migration = fs.readFileSync(path.join(migrations, latest, 'migration.sql'), 'utf8');
const trigger = fs.readFileSync(path.join(root, 'prisma/triggers/01_cm_code_h_trigger.sql'), 'utf8');
let created = false;

async function snapshot(schema) {
  assert.ok(['pms', 'common'].includes(schema));
  return {
    master: (await db.query(`SELECT * FROM ${schema}.cm_code_m ORDER BY code_id`)).rows,
    history: (await db.query(`SELECT * FROM ${schema}.cm_code_h ORDER BY code_id, history_seq`)).rows,
    tables: (await db.query(`SELECT c.relname, c.oid, c.relowner FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND c.relname IN ('cm_code_m','cm_code_h') ORDER BY c.relname`, [schema])).rows,
    sequence: (await db.query(`SELECT last_value, is_called FROM ${schema}.cm_code_m_code_id_seq`)).rows,
    indexes: (await db.query(`SELECT i.indexrelid, c.relname FROM pg_index i
      JOIN pg_class c ON c.oid=i.indexrelid
      WHERE i.indrelid IN ('${schema}.cm_code_m'::regclass,'${schema}.cm_code_h'::regclass)
      ORDER BY c.relname`)).rows,
  };
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  await db.connect();
  for (const entry of fs.readdirSync(migrations).sort()) {
    if (entry >= latest || !fs.statSync(path.join(migrations, entry)).isDirectory()) continue;
    await db.query(fs.readFileSync(path.join(migrations, entry, 'migration.sql'), 'utf8'));
  }
  // Recreate the deployed, pre-move history function and trigger.
  await db.query(trigger.replaceAll('common.cm_code_', 'pms.cm_code_'));
  await db.query(`INSERT INTO pms.cm_code_m
    (code_group,code_value,display_name_ko,display_name_en,parent_code,description,sort_order,is_active,
     memo,created_by,updated_by,last_source,last_activity,transaction_id)
    VALUES ('PROJECT_MEMBER_ROLE','owner','담당자','Owner','root','PMS meaning',17,true,
            'preserve all fields',42,43,'migration-test','seed','11111111-1111-1111-1111-111111111111'),
           ('payment_term','monthly','월별','Monthly',NULL,'CRM meaning',9,false,NULL,44,45,NULL,NULL,NULL),
           ('UNIT','hour','시간',NULL,NULL,'Shared unit',3,true,NULL,42,42,NULL,NULL,NULL),
           ('deleted_fixture','gone','삭제된 코드',NULL,NULL,NULL,0,false,NULL,42,42,NULL,NULL,NULL)`);
  await db.query("UPDATE pms.cm_code_m SET display_name_ko='프로젝트 담당자' WHERE code_group='PROJECT_MEMBER_ROLE'");
  await db.query("DELETE FROM pms.cm_code_m WHERE code_group='deleted_fixture'");
  await db.query("SELECT setval('pms.cm_code_m_code_id_seq',9007199254740993,true)");
  const before = await snapshot('pms');

  // A destination collision must roll back the earlier master-table move as well.
  await db.query('CREATE TABLE common.cm_code_h (sentinel integer)');
  await assert.rejects(db.query(migration), /already exists/);
  await db.query('ROLLBACK');
  assert.deepEqual(await snapshot('pms'), before);
  assert.equal((await db.query("SELECT to_regclass('common.cm_code_m') AS target")).rows[0].target, null);
  await db.query('DROP TABLE common.cm_code_h');

  await db.query(migration);
  assert.deepEqual(await snapshot('common'), before);
  const retired = (await db.query(`SELECT to_regclass('pms.cm_code_m') AS master,
    to_regclass('pms.cm_code_h') AS history, to_regclass('pms.cm_code_m_code_id_seq') AS sequence`)).rows[0];
  assert.deepEqual(retired, { master: null, history: null, sequence: null });

  // Test the existing trigger immediately after migration, before reinstalling it.
  const id = (await db.query(`INSERT INTO common.cm_code_m
    (code_group,code_value,display_name_ko,created_by,updated_by)
    VALUES ('payment_term','quarterly','분기별',42,42) RETURNING code_id`)).rows[0].code_id;
  assert.equal(id, '9007199254740994');
  await db.query('UPDATE common.cm_code_m SET is_active=false,updated_by=43 WHERE code_id=$1', [id]);
  await db.query('DELETE FROM common.cm_code_m WHERE code_id=$1', [id]);
  const events = (await db.query('SELECT event_type,updated_by FROM common.cm_code_h WHERE code_id=$1 ORDER BY history_seq', [id])).rows;
  assert.deepEqual(events, [{ event_type: 'C', updated_by: '42' }, { event_type: 'U', updated_by: '43' }, { event_type: 'D', updated_by: '43' }]);
  await assert.rejects(db.query("INSERT INTO common.cm_code_m(code_group,code_value,display_name_ko) VALUES ('payment_term','monthly','중복')"), { code: '23505', constraint: 'cm_code_m_code_group_code_value_key' });
  await assert.rejects(db.query("INSERT INTO common.cm_code_m(code_group,code_value,display_name_ko) VALUES ('biz_year','2030','2030년')"), /ck_cm_code_no_crm_business_year/);
  await db.query(trigger);
  await db.query(trigger);
  await db.query("UPDATE common.cm_code_m SET memo='after trigger reinstall' WHERE code_group='UNIT'");
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM pg_trigger
    WHERE tgrelid='common.cm_code_m'::regclass AND NOT tgisinternal`)).rows[0].n, 1);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM common.cm_code_h
    WHERE code_group='UNIT' AND event_type='U' AND memo='after trigger reinstall'`)).rows[0].n, 1);
  console.log('[common-code-migration] PASS: values/full history/table and index identities/sequence preserved; collision rollback; immediate CRUD audit; uniqueness/year ownership; idempotent trigger installation');
} finally {
  await db.end().catch(() => {});
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
