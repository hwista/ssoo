import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = `ssoo_test_crm_year_${process.pid}_${Date.now()}`;
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/postgres'; adminUrl.searchParams.delete('schema');
const targetUrl = new URL(adminUrl); targetUrl.pathname = `/${name}`;
const admin = new Client({ connectionString: adminUrl.toString() });
const db = new Client({ connectionString: targetUrl.toString() });
const migrations = path.join(root, 'prisma/launch-migrations');
const latest = '20260930090000_move_crm_business_years';
const sql = fs.readFileSync(path.join(migrations, latest, 'migration.sql'), 'utf8');
let created = false;
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${name}"`); created = true; await db.connect();
  for (const entry of fs.readdirSync(migrations).sort()) {
    if (entry >= latest || !fs.statSync(path.join(migrations, entry)).isDirectory()) continue;
    await db.query(fs.readFileSync(path.join(migrations, entry, 'migration.sql'), 'utf8'));
  }
  // This test intentionally recreates the pre-platform-move trigger on the legacy schema.
  await db.query(fs.readFileSync(path.join(root, 'prisma/triggers/01_cm_code_h_trigger.sql'), 'utf8').replaceAll('common.cm_code_', 'pms.cm_code_'));
  await db.query(`INSERT INTO pms.cm_code_m (code_group,code_value,display_name_ko,display_name_en,parent_code,sort_order,is_active,memo,created_by,updated_by)
    VALUES ('biz_year','2024','2024 회계연도','FY2024','legacy-parent',17,false,'preserve inactive',42,43),
           ('biz_year','2026','2026년',NULL,NULL,23,true,'preserve active',42,44),
           ('unrelated','keep','유지',NULL,NULL,1,true,'unrelated',42,43)`);
  const before = (await db.query("SELECT * FROM pms.cm_code_m WHERE code_group='biz_year' ORDER BY code_value")).rows;
  const historyBefore = (await db.query("SELECT * FROM pms.cm_code_h WHERE code_group='biz_year' ORDER BY code_id,history_seq")).rows;
  // Invalid input must roll back the entire move, leaving both master and history intact.
  await db.query("INSERT INTO pms.cm_code_m (code_group,code_value,display_name_ko) VALUES ('biz_year','invalid','invalid')");
  await assert.rejects(db.query(sql), /four-digit legacy years/);
  await db.query('ROLLBACK');
  assert.equal((await db.query("SELECT to_regclass('crm.crm_business_year_m') AS name")).rows[0].name, null);
  assert.equal((await db.query("SELECT count(*)::int n FROM pms.cm_code_m WHERE code_group='biz_year'")).rows[0].n, 3);
  await db.query("DELETE FROM pms.cm_code_m WHERE code_group='biz_year' AND code_value='invalid'");
  await db.query("DELETE FROM pms.cm_code_h WHERE code_group='biz_year' AND code_value='invalid'");
  // Pre-baseline installations rely on Prisma for updated_at instead of a DB default.
  await db.query("INSERT INTO common.cm_role_m (role_code,role_name) VALUES ('admin','관리자') ON CONFLICT (role_code) DO NOTHING");
  await db.query('ALTER TABLE common.cm_permission_m ALTER COLUMN updated_at DROP DEFAULT');
  await db.query('ALTER TABLE common.cm_role_permission_r ALTER COLUMN updated_at DROP DEFAULT');
  await db.query(sql);
  assert.equal((await db.query("SELECT count(*)::int n FROM common.cm_role_permission_r r JOIN common.cm_permission_m p USING(permission_id) WHERE p.permission_code IN ('crm.business-year.read','crm.business-year.manage') AND r.updated_at IS NOT NULL AND p.updated_at IS NOT NULL")).rows[0].n, 2);
  const after = (await db.query('SELECT * FROM crm.crm_business_year_m ORDER BY year')).rows;
  assert.equal(after.length, before.length);
  for (let i=0;i<before.length;i++) {
    const a=after[i], b=before[i];
    assert.equal(a.business_year_id,b.code_id); assert.equal(a.year,Number(b.code_value));
    assert.equal(a.display_name,b.display_name_ko);
    for(const key of ['sort_order','is_active','memo','created_by','updated_by','last_source','last_activity','transaction_id']) assert.deepEqual(a[key],b[key],key);
    for(const key of ['created_at','updated_at']) assert.equal(a[key].toISOString(),b[key].toISOString(),key);
  }
  const histories=(await db.query('SELECT * FROM crm.crm_business_year_h ORDER BY business_year_id,history_seq')).rows;
  for(const old of historyBefore) {
    const migrated=histories.find(h=>h.business_year_id===old.code_id&&h.history_seq===old.history_seq);
    assert.ok(migrated);assert.equal(migrated.legacy_snapshot.display_name_en,old.display_name_en);assert.equal(migrated.legacy_snapshot.parent_code,old.parent_code);
  }
  assert.equal((await db.query("SELECT count(*)::int n FROM pms.cm_code_m WHERE code_group='biz_year'")).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM pms.cm_code_h WHERE code_group='biz_year'")).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM pms.cm_code_m WHERE code_group='unrelated'")).rows[0].n,1);
  await assert.rejects(db.query("INSERT INTO pms.cm_code_m (code_group,code_value,display_name_ko) VALUES ('biz_year','2030','2030년')"), /ck_cm_code_no_crm_business_year/);
  await assert.rejects(db.query("INSERT INTO crm.crm_business_year_m(year,display_name) VALUES (1999,'1999년')"),/ck_crm_business_year_range/);
  const id=(await db.query("INSERT INTO crm.crm_business_year_m(year,display_name,updated_by) VALUES (2031,'2031년',42) RETURNING business_year_id")).rows[0].business_year_id;
  assert.ok(BigInt(id)>BigInt(after.at(-1).business_year_id));
  await db.query('UPDATE crm.crm_business_year_m SET is_active=false WHERE business_year_id=$1',[id]);
  await db.query('DELETE FROM crm.crm_business_year_m WHERE business_year_id=$1',[id]);
  assert.deepEqual((await db.query('SELECT event_type FROM crm.crm_business_year_h WHERE business_year_id=$1 ORDER BY history_seq',[id])).rows.map(r=>r.event_type),['C','U','D']);
  console.log('[crm-business-year-migration] PASS: populated values/audit metadata/history preserved, invalid input rollback, old-code rejection, range and CRUD history verified');
} finally {
  await db.end().catch(()=>{});
  if(created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
