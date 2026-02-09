/**
 * Apply History Triggers Script
 * 
 * 히스토리 트리거를 데이터베이스에 적용하는 스크립트
 * Prisma 대신 pg 클라이언트를 직접 사용하여 다중 SQL 문 실행
 * 
 * 실행: npx ts-node scripts/apply-triggers.ts
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env 로드
dotenv.config();

async function main() {
  console.log('========================================');
  console.log('SSOO History Triggers Installation');
  console.log('========================================\n');

  // DATABASE_URL 파싱
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('✅ Connected to database\n');

  const triggersDir = path.join(__dirname, '../prisma/triggers');
  
  // 트리거 파일 목록 (순서대로)
  const triggerFiles = [
    '01_cm_code_h_trigger.sql',
    '02_cm_user_h_trigger.sql',
    '03_pr_project_h_trigger.sql',
    '04_pr_project_status_h_trigger.sql',
    '05_pr_deliverable_h_trigger.sql',
    '06_pr_deliverable_group_h_trigger.sql',
    '07_pr_deliverable_group_item_r_h_trigger.sql',
    '08_pr_close_condition_group_h_trigger.sql',
    '09_pr_close_condition_group_item_r_h_trigger.sql',
    '10_pr_project_deliverable_r_h_trigger.sql',
    '11_pr_project_close_condition_r_h_trigger.sql',
    // Menu & Permission tables
    '12_cm_menu_h_trigger.sql',
    '13_cm_role_menu_h_trigger.sql',
    '14_cm_user_menu_h_trigger.sql',
    '15_pr_project_request_d_h_trigger.sql',
    '16_pr_project_proposal_d_h_trigger.sql',
    '17_pr_project_execution_d_h_trigger.sql',
    '18_pr_project_transition_d_h_trigger.sql',
  ];

  let successCount = 0;
  let failCount = 0;

  for (const file of triggerFiles) {
    const filePath = path.join(triggersDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    console.log(`Installing: ${file}...`);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`✅ ${file} - OK`);
      successCount++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${file} - FAILED`);
      console.error(`   Error: ${message}`);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log('Verifying installed triggers...');
  console.log('========================================\n');

  // 설치된 트리거 확인
  const result = await client.query(`
    SELECT 
      tgname AS trigger_name,
      c.relname AS table_name,
      CASE tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
      END AS status
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE tgname LIKE 'trg_%_h'
    ORDER BY c.relname
  `);

  console.log('Installed Triggers:');
  console.log('-------------------');
  for (const t of result.rows) {
    console.log(`${t.status === 'ENABLED' ? '✅' : '⚠️'} ${t.trigger_name} on ${t.table_name} [${t.status}]`);
  }

  console.log(`\nTotal: ${result.rows.length} triggers installed`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);

  await client.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
