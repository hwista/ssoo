#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const config = {
  skipRuntime: process.argv.includes('--skip-runtime'),
  apiBaseUrl: readOption('api-base-url', 'PMS_VERIFY_API_BASE_URL', 'http://localhost:4000/api'),
  webBaseUrl: readOption('web-base-url', 'PMS_VERIFY_WEB_BASE_URL', 'http://localhost:3002'),
};

async function main() {
  await verifySourceSurface();
  if (!config.skipRuntime) {
    await verifyRuntime();
  }
  console.log('✓ PMS launch readiness verification passed');
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const cliValue = process.argv.find((arg) => arg.startsWith(prefix));
  if (cliValue) return cliValue.slice(prefix.length);
  return process.env[envName] || fallback;
}

async function verifySourceSurface() {
  const dashboard = await readText('apps/web/pms/src/components/pages/home/DashboardPage.tsx');
  const detail = await readText('apps/web/pms/src/components/pages/project/DetailPage.tsx');
  const homeController = await readText('apps/server/src/modules/pms/home/home.controller.ts');
  const homeService = await readText('apps/server/src/modules/pms/home/home.service.ts');
  const homeModule = await readText('apps/server/src/modules/pms/home/home.module.ts');
  const pmsModule = await readText('apps/server/src/modules/pms/pms.module.ts');
  const projectController = await readText('apps/server/src/modules/pms/project/project.controller.ts');
  const homeApi = await readText('apps/web/pms/src/lib/api/endpoints/home.ts');
  const homeQuery = await readText('apps/web/pms/src/hooks/queries/useHomeSummary.ts');
  const projectApi = await readText('apps/web/pms/src/lib/api/endpoints/projects.ts');
  const projectQueries = await readText('apps/web/pms/src/hooks/queries/useProjects.ts');
  const queryIndex = await readText('apps/web/pms/src/hooks/queries/index.ts');
  const homeTypes = await readText('packages/types/src/pms/home.ts');
  const pmsTypeIndex = await readText('packages/types/src/pms/index.ts');
  const menuSeed = await readText('packages/database/prisma/seeds/05_menu_data.sql');
  const roleMenuSeed = await readText('packages/database/prisma/seeds/06_role_menu_permission.sql');
  const triggerInstaller = await readText('packages/database/prisma/triggers/apply_all_triggers.sql');
  const packageJson = await readText('package.json');

  assertIncludes(dashboard, 'useHomeSummary', 'home tab consumes server policy summary');
  assertIncludes(dashboard, '업무 브리핑', 'dashboard exposes project-centered work briefing');
  assertIncludes(dashboard, '지금 봐야 할 것', 'dashboard exposes signal queue');
  assertIncludes(dashboard, '권한별 업무', 'dashboard exposes capability-based project actions');
  assertIncludes(dashboard, 'primaryAction', 'dashboard routes through server-selected primary actions');
  assertIncludes(dashboard, 'allowedActions', 'dashboard renders only allowed home actions');
  assertIncludes(dashboard, '운영 흐름', 'dashboard exposes status flow');
  assertIncludes(homeController, "@Controller('home')", 'server exposes PMS home controller');
  assertIncludes(homeController, "@Get('summary')", 'server exposes home summary endpoint');
  assertIncludes(homeService, 'projectAccessService.getProjectAccess', 'home summary is based on project access policy');
  assertIncludes(homeService, 'buildAllowedActions', 'home summary derives actions from project capabilities');
  assertIncludes(homeService, 'requiredCapability', 'home signals bind actions to required project capabilities');
  assertIncludes(homeService, 'canManageDeliverables', 'home summary includes deliverable capability actions');
  assertIncludes(homeService, 'canAdvanceStage', 'home summary includes stage advance capability actions');
  assertIncludes(homeService, 'project-issue-blocking', 'home summary creates blocking issue signals');
  assertIncludes(homeService, 'my-task-due', 'home summary creates member task signals');
  assertIncludes(homeService, 'closeout-blocked', 'home summary creates closeout signals');
  assertIncludes(homeService, 'project-unowned', 'home summary creates unowned project signals');
  assertIncludes(homeModule, 'ProjectModule', 'home module imports project policy module');
  assertIncludes(pmsModule, 'HomeModule', 'PMS module includes home module');
  assertIncludes(homeApi, "'/home/summary'", 'web client calls home summary endpoint');
  assertIncludes(homeQuery, 'useHomeSummary', 'web query hook exposes home summary');
  assertIncludes(queryIndex, 'useHomeSummary', 'query hook barrel exports home summary hook');
  assertIncludes(homeTypes, 'PmsHomeSummary', 'shared PMS types define home summary contract');
  assertIncludes(homeTypes, 'PmsHomeAllowedAction', 'shared PMS types define home allowed action contract');
  assertIncludes(homeTypes, 'PmsHomeAccessProject', 'shared PMS types define project capability summary');
  assertIncludes(pmsTypeIndex, 'PmsHomeSummary', 'PMS type index exports home summary contract');
  assertIncludes(pmsTypeIndex, 'PmsHomeAllowedAction', 'PMS type index exports home allowed action contract');
  assertIncludes(detail, 'PM 실행 closeout', 'project detail exposes closeout panel');
  assertIncludes(detail, 'managementTab', 'project detail can open directly to a management tab from home actions');
  assertIncludes(detail, '막힌 조건', 'project detail shows blocking condition count');
  assertIncludes(detail, '종료 가능 여부', 'project detail shows readiness verdict');
  assertIncludes(queryIndex, 'useTransitionReadiness', 'query hook barrel exports transition readiness hook');
  assertIncludes(queryIndex, 'useProjectAccess', 'query hook barrel exports project access hook');
  assertIncludes(queryIndex, 'useProjectOrgs', 'query hook barrel exports project org hook');
  assertIncludes(queryIndex, 'useProjectRelations', 'query hook barrel exports project relation hook');
  assertIncludes(queryIndex, 'useProjectRequirements', 'query hook barrel exports requirement hook');
  assertIncludes(queryIndex, 'useProjectRisks', 'query hook barrel exports risk hook');
  assertIncludes(queryIndex, 'useProjectChangeRequests', 'query hook barrel exports change request hook');
  assertIncludes(queryIndex, 'useProjectEvents', 'query hook barrel exports event hook');
  assertIncludes(queryIndex, 'useProjectControlIssues', 'query hook barrel exports canonical project issue hook');
  assertIncludes(menuSeed, "VALUES ('dashboard', '홈', 'Home', 'menu', '/home', 'LayoutDashboard', 0, 1, false, false", 'home stays out of PMS sidebar menu seed');
  assertIncludes(menuSeed, 'is_active = false,\n  updated_at = CURRENT_TIMESTAMP;\n\n-- 내 프로젝트', 'dashboard menu row remains inactive while fixed home tab owns /home');
  assertIncludes(roleMenuSeed, "WHERE menu_id IN (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'dashboard')", 'role menu seed removes dashboard/sidebar grants');
  assertIncludes(projectController, '@Get(":id/access")', 'server exposes project access snapshot endpoint');
  assertIncludes(projectController, '@Get(":id/transition-readiness")', 'server exposes transition readiness endpoint');
  assertIncludes(projectController, '@Post(":id/advance-stage")', 'server exposes stage advance endpoint');
  assertIncludes(projectController, '@Get(":id/handoffs")', 'server exposes handoff foundation endpoint');
  assertIncludes(projectController, '@Get(":id/contracts")', 'server exposes contract foundation endpoint');
  assertIncludes(projectController, '@Get(":id/contracts/:contractId/payments")', 'server exposes contract payment foundation endpoint');
  assertIncludesAll(
    projectApi,
    [
      'getAccess',
      'getTransitionReadiness',
      'getProjectOrgs',
      'getProjectRelations',
      'getObjectives',
      'getWbs',
      'getControlIssues',
      'getRequirements',
      'getRisks',
      'getChangeRequests',
      'getEvents',
      'getDeliverables',
      'getCloseConditions',
    ],
    'PMS project API client covers access, readiness, planning, control, output, and relation surfaces',
  );
  assertIncludesAll(
    projectQueries,
    [
      'useProjectAccess',
      'useTransitionReadiness',
      'useProjectOrgs',
      'useProjectRelations',
      'useProjectRequirements',
      'useProjectRisks',
      'useProjectChangeRequests',
      'useProjectEvents',
      'useProjectControlIssues',
    ],
    'PMS query hooks cover access, readiness, relation, and control surfaces',
  );
  assertIncludesAll(
    triggerInstaller,
    [
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
      '54_pr_project_issue_h_trigger.sql',
    ],
    'PMS trigger installer covers handoff, contract, planning, relation, and control history triggers',
  );
  assertIncludes(packageJson, 'verify:pms-launch', 'root package exposes PMS launch verification script');
}

async function verifyRuntime() {
  const health = await fetchJson(`${config.apiBaseUrl}/health`, { expectJson: false });
  if (health.status < 200 || health.status >= 300) {
    throw new Error(`server health failed: HTTP ${health.status}`);
  }

  const web = await fetchJson(config.webBaseUrl, { expectJson: false });
  if (web.status < 200 || web.status >= 400) {
    throw new Error(`PMS web failed: HTTP ${web.status}`);
  }
}

async function fetchJson(url, { expectJson }) {
  const response = await fetch(url);
  if (expectJson) return { status: response.status, data: await response.json() };
  await response.arrayBuffer();
  return { status: response.status };
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`required file missing: ${path} (${error.message})`);
  }
}

function assertIncludes(content, needle, label) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedNeedle = needle.replace(/\r\n/g, '\n');
  if (!normalizedContent.includes(normalizedNeedle)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertIncludesAll(content, needles, label) {
  for (const needle of needles) {
    assertIncludes(content, needle, `${label}: missing ${needle}`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
