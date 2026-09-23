#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';

const config = {
  skipRuntime: process.argv.includes('--skip-runtime'),
  runtimeReadonly: process.argv.includes('--runtime-readonly'),
  apiBaseUrl: readOption('api-base-url', 'PMS_VERIFY_API_BASE_URL', 'http://localhost:4000/api'),
  webBaseUrl: readOption('web-base-url', 'PMS_VERIFY_WEB_BASE_URL', 'http://localhost:3002'),
  loginId: readOption('login-id', 'PMS_VERIFY_LOGIN_ID', 'admin'),
  password: readOption('password', 'PMS_VERIFY_PASSWORD', 'admin123!'),
  runtimeProjectId: readOption('runtime-project-id', 'PMS_VERIFY_PROJECT_ID', ''),
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
  const projectDashboardPanel = await readText('apps/web/pms/src/components/pages/project/sections/ProjectControlDashboardPanel.tsx');
  const requestListPage = await readText('apps/web/pms/src/components/pages/request/ListPage.tsx');
  const requestCreatePage = await readText('apps/web/pms/src/components/pages/request/CreatePage.tsx');
  const proposalListPage = await readText('apps/web/pms/src/components/pages/proposal/ListPage.tsx');
  const executionListPage = await readText('apps/web/pms/src/components/pages/execution/ListPage.tsx');
  const transitionListPage = await readText('apps/web/pms/src/components/pages/transition/ListPage.tsx');
  const workQueuePages = await readText('apps/web/pms/src/components/pages/work-queues/WorkQueuePages.tsx');
  const basicInfoSection = await readText('apps/web/pms/src/components/pages/project/sections/BasicInfoSection.tsx');
  const organizationsSection = await readText('apps/web/pms/src/components/pages/project/sections/OrganizationsSection.tsx');
  const relationsSection = await readText('apps/web/pms/src/components/pages/project/sections/RelationsSection.tsx');
  const requestDetailTab = await readText('apps/web/pms/src/components/pages/project/tabs/RequestDetailTab.tsx');
  const proposalDetailTab = await readText('apps/web/pms/src/components/pages/project/tabs/ProposalDetailTab.tsx');
  const executionDetailTab = await readText('apps/web/pms/src/components/pages/project/tabs/ExecutionDetailTab.tsx');
  const transitionDetailTab = await readText('apps/web/pms/src/components/pages/project/tabs/TransitionDetailTab.tsx');
  const projectMemberOwnerSelect = await readText('apps/web/pms/src/components/pages/project/tabs/ProjectMemberOwnerSelect.tsx');
  const stageActionBar = await readText('apps/web/pms/src/components/pages/project/sections/StageActionBar.tsx');
  const membersTab = await readText('apps/web/pms/src/components/pages/project/tabs/MembersTab.tsx');
  const handoffsTab = await readText('apps/web/pms/src/components/pages/project/tabs/HandoffsTab.tsx');
  const reviewSummaryTab = await readText('apps/web/pms/src/components/pages/project/tabs/ReviewSummaryTab.tsx');
  const controlsTab = await readText('apps/web/pms/src/components/pages/project/tabs/ControlsTab.tsx');
  const controlDomainPanels = await readText('apps/web/pms/src/components/pages/project/tabs/control/DomainPanels.tsx');
  const controlModule = await readText('apps/server/src/modules/pms/control/control.module.ts');
  const controlController = await readText('apps/server/src/modules/pms/control/control.controller.ts');
  const controlService = await readText('apps/server/src/modules/pms/control/control.service.ts');
  const controlRolloverScheduler = await readText('apps/server/src/modules/pms/control/pmr-prr-workflow-rollover.scheduler.ts');
  const deliverablesTab = await readText('apps/web/pms/src/components/pages/project/tabs/DeliverablesTab.tsx');
  const closeConditionsTab = await readText('apps/web/pms/src/components/pages/project/tabs/CloseConditionsTab.tsx');
  const closeoutApprovalRoutePanel = await readText('apps/web/pms/src/components/pages/project/tabs/CloseoutApprovalRoutePanel.tsx');
  const deliverableController = await readText('apps/server/src/modules/pms/deliverable/deliverable.controller.ts');
  const deliverableDto = await readText('apps/server/src/modules/pms/deliverable/dto/deliverable.dto.ts');
  const deliverableService = await readText('apps/server/src/modules/pms/deliverable/deliverable.service.ts');
  const deliverableConstants = await readText('apps/server/src/modules/pms/deliverable/deliverable.constants.ts');
  const closeConditionController = await readText('apps/server/src/modules/pms/deliverable/close-condition.controller.ts');
  const closeConditionService = await readText('apps/server/src/modules/pms/deliverable/close-condition.service.ts');
  const closeoutApprovalService = await readText('apps/server/src/modules/pms/deliverable/closeout-approval.service.ts');
  const templateAdminController = await readText('apps/server/src/modules/pms/deliverable/template-admin.controller.ts');
  const deliverableModule = await readText('apps/server/src/modules/pms/deliverable/deliverable.module.ts');
  const taskController = await readText('apps/server/src/modules/pms/task/task.controller.ts');
  const taskService = await readText('apps/server/src/modules/pms/task/task.service.ts');
  const tasksTab = await readText('apps/web/pms/src/components/pages/project/tabs/TasksTab.tsx');
  const milestonesTab = await readText('apps/web/pms/src/components/pages/project/tabs/MilestonesTab.tsx');
  const objectivesPanel = await readText('apps/web/pms/src/components/pages/project/tabs/planning/ObjectivesPanel.tsx');
  const wbsPanel = await readText('apps/web/pms/src/components/pages/project/tabs/planning/WbsPanel.tsx');
  const codeAdminPage = await readText('apps/web/pms/src/components/pages/admin/CodeManagementPage.tsx');
  const menuAdminPage = await readText('apps/web/pms/src/components/pages/admin/MenuManagementPage.tsx');
  const masterPage = await readText('apps/web/pms/src/components/pages/admin/MasterDataPage.tsx');
  const templateAdminPage = await readText('apps/web/pms/src/components/pages/admin/TemplateManagementPage.tsx');
  const contentArea = await readText('apps/web/pms/src/components/layout/ContentArea.tsx');
  const appLayout = await readText('apps/web/pms/src/components/layout/AppLayout.tsx');
  const settingsRoute = await readText('apps/web/pms/src/app/(main)/settings/page.tsx');
  const header = await readText('apps/web/pms/src/components/layout/Header.tsx');
  const sidebar = await readText('apps/web/pms/src/components/layout/sidebar/Sidebar.tsx');
  const menuTree = await readText('apps/web/pms/src/components/layout/sidebar/MenuTree.tsx');
  const adminMenu = await readText('apps/web/pms/src/components/layout/sidebar/AdminMenu.tsx');
  const favorites = await readText('apps/web/pms/src/components/layout/sidebar/Favorites.tsx');
  const openTabs = await readText('apps/web/pms/src/components/layout/sidebar/OpenTabs.tsx');
  const homeController = await readText('apps/server/src/modules/pms/home/home.controller.ts');
  const homeService = await readText('apps/server/src/modules/pms/home/home.service.ts');
  const homeModule = await readText('apps/server/src/modules/pms/home/home.module.ts');
  const httpExceptionFilter = await readText('apps/server/src/common/filters/http-exception.filter.ts');
  const pmsModule = await readText('apps/server/src/modules/pms/pms.module.ts');
  const customerController = await readText('apps/server/src/modules/pms/customer/customer.controller.ts');
  const customerService = await readText('apps/server/src/modules/pms/customer/customer.service.ts');
  const customerDto = await readText('apps/server/src/modules/pms/customer/dto/customer.dto.ts');
  const masterController = await readText('apps/server/src/modules/pms/master/master.controller.ts');
  const masterService = await readText('apps/server/src/modules/pms/master/master.service.ts');
  const memberController = await readText('apps/server/src/modules/pms/member/member.controller.ts');
  const memberService = await readText('apps/server/src/modules/pms/member/member.service.ts');
  const projectController = await readText('apps/server/src/modules/pms/project/project.controller.ts');
  const projectOrgController = await readText('apps/server/src/modules/pms/project/project-org.controller.ts');
  const projectOrgService = await readText('apps/server/src/modules/pms/project/project-org.service.ts');
  const homeApi = await readText('apps/web/pms/src/lib/api/endpoints/home.ts');
  const homeQuery = await readText('apps/web/pms/src/hooks/queries/useHomeSummary.ts');
  const masterApi = await readText('apps/web/pms/src/lib/api/endpoints/master.ts');
  const masterQuery = await readText('apps/web/pms/src/hooks/queries/usePmsMaster.ts');
  const templateApi = await readText('apps/web/pms/src/lib/api/endpoints/templates.ts');
  const templateQuery = await readText('apps/web/pms/src/hooks/queries/usePmsTemplates.ts');
  const customerApi = await readText('apps/web/pms/src/lib/api/endpoints/customers.ts');
  const customerQuery = await readText('apps/web/pms/src/hooks/queries/useCustomers.ts');
  const projectApi = await readText('apps/web/pms/src/lib/api/endpoints/projects.ts');
  const crmHandoffApi = await readText('apps/web/pms/src/lib/api/endpoints/crmHandoff.ts');
  const crmHandoffQuery = await readText('apps/web/pms/src/hooks/queries/useCrmHandoff.ts');
  const projectDisplay = await readText('apps/web/pms/src/lib/project-display.ts');
  const pmsFormat = await readText('apps/web/pms/src/lib/pms-format.ts');
  const projectQueries = await readText('apps/web/pms/src/hooks/queries/useProjects.ts');
  const projectService = await readText('apps/server/src/modules/pms/project/project.service.ts');
  const projectHandoffContractService = await readText('apps/server/src/modules/pms/project/project-handoff-contract.service.ts');
  const crmContractController = await readText('apps/server/src/modules/crm/contract/contract.controller.ts');
  const crmContractService = await readText('apps/server/src/modules/crm/contract/contract.service.ts');
  const issueController = await readText('apps/server/src/modules/pms/issue/issue.controller.ts');
  const issueService = await readText('apps/server/src/modules/pms/issue/issue.service.ts');
  const issueTypes = await readText('packages/types/src/pms/issue.ts');
  const projectDto = await readText('apps/server/src/modules/pms/project/dto/project.dto.ts');
  const queryIndex = await readText('apps/web/pms/src/hooks/queries/index.ts');
  const homeTypes = await readText('packages/types/src/pms/home.ts');
  const masterTypes = await readText('packages/types/src/pms/master.ts');
  const customerTypes = await readText('packages/types/src/pms/customer.ts');
  const memberTypes = await readText('packages/types/src/pms/member.ts');
  const taskTypes = await readText('packages/types/src/pms/task.ts');
  const projectTypes = await readText('packages/types/src/pms/project.ts');
  const controlTypes = await readText('packages/types/src/pms/control.ts');
  const pmsTypeIndex = await readText('packages/types/src/pms/index.ts');
  const rootTypesIndex = await readText('packages/types/src/index.ts');
  const typedocServerCustomerDto = await readText('docs/pms/reference/typedoc/server/modules/customer_dto_customer.dto.html');
  const typedocWebCustomerQuery = await readText('docs/pms/reference/typedoc/web/modules/hooks_queries_useCustomers.html');
  const typedocWebCustomerApi = await readText('docs/pms/reference/typedoc/web/modules/lib_api_endpoints_customers.html');
  const typedocWebAdminIndex = await readText('docs/pms/reference/typedoc/web/modules/components_pages_admin.html');
  const prismaSchema = await readText('packages/database/prisma/schema.prisma');
  const menuSeed = await readText('packages/database/prisma/seeds/05_menu_data.sql');
  const permissionSeed = await readText('packages/database/prisma/seeds/13_permission_foundation.sql');
  const assetMasterSeed = await readText('packages/database/prisma/seeds/19_pms_asset_master.sql');
  const projectStatusSeed = await readText('packages/database/prisma/seeds/21_demo_project_statuses.sql');
  const templateGroupSeed = await readText('packages/database/prisma/seeds/22_pms_template_groups.sql');
  const demoIssuesSeed = await readText('packages/database/prisma/seeds/15_demo_issues.sql');
  const seedInstaller = await readText('packages/database/prisma/seeds/apply_all_seeds.sql');
  const seedHarness = await readText('.codex/scripts/db-seed.sh');
  const dbInitEntrypoint = await readText('scripts/db-init-entrypoint.sh');
  const roleMenuSeed = await readText('packages/database/prisma/seeds/06_role_menu_permission.sql');
  const projectMemberCodeSeed = await readText('packages/database/prisma/seeds/10_project_member_task_issue_code.sql');
  const assetMasterMigration = await readText('packages/database/prisma/migrations/20260703093000_add_pms_asset_master/migration.sql');
  const importProfileMigration = await readText('packages/database/prisma/migrations/20260703133000_add_pms_master_import_profiles/migration.sql');
  const reconciliationFoundationMigration = await readText('packages/database/prisma/migrations/20260706143000_add_pms_reconciliation_foundation/migration.sql');
  const closeConditionTemplateMigration = await readText('packages/database/prisma/migrations/20260709153000_add_pms_close_condition_group_requires_deliverable/migration.sql');
  const templateGroupWorkflowMigration = await readText('packages/database/prisma/migrations/20260709170000_add_pms_template_group_workflow/migration.sql');
  const closeoutApprovalMigration = await readText('packages/database/prisma/migrations/20260710113000_add_pms_closeout_approval_steps/migration.sql');
  const legacyIssueArchiveMigration = await readText('packages/database/prisma/migrations/20260710130000_add_pms_legacy_issue_archive/migration.sql');
  const taskEffortLogMigration = await readText('packages/database/prisma/migrations/20260713140000_add_pms_task_effort_logs/migration.sql');
  const triggerInstaller = await readText('packages/database/prisma/triggers/apply_all_triggers.sql');
  const deliverableGroupTrigger = await readText('packages/database/prisma/triggers/06_pr_deliverable_group_h_trigger.sql');
  const closeConditionGroupTrigger = await readText('packages/database/prisma/triggers/08_pr_close_condition_group_h_trigger.sql');
  const closeConditionGroupItemTrigger = await readText('packages/database/prisma/triggers/09_pr_close_condition_group_item_r_h_trigger.sql');
  const legacyIssueArchiveTrigger = await readText('packages/database/prisma/triggers/77_pr_legacy_issue_archive_h_trigger.sql');
  const taskEffortLogTrigger = await readText('packages/database/prisma/triggers/78_pr_task_effort_log_h_trigger.sql');
  const triggerScript = await readText('packages/database/scripts/apply-triggers.ts');
  const verifier = await readText('scripts/verify-pms-launch-readiness.mjs');
  const pmsAiIndexAdapter = await readText('apps/server/src/modules/pms/search/pms-ai-index.adapter.ts');
  const pmsAiRagVerifier = await readText('scripts/verify-pms-ai-rag-runtime-evidence.mjs');
  const pmsAiRagReportVerifier = await readText('scripts/verify-pms-ai-rag-runtime-report.mjs');
  const pmsAiRagCompletionRunner = await readText('scripts/complete-pms-ai-rag-provider-ready.mjs');
  const pmsAiRagEvidenceRecorder = await readText('scripts/record-pms-ai-rag-provider-ready-evidence.mjs');
  const pmsAiRagBundlePreparer = await readText('scripts/prepare-pms-ai-rag-provider-ready-bundle.mjs');
  const pmsAiRagBundleVerifier = await readText('scripts/verify-pms-ai-rag-provider-ready-bundle.mjs');
  const pmsLaunchHostVerifier = await readText('scripts/verify-pms-launch-host-readiness.mjs');
  const pmsRoadmap = await readText('docs/pms/planning/roadmap.md');
  const pmsBacklog = await readText('docs/pms/planning/backlog.md');
  const pmsCloseBrief = await readText('docs/pms/planning/current-baseline-close-brief.md');
  const launchVisualQa = await readText('output/playwright/pms-launch-visual-qa/check.mjs');
  const packageJson = await readText('package.json');

  assertIncludes(appLayout, 'deviceType === \'mobile\'', 'PMS layout branches for mobile viewport');
  assertIncludes(appLayout, 'sidebarMode="none"', 'PMS mobile layout removes desktop sidebar offset');
  assertIncludes(appLayout, 'mobileSidebarWidth', 'PMS mobile layout constrains overlay sidebar width');
  assertIncludes(appLayout, 'variant="mobile"', 'PMS mobile layout renders sidebar as a mobile drawer');
  assertIncludes(appLayout, 'onMobileMenuClick={toggleMobileMenu}', 'PMS mobile header can open the sidebar drawer');
  assertIncludes(appLayout, 'contentSlot={<ContentArea />}', 'PMS mobile layout keeps the real content area mounted');
  assertNotIncludes(appLayout, '모바일 버전 준비 중', 'PMS mobile layout must not show a launch-blocking placeholder');
  assertNotIncludes(appLayout, 'SsooContentAreaState', 'PMS mobile layout must not replace content with an empty state');
  assertIncludes(header, 'leadingAction={{', 'PMS header exposes the mobile menu trigger through shared header leading action');
  assertIncludes(header, 'search={null}', 'PMS mobile header removes desktop search crowding');
  assertIncludes(header, 'primaryAction={null}', 'PMS mobile header removes desktop primary CTA crowding');
  assertIncludes(header, 'search={globalHeaderSearch.search}', 'PMS desktop header keeps the shared global search config');
  assertIncludes(header, 'const headerLeading = buildHeaderLeading(activeTab);', 'PMS header derives breadcrumb context from the active MDI tab');
  assertIncludes(header, "title: `PMS / ${sectionLabel}`", 'PMS header renders the app and section breadcrumb label');
  assertIncludes(header, "'/project/detail': '프로젝트 상세'", 'PMS header maps project detail tabs to a human-readable breadcrumb section');
  assertIncludes(header, "'/settings': '설정'", 'PMS header maps local settings tabs to a human-readable breadcrumb section');
  assertIncludes(header, "[GLOBAL_SEARCH_PATH]: '통합 검색'", 'PMS header maps global search tabs to a human-readable breadcrumb section');
  assertIncludes(header, "leading={headerLeading}", 'PMS desktop and mobile headers expose the active breadcrumb through the shared header leading slot');
  assertIncludes(appLayout, 'SETTINGS_PATH', 'PMS shell can open the local settings URL as an MDI tab');
  assertIncludes(appLayout, "menuCode: 'PMS-SETTINGS'", 'PMS shell assigns a stable tab id for the local settings screen');
  assertIncludes(settingsRoute, '<AppLayout />', 'PMS /settings route enters the shared shell instead of rendering a bare page');
  assertIncludes(sidebar, "variant?: 'desktop' | 'mobile'", 'PMS sidebar supports explicit mobile variant');
  assertIncludes(sidebar, 'toggleLabel={toggleLabel}', 'PMS sidebar can pass a mobile close label to the shared shell');
  assertIncludes(menuTree, 'closeMobileMenu', 'PMS mobile menu closes after opening a menu tree tab');
  assertIncludes(adminMenu, 'closeMobileMenu', 'PMS mobile menu closes after opening an admin tab');
  assertIncludes(favorites, 'closeMobileMenu', 'PMS mobile menu closes after opening a favorite tab');
  assertIncludes(openTabs, 'closeMobileMenu', 'PMS mobile menu closes after activating an open tab');
  assertNotIncludes(contentArea, "'/admin/customer'", 'PMS launch shell must not expose customer master CRUD route');
  assertNotIncludes(contentArea, 'CustomerManagementPage', 'PMS launch shell must not load the removed customer master CRUD page');
  assertIncludes(dashboard, 'useHomeSummary', 'home tab consumes server policy summary');
  assertIncludes(dashboard, '업무 브리핑', 'dashboard exposes project-centered work briefing');
  assertIncludes(dashboard, '지금 봐야 할 것', 'dashboard exposes signal queue');
  assertIncludes(dashboard, '권한별 업무', 'dashboard exposes capability-based project actions');
  assertIncludes(dashboard, 'primaryAction', 'dashboard routes through server-selected primary actions');
  assertIncludes(dashboard, 'allowedActions', 'dashboard renders only allowed home actions');
  assertIncludes(dashboard, 'findReviewAction', 'dashboard can discover review feedback actions from home summary');
  assertIncludes(dashboard, 'feedback-review', 'dashboard exposes direct review feedback drilldown');
  assertIncludes(dashboard, 'metrics.feedback', 'dashboard exposes open review feedback count as a launch metric');
  assertIncludes(dashboard, 'RiskReportSummaryPanel', 'dashboard renders a dedicated risk/report aggregate panel');
  assertIncludes(dashboard, 'summary.riskReportSummary', 'dashboard consumes the server risk/report aggregate summary');
  assertIncludes(dashboard, '리스크/리포트 집계', 'dashboard labels the risk/report aggregate panel clearly');
  assertIncludes(dashboard, 'pms-home-risk-report-summary', 'dashboard exposes a stable browser-QA target for the risk/report aggregate panel');
  assertIncludes(dashboard, 'LaunchFeedbackPanel', 'dashboard renders a dedicated launch feedback queue panel');
  assertIncludes(dashboard, 'summary.feedbackSignals', 'dashboard consumes server-provided launch feedback signal rows');
  assertIncludes(dashboard, '런칭 피드백 큐', 'dashboard labels the launch feedback triage panel clearly');
  assertIncludes(dashboard, 'pms-home-launch-feedback-panel', 'dashboard exposes a stable browser-QA target for the launch feedback queue panel');
  assertIncludes(dashboard, 'pms-home-launch-feedback-item', 'dashboard exposes stable browser-QA targets for launch feedback queue items');
  assertIncludes(dashboard, 'review-feedback-open', 'dashboard prioritizes open review feedback signals for review drilldown');
  assertIncludes(dashboard, 'MessageSquareText', 'dashboard renders review feedback with a distinct message icon');
  assertIncludes(dashboard, 'pms-home-feedback-review-action', 'dashboard exposes a stable browser-QA target for the review feedback drilldown');
  assertIncludes(dashboard, 'pms-home-access-project-action', 'dashboard exposes stable browser-QA targets for project detail drilldown');
  assertIncludes(dashboard, "'review'", 'dashboard can open the project review management tab from home');
  assertIncludes(dashboard, '운영 흐름', 'dashboard exposes status flow');
  assertIncludes(homeController, "@Controller('home')", 'server exposes PMS home controller');
  assertIncludes(homeController, "@Get('summary')", 'server exposes home summary endpoint');
  assertIncludes(homeService, 'projectAccessService.getProjectAccess', 'home summary is based on project access policy');
  assertIncludes(homeService, 'buildAllowedActions', 'home summary derives actions from project capabilities');
  assertIncludes(homeService, 'requiredCapability', 'home signals bind actions to required project capabilities');
  assertIncludes(homeService, "'review-feedback'", 'home summary exposes a review feedback action for issue-capable users');
  assertIncludes(homeService, "'리뷰/피드백'", 'home summary labels the review feedback action clearly');
  assertIncludes(homeService, 'isReviewFeedbackIssue', 'home summary separates launch feedback issues from generic control issues');
  assertIncludes(homeService, 'review-feedback-open', 'home summary creates open launch feedback signals');
  assertIncludes(homeService, '피드백 대기', 'home summary labels pending launch feedback clearly');
  assertIncludes(homeService, 'feedback: signals.filter', 'home summary publishes launch feedback metrics');
  assertIncludes(homeService, 'feedbackSignals: []', 'empty home summary initializes the launch feedback signal list');
  assertIncludes(homeService, 'buildFeedbackSignals(rawSignals)', 'home summary publishes uncollapsed launch feedback signals');
  assertIncludes(homeService, "signal.kind === 'review-feedback-open'", 'home summary keeps launch feedback signals separate from collapsed project signals');
  assertIncludes(homeService, 'buildRiskReportSummary', 'home summary builds a PMS risk/report aggregate block');
  assertIncludes(homeService, 'projectEvent.findMany', 'home summary reads PMS report/review events for aggregate reporting');
  assertIncludes(homeService, "eventTypeCode: { in: ['report', 'review'] }", 'home summary keeps report aggregation scoped to PMS report/review events');
  assertIncludes(homeService, 'isReportEventReady', 'home summary computes report readiness from linked deliverable and closeout blockers');
  assertIncludes(homeService, 'sortWeight: 123', 'home summary keeps launch feedback visible in the home signal queue');
  assertIncludes(homeService, "targetTab === targetTab", 'home summary can prefer a matching target tab when choosing a primary action');
  assertIncludes(homeService, 'canManageDeliverables', 'home summary includes deliverable capability actions');
  assertIncludes(homeService, 'canAdvanceStage', 'home summary includes stage advance capability actions');
  assertIncludes(homeService, 'project-issue-blocking', 'home summary creates blocking issue signals');
  assertIncludes(homeService, 'my-task-due', 'home summary creates member task signals');
  assertIncludes(homeService, 'closeout-blocked', 'home summary creates closeout signals');
  assertIncludes(homeService, 'project-unowned', 'home summary creates unowned project signals');
  assertIncludes(homeModule, 'ProjectModule', 'home module imports project policy module');
  assertIncludes(httpExceptionFilter, 'PMS_API_PATH_PREFIXES', 'server error filter keeps PMS API path scope explicit');
  assertIncludes(httpExceptionFilter, 'resolvePmsBadRequestCode', 'server error filter maps PMS bad requests to stable detailed codes');
  assertIncludes(httpExceptionFilter, 'PMS_INVALID_IDENTIFIER', 'server error filter exposes a stable PMS invalid identifier code');
  assertIncludes(httpExceptionFilter, 'PMS_PROJECT_PERMISSION_DENIED', 'server error filter exposes a stable PMS project permission code');
  assertIncludes(httpExceptionFilter, 'PMS_MASTER_IMPORT_INVALID', 'server error filter exposes a stable PMS master import code');
  assertIncludes(httpExceptionFilter, 'statusCode: status', 'server error response includes HTTP status metadata for launch diagnostics');
  assertIncludes(pmsModule, 'HomeModule', 'PMS module includes home module');
  assertIncludes(pmsModule, 'MasterModule', 'PMS module includes master module');
  assertIncludes(customerController, "@Controller('customers')", 'PMS keeps a customer lookup controller for execution selection compatibility');
  assertIncludes(customerController, '@Get()', 'PMS customer lookup exposes a read-only list endpoint');
  assertIncludes(customerController, "@Get(':id')", 'PMS customer lookup exposes a read-only detail endpoint');
  assertIncludes(customerController, '읽기용', 'PMS customer endpoint is documented as read-only');
  assertNotIncludes(customerController, '@Post()', 'PMS customer controller must not create customer masters');
  assertNotIncludes(customerController, "@Put(':id')", 'PMS customer controller must not update customer masters');
  assertNotIncludes(customerController, "@Delete(':id')", 'PMS customer controller must not deactivate customer masters');
  assertNotIncludes(customerController, "Roles('admin')", 'PMS customer controller must not retain a hidden admin write surface');
  assertNotIncludes(customerController, 'CreateCustomerDto', 'PMS customer controller must not import customer create DTOs');
  assertNotIncludes(customerController, 'UpdateCustomerDto', 'PMS customer controller must not import customer update DTOs');
  assertNotIncludes(customerService, '.create(', 'PMS customer service must not write customer masters');
  assertNotIncludes(customerService, '.update(', 'PMS customer service must not mutate customer masters');
  assertIncludes(customerService, 'attachOrganizationAnchors', 'PMS customer lookup returns common organization anchor metadata');
  assertIncludes(customerService, 'findExternalOrganizationCodes', 'PMS customer lookup search can match common organization code/name');
  assertIncludes(customerService, "orgType: 'external'", 'PMS customer lookup binds only external common organizations');
  assertIncludes(customerService, 'organizationId: organization?.orgId ?? null', 'PMS customer lookup exposes the common organization id when bridged');
  assertIncludes(customerDto, 'organizationId?: string | null', 'PMS customer DTO exposes common organization id metadata');
  assertIncludes(customerDto, 'organizationCode?: string | null', 'PMS customer DTO exposes common organization code metadata');
  assertIncludes(homeApi, "'/home/summary'", 'web client calls home summary endpoint');
  assertIncludes(homeQuery, 'useHomeSummary', 'web query hook exposes home summary');
  assertIncludes(queryIndex, 'useHomeSummary', 'query hook barrel exports home summary hook');
  assertIncludes(projectQueries, 'homeSummaryKeys', 'project issue mutations invalidate PMS home feedback summary');
  assertIncludes(projectQueries, 'queryKey: homeSummaryKeys.all', 'project issue mutations refresh home summary after feedback changes');
  assertIncludes(customerApi, "apiClient.get<CustomerListApiResponse>('/customers'", 'PMS web client keeps customer read-only list lookup');
  assertIncludes(customerApi, 'apiClient.get<ApiResponse<CustomerItem>>(`/customers/${id}`)', 'PMS web client keeps customer read-only detail lookup');
  assertIncludes(customerApi, 'organizationId?: string | null', 'PMS web customer type exposes common organization id metadata');
  assertNotIncludes(customerApi, 'apiClient.post', 'PMS web client must not create customer masters');
  assertNotIncludes(customerApi, 'apiClient.put', 'PMS web client must not update customer masters');
  assertNotIncludes(customerApi, 'apiClient.delete', 'PMS web client must not deactivate customer masters');
  assertNotIncludes(customerApi, 'CreateCustomerRequest', 'PMS web client must not export customer create payloads');
  assertNotIncludes(customerApi, 'UpdateCustomerRequest', 'PMS web client must not export customer update payloads');
  assertIncludes(customerQuery, 'useCustomerList', 'PMS query layer keeps customer lookup hook for execution forms');
  assertIncludes(customerQuery, 'useCustomerDetail', 'PMS query layer keeps customer detail lookup hook');
  assertNotIncludes(customerQuery, 'useMutation', 'PMS customer query layer must not expose customer write mutations');
  assertNotIncludes(queryIndex, 'useCreateCustomer', 'query hook barrel must not export customer create mutation');
  assertNotIncludes(queryIndex, 'useUpdateCustomer', 'query hook barrel must not export customer update mutation');
  assertNotIncludes(queryIndex, 'useDeactivateCustomer', 'query hook barrel must not export customer deactivate mutation');
  assertIncludes(homeTypes, 'PmsHomeSummary', 'shared PMS types define home summary contract');
  assertIncludes(homeTypes, 'PmsHomeAllowedAction', 'shared PMS types define home allowed action contract');
  assertIncludes(homeTypes, 'PmsHomeAccessProject', 'shared PMS types define project capability summary');
  assertIncludes(homeTypes, "'review-feedback'", 'shared PMS home type allows review feedback actions');
  assertIncludes(homeTypes, "'review-feedback-open'", 'shared PMS home type allows launch feedback signals');
  assertIncludes(homeTypes, 'feedback: number', 'shared PMS home metrics include launch feedback count');
  assertIncludes(homeTypes, 'feedbackSignals: PmsHomeSignal[]', 'shared PMS home summary exposes launch feedback signal rows');
  assertIncludes(homeTypes, 'PmsHomeRiskReportSummary', 'shared PMS home type defines the risk/report aggregate contract');
  assertIncludes(homeTypes, 'riskReportSummary: PmsHomeRiskReportSummary', 'shared PMS home summary exports the risk/report aggregate block');
  assertIncludes(homeTypes, 'readyReports: number', 'shared PMS home risk/report summary exposes report readiness');
  assertIncludes(homeTypes, "'review'", 'shared PMS home type allows direct review tab targets');
  assertIncludes(customerTypes, 'organizationId?: string | null', 'shared PMS customer lookup type exposes common organization id metadata');
  assertIncludes(customerTypes, 'Customer/account master editing is owned by CRM/Admin/common organization', 'shared PMS customer type documents CRM/Admin ownership boundary');
  assertIncludes(projectService, 'attachProjectCustomerOrganizationAnchors', 'PMS project API enriches project responses with customer common organization anchors');
  assertIncludes(projectService, 'customerOrganizationId: organization?.orgId ?? null', 'PMS project response exposes bridged customer common organization id');
  assertIncludes(projectController, 'search: params.search', 'PMS project list controller forwards search filter for lookup selection');
  assertIncludes(projectService, 'const searchWhere: Prisma.ProjectWhereInput | undefined', 'PMS project list service builds a project lookup search predicate');
  assertIncludes(projectService, "{ projectName: { contains: search, mode: 'insensitive' } }", 'PMS project lookup search can match project names');
  assertIncludes(projectService, "...(/^\\d+$/.test(search) ? [{ id: BigInt(search) }] : [])", 'PMS project lookup search can match exact project numbers');
  assertIncludes(projectOrgController, "@Get('lookup')", 'PMS project org controller exposes a read-only common organization lookup');
  assertIncludes(projectOrgController, 'findOrganizationLookup', 'PMS project org controller routes common organization lookup through service');
  assertIncludes(projectOrgService, 'findOrganizationLookup', 'PMS project org service provides a read-only common organization lookup');
  assertIncludes(projectOrgService, 'this.db.client.organization.findMany', 'PMS project org lookup reads common organizations without owning the organization ledger');
  assertIncludes(projectOrgService, "scope: 'external'", 'PMS project org lookup defaults supplier/partner choices to external organizations');
  assertNotIncludes(projectOrgService, 'findOrganizationLookup(params: FindProjectOrgLookupDto = {}) {\n    const search = params.search?.trim();\n    const limit = this.normalizeLookupLimit(params.limit);\n    const scope = params.scope === \'internal\' || params.scope === \'external\'\n      ? params.scope\n      : \'external\';\n\n    const organizations = await this.db.client.organization.upsert', 'PMS project org lookup must not upsert common organizations');
  assertIncludes(memberController, "@Get('lookup')", 'PMS member controller exposes project-scoped user lookup');
  assertIncludes(memberController, "@RequireProjectFeature('canManageMembers')", 'PMS member user lookup is gated by member management capability');
  assertIncludes(memberController, 'findUserLookup', 'PMS member controller routes user lookup through service');
  assertIncludes(memberService, 'findUserLookup(params: FindProjectMemberUserLookupDto = {})', 'PMS member service provides a read-only common user lookup');
  assertIncludes(memberService, 'this.db.client.user.findMany', 'PMS member user lookup reads common users without owning user lifecycle');
  assertIncludes(memberService, 'isActive: true', 'PMS member user lookup only returns active common users');
  assertIncludes(memberService, 'authAccount', 'PMS member user lookup can search and display login id');
  assertIncludes(memberService, 'organizationRelations', 'PMS member user lookup returns primary organization anchor metadata');
  assertIncludes(memberService, "orgClass: 'permanent'", 'PMS member user lookup uses permanent common organization anchors');
  assertNotIncludes(memberService, 'this.db.client.user.create', 'PMS member user lookup must not create common users');
  assertNotIncludes(memberService, 'this.db.client.user.update', 'PMS member user lookup must not update common users');
  assertIncludes(projectDto, 'customerOrganizationId?: string | null', 'PMS project DTO exposes customer common organization id metadata');
  assertIncludes(projectDto, 'customerOrganizationCode?: string | null', 'PMS project DTO exposes customer common organization code metadata');
  assertIncludes(projectTypes, 'customerOrganizationId?: string | null', 'shared PMS project type exposes customer common organization id metadata');
  assertIncludes(projectTypes, 'ProjectOrgLookup', 'shared PMS project type exposes common organization lookup projection');
  assertIncludes(projectTypes, 'FindProjectOrgLookupDto', 'shared PMS project type exposes common organization lookup filters');
  assertIncludes(memberTypes, 'ProjectMemberUserLookup', 'shared PMS member type exposes common user lookup projection');
  assertIncludes(memberTypes, 'FindProjectMemberUserLookupDto', 'shared PMS member type exposes common user lookup filters');
  assertIncludes(projectApi, 'customerOrganizationId?: number | string | null', 'PMS web project type exposes customer common organization id metadata');
  assertIncludes(projectApi, 'getProjectOrgLookup', 'PMS web project API exposes read-only project organization lookup');
  assertIncludes(projectApi, '`/projects/${projectId}/organizations/lookup`', 'PMS web project API calls the project-scoped organization lookup endpoint');
  assertIncludes(projectApi, 'getMemberUserLookup', 'PMS web project API exposes project member common user lookup');
  assertIncludes(projectApi, '`/projects/${projectId}/members/lookup`', 'PMS web project API calls the project-scoped member user lookup endpoint');
  assertIncludes(projectApi, 'export interface ProjectFilters extends ListParams', 'PMS web project list filters inherit search for project lookup selection');
  assertIncludes(projectApi, 'customerId?: number | string', 'PMS web project filters accept lookup-selected customer ids without forcing typed numeric input');
  assertIncludes(projectApi, 'getContracts: async', 'PMS web project API exposes project contract snapshots as a read path');
  assertIncludes(projectApi, 'applyCrmContractHandoffSnapshot: async', 'PMS web project API applies CRM handoff previews through the explicit snapshot endpoint');
  assertIncludes(projectApi, 'applyDeliverableTemplate: async', 'PMS web project API exposes deliverable template application');
  assertIncludes(projectApi, "applyMode?: 'append' | 'replace'", 'PMS web project API types expose append/replace template apply mode');
  assertIncludes(projectApi, 'deactivatedCount: number', 'PMS web project API types expose template replace deactivation count');
  assertIncludes(projectApi, 'getDeliverableTemplateGroups: async', 'PMS web project API exposes deliverable template group lookup');
  assertIncludes(projectApi, 'upsertDeliverableTemplateGroup: async', 'PMS web project API exposes deliverable template group save');
  assertIncludes(projectApi, 'applyCloseConditionTemplate: async', 'PMS web project API exposes close-condition template application');
  assertIncludes(projectApi, 'getCloseConditionTemplateGroups: async', 'PMS web project API exposes close-condition template group lookup');
  assertIncludes(projectApi, 'upsertCloseConditionTemplateGroup: async', 'PMS web project API exposes close-condition template group save');
  assertNotIncludes(projectApi, 'createContract:', 'PMS web project API must not expose direct contract creation');
  assertNotIncludes(projectApi, 'updateContract:', 'PMS web project API must not expose direct contract editing');
  assertNotIncludes(projectApi, 'createContractPayment:', 'PMS web project API must not expose direct billing/payment creation');
  assertNotIncludes(projectApi, 'updateContractPayment:', 'PMS web project API must not expose direct billing/payment editing');
  assertIncludes(crmHandoffApi, "apiClient.get<ApiResponse<CrmContractListResponse>>('/crm/contracts'", 'PMS CRM handoff client reads CRM contract candidates');
  assertIncludes(crmHandoffApi, '/pms-handoff-preview', 'PMS CRM handoff client reads CRM PMS handoff previews');
  assertIncludes(crmHandoffApi, 'readyOnly', 'PMS CRM handoff client can filter ready candidates without writing CRM ledgers');
  assertNotIncludes(crmHandoffApi, 'apiClient.post', 'PMS CRM handoff client must not create CRM contracts');
  assertNotIncludes(crmHandoffApi, 'apiClient.put', 'PMS CRM handoff client must not edit CRM contracts or billing');
  assertNotIncludes(crmHandoffApi, 'apiClient.delete', 'PMS CRM handoff client must not delete CRM contracts');
  assertIncludes(crmHandoffQuery, 'useQuery', 'PMS CRM handoff hook is query-only for CRM candidates and preview');
  assertNotIncludes(crmHandoffQuery, 'useMutation', 'PMS CRM handoff hook must not expose CRM write mutations');
  assertIncludes(projectQueries, 'useApplyCrmContractHandoffSnapshot', 'PMS project query layer exposes only the explicit CRM preview snapshot mutation');
  assertIncludes(projectQueries, 'projectsApi.applyCrmContractHandoffSnapshot', 'PMS project query layer routes CRM handoff acceptance through the snapshot endpoint');
  assertIncludes(projectQueries, 'useApplyDeliverableTemplate', 'PMS project query layer exposes deliverable template mutation');
  assertIncludes(projectQueries, 'projectsApi.applyDeliverableTemplate', 'PMS project query layer routes deliverable template application through the API');
  assertIncludes(projectQueries, 'useDeliverableTemplateGroups', 'PMS project query layer exposes deliverable template group lookup');
  assertIncludes(projectQueries, 'useSaveDeliverableTemplateGroup', 'PMS project query layer exposes deliverable template group save');
  assertIncludes(projectQueries, 'useApplyCloseConditionTemplate', 'PMS project query layer exposes close-condition template mutation');
  assertIncludes(projectQueries, 'projectsApi.applyCloseConditionTemplate', 'PMS project query layer routes close-condition template application through the API');
  assertIncludes(projectQueries, 'useCloseConditionTemplateGroups', 'PMS project query layer exposes close-condition template group lookup');
  assertIncludes(projectQueries, 'useSaveCloseConditionTemplateGroup', 'PMS project query layer exposes close-condition template group save');
  assertNotIncludes(projectQueries, 'projectsApi.createContract', 'PMS query layer must not call direct PMS contract create from the web');
  assertNotIncludes(projectQueries, 'projectsApi.updateContract', 'PMS query layer must not call direct PMS contract update from the web');
  assertNotIncludes(projectQueries, 'projectsApi.createContractPayment', 'PMS query layer must not call direct PMS payment create from the web');
  assertNotIncludes(projectQueries, 'projectsApi.updateContractPayment', 'PMS query layer must not call direct PMS payment update from the web');
  assertIncludes(projectHandoffContractService, 'assertReadyCrmContractHandoffPreview', 'PMS server only accepts CRM handoff snapshots after ready-preview validation');
  assertIncludes(projectHandoffContractService, "billingTypeCode: 'crm-billing-plan'", 'PMS server marks accepted CRM handoff contracts as billing-plan snapshots');
  assertIncludes(projectHandoffContractService, 'createCrmContractSnapshotMemo', 'PMS server writes CRM contract boundary evidence into the snapshot memo');
  assertIncludes(projectHandoffContractService, 'CRM 청구계획', 'PMS server converts CRM billing plan rows into explicit PMS payment snapshots');
  assertIncludes(projectHandoffContractService, 'CRM 계약 원장은 CRM이 소유', 'PMS server preserves the CRM ownership boundary notice in snapshots');
  assertNotIncludes(projectHandoffContractService, 'crm.crm_contract', 'PMS handoff contract service must not write CRM contract ledger tables');
  assertNotIncludes(projectHandoffContractService, 'replaceBilling', 'PMS handoff contract service must not invoke CRM billing replacement logic');
  assertIncludes(crmContractController, "@Get(':id/pms-handoff-preview')", 'CRM exposes a read-only PMS handoff preview endpoint');
  assertIncludes(crmContractController, 'PMS 실행 프로젝트 생성을 수행하지 않는 읽기용 계약 스냅샷', 'CRM preview endpoint documents that it does not create PMS projects');
  assertIncludes(crmContractService, 'PMS는 이 preview를 읽기용 실행 스냅샷으로 소비', 'CRM preview payload states PMS read-only execution snapshot consumption');
  assertIncludes(projectDisplay, 'formatProjectCustomerLabel', 'PMS web has a shared customer label formatter for project surfaces');
  assertIncludes(projectDisplay, 'formatProjectCustomerOrganizationLabel', 'PMS web has a shared customer organization anchor formatter');
  assertIncludes(projectDisplay, 'formatCustomerOrganizationAnchorLabel', 'PMS web has a shared customer lookup organization anchor formatter');
  assertIncludes(projectDisplay, 'formatCustomerLookupCaption', 'PMS web has a shared customer lookup caption formatter for selectors');
  assertIncludes(projectDisplay, 'formatCustomerLookupLabel', 'PMS web has a shared read-only customer lookup label formatter');
  assertNotIncludes(projectDisplay, 'String(project.customerId)', 'PMS project customer display must not fall back to raw customer ids');
  assertNotIncludes(projectDisplay, '공용 조직 연결', 'PMS customer lookup display must not collapse organization anchors to a generic linked state');
  assertIncludes(projectDisplay, '공용 조직 정보 조회 필요', 'PMS project display uses a launch-facing common organization fallback instead of raw ids');
  assertIncludes(projectDisplay, '플랜트/사이트 정보 조회 필요', 'PMS project display uses a launch-facing plant/site fallback instead of raw ids');
  assertIncludes(projectDisplay, '시스템 인스턴스 정보 조회 필요', 'PMS project display uses a launch-facing system instance fallback instead of raw ids');
  assertNotIncludes(projectDisplay, 'String(project.plantId)', 'PMS project display must not fall back to raw plant/site ids');
  assertNotIncludes(projectDisplay, 'String(project.systemInstanceId)', 'PMS project display must not fall back to raw system instance ids');
  assertIncludes(pmsFormat, 'formatPmsDate', 'PMS web has a shared launch date formatter');
  assertIncludes(pmsFormat, 'formatPmsDateTime', 'PMS web has a shared launch datetime formatter');
  assertIncludes(pmsFormat, 'formatPmsAmount', 'PMS web has a shared launch amount formatter');
  assertIncludes(pmsFormat, 'formatPmsNumber', 'PMS web has a shared launch number formatter');
  assertIncludes(pmsFormat, 'Number.isNaN(date.getTime())', 'PMS web formatters guard invalid dates');
  assertIncludes(proposalListPage, 'formatPmsAmount', 'proposal list uses the shared PMS amount formatter');
  assertIncludes(executionListPage, 'formatPmsAmount', 'execution list uses the shared PMS amount formatter');
  assertIncludes(handoffsTab, 'formatPmsAmount', 'handoff tab uses the shared PMS amount formatter');
  assertIncludes(reviewSummaryTab, 'formatPmsDateTime', 'review tab uses the shared PMS datetime formatter');
  assertIncludes(masterPage, 'formatPmsShortDateTime', 'PMS master import history uses the shared short datetime formatter');
  for (const [content, label] of [
    [dashboard, 'dashboard'],
    [requestListPage, 'request list'],
    [proposalListPage, 'proposal list'],
    [executionListPage, 'execution list'],
    [transitionListPage, 'transition list'],
    [workQueuePages, 'work queue pages'],
    [basicInfoSection, 'project basic info'],
    [requestDetailTab, 'request detail tab'],
    [proposalDetailTab, 'proposal detail tab'],
    [executionDetailTab, 'execution detail tab'],
    [transitionDetailTab, 'transition detail tab'],
    [handoffsTab, 'handoff tab'],
    [reviewSummaryTab, 'review summary tab'],
    [deliverablesTab, 'deliverables tab'],
    [membersTab, 'members tab'],
    [closeConditionsTab, 'close conditions tab'],
    [tasksTab, 'tasks tab'],
    [milestonesTab, 'milestones tab'],
    [objectivesPanel, 'objectives panel'],
    [masterPage, 'master data page'],
  ]) {
    assertNotIncludes(content, '.toLocaleDateString(', `${label} must use the shared PMS date formatter`);
    assertNotIncludes(content, '.toLocaleString(', `${label} must use the shared PMS datetime/number formatter`);
  }
  assertIncludes(pmsTypeIndex, 'PmsHomeSummary', 'PMS type index exports home summary contract');
  assertIncludes(pmsTypeIndex, 'PmsHomeAllowedAction', 'PMS type index exports home allowed action contract');
  assertIncludes(pmsTypeIndex, 'PmsHomeRiskReportSummary', 'PMS type index exports home risk/report aggregate contract');
  assertIncludes(pmsTypeIndex, 'Customer', 'PMS type index keeps read-only customer lookup projection');
  assertIncludes(pmsTypeIndex, 'ProjectMemberUserLookup', 'PMS type index exports member user lookup projection');
  assertNotIncludes(pmsTypeIndex, 'CreateCustomerDto', 'PMS type index must not export customer create DTOs');
  assertNotIncludes(pmsTypeIndex, 'UpdateCustomerDto', 'PMS type index must not export customer update DTOs');
  assertIncludes(rootTypesIndex, 'ProjectMemberUserLookup', 'root type index exports PMS member user lookup projection');
  assertIncludes(rootTypesIndex, 'PmsHomeRiskReportSummary', 'root type index exports PMS home risk/report aggregate contract');
  assertNotIncludes(rootTypesIndex, 'CreateCustomerDto', 'root type index must not export PMS customer create DTOs');
  assertNotIncludes(rootTypesIndex, 'UpdateCustomerDto', 'root type index must not export PMS customer update DTOs');
  assertIncludes(basicInfoSection, 'formatCustomerLookupCaption', 'project basic info customer selector shows customer code and common organization anchors');
  assertIncludes(basicInfoSection, 'formatCustomerOrganizationAnchorLabel', 'project basic info lookup fallback shows common organization names/codes instead of raw ids');
  assertIncludes(basicInfoSection, 'formatProjectCustomerOrganizationLabel', 'project basic info read view shows the project customer common organization anchor');
  assertNotIncludes(basicInfoSection, 'const formatCustomerCaption', 'project basic info must not reintroduce a local generic customer caption formatter');
  assertNotIncludes(basicInfoSection, '`공용 조직 ${lookupCustomer.organizationId}`', 'project basic info must not expose raw common organization ids as a fallback label');
  assertIncludes(requestListPage, 'formatProjectCustomerLabel', 'request list shows customer name and common organization anchor metadata');
  assertIncludes(proposalListPage, 'formatProjectCustomerLabel', 'proposal list shows customer name and common organization anchor metadata');
  assertIncludes(executionListPage, 'formatProjectCustomerLabel', 'execution list shows customer name and common organization anchor metadata');
  assertIncludes(transitionListPage, 'formatProjectCustomerLabel', 'transition list shows customer name and common organization anchor metadata');
  assertIncludes(requestListPage, 'formatCustomerLookupLabel', 'request list customer filter uses read-only customer lookup labels');
  assertIncludes(proposalListPage, 'formatCustomerLookupLabel', 'proposal list customer filter uses read-only customer lookup labels');
  assertIncludes(executionListPage, 'formatCustomerLookupLabel', 'execution list customer filter uses read-only customer lookup labels');
  assertIncludes(transitionListPage, 'formatCustomerLookupLabel', 'transition list customer filter uses read-only customer lookup labels');
  assertIncludes(requestListPage, "{ key: 'customerId', type: 'select', placeholder: '고객사'", 'request list uses a customer selector filter instead of raw customer ID input');
  assertIncludes(proposalListPage, "{ key: 'customerId', type: 'select', placeholder: '고객사'", 'proposal list uses a customer selector filter instead of raw customer ID input');
  assertIncludes(executionListPage, "{ key: 'customerId', type: 'select', placeholder: '고객사'", 'execution list uses a customer selector filter instead of raw customer ID input');
  assertIncludes(transitionListPage, "{ key: 'customerId', type: 'select', placeholder: '고객사'", 'transition list uses a customer selector filter instead of raw customer ID input');
  assertIncludes(requestListPage, "id: 'customer'", 'request list customer column is keyed by display purpose instead of raw customer ID');
  assertIncludes(proposalListPage, "id: 'customer'", 'proposal list customer column is keyed by display purpose instead of raw customer ID');
  assertIncludes(executionListPage, "id: 'customer'", 'execution list customer column is keyed by display purpose instead of raw customer ID');
  assertIncludes(transitionListPage, "id: 'customer'", 'transition list customer column is keyed by display purpose instead of raw customer ID');
  assertNotIncludes(requestListPage, "accessorKey: 'customerId'", 'request list must not expose raw customerId as the customer column key');
  assertNotIncludes(proposalListPage, "accessorKey: 'customerId'", 'proposal list must not expose raw customerId as the customer column key');
  assertNotIncludes(executionListPage, "accessorKey: 'customerId'", 'execution list must not expose raw customerId as the customer column key');
  assertNotIncludes(transitionListPage, "accessorKey: 'customerId'", 'transition list must not expose raw customerId as the customer column key');
  assertNotIncludes(requestListPage, "placeholder: '고객사 ID'", 'request list must not ask users to type raw customer IDs');
  assertNotIncludes(proposalListPage, "placeholder: '고객사 ID'", 'proposal list must not ask users to type raw customer IDs');
  assertNotIncludes(executionListPage, "placeholder: '고객사 ID'", 'execution list must not ask users to type raw customer IDs');
  assertNotIncludes(transitionListPage, "placeholder: '고객사 ID'", 'transition list must not ask users to type raw customer IDs');
  assertIncludes(requestListPage, 'useProjectMembers', 'request list resolves selected request owner labels through project members');
  assertIncludes(requestListPage, 'requestOwnerLabel', 'request list second grid uses a launch-facing owner label column');
  assertIncludes(requestListPage, 'formatProjectMemberOwnerLabel', 'request list second grid formats owner labels with member names when available');
  assertNotIncludes(requestListPage, "cell: ({ row }) => row.original.requestOwnerUserId ? String(row.original.requestOwnerUserId) : '-'", 'request list second grid must not display raw request owner user ids');
  assertIncludes(projectMemberOwnerSelect, '사용자 정보 조회 필요', 'project owner selector uses a launch-facing fallback when a user is no longer in the member lookup');
  assertIncludes(projectMemberOwnerSelect, '소속 조직 연결', 'project owner selector avoids raw organization ids in member descriptions');
  assertNotIncludes(projectMemberOwnerSelect, '`사용자 ${value}`', 'project owner selector must not expose raw user ids as fallback labels');
  assertIncludes(dashboard, "return ownerUserId ? '담당 지정됨' : '담당 미지정';", 'PMS dashboard avoids raw owner user ids in launch-facing labels');
  assertNotIncludes(dashboard, '담당 ${ownerUserId}', 'PMS dashboard must not expose raw owner user ids');
  assertIncludes(workQueuePages, "project.currentOwnerUserId ? '지정됨' : '미지정'", 'PMS work queue cards avoid raw owner user ids in launch-facing labels');
  assertNotIncludes(workQueuePages, 'project.currentOwnerUserId ? project.currentOwnerUserId', 'PMS work queue cards must not expose raw owner user ids');
  assertIncludes(transitionListPage, "return id ? '담당 지정됨' : '담당 미지정';", 'transition list avoids raw operation owner user ids in launch-facing labels');
  assertNotIncludes(transitionListPage, 'return id ? String(id) :', 'transition list must not expose raw operation owner user ids');
  assertIncludes(organizationsSection, 'formatOrganizationName', 'project organization section uses a launch-facing organization fallback formatter');
  assertIncludes(organizationsSection, 'formatOrganizationCaption', 'project organization section uses a launch-facing organization caption formatter');
  assertNotIncludes(organizationsSection, '`조직 ${projectOrg.organizationId}`', 'project organization section must not expose raw organization ids as names');
  assertNotIncludes(organizationsSection, '`ID ${projectOrg.organizationId}`', 'project organization section must not expose raw organization ids as captions');
  assertIncludes(relationsSection, 'formatCounterpartProjectName', 'project relation section uses a launch-facing project fallback formatter');
  assertIncludes(relationsSection, 'formatCounterpartProjectMeta', 'project relation section uses a launch-facing project metadata fallback formatter');
  assertNotIncludes(relationsSection, '`프로젝트 ${isOutgoing ? relation.targetProjectId : relation.sourceProjectId}`', 'project relation section must not expose raw project ids as names');
  assertNotIncludes(relationsSection, '`ID ${isOutgoing ? relation.targetProjectId : relation.sourceProjectId}`', 'project relation section must not expose raw project ids as metadata');
  assertIncludes(workQueuePages, 'formatProjectCustomerName', 'work queue cards show customer names from project responses');
  assertIncludes(requestCreatePage, 'formatCustomerLookupCaption', 'request intake customer selector shows customer code and common organization anchors');
  assertIncludes(masterPage, 'formatCustomerLookupCaption', 'PMS master selectors show customer code and common organization anchors');
  assertNotIncludes(requestCreatePage, 'const formatCustomerCaption', 'request intake must not reintroduce a local generic customer caption formatter');
  assertNotIncludes(masterPage, 'const formatCustomerCaption', 'PMS master selectors must not reintroduce a local generic customer caption formatter');
  assertIncludes(projectQueries, 'useProjectOrgLookup', 'PMS query layer exposes project organization lookup hook');
  assertIncludes(projectQueries, 'useProjectMemberUserLookup', 'PMS query layer exposes project member user lookup hook');
  assertIncludes(organizationsSection, 'useProjectOrgLookup', 'project organization section uses common organization lookup instead of raw ID entry');
  assertIncludes(organizationsSection, 'selectedOrganizationId', 'project organization section stores a selected common organization id from lookup results');
  assertIncludes(organizationsSection, 'organizationSearch', 'project organization section lets users search common organizations by name or code');
  assertIncludes(organizationsSection, 'scope: \'external\'', 'project organization section defaults supplier/partner lookup to external organizations');
  assertNotIncludes(organizationsSection, '조직 ID 형식을 확인해주세요', 'project organization section must not rely on raw organization ID validation');
  assertNotIncludes(organizationsSection, '숫자 Organization ID', 'project organization section must not instruct users to type raw Organization IDs');
  assertIncludes(relationsSection, 'useProjectList', 'project relation section uses project lookup instead of raw target ID entry');
  assertIncludes(relationsSection, 'projectSearch', 'project relation section lets users search projects by name or number');
  assertIncludes(relationsSection, 'selectedTargetProjectId', 'project relation section stores a selected project id from lookup results');
  assertIncludes(relationsSection, 'linkedTargetProjectIds', 'project relation section filters already linked target projects');
  assertNotIncludes(relationsSection, '연결 대상 프로젝트 ID', 'project relation section must not ask users to type raw project IDs');
  assertNotIncludes(relationsSection, '숫자 프로젝트 ID', 'project relation section must not instruct users to type raw project IDs');
  assertNotIncludes(relationsSection, '대상 프로젝트 ID 형식을 확인해주세요', 'project relation section must not rely on raw project ID validation');
  assertIncludes(executionDetailTab, 'useProjectList', 'execution detail successor project field uses project lookup instead of raw next project ID entry');
  assertIncludes(executionDetailTab, 'projectSearch', 'execution detail lets users search successor projects by name or number');
  assertIncludes(executionDetailTab, 'selectedNextProjectId', 'execution detail stores a selected successor project from lookup results');
  assertIncludes(executionDetailTab, 'formatProjectOption', 'execution detail renders successor projects with name and project number labels');
  assertIncludes(executionDetailTab, 'form.setValue(\n                  \'nextProjectId\'', 'execution detail writes the selected successor to the compatibility nextProjectId field');
  assertNotIncludes(executionDetailTab, '후속 프로젝트 ID', 'execution detail must not label successor project as a raw ID field');
  assertNotIncludes(executionDetailTab, "form.register('nextProjectId')", 'execution detail must not expose raw nextProjectId input');
  assertIncludes(projectMemberOwnerSelect, 'useProjectMembers', 'project detail owner selector uses active project members instead of raw user ID entry');
  assertIncludes(projectMemberOwnerSelect, '프로젝트 멤버 중 담당자를 선택합니다.', 'project detail owner selector explains member-based owner selection');
  assertIncludes(projectMemberOwnerSelect, 'formatProjectMemberOwnerLabel', 'project detail owner selector can render owner names from project members');
  assertIncludes(requestDetailTab, 'ProjectMemberOwnerSelect', 'request detail owner field uses project member selection');
  assertIncludes(requestDetailTab, "form.setValue(\n                'requestOwnerUserId'", 'request detail owner selection writes the canonical owner user field');
  assertNotIncludes(requestDetailTab, '담당자 ID', 'request detail tab must not label request owner as a raw ID field');
  assertNotIncludes(requestDetailTab, "form.register('requestOwnerUserId')", 'request detail tab must not expose raw request owner ID input');
  assertIncludes(proposalDetailTab, 'ProjectMemberOwnerSelect', 'proposal detail owner field uses project member selection');
  assertIncludes(proposalDetailTab, "form.setValue(\n                'proposalOwnerUserId'", 'proposal detail owner selection writes the canonical owner user field');
  assertNotIncludes(proposalDetailTab, '제안 담당자 ID', 'proposal detail tab must not label proposal owner as a raw ID field');
  assertNotIncludes(proposalDetailTab, "form.register('proposalOwnerUserId')", 'proposal detail tab must not expose raw proposal owner ID input');
  assertIncludes(transitionDetailTab, 'ProjectMemberOwnerSelect', 'transition detail owner field uses project member selection');
  assertIncludes(transitionDetailTab, "form.setValue(\n                'operationOwnerUserId'", 'transition detail owner selection writes the canonical owner user field');
  assertNotIncludes(transitionDetailTab, '운영 담당자 ID', 'transition detail tab must not label operation owner as a raw ID field');
  assertNotIncludes(transitionDetailTab, "form.register('operationOwnerUserId')", 'transition detail tab must not expose raw operation owner ID input');
  assertIncludes(membersTab, 'useProjectMemberUserLookup', 'member tab uses common user lookup instead of raw user id entry');
  assertIncludes(membersTab, 'userSearch', 'member tab lets users search active common users by name/login/email');
  assertIncludes(membersTab, 'selectedUserId', 'member tab stores a selected common user id from lookup results');
  assertIncludes(membersTab, 'organizationId: selectedUser?.primaryOrganizationId ?? undefined', 'member add flow carries the selected user primary organization anchor when available');
  assertIncludes(membersTab, '활성 공용 사용자 조회 결과', 'member tab explains that users are selected from active common user lookup');
  assertNotIncludes(membersTab, '사용자 ID를 입력하세요', 'member tab must not ask users to type raw user IDs');
  assertNotIncludes(membersTab, 'userId: formData.userId', 'member add flow must not submit a raw typed user id');
  assertNotIncludes(typedocServerCustomerDto, 'CreateCustomerDto', 'PMS server TypeDoc must not publish removed customer create DTO');
  assertNotIncludes(typedocServerCustomerDto, 'UpdateCustomerDto', 'PMS server TypeDoc must not publish removed customer update DTO');
  assertNotIncludes(typedocWebCustomerQuery, 'useCreateCustomer', 'PMS web TypeDoc must not publish removed customer create mutation hook');
  assertNotIncludes(typedocWebCustomerQuery, 'useUpdateCustomer', 'PMS web TypeDoc must not publish removed customer update mutation hook');
  assertNotIncludes(typedocWebCustomerQuery, 'useDeactivateCustomer', 'PMS web TypeDoc must not publish removed customer deactivate mutation hook');
  assertNotIncludes(typedocWebCustomerApi, 'CreateCustomerRequest', 'PMS web TypeDoc must not publish removed customer create request type');
  assertNotIncludes(typedocWebCustomerApi, 'UpdateCustomerRequest', 'PMS web TypeDoc must not publish removed customer update request type');
  assertNotIncludes(typedocWebAdminIndex, 'CustomerManagementPage', 'PMS web TypeDoc must not publish removed customer master page');
  await assertMissingPath(
    'docs/pms/reference/typedoc/server/classes/customer_dto_customer.dto.CreateCustomerDto.html',
    'PMS server TypeDoc must remove stale CreateCustomerDto page',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/server/classes/customer_dto_customer.dto.UpdateCustomerDto.html',
    'PMS server TypeDoc must remove stale UpdateCustomerDto page',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/functions/hooks_queries_useCustomers.useCreateCustomer.html',
    'PMS web TypeDoc must remove stale useCreateCustomer page',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/functions/hooks_queries_useCustomers.useUpdateCustomer.html',
    'PMS web TypeDoc must remove stale useUpdateCustomer page',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/functions/hooks_queries_useCustomers.useDeactivateCustomer.html',
    'PMS web TypeDoc must remove stale useDeactivateCustomer page',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/functions/components_pages_admin_CustomerManagementPage.CustomerManagementPage.html',
    'PMS web TypeDoc must remove stale CustomerManagementPage page',
  );
  assertIncludesAll(
    assetMasterMigration,
    [
      'PMS execution asset master baseline',
      '"pms"."pr_site_m"',
      '"pms"."pr_site_h"',
      '"pms"."pr_system_catalog_m"',
      '"pms"."pr_system_catalog_h"',
      '"pms"."pr_system_instance_m"',
      '"pms"."pr_system_instance_h"',
      '"pms"."pr_integration_m"',
      '"pms"."pr_integration_h"',
      'customer_id',
      'site_id',
      'system_catalog_id',
      'source_system_instance_id',
      'target_system_instance_id',
    ],
    'PMS formal asset master migration covers site/catalog/instance/integration master and history tables',
  );
  assertNotIncludes(assetMasterMigration, '"crm".', 'PMS asset master migration must not create or own CRM ledger tables');
  assertIncludesAll(
    importProfileMigration,
    [
      'PMS master import shared mapping profiles',
      '"pms"."pr_master_import_profile_m"',
      '"pms"."pr_master_import_profile_h"',
      '"column_mapping" JSONB NOT NULL',
      '"is_default" BOOLEAN NOT NULL DEFAULT FALSE',
      '"uq_pr_master_import_profile_entity_name"',
    ],
    'PMS formal import-profile migration covers shared mapping profile storage and history',
  );
  assertNotIncludes(importProfileMigration, '"crm".', 'PMS import-profile migration must not create or own CRM ledger tables');
  assertIncludesAll(
    reconciliationFoundationMigration,
    [
      'PMS reconciliation foundation protected baseline',
      'to_regclass(\'pms.pr_project_m\') IS NULL',
      '"pms"."pr_project_member_r_m"',
      '"pms"."pr_project_org_r_m"',
      '"pms"."pr_project_relation_r_m"',
      '"pms"."pr_project_role_permission_r"',
      '"pms"."pr_handoff_m"',
      '"pms"."pr_contract_m"',
      '"pms"."pr_contract_payment_m"',
      '"pms"."pr_objective_m"',
      '"pms"."pr_wbs_m"',
      '"pms"."pr_task_m"',
      '"pms"."pr_milestone_m"',
      '"pms"."pr_issue_m"',
      '"pms"."pr_project_issue_m"',
      '"pms"."pr_requirement_m"',
      '"pms"."pr_risk_m"',
      '"pms"."pr_change_request_m"',
      '"pms"."pr_event_m"',
      '"pms"."pr_project_member_r_h"',
      '"pms"."pr_project_org_r_h"',
      '"pms"."pr_project_relation_r_h"',
      '"pms"."pr_project_role_permission_h"',
      '"pms"."pr_handoff_h"',
      '"pms"."pr_contract_h"',
      '"pms"."pr_contract_payment_h"',
      '"pms"."pr_objective_h"',
      '"pms"."pr_wbs_h"',
      '"pms"."pr_task_h"',
      '"pms"."pr_milestone_h"',
      '"pms"."pr_issue_h"',
      '"pms"."pr_project_issue_h"',
      '"pms"."pr_requirement_h"',
      '"pms"."pr_risk_h"',
      '"pms"."pr_change_request_h"',
      '"pms"."pr_event_h"',
      'owner_organization_id',
      'handoff_status_code',
      'event_id',
      'requires_deliverable',
    ],
    'PMS reconciliation foundation migration covers launch core project/member/org/handoff/planning/control/report tables and history tables',
  );
  assertNotIncludes(reconciliationFoundationMigration, '"crm".', 'PMS reconciliation foundation migration must not create or own CRM ledger tables');
  assertIncludes(permissionSeed, "permission_code = 'pms.customer.manage'", 'permission seed retires legacy PMS customer manage permission');
  assertIncludes(permissionSeed, "'pms.customer.read'", 'permission seed keeps only a PMS customer read permission');
  assertNotIncludes(permissionSeed, "('pms.customer.manage'", 'permission seed must not create active PMS customer manage permission');
  assertIncludes(detail, 'PM 실행 closeout', 'project detail exposes closeout panel');
  assertIncludes(detail, 'data-testid="pms-project-detail"', 'project detail exposes a stable browser-QA root');
  assertIncludes(detail, 'managementTab', 'project detail can open directly to a management tab from home actions');
  assertIncludes(detail, 'HandoffsTab', 'project detail exposes dedicated handoff management tab');
  assertIncludes(detail, '인수인계', 'project detail management tabs include handoff surface');
  assertIncludes(detail, 'ReviewSummaryTab', 'project detail exposes report/review summary tab');
  assertIncludes(detail, '리뷰', 'project detail management tabs include review surface');
  assertIncludes(detail, '막힌 조건', 'project detail shows blocking condition count');
  assertIncludes(detail, '종료 가능 여부', 'project detail shows readiness verdict');
  assertIncludes(detail, 'data-testid="pms-closeout-panel"', 'project detail exposes a stable closeout action panel');
  assertIncludes(detail, 'ProjectControlDashboardPanel', 'project detail renders the project control dashboard summary panel');
  assertIncludes(projectDashboardPanel, 'useProjectDashboardSummary', 'project control dashboard panel consumes the server dashboard summary endpoint');
  assertIncludes(projectDashboardPanel, '프로젝트 통제 요약', 'project control dashboard panel labels the launch-facing dashboard surface');
  assertIncludes(projectDashboardPanel, 'pms-project-control-dashboard', 'project control dashboard panel exposes a stable browser-QA target');
  assertIncludes(projectDashboardPanel, 'pms-project-dashboard-cost-snapshot', 'project dashboard shows CRM-owned contract snapshot totals without PMS ledger ownership');
  assertIncludes(projectDashboardPanel, 'pms-project-dashboard-schedule', 'project dashboard shows schedule status');
  assertIncludes(projectDashboardPanel, 'pms-project-dashboard-performance', 'project dashboard shows performance status');
  assertIncludes(projectDashboardPanel, 'pms-project-dashboard-controls', 'project dashboard shows control and launch feedback status');
  assertIncludes(projectDashboardPanel, 'summary.cost.boundaryNote', 'project dashboard surfaces the CRM/PMS contract boundary note');
  assertIncludes(projectDashboardPanel, 'pms-project-dashboard-action-review', 'project dashboard can jump to review feedback');
  assertIncludes(detail, '조치 바로가기', 'project detail closeout panel exposes direct action shortcuts');
  assertIncludes(detail, 'buildCloseoutQueue', 'project detail builds a launch closeout resolution queue from current execution data');
  assertIncludes(detail, 'useProjectDeliverables', 'project detail closeout queue reads current-status deliverables');
  assertIncludes(detail, 'useProjectCloseConditions', 'project detail closeout queue reads current-status close conditions');
  assertIncludes(detail, 'data-testid="pms-closeout-resolution-queue"', 'project detail exposes a stable closeout resolution queue');
  assertIncludes(detail, "testId: 'pms-closeout-queue-deliverable'", 'project closeout queue exposes pending deliverable action items');
  assertIncludes(detail, "testId: 'pms-closeout-queue-close-condition'", 'project closeout queue exposes unchecked close-condition action items');
  assertIncludes(detail, "testId: 'pms-closeout-queue-review'", 'project closeout queue exposes review feedback action when blockers are clear or need sharing');
  assertIncludes(detail, "testId: 'pms-closeout-deliverables-action'", 'project closeout panel can jump to deliverables');
  assertIncludes(detail, "testId: 'pms-closeout-close-conditions-action'", 'project closeout panel can jump to close conditions');
  assertIncludes(detail, "testId: 'pms-closeout-review-action'", 'project closeout panel can jump to review feedback');
  assertIncludes(detail, 'handleOpenManagementTab', 'project detail closeout shortcuts switch management tabs');
  assertIncludes(detail, 'scrollIntoView({ behavior: \'smooth\', block: \'start\' })', 'project detail closeout shortcuts bring the target tab surface into view');
  assertIncludes(detail, 'data-testid={`pms-status-tab-${st.key}`}', 'project detail status tabs expose stable browser-QA targets');
  assertIncludes(detail, 'data-testid={`pms-management-tab-${tab.key}`}', 'project detail management tabs expose stable browser-QA targets');
  assertIncludes(detail, 'flex overflow-x-auto border-b', 'project detail status tabs avoid small-screen horizontal overflow');
  assertIncludes(detail, 'flex gap-1 overflow-x-auto', 'project detail management tabs avoid small-screen horizontal overflow');
  assertIncludes(detail, 'flex shrink-0 items-center gap-1.5', 'project detail management tab buttons keep stable tap targets in horizontal scroll');
  assertIncludes(membersTab, "const PROJECT_MEMBER_ROLE_GROUP = 'PROJECT_MEMBER_ROLE';", 'member tab binds role selector to canonical project-member role code group');
  assertIncludes(membersTab, 'useCodesByGroup(PROJECT_MEMBER_ROLE_GROUP)', 'member tab loads role options through PMS code API');
  assertIncludes(membersTab, '.filter((code: CodeItem) => code.isActive)', 'member tab only offers active role codes');
  assertIncludes(membersTab, 'roleCodeStatusMessage', 'member tab exposes missing/unavailable role-code state');
  assertIncludes(membersTab, 'disabled={!canOpenAddDialog}', 'member tab blocks adding members until role codes are available');
  assertNotIncludes(membersTab, 'DEFAULT_ROLE_OPTIONS', 'member tab must not fall back to hard-coded project-member role options');
  assertNotIncludes(membersTab, 'DEFAULT_ROLE_CODE', 'member tab must not default to a hard-coded project-member role');
  assertIncludes(handoffsTab, 'useProjectHandoffs', 'handoff tab loads project handoffs');
  assertIncludes(handoffsTab, 'useCreateProjectHandoff', 'handoff tab can create a handoff');
  assertIncludes(handoffsTab, 'useUpdateProjectHandoff', 'handoff tab can respond to a handoff');
  assertIncludes(handoffsTab, 'useProjectContracts', 'handoff tab loads contract snapshot');
  assertIncludes(handoffsTab, '읽기 전용', 'handoff tab keeps contract snapshot read-only');
  assertIncludes(handoffsTab, "const PROJECT_MEMBER_ROLE_GROUP = 'PROJECT_MEMBER_ROLE';", 'handoff tab binds assigned roles to canonical project-member role code group');
  assertIncludes(handoffsTab, 'useCodesByGroup(PROJECT_MEMBER_ROLE_GROUP)', 'handoff tab loads assigned role options through PMS code API');
  assertIncludes(handoffsTab, '.filter((code: CodeItem) => code.isActive)', 'handoff tab only offers active role codes');
  assertIncludes(handoffsTab, 'roleCodeStatusMessage', 'handoff tab exposes missing/unavailable role-code state');
  assertIncludes(handoffsTab, 'formatKnownUserLabel', 'handoff tab resolves visible member names instead of defaulting to raw user IDs');
  assertNotIncludes(handoffsTab, 'placeholder="예: sm"', 'handoff tab must not ask users to type raw assigned role codes');
  assertNotIncludes(handoffsTab, 'assignedRoleCode.trim()', 'handoff tab must not normalize a free-text assigned role input');
  assertNotIncludes(handoffsTab, "from '@/components/ui/input'", 'handoff tab must not render assigned role as a raw text input');
  assertNotIncludes(handoffsTab, '사용자 ${', 'handoff tab must not show raw user id fallbacks in user-facing labels');
  assertIncludes(reviewSummaryTab, 'useProjectEvents', 'review tab loads project report/review events');
  assertIncludes(reviewSummaryTab, 'useProjectAccess', 'review tab gates feedback capture with project access snapshot');
  assertIncludes(reviewSummaryTab, 'useCreateProjectIssue', 'review tab can capture launch feedback as canonical project issues');
  assertIncludes(reviewSummaryTab, 'useUpdateProjectIssue', 'review tab can close captured launch feedback issues');
  assertIncludes(reviewSummaryTab, 'useCreateEvent', 'review tab can capture review/report sessions as project events');
  assertIncludes(reviewSummaryTab, 'useProjectDeliverables', 'review tab summarizes deliverable feedback');
  assertIncludes(reviewSummaryTab, 'useProjectCloseConditions', 'review tab summarizes close-condition feedback');
  assertIncludes(reviewSummaryTab, 'useProjectControlIssues', 'review tab summarizes canonical issues');
  assertIncludes(reviewSummaryTab, 'useProjectRisks', 'review tab summarizes active risks');
  assertIncludes(reviewSummaryTab, 'useProjectChangeRequests', 'review tab summarizes change requests');
  assertIncludes(reviewSummaryTab, 'useProjectHandoffs', 'review tab summarizes pending handoffs');
  assertIncludes(reviewSummaryTab, '피드백 큐', 'review tab exposes launch-facing feedback queue');
  assertIncludes(reviewSummaryTab, '피드백 이슈', 'review tab exposes direct feedback issue capture');
  assertIncludes(reviewSummaryTab, '리뷰 이벤트', 'review tab exposes direct review event capture');
  assertIncludes(reviewSummaryTab, 'review-feedback', 'review tab marks quick-captured feedback for traceability');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-summary-tab"', 'review tab exposes a stable browser-QA root');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-issue-action"', 'review tab exposes a stable browser-QA feedback issue action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-title-input"', 'review tab exposes a stable browser-QA feedback issue title input');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-description-input"', 'review tab exposes a stable browser-QA feedback issue description input');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-submit"', 'review tab exposes a stable browser-QA feedback issue submit action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-event-action"', 'review tab exposes a stable browser-QA review event action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-event-name-input"', 'review tab exposes a stable browser-QA review event name input');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-event-summary-input"', 'review tab exposes a stable browser-QA review event summary input');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-event-submit"', 'review tab exposes a stable browser-QA review event submit action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-event-list"', 'review tab exposes a stable browser-QA review event list');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-queue"', 'review tab exposes a stable browser-QA feedback queue');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-launch-feedback-list"', 'review tab exposes a stable browser-QA captured launch feedback list');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-feedback-resolve-action"', 'review tab exposes a stable browser-QA launch feedback resolve action');
  assertIncludes(reviewSummaryTab, 'buildLaunchReviewSnapshot', 'review tab can export a launch feedback review snapshot');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-snapshot-download-action"', 'review tab exposes a stable browser-QA review snapshot download action');
  assertIncludes(reviewSummaryTab, 'PMR/PRR 자동 보고서가 아닌 런칭 피드백 공유용 파일', 'review snapshot is explicitly scoped away from PMR/PRR automation');
  assertIncludes(reviewSummaryTab, 'buildPmrPrrDraftReport', 'review tab can export a PMR/PRR draft from PMS execution data');
  assertIncludes(reviewSummaryTab, 'buildPmrPrrReadinessChecks', 'review tab derives PMR/PRR readiness from PMS execution data');
  assertIncludes(reviewSummaryTab, 'PMR_PRR_LEDGER_MEMO', 'review tab marks PMR/PRR ledger events with a stable memo');
  assertIncludes(reviewSummaryTab, 'PMR_PRR_WORKFLOW_MEMO', 'review tab marks PMR/PRR scheduled workflow events with a stable memo');
  assertIncludes(reviewSummaryTab, 'isPmrPrrWorkflowEvent', 'review tab can filter PMR/PRR ledger and workflow events from project events');
  assertIncludes(reviewSummaryTab, 'buildPmrPrrWorkflowSummary', 'review tab creates a durable PMR/PRR scheduled publication summary from readiness data');
  assertIncludes(reviewSummaryTab, 'useProjectMembers', 'review tab can select a PMR/PRR approver from active project members');
  assertIncludes(reviewSummaryTab, 'PMR_PRR_REPEAT_COUNT_LABELS', 'review tab exposes PMR/PRR repeated publication reservation choices');
  assertIncludes(reviewSummaryTab, 'PMR_PRR_APPROVAL_POLICY_LABELS', 'review tab exposes PMR/PRR approval-line policy choices');
  assertIncludes(reviewSummaryTab, 'PMR_PRR_NOTIFICATION_AUDIENCE_LABELS', 'review tab exposes PMR/PRR notification recipient policy choices');
  assertIncludes(reviewSummaryTab, 'useAuthStore', 'review tab reads the current user for PMR/PRR approver-gated transitions');
  assertIncludes(reviewSummaryTab, 'isPmrPrrWorkflowApprover', 'review tab compares the current user with the selected PMR/PRR approver');
  assertIncludes(reviewSummaryTab, 'selectDefaultPmrPrrApproverId', 'review tab auto-suggests a PMR/PRR approver from project members');
  assertIncludes(reviewSummaryTab, 'currentUserMember', 'review tab prefers the logged-in project member as the PMR/PRR approver default');
  assertIncludes(reviewSummaryTab, 'buildPmrPrrNotificationTargetLabels', 'review tab previews PMR/PRR notification recipients from the selected policy');
  assertIncludes(reviewSummaryTab, 'addPublicationCycleDate', 'review tab can generate repeated weekly/monthly PMR/PRR reservations');
  assertIncludes(reviewSummaryTab, 'ownerUserId: pmrPrrPublicationForm.ownerUserId', 'review tab stores the PMR/PRR approver on the project event owner field');
  assertIncludes(reviewSummaryTab, 'handleCreatePmrPrrPublicationWorkflow', 'review tab can create a PMR/PRR scheduled publication workflow');
  assertIncludes(reviewSummaryTab, 'handleUpdatePmrPrrWorkflowStatus', 'review tab can transition PMR/PRR approval and publication status');
  assertIncludes(reviewSummaryTab, 'pmrPrrWorkflowEventOverrides', 'review tab immediately reflects successful PMR/PRR workflow transition responses on the active row');
  assertIncludes(reviewSummaryTab, 'setPmrPrrWorkflowEventOverrides', 'review tab stores successful PMR/PRR workflow transition responses for browser-visible row updates');
  assertIncludes(reviewSummaryTab, '만기 예약 자동 rollover', 'review tab states that overdue PMR/PRR reservations roll over automatically');
  assertIncludes(reviewSummaryTab, 'buildPmrPrrLedgerSummary', 'review tab creates a durable PMR/PRR ledger summary from readiness data');
  assertIncludes(reviewSummaryTab, 'handleCreatePmrPrrLedgerEntry', 'review tab can persist a PMR/PRR ledger entry');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-action"', 'review tab exposes a stable browser-QA PMR/PRR scheduled workflow action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-dialog"', 'review tab exposes a stable browser-QA PMR/PRR scheduled workflow dialog');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-repeat-count-select"', 'review tab exposes a stable browser-QA PMR/PRR repeated reservation selector');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-approver-select"', 'review tab exposes a stable browser-QA PMR/PRR approver selector');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-approval-policy-select"', 'review tab exposes a stable browser-QA PMR/PRR approval policy selector');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-notification-audience-select"', 'review tab exposes a stable browser-QA PMR/PRR notification audience selector');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-notification-preview"', 'review tab previews PMR/PRR approval notification target state');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-workflow-submit"', 'review tab exposes a stable browser-QA PMR/PRR scheduled workflow submit action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-approval-request-action"', 'review tab exposes a stable browser-QA PMR/PRR approval request action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-approve-action"', 'review tab exposes a stable browser-QA PMR/PRR approve action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-publish-action"', 'review tab exposes a stable browser-QA PMR/PRR publish action');
  assertIncludes(reviewSummaryTab, 'data-pmr-prr-event-id={String(event.eventId)}', 'review tab exposes stable PMR/PRR event row identifiers for transition QA');
  assertIncludes(reviewSummaryTab, 'data-pmr-prr-status-code={event.statusCode}', 'review tab exposes stable PMR/PRR workflow status codes for transition QA');
  assertIncludes(reviewSummaryTab, '승인·반려는 지정 승인자만 처리할 수 있습니다.', 'review tab tells users when PMR/PRR approval is limited to the selected approver');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-ledger-action"', 'review tab exposes a stable browser-QA PMR/PRR ledger action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-ledger"', 'review tab exposes a stable browser-QA PMR/PRR ledger panel');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-ledger-item"', 'review tab exposes stable PMR/PRR ledger entries');
  assertIncludes(reviewSummaryTab, 'REVIEW_VISIBLE_ITEM_LIMIT', 'review tab caps visible review/PMR rows for accumulated launch data');
  assertIncludes(reviewSummaryTab, 'visiblePmrPrrWorkflowEvents', 'review tab renders a capped PMR/PRR ledger while keeping total counts');
  assertIncludes(reviewSummaryTab, 'visibleLaunchFeedbackIssues', 'review tab renders a capped launch feedback list while keeping total counts');
  assertIncludes(reviewSummaryTab, 'visibleReviewEvents', 'review tab renders a capped review event list while keeping total counts');
  assertIncludes(reviewSummaryTab, '!isLaunchFeedbackIssue(item)', 'review PMR/PRR readiness keeps launch feedback separate from general control issues');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-draft-download-action"', 'review tab exposes a stable browser-QA PMR/PRR draft download action');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-readiness"', 'review tab exposes a stable browser-QA PMR/PRR readiness panel');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-check"', 'review tab exposes stable PMR/PRR readiness checks');
  assertIncludes(reviewSummaryTab, 'data-testid="pms-review-pmr-prr-decision"', 'review tab exposes stable PMR/PRR draft decision text');
  assertIncludes(reviewSummaryTab, 'PMR/PRR 초안은 현재 PMS 실행 데이터 기준', 'review PMR/PRR draft keeps the report scope explicit');
  assertIncludes(reviewSummaryTab, '프로젝트 이벤트 기반 발행 원장', 'review tab states the implemented PMR/PRR ledger scope');
  assertIncludes(reviewSummaryTab, '발행 원장, 반복 예약, 승인자 알림, 만기 예약 자동 rollover는 프로젝트 이벤트로 기록합니다.', 'review tab states the implemented PMR/PRR repeated publication, rollover, and approver notification scope');
  assertIncludes(reviewSummaryTab, 'PMR/PRR 준비도', 'review tab renders PMR/PRR readiness on screen');
  assertIncludes(reviewSummaryTab, 'PMR/PRR 발행·승인 원장', 'review tab renders PMR/PRR ledger and approval workflow on screen');
  assertIncludes(reviewSummaryTab, '확인 필요 항목 존재', 'review tab renders an explicit PMR/PRR draft decision state');
  assertIncludes(reviewSummaryTab, 'handleUpdateLaunchFeedbackStatus', 'review tab updates captured launch feedback status');
  assertIncludes(reviewSummaryTab, 'resolvedAt: isTerminal', 'review tab stores resolvedAt when launch feedback is closed');
  assertIncludes(reviewSummaryTab, '보고/리뷰 이벤트', 'review tab exposes report/review event summary');
  assertIncludes(reviewSummaryTab, 'ReviewEventCard', 'review tab renders compact report/review cards for mobile feedback review');
  assertIncludes(reviewSummaryTab, 'FeedbackSignalCard', 'review tab renders compact feedback queue cards for mobile feedback review');
  assertIncludes(reviewSummaryTab, 'md:hidden', 'review tab has mobile-specific review/feedback card surfaces');
  assertIncludes(reviewSummaryTab, 'hidden overflow-hidden md:block', 'review tab keeps dense tables on desktop only');
  assertIncludes(reviewSummaryTab, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'review feedback dialogs fit small mobile viewports');
  assertIncludes(reviewSummaryTab, 'className="w-full sm:w-auto"', 'review feedback actions and dialog buttons are full-width on mobile');
  assertIncludes(reviewSummaryTab, 'PMR/PRR은 현재 데이터 기반 준비도 화면, 초안 다운로드, 프로젝트 이벤트 기반 발행 원장, 반복 예약 생성, 만기 예약 자동 rollover, 승인자 지정과 알림까지 제공합니다.', 'review tab states PMR/PRR readiness, draft export, ledger, repeated reservation, rollover, approver, and notification scope');
  assertIncludes(controlModule, 'CommonNotificationModule', 'PMS control module imports common notifications for PMR/PRR approval notifications');
  assertIncludes(controlModule, 'PmrPrrWorkflowRolloverSchedulerService', 'PMS control module registers the PMR/PRR workflow rollover scheduler');
  assertIncludes(controlTypes, "'approval_requested'", 'shared PMS event status contract includes PMR/PRR approval-requested events');
  assertIncludes(controlTypes, "'rejected'", 'shared PMS event status contract includes PMR/PRR rejected events');
  assertIncludes(controlController, '@CurrentUser() currentUser: TokenPayload', 'PMS event update endpoint passes the actor to the service');
  assertIncludes(controlController, "events/pmr-prr-rollover", 'PMS control API can trigger PMR/PRR rollover for operational verification');
  assertIncludes(controlService, 'PMR_PRR_WORKFLOW_MEMO', 'PMS control service recognizes PMR/PRR workflow events for notifications');
  assertIncludes(controlService, 'PMR_PRR_WORKFLOW_ALLOWED_TRANSITIONS', 'PMS control service defines valid PMR/PRR workflow status transitions');
  assertIncludes(controlService, 'assertPmrPrrWorkflowUpdateAllowed', 'PMS control service enforces PMR/PRR workflow transition policy');
  assertIncludes(controlService, 'runDuePmrPrrWorkflowRollover', 'PMS control service can roll over overdue PMR/PRR workflow reservations');
  assertIncludes(controlService, "statusCode: 'approval_requested'", 'PMS rollover stores overdue PMR/PRR reservations as approval requested');
  assertIncludes(controlService, '자동 승인 요청', 'PMS rollover leaves an automatic approval request marker in the event summary');
  assertIncludes(controlService, 'ForbiddenException', 'PMS control service rejects PMR/PRR approval decisions by non-approvers');
  assertIncludes(controlService, 'PMR/PRR 승인·반려는 지정 승인자만 처리할 수 있습니다.', 'PMS control service keeps PMR/PRR approval decisions approver-gated');
  assertIncludes(controlService, 'notifyPmrPrrWorkflowOwner', 'PMS control service creates PMR/PRR workflow notifications for event owners');
  assertIncludes(controlService, 'resolvePmrPrrWorkflowRecipientUserIds', 'PMS control service expands PMR/PRR workflow recipients from the selected notification policy');
  assertIncludes(controlService, 'PMR_PRR_NOTIFY_ACTIVE_MEMBERS_LABEL', 'PMS control service recognizes the active-member PMR/PRR notification policy');
  assertIncludes(controlService, 'notifyMany', 'PMS control service can notify multiple PMR/PRR workflow recipients');
  assertIncludes(controlService, "notificationType: 'pms.pmr-prr.workflow'", 'PMS control service uses a stable PMR/PRR notification type');
  assertIncludes(controlService, "type: 'open-pms-reference'", 'PMS control service creates actionable PMS notification references');
  assertIncludes(controlRolloverScheduler, 'setInterval', 'PMS PMR/PRR rollover scheduler binds the worker to an interval trigger');
  assertIncludes(controlRolloverScheduler, "this.runOnce('startup')", 'PMS PMR/PRR rollover scheduler can run on server startup');
  assertIncludes(controlRolloverScheduler, 'PMS_PMR_PRR_ROLLOVER_WORKER_ENABLED', 'PMS PMR/PRR rollover scheduler is environment configurable');
  assertIncludes(controlRolloverScheduler, 'runDuePmrPrrWorkflowRollover', 'PMS PMR/PRR rollover scheduler delegates to the service rollover path');
  assertIncludes(launchVisualQa, 'home-risk-report-summary', 'launch browser QA checks the home risk/report aggregate widget');
  assertIncludes(launchVisualQa, 'verifyReviewFeedbackWriteSmoke', 'launch browser QA performs a review feedback write smoke');
  assertIncludes(launchVisualQa, 'resolveReviewFeedbackIssue', 'launch browser QA resolves a captured review feedback issue');
  assertIncludes(launchVisualQa, 'createPmrPrrLedgerEntry', 'launch browser QA creates a PMR/PRR ledger entry');
  assertIncludes(launchVisualQa, 'createPmrPrrPublicationWorkflow', 'launch browser QA creates and transitions a PMR/PRR scheduled publication workflow');
  assertIncludes(launchVisualQa, 'ensureCurrentUserPmrPrrApproverMember', 'launch browser QA ensures the current user can be selected as the PMR/PRR approver');
  assertIncludes(launchVisualQa, 'selectCurrentUserPmrPrrApprover', 'launch browser QA explicitly selects the current user as PMR/PRR approver');
  assertIncludes(launchVisualQa, 'waitForPmrPrrLedgerRefresh', 'launch browser QA supports capped PMR/PRR ledger rendering');
  assertIncludes(launchVisualQa, 'readBodyText', 'launch browser QA retries body text reads around tab navigation and Docker render latency');
  assertIncludes(launchVisualQa, 'BODY_TEXT_TIMEOUT_MS', 'launch browser QA has an explicit body text read timeout');
  assertIncludes(projectQueries, 'upsertProjectEventCache', 'PMS event mutations update the active event list cache for browser-visible workflow transitions');
  assertIncludes(projectQueries, 'queryClient.setQueryData<ApiResponse<ProjectEventItem[]>>', 'PMS event cache upsert is typed to the event list response');
  assertIncludes(launchVisualQa, 'data-pmr-prr-event-id', 'launch browser QA tracks the same PMR/PRR workflow row across status transitions');
  assertIncludes(launchVisualQa, 'waitForPmrPrrWorkflowStatus', 'launch browser QA waits for PMR/PRR status-code transitions instead of ambiguous button text');
  assertIncludes(launchVisualQa, 'Date.now() + 45000', 'launch browser QA gives Docker refetch enough time for PMR/PRR workflow row transitions');
  assertIncludes(launchVisualQa, "animations: 'disabled'", 'launch browser QA disables animations during screenshots');
  assertIncludes(launchVisualQa, 'api-current-user', 'launch browser QA resolves the logged-in user for PMR/PRR approver-gated approval');
  assertIncludes(launchVisualQa, 'PMR\\/PRR 준비도', 'launch browser QA checks the PMR/PRR readiness panel on the review tab');
  assertIncludes(launchVisualQa, 'PMR\\/PRR 발행·승인 원장', 'launch browser QA checks the PMR/PRR ledger and approval workflow panel on the review tab');
  assertIncludes(launchVisualQa, 'verifyCloseoutActionRail', 'launch browser QA verifies closeout action shortcuts');
  assertIncludes(launchVisualQa, 'pms-closeout-resolution-queue', 'launch browser QA checks the closeout resolution queue');
  assertIncludes(launchVisualQa, 'pms-closeout-queue-deliverable', 'launch browser QA can click a deliverable queue item');
  assertIncludes(launchVisualQa, 'pms-closeout-queue-close-condition', 'launch browser QA can click a close-condition queue item');
  assertIncludes(launchVisualQa, 'pms-closeout-queue-review', 'launch browser QA can click a review queue item');
  assertIncludes(launchVisualQa, 'createReviewFeedbackIssue', 'launch browser QA creates a real feedback issue');
  assertIncludes(launchVisualQa, 'createReviewEvent', 'launch browser QA creates a real review event');
  assertIncludes(launchVisualQa, 'verifyLegacyIssueRetiredSurface', 'launch browser QA checks that legacy issue creation is retired');
  assertIncludes(launchVisualQa, 'PMS_LEGACY_ISSUE_WRITE_DISABLED', 'launch browser QA expects the legacy issue write-disabled error code');
  assertIncludes(launchVisualQa, 'project-detail-controls-legacy-retired', 'launch browser QA captures the retired legacy issue cleanup surface');
  assertNotIncludes(launchVisualQa, 'createLegacyIssueForCanonicalization', 'launch browser QA must not create new legacy issue fixtures');
  assertNotIncludes(launchVisualQa, 'waitForLegacyIssueConversionApi', 'launch browser QA must not rely on legacy issue creation for cleanup QA');
  assertIncludes(launchVisualQa, 'pms-closeout-deliverables-action', 'launch browser QA checks the closeout deliverables shortcut');
  assertIncludes(launchVisualQa, 'pms-closeout-close-conditions-action', 'launch browser QA checks the closeout close-condition shortcut');
  assertIncludes(launchVisualQa, 'pms-closeout-review-action', 'launch browser QA checks the closeout review shortcut');
  assertIncludes(launchVisualQa, 'pms-review-feedback-issue-action', 'launch browser QA uses the stable feedback issue action');
  assertIncludes(launchVisualQa, 'pms-review-feedback-resolve-action', 'launch browser QA uses the stable feedback resolve action');
  assertIncludes(launchVisualQa, 'pms-review-event-action', 'launch browser QA uses the stable review event action');
  assertIncludes(launchVisualQa, 'project-detail-review-write-smoke', 'launch browser QA captures the review write smoke result');
  assertIncludes(controlDomainPanels, 'ControlMobileCard', 'control tab renders compact mobile cards for formal control objects');
  assertIncludes(controlDomainPanels, 'ControlMetaField', 'control tab renders mobile control metadata fields');
  assertIncludes(controlDomainPanels, 'space-y-3 md:hidden', 'control tab has mobile-specific card lists');
  assertIncludes(controlDomainPanels, 'hidden overflow-hidden rounded-md border md:block', 'control tab keeps dense tables on desktop only');
  assertIncludes(controlDomainPanels, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'control object dialogs fit small mobile viewports');
  assertIncludes(controlDomainPanels, 'className="w-full sm:w-auto"', 'control tab create and dialog actions are full-width on mobile');
  assertIncludes(controlsTab, 'LegacyIssueMobileCard', 'control tab renders compact mobile cards for legacy issue compatibility rows');
  assertIncludes(controlsTab, 'LegacyIssueMetaField', 'control tab renders legacy issue mobile metadata fields');
  assertIncludes(controlsTab, 'space-y-3 md:hidden', 'legacy issue compatibility inbox has a mobile-specific card list');
  assertIncludes(controlsTab, 'hidden overflow-hidden rounded-lg border md:block', 'legacy issue compatibility inbox keeps dense tables on desktop only');
  assertIncludes(controlsTab, '기존 Issue cleanup 인박스', 'control tab labels legacy issue rows as a cleanup inbox');
  assertIncludes(controlsTab, 'TERMINAL_LEGACY_ISSUE_STATUS_CODES', 'legacy issue inbox identifies terminal rows for default hiding');
  assertIncludes(controlsTab, 'pendingLegacyIssues', 'legacy issue inbox defaults to pending cleanup rows');
  assertIncludes(controlsTab, 'completedLegacyIssues', 'legacy issue inbox keeps completed rows as optional history');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-archive-toggle"', 'legacy issue inbox exposes a stable completed-row toggle');
  assertIncludes(controlsTab, 'useProjectLegacyIssueCleanupSummary', 'legacy issue inbox reads server cleanup summary counts');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-cleanup-summary"', 'legacy issue inbox exposes stable cleanup summary selectors');
  assertIncludes(controlsTab, 'readyForPhysicalRemoval', 'legacy issue inbox shows the active-zero physical removal gate');
  assertIncludes(controlsTab, 'useArchiveTerminalLegacyIssues', 'legacy issue inbox exposes completed-row batch archive mutation');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-archive-completed-action"', 'legacy issue inbox exposes a stable completed-row batch archive action');
  assertIncludes(controlsTab, 'useCanonicalizePendingLegacyIssues', 'legacy issue inbox exposes pending-row batch canonicalization mutation');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-canonicalize-pending-action"', 'legacy issue inbox exposes a stable pending-row batch canonicalization action');
  assertIncludes(controlsTab, '완료/전환된 기존 Issue는 기본 보기에서 숨깁니다.', 'legacy issue inbox states completed rows are hidden by default');
  assertIncludes(controlsTab, '정식 컨트롤 패널', 'control tab keeps new authoring directed to canonical control panels');
  assertIncludes(controlsTab, 'CANONICAL_TARGET_BY_ISSUE_TYPE', 'legacy issue inbox maps old issue types to canonical control targets');
  assertIncludes(controlsTab, 'useCreateProjectIssue', 'legacy issue inbox can convert old issue rows to canonical project issues');
  assertIncludes(controlsTab, 'useCreateRisk', 'legacy issue inbox can convert old issue rows to canonical risks');
  assertIncludes(controlsTab, 'useCreateChangeRequest', 'legacy issue inbox can convert old issue rows to canonical change requests');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-card"', 'legacy issue inbox exposes stable mobile card selectors for browser QA');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-row"', 'legacy issue inbox exposes stable desktop row selectors for browser QA');
  assertIncludes(controlsTab, 'data-testid="pms-legacy-issue-canonicalize-action"', 'legacy issue inbox exposes a stable canonical conversion action');
  assertIncludes(controlsTab, 'statusCode: \'closed\'', 'legacy issue conversion closes the old compatibility row after canonical creation');
  assertIncludes(issueController, 'PMS_LEGACY_ISSUE_WRITE_DISABLED', 'legacy issue POST returns a stable retired-write error code');
  assertIncludes(issueController, "@Get('cleanup-summary')", 'legacy issue controller exposes cleanup summary endpoint before detail routes');
  assertIncludes(issueController, "@Post('cleanup-terminal/archive')", 'legacy issue controller exposes completed-row batch archive endpoint');
  assertIncludes(issueController, "@Post('cleanup-pending/canonicalize')", 'legacy issue controller exposes pending-row batch canonicalization endpoint');
  assertIncludes(issueController, 'GoneException', 'legacy issue POST returns HTTP 410 Gone');
  assertIncludes(issueController, '정식 통제 이슈/리스크/변경요청 API를 사용하세요.', 'legacy issue POST directs clients to canonical control APIs');
  assertNotIncludes(issueController, '@CurrentUser() currentUser', 'legacy issue controller must not retain legacy create actor wiring');
  assertNotIncludes(issueController, 'CreateIssueDto', 'legacy issue controller must not import a create DTO');
  assertNotIncludes(issueService, 'async create(', 'legacy issue service must not retain legacy create writes');
  assertIncludes(issueService, 'async getCleanupSummary', 'legacy issue service calculates cleanup summary counts');
  assertIncludes(issueService, 'async archiveTerminalCleanupRows', 'legacy issue service archives completed cleanup rows in batches');
  assertIncludes(issueService, 'async canonicalizePendingCleanupRows', 'legacy issue service canonicalizes pending cleanup rows in batches');
  assertIncludes(issueService, 'statusCode: { in: this.terminalLegacyIssueStatusCodes }', 'legacy issue batch archive only targets terminal rows');
  assertIncludes(issueService, 'statusCode: { notIn: this.terminalLegacyIssueStatusCodes }', 'legacy issue batch canonicalization only targets pending rows');
  assertIncludes(issueService, 'manual_cleanup', 'legacy issue batch archive stores a stable manual cleanup reason');
  assertIncludes(issueService, 'canonicalized_cleanup', 'legacy issue batch canonicalization stores a stable archive reason');
  assertIncludes(issueService, 'projectIssue.create', 'legacy issue batch canonicalization can create canonical project issues');
  assertIncludes(issueService, 'projectRisk.create', 'legacy issue batch canonicalization can create canonical risks');
  assertIncludes(issueService, 'projectChangeRequest.create', 'legacy issue batch canonicalization can create canonical change requests');
  assertIncludes(issueService, 'readyForPhysicalRemoval: activeCleanupCount === 0', 'legacy issue cleanup summary gates physical removal on zero active rows');
  assertNotIncludes(issueTypes, 'CreateIssueDto', 'PMS shared types must not export legacy issue create DTOs');
  assertIncludes(issueTypes, 'LegacyIssueCleanupSummary', 'PMS shared types expose legacy issue cleanup summary contract');
  assertIncludes(issueTypes, 'LegacyIssueCleanupArchiveResult', 'PMS shared types expose legacy issue batch archive contract');
  assertIncludes(issueTypes, 'LegacyIssueCleanupCanonicalizeResult', 'PMS shared types expose legacy issue batch canonicalization contract');
  assertIncludes(pmsTypeIndex, 'LegacyIssueCleanupSummary', 'PMS type index exports legacy issue cleanup summary contract');
  assertIncludes(pmsTypeIndex, 'LegacyIssueCleanupArchiveResult', 'PMS type index exports legacy issue batch archive contract');
  assertIncludes(pmsTypeIndex, 'LegacyIssueCleanupCanonicalizeResult', 'PMS type index exports legacy issue batch canonicalization contract');
  assertIncludes(rootTypesIndex, 'LegacyIssueCleanupSummary', 'root type index exports legacy issue cleanup summary contract');
  assertIncludes(rootTypesIndex, 'LegacyIssueCleanupArchiveResult', 'root type index exports legacy issue batch archive contract');
  assertIncludes(rootTypesIndex, 'LegacyIssueCleanupCanonicalizeResult', 'root type index exports legacy issue batch canonicalization contract');
  assertNotIncludes(projectApi, 'createIssue:', 'PMS web project API must not expose legacy issue create calls');
  assertIncludes(projectApi, 'getIssueCleanupSummary', 'PMS web project API reads legacy issue cleanup summary');
  assertIncludes(projectApi, 'archiveTerminalIssues', 'PMS web project API archives terminal legacy issue cleanup rows');
  assertIncludes(projectApi, 'canonicalizePendingIssues', 'PMS web project API canonicalizes pending legacy issue cleanup rows');
  assertNotIncludes(projectApi, 'CreateIssueRequest', 'PMS web project API must not export legacy issue create payloads');
  assertNotIncludes(projectQueries, 'useCreateIssue', 'PMS query layer must not expose a legacy issue create mutation');
  assertIncludes(projectQueries, 'useProjectLegacyIssueCleanupSummary', 'PMS query layer exposes legacy issue cleanup summary hook');
  assertIncludes(projectQueries, 'useArchiveTerminalLegacyIssues', 'PMS query layer exposes legacy issue completed-row batch archive hook');
  assertIncludes(projectQueries, 'useCanonicalizePendingLegacyIssues', 'PMS query layer exposes legacy issue pending-row batch canonicalization hook');
  assertIncludes(projectQueries, 'issueKeys.cleanupSummary', 'PMS query layer invalidates legacy issue cleanup summary after cleanup changes');
  assertNotIncludes(queryIndex, 'useCreateIssue', 'query hook barrel must not export legacy issue create mutation');
  assertNotIncludes(pmsTypeIndex, 'CreateIssueDto', 'PMS type index must not export legacy issue create DTOs');
  assertNotIncludes(rootTypesIndex, 'CreateIssueDto', 'root type index must not export legacy issue create DTOs');
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/functions/hooks_queries_useProjects.useCreateIssue.html',
    'PMS web TypeDoc must not publish removed legacy issue create mutation hook',
  );
  await assertMissingPath(
    'docs/pms/reference/typedoc/web/interfaces/lib_api_endpoints_projects.CreateIssueRequest.html',
    'PMS web TypeDoc must not publish removed legacy issue create request type',
  );
  assertIncludes(issueService, 'isActive: false', 'legacy issue delete endpoint soft-hides compatibility rows instead of physically deleting them');
  assertIncludes(issueService, '호환성 인박스에서 숨김 처리됨', 'legacy issue soft-hide stores an explicit cleanup resolution');
  assertIncludes(issueService, 'legacyIssueArchive.upsert', 'legacy issue hide archives a source snapshot before hiding the compatibility row');
  assertIncludes(issueService, 'hidden_cleanup', 'legacy issue archive stores a stable cleanup reason code');
  assertIncludes(prismaSchema, 'model LegacyIssueArchive', 'PMS schema stores legacy Issue archive snapshots');
  assertIncludes(prismaSchema, '@@map("pr_legacy_issue_archive_m")', 'PMS schema maps legacy Issue archive snapshots to a protected PMS table');
  assertIncludes(prismaSchema, 'model LegacyIssueArchiveHistory', 'PMS schema stores legacy Issue archive history');
  assertIncludes(prismaSchema, '@@map("pr_legacy_issue_archive_h")', 'PMS schema maps legacy Issue archive history');
  assertIncludes(legacyIssueArchiveMigration, 'PMS legacy Issue archive protected baseline', 'PMS protected migration documents the legacy Issue archive baseline');
  assertIncludes(legacyIssueArchiveMigration, '"pms"."pr_legacy_issue_archive_m"', 'PMS protected migration creates legacy Issue archive table');
  assertIncludes(legacyIssueArchiveMigration, '"pms"."pr_legacy_issue_archive_h"', 'PMS protected migration creates legacy Issue archive history table');
  assertIncludes(legacyIssueArchiveMigration, 'uq_pr_legacy_issue_archive_m_source_issue', 'PMS protected migration prevents duplicate archive snapshots per legacy issue');
  assertIncludes(legacyIssueArchiveMigration, "archived_reason_code\" IN ('hidden_cleanup', 'canonicalized_cleanup', 'manual_cleanup')", 'PMS protected migration constrains legacy Issue archive reason codes');
  assertIncludes(dbInitEntrypoint, '20260710130000_add_pms_legacy_issue_archive', 'db-init protected baseline applies legacy Issue archive migration');
  assertIncludes(triggerInstaller, '77_pr_legacy_issue_archive_h_trigger.sql', 'PMS trigger installer applies legacy Issue archive history trigger');
  assertIncludes(triggerScript, '77_pr_legacy_issue_archive_h_trigger.sql', 'database trigger script applies legacy Issue archive history trigger');
  assertIncludes(legacyIssueArchiveTrigger, 'fn_pr_legacy_issue_archive_h_trigger', 'legacy Issue archive trigger records archive history rows');
  assertIncludes(demoIssuesSeed, 'Retired legacy Issue demo baseline', 'PMS demo issue seed declares the retired legacy baseline');
  assertNotIncludes(demoIssuesSeed, 'insert into pms.pr_issue_m', 'PMS demo issue seed must not create active legacy Issue rows');
  assertIncludes(demoIssuesSeed, 'insert into pms.pr_project_issue_m', 'PMS demo issue seed moves active issue work to canonical ProjectIssue rows');
  assertIncludes(demoIssuesSeed, 'insert into pms.pr_risk_m', 'PMS demo issue seed moves active risk work to canonical ProjectRisk rows');
  assertIncludes(demoIssuesSeed, 'insert into pms.pr_change_request_m', 'PMS demo issue seed moves active change work to canonical ProjectChangeRequest rows');
  assertIncludes(demoIssuesSeed, 'insert into pms.pr_legacy_issue_archive_m', 'PMS demo issue seed keeps legacy Issue snapshots in the archive table');
  assertIncludes(demoIssuesSeed, "and status_code not in ('resolved', 'closed')", 'PMS demo issue seed only canonicalizes non-terminal legacy rows');
  assertIncludes(demoIssuesSeed, "then 'hidden_cleanup' else 'canonicalized_cleanup'", 'PMS demo issue seed records terminal vs canonicalized archive reasons');
  assertIncludes(demoIssuesSeed, 'update pms.pr_issue_m', 'PMS demo issue seed retires old seed-created compatibility rows on existing databases');
  assertIncludes(demoIssuesSeed, 'is_active = false', 'PMS demo issue seed prevents seed-created legacy rows from staying active');
  assertIncludes(seedInstaller, '15_demo_issues.sql', 'PMS seed installer applies the retired legacy issue demo baseline');
  assertIncludes(launchVisualQa, 'legacy issue POST was not rejected as retired', 'browser QA fails if legacy issue creation becomes writable again');
  assertIncludes(deliverableController, "@Post('template')", 'deliverable controller exposes template application endpoint');
  assertIncludes(deliverableController, "@Get('templates')", 'deliverable controller exposes template group lookup endpoint');
  assertIncludes(deliverableController, "@Post('templates')", 'deliverable controller exposes template group save endpoint');
  assertIncludes(deliverableController, 'ApplyDeliverableTemplateDto', 'deliverable controller accepts a typed template application payload');
  assertIncludes(deliverableController, 'UpsertDeliverableTemplateGroupDto', 'deliverable controller accepts a typed template group save payload');
  assertIncludes(deliverableService, 'DEFAULT_DELIVERABLE_TEMPLATES', 'deliverable service provides launch default templates when no group master exists');
  assertIncludes(deliverableService, 'deliverableGroupItem.findMany', 'deliverable service can apply configured deliverable group masters');
  assertIncludes(deliverableService, 'findTemplateGroups', 'deliverable service can list configured deliverable template groups');
  assertIncludes(deliverableService, 'upsertTemplateGroup', 'deliverable service can save deliverable template groups');
  assertIncludes(deliverableService, 'updateTemplateGroupApproval', 'deliverable service can approve or draft template groups');
  assertIncludes(deliverableService, 'findTemplateGroupHistory', 'deliverable service can read template group history');
  assertIncludes(deliverableService, 'restoreTemplateGroup', 'deliverable service can restore a template group from history');
  assertIncludes(deliverableService, 'deactivateTemplateGroup', 'deliverable service can archive inactive template groups');
  assertIncludes(deliverableService, 'versionNo: { increment: 1 }', 'deliverable template workflow increments group versions on lifecycle changes');
  assertIncludes(deliverableService, 'approvalStatusCode: \'draft\'', 'deliverable template save and restore return edited groups to draft');
  assertIncludes(deliverableService, 'deliverableGroupItem.updateMany', 'deliverable template group save deactivates omitted old items');
  assertIncludes(deliverableService, "submissionStatusCode: 'not_submitted'", 'deliverable template application uses the current runtime pending status vocabulary');
  assertIncludes(deliverableDto, 'TEMPLATE_APPLY_MODE_CODES', 'deliverable template DTO exposes append/replace apply modes');
  assertIncludes(deliverableDto, 'deactivatedCount', 'deliverable template apply responses expose replace deactivation counts');
  assertIncludes(deliverableService, "const applyMode = dto.applyMode ?? 'append'", 'deliverable template application defaults to append mode');
  assertIncludes(deliverableService, "applyMode === 'replace'", 'deliverable template application supports replace mode');
  assertIncludes(deliverableService, 'deliverableCode: { notIn: deliverableCodes }', 'deliverable replace mode deactivates rows outside selected template');
  assertIncludes(deliverableConstants, 'DELIVERABLE_SUBMISSION_STATUS_CODES', 'deliverable status vocabulary is centralized');
  assertIncludes(deliverableConstants, "'confirmed'", 'deliverable completion vocabulary includes design confirmed status');
  assertIncludes(deliverableConstants, "'approved'", 'deliverable completion vocabulary keeps existing approved status');
  assertIncludes(deliverableConstants, "'not_required'", 'deliverable completion vocabulary keeps not-required exemption status');
  assertIncludes(deliverableConstants, 'LEGACY_DELIVERABLE_SUBMISSION_STATUS_ALIASES', 'deliverable status vocabulary maps legacy design aliases');
  assertIncludes(deliverableService, 'normalizeDeliverableSubmissionStatusCode', 'deliverable service normalizes submission status writes');
  assertIncludes(projectService, 'completed: completedDeliverables', 'transition readiness exposes completed deliverable count');
  assertIncludes(projectService, 'approved: completedDeliverables', 'transition readiness keeps approved count backward compatible');
  assertIncludes(projectService, '확정/승인 또는 면제 처리', 'stage completion error message matches deliverable completion vocabulary');
  assertIncludes(closeConditionService, '확정/승인 또는 면제 처리', 'close-condition guard error message matches deliverable completion vocabulary');
  assertIncludes(closeConditionController, "@Post('template')", 'close-condition controller exposes template application endpoint');
  assertIncludes(closeConditionController, "@Get('templates')", 'close-condition controller exposes template group lookup endpoint');
  assertIncludes(closeConditionController, "@Post('templates')", 'close-condition controller exposes template group save endpoint');
  assertIncludes(closeConditionController, 'ApplyCloseConditionTemplateDto', 'close-condition controller accepts a typed template application payload');
  assertIncludes(closeConditionController, 'UpsertCloseConditionTemplateGroupDto', 'close-condition controller accepts a typed template group save payload');
  assertIncludes(closeConditionService, 'DEFAULT_CLOSE_CONDITION_TEMPLATES', 'close-condition service provides launch default templates when no group master exists');
  assertIncludes(closeConditionService, 'closeConditionGroupItem.findMany', 'close-condition service can apply configured close-condition group masters');
  assertIncludes(closeConditionService, 'findTemplateGroups', 'close-condition service can list configured close-condition template groups');
  assertIncludes(closeConditionService, 'upsertTemplateGroup', 'close-condition service can save close-condition template groups');
  assertIncludes(closeConditionService, 'updateTemplateGroupApproval', 'close-condition service can approve or draft template groups');
  assertIncludes(closeConditionService, 'findTemplateGroupHistory', 'close-condition service can read template group history');
  assertIncludes(closeConditionService, 'restoreTemplateGroup', 'close-condition service can restore a template group from history');
  assertIncludes(closeConditionService, 'deactivateTemplateGroup', 'close-condition service can archive inactive template groups');
  assertIncludes(closeConditionService, 'versionNo: { increment: 1 }', 'close-condition template workflow increments group versions on lifecycle changes');
  assertIncludes(closeConditionService, 'approvalStatusCode: \'draft\'', 'close-condition template save and restore return edited groups to draft');
  assertIncludes(closeConditionService, 'requiresDeliverable: item.requiresDeliverable', 'close-condition template save preserves deliverable-required policy');
  assertIncludes(closeConditionService, 'item.requiresDeliverable || this.isDeliverableRequiredCondition', 'close-condition template application reads deliverable-required policy from group items');
  assertIncludes(closeConditionService, "const applyMode = dto.applyMode ?? 'append'", 'close-condition template application defaults to append mode');
  assertIncludes(closeConditionService, "applyMode === 'replace'", 'close-condition template application supports replace mode');
  assertIncludes(closeConditionService, 'conditionCode: { notIn: conditionCodes }', 'close-condition replace mode deactivates rows outside selected template');
  assertIncludes(deliverableController, "@Put(':statusCode/:deliverableCode/approval-steps')", 'deliverable controller exposes closeout approval route replacement');
  assertIncludes(deliverableController, "@Patch(':statusCode/:deliverableCode/approval-steps/:approvalStepId/decision')", 'deliverable controller exposes closeout approval decisions');
  assertIncludes(closeConditionController, "@Put(':statusCode/:conditionCode/approval-steps')", 'close-condition controller exposes closeout approval route replacement');
  assertIncludes(closeConditionController, "@Patch(':statusCode/:conditionCode/approval-steps/:approvalStepId/decision')", 'close-condition controller exposes closeout approval decisions');
  assertIncludes(deliverableDto, 'ProjectCloseoutApprovalStepDto', 'deliverable DTO exposes closeout approval step response contract');
  assertIncludes(deliverableDto, 'UpsertCloseoutApprovalRouteDto', 'deliverable DTO exposes closeout approval route request contract');
  assertIncludes(deliverableDto, 'DecideCloseoutApprovalStepDto', 'deliverable DTO exposes closeout approval decision request contract');
  assertIncludes(deliverableService, 'findStepsByTargets', 'deliverable service joins active approval steps into deliverable rows');
  assertIncludes(closeConditionService, 'findStepsByTargets', 'close-condition service joins active approval steps into close-condition rows');
  assertIncludes(closeoutApprovalService, 'assertApproversAreActiveProjectMembers', 'closeout approval service limits approvers to active project members');
  assertIncludes(closeoutApprovalService, '지정 승인자만 이 승인 단계를 처리할 수 있습니다.', 'closeout approval service limits decisions to assigned approvers');
  assertIncludes(closeoutApprovalService, "submissionStatusCode: 'approved'", 'closeout approval service marks deliverables approved after all steps pass');
  assertIncludes(closeoutApprovalService, 'isChecked: true', 'closeout approval service marks close conditions checked after all steps pass');
  assertIncludes(closeoutApprovalService, "targetTypeCode === 'deliverable'", 'closeout approval service separates deliverable and close-condition target behavior');
  assertIncludes(projectApi, 'ProjectCloseoutApprovalStep', 'PMS web project API exposes closeout approval step type');
  assertIncludes(projectApi, 'replaceDeliverableApprovalRoute', 'PMS web project API can replace deliverable approval routes');
  assertIncludes(projectApi, 'decideDeliverableApprovalStep', 'PMS web project API can decide deliverable approval steps');
  assertIncludes(projectApi, 'replaceCloseConditionApprovalRoute', 'PMS web project API can replace close-condition approval routes');
  assertIncludes(projectApi, 'decideCloseConditionApprovalStep', 'PMS web project API can decide close-condition approval steps');
  assertIncludes(projectQueries, 'useReplaceDeliverableApprovalRoute', 'PMS query layer exposes deliverable approval route replacement');
  assertIncludes(projectQueries, 'useDecideDeliverableApprovalStep', 'PMS query layer exposes deliverable approval decisions');
  assertIncludes(projectQueries, 'useReplaceCloseConditionApprovalRoute', 'PMS query layer exposes close-condition approval route replacement');
  assertIncludes(projectQueries, 'useDecideCloseConditionApprovalStep', 'PMS query layer exposes close-condition approval decisions');
  assertIncludes(queryIndex, 'useReplaceDeliverableApprovalRoute', 'query hook barrel exports deliverable approval route hook');
  assertIncludes(queryIndex, 'useDecideCloseConditionApprovalStep', 'query hook barrel exports close-condition approval decision hook');
  assertIncludes(deliverablesTab, 'CloseoutApprovalRoutePanel', 'deliverables tab renders the closeout approval route panel');
  assertIncludes(deliverablesTab, '산출물 승인선', 'deliverables tab labels deliverable approval routes');
  assertIncludes(deliverablesTab, 'handleSaveApprovalRoute', 'deliverables tab can save approval routes');
  assertIncludes(deliverablesTab, 'handleDecideApprovalStep', 'deliverables tab can decide approval steps');
  assertIncludes(closeConditionsTab, 'CloseoutApprovalRoutePanel', 'close-condition tab renders the closeout approval route panel');
  assertIncludes(closeConditionsTab, '종료조건 승인선', 'close-condition tab labels close-condition approval routes');
  assertIncludes(closeConditionsTab, 'handleSaveApprovalRoute', 'close-condition tab can save approval routes');
  assertIncludes(closeConditionsTab, 'handleDecideApprovalStep', 'close-condition tab can decide approval steps');
  assertIncludes(closeoutApprovalRoutePanel, '승인선 설정', 'closeout approval route panel exposes a route setup action');
  assertIncludes(closeoutApprovalRoutePanel, '승인 단계 추가', 'closeout approval route panel supports multi-step routes');
  assertIncludes(closeoutApprovalRoutePanel, '같은 승인자는 한 승인선에 한 번만 지정할 수 있습니다.', 'closeout approval route panel blocks duplicate approvers');
  assertIncludes(deliverableModule, 'TemplateAdminController', 'deliverable module registers the PMS template admin controller');
  assertIncludes(templateAdminController, "@Controller('pms/template-groups')", 'server exposes a dedicated PMS template-group admin route');
  assertIncludes(templateAdminController, "@Roles('admin')", 'template-group admin route is limited to admin users');
  assertIncludes(templateAdminController, "@Get('deliverables')", 'template admin route exposes deliverable group list');
  assertIncludes(templateAdminController, "@Patch('deliverables/:groupCode/approval')", 'template admin route exposes deliverable approval changes');
  assertIncludes(templateAdminController, "@Post('deliverables/:groupCode/restore/:historySeq')", 'template admin route exposes deliverable history restore');
  assertIncludes(templateAdminController, "@Delete('deliverables/:groupCode')", 'template admin route exposes deliverable archive');
  assertIncludes(templateAdminController, "@Get('close-conditions')", 'template admin route exposes close-condition group list');
  assertIncludes(templateAdminController, "@Patch('close-conditions/:groupCode/approval')", 'template admin route exposes close-condition approval changes');
  assertIncludes(templateAdminController, "@Post('close-conditions/:groupCode/restore/:historySeq')", 'template admin route exposes close-condition history restore');
  assertIncludes(templateAdminController, "@Delete('close-conditions/:groupCode')", 'template admin route exposes close-condition archive');
  assertIncludes(templateAdminController, 'findTemplateGroups({ includeInactive: true })', 'template admin route lists archived groups for restore/audit');
  assertIncludes(templateApi, 'pmsTemplatesApi', 'web client exposes PMS template admin API');
  assertIncludes(templateApi, '/pms/template-groups', 'web client calls the dedicated template-group admin route');
  assertIncludes(templateApi, 'updateDeliverableApproval', 'web client can approve deliverable template groups');
  assertIncludes(templateApi, 'restoreDeliverableGroup', 'web client can restore deliverable template groups');
  assertIncludes(templateApi, 'deactivateDeliverableGroup', 'web client can archive deliverable template groups');
  assertIncludes(templateApi, 'updateCloseConditionApproval', 'web client can approve close-condition template groups');
  assertIncludes(templateApi, 'restoreCloseConditionGroup', 'web client can restore close-condition template groups');
  assertIncludes(templateApi, 'deactivateCloseConditionGroup', 'web client can archive close-condition template groups');
  assertIncludes(templateQuery, 'usePmsDeliverableTemplateGroups', 'web query layer exposes deliverable template admin list');
  assertIncludes(templateQuery, 'usePmsDeliverableTemplateGroupHistory', 'web query layer exposes deliverable template history');
  assertIncludes(templateQuery, 'useUpdatePmsDeliverableTemplateGroupApproval', 'web query layer exposes deliverable template approval');
  assertIncludes(templateQuery, 'useRestorePmsDeliverableTemplateGroup', 'web query layer exposes deliverable template restore');
  assertIncludes(templateQuery, 'useDeactivatePmsDeliverableTemplateGroup', 'web query layer exposes deliverable template archive');
  assertIncludes(templateQuery, 'usePmsCloseConditionTemplateGroups', 'web query layer exposes close-condition template admin list');
  assertIncludes(templateQuery, 'usePmsCloseConditionTemplateGroupHistory', 'web query layer exposes close-condition template history');
  assertIncludes(templateQuery, 'useUpdatePmsCloseConditionTemplateGroupApproval', 'web query layer exposes close-condition template approval');
  assertIncludes(templateQuery, 'useRestorePmsCloseConditionTemplateGroup', 'web query layer exposes close-condition template restore');
  assertIncludes(templateQuery, 'useDeactivatePmsCloseConditionTemplateGroup', 'web query layer exposes close-condition template archive');
  assertIncludes(templateAdminPage, '템플릿 관리', 'PMS admin template page is implemented');
  assertIncludes(templateAdminPage, 'MODE_LABELS', 'PMS admin template page separates deliverable and close-condition modes');
  assertIncludes(templateAdminPage, '버전', 'PMS admin template page exposes template versions');
  assertIncludes(templateAdminPage, '승인', 'PMS admin template page exposes approval action');
  assertIncludes(templateAdminPage, '보관', 'PMS admin template page exposes archive action');
  assertIncludes(templateAdminPage, '복구', 'PMS admin template page exposes history restore action');
  assertIncludes(templateAdminPage, '산출물 필요', 'PMS admin template page exposes close-condition deliverable-required policy');
  assertIncludes(queryIndex, 'usePmsDeliverableTemplateGroups', 'query hook barrel exports PMS template admin hooks');
  assertIncludes(contentArea, "'/admin/templates': lazy", 'PMS template admin route is mapped to a real page component');
  assertIncludes(header, "'/admin/templates': '관리'", 'PMS header maps the template admin route to management context');
  assertIncludes(prismaSchema, 'requiresDeliverable Boolean @default(false) @map("requires_deliverable")', 'PMS schema stores close-condition template deliverable-required policy');
  assertIncludes(prismaSchema, 'approvalStatusCode String    @default("draft") @map("approval_status_code")', 'PMS schema stores template approval status');
  assertIncludes(prismaSchema, 'versionNo          Int       @default(1) @map("version_no")', 'PMS schema stores template group version numbers');
  assertIncludes(prismaSchema, 'approvedBy         BigInt?   @map("approved_by")', 'PMS schema stores template approver user id');
  assertIncludes(prismaSchema, 'approvedAt         DateTime? @map("approved_at")', 'PMS schema stores template approval timestamp');
  assertIncludes(prismaSchema, 'model ProjectCloseoutApprovalStep', 'PMS schema stores closeout approval route steps');
  assertIncludes(prismaSchema, '@@map("pr_project_closeout_approval_step_m")', 'PMS schema maps closeout approval steps to the PMS approval route table');
  assertIncludes(prismaSchema, 'closeoutApprovalSteps  ProjectCloseoutApprovalStep[]', 'PMS project schema exposes closeout approval step relation');
  assertIncludes(closeConditionTemplateMigration, 'ADD COLUMN IF NOT EXISTS requires_deliverable', 'PMS protected migration adds close-condition template deliverable-required policy');
  assertIncludes(templateGroupWorkflowMigration, 'approval_status_code VARCHAR(32) NOT NULL DEFAULT \'draft\'', 'PMS protected migration adds template approval status');
  assertIncludes(templateGroupWorkflowMigration, 'version_no INTEGER NOT NULL DEFAULT 1', 'PMS protected migration adds template version numbers');
  assertIncludes(templateGroupWorkflowMigration, 'approved_by BIGINT', 'PMS protected migration adds template approver user id');
  assertIncludes(templateGroupWorkflowMigration, 'approved_at TIMESTAMP(3)', 'PMS protected migration adds template approval timestamp');
  assertIncludes(templateGroupWorkflowMigration, 'approval_status_code = \'approved\'', 'PMS protected migration backfills launch default templates as approved');
  assertIncludes(closeoutApprovalMigration, 'pr_project_closeout_approval_step_m', 'PMS protected migration creates closeout approval step table');
  assertIncludes(closeoutApprovalMigration, "target_type_code\" IN ('deliverable', 'close_condition')", 'PMS protected migration constrains closeout approval targets');
  assertIncludes(closeoutApprovalMigration, "approval_status_code\" IN ('pending', 'approved', 'rejected', 'skipped')", 'PMS protected migration constrains closeout approval decisions');
  assertIncludes(closeoutApprovalMigration, 'ux_pr_project_closeout_approval_step_m_sequence', 'PMS protected migration prevents duplicate active approval step sequence');
  assertIncludes(dbInitEntrypoint, '20260709153000_add_pms_close_condition_group_requires_deliverable', 'db-init protected baseline applies close-condition template policy migration');
  assertIncludes(dbInitEntrypoint, '20260709170000_add_pms_template_group_workflow', 'db-init protected baseline applies template workflow migration');
  assertIncludes(dbInitEntrypoint, '20260710113000_add_pms_closeout_approval_steps', 'db-init protected baseline applies closeout approval route migration');
  assertIncludes(templateGroupSeed, 'request-default', 'PMS template group seed creates request default groups');
  assertIncludes(templateGroupSeed, 'requires_deliverable', 'PMS template group seed preserves close-condition deliverable-required policy');
  assertIncludes(templateGroupSeed, 'approval_status_code', 'PMS template group seed sets template approval status');
  assertIncludes(templateGroupSeed, 'version_no', 'PMS template group seed sets template version numbers');
  assertIncludes(templateGroupSeed, "'approved'", 'PMS template group seed marks default groups as approved');
  assertIncludes(seedInstaller, '22_pms_template_groups.sql', 'PMS seed installer applies launch template groups');
  assertIncludes(deliverableGroupTrigger, 'approval_status_code, version_no, approved_by, approved_at', 'deliverable group history trigger records workflow/version fields');
  assertIncludes(closeConditionGroupTrigger, 'approval_status_code, version_no, approved_by, approved_at', 'close-condition group history trigger records workflow/version fields');
  assertIncludes(closeConditionGroupItemTrigger, 'requires_deliverable, sort_order', 'close-condition group item history trigger records deliverable-required policy');
  assertIncludes(deliverablesTab, 'DeliverableMetaField', 'deliverables tab renders mobile metadata fields');
  assertIncludes(deliverablesTab, 'useApplyDeliverableTemplate', 'deliverables tab exposes the default template apply action');
  assertIncludes(deliverablesTab, 'templateApplyMode', 'deliverables tab exposes append/replace template apply mode control');
  assertIncludes(deliverablesTab, '기존 산출물 교체', 'deliverables tab labels replace mode clearly');
  assertIncludes(deliverablesTab, 'useDeliverableTemplateGroups', 'deliverables tab loads selectable template groups');
  assertIncludes(deliverablesTab, 'useSaveDeliverableTemplateGroup', 'deliverables tab can save the current list as a template group');
  assertIncludes(deliverablesTab, '산출물 템플릿을 적용했습니다.', 'deliverables tab confirms template application to users');
  assertIncludes(deliverablesTab, '템플릿 선택', 'deliverables tab exposes selectable template UX');
  assertIncludes(deliverablesTab, '현재 목록 저장', 'deliverables tab exposes current-list template save UX');
  assertIncludes(deliverablesTab, '기본 템플릿', 'deliverables tab labels the template action');
  assertIncludes(deliverablesTab, 'DeliverableStatusSelect', 'deliverables tab reuses submission status controls on mobile and desktop');
  assertIncludes(deliverablesTab, 'VISIBLE_SUBMISSION_STATUS_CODES', 'deliverables tab exposes only normalized launch-facing status options');
  assertIncludes(deliverablesTab, 'not_required', 'deliverables tab lets users mark a deliverable as not required');
  assertIncludes(deliverablesTab, "'승인'", 'deliverables tab lets users keep approved as a completion status');
  assertIncludes(detail, 'readiness?.deliverables.completed', 'project detail closeout panel reads completed deliverable counts');
  assertIncludes(stageActionBar, 'readiness?.deliverables.completed', 'stage action bar reads completed deliverable counts');
  assertIncludes(deliverablesTab, 'DeliverableEventSelect', 'deliverables tab reuses event linkage controls on mobile and desktop');
  assertIncludes(deliverablesTab, 'space-y-3 md:hidden', 'deliverables tab has a mobile-specific card list');
  assertIncludes(deliverablesTab, 'hidden overflow-hidden rounded-lg border md:block', 'deliverables tab keeps dense tables on desktop only');
  assertIncludes(deliverablesTab, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'deliverable dialogs fit small mobile viewports');
  assertIncludes(deliverablesTab, 'className="w-full sm:w-auto"', 'deliverable add actions and dialog buttons are full-width on mobile');
  assertIncludes(closeConditionsTab, 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', 'close-condition tab stacks header actions on mobile');
  assertIncludes(closeConditionsTab, 'useApplyCloseConditionTemplate', 'close-condition tab exposes the default template apply action');
  assertIncludes(closeConditionsTab, 'templateApplyMode', 'close-condition tab exposes append/replace template apply mode control');
  assertIncludes(closeConditionsTab, '기존 종료조건 교체', 'close-condition tab labels replace mode clearly');
  assertIncludes(closeConditionsTab, 'useCloseConditionTemplateGroups', 'close-condition tab loads selectable template groups');
  assertIncludes(closeConditionsTab, 'useSaveCloseConditionTemplateGroup', 'close-condition tab can save the current list as a template group');
  assertIncludes(closeConditionsTab, '종료조건 템플릿을 적용했습니다.', 'close-condition tab confirms template application to users');
  assertIncludes(closeConditionsTab, '템플릿 선택', 'close-condition tab exposes selectable template UX');
  assertIncludes(closeConditionsTab, '현재 목록 저장', 'close-condition tab exposes current-list template save UX');
  assertIncludes(closeConditionsTab, '기본 템플릿', 'close-condition tab labels the template action');
  assertIncludes(closeConditionsTab, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'close-condition dialogs fit small mobile viewports');
  assertIncludes(closeConditionsTab, 'className="w-full sm:w-auto"', 'close-condition add actions and dialog buttons are full-width on mobile');
  assertIncludes(tasksTab, 'TaskMetaField', 'tasks tab renders mobile metadata fields');
  assertIncludes(tasksTab, 'TaskWbsSelect', 'tasks tab reuses WBS linkage controls on mobile and desktop');
  assertIncludes(tasksTab, 'TaskStatusSelect', 'tasks tab reuses task status controls on mobile and desktop');
  assertIncludes(tasksTab, 'TaskProgressControl', 'tasks tab reuses task progress controls on mobile and desktop');
  assertIncludes(tasksTab, 'pms-task-effort-summary', 'tasks tab exposes a stable effort summary target');
  assertIncludes(tasksTab, 'TaskEffortControl', 'tasks tab reuses estimated/actual effort controls on mobile and desktop');
  assertIncludes(tasksTab, 'estimatedHours', 'tasks tab lets users manage estimated effort on task rows');
  assertIncludes(tasksTab, 'actualHours', 'tasks tab lets users manage actual effort on task rows');
  assertIncludes(tasksTab, '공수 요약', 'tasks tab labels task effort as a launch-facing management surface');
  assertIncludes(tasksTab, 'pms-task-effort-log-panel', 'tasks tab exposes a stable daily effort log panel target');
  assertIncludes(tasksTab, 'pms-task-effort-log-dialog', 'tasks tab exposes a stable daily effort log dialog target');
  assertIncludes(tasksTab, '공수 기록 추가', 'tasks tab lets users add daily task effort records');
  assertIncludes(tasksTab, 'useProjectTaskEffortLogs', 'tasks tab reads daily task effort logs');
  assertIncludes(tasksTab, 'useCreateTaskEffortLog', 'tasks tab creates daily task effort logs');
  assertIncludes(tasksTab, 'useDeleteTaskEffortLog', 'tasks tab can deactivate daily task effort logs');
  assertIncludes(taskController, "@Get('effort-logs')", 'task controller exposes daily effort log list before task detail routes');
  assertIncludes(taskController, "@Post('effort-logs')", 'task controller exposes daily effort log create endpoint');
  assertIncludes(taskController, "@Put('effort-logs/:effortLogId')", 'task controller exposes daily effort log update endpoint');
  assertIncludes(taskController, "@Delete('effort-logs/:effortLogId')", 'task controller exposes daily effort log soft-delete endpoint');
  assertIncludes(taskService, 'refreshTaskActualHours', 'task service aggregates active daily effort logs back to task actual hours');
  assertIncludes(taskService, 'taskEffortLog.aggregate', 'task service sums active daily effort log actual hours');
  assertIncludes(taskService, 'task_effort_log_aggregate', 'task service records task actual-hour updates as effort-log aggregation');
  assertIncludes(taskService, 'queueTaskAiIndexJob', 'task effort log changes keep task AI index refresh behavior');
  assertIncludes(projectApi, 'TaskEffortLogItem', 'PMS web project API exposes daily effort log item type');
  assertIncludes(projectApi, 'getTaskEffortLogs', 'PMS web project API reads daily effort logs');
  assertIncludes(projectApi, 'createTaskEffortLog', 'PMS web project API creates daily effort logs');
  assertIncludes(projectApi, 'updateTaskEffortLog', 'PMS web project API updates daily effort logs');
  assertIncludes(projectApi, 'deleteTaskEffortLog', 'PMS web project API deactivates daily effort logs');
  assertIncludes(projectApi, '`/projects/${projectId}/tasks/effort-logs`', 'PMS web project API calls the daily effort log route');
  assertIncludes(projectQueries, 'taskEffortLogKeys', 'PMS query layer defines daily effort log cache keys');
  assertIncludes(projectQueries, 'useProjectTaskEffortLogs', 'PMS query layer exposes daily effort log query hook');
  assertIncludes(projectQueries, 'useCreateTaskEffortLog', 'PMS query layer exposes daily effort log create mutation');
  assertIncludes(projectQueries, 'useUpdateTaskEffortLog', 'PMS query layer exposes daily effort log update mutation');
  assertIncludes(projectQueries, 'useDeleteTaskEffortLog', 'PMS query layer exposes daily effort log deactivate mutation');
  assertIncludes(queryIndex, 'useProjectTaskEffortLogs', 'query hook barrel exports daily effort log query hook');
  assertIncludes(queryIndex, 'useCreateTaskEffortLog', 'query hook barrel exports daily effort log create mutation');
  assertIncludes(taskTypes, 'TaskEffortLog', 'shared PMS task types expose daily effort log contract');
  assertIncludes(taskTypes, 'CreateTaskEffortLogDto', 'shared PMS task types expose daily effort log create DTO');
  assertIncludes(taskTypes, 'UpdateTaskEffortLogDto', 'shared PMS task types expose daily effort log update DTO');
  assertIncludes(pmsTypeIndex, 'TaskEffortLog', 'PMS type index exports daily effort log contract');
  assertIncludes(rootTypesIndex, 'CreateTaskEffortLogDto', 'root type index exports daily effort log create DTO');
  assertIncludes(rootTypesIndex, 'UpdateTaskEffortLogDto', 'root type index exports daily effort log update DTO');
  assertIncludesAll(
    prismaSchema,
    [
      'model TaskEffortLog',
      'model TaskEffortLogHistory',
      '@@map("pr_task_effort_log_m")',
      '@@map("pr_task_effort_log_h")',
      'actualHours  Decimal  @map("actual_hours") @db.Decimal(8, 1)',
      'workDate     DateTime @map("work_date") @db.Date',
      'taskEffortLogs         TaskEffortLog[]',
    ],
    'PMS schema defines daily task effort log master/history tables and project/task/user relations',
  );
  assertIncludesAll(
    taskEffortLogMigration,
    [
      'PMS task daily effort log protected baseline',
      '"pms"."pr_task_effort_log_m"',
      '"pms"."pr_task_effort_log_h"',
      '"actual_hours" DECIMAL(8, 1) NOT NULL',
      '"work_date" DATE NOT NULL',
      'ck_pr_task_effort_log_m_actual_hours',
    ],
    'PMS protected migration creates daily task effort log master/history tables',
  );
  assertNotIncludes(taskEffortLogMigration, '"crm".', 'PMS task effort migration must not create or own CRM ledger tables');
  assertIncludes(dbInitEntrypoint, '20260713140000_add_pms_task_effort_logs', 'db-init protected baseline applies daily task effort log migration');
  assertIncludes(triggerInstaller, '78_pr_task_effort_log_h_trigger.sql', 'PMS trigger installer applies daily task effort history trigger');
  assertIncludes(triggerScript, '78_pr_task_effort_log_h_trigger.sql', 'database trigger script applies daily task effort history trigger');
  assertIncludes(taskEffortLogTrigger, 'fn_pr_task_effort_log_h_trigger', 'daily task effort trigger records history rows');
  assertIncludes(projectDashboardPanel, 'summary.performance.actualHours', 'project dashboard performance card surfaces actual effort');
  assertIncludes(projectDashboardPanel, 'summary.performance.estimatedHours', 'project dashboard performance card surfaces estimated effort');
  assertIncludes(tasksTab, 'space-y-3 md:hidden', 'tasks tab has a mobile-specific card list');
  assertIncludes(tasksTab, 'hidden overflow-hidden rounded-lg border md:block', 'tasks tab keeps dense tables on desktop only');
  assertIncludes(tasksTab, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg', 'task dialogs fit small mobile viewports');
  assertIncludes(tasksTab, 'className="w-full sm:w-auto"', 'task add actions and dialog buttons are full-width on mobile');
  assertIncludes(milestonesTab, 'MilestoneMetaField', 'milestones tab renders mobile metadata fields');
  assertIncludes(milestonesTab, 'MilestoneObjectiveSelect', 'milestones tab reuses objective linkage controls on mobile and desktop');
  assertIncludes(milestonesTab, 'MilestoneStatusSelect', 'milestones tab reuses milestone status controls on mobile and desktop');
  assertIncludes(milestonesTab, 'space-y-3 md:hidden', 'milestones tab has a mobile-specific card list');
  assertIncludes(milestonesTab, 'hidden overflow-hidden rounded-lg border md:block', 'milestones tab keeps dense tables on desktop only');
  assertIncludes(milestonesTab, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'milestone dialogs fit small mobile viewports');
  assertIncludes(milestonesTab, 'className="w-full sm:w-auto"', 'milestone add actions and dialog buttons are full-width on mobile');
  assertIncludes(objectivesPanel, 'ObjectiveMetaField', 'objectives panel renders mobile metadata fields');
  assertIncludes(objectivesPanel, 'ObjectiveStatusSelect', 'objectives panel reuses status controls on mobile and desktop');
  assertIncludes(objectivesPanel, 'space-y-3 md:hidden', 'objectives panel has a mobile-specific card list');
  assertIncludes(objectivesPanel, 'hidden overflow-hidden rounded-md border bg-card md:block', 'objectives panel keeps dense tables on desktop only');
  assertIncludes(objectivesPanel, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'objective dialogs fit small mobile viewports');
  assertIncludes(objectivesPanel, 'className="w-full sm:w-auto"', 'objective add actions and dialog buttons are full-width on mobile');
  assertIncludes(wbsPanel, 'WbsMetaField', 'WBS panel renders mobile metadata fields');
  assertIncludes(wbsPanel, 'WbsStatusSelect', 'WBS panel reuses status controls on mobile and desktop');
  assertIncludes(wbsPanel, 'space-y-3 md:hidden', 'WBS panel has a mobile-specific card list');
  assertIncludes(wbsPanel, 'hidden overflow-hidden rounded-md border bg-card md:block', 'WBS panel keeps dense tables on desktop only');
  assertIncludes(wbsPanel, 'max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl', 'WBS dialogs fit small mobile viewports');
  assertIncludes(wbsPanel, 'className="w-full sm:w-auto"', 'WBS add actions and dialog buttons are full-width on mobile');
  assertIncludesAll(
    prismaSchema,
    [
      'model PlantSite',
      'model SystemCatalog',
      'model SystemInstance',
      'model SystemIntegration',
      'model PmsMasterImportProfile',
      '@@map("pr_site_m")',
      '@@map("pr_system_catalog_m")',
      '@@map("pr_system_instance_m")',
      '@@map("pr_integration_m")',
      '@@map("pr_master_import_profile_m")',
    ],
    'PMS schema defines execution asset master tables and import profiles without CRM ledger fields',
  );
  assertIncludes(masterController, "@Controller('master')", 'server exposes PMS master controller');
  assertIncludes(masterController, "@Get('import-profiles')", 'server exposes PMS master import profile list endpoint');
  assertIncludes(masterController, "@Get('sites')", 'server exposes plant/site master endpoint');
  assertIncludes(masterController, "@Get('system-catalogs')", 'server exposes system catalog master endpoint');
  assertIncludes(masterController, "@Get('system-instances')", 'server exposes system instance master endpoint');
  assertIncludes(masterController, "@Get('integrations')", 'server exposes integration master endpoint');
  assertIncludesAll(
    masterController,
    [
      "@Post('sites')",
      "@Put('sites/:siteId')",
      "@Delete('sites/:siteId')",
      "@Post('system-catalogs')",
      "@Put('system-catalogs/:systemCatalogId')",
      "@Delete('system-catalogs/:systemCatalogId')",
      "@Post('system-instances')",
      "@Put('system-instances/:systemInstanceId')",
      "@Delete('system-instances/:systemInstanceId')",
      "@Post('integrations')",
      "@Put('integrations/:integrationId')",
      "@Delete('integrations/:integrationId')",
      "@Post('import')",
      "@Post('import-profiles')",
      "@Get('import-profiles/:profileId/history')",
      "@Put('import-profiles/:profileId')",
      "@Post('import-profiles/:profileId/restore')",
      "@Delete('import-profiles/:profileId')",
    ],
    'server exposes admin CRUD, import, and shared import profile endpoints for PMS execution asset master',
  );
  assertIncludes(masterService, 'plantSite.findMany', 'master service reads plant/site data');
  assertIncludes(masterService, 'systemCatalog.findMany', 'master service reads system catalog data');
  assertIncludes(masterService, 'systemInstance.findMany', 'master service reads system instance data');
  assertIncludes(masterService, 'systemIntegration.findMany', 'master service reads integration data');
  assertIncludesAll(
    masterService,
    [
      'createSite',
      'updateSite',
      'deactivateSite',
      'createSystemCatalog',
      'updateSystemCatalog',
      'deactivateSystemCatalog',
      'createSystemInstance',
      'updateSystemInstance',
      'deactivateSystemInstance',
      'createIntegration',
      'updateIntegration',
      'deactivateIntegration',
      'importMaster',
      'findImportProfiles',
      'createImportProfile',
      'updateImportProfile',
      'deactivateImportProfile',
      'normalizeImportProfileMapping',
      'loadImportLookup',
      'applyImportPlans',
      'assertDistinctIntegrationEndpoints',
    ],
    'master service implements guarded create/update/deactivate/import/profile lifecycle',
  );
  assertIncludes(masterService, 'pmsMasterImportProfile', 'master service persists shared import mapping profiles');
  assertIncludes(masterApi, "'/master/sites'", 'web client calls plant/site master endpoint');
  assertIncludes(masterApi, "'/master/system-catalogs'", 'web client calls system catalog master endpoint');
  assertIncludes(masterApi, "'/master/system-instances'", 'web client calls system instance master endpoint');
  assertIncludes(masterApi, "'/master/integrations'", 'web client calls integration master endpoint');
  assertIncludesAll(
    masterApi,
    [
      'createSite',
      'updateSite',
      'deactivateSite',
      'createSystemCatalog',
      'updateSystemCatalog',
      'deactivateSystemCatalog',
      'createSystemInstance',
      'updateSystemInstance',
      'deactivateSystemInstance',
      'createIntegration',
      'updateIntegration',
      'deactivateIntegration',
      'importMaster',
      'importProfiles',
      'createImportProfile',
      'importProfileHistory',
      'updateImportProfile',
      'restoreImportProfile',
      'deactivateImportProfile',
    ],
    'web client exposes PMS master CRUD, import, and shared import profile requests',
  );
  assertIncludes(masterQuery, 'usePmsMasterSummary', 'web query hook exposes PMS master summary');
  assertIncludes(masterQuery, 'usePlantSites', 'web query hook exposes plant/site list');
  assertIncludes(masterQuery, 'useSystemCatalogs', 'web query hook exposes system catalog list');
  assertIncludes(masterQuery, 'useSystemInstances', 'web query hook exposes system instance list');
  assertIncludes(masterQuery, 'useSystemIntegrations', 'web query hook exposes integration list');
  assertIncludesAll(
    masterQuery,
    [
      'useCreatePlantSite',
      'useUpdatePlantSite',
      'useDeactivatePlantSite',
      'useCreateSystemCatalog',
      'useUpdateSystemCatalog',
      'useDeactivateSystemCatalog',
      'useCreateSystemInstance',
      'useUpdateSystemInstance',
      'useDeactivateSystemInstance',
      'useCreateSystemIntegration',
      'useUpdateSystemIntegration',
      'useDeactivateSystemIntegration',
      'useImportPmsMaster',
      'usePmsMasterImportProfiles',
      'usePmsMasterImportProfileHistory',
      'useCreatePmsMasterImportProfile',
      'useUpdatePmsMasterImportProfile',
      'useRestorePmsMasterImportProfile',
      'useDeactivatePmsMasterImportProfile',
    ],
    'web query hook exposes PMS master CRUD, import, and shared profile queries/mutations',
  );
  assertIncludes(masterPage, '플랜트/사이트', 'PMS master screen shows plant/site surface');
  assertIncludes(masterPage, '시스템 종류', 'PMS master screen shows system catalog surface');
  assertIncludes(masterPage, '시스템 인스턴스', 'PMS master screen shows system instance surface');
  assertIncludes(masterPage, '인터페이스', 'PMS master screen shows integration surface');
  assertIncludesAll(
    masterPage,
    [
      '기준정보 추가',
      'RowActions',
      'DialogTitle',
      'SelectField',
      'handleOpenEditSite',
      'handleDeactivateSite',
      'handleOpenEditIntegration',
      'handleDeactivateIntegration',
      '기준정보 반입',
      'CSV/TSV 파일',
      '템플릿 다운로드',
      '공유 매핑',
      '기본 공유 매핑',
      '공유 매핑 이력',
      '이력 복구',
      '공유 저장',
      '공유 불러오기',
      '컬럼 매핑',
      '매핑 저장',
      '저장 매핑 불러오기',
      '행 미리보기',
      'ImportFileMappingPanel',
      'ImportResultPanel',
      'parseDelimitedImportFile',
      'mapDelimitedRowsToImportPayload',
      'downloadImportTemplate',
      'loadImportMappingProfiles',
      'handleSaveImportMappingProfile',
      'handleSaveSharedImportMappingProfile',
      'importProfileIsDefault',
      'setImportProfileIsDefault',
      'isDefault: importProfileIsDefault',
      'onSharedProfileDefaultChange',
      'handleRestoreSharedImportMappingProfileHistory',
      'formatImportProfileHistoryLabel',
      'compactImportColumnMapping',
      "runImport('preview')",
      "runImport('apply')",
    ],
    'PMS master screen exposes launch-facing create/edit/deactivate/import controls and file/template/local/shared mapping import UX',
  );
  assertIncludes(masterPage, 'legacy?: boolean', 'PMS master import field config can mark direct ID fields as compatibility-only');
  assertIncludes(masterPage, 'getImportTemplateFields', 'PMS master import templates use a filtered field list');
  assertIncludes(masterPage, "field: 'customerId', label: '고객사 ID (호환 입력)', legacy: true", 'PMS master import keeps customer ID as compatibility mapping only');
  assertIncludes(masterPage, "field: 'siteId', label: '사이트 ID (호환 입력)', legacy: true", 'PMS master import keeps site ID as compatibility mapping only');
  assertIncludes(masterPage, "field: 'systemCatalogId', label: '시스템 종류 ID (호환 입력)', legacy: true", 'PMS master import keeps system catalog ID as compatibility mapping only');
  assertIncludes(masterPage, "field: 'sourceSystemInstanceId', label: '출발 시스템 ID (호환 입력)', legacy: true", 'PMS master import keeps source system instance ID as compatibility mapping only');
  assertIncludes(masterPage, "const headers = getImportTemplateFields(entity).map((field) => field.field)", 'PMS master import template downloads omit compatibility-only direct ID fields');
  assertNotIncludes(masterPage, "const headers = IMPORT_FIELD_CONFIGS[entity].map((field) => field.field)", 'PMS master import templates must not default to raw direct ID fields');
  assertIncludes(masterTypes, 'PmsMasterSummary', 'shared PMS types define master summary contract');
  assertIncludes(masterTypes, 'PlantSite', 'shared PMS types define plant/site contract');
  assertIncludes(masterTypes, 'SystemCatalog', 'shared PMS types define system catalog contract');
  assertIncludes(masterTypes, 'SystemInstance', 'shared PMS types define system instance contract');
  assertIncludes(masterTypes, 'SystemIntegration', 'shared PMS types define integration contract');
  assertIncludesAll(
    masterTypes,
    [
      'CreatePlantSiteDto',
      'UpdatePlantSiteDto',
      'CreateSystemCatalogDto',
      'UpdateSystemCatalogDto',
      'CreateSystemInstanceDto',
      'UpdateSystemInstanceDto',
      'CreateSystemIntegrationDto',
      'UpdateSystemIntegrationDto',
      'PmsMasterImportRequest',
      'PmsMasterImportResponse',
      'PmsMasterImportProfileHistory',
      'RestorePmsMasterImportProfileDto',
      'ImportSystemInstanceDto',
      'ImportSystemIntegrationDto',
    ],
    'shared PMS types define master create/update/import contracts',
  );
  assertIncludes(pmsTypeIndex, 'PmsMasterSummary', 'PMS type index exports master summary contract');
  assertIncludes(pmsTypeIndex, 'PlantSite', 'PMS type index exports plant/site contract');
  assertIncludes(pmsTypeIndex, 'SystemCatalog', 'PMS type index exports system catalog contract');
  assertIncludes(pmsTypeIndex, 'SystemInstance', 'PMS type index exports system instance contract');
  assertIncludes(pmsTypeIndex, 'SystemIntegration', 'PMS type index exports integration contract');
  assertIncludes(pmsTypeIndex, 'CreatePlantSiteDto', 'PMS type index exports master create contracts');
  assertIncludes(pmsTypeIndex, 'UpdateSystemIntegrationDto', 'PMS type index exports master update contracts');
  assertIncludes(pmsTypeIndex, 'PmsMasterImportRequest', 'PMS type index exports master import request contract');
  assertIncludes(pmsTypeIndex, 'PmsMasterImportResponse', 'PMS type index exports master import response contract');
  assertIncludes(pmsTypeIndex, 'PmsMasterImportProfileHistory', 'PMS type index exports master import profile history contract');
  assertIncludes(pmsTypeIndex, 'RestorePmsMasterImportProfileDto', 'PMS type index exports master import profile restore contract');
  assertIncludes(queryIndex, 'useCreatePlantSite', 'query hook barrel exports plant/site create hook');
  assertIncludes(queryIndex, 'useUpdateSystemIntegration', 'query hook barrel exports integration update hook');
  assertIncludes(queryIndex, 'useDeactivateSystemIntegration', 'query hook barrel exports integration deactivate hook');
  assertIncludes(queryIndex, 'useImportPmsMaster', 'query hook barrel exports master import hook');
  assertIncludes(queryIndex, 'usePmsMasterImportProfileHistory', 'query hook barrel exports import profile history hook');
  assertIncludes(queryIndex, 'useRestorePmsMasterImportProfile', 'query hook barrel exports import profile restore hook');
  assertIncludes(queryIndex, 'useTransitionReadiness', 'query hook barrel exports transition readiness hook');
  assertIncludes(queryIndex, 'useProjectAccess', 'query hook barrel exports project access hook');
  assertIncludes(queryIndex, 'useProjectOrgs', 'query hook barrel exports project org hook');
  assertIncludes(queryIndex, 'useProjectRelations', 'query hook barrel exports project relation hook');
  assertIncludes(queryIndex, 'useProjectRequirements', 'query hook barrel exports requirement hook');
  assertIncludes(queryIndex, 'useProjectRisks', 'query hook barrel exports risk hook');
  assertIncludes(queryIndex, 'useProjectChangeRequests', 'query hook barrel exports change request hook');
  assertIncludes(queryIndex, 'useProjectEvents', 'query hook barrel exports event hook');
  assertIncludes(queryIndex, 'useProjectControlIssues', 'query hook barrel exports canonical project issue hook');
  assertIncludes(queryIndex, 'useProjectHandoffs', 'query hook barrel exports handoff hook');
  assertIncludes(queryIndex, 'useCreateProjectHandoff', 'query hook barrel exports create handoff hook');
  assertIncludes(queryIndex, 'useUpdateProjectHandoff', 'query hook barrel exports update handoff hook');
  assertIncludes(queryIndex, 'useProjectContracts', 'query hook barrel exports contract snapshot hook');
  assertIncludes(menuSeed, "VALUES ('dashboard', '홈', 'Home', 'menu', '/home', 'LayoutDashboard', 0, 1, false, false", 'home stays out of PMS sidebar menu seed');
  assertIncludes(menuSeed, 'is_active = false,\n  updated_at = CURRENT_TIMESTAMP;\n\n-- 내 프로젝트', 'dashboard menu row remains inactive while fixed home tab owns /home');
  assertIncludes(menuSeed, "VALUES ('my-projects', '내 프로젝트', 'My Projects', 'menu', '/my-projects'", 'PMS sidebar exposes a mapped my-projects work queue');
  assertIncludes(menuSeed, "VALUES ('action-required', '조치 필요', 'Action Required', 'menu', '/action-required'", 'PMS sidebar exposes a mapped action-required work queue');
  assertIncludes(menuSeed, "VALUES ('closeout', '종료/전환', 'Closeout', 'menu', '/closeout'", 'PMS sidebar exposes a mapped closeout work queue');
  assertIncludes(menuSeed, "VALUES ('operations-overview', '전체 운영 현황', 'Operations Overview', 'menu', '/operations'", 'PMS sidebar exposes a mapped operations overview');
  assertIncludes(menuSeed, "VALUES ('admin.master', '기준정보', 'Master Data', 'menu', '/admin/master'", 'PMS master screen is available through admin menu seed');
  assertIncludes(menuSeed, "VALUES ('admin.templates', '템플릿 관리', 'Template Management', 'menu', '/admin/templates'", 'PMS template management screen is available through admin menu seed');
  assertIncludes(contentArea, "'/my-projects': lazy", 'PMS my-projects sidebar route is mapped to a real page component');
  assertIncludes(contentArea, "'/action-required': lazy", 'PMS action-required sidebar route is mapped to a real page component');
  assertIncludes(contentArea, "'/closeout': lazy", 'PMS closeout sidebar route is mapped to a real page component');
  assertIncludes(contentArea, "'/operations': lazy", 'PMS operations sidebar route is mapped to a real page component');
  assertIncludes(contentArea, "'/project-settings': lazy", 'PMS project settings route is mapped to a real page component');
  assertIncludes(contentArea, "'/admin/master': lazy", 'PMS master admin route is mapped to a real page component');
  assertIncludes(contentArea, "'/admin/templates': lazy", 'PMS template admin route is mapped to a real page component');
  assertNotIncludes(contentArea, '페이지 준비 중', 'PMS shell fallback must not present unmapped routes as unfinished launch work');
  assertIncludes(contentArea, '등록되지 않은 화면 경로입니다', 'PMS shell fallback reports unmapped route configuration clearly');
  assertNotIncludes(handoffsTab, "'not-implemented': '미구현'", 'PMS CRM handoff status must not expose implementation jargon');
  assertIncludes(handoffsTab, "'not-implemented': '인계 미구성'", 'PMS CRM handoff status uses a launch-facing handoff label');
  assertNoNativeBrowserDialogs(codeAdminPage, 'PMS code admin');
  assertIncludes(codeAdminPage, 'useConfirmStore', 'PMS code admin uses the shared confirm dialog for destructive actions');
  assertIncludes(codeAdminPage, 'toast.error', 'PMS code admin surfaces mutation errors through the shared toast');
  assertNoNativeBrowserDialogs(menuAdminPage, 'PMS menu admin');
  assertIncludes(menuAdminPage, 'useConfirmStore', 'PMS menu admin uses the shared confirm dialog for destructive actions');
  assertIncludes(menuAdminPage, 'toast.error', 'PMS menu admin surfaces mutation errors through the shared toast');
  assertNoNativeBrowserDialogs(masterPage, 'PMS master data admin');
  assertIncludes(masterPage, 'useConfirmStore', 'PMS master data admin uses the shared confirm dialog for destructive actions');
  assertIncludes(masterPage, 'toast.error', 'PMS master data admin surfaces mutation errors through the shared toast');
  assertNoNativeBrowserDialogs(templateAdminPage, 'PMS template admin');
  assertIncludes(templateAdminPage, 'toast.warning', 'PMS template admin surfaces validation failures through the shared toast');
  assertIncludes(templateAdminPage, 'toast.error', 'PMS template admin surfaces mutation errors through the shared toast');
  assertNotIncludes(requestListPage, "alert('선택된 항목을 삭제합니다.')", 'PMS request list must not expose a fake delete action');
  assertNotIncludes(proposalListPage, "alert('선택된 항목을 삭제합니다.')", 'PMS proposal list must not expose a fake delete action');
  assertNotIncludes(executionListPage, "alert('선택된 항목을 삭제합니다.')", 'PMS execution list must not expose a fake delete action');
  assertNotIncludes(transitionListPage, "alert('선택된 항목을 삭제합니다.')", 'PMS transition list must not expose a fake delete action');
  assertIncludes(seedInstaller, '19_pms_asset_master.sql', 'seed installer applies PMS execution asset master seed');
  assertIncludes(seedInstaller, '21_demo_project_statuses.sql', 'seed installer applies PMS demo project status detail seed');
  assertIncludes(seedHarness, '19_pms_asset_master.sql', 'db-seed harness applies PMS execution asset master seed');
  assertIncludes(seedHarness, '21_demo_project_statuses.sql', 'db-seed harness applies PMS demo project status detail seed');
  assertIncludes(dbInitEntrypoint, '20260703093000_add_pms_asset_master', 'db-init applies PMS asset master baseline migration before optional db push');
  assertIncludes(dbInitEntrypoint, '20260703133000_add_pms_master_import_profiles', 'db-init applies PMS shared import profile baseline migration before optional db push');
  assertIncludes(dbInitEntrypoint, '20260706143000_add_pms_reconciliation_foundation', 'db-init applies PMS reconciliation foundation baseline migration before optional db push');
  assertIncludes(dbInitEntrypoint, 'PROTECTED_BASELINE_MIGRATIONS', 'db-init protects formal baseline migrations when prisma db push is skipped');
  assertIncludes(assetMasterSeed, 'pms.pr_site_m', 'asset master seed creates plant/site rows');
  assertIncludes(assetMasterSeed, 'pms.pr_system_catalog_m', 'asset master seed creates system catalog rows');
  assertIncludes(assetMasterSeed, 'pms.pr_system_instance_m', 'asset master seed creates system instance rows');
  assertIncludes(assetMasterSeed, 'pms.pr_integration_m', 'asset master seed creates integration rows');
  assertIncludes(assetMasterSeed, 'plant_id = case project_id', 'asset master seed links demo projects to plant/site anchors');
  assertIncludes(assetMasterSeed, 'system_instance_id = case project_id', 'asset master seed links demo projects to system instance anchors');
  assertIncludes(projectStatusSeed, 'pms.pr_project_status_m', 'PMS demo project status seed creates status detail rows');
  assertIncludes(projectStatusSeed, 'demo_project_status_baseline', 'PMS demo project status seed uses a stable last_activity marker');
  assertIncludes(projectStatusSeed, 'on conflict (project_id, status_code) do update', 'PMS demo project status seed is idempotent');
  assertIncludes(roleMenuSeed, "WHERE menu_id IN (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'dashboard')", 'role menu seed removes dashboard/sidebar grants');
  assertIncludes(projectMemberCodeSeed, "('PROJECT_MEMBER_ROLE','pm'", 'seed provides project manager role code');
  assertIncludes(projectMemberCodeSeed, "('PROJECT_MEMBER_ROLE','developer'", 'seed provides developer role code');
  assertIncludes(projectController, '@Get(":id/access")', 'server exposes project access snapshot endpoint');
  assertIncludes(projectController, '@Get(":id/dashboard/summary")', 'server exposes project control dashboard summary endpoint');
  assertIncludes(projectController, '@Get(":id/transition-readiness")', 'server exposes transition readiness endpoint');
  assertIncludes(projectController, '@Post(":id/advance-stage")', 'server exposes stage advance endpoint');
  assertIncludes(projectController, '@Get(":id/handoffs")', 'server exposes handoff foundation endpoint');
  assertIncludes(projectController, '@Get(":id/contracts")', 'server exposes contract foundation endpoint');
  assertIncludes(projectController, '@Get(":id/contracts/:contractId/payments")', 'server exposes contract payment foundation endpoint');
  assertIncludesAll(
    projectService,
    [
      'resolveCreateAssetAnchors',
      'resolveUpdateAssetAnchors',
      'plantId: assetAnchors.plantId',
      'systemInstanceId: assetAnchors.systemInstanceId',
      'systemInstanceId belongs to a different plantId',
      'attachProjectExecutionAssetAnchors',
      'plantSiteCode: site?.siteCode ?? null',
      'systemInstanceCode: instance?.instanceCode ?? null',
    ],
    'PMS project service validates, stores, and exposes execution asset master anchors',
  );
  assertIncludesAll(
    projectService,
    [
      'getDashboardSummary(projectId: bigint)',
      'crm_contract_snapshot',
      'boundaryNote',
      'openLaunchFeedbackCount',
      'checkTransitionReadiness(projectId)',
    ],
    'PMS project service builds a launch-facing project dashboard summary without taking CRM ledger ownership',
  );
  assertIncludesAll(
    projectApi,
    [
      'getAccess',
      'getDashboardSummary',
      '/dashboard/summary',
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
      'getHandoffs',
      'createHandoff',
      'updateHandoff',
      'getContracts',
      'plantId?: string',
      'systemInstanceId?: string',
      'plantSiteCode?: string | null',
      'systemInstanceCode?: string | null',
    ],
    'PMS project API client covers access, dashboard, readiness, planning, control, output, handoff, contract snapshot, and relation surfaces',
  );
  assertIncludes(projectApi, 'completed: number; approved: number; pending: number', 'PMS project API client exposes completed deliverable readiness count');
  assertIncludesAll(
    requestCreatePage,
    [
      'usePlantSites',
      'useSystemInstances',
      'name="plantId"',
      'name="systemInstanceId"',
      'plantId: data.plantId || undefined',
      'systemInstanceId: data.systemInstanceId || undefined',
    ],
    'PMS request create screen lets users select plant/site and system instance anchors',
  );
  assertIncludesAll(
    basicInfoSection,
    [
      'usePlantSites',
      'useSystemInstances',
      '플랜트/사이트',
      '시스템 인스턴스',
      'formatProjectPlantSiteLabel',
      'formatProjectSystemInstanceLabel',
      'plantId: data.plantId || null',
      'systemInstanceId: data.systemInstanceId || null',
    ],
    'PMS project basic info screen lets users view and edit execution asset anchors',
  );
  assertIncludes(projectDto, 'plantSiteCode?: string | null', 'PMS project DTO exposes plant/site code metadata');
  assertIncludes(projectDto, 'systemInstanceCode?: string | null', 'PMS project DTO exposes system instance code metadata');
  assertIncludes(projectTypes, 'plantSiteCode?: string | null', 'shared PMS project type exposes plant/site code metadata');
  assertIncludes(projectTypes, 'systemInstanceCode?: string | null', 'shared PMS project type exposes system instance code metadata');
  assertIncludes(projectTypes, 'ProjectDashboardSummary', 'shared PMS project type defines project dashboard summary contract');
  assertIncludes(projectTypes, "source: 'crm_contract_snapshot'", 'shared PMS project dashboard type keeps CRM contract snapshot ownership explicit');
  assertIncludes(pmsTypeIndex, 'ProjectDashboardSummary', 'PMS type index exports project dashboard summary contract');
  assertIncludes(rootTypesIndex, 'ProjectDashboardSummary', 'root type index exports project dashboard summary contract for server imports');
  assertIncludes(projectDisplay, 'formatProjectExecutionAssetLabel', 'PMS web has a shared execution asset label formatter');
  assertIncludes(requestListPage, 'formatProjectExecutionAssetLabel', 'request list shows plant/site and system instance metadata');
  assertIncludes(proposalListPage, 'formatProjectExecutionAssetLabel', 'proposal list shows plant/site and system instance metadata');
  assertIncludes(executionListPage, 'formatProjectExecutionAssetLabel', 'execution list shows plant/site and system instance metadata');
  assertIncludes(transitionListPage, 'formatProjectExecutionAssetLabel', 'transition list shows plant/site and system instance metadata');
  assertIncludes(workQueuePages, 'formatProjectExecutionAssetLabel', 'work queue cards show plant/site and system instance metadata');
  assertIncludesAll(
    projectQueries,
    [
      'useProjectAccess',
      'projectDashboardKeys',
      'useProjectDashboardSummary',
      'invalidateProjectDashboard',
      'useTransitionReadiness',
      'useProjectOrgs',
      'useProjectRelations',
      'useProjectRequirements',
      'useProjectRisks',
      'useProjectChangeRequests',
      'useProjectEvents',
      'useProjectControlIssues',
      'useProjectHandoffs',
      'useCreateProjectHandoff',
      'useUpdateProjectHandoff',
      'useProjectContracts',
    ],
    'PMS query hooks cover access, readiness, relation, control, handoff, and contract snapshot surfaces',
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
      '68_pr_site_h_trigger.sql',
      '69_pr_system_catalog_h_trigger.sql',
      '70_pr_system_instance_h_trigger.sql',
      '71_pr_integration_h_trigger.sql',
      '72_pr_master_import_profile_h_trigger.sql',
    ],
    'PMS trigger installer covers handoff, contract, planning, relation, control, asset master, and import profile history triggers',
  );
  assertIncludesAll(
    triggerScript,
    [
      '68_pr_site_h_trigger.sql',
      '69_pr_system_catalog_h_trigger.sql',
      '70_pr_system_instance_h_trigger.sql',
      '71_pr_integration_h_trigger.sql',
      '72_pr_master_import_profile_h_trigger.sql',
    ],
    'PMS apply-triggers script covers asset master and import profile history triggers',
  );
  assertIncludes(packageJson, 'verify:pms-launch', 'root package exposes PMS launch verification script');
  assertIncludes(packageJson, 'verify:pms-ai-rag-runtime', 'root package exposes PMS AI/RAG runtime evidence script');
  assertIncludes(packageJson, 'verify:pms-ai-rag-runtime-report', 'root package exposes PMS AI/RAG provider-ready report verifier script');
  assertIncludes(packageJson, 'verify:pms-ai-rag-runtime-report:template', 'root package exposes PMS AI/RAG provider-ready report template script');
  assertIncludes(packageJson, 'verify:pms-ai-rag-runtime-report:self-test', 'root package exposes PMS AI/RAG provider-ready report verifier self-test script');
  assertIncludes(packageJson, 'record:pms-ai-rag-provider-ready-evidence', 'root package exposes PMS AI/RAG provider-ready evidence recorder');
  assertIncludes(packageJson, 'verify:pms-ai-rag-evidence-recorder', 'root package exposes PMS AI/RAG provider-ready evidence recorder self-test');
  assertIncludes(packageJson, 'complete:pms-ai-rag-provider-ready', 'root package exposes PMS AI/RAG provider-ready completion runner');
  assertIncludes(packageJson, 'complete:pms-ai-rag-provider-ready:self-test', 'root package exposes PMS AI/RAG provider-ready completion runner self-test');
  assertIncludes(packageJson, 'prepare:pms-ai-rag-provider-ready-bundle', 'root package exposes PMS AI/RAG provider-ready evidence bundle preparer');
  assertIncludes(packageJson, 'prepare:pms-ai-rag-provider-ready-bundle:self-test', 'root package exposes PMS AI/RAG provider-ready evidence bundle preparer self-test');
  assertIncludes(packageJson, 'verify:pms-ai-rag-provider-ready-bundle', 'root package exposes PMS AI/RAG provider-ready evidence bundle verifier');
  assertIncludes(packageJson, 'verify:pms-ai-rag-provider-ready-bundle:self-test', 'root package exposes PMS AI/RAG provider-ready evidence bundle verifier self-test');
  assertIncludes(packageJson, 'verify:pms-launch-host', 'root package exposes PMS launch host readiness verification script');
  assertIncludes(packageJson, 'verify:pms-launch-host:self-test', 'root package exposes PMS launch host readiness verifier self-test');
  assertIncludes(pmsLaunchHostVerifier, 'PMS_LAUNCH_MIN_DOCKER_FREE_GB', 'PMS launch host verifier supports a configurable Docker rebuild free-space threshold');
  assertIncludes(pmsLaunchHostVerifier, '/mnt/c', 'PMS launch host verifier checks the Windows host drive mount when present');
  assertIncludes(pmsLaunchHostVerifier, '/Docker/host', 'PMS launch host verifier checks the Docker host mount when present');
  assertIncludes(pmsLaunchHostVerifier, 'statfsSync', 'PMS launch host verifier measures host free space directly');
  assertIncludes(pmsLaunchHostVerifier, 'docker compose version', 'PMS launch host verifier checks Docker Compose availability');
  assertIncludes(pmsLaunchHostVerifier, 'PMS_DOCKER_CONFIG', 'PMS launch host verifier can use the no-credentials Docker config path');
  assertIncludes(pmsLaunchHostVerifier, '--self-test', 'PMS launch host verifier exposes deterministic self-tests');
  assertIncludes(verifier, 'loginForRuntimeSmoke', 'PMS launch verifier authenticates before runtime API smoke');
  assertIncludes(verifier, 'verifyPmsAiIndexSourceStatus', 'PMS launch verifier checks PMS AI index source status at runtime');
  assertIncludes(verifier, 'verifyGlobalLegacyIssueCleanupReadiness', 'PMS launch verifier checks global legacy Issue cleanup readiness at runtime');
  assertIncludes(verifier, 'verifyCloseoutApprovalRoutes', 'PMS launch verifier checks closeout approval route runtime behavior');
  assertIncludes(verifier, 'assetMasterMigration', 'PMS launch verifier checks formal asset master migration bundle');
  assertIncludes(verifier, 'importProfileMigration', 'PMS launch verifier checks formal import profile migration bundle');
  assertIncludes(verifier, 'reconciliationFoundationMigration', 'PMS launch verifier checks reconciliation foundation migration bundle');
  assertIncludes(verifier, '20260703093000_add_pms_asset_master', 'PMS launch verifier checks protected asset master migration installer coverage');
  assertIncludes(verifier, '20260703133000_add_pms_master_import_profiles', 'PMS launch verifier checks protected import profile migration installer coverage');
  assertIncludes(verifier, '20260706143000_add_pms_reconciliation_foundation', 'PMS launch verifier checks protected reconciliation foundation migration installer coverage');
  assertIncludes(verifier, '/projects/${projectId}/tasks', 'PMS launch verifier checks project tasks at runtime');
  assertIncludes(verifier, '/projects/${projectId}/members/lookup', 'PMS launch verifier checks member user lookup at runtime');
  assertIncludes(verifier, '/projects?search=${encodeURIComponent(projectSearchTerm)}&limit=20', 'PMS launch verifier checks project search lookup at runtime');
  assertIncludes(verifier, '/projects/${projectId}/deliverables', 'PMS launch verifier checks deliverables at runtime');
  assertIncludes(verifier, '/projects/${projectId}/close-conditions', 'PMS launch verifier checks close conditions at runtime');
  assertIncludes(verifier, '/projects/${projectId}/contracts', 'PMS launch verifier checks contract snapshot at runtime');
  assertIncludes(verifier, '/projects/${projectId}/dashboard/summary', 'PMS launch verifier checks project dashboard summary at runtime');
  assertIncludes(verifier, 'verifyCrmContractHandoffSnapshotRuntime', 'PMS launch verifier checks CRM handoff preview snapshot acceptance at runtime');
  assertIncludes(verifier, '/crm/contracts?status=all&sort=updated-desc', 'PMS launch verifier reads CRM contract candidates at runtime');
  assertIncludes(verifier, '/pms-handoff-preview', 'PMS launch verifier reads CRM handoff previews at runtime');
  assertIncludes(verifier, 'verifyMasterImport', 'PMS launch verifier checks master import and merge at runtime');
  assertIncludes(verifier, 'verifyMasterImportProfiles', 'PMS launch verifier checks shared import mapping profiles at runtime');
  assertIncludes(verifier, 'verifyTemplateGroupAdminWorkflow', 'PMS launch verifier checks template group admin workflow at runtime');
  assertIncludes(verifier, 'verifyDeliverableCompletionVocabulary', 'PMS launch verifier checks deliverable completion vocabulary at runtime');
  assertIncludes(verifier, "submissionStatusCode: 'confirmed'", 'PMS launch verifier checks confirmed deliverables at runtime');
  assertIncludes(verifier, '/pms/template-groups/deliverables', 'PMS launch verifier checks deliverable template admin endpoints at runtime');
  assertIncludes(verifier, '/pms/template-groups/close-conditions', 'PMS launch verifier checks close-condition template admin endpoints at runtime');
  assertIncludes(verifier, 'verifyHomeReviewFeedbackAction', 'PMS launch verifier checks home review feedback action at runtime');
  assertIncludes(verifier, 'verifyHomeReviewFeedbackVisibility', 'PMS launch verifier checks saved review feedback appears on home at runtime');
  assertIncludes(verifier, 'verifyReviewFeedbackCapture', 'PMS launch verifier checks review feedback capture at runtime');
  assertIncludes(verifier, 'verifyPmrPrrWorkflowStatusPolicy', 'PMS launch verifier checks PMR/PRR workflow transition policy at runtime');
  assertIncludes(verifier, 'PMR/PRR workflow rejects approval by non-approver', 'PMS launch verifier checks PMR/PRR non-approver approval rejection at runtime');
  assertIncludes(verifier, 'PMR/PRR due workflow rollover smoke', 'PMS launch verifier checks overdue PMR/PRR workflow rollover at runtime');
  assertIncludes(verifier, 'PMR/PRR rollover stores overdue workflow as approval requested', 'PMS launch verifier checks rollover status transition at runtime');
  assertIncludes(verifier, 'verifyProjectCustomerOrganizationAnchorLifecycle', 'PMS launch verifier checks project customer common organization anchors at runtime');
  assertIncludes(verifier, 'project contract snapshot fixture setup', 'PMS launch verifier can prepare a runtime contract snapshot fixture');
  assertIncludes(pmsAiIndexAdapter, 'formatUserLabel', 'PMS AI/RAG projection formats users with human-readable labels in body text');
  assertIncludes(pmsAiIndexAdapter, 'formatOrganizationLabel', 'PMS AI/RAG projection formats organizations with human-readable labels in body text');
  assertNotIncludes(pmsAiIndexAdapter, "'Customer id'", 'PMS AI/RAG projection body text must not expose raw customer ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Plant id'", 'PMS AI/RAG projection body text must not expose raw plant ids');
  assertNotIncludes(pmsAiIndexAdapter, "'System instance id'", 'PMS AI/RAG projection body text must not expose raw system instance ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Assignee user id'", 'PMS AI/RAG projection body text must not expose raw assignee user ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Organization id'", 'PMS AI/RAG projection body text must not expose raw organization ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Project owner user id'", 'PMS AI/RAG projection body text must not expose raw project owner user ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Project owner organization id'", 'PMS AI/RAG projection body text must not expose raw owner organization ids');
  assertNotIncludes(pmsAiIndexAdapter, "'Status owner user id'", 'PMS AI/RAG projection body text must not expose raw status owner user ids');
  assertIncludes(pmsAiRagVerifier, '/projects/ai-index/backfill', 'PMS AI/RAG verifier queues project backfill jobs');
  assertIncludes(pmsAiRagVerifier, '/tasks/ai-index/backfill', 'PMS AI/RAG verifier queues task backfill jobs');
  assertIncludes(pmsAiRagVerifier, "entityTypes: ['project']", 'PMS AI/RAG verifier checks project retrieval');
  assertIncludes(pmsAiRagVerifier, "entityTypes: ['task']", 'PMS AI/RAG verifier checks task retrieval');
  assertIncludes(pmsAiRagVerifier, "entityTypes: ['projectMember']", 'PMS AI/RAG verifier checks project member retrieval');
  assertIncludes(pmsAiRagVerifier, "entityTypes: ['projectStatus']", 'PMS AI/RAG verifier checks project status retrieval');
  assertIncludes(pmsAiRagVerifier, "entityType: 'projectMember'", 'PMS AI/RAG verifier queues project member AI jobs');
  assertIncludes(pmsAiRagVerifier, "entityType: 'projectStatus'", 'PMS AI/RAG verifier queues project status AI jobs');
  assertIncludes(pmsAiRagVerifier, 'common.cm_ai_object_m', 'PMS AI/RAG verifier checks common AI object rows');
  assertIncludes(pmsAiRagVerifier, 'common.cm_ai_acl_snapshot_m', 'PMS AI/RAG verifier checks common AI ACL snapshots');
  assertIncludes(pmsAiRagVerifier, 'common.cm_ai_embedding_m', 'PMS AI/RAG verifier checks provider-ready embeddings');
  assertIncludes(pmsAiRagVerifier, 'summaryPath', 'PMS AI/RAG verifier can write a human-readable evidence summary');
  assertIncludes(pmsAiRagVerifier, 'Provider-unavailable mode passed', 'PMS AI/RAG verifier summary distinguishes fallback proof from provider-ready proof');
  assertIncludes(pmsAiRagReportVerifier, 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', 'PMS AI/RAG provider-ready report verifier accepts the canonical report path env var');
  assertIncludes(pmsAiRagReportVerifier, '--template', 'PMS AI/RAG provider-ready report verifier exposes a fill-in template');
  assertIncludes(pmsAiRagReportVerifier, 'providerMode', 'PMS AI/RAG provider-ready report verifier checks provider mode');
  assertIncludes(pmsAiRagReportVerifier, "['project', 'task', 'projectMember', 'projectStatus']", 'PMS AI/RAG provider-ready report verifier covers project/task/member/status evidence');
  assertIncludes(pmsAiRagReportVerifier, 'retrievalLogId', 'PMS AI/RAG provider-ready report verifier checks retrieval audit ids');
  assertIncludes(pmsAiRagReportVerifier, 'embeddingCount', 'PMS AI/RAG provider-ready report verifier checks provider-ready embeddings');
  assertIncludes(pmsAiRagReportVerifier, 'PMS AI/RAG Provider-Ready Runtime Evidence', 'PMS AI/RAG provider-ready report verifier writes a human-readable summary');
  assertIncludes(pmsAiRagCompletionRunner, 'verify:pms-ai-rag-runtime:ready-precheck', 'PMS AI/RAG provider-ready completion runner starts with env precheck');
  assertIncludes(pmsAiRagCompletionRunner, 'verify:pms-ai-rag-runtime:ready', 'PMS AI/RAG provider-ready completion runner executes live runtime evidence');
  assertIncludes(pmsAiRagCompletionRunner, 'verify:pms-ai-rag-runtime-report', 'PMS AI/RAG provider-ready completion runner verifies the generated report');
  assertIncludes(pmsAiRagCompletionRunner, 'record:pms-ai-rag-provider-ready-evidence', 'PMS AI/RAG provider-ready completion runner records verified evidence');
  assertIncludes(pmsAiRagCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', 'PMS AI/RAG provider-ready completion runner sets canonical report path env');
  assertIncludes(pmsAiRagCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', 'PMS AI/RAG provider-ready completion runner sets canonical summary path env');
  assertIncludes(pmsAiRagCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'PMS AI/RAG provider-ready completion runner sets canonical evidence block path env');
  assertIncludes(pmsAiRagCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', 'PMS AI/RAG provider-ready completion runner supports backlog evidence doc targets');
  assertIncludes(pmsAiRagCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', 'PMS AI/RAG provider-ready completion runner supports close brief evidence doc targets');
  assertIncludes(pmsAiRagCompletionRunner, '--dry-run', 'PMS AI/RAG provider-ready completion runner supports non-mutating evidence dry-run');
  assertIncludes(pmsAiRagCompletionRunner, '--docker-runtime', 'PMS AI/RAG provider-ready completion runner can manage Docker runtime on verification hosts');
  assertIncludes(pmsAiRagCompletionRunner, '--env-file', 'PMS AI/RAG provider-ready completion runner can load provider-ready env files');
  assertIncludes(pmsAiRagEvidenceRecorder, 'verify-pms-ai-rag-runtime-report.mjs', 'PMS AI/RAG provider-ready evidence recorder verifies the PMS report before recording');
  assertIncludes(pmsAiRagEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'PMS AI/RAG provider-ready evidence recorder supports an evidence block artifact path');
  assertIncludes(pmsAiRagEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', 'PMS AI/RAG provider-ready evidence recorder can update backlog evidence blocks');
  assertIncludes(pmsAiRagEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', 'PMS AI/RAG provider-ready evidence recorder can update current close brief evidence blocks');
  assertIncludes(pmsAiRagEvidenceRecorder, '--dry-run', 'PMS AI/RAG provider-ready evidence recorder supports dry-run recording');
  assertIncludes(pmsAiRagEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START', 'PMS AI/RAG provider-ready evidence recorder uses stable docs markers');
  assertIncludes(pmsAiRagEvidenceRecorder, 'Report SHA256', 'PMS AI/RAG provider-ready evidence recorder binds recorded docs to the JSON digest');
  assertIncludes(pmsAiRagEvidenceRecorder, 'Summary SHA256', 'PMS AI/RAG provider-ready evidence recorder binds recorded docs to the summary digest');
  assertIncludes(pmsAiRagBundlePreparer, 'PMS AI/RAG Provider-Ready Evidence Bundle', 'PMS AI/RAG provider-ready bundle preparer writes an operator handoff README');
  assertIncludes(pmsAiRagBundlePreparer, 'pms-ai-rag-provider-ready-required-inputs.json', 'PMS AI/RAG provider-ready bundle preparer writes a required-input request packet');
  assertIncludes(pmsAiRagBundlePreparer, 'AZURE_OPENAI_ENDPOINT=', 'PMS AI/RAG provider-ready bundle preparer captures Azure endpoint input');
  assertIncludes(pmsAiRagBundlePreparer, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=', 'PMS AI/RAG provider-ready bundle preparer captures Azure embedding deployment input');
  assertIncludes(pmsAiRagBundlePreparer, 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH=', 'PMS AI/RAG provider-ready bundle preparer captures canonical report path');
  assertIncludes(pmsAiRagBundlePreparer, 'complete:pms-ai-rag-provider-ready', 'PMS AI/RAG provider-ready bundle preparer points operators at the completion runner');
  assertIncludes(pmsAiRagBundlePreparer, 'assertReportTemplateDoesNotPass', 'PMS AI/RAG provider-ready bundle preparer prevents draft templates from passing as evidence');
  assertIncludes(pmsAiRagBundleVerifier, 'validateReport(report)', 'PMS AI/RAG provider-ready bundle verifier validates the final PMS report shape');
  assertIncludes(pmsAiRagBundleVerifier, 'Draft placeholder', 'PMS AI/RAG provider-ready bundle verifier rejects placeholder summaries');
  assertIncludes(pmsAiRagBundleVerifier, 'pms-ai-rag-provider-ready-runtime-report', 'PMS AI/RAG provider-ready bundle verifier checks the runtime report artifact');
  assertIncludes(pmsAiRagBundleVerifier, 'complete:pms-ai-rag-provider-ready', 'PMS AI/RAG provider-ready bundle verifier preserves the completion runner contract');
  assertIncludes(pmsAiRagBundleVerifier, 'expected self-test draft bundle to fail', 'PMS AI/RAG provider-ready bundle verifier self-test proves draft evidence cannot pass');
  for (const [content, label] of [
    [pmsRoadmap, 'PMS roadmap'],
    [pmsBacklog, 'PMS backlog'],
    [pmsCloseBrief, 'PMS baseline close brief'],
  ]) {
    assertIncludes(content, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START', `${label} contains the PMS provider-ready evidence marker`);
    assertIncludes(content, 'Provider-ready evidence status:', `${label} exposes PMS provider-ready evidence status`);
  }
  assertIncludes(pmsBacklog, 'LAUNCH-HOST-01', 'PMS backlog records the Docker host preflight item');
  assertIncludes(pmsRoadmap, 'verify:pms-launch-host', 'PMS roadmap points launch operators at the host readiness preflight');
  assertIncludes(pmsCloseBrief, 'verify:pms-launch-host', 'PMS close brief records the launch host readiness preflight');
  assertIncludes(pmsBacklog, 'EFFORT-02', 'PMS backlog records the daily task effort log completion item');
  assertIncludes(pmsRoadmap, '일일 공수 기록', 'PMS roadmap records the daily task effort log launch surface');
  assertIncludes(pmsCloseBrief, '일일 공수 기록', 'PMS close brief records daily task effort log launch coverage');
}

async function verifyRuntime() {
  const health = await fetchRaw(`${config.apiBaseUrl}/health`);
  if (health.status < 200 || health.status >= 300) {
    throw new Error(`server health failed: HTTP ${health.status}`);
  }

  const web = await fetchRaw(config.webBaseUrl);
  if (web.status < 200 || web.status >= 400) {
    throw new Error(`PMS web failed: HTTP ${web.status}`);
  }

  const accessToken = await loginForRuntimeSmoke();
  const currentUser = await getRuntimeCurrentUser(accessToken);
  const roleCodes = await assertArrayEndpoint('/codes?codeGroup=PROJECT_MEMBER_ROLE', accessToken, 'project member role code runtime smoke');
  assertActiveCode(roleCodes, 'PROJECT_MEMBER_ROLE', 'pm', 'project member role code runtime smoke includes PM role');
  assertActiveCode(roleCodes, 'PROJECT_MEMBER_ROLE', 'developer', 'project member role code runtime smoke includes developer role');
  await verifyPmsAiIndexSourceStatus(accessToken);
  await verifyPmsErrorCodeContract(accessToken);
  await verifyHomeReviewFeedbackAction(accessToken);
  const customerLookup = await apiJson('/customers?limit=20', {
    accessToken,
    label: 'PMS customer common organization anchor runtime smoke',
  });
  if (!Array.isArray(customerLookup.data)) {
    throw new Error('PMS readiness runtime check failed: customer lookup did not return a paginated data array');
  }
  if (customerLookup.data.length === 0) {
    throw new Error('PMS runtime smoke requires seeded customer lookup rows');
  }
  const anchoredCustomer = customerLookup.data.find((customer) => (
    customer && typeof customer === 'object' && Boolean(customer.organizationId)
  ));
  if (!anchoredCustomer) {
    throw new Error('PMS runtime smoke requires at least one customer row bridged to a common organization anchor');
  }
  assertTruthy(anchoredCustomer.customerCode, 'PMS customer organization anchor exposes customer code');
  assertTruthy(anchoredCustomer.organizationCode, 'PMS customer organization anchor exposes organization code');
  if (!config.runtimeReadonly) {
    await verifyProjectCustomerOrganizationAnchorLifecycle(accessToken, anchoredCustomer);
  }

  const masterSummary = await apiJson('/master/summary', {
    accessToken,
    label: 'PMS master summary runtime smoke',
  });
  assertObject(masterSummary.data, 'PMS master summary runtime smoke');
  assertAtLeast(masterSummary.data.sites, 1, 'PMS master summary includes plant/site count');
  assertAtLeast(masterSummary.data.systemCatalogs, 1, 'PMS master summary includes system catalog count');
  assertAtLeast(masterSummary.data.systemInstances, 1, 'PMS master summary includes system instance count');
  assertAtLeast(masterSummary.data.integrations, 1, 'PMS master summary includes integration count');
  const masterSites = await assertArrayEndpoint('/master/sites?limit=20', accessToken, 'PMS plant/site master runtime smoke');
  const masterCatalogs = await assertArrayEndpoint('/master/system-catalogs?limit=20', accessToken, 'PMS system catalog master runtime smoke');
  const masterInstances = await assertArrayEndpoint('/master/system-instances?limit=20', accessToken, 'PMS system instance master runtime smoke');
  const masterIntegrations = await assertArrayEndpoint('/master/integrations?limit=20', accessToken, 'PMS integration master runtime smoke');
  if (masterSites.length === 0 || masterCatalogs.length === 0 || masterInstances.length === 0 || masterIntegrations.length === 0) {
    throw new Error('PMS runtime smoke requires seeded execution asset master rows');
  }
  if (!config.runtimeReadonly) {
    await verifyMasterImport(accessToken);
    await verifyMasterImportProfiles(accessToken);
    await verifyMasterCrud(accessToken);
    await verifyProjectAssetAnchorLifecycle(accessToken, masterSites, masterInstances);
  }

  const project = await resolveRuntimeProject(accessToken);
  const projectId = String(project.id);
  await verifyProjectLookupSearch(project, accessToken);
  const organizationLookup = await apiJson(
    `/projects/${projectId}/organizations/lookup?search=${encodeURIComponent(anchoredCustomer.organizationCode)}&scope=external&limit=20`,
    {
      accessToken,
      label: 'PMS project common organization lookup runtime smoke',
    },
  );
  if (!Array.isArray(organizationLookup.data)) {
    throw new Error('PMS readiness runtime check failed: project organization lookup did not return an array');
  }
  const lookupOrganization = organizationLookup.data.find((organization) => (
    organization
      && typeof organization === 'object'
      && String(organization.organizationCode) === String(anchoredCustomer.organizationCode)
  ));
  if (!lookupOrganization) {
    throw new Error('PMS runtime smoke requires project organization lookup to find the anchored customer common organization');
  }
  assertEquals(
    lookupOrganization.organizationScope,
    'external',
    'PMS project organization lookup returns external common organization candidates',
  );

  const detail = await apiJson(`/projects/${projectId}`, {
    accessToken,
    label: 'authenticated project detail runtime smoke',
  });
  assertObject(detail.data, 'authenticated project detail runtime smoke');
  assertTruthy(detail.data.projectName, 'authenticated project detail exposes projectName');

  const access = await apiJson(`/projects/${projectId}/access`, {
    accessToken,
    label: 'project access snapshot runtime smoke',
  });
  assertObject(access.data, 'project access snapshot runtime smoke');
  assertObject(access.data.features, 'project access snapshot exposes features');
  assertEquals(access.data.features.canViewProject, true, 'project access allows authenticated project view');
  assertEquals(access.data.features.canManageMembers, true, 'project access allows member user lookup for launch smoke user');
  if (!config.runtimeReadonly) {
    assertEquals(access.data.features.canManageTasks, true, 'project access allows task effort log writes for launch smoke user');
    assertEquals(access.data.features.canManageIssues, true, 'project access allows feedback capture for launch smoke user');
    assertEquals(access.data.features.canManageDeliverables, true, 'project access allows deliverable template application for launch smoke user');
    assertEquals(access.data.features.canManageCloseConditions, true, 'project access allows close-condition template application for launch smoke user');
    await verifyLegacyIssueRetirement(projectId, accessToken);
    await verifyProjectCloseoutTemplateApply(projectId, String(detail.data.statusCode), accessToken);
  }
  await verifyGlobalLegacyIssueCleanupReadiness(accessToken);

  const memberUserLookup = await assertArrayEndpoint(
    `/projects/${projectId}/members/lookup?limit=20`,
    accessToken,
    'project member common user lookup runtime smoke',
  );
  if (memberUserLookup.length === 0) {
    throw new Error('PMS runtime smoke requires at least one active common user for project member lookup');
  }
  const lookupUser = memberUserLookup.find((user) => user?.userId && user?.userName);
  assertTruthy(lookupUser, 'project member common user lookup returns user id and name');
  assertTruthy(
    lookupUser.loginId || lookupUser.email || lookupUser.primaryOrganizationId,
    'project member common user lookup returns login, email, or primary organization metadata',
  );
  if (!config.runtimeReadonly) {
    await verifyCloseoutApprovalRoutes(projectId, String(detail.data.statusCode), accessToken, currentUser);
  }
  const alternateApprover = memberUserLookup.find((user) => (
    user?.userId && String(user.userId) !== String(currentUser.userId)
  ));
  assertTruthy(alternateApprover, 'PMR/PRR workflow runtime smoke requires a non-current approver candidate');

  const readiness = await apiJson(`/projects/${projectId}/transition-readiness`, {
    accessToken,
    label: 'transition readiness runtime smoke',
  });
  assertObject(readiness.data, 'transition readiness runtime smoke');
  assertType(readiness.data.canComplete, 'boolean', 'transition readiness exposes canComplete');
  assertObject(readiness.data.deliverables, 'transition readiness exposes deliverable counts');
  assertObject(readiness.data.closeConditions, 'transition readiness exposes close-condition counts');

  await assertArrayEndpoint(`/projects/${projectId}/organizations`, accessToken, 'project organization rows runtime smoke');
  await assertArrayEndpoint(`/projects/${projectId}/relations`, accessToken, 'project relation rows runtime smoke');
  await assertArrayEndpoint(`/projects/${projectId}/objectives`, accessToken, 'project objectives runtime smoke');
  await assertArrayEndpoint(`/projects/${projectId}/wbs`, accessToken, 'project WBS runtime smoke');
  const tasks = await assertArrayEndpoint(`/projects/${projectId}/tasks`, accessToken, 'project tasks runtime smoke');
  if (tasks.length === 0) {
    throw new Error('PMS runtime smoke requires at least one task row for the selected project');
  }
  assertTruthy('estimatedHours' in tasks[0], 'project tasks runtime smoke exposes estimated effort field');
  assertTruthy('actualHours' in tasks[0], 'project tasks runtime smoke exposes actual effort field');
  const effortLogs = await assertArrayEndpoint(
    `/projects/${projectId}/tasks/effort-logs`,
    accessToken,
    'project task daily effort log runtime smoke',
  );
  if (effortLogs.length > 0) {
    assertTruthy(effortLogs[0].effortLogId, 'project task effort log runtime smoke exposes effortLogId');
    assertTruthy(effortLogs[0].taskId, 'project task effort log runtime smoke exposes taskId');
    assertTruthy(effortLogs[0].workDate, 'project task effort log runtime smoke exposes workDate');
    assertTruthy('actualHours' in effortLogs[0], 'project task effort log runtime smoke exposes actualHours');
  }
  if (!config.runtimeReadonly) {
    await verifyTaskEffortLogRuntime(projectId, tasks[0], effortLogs, accessToken);
  }
  await assertArrayEndpoint(`/projects/${projectId}/control/requirements`, accessToken, 'project requirements runtime smoke');
  await assertArrayEndpoint(`/projects/${projectId}/control/risks`, accessToken, 'project risks runtime smoke');
  await assertArrayEndpoint(`/projects/${projectId}/control/changes`, accessToken, 'project change requests runtime smoke');
  const events = await assertArrayEndpoint(`/projects/${projectId}/control/events`, accessToken, 'project events runtime smoke');
  if (events.length > 0) {
    assertObject(events[0].rollup, 'project events expose report/review rollup data');
    assertObject(events[0].rollup.readiness, 'project event rollup exposes readiness');
  }
  await assertArrayEndpoint(`/projects/${projectId}/control/issues`, accessToken, 'project canonical issues runtime smoke');
  const deliverables = await assertArrayEndpoint(`/projects/${projectId}/deliverables`, accessToken, 'project deliverables runtime smoke');
  if (deliverables.length === 0) {
    throw new Error('PMS runtime smoke requires at least one deliverable row for the selected project');
  }
  const closeConditions = await assertArrayEndpoint(`/projects/${projectId}/close-conditions`, accessToken, 'project close conditions runtime smoke');
  if (closeConditions.length === 0) {
    throw new Error('PMS runtime smoke requires at least one close-condition row for the selected project');
  }
  await assertArrayEndpoint(`/projects/${projectId}/handoffs`, accessToken, 'project handoff runtime smoke');

  let contracts = await assertArrayEndpoint(`/projects/${projectId}/contracts`, accessToken, 'project contract snapshot runtime smoke');
  if (contracts.length === 0 && !config.runtimeReadonly) {
    await prepareContractSnapshot(projectId, accessToken);
    contracts = await assertArrayEndpoint(`/projects/${projectId}/contracts`, accessToken, 'project contract snapshot runtime smoke after fixture setup');
  }
  if (contracts.length === 0) {
    throw new Error('PMS runtime smoke requires a readable contract snapshot for the selected project');
  }

  const primaryContract = contracts.find((contract) => contract?.isPrimary === true) ?? contracts[0];
  assertTruthy(primaryContract.contractId, 'project contract snapshot exposes contractId');
  if (!Array.isArray(primaryContract.payments)) {
    throw new Error('PMS readiness runtime check failed: project contract snapshot includes payment array');
  }

  const dashboardSummary = await apiJson(`/projects/${projectId}/dashboard/summary`, {
    accessToken,
    label: 'project dashboard summary runtime smoke',
  });
  assertObject(dashboardSummary.data, 'project dashboard summary runtime smoke');
  assertEquals(dashboardSummary.data.projectId, projectId, 'project dashboard summary is scoped to the selected project');
  assertObject(dashboardSummary.data.cost, 'project dashboard summary exposes cost snapshot');
  assertEquals(
    dashboardSummary.data.cost.source,
    'crm_contract_snapshot',
    'project dashboard summary keeps cost data scoped to CRM contract snapshots',
  );
  assertTruthy(
    String(dashboardSummary.data.cost.boundaryNote || '').includes('CRM'),
    'project dashboard summary exposes CRM/PMS boundary note',
  );
  assertObject(dashboardSummary.data.schedule, 'project dashboard summary exposes schedule summary');
  assertObject(dashboardSummary.data.performance, 'project dashboard summary exposes performance summary');
  assertObject(dashboardSummary.data.controls, 'project dashboard summary exposes control summary');
  assertObject(dashboardSummary.data.readiness, 'project dashboard summary exposes readiness summary');
  assertType(dashboardSummary.data.readiness.canCompleteCurrentStage, 'boolean', 'project dashboard readiness exposes completion verdict');
  assertAtLeast(dashboardSummary.data.cost.contractCount, 0, 'project dashboard cost exposes contract count');
  assertAtLeast(dashboardSummary.data.controls.openLaunchFeedbackCount, 0, 'project dashboard controls expose launch feedback count');

  if (!config.runtimeReadonly) {
    await verifyCrmContractHandoffSnapshotRuntime(projectId, accessToken);
    await verifyReviewFeedbackCapture(projectId, accessToken);
    await verifyPmrPrrWorkflowStatusPolicy(projectId, accessToken, {
      currentUserId: String(currentUser.userId),
      alternateApproverUserId: String(alternateApprover.userId),
    });
  }
}

async function verifyTaskEffortLogRuntime(projectId, task, baselineEffortLogs, accessToken) {
  const taskId = String(task.id);
  const originalActualHours = task.actualHours === null || task.actualHours === undefined
    ? null
    : Number(task.actualHours);
  const today = new Date().toISOString().slice(0, 10);
  let createdLogId = '';

  try {
    const created = await apiJson(`/projects/${projectId}/tasks/effort-logs`, {
      method: 'POST',
      accessToken,
      body: {
        taskId,
        workDate: today,
        actualHours: 0.5,
        workTypeCode: 'review',
        summary: 'PMS launch verification effort log',
      },
      label: 'project task daily effort log create runtime smoke',
    });
    assertObject(created.data, 'project task daily effort log create response');
    createdLogId = String(created.data.effortLogId || '');
    assertTruthy(createdLogId, 'project task daily effort log create returns effortLogId');
    assertEquals(String(created.data.taskId), taskId, 'project task daily effort log create stays scoped to the selected task');
    assertEquals(String(created.data.projectId), projectId, 'project task daily effort log create stays scoped to the selected project');
    assertEquals(Number(created.data.actualHours), 0.5, 'project task daily effort log create stores normalized actual hours');

    const logs = await assertArrayEndpoint(
      `/projects/${projectId}/tasks/effort-logs`,
      accessToken,
      'project task daily effort log read-after-write runtime smoke',
    );
    const createdLog = logs.find((log) => String(log.effortLogId) === createdLogId);
    assertTruthy(createdLog, 'project task daily effort log read-after-write returns created log');

    const refreshedTasks = await assertArrayEndpoint(
      `/projects/${projectId}/tasks`,
      accessToken,
      'project tasks runtime smoke after effort aggregation',
    );
    const refreshedTask = refreshedTasks.find((row) => String(row.id) === taskId);
    assertTruthy(refreshedTask, 'project tasks runtime smoke still returns the updated task');
    assertTruthy('actualHours' in refreshedTask, 'project tasks runtime smoke exposes aggregated actualHours after effort log write');
  } finally {
    if (createdLogId) {
      await deactivateIfPresent(
        `/projects/${projectId}/tasks/effort-logs/${createdLogId}`,
        accessToken,
        'project task daily effort log cleanup runtime smoke',
      );
    }
    if (baselineEffortLogs.length === 0) {
      await apiJson(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        accessToken,
        body: { actualHours: originalActualHours },
        label: 'project task actual effort restore after runtime smoke',
      });
    }
  }
}

async function loginForRuntimeSmoke() {
  const response = await apiJson('/auth/login', {
    method: 'POST',
    body: {
      loginId: config.loginId,
      password: config.password,
    },
    label: 'authenticated PMS runtime login',
  });
  assertObject(response.data, 'authenticated PMS runtime login response');
  assertTruthy(response.data.accessToken, 'authenticated PMS runtime login returns access token');
  return response.data.accessToken;
}

async function getRuntimeCurrentUser(accessToken) {
  const response = await apiJson('/auth/me', {
    method: 'POST',
    accessToken,
    label: 'PMS runtime current user smoke',
  });
  assertTruthy(response.data?.userId, 'PMS runtime current user exposes userId');
  return response.data;
}

async function resolveRuntimeProject(accessToken) {
  if (config.runtimeProjectId) {
    const selected = await apiJson(`/projects/${config.runtimeProjectId}`, {
      accessToken,
      label: 'configured project detail runtime smoke',
    });
    assertObject(selected.data, 'configured project detail runtime smoke');
    return selected.data;
  }

  const seeded = await tryApiJson('/projects/900001', {
    accessToken,
    label: 'seed project detail runtime smoke',
    allowFailure: true,
  });
  if (seeded?.data?.id) {
    return seeded.data;
  }

  const listed = await apiJson('/projects?limit=20', {
    accessToken,
    label: 'project list runtime smoke',
  });
  const projects = listed.data;
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('PMS runtime smoke requires at least one readable project');
  }
  return projects[0];
}

async function verifyProjectLookupSearch(project, accessToken) {
  const projectSearchTerm = String(project.projectName || project.id).slice(0, 24);
  const projectLookup = await apiJson(
    `/projects?search=${encodeURIComponent(projectSearchTerm)}&limit=20`,
    {
      accessToken,
      label: 'PMS project lookup search runtime smoke',
    },
  );
  if (!Array.isArray(projectLookup.data)) {
    throw new Error('PMS readiness runtime check failed: project lookup search did not return a paginated data array');
  }
  const matchedProject = projectLookup.data.find((item) => String(item?.id) === String(project.id));
  assertTruthy(matchedProject, 'PMS project lookup search can find the selected project by name');
}

async function verifyProjectCloseoutTemplateApply(projectId, statusCode, accessToken) {
  assertTruthy(statusCode, 'PMS closeout template runtime smoke requires a project status code');

  const deliverableTemplate = await apiJson(`/projects/${projectId}/deliverables/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode },
    label: 'PMS deliverable template apply runtime smoke',
  });
  assertObject(deliverableTemplate.data, 'PMS deliverable template apply response');
  assertEquals(deliverableTemplate.data.statusCode, statusCode, 'PMS deliverable template response keeps status code');
  assertTruthy(
    deliverableTemplate.data.source === 'group' || deliverableTemplate.data.source === 'default',
    'PMS deliverable template response identifies template source',
  );
  assertType(deliverableTemplate.data.createdCount, 'number', 'PMS deliverable template response exposes created count');
  assertType(deliverableTemplate.data.restoredCount, 'number', 'PMS deliverable template response exposes restored count');
  assertType(deliverableTemplate.data.keptCount, 'number', 'PMS deliverable template response exposes kept count');
  assertType(deliverableTemplate.data.deactivatedCount, 'number', 'PMS deliverable template response exposes replace deactivation count');
  assertArray(deliverableTemplate.data.items, 'PMS deliverable template response exposes applied rows');
  assertAtLeast(deliverableTemplate.data.items.length, 2, 'PMS deliverable template leaves enough active rows for replace policy smoke');
  const deliverableReplaceKeptCode = String(deliverableTemplate.data.items[0].deliverableCode);
  const deliverableReplaceDroppedCode = String(deliverableTemplate.data.items[1].deliverableCode);

  const deliverableGroupCode = `qa-${statusCode}-deliverable-${Date.now()}`;
  const deliverableGroup = await apiJson(`/projects/${projectId}/deliverables/templates`, {
    method: 'POST',
    accessToken,
    body: {
      groupCode: deliverableGroupCode,
      groupName: `QA 산출물 템플릿 ${statusCode}`,
      description: 'verify:pms-launch runtime smoke',
      items: deliverableTemplate.data.items.slice(0, 1).map((item, index) => ({
        deliverableCode: String(item.deliverableCode),
        deliverableName: String(item.deliverable?.deliverableName ?? item.deliverableName ?? item.deliverableCode),
        description: item.deliverable?.description ?? undefined,
        sortOrder: index + 1,
        memo: 'verify:pms-launch',
      })),
    },
    label: 'PMS deliverable template group save runtime smoke',
  });
  assertObject(deliverableGroup.data, 'PMS deliverable template group save response');
  assertEquals(deliverableGroup.data.groupCode, deliverableGroupCode, 'PMS deliverable template group save keeps group code');
  assertArray(deliverableGroup.data.items, 'PMS deliverable template group save response exposes items');
  assertAtLeast(deliverableGroup.data.items.length, 1, 'PMS deliverable template group save keeps at least one item');

  const deliverableGroups = await apiJson(`/projects/${projectId}/deliverables/templates`, {
    accessToken,
    label: 'PMS deliverable template group list runtime smoke',
  });
  assertArray(deliverableGroups.data, 'PMS deliverable template group list response');
  assertTruthy(
    deliverableGroups.data.some((group) => group.groupCode === deliverableGroupCode),
    'PMS deliverable template group list includes the saved QA group',
  );

  const selectedDeliverableTemplate = await apiJson(`/projects/${projectId}/deliverables/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode, groupCode: deliverableGroupCode, applyMode: 'replace' },
    label: 'PMS deliverable selected template replace runtime smoke',
  });
  assertEquals(selectedDeliverableTemplate.data.source, 'group', 'PMS deliverable selected template applies a saved group');
  assertEquals(selectedDeliverableTemplate.data.templateCode, deliverableGroupCode, 'PMS deliverable selected template reports selected group code');
  assertEquals(selectedDeliverableTemplate.data.applyMode, 'replace', 'PMS deliverable selected template reports replace apply mode');
  assertAtLeast(selectedDeliverableTemplate.data.deactivatedCount, 1, 'PMS deliverable replace mode deactivates template-excluded rows');
  assertTruthy(
    selectedDeliverableTemplate.data.items.some((item) => String(item.deliverableCode) === deliverableReplaceKeptCode),
    'PMS deliverable replace mode keeps template-included rows active',
  );
  assertTruthy(
    !selectedDeliverableTemplate.data.items.some((item) => String(item.deliverableCode) === deliverableReplaceDroppedCode),
    'PMS deliverable replace mode removes template-excluded rows from active list',
  );

  await apiJson(`/projects/${projectId}/deliverables/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode },
    label: 'PMS deliverable template restore after replace smoke',
  });

  const closeConditionTemplate = await apiJson(`/projects/${projectId}/close-conditions/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode },
    label: 'PMS close-condition template apply runtime smoke',
  });
  assertObject(closeConditionTemplate.data, 'PMS close-condition template apply response');
  assertEquals(closeConditionTemplate.data.statusCode, statusCode, 'PMS close-condition template response keeps status code');
  assertTruthy(
    closeConditionTemplate.data.source === 'group' || closeConditionTemplate.data.source === 'default',
    'PMS close-condition template response identifies template source',
  );
  assertType(closeConditionTemplate.data.createdCount, 'number', 'PMS close-condition template response exposes created count');
  assertType(closeConditionTemplate.data.restoredCount, 'number', 'PMS close-condition template response exposes restored count');
  assertType(closeConditionTemplate.data.keptCount, 'number', 'PMS close-condition template response exposes kept count');
  assertType(closeConditionTemplate.data.deactivatedCount, 'number', 'PMS close-condition template response exposes replace deactivation count');
  assertArray(closeConditionTemplate.data.items, 'PMS close-condition template response exposes applied rows');
  assertAtLeast(closeConditionTemplate.data.items.length, 2, 'PMS close-condition template leaves enough active rows for replace policy smoke');
  const closeConditionReplaceKeptCode = String(closeConditionTemplate.data.items[0].conditionCode);
  const closeConditionReplaceDroppedCode = String(closeConditionTemplate.data.items[1].conditionCode);

  const closeConditionGroupCode = `qa-${statusCode}-close-${Date.now()}`;
  const closeConditionGroup = await apiJson(`/projects/${projectId}/close-conditions/templates`, {
    method: 'POST',
    accessToken,
    body: {
      groupCode: closeConditionGroupCode,
      groupName: `QA 종료조건 템플릿 ${statusCode}`,
      description: 'verify:pms-launch runtime smoke',
      items: closeConditionTemplate.data.items.slice(0, 1).map((item, index) => ({
        conditionCode: String(item.conditionCode),
        requiresDeliverable: Boolean(item.requiresDeliverable),
        sortOrder: index + 1,
        memo: item.memo ?? 'verify:pms-launch',
      })),
    },
    label: 'PMS close-condition template group save runtime smoke',
  });
  assertObject(closeConditionGroup.data, 'PMS close-condition template group save response');
  assertEquals(closeConditionGroup.data.groupCode, closeConditionGroupCode, 'PMS close-condition template group save keeps group code');
  assertArray(closeConditionGroup.data.items, 'PMS close-condition template group save response exposes items');
  assertAtLeast(closeConditionGroup.data.items.length, 1, 'PMS close-condition template group save keeps at least one item');

  const closeConditionGroups = await apiJson(`/projects/${projectId}/close-conditions/templates`, {
    accessToken,
    label: 'PMS close-condition template group list runtime smoke',
  });
  assertArray(closeConditionGroups.data, 'PMS close-condition template group list response');
  assertTruthy(
    closeConditionGroups.data.some((group) => group.groupCode === closeConditionGroupCode),
    'PMS close-condition template group list includes the saved QA group',
  );

  const selectedCloseConditionTemplate = await apiJson(`/projects/${projectId}/close-conditions/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode, groupCode: closeConditionGroupCode, applyMode: 'replace' },
    label: 'PMS close-condition selected template replace runtime smoke',
  });
  assertEquals(selectedCloseConditionTemplate.data.source, 'group', 'PMS close-condition selected template applies a saved group');
  assertEquals(selectedCloseConditionTemplate.data.templateCode, closeConditionGroupCode, 'PMS close-condition selected template reports selected group code');
  assertEquals(selectedCloseConditionTemplate.data.applyMode, 'replace', 'PMS close-condition selected template reports replace apply mode');
  assertAtLeast(selectedCloseConditionTemplate.data.deactivatedCount, 1, 'PMS close-condition replace mode deactivates template-excluded rows');
  assertTruthy(
    selectedCloseConditionTemplate.data.items.some((item) => String(item.conditionCode) === closeConditionReplaceKeptCode),
    'PMS close-condition replace mode keeps template-included rows active',
  );
  assertTruthy(
    !selectedCloseConditionTemplate.data.items.some((item) => String(item.conditionCode) === closeConditionReplaceDroppedCode),
    'PMS close-condition replace mode removes template-excluded rows from active list',
  );
  const savedDeliverableRequiredItem = closeConditionGroup.data.items.find((item) => item.requiresDeliverable);
  if (savedDeliverableRequiredItem) {
    const appliedDeliverableRequiredItem = selectedCloseConditionTemplate.data.items.find(
      (item) => item.conditionCode === savedDeliverableRequiredItem.conditionCode,
    );
    assertTruthy(
      appliedDeliverableRequiredItem?.requiresDeliverable,
      'PMS close-condition selected template preserves deliverable-required policy',
    );
  }

  await apiJson(`/projects/${projectId}/close-conditions/template`, {
    method: 'POST',
    accessToken,
    body: { statusCode },
    label: 'PMS close-condition template restore after replace smoke',
  });

  await verifyDeliverableCompletionVocabulary(projectId, statusCode, accessToken);
  await verifyTemplateGroupAdminWorkflow(accessToken, deliverableTemplate.data.items, closeConditionTemplate.data.items);
}

async function verifyCloseoutApprovalRoutes(projectId, statusCode, accessToken, currentUser) {
  assertTruthy(statusCode, 'PMS closeout approval runtime smoke requires a project status code');
  const encodedStatusCode = encodeURIComponent(statusCode);
  const member = await ensureCurrentUserProjectMember(projectId, accessToken, currentUser);
  const approverUserId = String(member.userId ?? currentUser.userId);

  const deliverables = await assertArrayEndpoint(
    `/projects/${projectId}/deliverables?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS closeout approval deliverable rows',
  );
  const deliverable = deliverables.find((item) => item?.deliverableCode);
  assertObject(deliverable, 'PMS closeout approval deliverable target');
  const deliverableCode = String(deliverable.deliverableCode);
  const encodedDeliverableCode = encodeURIComponent(deliverableCode);

  const deliverableRoute = await apiJson(
    `/projects/${projectId}/deliverables/${encodedStatusCode}/${encodedDeliverableCode}/approval-steps`,
    {
      method: 'PUT',
      accessToken,
      body: {
        steps: [{ sequenceNo: 1, approverUserId, memo: 'verify:pms-launch closeout approval' }],
      },
      label: 'PMS deliverable closeout approval route save smoke',
    },
  );
  assertArray(deliverableRoute.data, 'PMS deliverable approval route save response');
  assertAtLeast(deliverableRoute.data.length, 1, 'PMS deliverable approval route save returns a step');
  const deliverableStep = deliverableRoute.data[0];
  assertEquals(deliverableStep.approvalStatusCode, 'pending', 'PMS deliverable approval route starts pending');
  assertEquals(String(deliverableStep.approverUserId), approverUserId, 'PMS deliverable approval route stores current approver');

  const deliverablesWithRoute = await assertArrayEndpoint(
    `/projects/${projectId}/deliverables?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS deliverable rows include approval steps',
  );
  const deliverableWithRoute = deliverablesWithRoute.find((item) => String(item?.deliverableCode) === deliverableCode);
  assertArray(deliverableWithRoute?.approvalSteps, 'PMS deliverable row exposes approval step array');
  assertAtLeast(deliverableWithRoute.approvalSteps.length, 1, 'PMS deliverable row includes active approval route');

  const approvedDeliverableRoute = await apiJson(
    `/projects/${projectId}/deliverables/${encodedStatusCode}/${encodedDeliverableCode}/approval-steps/${encodeURIComponent(String(deliverableStep.approvalStepId))}/decision`,
    {
      method: 'PATCH',
      accessToken,
      body: { approvalStatusCode: 'approved', memo: 'verify:pms-launch closeout approval decision' },
      label: 'PMS deliverable closeout approval decision smoke',
    },
  );
  const approvedDeliverableStep = approvedDeliverableRoute.data?.find(
    (step) => String(step.approvalStepId) === String(deliverableStep.approvalStepId),
  );
  assertEquals(approvedDeliverableStep?.approvalStatusCode, 'approved', 'PMS deliverable approval decision stores approved status');

  const deliverablesAfterApproval = await assertArrayEndpoint(
    `/projects/${projectId}/deliverables?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS deliverable approval result rows',
  );
  const approvedDeliverable = deliverablesAfterApproval.find((item) => String(item?.deliverableCode) === deliverableCode);
  assertEquals(approvedDeliverable?.submissionStatusCode, 'approved', 'PMS deliverable approval route marks deliverable approved');

  const closeConditions = await assertArrayEndpoint(
    `/projects/${projectId}/close-conditions?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS close-condition approval rows',
  );
  const closeCondition = closeConditions.find((item) => item?.conditionCode && !item.requiresDeliverable)
    ?? closeConditions.find((item) => item?.conditionCode);
  assertObject(closeCondition, 'PMS closeout approval close-condition target');
  const conditionCode = String(closeCondition.conditionCode);
  const encodedConditionCode = encodeURIComponent(conditionCode);

  const closeConditionRoute = await apiJson(
    `/projects/${projectId}/close-conditions/${encodedStatusCode}/${encodedConditionCode}/approval-steps`,
    {
      method: 'PUT',
      accessToken,
      body: {
        steps: [{ sequenceNo: 1, approverUserId, memo: 'verify:pms-launch closeout approval' }],
      },
      label: 'PMS close-condition approval route save smoke',
    },
  );
  assertArray(closeConditionRoute.data, 'PMS close-condition approval route save response');
  assertAtLeast(closeConditionRoute.data.length, 1, 'PMS close-condition approval route save returns a step');
  const closeConditionStep = closeConditionRoute.data[0];
  assertEquals(closeConditionStep.approvalStatusCode, 'pending', 'PMS close-condition approval route starts pending');
  assertEquals(String(closeConditionStep.approverUserId), approverUserId, 'PMS close-condition approval route stores current approver');

  const closeConditionsWithRoute = await assertArrayEndpoint(
    `/projects/${projectId}/close-conditions?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS close-condition rows include approval steps',
  );
  const closeConditionWithRoute = closeConditionsWithRoute.find((item) => String(item?.conditionCode) === conditionCode);
  assertArray(closeConditionWithRoute?.approvalSteps, 'PMS close-condition row exposes approval step array');
  assertAtLeast(closeConditionWithRoute.approvalSteps.length, 1, 'PMS close-condition row includes active approval route');

  const approvedCloseConditionRoute = await apiJson(
    `/projects/${projectId}/close-conditions/${encodedStatusCode}/${encodedConditionCode}/approval-steps/${encodeURIComponent(String(closeConditionStep.approvalStepId))}/decision`,
    {
      method: 'PATCH',
      accessToken,
      body: { approvalStatusCode: 'approved', memo: 'verify:pms-launch closeout approval decision' },
      label: 'PMS close-condition approval decision smoke',
    },
  );
  const approvedCloseConditionStep = approvedCloseConditionRoute.data?.find(
    (step) => String(step.approvalStepId) === String(closeConditionStep.approvalStepId),
  );
  assertEquals(approvedCloseConditionStep?.approvalStatusCode, 'approved', 'PMS close-condition approval decision stores approved status');

  const closeConditionsAfterApproval = await assertArrayEndpoint(
    `/projects/${projectId}/close-conditions?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS close-condition approval result rows',
  );
  const approvedCloseCondition = closeConditionsAfterApproval.find((item) => String(item?.conditionCode) === conditionCode);
  assertEquals(approvedCloseCondition?.isChecked, true, 'PMS close-condition approval route marks condition checked');
}

async function ensureCurrentUserProjectMember(projectId, accessToken, currentUser) {
  const currentUserId = String(currentUser.userId);
  const activeMembers = await assertArrayEndpoint(
    `/projects/${projectId}/members`,
    accessToken,
    'PMS closeout approval project member rows',
  );
  const activeMember = activeMembers.find((member) => (
    String(member?.userId) === currentUserId && member?.isActive !== false
  ));
  if (activeMember) {
    return activeMember;
  }

  const createResult = await tryApiJson(`/projects/${projectId}/members`, {
    method: 'POST',
    accessToken,
    body: {
      userId: currentUserId,
      roleCode: 'pm',
      accessLevel: 'participant',
      isPhaseOwner: false,
      allocationRate: 100,
      memo: 'verify:pms-launch closeout approval approver',
    },
    label: 'PMS closeout approval current user member setup',
    allowFailure: true,
  });
  if (createResult?.data) {
    return createResult.data;
  }

  const updateResult = await tryApiJson(`/projects/${projectId}/members/${encodeURIComponent(currentUserId)}/pm`, {
    method: 'PUT',
    accessToken,
    body: {
      isActive: true,
      releasedAt: null,
      accessLevel: 'participant',
      allocationRate: 100,
      memo: 'verify:pms-launch closeout approval approver',
    },
    label: 'PMS closeout approval current user member reactivation',
    allowFailure: true,
  });
  if (updateResult?.data) {
    return updateResult.data;
  }

  const refreshedMembers = await assertArrayEndpoint(
    `/projects/${projectId}/members`,
    accessToken,
    'PMS closeout approval refreshed project member rows',
  );
  const refreshedMember = refreshedMembers.find((member) => (
    String(member?.userId) === currentUserId && member?.isActive !== false
  ));
  if (refreshedMember) {
    return refreshedMember;
  }
  throw new Error('PMS runtime smoke could not prepare the current user as an active project member for closeout approval');
}

async function verifyDeliverableCompletionVocabulary(projectId, statusCode, accessToken) {
  const encodedStatusCode = encodeURIComponent(statusCode);
  const deliverables = await assertArrayEndpoint(
    `/projects/${projectId}/deliverables?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS deliverable completion vocabulary rows',
  );
  assertAtLeast(deliverables.length, 1, 'PMS deliverable completion vocabulary smoke has current-status rows');

  for (const deliverable of deliverables) {
    await apiJson(
      `/projects/${projectId}/deliverables/${encodedStatusCode}/${encodeURIComponent(String(deliverable.deliverableCode))}/submission`,
      {
        method: 'PATCH',
        accessToken,
        body: { submissionStatusCode: 'confirmed' },
        label: 'PMS deliverable confirmed completion status smoke',
      },
    );
  }

  const readiness = await apiJson(`/projects/${projectId}/transition-readiness`, {
    accessToken,
    label: 'PMS deliverable completion vocabulary readiness smoke',
  });
  assertObject(readiness.data?.deliverables, 'PMS deliverable completion vocabulary readiness exposes deliverables');
  assertEquals(
    readiness.data.deliverables.pending,
    0,
    'PMS transition readiness treats confirmed deliverables as complete',
  );
  assertEquals(
    readiness.data.deliverables.completed,
    readiness.data.deliverables.total,
    'PMS transition readiness completed count includes confirmed deliverables',
  );

  const closeConditions = await assertArrayEndpoint(
    `/projects/${projectId}/close-conditions?statusCode=${encodedStatusCode}`,
    accessToken,
    'PMS close-condition completion vocabulary rows',
  );
  let requiresDeliverableCondition = closeConditions.find((condition) => condition?.requiresDeliverable);
  if (!requiresDeliverableCondition) {
    const conditionCode = `QA_CONFIRMED_${Date.now()}`;
    const createdCondition = await apiJson(`/projects/${projectId}/close-conditions`, {
      method: 'POST',
      accessToken,
      body: {
        statusCode,
        conditionCode,
        requiresDeliverable: true,
        sortOrder: 9999,
        memo: 'verify:pms-launch confirmed vocabulary',
      },
      label: 'PMS close-condition deliverable-required vocabulary setup',
    });
    requiresDeliverableCondition = createdCondition.data;
  }

  const checkedCondition = await apiJson(
    `/projects/${projectId}/close-conditions/${encodedStatusCode}/${encodeURIComponent(String(requiresDeliverableCondition.conditionCode))}/check`,
    {
      method: 'PATCH',
      accessToken,
      body: { isChecked: true },
      label: 'PMS close-condition accepts confirmed deliverables smoke',
    },
  );
  assertEquals(
    checkedCondition.data?.isChecked,
    true,
    'PMS close-condition guard accepts confirmed deliverables as completion evidence',
  );
}

async function verifyTemplateGroupAdminWorkflow(accessToken, deliverableSourceItems, closeConditionSourceItems) {
  const timestamp = Date.now();
  const deliverableGroupCode = `qa-admin-deliverable-${timestamp}`;
  const deliverableSourceItem = deliverableSourceItems.find((item) => item?.deliverableCode);
  assertObject(deliverableSourceItem, 'PMS template admin deliverable source item');

  const createdDeliverableGroup = await apiJson('/pms/template-groups/deliverables', {
    method: 'POST',
    accessToken,
    body: {
      groupCode: deliverableGroupCode,
      groupName: `QA 관리자 산출물 템플릿 ${timestamp}`,
      description: 'verify:pms-launch template admin workflow',
      items: [{
        deliverableCode: String(deliverableSourceItem.deliverableCode),
        deliverableName: String(
          deliverableSourceItem.deliverable?.deliverableName
            ?? deliverableSourceItem.deliverableName
            ?? deliverableSourceItem.deliverableCode,
        ),
        description: deliverableSourceItem.deliverable?.description ?? undefined,
        sortOrder: 1,
        memo: 'verify:pms-launch admin create',
      }],
    },
    label: 'PMS deliverable template admin create smoke',
  });
  assertObject(createdDeliverableGroup.data, 'PMS deliverable template admin create response');
  assertEquals(createdDeliverableGroup.data.groupCode, deliverableGroupCode, 'PMS deliverable template admin create keeps group code');
  assertEquals(createdDeliverableGroup.data.approvalStatusCode, 'draft', 'PMS deliverable template admin create starts as draft');
  assertType(createdDeliverableGroup.data.versionNo, 'number', 'PMS deliverable template admin create exposes version number');

  const approvedDeliverableGroup = await apiJson(
    `/pms/template-groups/deliverables/${encodeURIComponent(deliverableGroupCode)}/approval`,
    {
      method: 'PATCH',
      accessToken,
      body: { approvalStatusCode: 'approved' },
      label: 'PMS deliverable template admin approval smoke',
    },
  );
  assertEquals(approvedDeliverableGroup.data?.approvalStatusCode, 'approved', 'PMS deliverable template admin can approve group');
  assertTruthy(approvedDeliverableGroup.data?.approvedAt, 'PMS deliverable template admin approval stores approvedAt');

  const deliverableHistory = await apiJson(
    `/pms/template-groups/deliverables/${encodeURIComponent(deliverableGroupCode)}/history`,
    {
      accessToken,
      label: 'PMS deliverable template admin history smoke',
    },
  );
  assertArray(deliverableHistory.data, 'PMS deliverable template admin history response');
  const deliverableRestoreSource = deliverableHistory.data.find((row) => row?.historySeq);
  assertTruthy(deliverableRestoreSource?.historySeq, 'PMS deliverable template admin history exposes historySeq');

  const restoredDeliverableGroup = await apiJson(
    `/pms/template-groups/deliverables/${encodeURIComponent(deliverableGroupCode)}/restore/${encodeURIComponent(String(deliverableRestoreSource.historySeq))}`,
    {
      method: 'POST',
      accessToken,
      label: 'PMS deliverable template admin restore smoke',
    },
  );
  assertEquals(restoredDeliverableGroup.data?.approvalStatusCode, 'draft', 'PMS deliverable template admin restore returns group to draft');
  assertArray(restoredDeliverableGroup.data?.items, 'PMS deliverable template admin restore response items');

  const archivedDeliverableGroup = await apiJson(
    `/pms/template-groups/deliverables/${encodeURIComponent(deliverableGroupCode)}`,
    {
      method: 'DELETE',
      accessToken,
      label: 'PMS deliverable template admin archive smoke',
    },
  );
  assertEquals(archivedDeliverableGroup.data?.approvalStatusCode, 'archived', 'PMS deliverable template admin archive sets archived status');
  assertEquals(archivedDeliverableGroup.data?.isActive, false, 'PMS deliverable template admin archive deactivates group');

  const listedDeliverableGroups = await apiJson('/pms/template-groups/deliverables', {
    accessToken,
    label: 'PMS deliverable template admin list smoke',
  });
  assertArray(listedDeliverableGroups.data, 'PMS deliverable template admin list response');
  assertTruthy(
    listedDeliverableGroups.data.some((group) => group?.groupCode === deliverableGroupCode && group?.approvalStatusCode === 'archived'),
    'PMS deliverable template admin list keeps archived groups visible for restore/audit',
  );

  const closeConditionGroupCode = `qa-admin-close-${timestamp}`;
  const closeConditionSourceItem = closeConditionSourceItems.find((item) => item?.conditionCode);
  assertObject(closeConditionSourceItem, 'PMS template admin close-condition source item');

  const createdCloseConditionGroup = await apiJson('/pms/template-groups/close-conditions', {
    method: 'POST',
    accessToken,
    body: {
      groupCode: closeConditionGroupCode,
      groupName: `QA 관리자 종료조건 템플릿 ${timestamp}`,
      description: 'verify:pms-launch template admin workflow',
      items: [{
        conditionCode: String(closeConditionSourceItem.conditionCode),
        requiresDeliverable: Boolean(closeConditionSourceItem.requiresDeliverable),
        sortOrder: 1,
        memo: 'verify:pms-launch admin create',
      }],
    },
    label: 'PMS close-condition template admin create smoke',
  });
  assertObject(createdCloseConditionGroup.data, 'PMS close-condition template admin create response');
  assertEquals(createdCloseConditionGroup.data.groupCode, closeConditionGroupCode, 'PMS close-condition template admin create keeps group code');
  assertEquals(createdCloseConditionGroup.data.approvalStatusCode, 'draft', 'PMS close-condition template admin create starts as draft');

  const approvedCloseConditionGroup = await apiJson(
    `/pms/template-groups/close-conditions/${encodeURIComponent(closeConditionGroupCode)}/approval`,
    {
      method: 'PATCH',
      accessToken,
      body: { approvalStatusCode: 'approved' },
      label: 'PMS close-condition template admin approval smoke',
    },
  );
  assertEquals(approvedCloseConditionGroup.data?.approvalStatusCode, 'approved', 'PMS close-condition template admin can approve group');

  const closeConditionHistory = await apiJson(
    `/pms/template-groups/close-conditions/${encodeURIComponent(closeConditionGroupCode)}/history`,
    {
      accessToken,
      label: 'PMS close-condition template admin history smoke',
    },
  );
  assertArray(closeConditionHistory.data, 'PMS close-condition template admin history response');
  const closeConditionRestoreSource = closeConditionHistory.data.find((row) => row?.historySeq);
  assertTruthy(closeConditionRestoreSource?.historySeq, 'PMS close-condition template admin history exposes historySeq');

  const restoredCloseConditionGroup = await apiJson(
    `/pms/template-groups/close-conditions/${encodeURIComponent(closeConditionGroupCode)}/restore/${encodeURIComponent(String(closeConditionRestoreSource.historySeq))}`,
    {
      method: 'POST',
      accessToken,
      label: 'PMS close-condition template admin restore smoke',
    },
  );
  assertEquals(restoredCloseConditionGroup.data?.approvalStatusCode, 'draft', 'PMS close-condition template admin restore returns group to draft');
  assertArray(restoredCloseConditionGroup.data?.items, 'PMS close-condition template admin restore response items');

  const archivedCloseConditionGroup = await apiJson(
    `/pms/template-groups/close-conditions/${encodeURIComponent(closeConditionGroupCode)}`,
    {
      method: 'DELETE',
      accessToken,
      label: 'PMS close-condition template admin archive smoke',
    },
  );
  assertEquals(archivedCloseConditionGroup.data?.approvalStatusCode, 'archived', 'PMS close-condition template admin archive sets archived status');
  assertEquals(archivedCloseConditionGroup.data?.isActive, false, 'PMS close-condition template admin archive deactivates group');
}

async function verifyPmsErrorCodeContract(accessToken) {
  await apiJsonExpectFailure('/projects/not-a-number/access', {
    accessToken,
    expectedStatus: 400,
    expectedCode: 'PMS_INVALID_IDENTIFIER',
    label: 'PMS invalid project identifier error code runtime smoke',
  });
}

async function verifyLegacyIssueRetirement(projectId, accessToken) {
  await assertArrayEndpoint(
    `/projects/${projectId}/issues`,
    accessToken,
    'legacy issue cleanup inbox remains readable at runtime',
  );
  const cleanupSummary = await apiJson(`/projects/${projectId}/issues/cleanup-summary`, {
    accessToken,
    label: 'legacy issue cleanup summary runtime smoke',
  });
  assertObject(cleanupSummary.data, 'legacy issue cleanup summary response');
  assertAtLeast(cleanupSummary.data.activeCleanupCount, 0, 'legacy issue cleanup summary active count');
  assertAtLeast(cleanupSummary.data.pendingCleanupCount, 0, 'legacy issue cleanup summary pending count');
  assertAtLeast(cleanupSummary.data.terminalCleanupCount, 0, 'legacy issue cleanup summary terminal count');
  assertAtLeast(cleanupSummary.data.archivedCleanupCount, 0, 'legacy issue cleanup summary archive count');
  assertEquals(
    cleanupSummary.data.readyForPhysicalRemoval,
    cleanupSummary.data.activeCleanupCount === 0,
    'legacy issue cleanup summary physical removal gate',
  );
  assertArray(cleanupSummary.data.statusCounts, 'legacy issue cleanup status counts');
  assertArray(cleanupSummary.data.issueTypeCounts, 'legacy issue cleanup type counts');

  const canonicalizeResult = await apiJson(`/projects/${projectId}/issues/cleanup-pending/canonicalize`, {
    method: 'POST',
    accessToken,
    label: 'legacy issue pending cleanup batch canonicalization runtime smoke',
  });
  assertObject(canonicalizeResult.data, 'legacy issue pending cleanup batch canonicalization response');
  assertAtLeast(canonicalizeResult.data.convertedCount, 0, 'legacy issue pending cleanup batch canonicalization count');
  assertAtLeast(canonicalizeResult.data.projectIssueCount, 0, 'legacy issue pending cleanup project issue conversion count');
  assertAtLeast(canonicalizeResult.data.riskCount, 0, 'legacy issue pending cleanup risk conversion count');
  assertAtLeast(canonicalizeResult.data.changeRequestCount, 0, 'legacy issue pending cleanup change conversion count');
  if (canonicalizeResult.data.convertedCount > cleanupSummary.data.pendingCleanupCount) {
    throw new Error('PMS readiness check failed: legacy issue batch canonicalization returned more rows than available pending cleanup rows');
  }
  assertEquals(
    canonicalizeResult.data.projectIssueCount +
      canonicalizeResult.data.riskCount +
      canonicalizeResult.data.changeRequestCount,
    canonicalizeResult.data.convertedCount,
    'legacy issue pending cleanup batch canonicalization target counts',
  );
  assertEquals(
    canonicalizeResult.data.pendingCleanupCount,
    cleanupSummary.data.pendingCleanupCount - canonicalizeResult.data.convertedCount,
    'legacy issue pending cleanup batch canonicalization reduces pending cleanup count',
  );
  assertEquals(
    canonicalizeResult.data.activeCleanupCount,
    cleanupSummary.data.activeCleanupCount - canonicalizeResult.data.convertedCount,
    'legacy issue pending cleanup batch canonicalization reduces active cleanup count',
  );
  assertEquals(
    canonicalizeResult.data.readyForPhysicalRemoval,
    canonicalizeResult.data.activeCleanupCount === 0,
    'legacy issue pending cleanup batch canonicalization physical removal gate',
  );

  const archiveResult = await apiJson(`/projects/${projectId}/issues/cleanup-terminal/archive`, {
    method: 'POST',
    accessToken,
    label: 'legacy issue completed cleanup batch archive runtime smoke',
  });
  assertObject(archiveResult.data, 'legacy issue completed cleanup batch archive response');
  assertAtLeast(archiveResult.data.archivedCount, 0, 'legacy issue completed cleanup batch archive count');
  if (archiveResult.data.archivedCount > canonicalizeResult.data.terminalCleanupCount) {
    throw new Error('PMS readiness check failed: legacy issue batch archive returned more rows than available terminal cleanup rows');
  }
  assertEquals(
    archiveResult.data.terminalCleanupCount,
    canonicalizeResult.data.terminalCleanupCount - archiveResult.data.archivedCount,
    'legacy issue completed cleanup batch archive reduces terminal cleanup count',
  );
  assertEquals(
    archiveResult.data.activeCleanupCount,
    canonicalizeResult.data.activeCleanupCount - archiveResult.data.archivedCount,
    'legacy issue completed cleanup batch archive reduces active cleanup count',
  );
  assertEquals(
    archiveResult.data.readyForPhysicalRemoval,
    archiveResult.data.activeCleanupCount === 0,
    'legacy issue completed cleanup batch archive physical removal gate',
  );
  await apiJsonExpectFailure(`/projects/${projectId}/issues`, {
    method: 'POST',
    accessToken,
    body: {
      issueCode: `VERIFY-LEGACY-RETIRED-${Date.now().toString(36)}`,
      issueTitle: 'Verify retired legacy issue write',
      issueTypeCode: 'bug',
      priorityCode: 'normal',
      memo: 'verify:pms-launch legacy issue retirement smoke',
    },
    expectedStatus: 410,
    expectedCode: 'PMS_LEGACY_ISSUE_WRITE_DISABLED',
    label: 'legacy issue create retired runtime smoke',
  });
}

async function verifyGlobalLegacyIssueCleanupReadiness(accessToken) {
  const projects = await assertArrayEndpoint(
    '/projects?limit=200',
    accessToken,
    'global legacy issue cleanup project list runtime smoke',
  );
  if (projects.length === 0) {
    throw new Error('PMS readiness runtime check failed: global legacy issue cleanup requires at least one project');
  }

  let checkedCount = 0;
  let activeCleanupCount = 0;
  let pendingCleanupCount = 0;
  let terminalCleanupCount = 0;
  let archivedCleanupCount = 0;
  const activeProjects = [];

  for (const project of projects) {
    const projectId = project?.id;
    if (!projectId) {
      continue;
    }
    checkedCount += 1;
    const summary = await apiJson(`/projects/${projectId}/issues/cleanup-summary`, {
      accessToken,
      label: `global legacy issue cleanup summary runtime smoke (${projectId})`,
    });
    assertObject(summary.data, `global legacy issue cleanup summary response (${projectId})`);
    assertAtLeast(summary.data.activeCleanupCount, 0, `global legacy issue active count (${projectId})`);
    assertAtLeast(summary.data.pendingCleanupCount, 0, `global legacy issue pending count (${projectId})`);
    assertAtLeast(summary.data.terminalCleanupCount, 0, `global legacy issue terminal count (${projectId})`);
    assertAtLeast(summary.data.archivedCleanupCount, 0, `global legacy issue archive count (${projectId})`);
    assertEquals(
      summary.data.readyForPhysicalRemoval,
      summary.data.activeCleanupCount === 0,
      `global legacy issue physical removal gate (${projectId})`,
    );

    activeCleanupCount += summary.data.activeCleanupCount;
    pendingCleanupCount += summary.data.pendingCleanupCount;
    terminalCleanupCount += summary.data.terminalCleanupCount;
    archivedCleanupCount += summary.data.archivedCleanupCount;
    if (summary.data.activeCleanupCount > 0) {
      activeProjects.push(`${projectId}:${summary.data.activeCleanupCount}`);
    }
  }

  assertAtLeast(checkedCount, 1, 'global legacy issue cleanup checked project count');
  assertEquals(pendingCleanupCount, 0, 'global legacy issue pending cleanup count');
  assertEquals(terminalCleanupCount, 0, 'global legacy issue terminal cleanup count');
  assertAtLeast(archivedCleanupCount, 1, 'global legacy issue archived cleanup evidence count');
  if (activeCleanupCount !== 0) {
    throw new Error(
      `PMS readiness runtime check failed: global legacy issue cleanup still has active rows (${activeProjects.join(', ')})`,
    );
  }
}

async function verifyPmsAiIndexSourceStatus(accessToken) {
  const statusResponse = await apiJson('/ai-index/status?sourceApp=pms', {
    accessToken,
    label: 'PMS AI index source status runtime smoke',
  });
  if (!Array.isArray(statusResponse.data)) {
    throw new Error('PMS readiness runtime check failed: AI index source status did not return an array');
  }
  const pmsStatus = statusResponse.data.find((row) => row?.sourceApp === 'pms');
  assertObject(pmsStatus, 'PMS AI index source status runtime smoke');
  assertEquals(pmsStatus.registered, true, 'PMS AI index source is registered');
  assertEquals(pmsStatus.registrationStatus, 'registered', 'PMS AI index registration status');
  assertEquals(pmsStatus.indexingEnabled, true, 'PMS AI index indexing capability');
  assertEquals(pmsStatus.keywordSearchEnabled, true, 'PMS AI index keyword capability');
  assertEquals(pmsStatus.metadataSearchEnabled, true, 'PMS AI index metadata capability');
  assertType(pmsStatus.semanticSearchEnabled, 'boolean', 'PMS AI index semantic capability flag');
  assertType(pmsStatus.vectorSearchEnabled, 'boolean', 'PMS AI index vector capability flag');
  assertType(pmsStatus.ragContextEnabled, 'boolean', 'PMS AI index RAG context capability flag');
}

async function verifyHomeReviewFeedbackAction(accessToken) {
  const summary = await apiJson('/home/summary', {
    accessToken,
    label: 'PMS home review feedback action runtime smoke',
  });
  assertObject(summary.data, 'PMS home review feedback action runtime smoke');
  assertArray(summary.data.accessProjects, 'PMS home summary access projects');

  const matchedProject = summary.data.accessProjects.find((project) =>
    Array.isArray(project?.allowedActions)
    && project.allowedActions.some((action) =>
      action?.kind === 'review-feedback'
      && action?.targetTab === 'review',
    ),
  );
  assertTruthy(matchedProject, 'PMS home summary exposes review feedback action for an accessible project');

  const reviewAction = matchedProject.allowedActions.find((action) => action?.kind === 'review-feedback');
  assertEquals(reviewAction?.label, '리뷰/피드백', 'PMS home review feedback action has launch-facing label');
  assertEquals(reviewAction?.requiredCapability, 'canManageIssues', 'PMS home review feedback action is gated by issue capability');
}

async function prepareContractSnapshot(projectId, accessToken) {
  await apiJson(`/projects/${projectId}/execution-detail`, {
    method: 'PUT',
    accessToken,
    body: {
      contractSignedAt: '2026-07-03',
      contractAmount: '1000000',
      contractUnitCode: 'KRW',
      billingTypeCode: 'milestone',
      deliveryMethodCode: 'handoff',
      memo: 'PMS launch runtime smoke contract snapshot fixture',
    },
    label: 'project contract snapshot fixture setup',
  });
}

async function verifyCrmContractHandoffSnapshotRuntime(projectId, accessToken) {
  const contractsResponse = await apiJson('/crm/contracts?status=all&sort=updated-desc', {
    accessToken,
    label: 'CRM contract candidates for PMS handoff runtime smoke',
  });
  assertObject(contractsResponse.data, 'CRM contract candidate response');
  assertArray(contractsResponse.data.items, 'CRM contract candidate response items');

  const readyContract = contractsResponse.data.items.find(isReadyCrmContractForPmsHandoff);
  assertTruthy(readyContract, 'CRM runtime smoke requires at least one ready PMS handoff contract candidate');

  const previewResponse = await apiJson(
    `/crm/contracts/${encodeURIComponent(String(readyContract.id))}/pms-handoff-preview`,
    {
      accessToken,
      label: 'CRM PMS handoff preview runtime smoke',
    },
  );
  const preview = previewResponse.data;
  assertObject(preview, 'CRM PMS handoff preview runtime smoke');
  assertEquals(preview.readiness, 'ready', 'CRM PMS handoff preview is ready');
  assertEquals(preview.confirmed, true, 'CRM PMS handoff preview is confirmed');
  assertTruthy(preview.contractCode, 'CRM PMS handoff preview exposes contract code');
  assertTruthy(preview.wbsCode, 'CRM PMS handoff preview exposes WBS code');
  assertArray(preview.billingPlan, 'CRM PMS handoff preview exposes billing plan');
  assertAtLeast(preview.billingPlan.length, 1, 'CRM PMS handoff preview has billing plan rows');
  assertTruthy(
    String(preview.boundaryNotice ?? '').includes('CRM'),
    'CRM PMS handoff preview carries a CRM ownership boundary notice',
  );

  await apiJsonExpectFailure(`/projects/${projectId}/contracts/crm-handoff-snapshot`, {
    method: 'POST',
    accessToken,
    body: {},
    expectedStatus: 400,
    expectedCode: 'PMS_REQUIRED_FIELD_MISSING',
    label: 'CRM handoff snapshot requires a preview runtime smoke',
  });

  const applied = await apiJson(`/projects/${projectId}/contracts/crm-handoff-snapshot`, {
    method: 'POST',
    accessToken,
    body: {
      preview,
      memo: `PMS launch CRM boundary smoke ${Date.now()}`,
    },
    label: 'CRM handoff preview snapshot apply runtime smoke',
  });
  assertObject(applied.data, 'CRM handoff preview snapshot apply response');
  assertEquals(applied.data.sourceApp, 'crm', 'CRM handoff snapshot result identifies CRM source app');
  assertEquals(
    String(applied.data.crmContractCode),
    String(preview.contractCode),
    'CRM handoff snapshot result keeps CRM contract code',
  );
  assertTruthy(
    String(applied.data.boundaryNotice ?? '').includes('CRM 계약 원장은 CRM이 소유'),
    'CRM handoff snapshot result preserves ownership boundary notice',
  );
  assertObject(applied.data.contract, 'CRM handoff snapshot result includes PMS contract snapshot');
  assertEquals(applied.data.contract.billingTypeCode, 'crm-billing-plan', 'CRM handoff contract snapshot is marked as a billing-plan snapshot');
  assertTruthy(
    String(applied.data.contract.memo ?? '').includes('CRM 계약 원장은 CRM이 소유'),
    'CRM handoff contract snapshot memo preserves the boundary notice',
  );
  assertTruthy(
    String(applied.data.contract.memo ?? '').includes(String(preview.contractCode)),
    'CRM handoff contract snapshot memo includes the CRM contract code',
  );
  assertArray(applied.data.payments, 'CRM handoff snapshot result includes payment snapshots');
  assertAtLeast(applied.data.payments.length, 1, 'CRM handoff snapshot creates billing-derived payment snapshots');
  const payment = applied.data.payments[0];
  assertTruthy(
    String(payment.triggerEvent ?? '').includes('CRM 청구계획'),
    'CRM handoff payment snapshot trigger references the CRM billing plan',
  );
  assertTruthy(
    String(payment.memo ?? '').includes('CRM 외부원가'),
    'CRM handoff payment snapshot memo preserves CRM billing cost context',
  );

  const projectContracts = await assertArrayEndpoint(
    `/projects/${projectId}/contracts`,
    accessToken,
    'project contract snapshot runtime smoke after CRM handoff apply',
  );
  const matchedSnapshot = projectContracts.find((contract) =>
    String(contract?.contractCode) === String(preview.contractCode)
      && contract?.billingTypeCode === 'crm-billing-plan'
      && String(contract?.memo ?? '').includes('CRM 계약 원장은 CRM이 소유'),
  );
  assertTruthy(matchedSnapshot, 'project contract list includes the CRM-sourced handoff snapshot');
}

function isReadyCrmContractForPmsHandoff(contract) {
  if (!contract || typeof contract !== 'object') {
    return false;
  }
  if (!contract.confirmed || !contract.wbsCode || !Array.isArray(contract.billingPlan) || contract.billingPlan.length === 0) {
    return false;
  }

  const billingRevenueTotal = contract.billingPlan.reduce(
    (sum, line) => sum + Number(line?.revenueAmount ?? 0),
    0,
  );
  const billingExternalCostTotal = contract.billingPlan.reduce(
    (sum, line) => sum + Number(line?.externalCostAmount ?? 0),
    0,
  );

  return billingRevenueTotal === Number(contract.revenueTotal ?? NaN)
    && billingExternalCostTotal === Number(contract.externalCostTotal ?? NaN);
}

async function verifyReviewFeedbackCapture(projectId, accessToken) {
  const suffix = Date.now().toString(36);
  const issueCode = `VERIFY-FB-${suffix}`;
  const eventCode = `VERIFY-REV-${suffix}`;
  let projectIssueId = '';
  let eventId = '';

  try {
    const createdIssue = await apiJson(`/projects/${projectId}/control/issues`, {
      method: 'POST',
      accessToken,
      body: {
        issueCode,
        issueTitle: `Verify feedback issue ${suffix}`,
        issueTypeCode: 'inquiry',
        statusCode: 'open',
        priorityCode: 'critical',
        description: 'PMS launch runtime smoke feedback capture fixture',
        memo: 'review-feedback',
      },
      label: 'project review feedback issue create smoke',
    });
    projectIssueId = String(createdIssue.data?.projectIssueId ?? '');
    assertTruthy(projectIssueId, 'project review feedback issue create returns projectIssueId');
    assertEquals(createdIssue.data?.memo, 'review-feedback', 'project review feedback issue stores trace memo');

    const createdEvent = await apiJson(`/projects/${projectId}/control/events`, {
      method: 'POST',
      accessToken,
      body: {
        eventCode,
        eventName: `Verify review event ${suffix}`,
        eventTypeCode: 'review',
        statusCode: 'planned',
        summary: 'PMS launch runtime smoke review event fixture',
        memo: 'review-feedback',
      },
      label: 'project review event create smoke',
    });
    eventId = String(createdEvent.data?.eventId ?? '');
    assertTruthy(eventId, 'project review event create returns eventId');
    assertEquals(createdEvent.data?.eventTypeCode, 'review', 'project review event stores review type');

    const issues = await assertArrayEndpoint(
      `/projects/${projectId}/control/issues`,
      accessToken,
      'project review feedback issue list smoke',
    );
    const matchedIssue = issues.find((issue) => issue?.issueCode === issueCode);
    assertTruthy(matchedIssue, 'project review feedback issue list includes created issue');
    await verifyHomeReviewFeedbackVisibility(projectId, accessToken);

    const resolvedIssue = await apiJson(`/projects/${projectId}/control/issues/${projectIssueId}`, {
      method: 'PUT',
      accessToken,
      body: {
        statusCode: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolution: 'PMS launch runtime smoke feedback resolve fixture',
      },
      label: 'project review feedback issue resolve smoke',
    });
    assertEquals(resolvedIssue.data?.statusCode, 'resolved', 'project review feedback issue resolve updates status');
    assertTruthy(resolvedIssue.data?.resolvedAt, 'project review feedback issue resolve stores resolvedAt');

    const events = await assertArrayEndpoint(
      `/projects/${projectId}/control/events`,
      accessToken,
      'project review event list smoke',
    );
    const matchedEvent = events.find((event) => event?.eventCode === eventCode);
    assertTruthy(matchedEvent, 'project review event list includes created review event');
    assertObject(matchedEvent.rollup, 'created review event exposes rollup');
  } finally {
    if (projectIssueId) {
      await tryApiJson(`/projects/${projectId}/control/issues/${projectIssueId}`, {
        method: 'DELETE',
        accessToken,
        label: 'project review feedback issue cleanup',
        allowFailure: true,
      });
    }
    if (eventId) {
      await tryApiJson(`/projects/${projectId}/control/events/${eventId}`, {
        method: 'DELETE',
        accessToken,
        label: 'project review event cleanup',
        allowFailure: true,
      });
    }
  }
}

async function verifyPmrPrrWorkflowStatusPolicy(projectId, accessToken, users) {
  const suffix = Date.now().toString(36);
  let delegatedEventId = '';
  let rolloverEventId = '';
  let selfEventId = '';

  try {
    const delegatedEvent = await apiJson(`/projects/${projectId}/control/events`, {
      method: 'POST',
      accessToken,
      body: {
        eventCode: `VERIFY-PMR-DELEGATED-${suffix}`,
        eventName: `Verify PMR/PRR delegated approver ${suffix}`,
        eventTypeCode: 'report',
        statusCode: 'planned',
        scheduledAt: new Date().toISOString(),
        ownerUserId: users.alternateApproverUserId,
        summary: '알림 수신: 승인자만 알림 · PMS launch runtime smoke delegated approver fixture',
        memo: 'pmr-prr-workflow',
      },
      label: 'PMR/PRR delegated workflow create smoke',
    });
    delegatedEventId = String(delegatedEvent.data?.eventId ?? '');
    assertTruthy(delegatedEventId, 'PMR/PRR delegated workflow create returns eventId');

    await apiJsonExpectFailure(`/projects/${projectId}/control/events/${delegatedEventId}`, {
      method: 'PUT',
      accessToken,
      body: { statusCode: 'approved' },
      expectedStatus: 400,
      expectedCode: 'PMS_BAD_REQUEST',
      label: 'PMR/PRR workflow rejects invalid direct approval transition',
    });

    const requestedDelegatedEvent = await apiJson(`/projects/${projectId}/control/events/${delegatedEventId}`, {
      method: 'PUT',
      accessToken,
      body: { statusCode: 'approval_requested' },
      label: 'PMR/PRR delegated workflow approval request smoke',
    });
    assertEquals(
      requestedDelegatedEvent.data?.statusCode,
      'approval_requested',
      'PMR/PRR delegated workflow stores approval requested status',
    );

    await apiJsonExpectFailure(`/projects/${projectId}/control/events/${delegatedEventId}`, {
      method: 'PUT',
      accessToken,
      body: { statusCode: 'approved' },
      expectedStatus: 403,
      expectedCode: 'PMS_PROJECT_PERMISSION_DENIED',
      label: 'PMR/PRR workflow rejects approval by non-approver',
    });

    const rolloverEvent = await apiJson(`/projects/${projectId}/control/events`, {
      method: 'POST',
      accessToken,
      body: {
        eventCode: `VERIFY-PMR-ROLLOVER-${suffix}`,
        eventName: `Verify PMR/PRR rollover ${suffix}`,
        eventTypeCode: 'report',
        statusCode: 'planned',
        scheduledAt: new Date(Date.now() - 60_000).toISOString(),
        ownerUserId: users.currentUserId,
        summary: '알림 수신: 승인자만 알림 · PMS launch runtime smoke rollover fixture',
        memo: 'pmr-prr-workflow',
      },
      label: 'PMR/PRR rollover workflow create smoke',
    });
    rolloverEventId = String(rolloverEvent.data?.eventId ?? '');
    assertTruthy(rolloverEventId, 'PMR/PRR rollover workflow create returns eventId');

    const rolloverRun = await apiJson(`/projects/${projectId}/control/events/pmr-prr-rollover`, {
      method: 'POST',
      accessToken,
      label: 'PMR/PRR due workflow rollover smoke',
    });
    assertObject(rolloverRun.data, 'PMR/PRR rollover returns run summary');
    assertTruthy(
      Array.isArray(rolloverRun.data.eventIds),
      'PMR/PRR rollover run summary exposes rolled-over event IDs',
    );

    const eventsAfterRollover = await assertArrayEndpoint(
      `/projects/${projectId}/control/events`,
      accessToken,
      'PMR/PRR rollover event list smoke',
    );
    const rolledOverEvent = eventsAfterRollover.find((event) => String(event?.eventId) === rolloverEventId);
    assertTruthy(rolledOverEvent, 'PMR/PRR rollover event remains listed after rollover');
    assertEquals(
      rolledOverEvent.statusCode,
      'approval_requested',
      'PMR/PRR rollover stores overdue workflow as approval requested',
    );
    assertIncludes(
      String(rolledOverEvent.summary ?? ''),
      '자동 승인 요청',
      'PMR/PRR rollover summary records the automatic approval request',
    );

    const selfEvent = await apiJson(`/projects/${projectId}/control/events`, {
      method: 'POST',
      accessToken,
      body: {
        eventCode: `VERIFY-PMR-SELF-${suffix}`,
        eventName: `Verify PMR/PRR self approver ${suffix}`,
        eventTypeCode: 'report',
        statusCode: 'planned',
        scheduledAt: new Date().toISOString(),
        ownerUserId: users.currentUserId,
        summary: '알림 수신: 승인자만 알림 · PMS launch runtime smoke self approver fixture',
        memo: 'pmr-prr-workflow',
      },
      label: 'PMR/PRR self workflow create smoke',
    });
    selfEventId = String(selfEvent.data?.eventId ?? '');
    assertTruthy(selfEventId, 'PMR/PRR self workflow create returns eventId');

    const requestedSelfEvent = await apiJson(`/projects/${projectId}/control/events/${selfEventId}`, {
      method: 'PUT',
      accessToken,
      body: { statusCode: 'approval_requested' },
      label: 'PMR/PRR self workflow approval request smoke',
    });
    assertEquals(
      requestedSelfEvent.data?.statusCode,
      'approval_requested',
      'PMR/PRR self workflow stores approval requested status',
    );

    const approvedSelfEvent = await apiJson(`/projects/${projectId}/control/events/${selfEventId}`, {
      method: 'PUT',
      accessToken,
      body: { statusCode: 'approved' },
      label: 'PMR/PRR self workflow approval smoke',
    });
    assertEquals(approvedSelfEvent.data?.statusCode, 'approved', 'PMR/PRR self workflow stores approved status');

    const completedSelfEvent = await apiJson(`/projects/${projectId}/control/events/${selfEventId}`, {
      method: 'PUT',
      accessToken,
      body: {
        statusCode: 'completed',
        occurredAt: new Date().toISOString(),
      },
      label: 'PMR/PRR self workflow publish complete smoke',
    });
    assertEquals(completedSelfEvent.data?.statusCode, 'completed', 'PMR/PRR self workflow stores completed status');
    assertTruthy(completedSelfEvent.data?.occurredAt, 'PMR/PRR completed workflow stores occurredAt');
  } finally {
    if (delegatedEventId) {
      await tryApiJson(`/projects/${projectId}/control/events/${delegatedEventId}`, {
        method: 'DELETE',
        accessToken,
        label: 'PMR/PRR delegated workflow cleanup',
        allowFailure: true,
      });
    }
    if (rolloverEventId) {
      await tryApiJson(`/projects/${projectId}/control/events/${rolloverEventId}`, {
        method: 'DELETE',
        accessToken,
        label: 'PMR/PRR rollover workflow cleanup',
        allowFailure: true,
      });
    }
    if (selfEventId) {
      await tryApiJson(`/projects/${projectId}/control/events/${selfEventId}`, {
        method: 'DELETE',
        accessToken,
        label: 'PMR/PRR self workflow cleanup',
        allowFailure: true,
      });
    }
  }
}

async function verifyHomeReviewFeedbackVisibility(projectId, accessToken) {
  const summary = await apiJson('/home/summary', {
    accessToken,
    label: 'PMS home review feedback visibility runtime smoke',
  });
  assertObject(summary.data, 'PMS home review feedback visibility runtime smoke');
  assertObject(summary.data.metrics, 'PMS home review feedback visibility metrics');
  assertAtLeast(summary.data.metrics.feedback, 1, 'PMS home summary counts open launch feedback issues');
  assertObject(summary.data.riskReportSummary, 'PMS home risk/report aggregate runtime smoke');
  assertAtLeast(summary.data.riskReportSummary.plannedReports, 1, 'PMS home summary counts planned review/report events');
  assertAtLeast(summary.data.riskReportSummary.readyReports, 1, 'PMS home summary counts ready review/report events');
  assertAtLeast(summary.data.riskReportSummary.blockingIssues, 0, 'PMS home summary exposes blocking issue aggregate');
  assertArray(summary.data.signals, 'PMS home review feedback visibility signals');
  assertArray(summary.data.feedbackSignals, 'PMS home review feedback dedicated signals');

  const matchedSignal = summary.data.signals.find((signal) =>
    String(signal?.projectId) === String(projectId)
    && signal?.kind === 'review-feedback-open',
  );
  assertTruthy(matchedSignal, 'PMS home summary exposes saved launch feedback as a review feedback signal');
  assertEquals(matchedSignal.label, '피드백 대기', 'PMS home review feedback signal uses launch-facing label');
  assertEquals(matchedSignal.targetTab, 'review', 'PMS home review feedback signal targets the review tab');
  assertEquals(matchedSignal.primaryAction?.kind, 'review-feedback', 'PMS home review feedback signal primary action opens review feedback');

  const matchedFeedbackSignal = summary.data.feedbackSignals.find((signal) =>
    String(signal?.projectId) === String(projectId)
    && signal?.kind === 'review-feedback-open',
  );
  assertTruthy(matchedFeedbackSignal, 'PMS home summary exposes saved launch feedback in the dedicated feedback queue');
  assertEquals(matchedFeedbackSignal.targetTab, 'review', 'PMS home dedicated feedback signal targets the review tab');
  assertEquals(
    matchedFeedbackSignal.primaryAction?.kind,
    'review-feedback',
    'PMS home dedicated feedback signal primary action opens review feedback',
  );
}

async function verifyMasterImport(accessToken) {
  const suffix = Date.now().toString(36);
  const siteCode = `VERIFY-IMPORT-SITE-${suffix}`;
  const catalogCode = `VERIFY-IMPORT-CATALOG-${suffix}`;
  const instanceACode = `VERIFY-IMPORT-INST-A-${suffix}`;
  const instanceBCode = `VERIFY-IMPORT-INST-B-${suffix}`;
  const integrationCode = `VERIFY-IMPORT-INT-${suffix}`;
  let siteId = '';
  let catalogId = '';
  let instanceAId = '';
  let instanceBId = '';
  let integrationId = '';

  const importBody = {
    options: {
      updateExisting: false,
      reactivateExisting: false,
    },
    sites: [{
      siteCode,
      siteName: `Verify Import Site ${suffix}`,
      siteTypeCode: 'verify',
      regionCode: 'KR',
      timezone: 'Asia/Seoul',
      operationOwnerName: 'PMS launch import verifier',
    }],
    systemCatalogs: [{
      catalogCode,
      catalogName: `Verify Import Catalog ${suffix}`,
      categoryCode: 'verify',
      vendorName: 'SSOO',
    }],
    systemInstances: [
      {
        instanceCode: instanceACode,
        instanceName: `Verify Import Instance A ${suffix}`,
        siteCode,
        systemCatalogCode: catalogCode,
        environmentCode: 'verify',
        lifecycleStatusCode: 'active',
      },
      {
        instanceCode: instanceBCode,
        instanceName: `Verify Import Instance B ${suffix}`,
        siteCode,
        systemCatalogCode: catalogCode,
        environmentCode: 'verify',
        lifecycleStatusCode: 'active',
      },
    ],
    integrations: [{
      integrationCode,
      integrationName: `Verify Import Integration ${suffix}`,
      sourceSystemInstanceCode: instanceACode,
      targetSystemInstanceCode: instanceBCode,
      directionCode: 'source_to_target',
      interfaceTypeCode: 'api',
      statusCode: 'active',
    }],
  };

  try {
    const preview = await apiJson('/master/import', {
      method: 'POST',
      accessToken,
      body: {
        ...importBody,
        mode: 'preview',
      },
      label: 'PMS master import preview smoke',
    });
    assertEquals(preview.data?.applied, false, 'PMS master import preview does not apply data');
    assertEquals(preview.data?.summary?.total, 5, 'PMS master import preview covers all rows');
    assertEquals(preview.data?.summary?.create, 5, 'PMS master import preview plans creates');
    assertEquals(preview.data?.summary?.error, 0, 'PMS master import preview has no errors');

    const applied = await apiJson('/master/import', {
      method: 'POST',
      accessToken,
      body: {
        ...importBody,
        mode: 'apply',
      },
      label: 'PMS master import apply smoke',
    });
    assertEquals(applied.data?.applied, true, 'PMS master import apply reports applied');
    assertEquals(applied.data?.summary?.create, 5, 'PMS master import apply creates all rows');
    assertEquals(applied.data?.summary?.error, 0, 'PMS master import apply has no errors');

    const merged = await apiJson('/master/import', {
      method: 'POST',
      accessToken,
      body: {
        ...importBody,
        mode: 'apply',
        options: {
          updateExisting: true,
          reactivateExisting: true,
        },
        sites: [{ ...importBody.sites[0], siteName: `Verify Import Site ${suffix} Updated` }],
        systemCatalogs: [{ ...importBody.systemCatalogs[0], catalogName: `Verify Import Catalog ${suffix} Updated` }],
        systemInstances: importBody.systemInstances.map((row, index) => ({
          ...row,
          instanceName: `Verify Import Instance ${index === 0 ? 'A' : 'B'} ${suffix} Updated`,
        })),
        integrations: [{ ...importBody.integrations[0], integrationName: `Verify Import Integration ${suffix} Updated` }],
      },
      label: 'PMS master import merge smoke',
    });
    assertEquals(merged.data?.applied, true, 'PMS master import merge reports applied');
    assertEquals(merged.data?.summary?.update, 5, 'PMS master import merge updates all rows');
    assertEquals(merged.data?.summary?.error, 0, 'PMS master import merge has no errors');

    const importedSites = await assertArrayEndpoint(
      `/master/sites?search=${encodeURIComponent(siteCode)}&includeInactive=true&limit=20`,
      accessToken,
      'PMS master import site lookup smoke',
    );
    const importedCatalogs = await assertArrayEndpoint(
      `/master/system-catalogs?search=${encodeURIComponent(catalogCode)}&includeInactive=true&limit=20`,
      accessToken,
      'PMS master import catalog lookup smoke',
    );
    const importedInstancesA = await assertArrayEndpoint(
      `/master/system-instances?search=${encodeURIComponent(instanceACode)}&includeInactive=true&limit=20`,
      accessToken,
      'PMS master import instance A lookup smoke',
    );
    const importedInstancesB = await assertArrayEndpoint(
      `/master/system-instances?search=${encodeURIComponent(instanceBCode)}&includeInactive=true&limit=20`,
      accessToken,
      'PMS master import instance B lookup smoke',
    );
    const importedIntegrations = await assertArrayEndpoint(
      `/master/integrations?search=${encodeURIComponent(integrationCode)}&includeInactive=true&limit=20`,
      accessToken,
      'PMS master import integration lookup smoke',
    );

    const site = importedSites.find((row) => row?.siteCode === siteCode);
    const catalog = importedCatalogs.find((row) => row?.catalogCode === catalogCode);
    const instanceA = importedInstancesA.find((row) => row?.instanceCode === instanceACode);
    const instanceB = importedInstancesB.find((row) => row?.instanceCode === instanceBCode);
    const integration = importedIntegrations.find((row) => row?.integrationCode === integrationCode);
    siteId = String(site?.siteId ?? '');
    catalogId = String(catalog?.systemCatalogId ?? '');
    instanceAId = String(instanceA?.systemInstanceId ?? '');
    instanceBId = String(instanceB?.systemInstanceId ?? '');
    integrationId = String(integration?.integrationId ?? '');
    assertEquals(site?.siteName, `Verify Import Site ${suffix} Updated`, 'PMS master import merge changed site name');
    assertEquals(catalog?.catalogName, `Verify Import Catalog ${suffix} Updated`, 'PMS master import merge changed catalog name');
    assertTruthy(instanceAId, 'PMS master import created instance A');
    assertTruthy(instanceBId, 'PMS master import created instance B');
    assertTruthy(integrationId, 'PMS master import created integration');
  } finally {
    await deactivateIfPresent(`/master/integrations/${integrationId}`, accessToken, 'PMS master import integration cleanup');
    await deactivateIfPresent(`/master/system-instances/${instanceBId}`, accessToken, 'PMS master import instance B cleanup');
    await deactivateIfPresent(`/master/system-instances/${instanceAId}`, accessToken, 'PMS master import instance A cleanup');
    await deactivateIfPresent(`/master/system-catalogs/${catalogId}`, accessToken, 'PMS master import catalog cleanup');
    await deactivateIfPresent(`/master/sites/${siteId}`, accessToken, 'PMS master import site cleanup');
  }
}

async function verifyMasterImportProfiles(accessToken) {
  const suffix = Date.now().toString(36);
  const profileName = `Verify Import Profile ${suffix}`;
  let profileId = '';

  try {
    const created = await apiJson('/master/import-profiles', {
      method: 'POST',
      accessToken,
      body: {
        entityType: 'sites',
        profileName,
        columnMapping: {
          siteCode: 'site_code',
          siteName: 'site_name',
          memo: 'memo',
        },
        isDefault: true,
      },
      label: 'PMS master shared import profile create smoke',
    });
    profileId = String(created.data?.profileId ?? '');
    assertTruthy(profileId, 'PMS master shared import profile create returns profileId');
    assertEquals(created.data?.entityType, 'sites', 'PMS master shared import profile stores entity type');
    assertEquals(created.data?.isDefault, true, 'PMS master shared import profile can be default');
    assertEquals(created.data?.columnMapping?.siteCode, 'site_code', 'PMS master shared import profile stores mapping');

    const listed = await apiJson('/master/import-profiles?entityType=sites', {
      accessToken,
      label: 'PMS master shared import profile list smoke',
    });
    assertArray(listed.data, 'PMS master shared import profile list returns array');
    const listedProfile = listed.data.find((row) => row?.profileId === profileId);
    assertTruthy(listedProfile, 'PMS master shared import profile list includes created profile');

    const updated = await apiJson(`/master/import-profiles/${profileId}`, {
      method: 'PUT',
      accessToken,
      body: {
        profileName: `${profileName} Updated`,
        columnMapping: {
          siteCode: 'Site Code',
          siteName: 'Site Name',
          operationOwnerName: 'Owner',
        },
        isDefault: false,
      },
      label: 'PMS master shared import profile update smoke',
    });
    assertEquals(updated.data?.profileName, `${profileName} Updated`, 'PMS master shared import profile update changes name');
    assertEquals(updated.data?.isDefault, false, 'PMS master shared import profile update can clear default');
    assertEquals(updated.data?.columnMapping?.operationOwnerName, 'Owner', 'PMS master shared import profile update changes mapping');

    const history = await apiJson(`/master/import-profiles/${profileId}/history`, {
      accessToken,
      label: 'PMS master shared import profile history list smoke',
    });
    assertArray(history.data, 'PMS master shared import profile history list returns array');
    const createdHistory = history.data.find((row) => row?.eventType === 'C');
    assertTruthy(createdHistory?.historySeq, 'PMS master shared import profile history includes create snapshot');
    assertEquals(createdHistory?.columnMapping?.memo, 'memo', 'PMS master shared import profile history stores mapping snapshot');

    const restored = await apiJson(`/master/import-profiles/${profileId}/restore`, {
      method: 'POST',
      accessToken,
      body: {
        historySeq: String(createdHistory.historySeq),
      },
      label: 'PMS master shared import profile restore smoke',
    });
    assertEquals(restored.data?.profileName, profileName, 'PMS master shared import profile restore changes name');
    assertEquals(restored.data?.isDefault, true, 'PMS master shared import profile restore changes default flag');
    assertEquals(restored.data?.columnMapping?.memo, 'memo', 'PMS master shared import profile restore changes mapping');
  } finally {
    if (profileId) {
      await deactivateIfPresent(
        `/master/import-profiles/${profileId}`,
        accessToken,
        'PMS master shared import profile cleanup',
      );
    }
  }
}

async function verifyMasterCrud(accessToken) {
  const suffix = Date.now().toString(36);
  let siteId = '';
  let catalogId = '';
  let instanceAId = '';
  let instanceBId = '';
  let integrationId = '';

  try {
    const site = await apiJson('/master/sites', {
      method: 'POST',
      accessToken,
      body: {
        siteCode: `VERIFY-SITE-${suffix}`,
        siteName: `Verify Site ${suffix}`,
        siteTypeCode: 'verify',
        regionCode: 'KR',
        timezone: 'Asia/Seoul',
        operationOwnerName: 'PMS launch verifier',
      },
      label: 'PMS plant/site master create smoke',
    });
    siteId = String(site.data?.siteId ?? '');
    assertTruthy(siteId, 'PMS plant/site master create returns siteId');

    const updatedSite = await apiJson(`/master/sites/${siteId}`, {
      method: 'PUT',
      accessToken,
      body: {
        siteName: `Verify Site ${suffix} Updated`,
        siteTypeCode: 'verify',
        regionCode: 'KR',
        timezone: 'Asia/Seoul',
        operationOwnerName: 'PMS launch verifier updated',
      },
      label: 'PMS plant/site master update smoke',
    });
    assertEquals(updatedSite.data?.siteName, `Verify Site ${suffix} Updated`, 'PMS plant/site master update returns changed name');

    const catalog = await apiJson('/master/system-catalogs', {
      method: 'POST',
      accessToken,
      body: {
        catalogCode: `VERIFY-CATALOG-${suffix}`,
        catalogName: `Verify Catalog ${suffix}`,
        categoryCode: 'verify',
        vendorName: 'SSOO',
      },
      label: 'PMS system catalog master create smoke',
    });
    catalogId = String(catalog.data?.systemCatalogId ?? '');
    assertTruthy(catalogId, 'PMS system catalog master create returns systemCatalogId');

    const updatedCatalog = await apiJson(`/master/system-catalogs/${catalogId}`, {
      method: 'PUT',
      accessToken,
      body: {
        catalogName: `Verify Catalog ${suffix} Updated`,
        categoryCode: 'verify',
        vendorName: 'SSOO',
      },
      label: 'PMS system catalog master update smoke',
    });
    assertEquals(updatedCatalog.data?.catalogName, `Verify Catalog ${suffix} Updated`, 'PMS system catalog master update returns changed name');

    const instanceA = await apiJson('/master/system-instances', {
      method: 'POST',
      accessToken,
      body: {
        instanceCode: `VERIFY-INST-A-${suffix}`,
        instanceName: `Verify Instance A ${suffix}`,
        siteId,
        systemCatalogId: catalogId,
        environmentCode: 'verify',
        lifecycleStatusCode: 'active',
      },
      label: 'PMS system instance A master create smoke',
    });
    instanceAId = String(instanceA.data?.systemInstanceId ?? '');
    assertTruthy(instanceAId, 'PMS system instance A master create returns systemInstanceId');

    const updatedInstance = await apiJson(`/master/system-instances/${instanceAId}`, {
      method: 'PUT',
      accessToken,
      body: {
        instanceName: `Verify Instance A ${suffix} Updated`,
        siteId,
        systemCatalogId: catalogId,
        environmentCode: 'verify',
        lifecycleStatusCode: 'active',
      },
      label: 'PMS system instance master update smoke',
    });
    assertEquals(updatedInstance.data?.instanceName, `Verify Instance A ${suffix} Updated`, 'PMS system instance master update returns changed name');

    const instanceB = await apiJson('/master/system-instances', {
      method: 'POST',
      accessToken,
      body: {
        instanceCode: `VERIFY-INST-B-${suffix}`,
        instanceName: `Verify Instance B ${suffix}`,
        siteId,
        systemCatalogId: catalogId,
        environmentCode: 'verify',
        lifecycleStatusCode: 'active',
      },
      label: 'PMS system instance B master create smoke',
    });
    instanceBId = String(instanceB.data?.systemInstanceId ?? '');
    assertTruthy(instanceBId, 'PMS system instance B master create returns systemInstanceId');

    const integration = await apiJson('/master/integrations', {
      method: 'POST',
      accessToken,
      body: {
        integrationCode: `VERIFY-INT-${suffix}`,
        integrationName: `Verify Integration ${suffix}`,
        sourceSystemInstanceId: instanceAId,
        targetSystemInstanceId: instanceBId,
        directionCode: 'source_to_target',
        interfaceTypeCode: 'api',
        statusCode: 'active',
      },
      label: 'PMS integration master create smoke',
    });
    integrationId = String(integration.data?.integrationId ?? '');
    assertTruthy(integrationId, 'PMS integration master create returns integrationId');

    const updatedIntegration = await apiJson(`/master/integrations/${integrationId}`, {
      method: 'PUT',
      accessToken,
      body: {
        integrationName: `Verify Integration ${suffix} Updated`,
        sourceSystemInstanceId: instanceAId,
        targetSystemInstanceId: instanceBId,
        directionCode: 'source_to_target',
        interfaceTypeCode: 'api',
        statusCode: 'active',
      },
      label: 'PMS integration master update smoke',
    });
    assertEquals(updatedIntegration.data?.integrationName, `Verify Integration ${suffix} Updated`, 'PMS integration master update returns changed name');
  } finally {
    await deactivateIfPresent(`/master/integrations/${integrationId}`, accessToken, 'PMS integration master deactivate smoke');
    await deactivateIfPresent(`/master/system-instances/${instanceBId}`, accessToken, 'PMS system instance B master deactivate smoke');
    await deactivateIfPresent(`/master/system-instances/${instanceAId}`, accessToken, 'PMS system instance A master deactivate smoke');
    await deactivateIfPresent(`/master/system-catalogs/${catalogId}`, accessToken, 'PMS system catalog master deactivate smoke');
    await deactivateIfPresent(`/master/sites/${siteId}`, accessToken, 'PMS plant/site master deactivate smoke');
  }
}

async function verifyProjectAssetAnchorLifecycle(accessToken, masterSites, masterInstances) {
  const instance = masterInstances.find((item) => item?.systemInstanceId && item?.siteId)
    ?? masterInstances.find((item) => item?.systemInstanceId);
  const site = instance?.siteId
    ? masterSites.find((item) => String(item?.siteId) === String(instance.siteId))
    : masterSites[0];
  if (!site?.siteId || !instance?.systemInstanceId) {
    throw new Error('PMS runtime smoke requires a site and system instance for project asset anchor create/update');
  }

  const customerId = instance.customerId ?? site.customerId ?? undefined;
  const suffix = Date.now().toString(36);
  let projectId = '';

  try {
    const created = await apiJson('/projects', {
      method: 'POST',
      accessToken,
      body: {
        projectName: `Verify Asset Anchor Project ${suffix}`,
        statusCode: 'request',
        stageCode: 'waiting',
        ...(customerId ? { customerId: String(customerId) } : {}),
        plantId: String(site.siteId),
        systemInstanceId: String(instance.systemInstanceId),
        description: 'PMS launch runtime smoke project asset anchor fixture',
      },
      label: 'PMS project asset anchor create smoke',
    });
    projectId = String(created.data?.id ?? '');
    assertTruthy(projectId, 'PMS project asset anchor create returns project id');
    assertEquals(String(created.data?.plantId), String(site.siteId), 'PMS project create stores plantId');
    assertEquals(created.data?.plantSiteCode, site.siteCode, 'PMS project create returns plant/site code metadata');
    assertEquals(created.data?.plantSiteName, site.siteName, 'PMS project create returns plant/site name metadata');
    assertEquals(
      String(created.data?.systemInstanceId),
      String(instance.systemInstanceId),
      'PMS project create stores systemInstanceId',
    );
    assertEquals(
      created.data?.systemInstanceCode,
      instance.instanceCode,
      'PMS project create returns system instance code metadata',
    );
    assertEquals(
      created.data?.systemInstanceName,
      instance.instanceName,
      'PMS project create returns system instance name metadata',
    );

    const updated = await apiJson(`/projects/${projectId}`, {
      method: 'PUT',
      accessToken,
      body: {
        projectName: `Verify Asset Anchor Project ${suffix} Updated`,
        ...(customerId ? { customerId: String(customerId) } : {}),
        plantId: String(site.siteId),
        systemInstanceId: String(instance.systemInstanceId),
        description: 'PMS launch runtime smoke project asset anchor fixture updated',
      },
      label: 'PMS project asset anchor update smoke',
    });
    assertEquals(updated.data?.projectName, `Verify Asset Anchor Project ${suffix} Updated`, 'PMS project asset anchor update returns changed name');
    assertEquals(String(updated.data?.plantId), String(site.siteId), 'PMS project update stores plantId');
    assertEquals(updated.data?.plantSiteCode, site.siteCode, 'PMS project update returns plant/site code metadata');
    assertEquals(
      String(updated.data?.systemInstanceId),
      String(instance.systemInstanceId),
      'PMS project update stores systemInstanceId',
    );
    assertEquals(
      updated.data?.systemInstanceCode,
      instance.instanceCode,
      'PMS project update returns system instance code metadata',
    );

    const detail = await apiJson(`/projects/${projectId}`, {
      accessToken,
      label: 'PMS project asset anchor detail smoke',
    });
    assertEquals(detail.data?.plantSiteCode, site.siteCode, 'PMS project detail returns plant/site code metadata');
    assertEquals(
      detail.data?.systemInstanceCode,
      instance.instanceCode,
      'PMS project detail returns system instance code metadata',
    );
  } finally {
    if (projectId) {
      await tryApiJson(`/projects/${projectId}`, {
        method: 'DELETE',
        accessToken,
        label: 'PMS project asset anchor fixture delete',
        allowFailure: true,
      });
    }
  }
}

async function verifyProjectCustomerOrganizationAnchorLifecycle(accessToken, anchoredCustomer) {
  const suffix = Date.now().toString(36);
  let projectId = '';

  try {
    const created = await apiJson('/projects', {
      method: 'POST',
      accessToken,
      body: {
        projectName: `Verify Customer Organization Project ${suffix}`,
        statusCode: 'request',
        stageCode: 'waiting',
        customerId: String(anchoredCustomer.id),
        description: 'PMS launch runtime smoke customer organization anchor fixture',
      },
      label: 'PMS project customer organization anchor create smoke',
    });
    projectId = String(created.data?.id ?? '');
    assertTruthy(projectId, 'PMS project customer organization anchor create returns project id');
    assertEquals(
      String(created.data?.customerId),
      String(anchoredCustomer.id),
      'PMS project create stores customerId for organization anchor smoke',
    );
    assertEquals(
      created.data?.customerCode,
      anchoredCustomer.customerCode,
      'PMS project create returns customer code metadata',
    );
    assertEquals(
      String(created.data?.customerOrganizationId),
      String(anchoredCustomer.organizationId),
      'PMS project create returns customer common organization id',
    );
    assertEquals(
      created.data?.customerOrganizationCode,
      anchoredCustomer.organizationCode,
      'PMS project create returns customer common organization code',
    );

    const detail = await apiJson(`/projects/${projectId}`, {
      accessToken,
      label: 'PMS project customer organization anchor detail smoke',
    });
    assertEquals(
      detail.data?.customerCode,
      anchoredCustomer.customerCode,
      'PMS project detail returns customer code metadata',
    );
    assertEquals(
      String(detail.data?.customerOrganizationId),
      String(anchoredCustomer.organizationId),
      'PMS project detail returns customer common organization id',
    );
    assertEquals(
      detail.data?.customerOrganizationCode,
      anchoredCustomer.organizationCode,
      'PMS project detail returns customer common organization code',
    );
  } finally {
    if (projectId) {
      await tryApiJson(`/projects/${projectId}`, {
        method: 'DELETE',
        accessToken,
        label: 'PMS project customer organization anchor fixture delete',
        allowFailure: true,
      });
    }
  }
}

async function deactivateIfPresent(path, accessToken, label) {
  if (path.endsWith('/')) return;
  await tryApiJson(path, {
    method: 'DELETE',
    accessToken,
    label,
    allowFailure: true,
  });
}

async function assertArrayEndpoint(path, accessToken, label) {
  const response = await apiJson(path, { accessToken, label });
  if (!Array.isArray(response.data)) {
    throw new Error(`PMS readiness runtime check failed: ${label} did not return an array`);
  }
  return response.data;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`PMS readiness runtime check failed: ${label} did not return an array`);
  }
}

async function apiJson(path, options = {}) {
  const response = await tryApiJson(path, options);
  if (!response) {
    throw new Error(`PMS readiness runtime check failed: ${options.label ?? path}`);
  }
  return response;
}

async function tryApiJson(path, options = {}) {
  const method = options.method ?? 'GET';
  const headers = {
    accept: 'application/json',
    'x-ssoo-app': 'pms',
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
  };
  const url = toApiUrl(path);
  const response = await safeFetch(url, {
    method,
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await readJsonResponse(response);
  if (response.status < 200 || response.status >= 300 || payload?.success === false) {
    if (options.allowFailure) {
      return null;
    }
    const message = payload?.error?.message ?? payload?.message ?? response.statusText;
    throw new Error(`PMS readiness runtime check failed: ${options.label ?? path} (HTTP ${response.status}: ${message})`);
  }
  return payload;
}

async function apiJsonExpectFailure(path, options = {}) {
  const method = options.method ?? 'GET';
  const headers = {
    accept: 'application/json',
    'x-ssoo-app': 'pms',
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
  };
  const response = await safeFetch(toApiUrl(path), {
    method,
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await readJsonResponse(response);
  assertEquals(response.status, options.expectedStatus, `${options.label} HTTP status`);
  assertObject(payload, `${options.label} payload`);
  assertEquals(payload.success, false, `${options.label} success flag`);
  assertObject(payload.error, `${options.label} error object`);
  assertEquals(payload.error.code, options.expectedCode, `${options.label} error code`);
  assertEquals(payload.error.statusCode, options.expectedStatus, `${options.label} error status metadata`);
  assertTruthy(payload.error.path, `${options.label} error path`);
  return payload;
}

function toApiUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${config.apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`PMS readiness runtime check failed: expected JSON from ${response.url}`);
  }
}

async function fetchRaw(url) {
  const response = await safeFetch(url);
  await response.arrayBuffer();
  return { status: response.status };
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(`PMS readiness runtime check failed: fetch ${url} (${error.message})`);
  }
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`required file missing: ${path} (${error.message})`);
  }
}

async function assertMissingPath(path, label) {
  try {
    await stat(path);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw new Error(`PMS readiness check failed: ${label} (${error.message})`);
  }
  throw new Error(`PMS readiness check failed: ${label}`);
}

function assertIncludes(content, needle, label) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedNeedle = needle.replace(/\r\n/g, '\n');
  if (!normalizedContent.includes(normalizedNeedle)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertNotIncludes(content, needle, label) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedNeedle = needle.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(normalizedNeedle)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertNotMatches(content, pattern, label) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  if (pattern.test(normalizedContent)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertNoNativeBrowserDialogs(content, label) {
  assertNotIncludes(content, 'window.alert', `${label} must not use native browser alert`);
  assertNotIncludes(content, 'window.confirm', `${label} must not use native browser confirm`);
  assertNotMatches(content, /\balert\s*\(/, `${label} must not use native browser alert calls`);
  assertNotMatches(content, /\bconfirm\s*\(\s*['"`]/, `${label} must not use string-based native browser confirm calls`);
}

function assertIncludesAll(content, needles, label) {
  for (const needle of needles) {
    assertIncludes(content, needle, `${label}: missing ${needle}`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertEquals(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertAtLeast(actual, expectedMinimum, label) {
  if (typeof actual !== 'number' || actual < expectedMinimum) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertActiveCode(codes, codeGroup, codeValue, label) {
  const matched = codes.some(
    (code) =>
      code
      && code.codeGroup === codeGroup
      && code.codeValue === codeValue
      && code.isActive === true,
  );
  if (!matched) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

function assertType(value, expectedType, label) {
  if (typeof value !== expectedType) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
