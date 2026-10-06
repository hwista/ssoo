#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseRoot = path.join(repoRoot, 'packages', 'database');
const requireFromDatabase = createRequire(path.join(databaseRoot, 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('DATABASE_URL is required.');
const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim();
if (!databaseName) {
  throw new Error('CRM_RALPH_DATABASE_NAME is required so the active isolated Ralph runtime database is explicit.');
}
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`Refusing to apply CRM UI/UX reference seed outside an isolated Ralph database: ${databaseName}`);
}
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');
const seedPath = path.join(databaseRoot, 'prisma', 'seeds', '58_crm_source_uiux_reference.sql');
const seedSql = fs.readFileSync(seedPath, 'utf8');

async function snapshot(client) {
  const { rows } = await client.query(`
    select
      (select count(*)::int from crm.crm_opportunity_m where opportunity_code in ('crm-uiux-opp-001', 'crm-uiux-opp-002') and is_active = true) as "opportunityCount",
      (select count(*)::int from crm.crm_opportunity_m where opportunity_code = 'crm-uiux-opp-001' and contract_created = true and contract_code = 'crm-uiux-ct-001') as "contractConvertedOpportunityCount",
      (select count(*)::int from crm.crm_opportunity_line_d l join crm.crm_opportunity_m o on o.opportunity_id = l.opportunity_id where o.opportunity_code in ('crm-uiux-opp-001', 'crm-uiux-opp-002') and l.is_active = true) as "opportunityLineCount",
      (select count(*)::int from crm.crm_contract_m where contract_code = 'crm-uiux-ct-001' and is_active = true) as "contractCount",
      (select count(*)::int from crm.crm_contract_m c join crm.crm_opportunity_m o on o.opportunity_id = c.source_opportunity_id where c.contract_code = 'crm-uiux-ct-001' and o.opportunity_code = 'crm-uiux-opp-001') as "contractOpportunityLinkCount",
      (select count(*)::int from crm.crm_contract_line_d l join crm.crm_contract_m c on c.contract_id = l.contract_id where c.contract_code = 'crm-uiux-ct-001' and l.is_active = true) as "contractLineCount",
      (select count(*)::int from crm.crm_contract_billing_plan_d b join crm.crm_contract_m c on c.contract_id = b.contract_id where c.contract_code = 'crm-uiux-ct-001' and b.is_active = true) as "billingPlanCount",
      (select count(*)::int from crm.crm_contract_billing_actual_d b join crm.crm_contract_m c on c.contract_id = b.contract_id where c.contract_code = 'crm-uiux-ct-001' and b.is_active = true) as "billingActualCount",
      (select count(*)::int from crm.crm_business_plan_m where business_plan_code = 'BP-2026-DEMO-001' and confirmed = true and status_code = 'confirmed') as "confirmedPlanCount",
      (select count(*)::int from common.cm_code_m where code_group in ('payment_term','biz_type','group_type') and last_source = 'crm-source-uiux-reference') as "referenceCodeCount",
      (select count(*)::int from crm.crm_business_year_m where year = 2025 and is_active = false) as "inactivePriorYearCount",
      (select count(*)::int from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id in ('crm.uiux.kim', 'crm.uiux.lee') and u.phone is not null and u.department_code = '영업1팀' and u.is_active = true and a.account_status_code = 'active') as "referenceOwnerCount",
      (select count(*)::int from crm.crm_quote_seller_profile_m where profile_code = 'default' and company_name = '주식회사 SSOO' and ceo_name = '대표이사' and business_registration_no = '000-00-00000' and address = '서울특별시' and tel = '02-0000-0000' and is_active = true) as "completeSellerProfileCount",
      (select count(*)::int from crm.crm_cost_plan_ams_source_vendor_m where target_year = 2026 and vendor_name = '파트너사A' and is_active = true) as "vendorCount",
      (select count(*)::int from crm.crm_cost_plan_ams_source_vendor_wbs_r r join crm.crm_cost_plan_ams_source_vendor_m v on v.cost_plan_ams_source_vendor_id = r.vendor_id where v.target_year = 2026 and v.vendor_name = '파트너사A' and r.wbs_code = 'WBS-ERP-2026-001') as "vendorWbsCount",
      (select count(*)::int from crm.crm_cost_plan_ams_source_external_monthly_d d join crm.crm_cost_plan_ams_source_vendor_m v on v.cost_plan_ams_source_vendor_id = d.vendor_id where v.target_year = 2026 and v.vendor_name = '파트너사A' and d.wbs_code = 'WBS-ERP-2026-001' and d.is_active = true) as "externalCostCount"
  `);
  return rows[0];
}

function assertSnapshot(value) {
  const expected = {
    opportunityCount: 2,
    contractConvertedOpportunityCount: 1,
    opportunityLineCount: 6,
    contractCount: 1,
    contractOpportunityLinkCount: 1,
    contractLineCount: 4,
    billingPlanCount: 2,
    billingActualCount: 1,
    confirmedPlanCount: 1,
    referenceCodeCount: 6,
    inactivePriorYearCount: 1,
    referenceOwnerCount: 2,
    completeSellerProfileCount: 1,
    vendorCount: 1,
    vendorWbsCount: 1,
    externalCostCount: 1,
  };
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error(`CRM UI/UX reference snapshot mismatch: ${JSON.stringify(value)}`);
  }
}

const client = new Client({ connectionString: targetUrl.toString() });
await client.connect();
try {
  await client.query(seedSql);
  const first = await snapshot(client);
  assertSnapshot(first);
  await client.query(seedSql);
  const second = await snapshot(client);
  assertSnapshot(second);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error('CRM UI/UX reference seed is not idempotent across two applications.');
  }
  process.stdout.write(`PASS CRM UI/UX reference seed ${databaseName}: ${JSON.stringify(second)}\n`);
} finally {
  await client.end();
}
