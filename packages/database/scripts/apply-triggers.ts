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
import { fileURLToPath } from 'url';

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

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const triggersDir = path.join(currentDir, '../prisma/triggers');
  
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
    '19_pr_project_member_r_h_trigger.sql',
    '20_pr_task_h_trigger.sql',
    '21_pr_milestone_h_trigger.sql',
    '22_pr_issue_h_trigger.sql',
    '23_cm_user_auth_h_trigger.sql',
    '24_cm_user_session_h_trigger.sql',
    '25_cm_user_invitation_h_trigger.sql',
    '26_cm_organization_h_trigger.sql',
    '27_cm_user_org_h_trigger.sql',
    '28_cm_permission_h_trigger.sql',
    '29_cm_role_h_trigger.sql',
    '30_cm_role_permission_h_trigger.sql',
     '31_cm_org_permission_h_trigger.sql',
     '32_cm_user_permission_exception_h_trigger.sql',
     '33_pr_project_role_permission_h_trigger.sql',
     '34_pr_handoff_h_trigger.sql',
     '35_pr_contract_h_trigger.sql',
     '36_pr_contract_payment_h_trigger.sql',
     '37_pr_objective_h_trigger.sql',
     '38_pr_wbs_h_trigger.sql',
     '39_pr_project_org_r_h_trigger.sql',
     '40_pr_project_relation_r_h_trigger.sql',
     '41_pr_requirement_h_trigger.sql',
     '42_pr_risk_h_trigger.sql',
     '43_pr_change_request_h_trigger.sql',
     '44_pr_event_h_trigger.sql',
      '45_dm_document_h_trigger.sql',
      '46_dm_document_grant_h_trigger.sql',
      '47_dm_document_access_request_h_trigger.sql',
      '48_dm_document_source_file_h_trigger.sql',
      '49_dm_document_index_state_h_trigger.sql',
      // CMS (Content Management System)
      '50_cms_board_h_trigger.sql',
     '51_cms_post_h_trigger.sql',
     '52_cms_comment_h_trigger.sql',
     '53_cms_user_profile_h_trigger.sql',
     '54_pr_project_issue_h_trigger.sql',
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
