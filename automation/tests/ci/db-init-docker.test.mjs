#!/usr/bin/env node
// Opt-in actual db-init image + private PostgreSQL test. No published ports or live DB writes.
// node automation/tests/ci/db-init-docker.test.mjs --run --image <built-db-init-image> [--dump <managed-dump>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

if (!process.argv.includes('--run')) {
  console.log('Opt-in db-init integration: --run --image <built-db-init-image> [--dump <managed-dump>]. No Docker actions performed.');
  process.exit(0);
}
const option = name => process.argv[process.argv.indexOf(name) + 1];
const image = process.argv.includes('--image') && option('--image');
if (!image || image.startsWith('--')) throw new Error('An explicit built db-init image is required.');
const dump = process.argv.includes('--dump') ? path.resolve(option('--dump')) : null;
if (dump && !fs.statSync(dump).isFile()) throw new Error('Managed dump file missing.');
const lab = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-db-init-test-'));
fs.chmodSync(lab, 0o700);
const id = path.basename(lab).toLowerCase();
const pg = `${id}-postgres`, init = `${id}-init`, volume = `${id}-data`;
const report = { image, lab, checks: [], scope: 'DB initialization only; not application readiness' };
let counter = 0;
const write = (name, value) => fs.writeFileSync(path.join(lab, name), JSON.stringify(value, null, 2), { mode: 0o600 });
async function docker(args, { input, allowFailure = false, timeout = 300_000 } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', x => { stdout += x; }); child.stderr.on('data', x => { stderr += x; });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const log = `${++counter}-${args[0]}.log`;
      fs.writeFileSync(path.join(lab, log), stdout + stderr, { mode: 0o600 });
      if (code === 0 || allowFailure) resolve({ code, signal, stdout, stderr });
      else reject(new Error(`Docker ${args[0]} failed (${code}/${signal}); see ${lab}/${log}`));
    });
  });
}
const sql = async (db, query) => (await docker(['exec', '-i', pg, 'psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-U', 'fixture', '-d', db], { input: query })).stdout.trim();
const createDb = db => sql('postgres', `CREATE DATABASE "${db}";`);
const runInit = (db, mode = 'upgrade', baseline = 'strict') => docker([
  'run', '--rm', '--pull', 'never', '--name', init, '--network', id,
  '-e', `DATABASE_URL=postgresql://fixture:fixture-only@postgres:5432/${db}?schema=public`,
  '-e', `DB_INIT_SEED_MODE=${mode}`, '-e', `DB_INIT_BASELINE_MODE=${baseline}`, image,
], { allowFailure: true });
const passed = name => { report.checks.push(name); write('report.json', report); console.log(`[db-init-test] passed: ${name}`); };
async function signature(db, normalize = false) {
  return JSON.parse(await sql(db, `
    CREATE FUNCTION pg_temp.signature() RETURNS jsonb LANGUAGE plpgsql AS $$
    DECLARE r record; digest jsonb; result jsonb := '{}'::jsonb;
    BEGIN
      FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('common','crm','dms','pms','sns') ORDER BY 1,2 LOOP
        EXECUTE format('SELECT jsonb_build_object(''count'', count(*), ''hash'', md5(coalesce(string_agg(v, E''\\n'' ORDER BY v), ''''))) FROM (SELECT (to_jsonb(t) ${normalize ? "- ''owner_organization_id''" : ''})::text v FROM %I.%I t) rows', r.schemaname, r.tablename) INTO digest;
        result := result || jsonb_build_object(r.schemaname || '.' || r.tablename, digest);
      END LOOP;
      FOR r IN SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname IN ('common','crm','dms','pms','sns') ORDER BY 1,2 LOOP
        EXECUTE format('SELECT jsonb_build_object(''last_value'', last_value, ''is_called'', is_called) FROM %I.%I', r.schemaname, r.sequencename) INTO digest;
        result := result || jsonb_build_object('sequence:' || r.schemaname || '.' || r.sequencename, digest);
      END LOOP;
      RETURN result;
    END $$;
    SELECT pg_temp.signature();`));
}
try {
  report.imageId = (await docker(['image', 'inspect', '--format', '{{.Id}}', image])).stdout.trim();
  await docker(['network', 'create', '--internal', id]);
  await docker(['volume', 'create', volume]);
  await docker(['run', '-d', '--pull', 'never', '--name', pg, '--network', id, '--network-alias', 'postgres',
    '-e', 'POSTGRES_USER=fixture', '-e', 'POSTGRES_PASSWORD=fixture-only', '-v', `${volume}:/var/lib/postgresql/data`, 'pgvector/pgvector:pg17']);
  let ready = false;
  for (let n = 0; n < 60; n++) {
    if ((await docker(['exec', pg, 'pg_isready', '-U', 'fixture'], { allowFailure: true })).code === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'private postgres did not become ready');
  await createDb('unmanaged_test');
  await sql('unmanaged_test', "CREATE SCHEMA common; CREATE TABLE common.probe (id integer PRIMARY KEY, value text); INSERT INTO common.probe VALUES (1, 'preserve');");
  const unmanaged = await signature('unmanaged_test');
  assert.notEqual((await runInit('unmanaged_test')).code, 0);
  assert.deepEqual(await signature('unmanaged_test'), unmanaged);
  passed('strict pre-baseline rejection preserves existing data');
  await createDb('reference_test');
  assert.notEqual((await runInit('reference_test')).code, 0);
  assert.equal(await sql('reference_test', "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('common','crm','dms','pms','sns');"), '0');
  passed('empty deployment rejected before schema writes');
  assert.equal((await runInit('reference_test', 'bootstrap')).code, 0);
  assert.equal(await sql('reference_test', `SELECT (SELECT count(*) FROM common.cm_user_m) +
    (SELECT count(*) FROM common.cm_user_auth_m) + (SELECT count(*) FROM crm.crm_opportunity_m) +
    (SELECT count(*) FROM crm.crm_contract_m) + (SELECT count(*) FROM pms.pr_project_m);`), '0');
  assert.equal(await sql('reference_test', `SELECT (EXISTS (SELECT 1 FROM common.cm_permission_m WHERE permission_code='system.override') AND
    EXISTS (SELECT 1 FROM common.cm_role_m WHERE role_code='admin') AND EXISTS (SELECT 1 FROM pms.cm_menu_m) AND
    EXISTS (SELECT 1 FROM dms.dm_config_m) AND EXISTS (SELECT 1 FROM sns.sns_board_m) AND
    EXISTS (SELECT 1 FROM crm.crm_config_m))::int;`), '1');
  const fresh = await signature('reference_test');
  assert.notEqual((await runInit('reference_test', 'bootstrap')).code, 0);
  assert.notEqual((await runInit('reference_test', 'demo', 'compat')).code, 0);
  assert.equal((await runInit('reference_test')).code, 0);
  assert.deepEqual(await signature('reference_test'), fresh);
  passed('reference bootstrap has permissions/settings, zero accounts/business demos, and cannot be replayed');

  await createDb('demo_test');
  assert.notEqual((await runInit('demo_test', 'demo')).code, 0);
  assert.equal(await sql('demo_test', "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('common','crm','dms','pms','sns');"), '0');
  assert.equal((await runInit('demo_test', 'demo', 'compat')).code, 0);
  await sql('demo_test', `UPDATE common.cm_user_auth_m SET password_hash='fixture-custom-hash', account_status_code='locked' WHERE login_id='admin';
    UPDATE crm.crm_quote_seller_profile_m SET company_name='Fixture custom supplier', ci_storage_ref='fixture://approved-ci' WHERE profile_code='default';
    UPDATE common.cm_platform_enrollment_m SET status_code='suspended' WHERE user_id=(SELECT user_id FROM common.cm_user_auth_m WHERE login_id='admin');
    UPDATE common.cm_role_permission_r SET is_active=false WHERE role_id=(SELECT role_id FROM common.cm_role_m WHERE role_code='admin');`);
  assert.equal(await sql('demo_test', "SELECT count(*) FROM common.cm_user_auth_m WHERE login_id='admin' AND password_hash='fixture-custom-hash';"), '1');
  const before = await signature('demo_test');
  write('demo-before.json', before);
  for (const baseline of ['strict', 'compat']) {
    assert.equal((await runInit('demo_test', 'upgrade', baseline)).code, 0);
    assert.deepEqual(await signature('demo_test'), before);
  }
  write('demo-after.json', await signature('demo_test'));
  passed('managed DB upgrades in strict/compat modes preserve ALL application rows, histories, timestamps and sequence states');
  report.preservedTables = Object.keys(before).filter(key => !key.startsWith('sequence:')).length;
  report.preservedSequences = Object.keys(before).filter(key => key.startsWith('sequence:')).length;

  if (dump) {
    await createDb('restored_test');
    await docker(['cp', dump, `${pg}:/tmp/managed.dump`]);
    await docker(['exec', pg, 'pg_restore', '-U', 'fixture', '-d', 'restored_test', '--no-owner', '--no-privileges', '--exit-on-error', '/tmp/managed.dump']);
    const prior = await signature('restored_test', true);
    report.migrationsBefore = Number(await sql('restored_test', 'SELECT count(*) FROM public._prisma_migrations;'));
    assert.equal((await runInit('restored_test')).code, 0);
    const next = await signature('restored_test', true);
    const protectedKeys = Object.keys(prior).filter(key => /common\.cm_user_auth_|crm\.crm_quote_seller_profile_|crm\.crm_contract_|dms\.dm_config_/u.test(key));
    assert.ok(protectedKeys.length > 10);
    for (const key of protectedKeys) assert.deepEqual(next[key], prior[key], key);
    const upgraded = await signature('restored_test');
    assert.equal((await runInit('restored_test')).code, 0);
    assert.deepEqual(await signature('restored_test'), upgraded);
    report.migrationsAfter = Number(await sql('restored_test', 'SELECT count(*) FROM public._prisma_migrations;'));
    report.protectedKeys = protectedKeys;
    write('restored-before.json', prior); write('restored-after.json', next);
    passed('managed dump upgrades preserve protected data/sequence states; repeat upgrade preserves all tables');
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.message; process.exitCode = 1;
  console.error(error.message);
} finally {
  const cleanup = [];
  for (const args of [['rm', '-f', init, pg], ['volume', 'rm', volume], ['network', 'rm', id]]) {
    cleanup.push(await docker(args, { allowFailure: true }));
  }
  // rm may report an already auto-removed init container; verify actual resource absence.
  report.cleanup = (await docker(['container', 'inspect', pg], { allowFailure: true })).code !== 0 &&
    (await docker(['container', 'inspect', init], { allowFailure: true })).code !== 0 &&
    cleanup[1].code === 0 && cleanup[2].code === 0 ? 'passed' : 'failed';
  if (report.cleanup !== 'passed') process.exitCode = 1;
  write('report.json', report);
  console.log(`[db-init-test] ${report.status}; evidence: ${lab}/report.json`);
}
