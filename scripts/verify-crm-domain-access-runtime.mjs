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

const apiBaseUrl = (process.env.CRM_RUNTIME_API_URL || 'http://127.0.0.1:4105/api').replace(/\/$/, '');
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('DATABASE_URL is required.');
const targetUrl = new URL(sourceUrl);
const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim() || targetUrl.pathname.slice(1);
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`CRM domain runtime verification is restricted to an isolated ssoo_crm_ralph_* database, got ${databaseName}`);
}
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');

const marker = `S8-RUNTIME-${Date.now()}`;
const targetYear = 2098;
const crmPermissionCodes = [
  'crm.business-year.read', 'crm.business-year.manage',
  'crm.opportunity.read', 'crm.opportunity.write', 'crm.opportunity.confirm', 'crm.opportunity.version.manage',
  'crm.customer.read', 'crm.customer.write', 'crm.customer.activity.read', 'crm.customer.activity.write',
  'crm.contract.read', 'crm.contract.write', 'crm.contract.confirm',
  'crm.business-plan.read', 'crm.business-plan.write', 'crm.business-plan.confirm', 'crm.business-plan.delete',
  'crm.cost-plan.read', 'crm.cost-plan.write', 'crm.cost-plan.confirm',
  'crm.report.read', 'crm.report.confirm',
  'crm.quote-settings.read', 'crm.quote-settings.manage',
  'crm.operations.read', 'crm.operations.execute', 'crm.settings.manage',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, { token, method = 'GET', body, statuses = [200] } = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'x-ssoo-app': 'crm',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  assert(statuses.includes(response.status), `${method} ${pathname} expected ${statuses.join('/')}, got ${response.status}: ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

async function login(loginId, password) {
  const { payload } = await request('/auth/login', {
    method: 'POST',
    body: { loginId, password },
  });
  const token = payload?.data?.accessToken;
  assert(typeof token === 'string' && token.length > 20, `login did not return an access token for ${loginId}`);
  return token;
}

function assertFeatures(label, features, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert(features?.[key] === value, `${label}.${key} expected ${value}, got ${features?.[key]}`);
  }
}

function collectPermissionEntries(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectPermissionEntries(item, result));
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  if (typeof value.permissionCode === 'string') result.push(value);
  Object.values(value).forEach((item) => collectPermissionEntries(item, result));
  return result;
}

async function verifySeedIdempotency(client) {
  const countAssignments = async () => Number((await client.query('select count(*)::int as count from common.cm_role_permission_r')).rows[0].count);
  const before = await countAssignments();
  const seedSql = fs.readFileSync(path.join(databaseRoot, 'prisma', 'seeds', '18_crm_access_policy_foundation.sql'), 'utf8');
  await client.query(seedSql);
  const first = await countAssignments();
  await client.query(seedSql);
  const second = await countAssignments();
  assert(before === first && first === second, `CRM permission seed changed total role assignment count: ${before}/${first}/${second}`);

  const expectedCounts = { admin: 27, manager: 22, user: 15, viewer: 9 };
  const rows = (await client.query(`
    select r.role_code as "roleCode", count(*)::int as count
      from common.cm_role_permission_r rp
      join common.cm_role_m r on r.role_id = rp.role_id
      join common.cm_permission_m p on p.permission_id = rp.permission_id
     where p.permission_code = any($1::text[]) and rp.is_active = true
     group by r.role_code
  `, [crmPermissionCodes])).rows;
  const actual = Object.fromEntries(rows.map((row) => [row.roleCode, Number(row.count)]));
  for (const [roleCode, expected] of Object.entries(expectedCounts)) {
    assert(actual[roleCode] === expected, `CRM ${roleCode} permission count expected ${expected}, got ${actual[roleCode]}`);
  }
  return { totalAssignments: second, crmRoleCounts: actual };
}

async function cleanup(client) {
  await client.query('delete from crm.crm_cost_plan_ams_external_monthly_d where target_year = $1 and vendor_name = $2', [targetYear, marker]);
  await client.query('delete from crm.crm_cost_plan_ams_vendor_wbs_r where target_year = $1 and vendor_name = $2', [targetYear, marker]);
  await client.query('delete from crm.crm_cost_plan_ams_source_vendor_m where target_year = $1 and vendor_name = $2', [targetYear, marker]);
  const residue = await client.query(`
    select
      (select count(*)::int from crm.crm_cost_plan_ams_external_monthly_d where target_year = $1 and vendor_name = $2) as extended,
      (select count(*)::int from crm.crm_cost_plan_ams_vendor_wbs_r where target_year = $1 and vendor_name = $2) as mapping,
      (select count(*)::int from crm.crm_cost_plan_ams_source_vendor_m where target_year = $1 and vendor_name = $2) as source_vendor
  `, [targetYear, marker]);
  assert(Number(residue.rows[0].extended) === 0 && Number(residue.rows[0].mapping) === 0 && Number(residue.rows[0].source_vendor) === 0, 'disposable AMS runtime rows were not cleaned');
}

const client = new Client({ connectionString: targetUrl.toString() });
await client.connect();
let sourceVendorId;
try {
  await cleanup(client);
  const seedEvidence = await verifySeedIdempotency(client);

  const [adminToken, managerToken, userToken, viewerToken] = await Promise.all([
    login('admin', process.env.CRM_RUNTIME_ADMIN_PASSWORD || 'admin123!'),
    login('pm.kim', process.env.CRM_RUNTIME_USER_PASSWORD || 'user123!'),
    login('am.park', process.env.CRM_RUNTIME_USER_PASSWORD || 'user123!'),
    login('viewer.han', process.env.CRM_RUNTIME_USER_PASSWORD || 'user123!'),
  ]);

  const access = {};
  for (const [role, token] of Object.entries({ admin: adminToken, manager: managerToken, user: userToken, viewer: viewerToken })) {
    access[role] = (await request('/crm/access/me', { token })).payload?.data;
  }
  const featureKeys = Object.keys(access.viewer?.features || {});
  assert(featureKeys.length === 14, `CRM domain feature denominator expected 14, got ${featureKeys.length}`);
  assertFeatures('admin', access.admin?.features, Object.fromEntries(featureKeys.map((key) => [key, true])));
  assertFeatures('manager', access.manager?.features, {
    canWriteContract: true, canConfirmContract: true,
    canWriteBusinessPlan: true, canConfirmBusinessPlan: true, canDeleteBusinessPlan: false,
    canWriteCostPlan: true, canConfirmCostPlan: true,
    canConfirmReport: true, canManageQuoteSettings: false,
  });
  assertFeatures('user', access.user?.features, {
    canWriteContract: true, canConfirmContract: false,
    canWriteBusinessPlan: true, canConfirmBusinessPlan: false, canDeleteBusinessPlan: false,
    canWriteCostPlan: true, canConfirmCostPlan: false,
    canConfirmReport: false, canManageQuoteSettings: false,
  });
  assertFeatures('viewer', access.viewer?.features, Object.fromEntries(featureKeys.map((key) => [key, key.startsWith('canRead')])));

  const catalogPayload = (await request('/access/ops/catalog', { token: adminToken })).payload?.data;
  const catalogEntries = collectPermissionEntries(catalogPayload);
  const crmCatalog = catalogEntries.filter((item) => crmPermissionCodes.includes(item.permissionCode));
  assert(crmCatalog.length === crmPermissionCodes.length, `Admin catalog expected ${crmPermissionCodes.length} CRM permissions, got ${crmCatalog.length}`);
  const nonActive = crmCatalog.filter((item) => item.status !== 'launch-active');
  assert(nonActive.length === 0, `Admin catalog contains non-active CRM permissions: ${nonActive.map((item) => `${item.permissionCode}:${item.status}`).join(', ')}`);

  const viewerPreview = await request(`/crm/cost-plan/preview?year=${targetYear}`, { token: viewerToken });
  assert(viewerPreview.payload?.data?.summary?.year === targetYear, 'viewer could not read CRM cost-plan preview');
  await request('/crm/cost-plan/ams/source/vendors', {
    token: viewerToken,
    method: 'POST',
    body: { targetYear, vendorName: marker },
    statuses: [403],
  });
  await request('/crm/reports/confirm', {
    token: userToken,
    method: 'POST',
    body: { targetYear },
    statuses: [403],
  });

  const created = await request('/crm/cost-plan/ams/source/vendors', {
    token: userToken,
    method: 'POST',
    body: { targetYear, vendorName: marker },
    statuses: [200, 201],
  });
  const sourceWorkspace = created.payload?.data?.workspace;
  const sourceVendor = sourceWorkspace?.vendors?.find((item) => item.vendorName === marker);
  assert(sourceVendor?.id, 'user write did not create the disposable AMS source vendor');
  sourceVendorId = sourceVendor.id;
  const eligibleWbs = sourceWorkspace.eligibleWbs?.slice(0, 2).map((item) => item.wbsCode) || [];
  assert(eligibleWbs.length === 2, `AMS source test requires two confirmed AMS WBS rows, got ${eligibleWbs.length}`);

  const mapped = await request(`/crm/cost-plan/ams/source/vendors/${sourceVendorId}/wbs`, {
    token: userToken,
    method: 'PUT',
    body: { targetYear, wbsCodes: eligibleWbs },
  });
  assert(mapped.payload?.data?.workspace?.externalCostRows?.length === 2, 'two-WBS mapping did not produce two AMS source grid rows');
  const plan = Array.from({ length: 12 }, (_, index) => 101 + index);
  const actual = Array.from({ length: 12 }, (_, index) => 91 + index);
  const savedSource = await request('/crm/cost-plan/ams/source/external-cost', {
    token: userToken,
    method: 'POST',
    body: {
      targetYear,
      rows: eligibleWbs.map((wbsCode, index) => ({
        vendorId: sourceVendorId,
        wbsCode,
        monthlyPlanAmounts: plan.map((amount) => amount + index),
        monthlyActualAmounts: actual.map((amount) => amount + index),
      })),
    },
    statuses: [200, 201],
  });
  const sourceRows = savedSource.payload?.data?.workspace?.externalCostRows || [];
  assert(sourceRows.length === 2, 'AMS source annual grid did not persist two rows');
  assert(sourceRows[0].monthlyPlanAmounts?.[0] === 101 && sourceRows[1].monthlyActualAmounts?.[11] === 103, 'AMS source annual grid values did not round-trip');

  const basis = {
    targetYear,
    businessType: 'AMS',
    industryLine: marker,
    ownerName: 'S8 Runtime',
    region: 'domestic',
    wbsCode: eligibleWbs[0],
    vendorName: marker,
    vendorContractNo: `${marker}-PO`,
    memo: 'disposable CRM domain access runtime evidence',
  };
  await request('/crm/cost-plan/ams/vendor-wbs', { token: userToken, method: 'POST', body: basis, statuses: [200, 201] });
  const savedMonthly = await request('/crm/cost-plan/ams/external-cost/monthly', {
    token: userToken,
    method: 'POST',
    body: { ...basis, monthlyPlanAmounts: plan, monthlyActualAmounts: actual },
    statuses: [200, 201],
  });
  const monthlyId = savedMonthly.payload?.data?.input?.id;
  assert(monthlyId, 'user write did not persist AMS monthly input');
  await request(`/crm/cost-plan/ams/external-cost/monthly/${monthlyId}/confirm`, { token: userToken, method: 'POST', statuses: [403] });
  const confirmed = await request(`/crm/cost-plan/ams/external-cost/monthly/${monthlyId}/confirm`, { token: managerToken, method: 'POST', statuses: [200, 201] });
  assert(confirmed.payload?.data?.input?.confirmed === true, 'manager confirm did not lock AMS monthly input');
  await request('/crm/cost-plan/ams/external-cost/monthly', {
    token: userToken,
    method: 'POST',
    body: { ...basis, monthlyPlanAmounts: plan, monthlyActualAmounts: actual },
    statuses: [400],
  });
  const reopened = await request(`/crm/cost-plan/ams/external-cost/monthly/${monthlyId}/reopen`, { token: managerToken, method: 'POST', statuses: [200, 201] });
  assert(reopened.payload?.data?.input?.confirmed === false, 'manager reopen did not unlock AMS monthly input');
  const resaved = await request('/crm/cost-plan/ams/external-cost/monthly', {
    token: userToken,
    method: 'POST',
    body: { ...basis, monthlyPlanAmounts: plan.map((amount) => amount + 1), monthlyActualAmounts: actual },
    statuses: [200, 201],
  });
  assert(resaved.payload?.data?.input?.monthlyPlanAmounts?.[0] === 102, 'AMS monthly input was not editable after reopen');

  const deleted = await request(`/crm/cost-plan/ams/source/vendors/${sourceVendorId}?year=${targetYear}`, { token: userToken, method: 'DELETE' });
  assert(!deleted.payload?.data?.workspace?.vendors?.some((item) => item.id === sourceVendorId), 'AMS source vendor delete did not remove the vendor');
  assert(!deleted.payload?.data?.workspace?.externalCostRows?.some((item) => item.vendorId === sourceVendorId), 'AMS source vendor delete did not cascade associated source cost rows');
  sourceVendorId = undefined;

  await cleanup(client);
  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    databaseName,
    domainFeatureCount: featureKeys.length,
    catalogPermissionCount: crmCatalog.length,
    seedEvidence,
    roleMatrix: {
      admin: 'all 14 domain capabilities',
      manager: 'read/write/confirm; no business-plan delete or quote-settings manage',
      user: 'read/write; confirm denied',
      viewer: 'read-only; mutation denied',
    },
    amsEvidence: 'source vendor + 2 WBS + 24 monthly arrays + delete cascade; extended save/confirm/edit guard/reopen/resave',
    residue: 0,
  }, null, 2)}\n`);
} finally {
  try {
    await cleanup(client);
  } finally {
    await client.end();
  }
}
