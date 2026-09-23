#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function assertIncludes(content, pattern, message) {
  if (!content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, pattern, message) {
  if (content.includes(pattern)) {
    throw new Error(message);
  }
}

const requiredFiles = [
  'packages/types/src/common/ai.ts',
  'packages/types/src/common/ai-index.ts',
  'packages/types/src/common/ai-retrieval.ts',
  'packages/types/src/common/search.ts',
  'packages/types/src/crm/access.ts',
  'packages/types/src/crm/business-plan.ts',
  'packages/types/src/crm/contract.ts',
  'packages/types/src/crm/cost-plan.ts',
  'packages/types/src/crm/customer.ts',
  'packages/types/src/crm/index.ts',
  'packages/types/src/crm/opportunity.ts',
  'packages/types/src/crm/quote.ts',
  'packages/types/src/dms/template.ts',
  'packages/types/src/dms/crm-contract-lifecycle.ts',
  'packages/types/src/dms/crm-quote-lifecycle.ts',
  'packages/types/src/dms/index.ts',
  'packages/types/src/pms/project.ts',
  'packages/types/src/pms/task.ts',
  'packages/types/src/pms/index.ts',
  'packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql',
  'packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql',
  'packages/database/prisma/migrations/20260702090000_add_crm_opportunity_ledger/migration.sql',
  'packages/database/prisma/migrations/20260708110000_add_crm_business_plan_monthly_input/migration.sql',
  'packages/database/prisma/migrations/20260708123000_add_crm_cost_plan_internal_monthly/migration.sql',
  'packages/database/prisma/migrations/20260708133000_add_crm_cost_plan_ams_vendor_wbs_mapping/migration.sql',
  'packages/database/prisma/migrations/20260708143000_add_crm_cost_plan_ams_external_monthly/migration.sql',
  'packages/database/prisma/migrations/20260708150000_add_crm_cost_plan_internal_confirmation/migration.sql',
  'packages/database/prisma/migrations/20260708160000_add_crm_cost_plan_ams_external_confirmation/migration.sql',
  'packages/database/prisma/migrations/20260709100000_add_crm_business_plan_performance_actual/migration.sql',
  'packages/database/prisma/migrations/20260709120000_add_crm_contract_dms_handoff/migration.sql',
  'packages/database/prisma/migrations/20260709133000_add_crm_cost_plan_accounting_handoff/migration.sql',
  'packages/database/prisma/migrations/20260709143000_add_crm_cost_plan_accounting_execution_evidence/migration.sql',
  'packages/database/prisma/migrations/20260710100000_add_crm_quote_dms_handoff/migration.sql',
  'packages/database/prisma/triggers/63_cm_ai_source_h_trigger.sql',
  'packages/database/prisma/triggers/64_cm_ai_object_h_trigger.sql',
  'packages/database/prisma/triggers/65_cm_ai_index_state_h_trigger.sql',
  'packages/database/prisma/triggers/66_crm_opportunity_h_trigger.sql',
  'packages/database/prisma/triggers/67_crm_opportunity_line_h_trigger.sql',
  'packages/database/prisma/seeds/18_crm_access_policy_foundation.sql',
  'packages/database/prisma/seeds/21_demo_project_statuses.sql',
  'packages/database/prisma/seeds/52_crm_opportunities.sql',
  'scripts/db-init-entrypoint.sh',
  'apps/server/src/modules/common/ai-index/ai-index.module.ts',
  'apps/server/src/modules/common/ai-index/ai-azure-provider.ts',
  'apps/server/src/modules/common/ai-index/ai-azure-provider.spec.ts',
  'apps/server/src/modules/common/ai-index/ai-conversation.service.ts',
  'apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts',
  'apps/server/src/modules/common/ai-index/ai-index-projection.validator.ts',
  'apps/server/src/modules/common/ai-index/ai-index-projection.validator.spec.ts',
  'apps/server/src/modules/common/ai-index/ai-index-scheduler.service.ts',
  'apps/server/src/modules/common/ai-index/ai-index-scheduler.service.spec.ts',
  'apps/server/src/modules/common/ai-index/ai-indexing.service.ts',
  'apps/server/src/modules/common/ai-index/ai-indexing.service.spec.ts',
  'apps/server/src/modules/common/ai-index/ai-index-worker.service.ts',
  'apps/server/src/modules/common/ai-index/ai-index-worker.service.spec.ts',
  'apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts',
  'apps/server/src/modules/common/ai-index/ai-retrieval.service.ts',
  'apps/server/src/modules/common/search/search-utils.ts',
  'apps/server/src/modules/common/search/search.controller.ts',
  'apps/server/src/modules/dms/ask/ask.module.ts',
  'apps/server/src/modules/dms/ask/ask.service.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.controller.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.module.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.spec.ts',
  'apps/server/src/modules/dms/crm-contract-lifecycle/dto/crm-contract-lifecycle.dto.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.controller.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.module.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.spec.ts',
  'apps/server/src/modules/dms/crm-quote-lifecycle/dto/crm-quote-lifecycle.dto.ts',
  'apps/server/src/modules/dms/dms.module.ts',
  'apps/server/src/modules/dms/file/file.module.ts',
  'apps/server/src/modules/dms/runtime/dms-config.service.ts',
  'apps/server/src/modules/dms/search/dms-ai-index.adapter.ts',
  'apps/server/src/modules/dms/templates/template.service.ts',
  'apps/server/src/modules/dms/templates/template.types.ts',
  'apps/server/src/modules/dms/templates/templates.controller.ts',
  'apps/server/src/modules/crm/access/access.module.ts',
  'apps/server/src/modules/crm/access/access.service.ts',
  'apps/server/src/modules/crm/access/access.service.spec.ts',
  'apps/server/src/modules/crm/access/crm-customer-feature.guard.ts',
  'apps/server/src/modules/crm/access/crm-opportunity-feature.guard.ts',
  'apps/server/src/modules/crm/access/require-crm-customer-feature.decorator.ts',
  'apps/server/src/modules/crm/access/require-crm-opportunity-feature.decorator.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.controller.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.service.ts',
  'apps/server/src/modules/crm/business-plan/business-plan.service.spec.ts',
  'apps/server/src/modules/crm/business-plan/dto/business-plan.dto.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.controller.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.service.ts',
  'apps/server/src/modules/crm/cost-plan/cost-plan.service.spec.ts',
  'apps/server/src/modules/crm/cost-plan/dto/cost-plan.dto.ts',
  'apps/server/src/modules/crm/customer/customer.controller.ts',
  'apps/server/src/modules/crm/customer/customer.service.ts',
  'apps/server/src/modules/crm/customer/customer.service.spec.ts',
  'apps/server/src/modules/crm/contract/contract.controller.ts',
  'apps/server/src/modules/crm/contract/contract.service.ts',
  'apps/server/src/modules/crm/contract/contract.service.spec.ts',
  'apps/server/src/modules/crm/contract/dto/contract.dto.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.service.ts',
  'apps/server/src/modules/crm/opportunity/opportunity.service.spec.ts',
  'apps/server/src/modules/crm/reports/reports.controller.ts',
  'apps/server/src/modules/crm/reports/reports.service.ts',
  'apps/server/src/modules/crm/reports/reports.service.spec.ts',
  'apps/server/src/modules/crm/reports/dto/reports.dto.ts',
  'apps/web/crm/src/app/api/crm/opportunities/access/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/access/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/history/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/quote-preview/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-draft/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-execution-evidence/route.ts',
  'apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-lifecycle-execution/route.ts',
  'apps/web/crm/src/app/api/crm/customers/access/route.ts',
  'apps/web/crm/src/app/api/crm/customers/[id]/access/route.ts',
  'apps/web/crm/src/app/api/crm/business-plan/plans/carry-forward/route.ts',
  'apps/web/crm/src/app/api/crm/business-plan/plans/[id]/lines/[lineId]/monthly-plan/route.ts',
  'apps/web/crm/src/app/api/crm/business-plan/performance-preview/route.ts',
  'apps/web/crm/src/app/api/crm/business-plan/performance-actual/monthly/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/[id]/confirm/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/[id]/reopen/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/ams/vendor-wbs/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/[id]/confirm/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/[id]/reopen/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-preview/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoff/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execute/route.ts',
  'apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execution-evidence/route.ts',
  'apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-draft/route.ts',
  'apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-lifecycle-execution/route.ts',
  'apps/web/crm/src/app/api/crm/reports/confirm/route.ts',
  'apps/web/crm/src/app/api/crm/reports/confirmations/[id]/reopen/route.ts',
  'apps/web/crm/src/components/pages/business-plan/BusinessPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/business-plan/businessPlanPreviewFallback.ts',
  'apps/web/crm/src/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/business-plan-performance/businessPlanPerformancePreviewFallback.ts',
  'apps/web/crm/src/components/pages/cost-plan/CostPlanPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/cost-plan/costPlanPreviewFallback.ts',
  'apps/web/crm/src/components/pages/reports/ReportsPreviewWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/reports/reportsPreviewFallback.ts',
  'apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx',
  'apps/web/crm/src/components/pages/customers/CustomerWorkspaceClient.tsx',
  'apps/web/dms/src/app/api/templates/[id]/review-confirmation/route.ts',
  'apps/web/dms/src/components/pages/settings/SettingsPage.tsx',
  'apps/web/dms/src/components/pages/settings/_components/ApprovalRoutePolicySection.tsx',
  'apps/web/dms/src/components/pages/settings/_components/ContractExportPolicySection.tsx',
  'apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx',
  'apps/web/dms/src/components/pages/settings/_components/TemplateSection.tsx',
  'apps/web/dms/src/components/pages/settings/_config/settingsPageConfig.ts',
  'apps/web/dms/src/lib/api/settingsApi.ts',
  'apps/web/dms/src/lib/api/templateApi.ts',
  'apps/server/src/modules/crm/search/search.module.ts',
  'apps/server/src/modules/crm/search/crm-ai-index.adapter.ts',
  'apps/server/src/modules/crm/search/crm-ai-index.adapter.spec.ts',
  'apps/server/src/modules/pms/project/project.controller.ts',
  'apps/server/src/modules/pms/project/project-handoff-contract.service.ts',
  'apps/server/src/modules/pms/project/project-handoff-contract.service.spec.ts',
  'apps/server/src/modules/pms/project/project.module.ts',
  'apps/server/src/modules/pms/project/project.service.ts',
  'apps/server/src/modules/pms/project/project.service.spec.ts',
  'apps/server/src/modules/pms/search/pms-ai-index.adapter.ts',
  'apps/server/src/modules/pms/search/pms-ai-index.adapter.spec.ts',
  'apps/server/src/modules/pms/task/task.controller.ts',
  'apps/server/src/modules/pms/task/task.module.ts',
  'apps/server/src/modules/pms/task/task.service.ts',
  'apps/server/src/modules/pms/task/task.service.spec.ts',
  'apps/web/pms/src/components/pages/project/tabs/HandoffsTab.tsx',
  'apps/web/pms/src/hooks/queries/useProjects.ts',
  'apps/web/pms/src/lib/api/endpoints/projects.ts',
  'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
  'docs/common/guides/ai-rag-runtime-runbook.md',
  '.github/workflows/ai-rag-runtime.yml',
  'compose.yaml',
  'scripts/verify-ai-rag-central-foundation.mjs',
  'scripts/verify-ai-rag-runtime-smoke.mjs',
  'scripts/verify-pms-ai-rag-runtime-evidence.mjs',
  'scripts/complete-pms-ai-rag-provider-ready.mjs',
  'scripts/record-pms-ai-rag-provider-ready-evidence.mjs',
  'scripts/verify-crm-ai-rag-runtime-evidence.mjs',
  'scripts/verify-crm-launch-readiness.mjs',
  'scripts/verify-ai-rag-runtime-report.mjs',
  'scripts/record-ai-rag-provider-ready-evidence.mjs',
  'scripts/complete-ai-rag-central-foundation.mjs',
];

for (const file of requiredFiles) {
  readText(file);
}

const commonTypesIndex = readText('packages/types/src/common/index.ts');
assertIncludes(commonTypesIndex, "from './ai'", 'common types index must export AI conversation contracts');
assertIncludes(commonTypesIndex, "from './ai-index'", 'common types index must export AI index contracts');
assertIncludes(commonTypesIndex, "from './ai-retrieval'", 'common types index must export AI retrieval contracts');
assertIncludes(commonTypesIndex, 'AiLegacyRetrievalRequest', 'common types index must expose explicit legacy AI retrieval aliases');
assertIncludes(commonTypesIndex, 'CommonAiRetrievalRequest', 'common types index must expose explicit common AI retrieval aliases');
assertIncludes(commonTypesIndex, 'AiIndexSourceRegistrationStatus', 'common type index must export AI index source registration status');
assertIncludes(commonTypesIndex, 'AiIndexJobQueueMetrics', 'common type index must export AI index job queue observability contract');
assertIncludes(commonTypesIndex, 'AiIndexJobSchedulerStatus', 'common type index must export AI index scheduler status contract');

const rootTypesIndex = readText('packages/types/src/index.ts');
assertIncludes(rootTypesIndex, "from './common/ai-index'", 'root types index must export AI index contracts');
assertIncludes(rootTypesIndex, 'AiLegacyRetrievalRequest', 'root types index must expose explicit legacy AI retrieval aliases');
assertIncludes(rootTypesIndex, 'CommonAiRetrievalRequest', 'root types index must expose explicit common AI retrieval aliases');
assertIncludes(rootTypesIndex, 'AiIndexSourceRegistrationStatus', 'root type index must export AI index source registration status');
assertIncludes(rootTypesIndex, 'AiIndexJobQueueMetrics', 'root type index must export AI index job queue observability contract');
assertIncludes(rootTypesIndex, 'AiIndexJobSchedulerStatus', 'root type index must export AI index scheduler status contract');
assertIncludes(rootTypesIndex, 'ProjectAiIndexBackfillRequest', 'root type index must export PMS AI index backfill request');
assertIncludes(rootTypesIndex, 'ProjectAiIndexBackfillResponse', 'root type index must export PMS AI index backfill response');
assertIncludes(rootTypesIndex, 'TaskAiIndexBackfillRequest', 'root type index must export PMS task AI index backfill request');
assertIncludes(rootTypesIndex, 'TaskAiIndexBackfillResponse', 'root type index must export PMS task AI index backfill response');
assertIncludes(rootTypesIndex, 'CrmCustomerAiIndexBackfillRequest', 'root type index must export CRM customer/activity AI index backfill request');
assertIncludes(rootTypesIndex, 'CrmCustomerAiIndexBackfillResponse', 'root type index must export CRM customer/activity AI index backfill response');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleExecutionRequest', 'root type index must export DMS CRM contract lifecycle execution requests');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleExecutionResult', 'root type index must export DMS CRM contract lifecycle execution results');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleGovernance', 'root type index must export DMS CRM contract lifecycle governance evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleAttachmentFinalizationLedger', 'root type index must export DMS CRM contract lifecycle attachment finalization ledger evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleAttachmentFinalizationStatus', 'root type index must export DMS CRM contract lifecycle attachment finalization status');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleApprovalRoute', 'root type index must export DMS CRM contract lifecycle approval route evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleApprovalRouteActor', 'root type index must export DMS CRM contract lifecycle approval route actor evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleApprovalRouteLedger', 'root type index must export DMS CRM contract lifecycle approval route ledger evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus', 'root type index must export DMS CRM contract lifecycle approval route ledger sync status');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleDirectorySyncStatus', 'root type index must export DMS CRM contract lifecycle directory sync status evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractApprovalRoutePolicy', 'root type index must export editable DMS CRM contract approval route policies');
assertIncludes(rootTypesIndex, 'DmsCrmContractExportPolicy', 'root type index must export editable DMS CRM contract export policies');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleExportPolicyRecord', 'root type index must export DMS CRM contract lifecycle export policy evidence');
assertIncludes(rootTypesIndex, 'DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY', 'root type index must export the default DMS CRM contract approval route policy');
assertIncludes(rootTypesIndex, 'DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY', 'root type index must export the default DMS CRM contract export policy');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleTemplateChangeReview', 'root type index must export DMS CRM contract lifecycle template change review evidence');
assertIncludes(rootTypesIndex, 'DmsCrmContractLifecycleTemplateChangeRequestLedger', 'root type index must export DMS CRM contract lifecycle template change request ledger evidence');
assertIncludes(rootTypesIndex, 'DmsCrmQuoteLifecycleExecutionRequest', 'root type index must export DMS CRM quote lifecycle execution requests');
assertIncludes(rootTypesIndex, 'DmsCrmQuoteLifecycleExecutionResult', 'root type index must export DMS CRM quote lifecycle execution results');
assertIncludes(rootTypesIndex, 'DmsCrmQuoteLifecycleGovernance', 'root type index must export DMS CRM quote lifecycle governance evidence');
assertIncludes(rootTypesIndex, 'CrmQuoteSellerCiReferenceStatus', 'root type index must export CRM seller CI reference verification statuses');
assertIncludes(rootTypesIndex, 'CrmContractDmsDocumentLifecycleExecutionRequest', 'root type index must export CRM DMS document lifecycle execution requests');
assertIncludes(rootTypesIndex, 'CrmContractDmsDocumentLifecycleExecutionResult', 'root type index must export CRM DMS document lifecycle execution results');
assertIncludes(rootTypesIndex, 'CrmQuoteDmsDocumentLifecycleExecutionRequest', 'root type index must export CRM quote DMS lifecycle execution requests');
assertIncludes(rootTypesIndex, 'CrmQuoteDmsDocumentLifecycleExecutionResult', 'root type index must export CRM quote DMS lifecycle execution results');

const rootPackageJson = readText('package.json');
assertIncludes(rootPackageJson, '"verify:ai-rag-runtime": "node scripts/verify-ai-rag-runtime-smoke.mjs"', 'root package must expose AI/RAG runtime smoke verifier');
assertIncludes(rootPackageJson, '"verify:pms-ai-rag-runtime": "node scripts/verify-pms-ai-rag-runtime-evidence.mjs"', 'root package must expose PMS AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"verify:pms-ai-rag-runtime:unavailable": "node scripts/verify-pms-ai-rag-runtime-evidence.mjs --provider-mode=unavailable"', 'root package must expose provider-unavailable PMS AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"verify:pms-ai-rag-runtime:ready-precheck": "node scripts/verify-pms-ai-rag-runtime-evidence.mjs --dry-run --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready PMS AI/RAG precheck verifier');
assertIncludes(rootPackageJson, '"verify:pms-ai-rag-runtime:ready": "node scripts/verify-pms-ai-rag-runtime-evidence.mjs --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready PMS AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"record:pms-ai-rag-provider-ready-evidence": "node scripts/record-pms-ai-rag-provider-ready-evidence.mjs"', 'root package must expose PMS AI/RAG provider-ready evidence recorder');
assertIncludes(rootPackageJson, '"verify:pms-ai-rag-evidence-recorder": "node scripts/record-pms-ai-rag-provider-ready-evidence.mjs --self-test"', 'root package must expose PMS AI/RAG provider-ready evidence recorder self-test');
assertIncludes(rootPackageJson, '"complete:pms-ai-rag-provider-ready": "node scripts/complete-pms-ai-rag-provider-ready.mjs"', 'root package must expose PMS AI/RAG provider-ready completion runner');
assertIncludes(rootPackageJson, '"complete:pms-ai-rag-provider-ready:self-test": "node scripts/complete-pms-ai-rag-provider-ready.mjs --self-test"', 'root package must expose PMS AI/RAG provider-ready completion runner self-test');
assertIncludes(rootPackageJson, '"verify:crm-ai-rag-runtime": "node scripts/verify-crm-ai-rag-runtime-evidence.mjs"', 'root package must expose CRM AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"verify:crm-ai-rag-runtime:unavailable": "node scripts/verify-crm-ai-rag-runtime-evidence.mjs --provider-mode=unavailable"', 'root package must expose provider-unavailable CRM AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"verify:crm-ai-rag-runtime:ready-precheck": "node scripts/verify-crm-ai-rag-runtime-evidence.mjs --dry-run --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready CRM AI/RAG precheck verifier');
assertIncludes(rootPackageJson, '"verify:crm-ai-rag-runtime:ready": "node scripts/verify-crm-ai-rag-runtime-evidence.mjs --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready CRM AI/RAG runtime evidence verifier');
assertIncludes(rootPackageJson, '"verify:crm-launch": "pnpm run verify:crm-launch:observed"', 'root package must expose observed CRM launch readiness verifier');
assertIncludes(rootPackageJson, '"verify:crm-launch:raw": "node scripts/verify-crm-launch-readiness.mjs"', 'root package must expose raw CRM launch readiness verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-central-foundation": "node scripts/verify-ai-rag-central-foundation.mjs"', 'root package must expose AI/RAG central foundation verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-central-foundation:complete": "node scripts/verify-ai-rag-central-foundation.mjs --require-provider-ready-report"', 'root package must expose AI/RAG central foundation completion verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-runtime:unavailable": "node scripts/verify-ai-rag-runtime-smoke.mjs --provider-mode=unavailable"', 'root package must expose provider-unavailable AI/RAG runtime smoke verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-runtime:ready-precheck": "node scripts/verify-ai-rag-runtime-smoke.mjs --dry-run --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready AI/RAG precheck verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-runtime:ready": "node scripts/verify-ai-rag-runtime-smoke.mjs --provider-mode=ready --check-provider-env"', 'root package must expose provider-ready AI/RAG runtime smoke verifier');
assertIncludes(rootPackageJson, '"verify:ai-rag-runtime-report": "node scripts/verify-ai-rag-runtime-report.mjs"', 'root package must expose AI/RAG runtime smoke report verifier');
assertIncludes(rootPackageJson, '"record:ai-rag-provider-ready-evidence": "node scripts/record-ai-rag-provider-ready-evidence.mjs"', 'root package must expose AI/RAG provider-ready evidence recorder');
assertIncludes(rootPackageJson, '"verify:ai-rag-evidence-recorder": "node scripts/record-ai-rag-provider-ready-evidence.mjs --self-test"', 'root package must expose AI/RAG provider-ready evidence recorder self-test');
assertIncludes(rootPackageJson, '"complete:ai-rag-central-foundation": "node scripts/complete-ai-rag-central-foundation.mjs"', 'root package must expose AI/RAG central completion flow runner');
assertIncludes(rootPackageJson, '"verify:ai-rag-central-foundation:flow": "node scripts/complete-ai-rag-central-foundation.mjs --self-test"', 'root package must expose AI/RAG central completion flow self-test');
assertNotIncludes(rootPackageJson, '"langchain"', 'current AI/RAG workstream must not add LangChain dependency');
assertNotIncludes(rootPackageJson, '"@langchain/', 'current AI/RAG workstream must not add @langchain dependency');
assertNotIncludes(rootPackageJson, '"@langchain/langgraph"', 'current AI/RAG workstream must not add LangGraph dependency');

const serverPackageJson = readText('apps/server/package.json');
assertNotIncludes(serverPackageJson, '"langchain"', 'server must not add LangChain dependency for current AI/RAG workstream');
assertNotIncludes(serverPackageJson, '"@langchain/', 'server must not add @langchain dependency for current AI/RAG workstream');
assertNotIncludes(serverPackageJson, '"@langchain/langgraph"', 'server must not add LangGraph dependency for current AI/RAG workstream');

const dbInitEntrypoint = readText('scripts/db-init-entrypoint.sh');
assertIncludes(dbInitEntrypoint, 'DB_INIT_PRISMA_PUSH_MODE', 'db-init must expose an explicit Prisma push mode for legacy AI/RAG volumes');
assertIncludes(dbInitEntrypoint, 'legacy_ai_rag_schema_count', 'db-init must detect legacy AI/RAG schema before Prisma db push');
assertIncludes(dbInitEntrypoint, 'legacy common.cm_ai_* schema detected', 'db-init must explain legacy AI/RAG skip behavior');
assertIncludes(dbInitEntrypoint, 'PROTECTED_BASELINE_MIGRATIONS', 'db-init must keep non-destructive baseline migrations available when Prisma db push is skipped');
assertIncludes(dbInitEntrypoint, '20260702090000_add_crm_opportunity_ledger/migration.sql', 'db-init must apply CRM opportunity ledger baseline before CRM seeds');
assertIncludes(dbInitEntrypoint, '20260709120000_add_crm_contract_dms_handoff', 'db-init must protect the CRM contract DMS handoff migration');
assertIncludes(dbInitEntrypoint, '20260710100000_add_crm_quote_dms_handoff', 'db-init must protect the CRM quote DMS handoff migration');
assertNotIncludes(dbInitEntrypoint, '--accept-data-loss', 'db-init must not use destructive Prisma db push flags for AI/RAG compat');

const preflightHook = readText('.codex/hooks/preflight.sh');
assertIncludes(preflightHook, 'NEED_AI_RAG', 'preflight must detect AI/RAG platform changes');
assertIncludes(preflightHook, 'pnpm run verify:ai-rag-platform', 'preflight must run the AI/RAG platform verifier for AI/RAG changes');
assertIncludes(preflightHook, 'pnpm run verify:ai-rag-evidence-recorder', 'preflight must run the AI/RAG evidence recorder self-test for AI/RAG changes');
assertIncludes(preflightHook, 'pnpm run verify:ai-rag-central-foundation:flow', 'preflight must run the AI/RAG central completion flow self-test for AI/RAG changes');
assertIncludes(preflightHook, 'complete-ai-rag-', 'preflight must detect AI/RAG completion runner changes');

const pushGuardHook = readText('.codex/hooks/push-guard.sh');
assertIncludes(pushGuardHook, 'NEED_AI_RAG', 'push guard must detect AI/RAG platform changes');
assertIncludes(pushGuardHook, 'pnpm run verify:ai-rag-platform', 'push guard must run the AI/RAG platform verifier for AI/RAG changes');
assertIncludes(pushGuardHook, 'pnpm run verify:ai-rag-evidence-recorder', 'push guard must run the AI/RAG evidence recorder self-test for AI/RAG changes');
assertIncludes(pushGuardHook, 'pnpm run verify:ai-rag-central-foundation:flow', 'push guard must run the AI/RAG central completion flow self-test for AI/RAG changes');
assertIncludes(pushGuardHook, 'complete-ai-rag-', 'push guard must detect AI/RAG completion runner changes');

const aiIndexTypes = readText('packages/types/src/common/ai-index.ts');
assertIncludes(aiIndexTypes, 'AiIndexJobSafetySnapshot', 'AI index types must expose job safety policy snapshots');
assertIncludes(aiIndexTypes, 'AiIndexJobQueueMetrics', 'AI index types must expose job queue observability snapshots');
assertIncludes(aiIndexTypes, 'AiIndexJobSchedulerStatus', 'AI index types must expose scheduler status snapshots');
assertIncludes(aiIndexTypes, 'runOnStart', 'AI index scheduler status must expose startup execution policy');
assertIncludes(aiIndexTypes, 'retryWaitingCount', 'AI index job queue metrics must expose retry waiting backlog counts');
assertIncludes(aiIndexTypes, 'AiIndexEmbeddingSyncSnapshot', 'AI index types must expose embedding sync snapshots');
assertIncludes(aiIndexTypes, 'AiIndexSourceRegistrationStatus', 'AI index source status must expose source registration coverage status');
assertIncludes(aiIndexTypes, 'missing_adapter', 'AI index source status must distinguish planned sources without adapters');
assertIncludes(aiIndexTypes, 'embedding_runtime_failed', 'AI index types must distinguish embedding runtime failure');
assertIncludes(aiIndexTypes, 'embedding_provider_unavailable', 'AI index types must distinguish provider unavailable');

const aiTypes = readText('packages/types/src/common/ai.ts');
assertIncludes(aiTypes, 'AiConversationUpdateRequest', 'AI types must expose conversation update contracts');
assertIncludes(aiTypes, 'AiRunStartRequest', 'AI types must expose model run start audit contracts');
assertIncludes(aiTypes, 'AiRunCompleteRequest', 'AI types must expose model run completion audit contracts');
assertIncludes(aiTypes, 'AiLegacyRetrievalRequest', 'AI types must label legacy retrieval contracts explicitly');

const aiRetrievalTypes = readText('packages/types/src/common/ai-retrieval.ts');
assertIncludes(aiRetrievalTypes, 'CommonAiRetrievalRequest', 'AI retrieval types must label common retrieval contracts explicitly');
assertIncludes(aiRetrievalTypes, 'CommonAiRetrievalResponse', 'AI retrieval types must expose an explicit common response alias');

const commonSearchTypes = readText('packages/types/src/common/search.ts');
assertIncludes(commonSearchTypes, "| 'activity'", 'common search entity types must include CRM customer activity rows');

const commonSearchUtils = readText('apps/server/src/modules/common/search/search-utils.ts');
assertIncludes(commonSearchUtils, "activity: '고객 활동'", 'common search labels must include CRM customer activity rows');

const commonSearchController = readText('apps/server/src/modules/common/search/search.controller.ts');
assertIncludes(commonSearchController, "'activity'", 'common search controller must accept CRM activity entity filters');

const commonAiRetrievalService = readText('apps/server/src/modules/common/ai-index/ai-retrieval.service.ts');
assertIncludes(commonAiRetrievalService, "'activity'", 'common AI retrieval must accept CRM activity entity filters');

const webShellGlobalSearch = readText('packages/web-shell/src/global-search.tsx');
assertIncludes(webShellGlobalSearch, "activity: '고객 활동'", 'web shell global search labels must include CRM activity rows');

const pmsProjectTypes = readText('packages/types/src/pms/project.ts');
assertIncludes(pmsProjectTypes, 'ProjectAiIndexBackfillRequest', 'PMS project types must expose AI index backfill request contract');
assertIncludes(pmsProjectTypes, 'ProjectAiIndexBackfillResponse', 'PMS project types must expose AI index backfill response contract');
assertIncludes(pmsProjectTypes, "jobType: 'backfill'", 'PMS project AI index backfill response must identify backfill jobs');
assertIncludes(pmsProjectTypes, 'ApplyCrmContractHandoffSnapshotDto', 'PMS project types must expose CRM handoff snapshot apply requests');
assertIncludes(pmsProjectTypes, 'CrmContractPmsHandoffPreview', 'PMS CRM handoff snapshot request must consume the shared CRM preview contract');
assertIncludes(pmsProjectTypes, "sourceApp: 'crm'", 'PMS CRM handoff snapshot result must identify CRM as the source app');

const pmsTaskTypes = readText('packages/types/src/pms/task.ts');
assertIncludes(pmsTaskTypes, 'TaskAiIndexBackfillRequest', 'PMS task types must expose AI index backfill request contract');
assertIncludes(pmsTaskTypes, 'TaskAiIndexBackfillResponse', 'PMS task types must expose AI index backfill response contract');
assertIncludes(pmsTaskTypes, "entityType: 'task'", 'PMS task AI index backfill response must identify task entity jobs');
assertIncludes(pmsTaskTypes, "jobType: 'backfill'", 'PMS task AI index backfill response must identify backfill jobs');

const pmsTypesIndex = readText('packages/types/src/pms/index.ts');
assertIncludes(pmsTypesIndex, 'ProjectAiIndexBackfillRequest', 'PMS type index must export AI index backfill request contract');
assertIncludes(pmsTypesIndex, 'ProjectAiIndexBackfillResponse', 'PMS type index must export AI index backfill response contract');
assertIncludes(pmsTypesIndex, 'ApplyCrmContractHandoffSnapshotDto', 'PMS type index must export CRM handoff snapshot apply requests');
assertIncludes(pmsTypesIndex, 'ApplyCrmContractHandoffSnapshotResult', 'PMS type index must export CRM handoff snapshot apply results');
assertIncludes(pmsTypesIndex, 'TaskAiIndexBackfillRequest', 'PMS type index must export task AI index backfill request contract');
assertIncludes(pmsTypesIndex, 'TaskAiIndexBackfillResponse', 'PMS type index must export task AI index backfill response contract');

const crmCustomerTypes = readText('packages/types/src/crm/customer.ts');
assertIncludes(crmCustomerTypes, 'CrmCustomerAiIndexBackfillRequest', 'CRM customer types must expose customer/activity AI index backfill request contract');
assertIncludes(crmCustomerTypes, 'CrmCustomerAiIndexBackfillResponse', 'CRM customer types must expose customer/activity AI index backfill response contract');
assertIncludes(crmCustomerTypes, "jobType: 'backfill'", 'CRM customer/activity AI index backfill response must identify backfill jobs');
assertIncludes(crmCustomerTypes, "CrmCustomerAiIndexBackfillEntityType = 'customer' | 'activity'", 'CRM customer/activity backfill must scope supported entity types');

const crmOpportunityTypes = readText('packages/types/src/crm/opportunity.ts');
assertIncludes(crmOpportunityTypes, "'draft-created'", 'CRM integration status must represent created DMS markdown drafts');

const crmQuoteTypes = readText('packages/types/src/crm/quote.ts');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentDraftRequest', 'CRM quote types must expose DMS quote draft request contract');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentDraft', 'CRM quote types must expose DMS quote draft response contract');
assertIncludes(crmQuoteTypes, "CrmQuoteDmsDocumentHandoffStatus = 'draft-created' | 'execution-evidence-updated' | 'replaced'", 'CRM quote types must expose DMS quote handoff states');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentLifecycleStep', 'CRM quote types must expose DMS quote lifecycle steps');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentExecutionEvidenceRequest', 'CRM quote types must expose DMS quote execution evidence requests');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentExecutionEvidenceResult', 'CRM quote types must expose DMS quote execution evidence results');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentLifecycleExecutionRequest', 'CRM quote types must expose DMS quote lifecycle execution requests');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentLifecycleExecutionResult extends CrmQuoteDmsDocumentExecutionEvidenceResult', 'CRM quote lifecycle execution result must extend DMS evidence recording result');
assertIncludes(crmQuoteTypes, 'dmsExecution: DmsCrmQuoteLifecycleExecutionResult', 'CRM quote lifecycle execution result must preserve DMS execution output');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsDocumentPreview', 'CRM quote preview must expose DMS document readiness');
assertIncludes(crmQuoteTypes, 'dmsDocument: CrmQuoteDmsDocumentPreview', 'CRM quote preview response must include DMS document handoff readiness');
assertIncludes(crmQuoteTypes, 'latestHandoff: CrmQuoteDmsDocumentHandoffSummary | null', 'CRM quote DMS preview must expose latest handoff summaries');
assertIncludes(crmQuoteTypes, 'lifecycle: CrmQuoteDmsDocumentLifecycleStep[]', 'CRM quote DMS preview must expose lifecycle evidence');
assertIncludes(crmQuoteTypes, 'lifecycleSnapshot: CrmQuoteDmsDocumentLifecycleStep[]', 'CRM quote DMS handoff must preserve lifecycle evidence');
assertIncludes(crmQuoteTypes, 'draftPathHint: string', 'CRM quote DMS preview must expose deterministic draft path hints');
assertIncludes(crmQuoteTypes, 'savedDraftPath?: string', 'CRM quote DMS preview must expose saved draft paths');
assertIncludes(crmQuoteTypes, 'CrmQuoteDmsTemplateEvidence', 'CRM quote DMS preview must expose template registry evidence');
assertIncludes(crmQuoteTypes, 'templateEvidence: CrmQuoteDmsTemplateEvidence', 'CRM quote DMS document preview must include DMS template evidence');

const crmOpportunityIntegrationService = readText('apps/server/src/modules/crm/opportunity/opportunity.service.ts');
assertIncludes(crmOpportunityIntegrationService, "value === 'draft-created'", 'CRM opportunity service must preserve draft-created integration status values');
assertIncludes(crmOpportunityIntegrationService, 'FileCrudService', 'CRM opportunity service must use the DMS file service for quote draft writes');
assertIncludes(crmOpportunityIntegrationService, 'TemplateService', 'CRM opportunity service must use DMS TemplateService for quote template evidence');
assertIncludes(crmOpportunityIntegrationService, 'loadQuoteDmsTemplateEvidence', 'CRM opportunity service must load quote DMS template evidence');
assertIncludes(crmOpportunityIntegrationService, 'createQuoteDmsDocumentDraft', 'CRM opportunity service must expose quote DMS draft creation');
assertIncludes(crmOpportunityIntegrationService, 'recordQuoteDmsDocumentExecutionEvidence', 'CRM opportunity service must receive quote DMS execution evidence');
assertIncludes(crmOpportunityIntegrationService, 'DmsCrmQuoteLifecycleService', 'CRM opportunity service must call the DMS quote lifecycle execution service');
assertIncludes(crmOpportunityIntegrationService, 'executeQuoteDmsDocumentLifecycle', 'CRM opportunity service must expose quote DMS lifecycle artifact execution');
assertIncludes(crmOpportunityIntegrationService, 'dmsExecution', 'CRM opportunity service must return DMS quote lifecycle execution artifacts');
assertIncludes(crmOpportunityIntegrationService, 'mergeQuoteDmsExecutionLifecycleEvidence', 'CRM opportunity service must merge quote DMS lifecycle evidence');
assertIncludes(crmOpportunityIntegrationService, "'execution-evidence-updated'", 'CRM opportunity service must preserve quote DMS execution evidence status');
assertIncludes(crmOpportunityIntegrationService, 'crm.crm_quote_dms_handoff_m', 'CRM opportunity service must persist quote DMS handoff snapshots');
assertIncludes(crmOpportunityIntegrationService, 'quote_dms_draft_created', 'CRM opportunity service must queue AI projection updates after quote DMS draft creation');
assertIncludes(crmOpportunityIntegrationService, 'quote_dms_execution_evidence_', 'CRM opportunity service must queue AI projection updates after quote DMS evidence recording');
assertIncludes(crmOpportunityIntegrationService, 'CRM_QUOTE_DMS_TEMPLATE_KEY', 'CRM opportunity service must use a stable quote DMS template key');

const crmOpportunityModule = readText('apps/server/src/modules/crm/opportunity/opportunity.module.ts');
assertIncludes(crmOpportunityModule, 'FileModule', 'CRM opportunity module must import DMS FileModule for quote draft writes');
assertIncludes(crmOpportunityModule, 'TemplatesModule', 'CRM opportunity module must import DMS TemplatesModule for quote template evidence');
assertIncludes(crmOpportunityModule, 'DmsCrmQuoteLifecycleModule', 'CRM opportunity module must import the DMS quote lifecycle execution boundary');

const crmOpportunityDto = readText('apps/server/src/modules/crm/opportunity/dto/opportunity.dto.ts');
assertIncludes(crmOpportunityDto, 'CrmQuoteDmsDocumentDraftDto', 'CRM opportunity DTOs must validate quote DMS draft requests');
assertIncludes(crmOpportunityDto, 'CrmQuoteDmsDocumentExecutionEvidenceDto', 'CRM opportunity DTOs must validate quote DMS execution evidence requests');
assertIncludes(crmOpportunityDto, 'CrmQuoteDmsDocumentLifecycleExecutionDto', 'CRM opportunity DTOs must validate quote DMS lifecycle execution requests');
assertIncludes(crmOpportunityDto, 'MaxLength(1000)', 'CRM quote DMS draft memo must keep a bounded input length');

const crmOpportunityController = readText('apps/server/src/modules/crm/opportunity/opportunity.controller.ts');
assertIncludes(crmOpportunityController, "@Post(':id/quote-dms-document-draft')", 'CRM opportunity controller must expose quote DMS draft creation');
assertIncludes(crmOpportunityController, 'createQuoteDmsDocumentDraft', 'CRM opportunity controller must delegate quote DMS draft creation to the service');
assertIncludes(crmOpportunityController, "@Post(':id/quote-dms-document-execution-evidence')", 'CRM opportunity controller must expose quote DMS execution evidence recording');
assertIncludes(crmOpportunityController, 'recordQuoteDmsDocumentExecutionEvidence', 'CRM opportunity controller must delegate quote DMS execution evidence recording to the service');
assertIncludes(crmOpportunityController, "@Post(':id/quote-dms-document-lifecycle-execution')", 'CRM opportunity controller must expose quote DMS lifecycle artifact execution');
assertIncludes(crmOpportunityController, 'executeQuoteDmsDocumentLifecycle', 'CRM opportunity controller must delegate quote DMS lifecycle execution to the service');

const crmContractTypes = readText('packages/types/src/crm/contract.ts');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentDraftRequest', 'CRM contract types must expose DMS document draft request contract');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentDraft', 'CRM contract types must expose DMS document draft response contract');
assertIncludes(crmContractTypes, "CrmContractDmsDocumentHandoffStatus = 'draft-created' | 'execution-evidence-updated' | 'replaced'", 'CRM contract types must expose DMS handoff snapshot workflow states');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentExecutionEvidenceRequest', 'CRM contract types must expose DMS execution evidence request contract');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentExecutionEvidenceResult', 'CRM contract types must expose DMS execution evidence response contract');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentHandoffSummary', 'CRM DMS document preview must expose latest handoff summaries');
assertIncludes(crmContractTypes, 'latestHandoff: CrmContractDmsDocumentHandoffSummary | null', 'CRM DMS document preview must expose the latest handoff snapshot');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentHandoff extends CrmContractDmsDocumentHandoffSummary', 'CRM contract types must expose DMS handoff snapshot details');
assertIncludes(crmContractTypes, 'draftPathHint: string', 'CRM DMS document preview must expose deterministic draft path hints');
assertIncludes(crmContractTypes, 'savedDraftPath?: string', 'CRM DMS document preview must expose saved draft paths after creation');
assertIncludes(crmContractTypes, 'savedPath: string', 'CRM DMS document draft response must expose saved DMS path');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentLifecycleStep', 'CRM contract types must expose DMS document lifecycle steps');
assertIncludes(crmContractTypes, 'evidencePath?: string', 'CRM DMS document contracts must expose evidence paths');
assertIncludes(crmContractTypes, 'evidenceLabel?: string', 'CRM DMS document attachments must expose evidence labels');
assertIncludes(crmContractTypes, 'referenceStatus?: CrmQuoteSellerCiReferenceStatus', 'CRM DMS document attachments must expose CI reference verification status');
assertIncludes(crmContractTypes, 'lifecycle: CrmContractDmsDocumentLifecycleStep[]', 'CRM DMS document preview must expose lifecycle steps');
assertIncludes(crmContractTypes, 'lifecycleSnapshot: CrmContractDmsDocumentLifecycleStep[]', 'CRM DMS handoff snapshots must preserve lifecycle evidence');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentLifecycleExecutionRequest', 'CRM contract types must expose DMS lifecycle execution request contracts');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentLifecycleExecutionArtifact', 'CRM contract types must expose DMS lifecycle execution artifact contracts');
assertIncludes(crmContractTypes, 'CrmContractDmsDocumentLifecycleExecutionResult extends CrmContractDmsDocumentExecutionEvidenceResult', 'CRM contract lifecycle execution result must extend DMS evidence recording result');
assertIncludes(crmContractTypes, 'dmsExecution', 'CRM contract lifecycle execution result must expose DMS execution artifacts');
assertIncludes(crmContractTypes, 'governance: DmsCrmContractLifecycleGovernance', 'CRM contract lifecycle execution result must expose DMS governance evidence');

const dmsCrmContractLifecycleTypes = readText('packages/types/src/dms/crm-contract-lifecycle.ts');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleExecutionRequest', 'DMS CRM contract lifecycle types must expose execution requests');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleExecutionResult', 'DMS CRM contract lifecycle types must expose execution results');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleArtifact', 'DMS CRM contract lifecycle types must expose artifact metadata');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleEvidenceStep', 'DMS CRM contract lifecycle types must expose CRM evidence step outputs');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleAttachmentFinalizationLedger', 'DMS CRM contract lifecycle types must expose attachment finalization ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleAttachmentFinalizationItem', 'DMS CRM contract lifecycle types must expose attachment finalization ledger items');
assertIncludes(dmsCrmContractLifecycleTypes, 'attachmentFinalizationLedger', 'DMS CRM contract lifecycle governance must expose attachment finalization ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleTemplateVersion', 'DMS CRM contract lifecycle types must expose template version evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleApprovalActor', 'DMS CRM contract lifecycle types must expose approval actor evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractApprovalRoutePolicy', 'DMS CRM contract lifecycle types must expose editable approval route policy settings');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractExportPolicy', 'DMS CRM contract lifecycle types must expose editable export policy settings');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleExportPolicyRecord', 'DMS CRM contract lifecycle types must expose export policy evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY', 'DMS CRM contract lifecycle types must expose a default approval route policy');
assertIncludes(dmsCrmContractLifecycleTypes, 'DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY', 'DMS CRM contract lifecycle types must expose a default export policy');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleApprovalRoute', 'DMS CRM contract lifecycle types must expose approval route evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleApprovalRouteActor', 'DMS CRM contract lifecycle types must expose approval route actor evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleApprovalRouteLedger', 'DMS CRM contract lifecycle types must expose approval route ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus', 'DMS CRM contract lifecycle types must expose approval route ledger sync status');
assertIncludes(dmsCrmContractLifecycleTypes, 'approvalRouteLedger', 'DMS CRM contract lifecycle governance must expose approval route ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleDirectorySyncStatus', 'DMS CRM contract lifecycle types must expose directory sync status evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'directorySyncStatus', 'DMS CRM contract lifecycle approval route must expose directory sync status');
assertIncludes(dmsCrmContractLifecycleTypes, 'resolvedActors', 'DMS CRM contract lifecycle approval route must expose resolved directory actors');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleTemplateChangeReview', 'DMS CRM contract lifecycle types must expose template change review evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleTemplateChangeRequestLedger', 'DMS CRM contract lifecycle types must expose template change request ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'templateChangeRequestLedger', 'DMS CRM contract lifecycle governance must expose template change request ledger evidence');
assertIncludes(dmsCrmContractLifecycleTypes, 'DmsCrmContractLifecycleGovernance', 'DMS CRM contract lifecycle types must expose governance evidence');
assertIncludes(dmsCrmContractLifecycleTypes, "'template-version-snapshot'", 'DMS CRM contract lifecycle artifact kinds must include template version snapshots');
assertIncludes(dmsCrmContractLifecycleTypes, "'template-change-review-record'", 'DMS CRM contract lifecycle artifact kinds must include template change review records');
assertIncludes(dmsCrmContractLifecycleTypes, "'template-change-request-ledger'", 'DMS CRM contract lifecycle artifact kinds must include template change request ledgers');
assertIncludes(dmsCrmContractLifecycleTypes, "'attachment-finalization-ledger'", 'DMS CRM contract lifecycle artifact kinds must include attachment finalization ledgers');
assertIncludes(dmsCrmContractLifecycleTypes, "'approval-route-record'", 'DMS CRM contract lifecycle artifact kinds must include approval route records');
assertIncludes(dmsCrmContractLifecycleTypes, "'approval-workflow-record'", 'DMS CRM contract lifecycle artifact kinds must include approval workflow records');
assertIncludes(dmsCrmContractLifecycleTypes, "'approval-route-ledger'", 'DMS CRM contract lifecycle artifact kinds must include approval route ledger records');
assertIncludes(dmsCrmContractLifecycleTypes, "'word-export'", 'DMS CRM contract lifecycle types must include Word export execution steps');
assertIncludes(dmsCrmContractLifecycleTypes, "'pdf-export'", 'DMS CRM contract lifecycle types must include PDF export execution steps');
assertIncludes(dmsCrmContractLifecycleTypes, "'approval'", 'DMS CRM contract lifecycle types must include approval execution steps');

const dmsCrmQuoteLifecycleTypes = readText('packages/types/src/dms/crm-quote-lifecycle.ts');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleExecutionRequest', 'DMS CRM quote lifecycle types must expose execution requests');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleExecutionResult', 'DMS CRM quote lifecycle types must expose execution results');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleArtifact', 'DMS CRM quote lifecycle types must expose artifact metadata');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleEvidenceStep', 'DMS CRM quote lifecycle types must expose CRM evidence step outputs');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleTemplateVersion', 'DMS CRM quote lifecycle types must expose template version evidence');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'DmsCrmQuoteLifecycleGovernance', 'DMS CRM quote lifecycle types must expose governance evidence');
assertIncludes(dmsCrmQuoteLifecycleTypes, 'templateReviewPath', 'DMS CRM quote lifecycle governance must preserve template review evidence');
assertIncludes(dmsCrmQuoteLifecycleTypes, "'template-version-snapshot'", 'DMS CRM quote lifecycle artifact kinds must include template version snapshots');
assertIncludes(dmsCrmQuoteLifecycleTypes, "'template-review-record'", 'DMS CRM quote lifecycle artifact kinds must include template review records');
assertIncludes(dmsCrmQuoteLifecycleTypes, "'word-export'", 'DMS CRM quote lifecycle types must include Word export execution steps');
assertIncludes(dmsCrmQuoteLifecycleTypes, "'pdf-export'", 'DMS CRM quote lifecycle types must include PDF export execution steps');

const dmsTypesIndex = readText('packages/types/src/dms/index.ts');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleExecutionRequest', 'DMS type index must export CRM contract lifecycle execution requests');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleExecutionResult', 'DMS type index must export CRM contract lifecycle execution results');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleArtifact', 'DMS type index must export CRM contract lifecycle artifacts');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleEvidenceStep', 'DMS type index must export CRM contract lifecycle evidence steps');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleGovernance', 'DMS type index must export CRM contract lifecycle governance evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleAttachmentFinalizationLedger', 'DMS type index must export CRM contract lifecycle attachment finalization ledger evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleAttachmentFinalizationStatus', 'DMS type index must export CRM contract lifecycle attachment finalization status');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleApprovalRoute', 'DMS type index must export CRM contract lifecycle approval route evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleApprovalRouteActor', 'DMS type index must export CRM contract lifecycle approval route actor evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleApprovalRouteLedger', 'DMS type index must export CRM contract lifecycle approval route ledger evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus', 'DMS type index must export CRM contract lifecycle approval route ledger sync status');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleDirectorySyncStatus', 'DMS type index must export CRM contract lifecycle directory sync status evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractApprovalRoutePolicy', 'DMS type index must export editable CRM contract approval route policies');
assertIncludes(dmsTypesIndex, 'DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY', 'DMS type index must export the default CRM contract approval route policy');
assertIncludes(dmsTypesIndex, 'DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY', 'DMS type index must export the default CRM contract export policy');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleTemplateChangeReview', 'DMS type index must export CRM contract lifecycle template change review evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmContractLifecycleTemplateChangeRequestLedger', 'DMS type index must export CRM contract lifecycle template change request ledger evidence');
assertIncludes(dmsTypesIndex, 'DmsCrmQuoteLifecycleExecutionRequest', 'DMS type index must export CRM quote lifecycle execution requests');
assertIncludes(dmsTypesIndex, 'DmsCrmQuoteLifecycleExecutionResult', 'DMS type index must export CRM quote lifecycle execution results');
assertIncludes(dmsTypesIndex, 'DmsCrmQuoteLifecycleArtifact', 'DMS type index must export CRM quote lifecycle artifacts');
assertIncludes(dmsTypesIndex, 'DmsCrmQuoteLifecycleEvidenceStep', 'DMS type index must export CRM quote lifecycle evidence steps');
assertIncludes(dmsTypesIndex, 'DmsCrmQuoteLifecycleGovernance', 'DMS type index must export CRM quote lifecycle governance evidence');

const crmTypesIndex = readText('packages/types/src/crm/index.ts');
assertIncludes(crmTypesIndex, 'CrmCustomerAiIndexBackfillRequest', 'CRM type index must export customer/activity AI index backfill request contract');
assertIncludes(crmTypesIndex, 'CrmCustomerAiIndexBackfillResponse', 'CRM type index must export customer/activity AI index backfill response contract');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentDraft', 'CRM type index must export DMS document draft contracts');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentExecutionEvidenceResult', 'CRM type index must export DMS execution evidence contracts');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentLifecycleExecutionRequest', 'CRM type index must export DMS lifecycle execution request contracts');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentLifecycleExecutionResult', 'CRM type index must export DMS lifecycle execution result contracts');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentHandoff', 'CRM type index must export DMS handoff snapshot contracts');
assertIncludes(crmTypesIndex, 'CrmContractDmsDocumentLifecycleStep', 'CRM type index must export DMS document lifecycle contracts');
assertIncludes(crmTypesIndex, 'CrmQuoteDmsDocumentExecutionEvidenceRequest', 'CRM type index must export quote DMS execution evidence request contracts');
assertIncludes(crmTypesIndex, 'CrmQuoteDmsDocumentLifecycleStep', 'CRM type index must export quote DMS lifecycle contracts');
assertIncludes(crmTypesIndex, 'CrmQuoteDmsDocumentLifecycleExecutionRequest', 'CRM type index must export quote DMS lifecycle execution request contracts');
assertIncludes(crmTypesIndex, 'CrmQuoteDmsDocumentLifecycleExecutionResult', 'CRM type index must export quote DMS lifecycle execution result contracts');
assertIncludes(crmTypesIndex, 'CrmBusinessPlanPerformanceSummary', 'CRM type index must export business plan performance contracts');
assertIncludes(crmTypesIndex, 'CrmBusinessPlanCarryForwardRequest', 'CRM type index must export business plan carry-forward contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanInternalInputStatus', 'CRM type index must export internal cost input status contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanInternalMonthlyWorkflowResult', 'CRM type index must export internal cost workflow result contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAmsExternalInputStatus', 'CRM type index must export AMS external input status contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAmsExternalMonthlyWorkflowResult', 'CRM type index must export AMS external workflow result contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAccountingPaymentExecutionEvidenceRequest', 'CRM type index must export accounting/payment execution evidence request contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAccountingPaymentExecutionEvidenceResult', 'CRM type index must export accounting/payment execution evidence result contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAccountingPaymentExecutionRequest', 'CRM type index must export accounting/payment execution request contracts');
assertIncludes(crmTypesIndex, 'CrmCostPlanAccountingPaymentExecutionResult', 'CRM type index must export accounting/payment execution result contracts');
assertIncludes(crmTypesIndex, 'CrmReportsConfirmRequest', 'CRM type index must export report confirmation request contracts');
assertIncludes(crmTypesIndex, 'CrmReportsConfirmationResult', 'CRM type index must export report confirmation result contracts');

const crmReportsTypes = readText('packages/types/src/crm/reports.ts');
assertIncludes(crmReportsTypes, "CrmReportsConfirmationStatus = 'confirmed' | 'reopened'", 'CRM reports types must expose confirmation workflow states');
assertIncludes(crmReportsTypes, 'CrmReportsConfirmRequest extends CrmReportsPreviewQuery', 'CRM reports types must expose report confirmation request bodies');
assertIncludes(crmReportsTypes, 'latestConfirmation: CrmReportsConfirmationSummary | null', 'CRM reports preview summary must expose the active confirmation snapshot');
assertIncludes(crmReportsTypes, 'summarySnapshot: Omit<CrmReportsPreviewSummary', 'CRM reports confirmation must carry the confirmed summary snapshot');
assertIncludes(crmReportsTypes, 'CrmReportsConfirmationResult', 'CRM reports types must expose confirmation workflow results');

const crmBusinessPlanTypes = readText('packages/types/src/crm/business-plan.ts');
assertIncludes(crmBusinessPlanTypes, "'confirmed-plan' | 'pipeline' | 'contract' | 'confirmed-cost' | 'manual-actual' | 'mixed'", 'CRM business plan performance must expose confirmed-plan, confirmed-cost, and manual-actual row sources');
assertIncludes(crmBusinessPlanTypes, 'confirmedPlanCode?: string', 'CRM business plan performance summary must expose confirmed plan code');
assertIncludes(crmBusinessPlanTypes, 'confirmedPlanName?: string', 'CRM business plan performance summary must expose confirmed plan name');
assertIncludes(crmBusinessPlanTypes, 'costBasisLabel: string', 'CRM business plan performance summary must expose the cost basis label');
assertIncludes(crmBusinessPlanTypes, 'confirmedCostInputCount: number', 'CRM business plan performance summary must count confirmed cost inputs');
assertIncludes(crmBusinessPlanTypes, 'directActualInputCount: number', 'CRM business plan performance summary must count direct actual inputs');
assertIncludes(crmBusinessPlanTypes, 'CrmBusinessPlanPerformanceActualInputRequest', 'CRM business plan performance types must expose direct actual input requests');
assertIncludes(crmBusinessPlanTypes, 'amsExternalCostAdjustedWbsCount: number', 'CRM business plan performance summary must expose AMS external duplicate WBS adjustments');
assertIncludes(crmBusinessPlanTypes, 'amsExternalCostAdjustedActualAmountTotal: number', 'CRM business plan performance summary must expose excluded contract external actual costs');
assertIncludes(crmBusinessPlanTypes, 'CrmBusinessPlanCarryForwardRequest', 'CRM business plan types must expose previous-year carry-forward requests');
assertIncludes(crmBusinessPlanTypes, 'sourceBaseYear?: number', 'CRM business plan carry-forward requests must identify the source base year');

const dmsFileModule = readText('apps/server/src/modules/dms/file/file.module.ts');
assertIncludes(dmsFileModule, 'exports: [FileCrudService]', 'DMS FileModule must export FileCrudService for controlled CRM draft handoff');

const dmsTemplateTypeContracts = readText('packages/types/src/dms/template.ts');
assertIncludes(dmsTemplateTypeContracts, "TemplateReviewStatus = 'pending' | 'confirmed'", 'DMS template types must expose review confirmation status');
assertIncludes(dmsTemplateTypeContracts, 'TemplateReviewConfirmation', 'DMS template types must expose review confirmation metadata');
assertIncludes(dmsTemplateTypeContracts, 'reviewConfirmation?: TemplateReviewConfirmation', 'DMS templates must carry review confirmation metadata');

assertIncludes(dmsTypesIndex, 'TemplateReviewConfirmation', 'DMS type index must export template review confirmation metadata');

const dmsTemplateService = readText('apps/server/src/modules/dms/templates/template.service.ts');
assertIncludes(dmsTemplateService, "id: 'crm-contract-v1'", 'DMS default templates must include the CRM contract template key');
assertIncludes(dmsTemplateService, 'CRM 계약서 기본 템플릿', 'DMS default templates must include a CRM contract document template');
assertIncludes(dmsTemplateService, '{{contractCode}}', 'DMS CRM contract template must expose contract variables');
assertIncludes(dmsTemplateService, "id: 'crm-quote-v1'", 'DMS default templates must include the CRM quote template key');
assertIncludes(dmsTemplateService, 'CRM 견적서 기본 템플릿', 'DMS default templates must include a CRM quote document template');
assertIncludes(dmsTemplateService, '{{quoteNumber}}', 'DMS CRM quote template must expose quote variables');
assertIncludes(dmsTemplateService, "taskKey: 'crm-quote-document'", 'DMS CRM quote template must have a stable generation task key');
assertIncludes(dmsTemplateService, 'normalizeTemplateReviewConfirmation', 'DMS template service must normalize template review confirmation metadata');
assertIncludes(dmsTemplateService, 'async confirmReview', 'DMS template service must expose a review confirmation mutation');
assertIncludes(dmsTemplateService, "lastActivity: 'dms.templates.review-confirm'", 'DMS template review confirmation must leave a stable activity marker');
assertIncludes(dmsTemplateService, "source: 'dms-settings'", 'DMS template review confirmation must identify the settings UI source');

const dmsTemplateMetadataTypes = readText('apps/server/src/modules/dms/templates/template.types.ts');
assertIncludes(dmsTemplateMetadataTypes, 'TemplateReviewConfirmation', 'DMS template metadata record must persist review confirmation metadata');

const dmsTemplatesController = readText('apps/server/src/modules/dms/templates/templates.controller.ts');
assertIncludes(dmsTemplatesController, "@Post(':id/review-confirmation')", 'DMS templates controller must expose review confirmation');
assertIncludes(dmsTemplatesController, 'templateService.confirmReview', 'DMS templates controller must delegate review confirmation to the service');

const dmsTemplateReviewRoute = readText('apps/web/dms/src/app/api/templates/[id]/review-confirmation/route.ts');
assertIncludes(dmsTemplateReviewRoute, '/review-confirmation', 'DMS template review proxy must forward review confirmation requests');
assertIncludes(dmsTemplateReviewRoute, "method: 'POST'", 'DMS template review proxy must use POST');

const dmsTemplateApi = readText('apps/web/dms/src/lib/api/templateApi.ts');
assertIncludes(dmsTemplateApi, 'confirmReview', 'DMS template API client must expose review confirmation');
assertIncludes(dmsTemplateApi, '/review-confirmation', 'DMS template API client must call the review confirmation proxy');

const dmsSettingsTemplateSection = readText('apps/web/dms/src/components/pages/settings/_components/TemplateSection.tsx');
assertIncludes(dmsSettingsTemplateSection, "template.id === 'crm-quote-v1'", 'DMS settings template list must target the CRM quote template for review confirmation');
assertIncludes(dmsSettingsTemplateSection, "template.generation?.taskKey === 'crm-quote-document'", 'DMS settings template list must recognize CRM quote template generation metadata');
assertIncludes(dmsSettingsTemplateSection, 'reviewConfirmation?.status', 'DMS settings template list must render template review confirmation state');
assertIncludes(dmsSettingsTemplateSection, '검토 확정', 'DMS settings template list must expose a review confirmation action');

const dmsSettingsPage = readText('apps/web/dms/src/components/pages/settings/SettingsPage.tsx');
assertIncludes(dmsSettingsPage, 'handleTemplateReviewConfirm', 'DMS settings page must wire the template review confirmation action');
assertIncludes(dmsSettingsPage, 'templateApi.confirmReview', 'DMS settings page must call the template review confirmation API');
assertIncludes(dmsSettingsPage, 'onUpdateSettings={updateSettings}', 'DMS settings page must pass settings mutation into custom management slots');

const dmsSettingsApi = readText('apps/web/dms/src/lib/api/settingsApi.ts');
assertIncludes(dmsSettingsApi, 'DmsCrmContractApprovalRoutePolicy', 'DMS settings API client must type the CRM contract approval route policy');
assertIncludes(dmsSettingsApi, 'DmsCrmContractExportPolicy', 'DMS settings API client must type the CRM contract export policy');
assertIncludes(dmsSettingsApi, 'crmContractApprovalRoute', 'DMS settings API client must expose CRM contract approval route settings');
assertIncludes(dmsSettingsApi, 'crmContractExportPolicy', 'DMS settings API client must expose CRM contract export settings');

const dmsSettingsPageConfig = readText('apps/web/dms/src/components/pages/settings/_config/settingsPageConfig.ts');
assertIncludes(dmsSettingsPageConfig, 'crmContractApprovalRoute', 'DMS settings config must register the CRM contract approval route section');
assertIncludes(dmsSettingsPageConfig, 'CRM 계약 결재선', 'DMS settings navigation must expose the CRM contract approval route section');
assertIncludes(dmsSettingsPageConfig, "'approval-route-policy'", 'DMS settings config must register the approval route policy custom slot');
assertIncludes(dmsSettingsPageConfig, 'crmContractExportPolicy', 'DMS settings config must register the CRM contract export policy section');
assertIncludes(dmsSettingsPageConfig, 'CRM 계약 산출 정책', 'DMS settings navigation must expose the CRM contract export policy section');
assertIncludes(dmsSettingsPageConfig, "'contract-export-policy'", 'DMS settings config must register the contract export policy custom slot');

const dmsSettingsCustomSlot = readText('apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx');
assertIncludes(dmsSettingsCustomSlot, 'ApprovalRoutePolicySection', 'DMS settings custom slots must render the approval route policy section');
assertIncludes(dmsSettingsCustomSlot, "slotKey === 'approval-route-policy'", 'DMS settings custom slots must dispatch the approval route policy slot');
assertIncludes(dmsSettingsCustomSlot, 'config?.system?.crmContractApprovalRoute', 'DMS settings custom slot must read the persisted approval route policy');
assertIncludes(dmsSettingsCustomSlot, 'ContractExportPolicySection', 'DMS settings custom slots must render the export policy section');
assertIncludes(dmsSettingsCustomSlot, "slotKey === 'contract-export-policy'", 'DMS settings custom slots must dispatch the export policy slot');
assertIncludes(dmsSettingsCustomSlot, 'config?.system?.crmContractExportPolicy', 'DMS settings custom slot must read the persisted export policy');

const dmsApprovalRoutePolicySection = readText('apps/web/dms/src/components/pages/settings/_components/ApprovalRoutePolicySection.tsx');
assertIncludes(dmsApprovalRoutePolicySection, 'DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY', 'DMS approval route UI must use the shared default approval policy');
assertIncludes(dmsApprovalRoutePolicySection, 'crmContractApprovalRoute', 'DMS approval route UI must save the CRM contract approval route policy');
assertIncludes(dmsApprovalRoutePolicySection, 'requiredRoles', 'DMS approval route UI must edit required approval roles');
assertIncludes(dmsApprovalRoutePolicySection, 'onUpdateSettings', 'DMS approval route UI must persist through the settings API');
assertIncludes(dmsApprovalRoutePolicySection, '역할 추가', 'DMS approval route UI must expose role editing');

const dmsContractExportPolicySection = readText('apps/web/dms/src/components/pages/settings/_components/ContractExportPolicySection.tsx');
assertIncludes(dmsContractExportPolicySection, 'DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY', 'DMS export policy UI must use the shared default export policy');
assertIncludes(dmsContractExportPolicySection, 'crmContractExportPolicy', 'DMS export policy UI must save the CRM contract export policy');
assertIncludes(dmsContractExportPolicySection, 'markdownRecordRootPath', 'DMS export policy UI must edit markdown record roots');
assertIncludes(dmsContractExportPolicySection, 'storageArtifactRootPath', 'DMS export policy UI must edit storage artifact roots');
assertIncludes(dmsContractExportPolicySection, 'onUpdateSettings', 'DMS export policy UI must persist through the settings API');

const dmsConfigService = readText('apps/server/src/modules/dms/runtime/dms-config.service.ts');
assertIncludes(dmsConfigService, 'DmsCrmContractApprovalRoutePolicy', 'DMS config service must type CRM contract approval route settings');
assertIncludes(dmsConfigService, 'DmsCrmContractExportPolicy', 'DMS config service must type CRM contract export settings');
assertIncludes(dmsConfigService, 'crmContractApprovalRoute: DmsCrmContractApprovalRoutePolicy', 'DMS config must expose CRM contract approval route policy');
assertIncludes(dmsConfigService, 'crmContractExportPolicy: DmsCrmContractExportPolicy', 'DMS config must expose CRM contract export policy');
assertIncludes(dmsConfigService, 'DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY', 'DMS config defaults must include the shared CRM contract approval route policy');
assertIncludes(dmsConfigService, 'DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY', 'DMS config defaults must include the shared CRM contract export policy');

const dmsCrmContractLifecycleModule = readText('apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.module.ts');
assertIncludes(dmsCrmContractLifecycleModule, 'DmsCrmContractLifecycleService', 'DMS CRM contract lifecycle module must provide the lifecycle execution service');
assertIncludes(dmsCrmContractLifecycleModule, 'DMS_CRM_CONTRACT_LIFECYCLE_STORAGE', 'DMS CRM contract lifecycle module must bind the storage boundary');
assertIncludes(dmsCrmContractLifecycleModule, 'storageAdapterService', 'DMS CRM contract lifecycle module must use the DMS storage adapter boundary');
assertIncludes(dmsCrmContractLifecycleModule, 'TemplatesModule', 'DMS CRM contract lifecycle module must validate the active CRM contract template');
assertIncludes(dmsCrmContractLifecycleModule, 'DatabaseModule', 'DMS CRM contract lifecycle module must use the common user/org directory');

const dmsCrmContractLifecycleController = readText('apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.controller.ts');
assertIncludes(dmsCrmContractLifecycleController, "@Controller('dms/crm-contract-lifecycle')", 'DMS CRM contract lifecycle controller must expose the DMS-owned route namespace');
assertIncludes(dmsCrmContractLifecycleController, "@Post('executions')", 'DMS CRM contract lifecycle controller must expose execution creation');
assertIncludes(dmsCrmContractLifecycleController, "RequireDmsFeature('canWriteDocuments')", 'DMS CRM contract lifecycle controller must require DMS write capability');
assertIncludes(dmsCrmContractLifecycleController, 'DmsCrmContractLifecycleExecutionDto', 'DMS CRM contract lifecycle controller must validate execution requests');

const dmsCrmContractLifecycleService = readText('apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.ts');
assertIncludes(dmsCrmContractLifecycleService, 'DMS_CRM_CONTRACT_LIFECYCLE_STORAGE', 'DMS CRM contract lifecycle service must expose an injectable storage boundary');
assertIncludes(dmsCrmContractLifecycleService, 'renderDocxTemplate', 'DMS CRM contract lifecycle service must render selected DOCX template binaries');
assertIncludes(dmsCrmContractLifecycleService, 'renderPdfArtifact', 'DMS CRM contract lifecycle service must render PDF artifacts');
assertIncludes(dmsCrmContractLifecycleService, 'loadActiveTemplate', 'DMS CRM contract lifecycle service must validate and load active DMS templates');
assertIncludes(dmsCrmContractLifecycleService, 'toTemplateVersionSnapshot', 'DMS CRM contract lifecycle service must capture template version evidence');
assertIncludes(dmsCrmContractLifecycleService, 'getApprovalRoutePolicy', 'DMS CRM contract lifecycle service must read the editable approval route policy');
assertIncludes(dmsCrmContractLifecycleService, 'getExportPolicy', 'DMS CRM contract lifecycle service must read the editable export policy');
assertIncludes(dmsCrmContractLifecycleService, 'configService.getConfig().crmContractApprovalRoute', 'DMS CRM contract lifecycle service must read approval route policy from DMS settings');
assertIncludes(dmsCrmContractLifecycleService, 'configService.getConfig().crmContractExportPolicy', 'DMS CRM contract lifecycle service must read export policy from DMS settings');
assertIncludes(dmsCrmContractLifecycleService, 'approvalRoutePolicy.requiredRoles', 'DMS CRM contract lifecycle service must build actors from configured approval roles');
assertIncludes(dmsCrmContractLifecycleService, 'toExportPolicyRecord', 'DMS CRM contract lifecycle service must resolve organization-scoped export paths');
assertNotIncludes(dmsCrmContractLifecycleService, 'const DMS_CRM_CONTRACT_APPROVAL_ROUTE', 'DMS CRM contract lifecycle service must not use a hardcoded approval route constant');
assertIncludes(dmsCrmContractLifecycleService, 'toApprovalRoute', 'DMS CRM contract lifecycle service must capture approval route evidence');
assertIncludes(dmsCrmContractLifecycleService, 'toApprovalRouteLedger', 'DMS CRM contract lifecycle service must capture approval route ledger sync evidence');
assertIncludes(dmsCrmContractLifecycleService, 'loadApprovalDirectoryUser', 'DMS CRM contract lifecycle service must sync approval actors from the common user/org directory');
assertIncludes(dmsCrmContractLifecycleService, 'toApprovalRouteActors', 'DMS CRM contract lifecycle service must return resolved approval route actors');
assertIncludes(dmsCrmContractLifecycleService, 'directorySyncStatus', 'DMS CRM contract lifecycle service must expose approval directory sync status');
assertIncludes(dmsCrmContractLifecycleService, 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m', 'DMS CRM contract lifecycle service must label the common user/org directory source');
assertIncludes(dmsCrmContractLifecycleService, 'toTemplateChangeReview', 'DMS CRM contract lifecycle service must capture template change review evidence');
assertIncludes(dmsCrmContractLifecycleService, 'toTemplateChangeRequestLedger', 'DMS CRM contract lifecycle service must capture template change request ledger evidence');
assertIncludes(dmsCrmContractLifecycleService, 'toAttachmentFinalizationLedger', 'DMS CRM contract lifecycle service must capture attachment finalization ledger evidence');
assertIncludes(dmsCrmContractLifecycleService, 'renderTemplateVersionRecord', 'DMS CRM contract lifecycle service must write template version evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderExportPolicyRecord', 'DMS CRM contract lifecycle service must write export policy evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderTemplateChangeReviewRecord', 'DMS CRM contract lifecycle service must write template change review evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderTemplateChangeRequestLedgerRecord', 'DMS CRM contract lifecycle service must write template change request ledger evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderAttachmentFinalizationLedgerRecord', 'DMS CRM contract lifecycle service must write attachment finalization ledger records');
assertIncludes(dmsCrmContractLifecycleService, 'renderApprovalRouteRecord', 'DMS CRM contract lifecycle service must write approval route evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderApprovalWorkflowRecord', 'DMS CRM contract lifecycle service must write approval workflow evidence records');
assertIncludes(dmsCrmContractLifecycleService, 'renderApprovalRouteLedgerRecord', 'DMS CRM contract lifecycle service must write approval route ledger sync records');
assertIncludes(dmsCrmContractLifecycleService, 'templateChangeReview', 'DMS CRM contract lifecycle service must return template change governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'exportPolicy', 'DMS CRM contract lifecycle service must return export policy governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'templateChangeRequestLedger', 'DMS CRM contract lifecycle service must return template change request ledger governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'attachmentFinalizationLedger', 'DMS CRM contract lifecycle service must return attachment finalization governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'approvalRoute', 'DMS CRM contract lifecycle service must return approval route governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'approvalRouteLedger', 'DMS CRM contract lifecycle service must return approval route ledger governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'approvalActors', 'DMS CRM contract lifecycle service must return multi-approver governance evidence');
assertIncludes(dmsCrmContractLifecycleService, 'storage.upload', 'DMS CRM contract lifecycle service must upload binary artifacts to DMS storage');
assertIncludes(dmsCrmContractLifecycleService, "'template-review'", 'DMS CRM contract lifecycle service must execute template review evidence');
assertIncludes(dmsCrmContractLifecycleService, "'attachment-confirmation'", 'DMS CRM contract lifecycle service must execute attachment confirmation evidence');
assertIncludes(dmsCrmContractLifecycleService, "'word-export'", 'DMS CRM contract lifecycle service must execute Word export evidence');
assertIncludes(dmsCrmContractLifecycleService, "'pdf-export'", 'DMS CRM contract lifecycle service must execute PDF export evidence');
assertIncludes(dmsCrmContractLifecycleService, "'approval'", 'DMS CRM contract lifecycle service must execute approval evidence');

const dmsCrmContractLifecycleServiceSpec = readText('apps/server/src/modules/dms/crm-contract-lifecycle/crm-contract-lifecycle.service.spec.ts');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'creates CRM contract lifecycle artifacts and returns CRM evidence steps', 'DMS CRM contract lifecycle spec must cover artifact execution');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'export-policy.md', 'DMS CRM contract lifecycle spec must cover export policy evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'template-version.md', 'DMS CRM contract lifecycle spec must cover template version evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'template-change-review.md', 'DMS CRM contract lifecycle spec must cover template change review evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'template-change-request-ledger.md', 'DMS CRM contract lifecycle spec must cover template change request ledger evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'attachment-finalization-ledger.md', 'DMS CRM contract lifecycle spec must cover attachment finalization ledger evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'approval-route.md', 'DMS CRM contract lifecycle spec must cover approval route evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'approval-workflow.md', 'DMS CRM contract lifecycle spec must cover approval workflow evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'approval-route-ledger.md', 'DMS CRM contract lifecycle spec must cover approval route ledger sync evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.templateVersion', 'DMS CRM contract lifecycle spec must assert governance template evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.exportPolicy', 'DMS CRM contract lifecycle spec must assert governance export policy evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.approvalRoute', 'DMS CRM contract lifecycle spec must assert governance approval route evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.approvalRouteLedger', 'DMS CRM contract lifecycle spec must assert governance approval route ledger evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'uses DMS settings approval route policy when building governance evidence', 'DMS CRM contract lifecycle spec must cover editable approval route policy settings');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'enterprise-contract-route', 'DMS CRM contract lifecycle spec must assert a configured approval route policy');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'uses DMS settings export policy when resolving organization-scoped artifact paths', 'DMS CRM contract lifecycle spec must cover editable export policy settings');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'sales-ops-contract-export', 'DMS CRM contract lifecycle spec must assert a configured export policy');
assertIncludes(dmsCrmContractLifecycleServiceSpec, "directorySyncStatus: 'synced'", 'DMS CRM contract lifecycle spec must assert synced common directory route evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, "organizationCode: 'SALES-OPS'", 'DMS CRM contract lifecycle spec must assert resolved organization directory evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.templateChangeReview', 'DMS CRM contract lifecycle spec must assert governance template change review evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.templateChangeRequestLedger', 'DMS CRM contract lifecycle spec must assert governance template change request ledger evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.attachmentFinalizationLedger', 'DMS CRM contract lifecycle spec must assert governance attachment finalization ledger evidence');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'result.governance.approvalActors', 'DMS CRM contract lifecycle spec must assert governance approval actors');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'rejects blocked attachments before artifact creation', 'DMS CRM contract lifecycle spec must cover blocked attachment guards');
assertIncludes(dmsCrmContractLifecycleServiceSpec, 'rejects inactive CRM contract templates', 'DMS CRM contract lifecycle spec must cover inactive template guards');

const dmsCrmQuoteLifecycleModule = readText('apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.module.ts');
assertIncludes(dmsCrmQuoteLifecycleModule, 'DmsCrmQuoteLifecycleService', 'DMS CRM quote lifecycle module must provide the lifecycle execution service');
assertIncludes(dmsCrmQuoteLifecycleModule, 'DMS_CRM_QUOTE_LIFECYCLE_STORAGE', 'DMS CRM quote lifecycle module must bind the storage boundary');
assertIncludes(dmsCrmQuoteLifecycleModule, 'storageAdapterService', 'DMS CRM quote lifecycle module must use the DMS storage adapter boundary');
assertIncludes(dmsCrmQuoteLifecycleModule, 'TemplatesModule', 'DMS CRM quote lifecycle module must validate the active CRM quote template');

const dmsCrmQuoteLifecycleController = readText('apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.controller.ts');
assertIncludes(dmsCrmQuoteLifecycleController, "@Controller('dms/crm-quote-lifecycle')", 'DMS CRM quote lifecycle controller must expose the DMS-owned route namespace');
assertIncludes(dmsCrmQuoteLifecycleController, "@Post('executions')", 'DMS CRM quote lifecycle controller must expose execution creation');
assertIncludes(dmsCrmQuoteLifecycleController, "RequireDmsFeature('canWriteDocuments')", 'DMS CRM quote lifecycle controller must require DMS write capability');
assertIncludes(dmsCrmQuoteLifecycleController, 'DmsCrmQuoteLifecycleExecutionDto', 'DMS CRM quote lifecycle controller must validate execution requests');

const dmsCrmQuoteLifecycleService = readText('apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.ts');
assertIncludes(dmsCrmQuoteLifecycleService, 'DMS_CRM_QUOTE_LIFECYCLE_STORAGE', 'DMS CRM quote lifecycle service must expose an injectable storage boundary');
assertIncludes(dmsCrmQuoteLifecycleService, 'renderDocxTemplate', 'DMS CRM quote lifecycle service must render selected DOCX template binaries');
assertIncludes(dmsCrmQuoteLifecycleService, 'renderPdfArtifact', 'DMS CRM quote lifecycle service must render PDF artifacts');
assertIncludes(dmsCrmQuoteLifecycleService, 'loadActiveTemplate', 'DMS CRM quote lifecycle service must validate and load active DMS templates');
assertIncludes(dmsCrmQuoteLifecycleService, 'toTemplateVersionSnapshot', 'DMS CRM quote lifecycle service must capture template version evidence');
assertIncludes(dmsCrmQuoteLifecycleService, 'renderTemplateVersionRecord', 'DMS CRM quote lifecycle service must write template version evidence records');
assertIncludes(dmsCrmQuoteLifecycleService, 'renderTemplateReviewRecord', 'DMS CRM quote lifecycle service must write template review evidence records');
assertIncludes(dmsCrmQuoteLifecycleService, 'storage.upload', 'DMS CRM quote lifecycle service must upload binary artifacts to DMS storage');
assertIncludes(dmsCrmQuoteLifecycleService, "'template-review'", 'DMS CRM quote lifecycle service must execute template review evidence');
assertIncludes(dmsCrmQuoteLifecycleService, "'word-export'", 'DMS CRM quote lifecycle service must execute Word export evidence');
assertIncludes(dmsCrmQuoteLifecycleService, "'pdf-export'", 'DMS CRM quote lifecycle service must execute PDF export evidence');

const dmsDocxTemplateRenderer = readText('apps/server/src/modules/dms/templates/docx-template-renderer.ts');
assertIncludes(dmsDocxTemplateRenderer, "JSZip.loadAsync", 'DMS DOCX template renderer must operate on real DOCX ZIP binaries');
assertIncludes(dmsDocxTemplateRenderer, 'REQUIRED_DOCX_ENTRIES', 'DMS DOCX template renderer must validate required OOXML entries');
assertIncludes(dmsDocxTemplateRenderer, "'word/document.xml'", 'DMS DOCX template renderer must render the main OOXML document part');
assertIncludes(dmsDocxTemplateRenderer, 'zip.generateAsync(', 'DMS DOCX template renderer must generate a downloadable DOCX binary');
assertIncludes(dmsDocxTemplateRenderer, "type: 'nodebuffer'", 'DMS DOCX template renderer must return a Node Buffer');

const dmsCrmQuoteLifecycleServiceSpec = readText('apps/server/src/modules/dms/crm-quote-lifecycle/crm-quote-lifecycle.service.spec.ts');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'creates CRM quote lifecycle artifacts and returns CRM evidence steps', 'DMS CRM quote lifecycle spec must cover artifact execution');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'template-version.md', 'DMS CRM quote lifecycle spec must cover template version evidence');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'template-review.md', 'DMS CRM quote lifecycle spec must cover template review evidence');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'result.governance.templateVersion', 'DMS CRM quote lifecycle spec must assert governance template evidence');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'rejects blocked quote lifecycle steps before artifact creation', 'DMS CRM quote lifecycle spec must cover blocked lifecycle guards');
assertIncludes(dmsCrmQuoteLifecycleServiceSpec, 'rejects inactive CRM quote templates', 'DMS CRM quote lifecycle spec must cover inactive template guards');

const dmsModule = readText('apps/server/src/modules/dms/dms.module.ts');
assertIncludes(dmsModule, 'DmsCrmContractLifecycleModule', 'DMS root module must expose CRM contract lifecycle execution');
assertIncludes(dmsModule, 'DmsCrmQuoteLifecycleModule', 'DMS root module must expose CRM quote lifecycle execution');

const crmContractModule = readText('apps/server/src/modules/crm/contract/contract.module.ts');
assertIncludes(crmContractModule, 'TemplatesModule', 'CRM contract module must import DMS TemplatesModule for template evidence');
assertIncludes(crmContractModule, 'DmsCrmContractLifecycleModule', 'CRM contract module must import the DMS lifecycle execution boundary');

const crmContractDto = readText('apps/server/src/modules/crm/contract/dto/contract.dto.ts');
assertIncludes(crmContractDto, 'CrmContractDmsDocumentDraftDto', 'CRM contract DTOs must validate DMS draft requests');
assertIncludes(crmContractDto, 'MaxLength(1000)', 'CRM DMS draft memo must keep a bounded input length');
assertIncludes(crmContractDto, 'CrmContractDmsDocumentExecutionEvidenceDto', 'CRM contract DTOs must validate DMS execution evidence requests');
assertIncludes(crmContractDto, 'CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS', 'CRM contract DTOs must restrict execution evidence to DMS-owned lifecycle steps');
assertIncludes(crmContractDto, 'CrmContractDmsDocumentLifecycleExecutionDto', 'CRM contract DTOs must validate DMS lifecycle execution requests');

const crmContractController = readText('apps/server/src/modules/crm/contract/contract.controller.ts');
assertIncludes(crmContractController, "@Post(':id/dms-document-draft')", 'CRM contract controller must expose DMS document draft creation');
assertIncludes(crmContractController, 'createDmsDocumentDraft', 'CRM contract controller must delegate DMS draft creation to the service');
assertIncludes(crmContractController, "@Post(':id/dms-document-execution-evidence')", 'CRM contract controller must expose DMS execution evidence recording');
assertIncludes(crmContractController, 'recordDmsDocumentExecutionEvidence', 'CRM contract controller must delegate DMS execution evidence recording to the service');
assertIncludes(crmContractController, "@Post(':id/dms-document-lifecycle-execution')", 'CRM contract controller must expose DMS lifecycle artifact execution');
assertIncludes(crmContractController, 'executeDmsDocumentLifecycle', 'CRM contract controller must delegate DMS lifecycle execution to the service');

const crmContractService = readText('apps/server/src/modules/crm/contract/contract.service.ts');
assertIncludes(crmContractService, 'FileCrudService', 'CRM contract service must use the DMS file service for draft writes');
assertIncludes(crmContractService, 'TemplateService', 'CRM contract service must use DMS TemplateService for template evidence');
assertIncludes(crmContractService, 'DmsCrmContractLifecycleService', 'CRM contract service must call the DMS lifecycle execution service');
assertIncludes(crmContractService, 'executeDmsDocumentLifecycle', 'CRM contract service must expose DMS lifecycle artifact execution');
assertIncludes(crmContractService, 'dmsExecution', 'CRM contract service must return DMS lifecycle execution artifacts');
assertIncludes(crmContractService, 'loadDmsTemplateEvidence', 'CRM contract service must load DMS template registry evidence');
assertIncludes(crmContractService, 'toDmsTemplateLifecycleStatus', 'CRM contract service must map template evidence into lifecycle status');
assertIncludes(crmContractService, 'toDmsAttachmentLifecycleStatus', 'CRM contract service must map attachment evidence into lifecycle status');
assertIncludes(crmContractService, 'toDmsAttachmentEvidencePath', 'CRM contract service must preserve DMS attachment evidence paths');
assertIncludes(crmContractService, 'resolveSellerCiReference', 'CRM contract service must verify configured DMS CI references');
assertIncludes(crmContractService, 'resolveDmsWorkingTreeCiReference', 'CRM contract service must resolve dms:// CI references against the DMS working tree');
assertIncludes(crmContractService, 'storageAdapterService.open', 'CRM contract service must validate storage-backed CI references through the DMS storage adapter');
assertIncludes(crmContractService, 'referenceStatus', 'CRM contract service must expose CI reference verification status on DMS attachments');
assertIncludes(crmContractService, 'recordDmsDocumentExecutionEvidence', 'CRM contract service must record DMS-owned execution evidence');
assertIncludes(crmContractService, 'applyDmsExecutionEvidenceToLifecycle', 'CRM contract service must apply DMS execution evidence to lifecycle snapshots');
assertIncludes(crmContractService, 'mergeDmsExecutionLifecycleEvidence', 'CRM contract service must preserve recorded DMS execution evidence on preview reload');
assertIncludes(crmContractService, 'execution-evidence-updated', 'CRM contract service must preserve a distinct DMS execution evidence handoff status');
assertIncludes(crmContractService, 'toDmsDocumentDraftMarkdown', 'CRM contract service must render a DMS markdown draft');
assertIncludes(crmContractService, 'draftPathHint', 'CRM contract service must return a stable DMS draft path hint');
assertIncludes(crmContractService, 'savedDraftPath', 'CRM contract service must preserve saved DMS draft path state on preview reload');
assertIncludes(crmContractService, 'loadLatestDmsDocumentHandoff', 'CRM contract service must load the latest DMS handoff snapshot');
assertIncludes(crmContractService, 'persistDmsDocumentHandoff', 'CRM contract service must persist DMS handoff snapshots');
assertIncludes(crmContractService, 'toDmsDocumentLifecycle', 'CRM contract service must build DMS document lifecycle steps');
assertIncludes(crmContractService, "'markdown-draft'", 'CRM contract lifecycle must include the CRM markdown draft step');
assertIncludes(crmContractService, "'word-export'", 'CRM contract lifecycle must include DMS Word export tracking');
assertIncludes(crmContractService, "'pdf-export'", 'CRM contract lifecycle must include DMS PDF export tracking');
assertIncludes(crmContractService, 'DMS 문서 lifecycle', 'CRM contract markdown draft must render the lifecycle evidence table');
assertIncludes(crmContractService, 'crm_contract_dms_handoff_m', 'CRM contract service must persist DMS handoff snapshots to a CRM-owned ledger');
assertIncludes(crmContractService, "'dms-handoff-create'", 'CRM contract service must record stable DMS handoff create activity');
assertIncludes(crmContractService, "dms_link_status_code = 'draft-created'", 'CRM contract service must mark contracts with a DMS draft-created status');
assertIncludes(crmContractService, "last_activity = 'dms-draft-create'", 'CRM contract service must audit DMS draft creation activity');

const crmContractServiceSpec = readText('apps/server/src/modules/crm/contract/contract.service.spec.ts');
assertIncludes(crmContractServiceSpec, 'creates a DMS markdown draft from a ready contract document packet', 'CRM contract spec must cover DMS draft creation');
assertIncludes(crmContractServiceSpec, 'keeps the saved DMS markdown draft path visible after preview reload', 'CRM contract spec must cover saved draft path preview reload');
assertIncludes(crmContractServiceSpec, 'createDmsHandoffRow', 'CRM contract spec must cover DMS handoff snapshot rows');
assertIncludes(crmContractServiceSpec, 'result.handoff', 'CRM contract spec must assert DMS handoff snapshot responses');
assertIncludes(crmContractServiceSpec, 'lifecycleSnapshot', 'CRM contract spec must assert lifecycle snapshot evidence');
assertIncludes(crmContractServiceSpec, 'fileCrud.write.calls', 'CRM contract spec must verify the DMS file write');
assertIncludes(crmContractServiceSpec, 'resolveFilePath.calls', 'CRM contract spec must verify DMS CI reference resolution');
assertIncludes(crmContractServiceSpec, 'referenceStatus: \'verified\'', 'CRM contract spec must assert verified DMS CI reference evidence');
assertIncludes(crmContractServiceSpec, 'marks the DMS template review step ready', 'CRM contract spec must cover DMS template evidence readiness');
assertIncludes(crmContractServiceSpec, 'system/crm-contract-v1.md', 'CRM contract spec must assert DMS template source path evidence');
assertIncludes(crmContractServiceSpec, 'crm-ct-doc#billing-plan:2', 'CRM contract spec must assert billing plan attachment evidence');
assertIncludes(crmContractServiceSpec, 'records DMS execution evidence on the active document handoff snapshot', 'CRM contract spec must cover DMS execution evidence recording');
assertIncludes(crmContractServiceSpec, 'dms://contracts/crm-ct-doc.pdf', 'CRM contract spec must assert DMS PDF execution evidence');
assertIncludes(crmContractServiceSpec, 'executes DMS lifecycle artifacts and records the returned evidence on the active handoff', 'CRM contract spec must cover DMS lifecycle artifact execution');
assertIncludes(crmContractServiceSpec, 'createDmsCrmContractLifecycleMock', 'CRM contract spec must verify the DMS lifecycle service boundary');
assertIncludes(crmContractServiceSpec, 'template-change-review.md', 'CRM contract spec must verify DMS template change review evidence propagation');
assertIncludes(crmContractServiceSpec, 'template-change-request-ledger.md', 'CRM contract spec must verify DMS template change request ledger evidence propagation');
assertIncludes(crmContractServiceSpec, 'attachment-finalization-ledger.md', 'CRM contract spec must verify DMS attachment finalization ledger evidence propagation');
assertIncludes(crmContractServiceSpec, 'approval-route.md', 'CRM contract spec must verify DMS approval route evidence propagation');
assertIncludes(crmContractServiceSpec, 'approval-workflow.md', 'CRM contract spec must verify DMS approval workflow evidence propagation');
assertIncludes(crmContractServiceSpec, 'approval-route-ledger.md', 'CRM contract spec must verify DMS approval route ledger evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.templateVersion', 'CRM contract spec must verify DMS governance template evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.approvalRoute', 'CRM contract spec must verify DMS governance approval route evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.approvalRouteLedger', 'CRM contract spec must verify DMS governance approval route ledger evidence propagation');
assertIncludes(crmContractServiceSpec, "directorySyncStatus: 'synced'", 'CRM contract spec must verify synced DMS approval directory evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.templateChangeReview', 'CRM contract spec must verify DMS governance template change review evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.templateChangeRequestLedger', 'CRM contract spec must verify DMS governance template change request ledger evidence propagation');
assertIncludes(crmContractServiceSpec, 'result.dmsExecution.governance.attachmentFinalizationLedger', 'CRM contract spec must verify DMS governance attachment finalization ledger evidence propagation');

const crmDmsDocumentDraftRoute = readText('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-draft/route.ts');
assertIncludes(crmDmsDocumentDraftRoute, '/dms-document-draft', 'CRM web proxy must forward DMS draft creation requests');
assertIncludes(crmDmsDocumentDraftRoute, "method: 'POST'", 'CRM web proxy must use POST for DMS draft creation');

const crmQuoteDmsDocumentDraftRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-draft/route.ts');
assertIncludes(crmQuoteDmsDocumentDraftRoute, '/quote-dms-document-draft', 'CRM web proxy must forward quote DMS draft creation requests');
assertIncludes(crmQuoteDmsDocumentDraftRoute, "method: 'POST'", 'CRM web proxy must use POST for quote DMS draft creation');

const crmQuoteDmsLifecycleExecutionRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-dms-document-lifecycle-execution/route.ts');
assertIncludes(crmQuoteDmsLifecycleExecutionRoute, '/quote-dms-document-lifecycle-execution', 'CRM web proxy must forward quote DMS lifecycle execution requests');
assertIncludes(crmQuoteDmsLifecycleExecutionRoute, "method: 'POST'", 'CRM web proxy must use POST for quote DMS lifecycle execution');

const crmDmsExecutionEvidenceRoute = readText('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-execution-evidence/route.ts');
assertIncludes(crmDmsExecutionEvidenceRoute, '/dms-document-execution-evidence', 'CRM web proxy must forward DMS execution evidence requests');
assertIncludes(crmDmsExecutionEvidenceRoute, "method: 'POST'", 'CRM web proxy must use POST for DMS execution evidence recording');

const crmDmsLifecycleExecutionRoute = readText('apps/web/crm/src/app/api/crm/contracts/[id]/dms-document-lifecycle-execution/route.ts');
assertIncludes(crmDmsLifecycleExecutionRoute, '/dms-document-lifecycle-execution', 'CRM web proxy must forward DMS lifecycle execution requests');
assertIncludes(crmDmsLifecycleExecutionRoute, "method: 'POST'", 'CRM web proxy must use POST for DMS lifecycle execution');

const crmContractWorkspaceLifecycle = readText('apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx');
assertIncludes(crmContractWorkspaceLifecycle, 'DMS Lifecycle', 'CRM contract UI must render DMS lifecycle steps');
assertIncludes(crmContractWorkspaceLifecycle, 'lifecycleSteps.map', 'CRM contract UI must iterate lifecycle steps');
assertIncludes(crmContractWorkspaceLifecycle, 'attachment.evidencePath', 'CRM contract UI must render attachment evidence paths');
assertIncludes(crmContractWorkspaceLifecycle, 'attachment.referenceStatus', 'CRM contract UI must render DMS CI reference verification status');
assertIncludes(crmContractWorkspaceLifecycle, 'getAttachmentReferenceStatusLabel', 'CRM contract UI must label CI reference verification states');
assertIncludes(crmContractWorkspaceLifecycle, 'executeDmsDocumentLifecycle', 'CRM contract UI must expose DMS lifecycle execution action');
assertIncludes(crmContractWorkspaceLifecycle, 'DMS 산출 실행', 'CRM contract UI must render the DMS lifecycle execution button');
assertIncludes(crmContractWorkspaceLifecycle, 'dmsExecution.artifacts', 'CRM contract UI must render DMS lifecycle execution artifacts');
assertIncludes(crmContractWorkspaceLifecycle, 'DMS Governance Evidence', 'CRM contract UI must render DMS lifecycle governance evidence');
assertIncludes(crmContractWorkspaceLifecycle, 'activeLifecycleExecution.dmsExecution.governance', 'CRM contract UI must consume DMS lifecycle governance evidence from execution results');
assertIncludes(crmContractWorkspaceLifecycle, 'governance.exportPolicy', 'CRM contract UI must render DMS export policy governance evidence');
assertIncludes(crmContractWorkspaceLifecycle, 'resolvedArtifactPath', 'CRM contract UI must show organization-scoped DMS artifact paths');
assertIncludes(crmContractWorkspaceLifecycle, 'attachmentFinalizationLedger', 'CRM contract UI must render DMS attachment finalization ledger evidence');
assertIncludes(crmContractWorkspaceLifecycle, 'approvalRouteLedger', 'CRM contract UI must render DMS approval route ledger evidence');
assertIncludes(crmContractWorkspaceLifecycle, 'approvalActors', 'CRM contract UI must render DMS approval actor evidence');

const crmContractDmsHandoffMigration = readText('packages/database/prisma/migrations/20260709120000_add_crm_contract_dms_handoff/migration.sql');
assertIncludes(crmContractDmsHandoffMigration, 'crm_contract_dms_handoff_m', 'CRM contract DMS handoff migration must create the handoff snapshot ledger');
assertIncludes(crmContractDmsHandoffMigration, 'document_snapshot', 'CRM contract DMS handoff migration must persist the document packet snapshot');
assertIncludes(crmContractDmsHandoffMigration, 'variables_snapshot', 'CRM contract DMS handoff migration must persist variable snapshots');
assertIncludes(crmContractDmsHandoffMigration, 'attachments_snapshot', 'CRM contract DMS handoff migration must persist attachment snapshots');
assertIncludes(crmContractDmsHandoffMigration, 'ux_crm_contract_dms_handoff_m_active_contract_template', 'CRM contract DMS handoff migration must keep one active handoff per contract/template');

const crmQuoteDmsHandoffMigration = readText('packages/database/prisma/migrations/20260710100000_add_crm_quote_dms_handoff/migration.sql');
assertIncludes(crmQuoteDmsHandoffMigration, 'crm_quote_dms_handoff_m', 'CRM quote DMS handoff migration must create the quote handoff snapshot ledger');
assertIncludes(crmQuoteDmsHandoffMigration, 'quote_number', 'CRM quote DMS handoff migration must persist quote numbers');
assertIncludes(crmQuoteDmsHandoffMigration, 'document_snapshot', 'CRM quote DMS handoff migration must persist the quote document snapshot');
assertIncludes(crmQuoteDmsHandoffMigration, 'variables_snapshot', 'CRM quote DMS handoff migration must persist quote variable snapshots');
assertIncludes(crmQuoteDmsHandoffMigration, 'ux_crm_quote_dms_handoff_m_active_opportunity_template', 'CRM quote DMS handoff migration must keep one active handoff per opportunity/template');

const crmContractWorkspace = readText('apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx');
assertIncludes(crmContractWorkspace, 'createDmsDocumentDraft', 'CRM contract workspace must expose DMS draft creation action');
assertIncludes(crmContractWorkspace, 'DMS 초안 저장', 'CRM contract workspace must render the DMS draft save button');
assertIncludes(crmContractWorkspace, 'DMS 초안 갱신', 'CRM contract workspace must show draft refresh semantics after a saved draft exists');
assertIncludes(crmContractWorkspace, 'activePreview.draftPathHint', 'CRM contract workspace must show deterministic DMS draft path hints');
assertIncludes(crmContractWorkspace, 'activePreview?.savedDraftPath', 'CRM contract workspace must show saved DMS draft paths after preview reload');
assertIncludes(crmContractWorkspace, 'activePreview?.latestHandoff', 'CRM contract workspace must show the latest DMS handoff snapshot');
assertIncludes(crmContractWorkspace, 'Handoff ID', 'CRM contract workspace must render DMS handoff identifiers');
assertIncludes(crmContractWorkspace, 'savedPath', 'CRM contract workspace must show the saved DMS path');

const pmsAiRagRuntimeEvidence = readText('scripts/verify-pms-ai-rag-runtime-evidence.mjs');
assertIncludes(pmsAiRagRuntimeEvidence, '/projects/ai-index/backfill', 'PMS AI/RAG runtime evidence must queue project backfill jobs');
assertIncludes(pmsAiRagRuntimeEvidence, '/tasks/ai-index/backfill', 'PMS AI/RAG runtime evidence must queue task backfill jobs');
assertIncludes(pmsAiRagRuntimeEvidence, "sourceApp: 'pms'", 'PMS AI/RAG runtime evidence must query common retrieval with PMS source scope');
assertIncludes(pmsAiRagRuntimeEvidence, "entityTypes: ['project']", 'PMS AI/RAG runtime evidence must verify project retrieval scope');
assertIncludes(pmsAiRagRuntimeEvidence, "entityTypes: ['task']", 'PMS AI/RAG runtime evidence must verify task retrieval scope');
assertIncludes(pmsAiRagRuntimeEvidence, "entityTypes: ['projectMember']", 'PMS AI/RAG runtime evidence must verify project member retrieval scope');
assertIncludes(pmsAiRagRuntimeEvidence, "entityTypes: ['projectStatus']", 'PMS AI/RAG runtime evidence must verify project status retrieval scope');
assertIncludes(pmsAiRagRuntimeEvidence, "entityType: 'projectMember'", 'PMS AI/RAG runtime evidence must queue project member AI jobs');
assertIncludes(pmsAiRagRuntimeEvidence, "entityType: 'projectStatus'", 'PMS AI/RAG runtime evidence must queue project status AI jobs');
assertIncludes(pmsAiRagRuntimeEvidence, 'common.cm_ai_object_m', 'PMS AI/RAG runtime evidence must verify common AI object rows');
assertIncludes(pmsAiRagRuntimeEvidence, 'common.cm_ai_chunk_m', 'PMS AI/RAG runtime evidence must verify common AI chunk rows');
assertIncludes(pmsAiRagRuntimeEvidence, 'common.cm_ai_acl_snapshot_m', 'PMS AI/RAG runtime evidence must verify common AI ACL rows');
assertIncludes(pmsAiRagRuntimeEvidence, 'common.cm_ai_embedding_m', 'PMS AI/RAG runtime evidence must verify provider-ready embeddings');
assertIncludes(pmsAiRagRuntimeEvidence, 'common.cm_ai_retrieval_log_m', 'PMS AI/RAG runtime evidence must verify retrieval audit rows');
assertIncludes(pmsAiRagRuntimeEvidence, "providerMode === 'ready'", 'PMS AI/RAG runtime evidence must distinguish provider-ready assertions');
assertIncludes(pmsAiRagRuntimeEvidence, 'summaryPath', 'PMS AI/RAG runtime evidence must support human-readable summary artifacts');
assertIncludes(pmsAiRagRuntimeEvidence, 'writeMarkdownSummary', 'PMS AI/RAG runtime evidence must write Markdown summaries for launch evidence review');
assertIncludes(pmsAiRagRuntimeEvidence, 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', 'PMS AI/RAG runtime evidence must accept canonical provider-ready report path env');
assertIncludes(pmsAiRagRuntimeEvidence, 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', 'PMS AI/RAG runtime evidence must accept canonical provider-ready summary path env');
assertIncludes(pmsAiRagRuntimeEvidence, 'Provider-unavailable mode passed', 'PMS AI/RAG runtime evidence summary must distinguish fallback evidence from provider-ready proof');

const pmsCompletionRunner = readText('scripts/complete-pms-ai-rag-provider-ready.mjs');
const pmsEvidenceRecorder = readText('scripts/record-pms-ai-rag-provider-ready-evidence.mjs');
assertIncludes(pmsCompletionRunner, 'verify:pms-ai-rag-runtime:ready-precheck', 'PMS AI/RAG completion runner must start with provider-ready precheck');
assertIncludes(pmsCompletionRunner, 'verify:pms-ai-rag-runtime:ready', 'PMS AI/RAG completion runner must run provider-ready PMS runtime evidence by default');
assertIncludes(pmsCompletionRunner, 'verify:pms-ai-rag-runtime-report', 'PMS AI/RAG completion runner must verify the provider-ready report');
assertIncludes(pmsCompletionRunner, 'record:pms-ai-rag-provider-ready-evidence', 'PMS AI/RAG completion runner must record PMS provider-ready evidence');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', 'PMS AI/RAG completion runner must support provider-ready report path env');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', 'PMS AI/RAG completion runner must support provider-ready summary path env');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'PMS AI/RAG completion runner must support provider-ready evidence block path env');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', 'PMS AI/RAG completion runner must support provider-ready backlog evidence doc env');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', 'PMS AI/RAG completion runner must support provider-ready close brief evidence doc env');
assertIncludes(pmsCompletionRunner, 'PMS_AI_RAG_PROVIDER_READY_ENV_FILE', 'PMS AI/RAG completion runner must support provider-ready env file path env');
assertIncludes(pmsCompletionRunner, '--env-file', 'PMS AI/RAG completion runner must support explicit provider-ready env files');
assertIncludes(pmsCompletionRunner, '--use-existing-artifacts', 'PMS AI/RAG completion runner must support verified artifact-only replay');
assertIncludes(pmsCompletionRunner, '--dry-run', 'PMS AI/RAG completion runner must support evidence dry-run mode');
assertIncludes(pmsCompletionRunner, '--docker-runtime', 'PMS AI/RAG completion runner must support managed Docker runtime mode');
assertIncludes(pmsCompletionRunner, "buildDockerComposeArgs(options, ['up', '-d', '--build', 'server'])", 'PMS AI/RAG completion runner must be able to start the Docker server runtime');
assertIncludes(pmsCompletionRunner, "'--env-file'", 'PMS AI/RAG completion runner must pass provider-ready env files to Docker Compose interpolation');
assertIncludes(pmsCompletionRunner, "step.label === 'PMS provider-ready runtime evidence'", 'PMS AI/RAG completion runner must start Docker before the live PMS evidence step');
assertIncludes(pmsCompletionRunner, 'waitForRuntimeHealth', 'PMS AI/RAG completion runner must wait for server health before live PMS evidence');
assertIncludes(pmsCompletionRunner, "buildDockerComposeArgs(options, ['down', '--remove-orphans'])", 'PMS AI/RAG completion runner must expose non-volume cleanup for managed Docker runtime mode');
assertIncludes(pmsCompletionRunner, '--self-test', 'PMS AI/RAG completion runner must expose a self-test mode');
assertIncludes(pmsEvidenceRecorder, 'verify-pms-ai-rag-runtime-report.mjs', 'PMS AI/RAG evidence recorder must verify the PMS runtime report before recording docs');
assertIncludes(pmsEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'PMS AI/RAG evidence recorder must support provider-ready evidence block output path env');
assertIncludes(pmsEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', 'PMS AI/RAG evidence recorder must support the PMS backlog evidence doc env');
assertIncludes(pmsEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', 'PMS AI/RAG evidence recorder must support the PMS close brief evidence doc env');
assertIncludes(pmsEvidenceRecorder, '--dry-run', 'PMS AI/RAG evidence recorder must support a non-mutating evidence dry-run');
assertIncludes(pmsEvidenceRecorder, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START', 'PMS AI/RAG evidence recorder must use stable PMS docs evidence markers');
assertIncludes(pmsEvidenceRecorder, 'Report SHA256', 'PMS AI/RAG evidence recorder must bind docs evidence to the JSON report digest');
assertIncludes(pmsEvidenceRecorder, 'Summary SHA256', 'PMS AI/RAG evidence recorder must bind docs evidence to the Markdown summary digest');
assertIncludes(pmsEvidenceRecorder, 'projectMember:', 'PMS AI/RAG evidence recorder must record project member evidence coverage');
assertIncludes(pmsEvidenceRecorder, 'projectStatus:', 'PMS AI/RAG evidence recorder must record project status evidence coverage');

const crmAiRagRuntimeEvidence = readText('scripts/verify-crm-ai-rag-runtime-evidence.mjs');
assertIncludes(crmAiRagRuntimeEvidence, '/crm/customers/ai-index/backfill', 'CRM AI/RAG runtime evidence must queue controlled customer/activity backfill jobs');
assertIncludes(crmAiRagRuntimeEvidence, "sourceApp: 'crm'", 'CRM AI/RAG runtime evidence must query common retrieval with CRM source scope');
assertIncludes(crmAiRagRuntimeEvidence, "entityTypes: ['opportunity']", 'CRM AI/RAG runtime evidence must verify opportunity retrieval scope');
assertIncludes(crmAiRagRuntimeEvidence, "entityTypes: ['customer']", 'CRM AI/RAG runtime evidence must verify customer retrieval scope');
assertIncludes(crmAiRagRuntimeEvidence, "entityTypes: ['activity']", 'CRM AI/RAG runtime evidence must verify activity retrieval scope');
assertIncludes(crmAiRagRuntimeEvidence, "entityType: 'opportunity'", 'CRM AI/RAG runtime evidence must queue opportunity AI jobs');
assertIncludes(crmAiRagRuntimeEvidence, "entityType: 'customer'", 'CRM AI/RAG runtime evidence must verify customer AI jobs');
assertIncludes(crmAiRagRuntimeEvidence, "entityType: 'activity'", 'CRM AI/RAG runtime evidence must verify activity AI jobs');
assertIncludes(crmAiRagRuntimeEvidence, 'common.cm_ai_object_m', 'CRM AI/RAG runtime evidence must verify common AI object rows');
assertIncludes(crmAiRagRuntimeEvidence, 'common.cm_ai_chunk_m', 'CRM AI/RAG runtime evidence must verify common AI chunk rows');
assertIncludes(crmAiRagRuntimeEvidence, 'common.cm_ai_acl_snapshot_m', 'CRM AI/RAG runtime evidence must verify common AI ACL rows');
assertIncludes(crmAiRagRuntimeEvidence, 'common.cm_ai_embedding_m', 'CRM AI/RAG runtime evidence must verify provider-ready embeddings');
assertIncludes(crmAiRagRuntimeEvidence, 'common.cm_ai_retrieval_log_m', 'CRM AI/RAG runtime evidence must verify retrieval audit rows');
assertIncludes(crmAiRagRuntimeEvidence, "providerMode === 'ready'", 'CRM AI/RAG runtime evidence must distinguish provider-ready assertions');

const schema = readText('packages/database/prisma/schema.prisma');
assertIncludes(schema, 'schemas  = ["common", "pms", "dms", "sns", "crm"]', 'Prisma schema datasource must include CRM schema');
for (const model of [
  'model AiSource',
  'model AiObject',
  'model AiChunk',
  'model AiEmbedding',
  'model AiAclSnapshot',
  'model AiIndexJob',
  'model AiIndexState',
  'model AiRetrievalLog',
  'model AiConversation',
  '@@map("cm_ai_source_m")',
  '@@map("cm_ai_object_m")',
  '@@map("cm_ai_embedding_m")',
  'model CrmOpportunity',
  'model CrmOpportunityLine',
  'model CrmQuoteDmsHandoff',
  '@@map("crm_opportunity_m")',
  '@@map("crm_opportunity_line_d")',
  '@@map("crm_quote_dms_handoff_m")',
  '@@schema("crm")',
]) {
  assertIncludes(schema, model, `Prisma schema missing ${model}`);
}

const migration = readText('packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql');
for (const table of [
  '"common"."cm_ai_source_m"',
  '"common"."cm_ai_object_m"',
  '"common"."cm_ai_chunk_m"',
  '"common"."cm_ai_embedding_m"',
  '"common"."cm_ai_index_job_m"',
  '"common"."cm_ai_index_state_m"',
  '"common"."cm_ai_conversation_m"',
]) {
  assertIncludes(migration, table, `AI/RAG migration missing ${table}`);
}

const crmOpportunityMigration = readText('packages/database/prisma/migrations/20260702090000_add_crm_opportunity_ledger/migration.sql');
for (const crmTable of [
  'CREATE SCHEMA IF NOT EXISTS "crm"',
  '"crm"."crm_opportunity_m"',
  '"crm"."crm_opportunity_line_d"',
  '"crm"."crm_opportunity_h"',
  '"crm"."crm_opportunity_line_h"',
]) {
  assertIncludes(crmOpportunityMigration, crmTable, `CRM opportunity migration missing ${crmTable}`);
}

const compat = readText('packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql');
assertIncludes(compat, 'DISABLE TRIGGER trg_cm_ai_object_h', 'AI/RAG compat must disable legacy object history trigger during backfill');
assertIncludes(compat, 'ENABLE TRIGGER trg_cm_ai_object_h', 'AI/RAG compat must re-enable object history trigger after backfill');
assertIncludes(compat, 'cm_ai_retrieval_log_item_m', 'AI/RAG compat must create canonical retrieval log item table when legacy DB lacks it');
assertIncludes(compat, 'cm_ai_conversation_m', 'AI/RAG compat must create canonical conversation table when legacy DB lacks it');
assertIncludes(compat, 'cm_ai_run_source_r', 'AI/RAG compat must create canonical run source table when legacy DB lacks it');
assertIncludes(compat, 'priority_no', 'AI/RAG compat must bridge legacy job priority to canonical priority_no');
assertIncludes(compat, 'profile_code', 'AI/RAG compat must bridge legacy embedding/index profile columns');
assertIncludes(compat, 'index_status_code SET DEFAULT', 'AI/RAG compat must keep legacy object history NOT NULL columns insertable');
assertIncludes(compat, 'ux_cm_ai_embedding_m_chunk_profile_code', 'AI/RAG compat must add a unique index for canonical embedding profile upserts');

const applyTriggers = readText('packages/database/scripts/apply-triggers.ts');
assertIncludes(applyTriggers, '63_cm_ai_source_h_trigger.sql', 'apply-triggers must include AI source history trigger');
assertIncludes(applyTriggers, '64_cm_ai_object_h_trigger.sql', 'apply-triggers must include AI object history trigger');
assertIncludes(applyTriggers, '65_cm_ai_index_state_h_trigger.sql', 'apply-triggers must include AI index state history trigger');
assertIncludes(applyTriggers, '66_crm_opportunity_h_trigger.sql', 'apply-triggers must include CRM opportunity history trigger');
assertIncludes(applyTriggers, '67_crm_opportunity_line_h_trigger.sql', 'apply-triggers must include CRM opportunity line history trigger');

const applyAllTriggers = readText('packages/database/prisma/triggers/apply_all_triggers.sql');
assertIncludes(applyAllTriggers, '66_crm_opportunity_h_trigger.sql', 'apply_all_triggers must include CRM opportunity history trigger');
assertIncludes(applyAllTriggers, '67_crm_opportunity_line_h_trigger.sql', 'apply_all_triggers must include CRM opportunity line history trigger');

const dbSeedScript = readText('.codex/scripts/db-seed.sh');
assertIncludes(dbSeedScript, '18_crm_access_policy_foundation.sql', 'codex DB seed script must include CRM access policy seed');
assertIncludes(dbSeedScript, '52_crm_opportunities.sql', 'codex DB seed script must include CRM opportunity seed');

const allSeeds = readText('packages/database/prisma/seeds/apply_all_seeds.sql');
assertIncludes(allSeeds, '18_crm_access_policy_foundation.sql', 'apply_all_seeds must include CRM access policy seed');
assertIncludes(allSeeds, '21_demo_project_statuses.sql', 'apply_all_seeds must include PMS demo project status detail seed for PMS AI/RAG runtime evidence');
assertIncludes(allSeeds, '52_crm_opportunities.sql', 'apply_all_seeds must include CRM opportunity seed');

const pmsProjectStatusSeed = readText('packages/database/prisma/seeds/21_demo_project_statuses.sql');
assertIncludes(pmsProjectStatusSeed, 'pms.pr_project_status_m', 'PMS project status seed must populate project status detail rows');
assertIncludes(pmsProjectStatusSeed, 'demo_project_status_baseline', 'PMS project status seed must expose a stable seed activity marker');

const crmOpportunitySeed = readText('packages/database/prisma/seeds/52_crm_opportunities.sql');
assertIncludes(crmOpportunitySeed, 'crm.crm_opportunity_m', 'CRM opportunity seed must seed CRM opportunity master table');
assertIncludes(crmOpportunitySeed, 'crm.crm_opportunity_line_d', 'CRM opportunity seed must seed CRM opportunity line table');
assertIncludes(crmOpportunitySeed, 'crm-opp-001', 'CRM opportunity seed must preserve first surface opportunity code');
assertIncludes(crmOpportunityMigration, 'opportunity_group_code', 'CRM opportunity migration must include opportunity group codes for version flow');
assertIncludes(crmOpportunityMigration, 'ux_crm_opportunity_m_group_version', 'CRM opportunity migration must enforce group/version uniqueness');
assertIncludes(crmOpportunitySeed, 'opportunity_group_code', 'CRM opportunity seed must seed opportunity group codes');
assertIncludes(crmOpportunityMigration, '"payment_term_code" VARCHAR(80)', 'CRM opportunity migration must preserve payment term header fields');
assertIncludes(crmOpportunityMigration, '"revenue_subtotal" BIGINT', 'CRM opportunity migration must separate gross revenue from discounted final revenue');
assertIncludes(crmOpportunityMigration, '"special_discount_amount" BIGINT', 'CRM opportunity migration must persist calculated special discount amounts');
assertIncludes(crmOpportunitySeed, 'payment_term_code', 'CRM opportunity seed must include payment term values');
assertIncludes(crmOpportunitySeed, 'special_discount_type_code', 'CRM opportunity seed must include special discount type values');
assertIncludes(crmOpportunityMigration, '"quantity" DECIMAL(12,2)', 'CRM opportunity line migration must preserve demo quantity/MM metadata');
assertIncludes(crmOpportunityMigration, '"unit_price" BIGINT', 'CRM opportunity line migration must preserve demo unit price metadata');
assertIncludes(crmOpportunityMigration, '"revenue_linked" BOOLEAN', 'CRM opportunity line migration must preserve cost-to-revenue linkage metadata');
assertIncludes(crmOpportunitySeed, 'service_type_code', 'CRM opportunity seed must seed service type line metadata');
assertIncludes(crmOpportunitySeed, 'revenue_linked', 'CRM opportunity seed must seed cost-to-revenue linkage metadata');

const commonModule = readText('apps/server/src/modules/common/common.module.ts');
assertIncludes(commonModule, 'CommonAiIndexModule', 'CommonModule must include CommonAiIndexModule');

const commonAiIndexModule = readText('apps/server/src/modules/common/ai-index/ai-index.module.ts');
assertIncludes(commonAiIndexModule, 'AiEmbeddingProviderService', 'CommonAiIndexModule must provide AiEmbeddingProviderService');
assertIncludes(commonAiIndexModule, 'AiRetrievalService', 'CommonAiIndexModule must provide AiRetrievalService');
assertIncludes(commonAiIndexModule, 'AiConversationService', 'CommonAiIndexModule must provide AiConversationService');
assertIncludes(commonAiIndexModule, 'AiModelGatewayService', 'CommonAiIndexModule must provide AiModelGatewayService');
assertIncludes(commonAiIndexModule, 'AiIndexWorkerService', 'CommonAiIndexModule must provide the AI index worker boundary');
assertIncludes(commonAiIndexModule, 'AiIndexSchedulerService', 'CommonAiIndexModule must provide the AI index scheduler binding');

const aiAzureProvider = readText('apps/server/src/modules/common/ai-index/ai-azure-provider.ts');
assertIncludes(aiAzureProvider, 'AiChatProviderStatus', 'Common Azure provider must expose chat provider status');
assertIncludes(aiAzureProvider, 'getAzureChatProviderStatus', 'Common Azure provider must expose chat readiness checks');
assertIncludes(aiAzureProvider, 'AZURE_OPENAI_CHAT_DEPLOYMENT', 'Common Azure provider must support explicit chat deployment env');
assertIncludes(aiAzureProvider, 'isPlaceholderConfigValue', 'Azure embedding provider readiness must reject placeholder config values');
assertIncludes(aiAzureProvider, 'placeholder_embedding_deployment', 'Azure embedding provider readiness must report placeholder embedding deployment values as unavailable');

const aiAzureProviderSpec = readText('apps/server/src/modules/common/ai-index/ai-azure-provider.spec.ts');
assertIncludes(aiAzureProviderSpec, '<embedding-deployment>', 'Azure embedding provider spec must cover placeholder deployment values');
assertIncludes(aiAzureProviderSpec, 'placeholder_embedding_deployment', 'Azure embedding provider spec must assert placeholder unavailability reason');

const aiEmbeddingProvider = readText('apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts');
assertIncludes(aiEmbeddingProvider, 'AiEmbeddingProviderUnavailableError', 'AI embedding provider must expose deterministic unavailable errors');
assertIncludes(aiEmbeddingProvider, 'embedTexts', 'AI embedding provider must expose batch embedding');

const aiModelGateway = readText('apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts');
assertIncludes(aiModelGateway, 'AiModelGatewayService', 'AI model gateway service must exist');
assertIncludes(aiModelGateway, 'getAzureChatProviderStatus', 'AI model gateway must own provider readiness');
assertIncludes(aiModelGateway, 'generateText', 'AI model gateway must own non-stream text generation');
assertIncludes(aiModelGateway, 'streamText', 'AI model gateway must own streaming text generation');

const aiIndexingService = readText('apps/server/src/modules/common/ai-index/ai-indexing.service.ts');
assertIncludes(aiIndexingService, 'assertAiIndexObjectProjection', 'AI indexer must validate adapter projections before DB writes');
assertIncludes(aiIndexingService, 'syncObjectChunks', 'AI indexer must sync chunks without deleting stable chunk identities');
assertIncludes(aiIndexingService, 'upsertChunkEmbeddings', 'AI indexer must upsert common chunk embeddings');
assertIncludes(aiIndexingService, 'common.cm_ai_embedding_m', 'AI indexer must write to common AI embedding table');
assertIncludes(aiIndexingService, 'embedding_hash', 'AI indexer must diff embeddings by chunk hash');
assertIncludes(aiIndexingService, 'DEFAULT_EMBEDDING_BATCH_SIZE', 'AI indexer must define an embedding batch policy');
assertIncludes(aiIndexingService, 'computeRetryDelayMs', 'AI indexer must compute retry backoff from job safety policy');
assertIncludes(aiIndexingService, 'getJobQueueMetrics', 'AI indexer must expose job queue observability metrics');
assertIncludes(aiIndexingService, 'retry_waiting_count', 'AI indexer metrics must expose retry waiting backlog counts');
assertIncludes(aiIndexingService, 'metadata_jsonb', 'AI index jobs/states must persist safety metadata');
assertIncludes(aiIndexingService, 'AiEmbeddingSyncError', 'AI indexer must persist failed embedding sync state before retry');
assertIncludes(aiIndexingService, 'deactivateProfileMismatchEmbeddings', 'AI indexer must deactivate profile-mismatch embeddings');
assertIncludes(aiIndexingService, 'profileMismatchReindex', 'AI indexer must record profile mismatch reindex metadata');
assertIncludes(aiIndexingService, 'AI_INDEX_SOURCE_BASELINES', 'AI indexer must keep planned source coverage visible');
assertIncludes(aiIndexingService, 'createMissingSourceStatus', 'AI indexer must return missing adapter status for unregistered planned sources');
assertIncludes(aiIndexingService, "registrationStatus: 'missing_adapter'", 'AI indexer must label planned sources without adapters');

const aiIndexingServiceSpec = readText('apps/server/src/modules/common/ai-index/ai-indexing.service.spec.ts');
assertIncludes(aiIndexingServiceSpec, 'getSourceStatuses', 'AI indexer spec must cover source status API behavior');
assertIncludes(aiIndexingServiceSpec, 'missing_adapter', 'AI indexer spec must guard planned source adapter gaps');
assertIncludes(aiIndexingServiceSpec, "['admin', 'crm', 'dms', 'pms', 'sns']", 'AI indexer spec must keep planned source coverage complete');
assertIncludes(aiIndexingServiceSpec, 'summarizes runnable, retry-waiting, and exhausted AI index jobs', 'AI indexer spec must cover queue observability metrics');

const aiIndexWorkerService = readText('apps/server/src/modules/common/ai-index/ai-index-worker.service.ts');
assertIncludes(aiIndexWorkerService, 'AiIndexWorkerService', 'AI index worker service must exist');
assertIncludes(aiIndexWorkerService, 'runPendingJobs', 'AI index worker service must own pending job execution entrypoint');

const aiIndexWorkerServiceSpec = readText('apps/server/src/modules/common/ai-index/ai-index-worker.service.spec.ts');
assertIncludes(aiIndexWorkerServiceSpec, 'delegates pending job execution through the worker boundary', 'AI index worker spec must cover worker delegation');

const aiIndexSchedulerService = readText('apps/server/src/modules/common/ai-index/ai-index-scheduler.service.ts');
assertIncludes(aiIndexSchedulerService, 'AI_INDEX_WORKER_ENABLED', 'AI index scheduler must be controlled by an explicit enable env var');
assertIncludes(aiIndexSchedulerService, 'setInterval', 'AI index scheduler must bind the worker to an interval trigger');
assertIncludes(aiIndexSchedulerService, 'runOnce', 'AI index scheduler must expose a one-shot worker run path');
assertIncludes(aiIndexSchedulerService, 'AI_INDEX_WORKER_BATCH_LIMIT', 'AI index scheduler must support bounded batch limits');

const aiIndexSchedulerServiceSpec = readText('apps/server/src/modules/common/ai-index/ai-index-scheduler.service.spec.ts');
assertIncludes(aiIndexSchedulerServiceSpec, 'is disabled by default', 'AI index scheduler spec must prove disabled-by-default behavior');
assertIncludes(aiIndexSchedulerServiceSpec, 'runs the worker once with the configured batch limit', 'AI index scheduler spec must cover configured worker runs');

const aiProjectionValidator = readText('apps/server/src/modules/common/ai-index/ai-index-projection.validator.ts');
assertIncludes(aiProjectionValidator, 'assertAiIndexObjectProjection', 'AI projection validator must expose a projection assertion');
assertIncludes(aiProjectionValidator, 'target.sourceApp must match sourceApp', 'AI projection validator must prevent cross-domain target drift');
assertIncludes(aiProjectionValidator, 'contextEligible requires searchEligible', 'AI projection validator must preserve search/context eligibility ordering');
assertIncludes(aiProjectionValidator, 'chunkSeq must be unique', 'AI projection validator must guard deterministic chunk identity');

const aiProjectionValidatorSpec = readText('apps/server/src/modules/common/ai-index/ai-index-projection.validator.spec.ts');
assertIncludes(aiProjectionValidatorSpec, 'source/target drift', 'AI projection validator spec must cover cross-domain source drift');
assertIncludes(aiProjectionValidatorSpec, 'context eligible ACLs', 'AI projection validator spec must cover ACL eligibility invariants');
assertIncludes(aiProjectionValidatorSpec, 'duplicate or empty chunks', 'AI projection validator spec must cover chunk identity invariants');

const aiRetrievalService = readText('apps/server/src/modules/common/ai-index/ai-retrieval.service.ts');
assertIncludes(aiRetrievalService, 'embedText(query', 'AI retrieval service must embed query text for vector retrieval');
assertIncludes(aiRetrievalService, 'e.embedding <=> $1::vector', 'AI retrieval service must query common pgvector embeddings');
assertIncludes(aiRetrievalService, 'findKeywordRows', 'AI retrieval service must provide keyword fallback');
assertIncludes(aiRetrievalService, 'aclPredicateSql', 'AI retrieval service must apply ACL pre-filter');
assertIncludes(aiRetrievalService, "st.index_status_code = 'indexed'", 'AI retrieval service must exclude stale/partial index states');
assertIncludes(aiRetrievalService, 'e.embedding_hash = c.content_hash', 'AI retrieval service must exclude stale embeddings');
assertIncludes(aiRetrievalService, 'buildContextItems', 'AI retrieval service must assemble response context items');
assertIncludes(aiRetrievalService, 'writeRetrievalLog', 'AI retrieval service must persist retrieval logs');
assertIncludes(aiRetrievalService, '$transaction', 'AI retrieval service must write retrieval logs transactionally');
assertIncludes(aiRetrievalService, 'common.cm_ai_retrieval_log_m', 'AI retrieval service must write retrieval log header');
assertIncludes(aiRetrievalService, 'common.cm_ai_retrieval_log_item_m', 'AI retrieval service must write retrieval log items');
assertIncludes(aiRetrievalService, 'retrievalLogId && contextItems.length > 0', 'AI retrieval service must gate ragReady on logged context assembly');

const aiIndexController = readText('apps/server/src/modules/common/ai-index/ai-index.controller.ts');
assertIncludes(aiIndexController, 'RolesGuard', 'AI index controller must use platform role guard for operational endpoints');
assertIncludes(aiIndexController, "@Roles('admin')", 'AI index operational endpoints must require system override/admin access');
assertIncludes(aiIndexController, "Get('jobs/metrics')", 'AI index controller must expose job queue metrics endpoint');
assertIncludes(aiIndexController, "Get('jobs/scheduler')", 'AI index controller must expose scheduler status endpoint');
assertIncludes(aiIndexController, 'AiIndexWorkerService', 'AI index controller must run jobs through the worker boundary');
assertIncludes(aiIndexController, 'AiIndexSchedulerService', 'AI index controller must expose scheduler status through the scheduler service');
assertIncludes(aiIndexController, "Post('retrieval/query')", 'AI index controller must expose common retrieval query endpoint');
assertIncludes(aiIndexController, "Post('conversations')", 'AI index controller must expose common conversation creation endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/messages')", 'AI index controller must expose common message append endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/runs')", 'AI index controller must expose model run start endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/runs/:runId/complete')", 'AI index controller must expose model run completion endpoint');

const aiConversationService = readText('apps/server/src/modules/common/ai-index/ai-conversation.service.ts');
assertIncludes(aiConversationService, 'common.cm_ai_conversation_m', 'AI conversation service must write common conversation records');
assertIncludes(aiConversationService, 'common.cm_ai_message_m', 'AI conversation service must write common message records');
assertIncludes(aiConversationService, 'common.cm_ai_reference_m', 'AI conversation service must write common reference records');
assertIncludes(aiConversationService, 'common.cm_ai_run_m', 'AI conversation service must write common model run records');
assertIncludes(aiConversationService, 'common.cm_ai_run_source_r', 'AI conversation service must write common model run source records');
assertIncludes(aiConversationService, '$transaction', 'AI conversation service must write message/run audit records transactionally');
assertIncludes(aiConversationService, 'owner_user_id = $2', 'AI conversation service must scope reads and writes to the current owner user');

const dmsSearchProvider = readText('apps/server/src/modules/dms/search/search.provider.ts');
assertIncludes(dmsSearchProvider, '../../common/ai-index/ai-azure-provider.js', 'DMS provider must delegate Azure provider creation to common AI provider');

const dmsSearchModule = readText('apps/server/src/modules/dms/search/search.module.ts');
assertIncludes(dmsSearchModule, 'CommonAiIndexModule', 'DMS search module must import CommonAiIndexModule');
assertIncludes(dmsSearchModule, 'DmsAiIndexAdapter', 'DMS search module must provide DmsAiIndexAdapter');

const dmsAiIndexAdapter = readText('apps/server/src/modules/dms/search/dms-ai-index.adapter.ts');
assertIncludes(dmsAiIndexAdapter, 'AiEmbeddingProviderService', 'DMS AI adapter must inspect common embedding provider readiness');
assertIncludes(dmsAiIndexAdapter, "getStatus('default').ready", 'DMS AI adapter must gate semantic/vector/RAG capabilities on provider readiness');
assertIncludes(dmsAiIndexAdapter, 'semantic: embeddingReady', 'DMS AI adapter semantic capability must follow provider readiness');
assertIncludes(dmsAiIndexAdapter, 'vector: embeddingReady', 'DMS AI adapter vector capability must follow provider readiness');
assertIncludes(dmsAiIndexAdapter, 'ragContext: embeddingReady', 'DMS AI adapter RAG context capability must follow provider readiness');

const crmAccessTypes = readText('packages/types/src/crm/access.ts');
assertIncludes(crmAccessTypes, 'CrmOpportunityAccessSnapshot', 'CRM types must expose opportunity access snapshots');
assertIncludes(crmAccessTypes, 'CrmCustomerAccessSnapshot', 'CRM types must expose customer access snapshots');
assertIncludes(crmAccessTypes, 'canViewCustomerActivity', 'CRM customer access snapshots must expose customer activity read capability');
assertIncludes(crmAccessTypes, 'PermissionResolutionTrace', 'CRM access snapshots must carry shared permission policy trace');

assertIncludes(crmQuoteTypes, 'CrmOpportunityQuotePreview', 'CRM types must expose opportunity quote preview contract');
assertIncludes(crmQuoteTypes, 'CrmQuotePreviewWorkflow', 'CRM quote preview must separate workflow metadata from line totals');
assertIncludes(crmQuoteTypes, 'unavailableActions', 'CRM quote preview must mark document/contract actions as unavailable until implemented');

const crmBusinessPlanMonthlyTypes = readText('packages/types/src/crm/business-plan.ts');
assertIncludes(crmBusinessPlanMonthlyTypes, 'CrmBusinessPlanMonthlyPlanInputRequest', 'CRM business plan types must expose monthly direct input requests');
assertIncludes(crmBusinessPlanMonthlyTypes, 'monthlyPlanRevenueAmounts: number[]', 'CRM business plan lines must expose 12-month plan revenue values');
assertIncludes(crmBusinessPlanMonthlyTypes, 'monthlyPlanInputMode', 'CRM business plan lines must identify manual versus distributed monthly input');

const crmCostPlanTypes = readText('packages/types/src/crm/cost-plan.ts');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanInternalMonthlyInputRequest', 'CRM cost plan types must expose internal monthly input requests');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanInternalInputStatus', 'CRM cost plan types must expose internal monthly input workflow status');
assertIncludes(crmCostPlanTypes, 'monthlyPlanAmounts: number[]', 'CRM cost plan internal monthly input must carry 12 monthly plan amounts');
assertIncludes(crmCostPlanTypes, 'monthlyActualAmounts: number[]', 'CRM cost plan internal monthly input must carry 12 monthly actual amounts');
assertIncludes(crmCostPlanTypes, 'internalCostConfirmedRowCount: number', 'CRM cost plan summary must expose confirmed internal monthly input counts');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanInternalMonthlyWorkflowResult', 'CRM cost plan types must expose internal monthly confirmation workflow results');
assertIncludes(crmCostPlanTypes, "'internal-cost-input'", 'CRM cost plan preview source types must include internal monthly input storage');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAmsVendorWbsMappingRequest', 'CRM cost plan types must expose AMS vendor-WBS mapping requests');
assertIncludes(crmCostPlanTypes, 'amsMappedCount: number', 'CRM cost plan summary must expose stored AMS mapping counts');
assertIncludes(crmCostPlanTypes, "'ams-vendor-mapping'", 'CRM cost plan preview source types must include AMS vendor-WBS mapping storage');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAmsExternalMonthlyInputRequest', 'CRM cost plan types must expose AMS external monthly input requests');
assertIncludes(crmCostPlanTypes, 'amsExternalCostInputRowCount: number', 'CRM cost plan summary must expose stored AMS external monthly input counts');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAmsExternalInputStatus', 'CRM cost plan types must expose AMS external monthly input workflow status');
assertIncludes(crmCostPlanTypes, 'amsExternalCostConfirmedRowCount: number', 'CRM cost plan summary must expose confirmed AMS external monthly input counts');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAmsExternalMonthlyWorkflowResult', 'CRM cost plan types must expose AMS external monthly confirmation workflow results');
assertIncludes(crmCostPlanTypes, "'ams-external-cost-input'", 'CRM cost plan preview source types must include AMS external monthly input storage');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentPreview', 'CRM cost plan types must expose accounting/payment handoff previews');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentHandoff', 'CRM cost plan types must expose accounting/payment handoff snapshots');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentLine', 'CRM cost plan accounting/payment handoff must expose confirmed cost lines');
assertIncludes(crmCostPlanTypes, "CrmCostPlanAccountingPaymentHandoffStatus = 'snapshot-created' | 'execution-evidence-updated' | 'replaced'", 'CRM cost plan accounting/payment handoff must expose execution evidence update status');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionEvidenceRequest', 'CRM cost plan types must expose accounting/payment execution evidence requests');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionEvidenceResult', 'CRM cost plan types must expose accounting/payment execution evidence results');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionRequest', 'CRM cost plan types must expose accounting/payment execution requests');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionResult extends CrmCostPlanAccountingPaymentExecutionEvidenceResult', 'CRM cost plan execution results must extend execution evidence recording results');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionArtifact', 'CRM cost plan types must expose accounting/payment execution artifacts');
assertIncludes(crmCostPlanTypes, 'CrmCostPlanAccountingPaymentExecutionStepKey', 'CRM cost plan types must expose accounting/payment execution evidence step keys');
assertIncludes(crmCostPlanTypes, "'ams-external-cost'", 'CRM cost plan accounting/payment lines must distinguish AMS external cost rows');
assertIncludes(crmCostPlanTypes, 'latestHandoff', 'CRM cost plan accounting/payment preview must surface the latest handoff snapshot');
assertIncludes(crmCostPlanTypes, 'executionEvidence: CrmCostPlanAccountingPaymentExecutionEvidenceStep[]', 'CRM cost plan accounting/payment latest handoff must surface execution evidence paths');
assertIncludes(crmCostPlanTypes, 'unavailableActions: string[]', 'CRM cost plan accounting/payment preview must keep actual external system actions explicit');

const crmAccessSeed = readText('packages/database/prisma/seeds/18_crm_access_policy_foundation.sql');
assertIncludes(crmAccessSeed, 'crm.opportunity.read', 'CRM access seed must define opportunity read permission');
assertIncludes(crmAccessSeed, 'crm.opportunity.write', 'CRM access seed must define opportunity write permission');
assertIncludes(crmAccessSeed, 'crm.opportunity.confirm', 'CRM access seed must define opportunity confirm permission');
assertIncludes(crmAccessSeed, 'crm.opportunity.version.manage', 'CRM access seed must define opportunity version permission');
assertIncludes(crmAccessSeed, 'crm.customer.read', 'CRM access seed must define customer read permission');
assertIncludes(crmAccessSeed, 'crm.customer.write', 'CRM access seed must define customer write permission');
assertIncludes(crmAccessSeed, 'crm.customer.activity.read', 'CRM access seed must define customer activity read permission');
assertIncludes(crmAccessSeed, 'crm.customer.activity.write', 'CRM access seed must define customer activity write permission');

const crmAccessService = readText('apps/server/src/modules/crm/access/access.service.ts');
assertIncludes(crmAccessService, 'resolveObjectPermissionContext', 'CRM access service must use shared object permission resolution');
assertIncludes(crmAccessService, 'CRM_OPPORTUNITY_PERMISSION_CODES', 'CRM access service must centralize opportunity permission codes');
assertIncludes(crmAccessService, 'CRM_CUSTOMER_PERMISSION_CODES', 'CRM access service must centralize customer permission codes');
assertIncludes(crmAccessService, 'CRM_CUSTOMER_OBJECT_TYPE', 'CRM access service must use a stable customer object type');
assertIncludes(crmAccessService, 'getCustomerAccess', 'CRM access service must expose customer object access snapshots');
assertIncludes(crmAccessService, 'assertCustomerCapability', 'CRM access service must enforce customer capabilities');
assertIncludes(crmAccessService, 'mapOpportunityPermissionsToCustomerCompatCodes', 'CRM customer access must keep opportunity-permission compatibility during rollout');
assertIncludes(crmAccessService, 'crm.opportunity.confirm', 'CRM access service must expose confirm capability');
assertIncludes(crmAccessService, 'isOwnerNameMatch', 'CRM access service must keep owner-name baseline explicit until owner ids are modeled');

const crmAccessServiceSpec = readText('apps/server/src/modules/crm/access/access.service.spec.ts');
assertIncludes(crmAccessServiceSpec, 'adds owner-name baseline permissions before object exception resolution', 'CRM access service spec must cover owner baseline policy');
assertIncludes(crmAccessServiceSpec, 'lets object-level revokes remove owner-name write access', 'CRM access service spec must cover object revoke precedence');
assertIncludes(crmAccessServiceSpec, 'returns global CRM customer access from customer permissions', 'CRM access service spec must cover customer global permissions');
assertIncludes(crmAccessServiceSpec, 'adds customer owner baseline permissions before customer object exception resolution', 'CRM access service spec must cover customer owner baseline policy');
assertIncludes(crmAccessServiceSpec, 'lets customer object-level revokes remove owner activity write access', 'CRM access service spec must cover customer object revoke precedence');

const crmOpportunityService = readText('apps/server/src/modules/crm/opportunity/opportunity.service.ts');
assertIncludes(crmOpportunityService, 'DatabaseService', 'CRM opportunity service must read the RDB ledger');
assertIncludes(crmOpportunityService, 'crmOpportunity.findMany', 'CRM opportunity service must list opportunities from CRM RDB');
assertIncludes(crmOpportunityService, 'crmOpportunity.findFirst', 'CRM opportunity service must resolve opportunity details from CRM RDB');
assertIncludes(crmOpportunityService, 'opportunityCode', 'CRM opportunity service must preserve external opportunity codes');
assertIncludes(crmOpportunityService, 'AiIndexingService', 'CRM opportunity service must use the common AI index job queue');
assertIncludes(crmOpportunityService, 'queueOpportunityAiIndexJob', 'CRM opportunity service must centralize opportunity AI index job queueing');
assertIncludes(crmOpportunityService, "sourceApp: 'crm'", 'CRM opportunity service must queue CRM source app jobs');
assertIncludes(crmOpportunityService, "entityType: 'opportunity'", 'CRM opportunity service must queue opportunity entity jobs');
assertIncludes(crmOpportunityService, "'opportunity_created'", 'CRM opportunity create must queue AI index upsert');
assertIncludes(crmOpportunityService, "'opportunity_updated'", 'CRM opportunity update must queue AI index upsert');
assertIncludes(crmOpportunityService, "'opportunity_confirmed'", 'CRM opportunity confirm must queue AI index upsert');
assertIncludes(crmOpportunityService, "'opportunity_reopened'", 'CRM opportunity reopen must queue AI index upsert');
assertIncludes(crmOpportunityService, "'opportunity_version_added'", 'CRM opportunity version add must queue AI index upsert');
assertIncludes(crmOpportunityService, 'selectLatestOpportunityRows', 'CRM opportunity list must collapse rows to latest versions per group');
assertIncludes(crmOpportunityService, 'addOpportunityVersion', 'CRM opportunity service must expose explicit version addition');
assertIncludes(crmOpportunityService, 'calculateSpecialDiscountAmount', 'CRM opportunity service must calculate special discount amounts server-side');
assertIncludes(crmOpportunityService, 'revenueSubtotal', 'CRM opportunity service must keep gross revenue separate from final revenue');
assertIncludes(crmOpportunityService, 'costLineCodesByClientId', 'CRM opportunity service must remap draft linked cost ids to persisted line codes');
assertIncludes(crmOpportunityService, 'listOpportunityHistory', 'CRM opportunity service must expose the CRM history ledger');
assertIncludes(crmOpportunityService, 'crmOpportunityHistory.findMany', 'CRM opportunity service must read opportunity history from CRM RDB history rows');
assertIncludes(crmOpportunityService, 'getQuotePreview', 'CRM opportunity service must expose derived quote preview reads');
assertIncludes(crmOpportunityService, 'toQuotePreview', 'CRM quote preview must be derived from opportunity ledger data');
assertIncludes(crmOpportunityService, 'QUOTE_UNAVAILABLE_ACTIONS', 'CRM quote preview must not claim PDF/Word/DMS/contract actions are implemented');
assertIncludes(crmOpportunityService, 'CRM opportunity AI index job queue failed', 'CRM opportunity writes must degrade gracefully when AI queueing fails');
assertNotIncludes(crmOpportunityService, 'CRM_OPPORTUNITIES', 'CRM opportunity service must not use fixture data as its canonical source');

assertIncludes(crmOpportunityController, '@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)', 'CRM opportunity controller must use shared auth plus CRM feature guard');
assertIncludes(crmOpportunityController, "@Get('access/me')", 'CRM opportunity controller must expose global access snapshot');
assertIncludes(crmOpportunityController, "@Get(':id/access')", 'CRM opportunity controller must expose object access snapshot');
assertIncludes(crmOpportunityController, "RequireCrmOpportunityFeature('canCreateOpportunity')", 'CRM opportunity create must require CRM create capability');
assertIncludes(crmOpportunityController, "RequireCrmOpportunityFeature('canEditOpportunity'", 'CRM opportunity update must require CRM edit capability');
assertIncludes(crmOpportunityController, "RequireCrmOpportunityFeature('canConfirmOpportunity'", 'CRM opportunity confirm/reopen must require CRM confirm capability');
assertIncludes(crmOpportunityController, "RequireCrmOpportunityFeature('canAddVersion'", 'CRM opportunity version add must require CRM version capability');
assertIncludes(crmOpportunityController, "@Get(':id/history')", 'CRM opportunity controller must expose opportunity history reads');
assertIncludes(crmOpportunityController, "@Get(':id/quote-preview')", 'CRM opportunity controller must expose quote preview reads');

assertIncludes(crmOpportunityModule, 'CommonAiIndexModule', 'CRM opportunity module must import CommonAiIndexModule for opportunity write-hook queueing');
assertIncludes(crmOpportunityModule, 'CrmAccessModule', 'CRM opportunity module must import CRM access guard/service module');

const crmBusinessPlanService = readText('apps/server/src/modules/crm/business-plan/business-plan.service.ts');
const crmBusinessPlanPerformanceActualMigration = readText('packages/database/prisma/migrations/20260709100000_add_crm_business_plan_performance_actual/migration.sql');
assertIncludes(crmBusinessPlanPerformanceActualMigration, 'crm_business_plan_performance_actual_d', 'CRM business plan performance actual migration must create the direct actual ledger');
assertIncludes(crmBusinessPlanPerformanceActualMigration, 'monthly_revenue_amounts', 'CRM business plan performance actual migration must store monthly revenue actuals');
assertIncludes(dbInitEntrypoint, '20260709100000_add_crm_business_plan_performance_actual', 'db-init must protect the CRM business plan performance actual migration');
assertIncludes(crmBusinessPlanService, 'createCarryForwardSnapshot', 'CRM business plan service must expose previous-year carry-forward draft creation');
assertIncludes(crmBusinessPlanService, 'buildCarryForwardRows', 'CRM business plan service must merge previous confirmed lines into a new draft basis');
assertIncludes(crmBusinessPlanService, 'normalizeCarryForwardSourceBaseYear', 'CRM business plan carry-forward must validate the source base year');
assertIncludes(crmBusinessPlanService, "'carry-forward'", 'CRM business plan carry-forward must record a stable ledger activity');
assertIncludes(crmBusinessPlanService, 'updateMonthlyPlanLine', 'CRM business plan service must expose monthly direct input writes');
assertIncludes(crmBusinessPlanService, 'normalizeMonthlyRevenueAmounts', 'CRM business plan monthly direct input must validate 12 monthly amounts');
assertIncludes(crmBusinessPlanService, 'plan_monthly_revenue_amounts', 'CRM business plan monthly direct input must persist monthly amounts on line rows');
assertIncludes(crmBusinessPlanService, "'monthly-plan-input'", 'CRM business plan monthly direct input must record a stable ledger activity');
assertIncludes(crmBusinessPlanService, 'resolveMonthlyPlanRevenueAmounts', 'CRM business plan reads must return manual monthly inputs or distributed fallback values');
assertIncludes(crmBusinessPlanService, 'line.monthlyPlanRevenueAmounts', 'CRM business plan performance must consume stored monthly direct input values');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_PLAN_BASIS_LABEL', 'CRM business plan performance must expose a confirmed-plan basis label');
assertIncludes(crmBusinessPlanService, 'loadConfirmedPlan(normalized.year)', 'CRM business plan performance must load confirmed plan ledger rows for the requested year');
assertIncludes(crmBusinessPlanService, 'filterConfirmedPlanPerformanceLines', 'CRM business plan performance must filter confirmed plan ledger lines by the active query');
assertIncludes(crmBusinessPlanService, 'addConfirmedPlanPerformanceGroup', 'CRM business plan performance must add confirmed business plan ledger lines to the preview');
assertIncludes(crmBusinessPlanService, 'loadConfirmedCostPerformanceRows', 'CRM business plan performance must load confirmed internal/AMS cost rows');
assertIncludes(crmBusinessPlanService, 'addConfirmedCostPerformanceGroup', 'CRM business plan performance must add confirmed cost rows to the preview');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_COST_BASIS_LABEL', 'CRM business plan performance must expose a confirmed-cost basis label');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_ADJUSTED_COST_BASIS_LABEL', 'CRM business plan performance must label AMS duplicate external cost adjustments');
assertIncludes(crmBusinessPlanService, 'toConfirmedAmsExternalWbsCodes', 'CRM business plan performance must detect confirmed AMS external WBS rows');
assertIncludes(crmBusinessPlanService, 'amsExternalCostAdjustedActualAmountTotal', 'CRM business plan performance must track excluded duplicated contract external actual costs');
assertIncludes(crmBusinessPlanService, 'savePerformanceActualInput', 'CRM business plan performance service must expose direct actual input writes');
assertIncludes(crmBusinessPlanService, 'addManualActualPerformanceGroup', 'CRM business plan performance must merge direct actual input rows');
assertIncludes(crmBusinessPlanService, "'manual-actual'", 'CRM business plan performance must label direct actual rows with a manual-actual source');
assertIncludes(crmBusinessPlanService, 'includePlan: false', 'CRM business plan performance must not double-count contract plan amounts when a confirmed plan exists');
assertIncludes(crmBusinessPlanService, 'includePlan: !sourceCompatible', 'CRM business plan performance must keep the fallback contract-plan basis only in extended mode without a confirmed plan');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_PLAN_BASIS_LABEL', 'CRM business plan performance must preserve the extended fallback plan basis label');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_SOURCE_MISSING_PLAN_BASIS_LABEL', 'CRM business plan performance must distinguish a missing confirmed plan in source-compatible mode');
assertIncludes(crmBusinessPlanService, "options.actualBasis === 'source-compatible'", 'CRM source-compatible performance must use contract billing-plan amounts as actuals');
assertIncludes(crmBusinessPlanService, 'distributeAnnualAmount', 'CRM business plan performance must convert annual confirmed plan amounts into monthly plan values');
assertIncludes(crmBusinessPlanService, 'confirmedPlanCode: confirmedPlan?.code', 'CRM business plan performance summary must identify the confirmed plan code');
assertIncludes(crmBusinessPlanService, 'CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_UNAVAILABLE_ACTIONS', 'CRM business plan performance must keep remaining write/accounting actions unavailable for confirmed-plan previews');

const crmBusinessPlanServiceSpec = readText('apps/server/src/modules/crm/business-plan/business-plan.service.spec.ts');
assertIncludes(crmBusinessPlanServiceSpec, 'uses confirmed business plan ledger lines as the business plan performance basis', 'CRM business plan performance spec must cover confirmed ledger basis behavior');
assertIncludes(crmBusinessPlanServiceSpec, 'adjusts duplicated contract external costs when confirmed AMS cost inputs share the same WBS', 'CRM business plan performance spec must cover confirmed AMS duplicate cost adjustments');
assertIncludes(crmBusinessPlanServiceSpec, 'adds manual actual input rows to the business plan performance preview', 'CRM business plan performance spec must cover direct actual row merging');
assertIncludes(crmBusinessPlanServiceSpec, 'saves manual monthly actual input with a stable ledger activity', 'CRM business plan performance spec must cover direct actual writes');
assertIncludes(crmBusinessPlanServiceSpec, 'uses manual monthly business plan inputs before falling back to annual distribution', 'CRM business plan spec must cover monthly direct input performance basis');
assertIncludes(crmBusinessPlanServiceSpec, 'uses confirmed contract billing plans as actuals in source-compatible mode', 'CRM business plan performance spec must cover source-compatible billing-plan actual semantics');
assertIncludes(crmBusinessPlanServiceSpec, 'updates a draft business plan line with monthly direct input and recalculates totals', 'CRM business plan spec must cover monthly direct input writes');
assertIncludes(crmBusinessPlanServiceSpec, 'rejects monthly direct input for confirmed business plan ledgers', 'CRM business plan spec must reject confirmed monthly input writes');
assertIncludes(crmBusinessPlanServiceSpec, 'creates a carry-forward draft from the previous confirmed business plan', 'CRM business plan service spec must cover previous-year carry-forward draft creation');
assertIncludes(crmBusinessPlanServiceSpec, "row.source === 'confirmed-plan'", 'CRM business plan performance spec must assert confirmed-plan source rows');
assertIncludes(crmBusinessPlanServiceSpec, "row.source === 'confirmed-cost'", 'CRM business plan performance spec must assert confirmed-cost source rows');
assertIncludes(crmBusinessPlanServiceSpec, "planBasisLabel).toBe('확정 사업계획 차수 매출·외부원가 기준')", 'CRM business plan performance spec must assert confirmed-plan basis label');
assertIncludes(crmBusinessPlanServiceSpec, "not.toContain('확정 사업계획 차수 기준 비교')", 'CRM business plan performance spec must remove confirmed-plan comparison from unavailable actions when implemented');

const crmReportsService = readText('apps/server/src/modules/crm/reports/reports.service.ts');
assertIncludes(crmReportsService, 'confirmReport', 'CRM reports service must expose report preview confirmation');
assertIncludes(crmReportsService, 'reopenReportConfirmation', 'CRM reports service must expose report confirmation reopen');
assertIncludes(crmReportsService, 'loadLatestConfirmation', 'CRM reports preview must load the latest active report confirmation');
assertIncludes(crmReportsService, 'crm_report_confirmation_m', 'CRM reports confirmation must persist to a CRM-owned ledger');
assertIncludes(crmReportsService, "'report-confirm'", 'CRM reports confirmation must record a stable ledger activity');
assertIncludes(crmReportsService, "'report-reopen'", 'CRM reports confirmation reopen must record a stable ledger activity');
assertIncludes(crmReportsService, 'CRM 보고 확정은 현재 Preview 결과를 CRM 보고 snapshot 원장으로 저장', 'CRM reports confirmation must keep the report snapshot boundary explicit');

const crmReportsServiceSpec = readText('apps/server/src/modules/crm/reports/reports.service.spec.ts');
assertIncludes(crmReportsServiceSpec, 'surfaces the latest confirmed report snapshot for the active filters', 'CRM reports spec must cover latest active confirmation loading');
assertIncludes(crmReportsServiceSpec, 'confirms the current reporting preview as a CRM-owned snapshot ledger', 'CRM reports spec must cover report confirmation writes');
assertIncludes(crmReportsServiceSpec, 'reopens a confirmed report snapshot without touching accounting or DMS state', 'CRM reports spec must cover report confirmation reopen boundaries');

const crmReportsController = readText('apps/server/src/modules/crm/reports/reports.controller.ts');
assertIncludes(crmReportsController, "@Post('confirm')", 'CRM reports controller must expose report confirmation writes');
assertIncludes(crmReportsController, "@Post('confirmations/:id/reopen')", 'CRM reports controller must expose report confirmation reopen');
assertIncludes(crmReportsController, 'confirmReport', 'CRM reports controller must delegate confirmation to the service');
assertIncludes(crmReportsController, 'reopenReportConfirmation', 'CRM reports controller must delegate reopen to the service');

const crmReportsDto = readText('apps/server/src/modules/crm/reports/dto/reports.dto.ts');
assertIncludes(crmReportsDto, 'CrmReportsConfirmDto', 'CRM reports DTOs must expose report confirmation bodies');
assertIncludes(crmReportsDto, 'memo?: string', 'CRM reports confirmation must allow a bounded memo field');

const crmReportConfirmationMigration = readText('packages/database/prisma/migrations/20260709110000_add_crm_report_confirmation/migration.sql');
assertIncludes(crmReportConfirmationMigration, 'crm_report_confirmation_m', 'CRM report confirmation migration must create the snapshot ledger');
assertIncludes(crmReportConfirmationMigration, 'summary_snapshot', 'CRM report confirmation migration must persist the summary snapshot');
assertIncludes(crmReportConfirmationMigration, 'monthly_trend_snapshot', 'CRM report confirmation migration must persist monthly trend snapshots');
assertIncludes(crmReportConfirmationMigration, 'ux_crm_report_confirmation_m_active_basis', 'CRM report confirmation migration must keep one active confirmation per filter basis');
assertIncludes(dbInitEntrypoint, '20260709110000_add_crm_report_confirmation', 'db-init must protect the CRM report confirmation migration');

const crmBusinessPlanController = readText('apps/server/src/modules/crm/business-plan/business-plan.controller.ts');
assertIncludes(crmBusinessPlanController, "@Post('plans/carry-forward')", 'CRM business plan controller must expose previous-year carry-forward creation');
assertIncludes(crmBusinessPlanController, 'createCarryForwardSnapshot', 'CRM business plan controller must delegate carry-forward creation to the service');
assertIncludes(crmBusinessPlanController, "@Post('plans/:id/lines/:lineId/monthly-plan')", 'CRM business plan controller must expose monthly direct input writes');
assertIncludes(crmBusinessPlanController, 'updateMonthlyPlanLine', 'CRM business plan controller must delegate monthly direct input writes to the service');
assertIncludes(crmBusinessPlanController, "@Post('performance-actual/monthly')", 'CRM business plan controller must expose performance actual direct input writes');
assertIncludes(crmBusinessPlanController, 'savePerformanceActualInput', 'CRM business plan controller must delegate performance actual direct input writes to the service');

const crmBusinessPlanDto = readText('apps/server/src/modules/crm/business-plan/dto/business-plan.dto.ts');
assertIncludes(crmBusinessPlanDto, 'CrmBusinessPlanCarryForwardDto', 'CRM business plan DTOs must expose a carry-forward body contract');
assertIncludes(crmBusinessPlanDto, 'sourceBaseYear', 'CRM business plan carry-forward DTO must accept a source base year');
assertIncludes(crmBusinessPlanDto, 'CrmBusinessPlanMonthlyPlanInputDto', 'CRM business plan DTOs must expose monthly direct input bodies');
assertIncludes(crmBusinessPlanDto, 'ArrayMinSize(12)', 'CRM business plan monthly direct input must require 12 months');
assertIncludes(crmBusinessPlanDto, 'CrmBusinessPlanPerformanceActualInputDto', 'CRM business plan DTOs must expose performance actual direct input bodies');

const crmBusinessPlanMonthlyMigration = readText('packages/database/prisma/migrations/20260708110000_add_crm_business_plan_monthly_input/migration.sql');
assertIncludes(crmBusinessPlanMonthlyMigration, 'plan_monthly_revenue_amounts', 'CRM business plan monthly input migration must add the monthly JSON column');
assertIncludes(dbInitEntrypoint, '20260708110000_add_crm_business_plan_monthly_input', 'db-init must protect the CRM business plan monthly input migration');

const crmCostPlanService = readText('apps/server/src/modules/crm/cost-plan/cost-plan.service.ts');
assertIncludes(crmCostPlanService, 'saveInternalMonthlyInput', 'CRM cost plan service must expose internal monthly cost input writes');
assertIncludes(crmCostPlanService, 'loadInternalMonthlyRows', 'CRM cost plan preview must merge stored internal monthly inputs');
assertIncludes(crmCostPlanService, 'crm_cost_plan_internal_monthly_d', 'CRM cost plan internal monthly inputs must persist in a CRM-owned ledger');
assertIncludes(crmCostPlanService, "'internal-monthly-input'", 'CRM cost plan internal monthly writes must record a stable ledger activity');
assertIncludes(crmCostPlanService, 'normalizeMonthlyAmounts', 'CRM cost plan internal monthly input must validate 12 monthly amounts');
assertIncludes(crmCostPlanService, 'confirmInternalMonthlyInput', 'CRM cost plan service must expose internal monthly input confirmation');
assertIncludes(crmCostPlanService, 'reopenInternalMonthlyInput', 'CRM cost plan service must expose internal monthly input reopen');
assertIncludes(crmCostPlanService, "'internal-monthly-confirm'", 'CRM cost plan internal monthly confirmation must record a stable ledger activity');
assertIncludes(crmCostPlanService, "'internal-monthly-reopen'", 'CRM cost plan internal monthly reopen must record a stable ledger activity');
assertIncludes(crmCostPlanService, '확정된 내부원가 월별 입력은 확정 해제 후 수정', 'CRM cost plan service must lock confirmed internal monthly inputs against edits');
assertNotIncludes(crmCostPlanService, "'내부원가 계획/실적 확정'", 'CRM cost plan unavailable actions must not keep internal cost confirmation after implementation');
assertIncludes(crmCostPlanService, 'saveAmsVendorWbsMapping', 'CRM cost plan service must expose AMS vendor-WBS mapping writes');
assertIncludes(crmCostPlanService, 'loadAmsVendorMappingRows', 'CRM cost plan preview must merge stored AMS vendor-WBS mappings');
assertIncludes(crmCostPlanService, 'crm_cost_plan_ams_vendor_wbs_r', 'CRM cost plan AMS mappings must persist in a CRM-owned ledger');
assertIncludes(crmCostPlanService, "'ams-vendor-wbs-mapping'", 'CRM cost plan AMS mapping writes must record a stable ledger activity');
assertIncludes(crmCostPlanService, 'AMS 업체 매핑 필요', 'CRM cost plan AMS readiness must require a stored vendor-WBS mapping');
assertNotIncludes(crmCostPlanService, "'AMS 업체-WBS 매핑 저장'", 'CRM cost plan unavailable actions must not keep AMS vendor-WBS mapping after implementation');
assertIncludes(crmCostPlanService, 'saveAmsExternalMonthlyInput', 'CRM cost plan service must expose AMS external monthly input writes');
assertIncludes(crmCostPlanService, 'loadAmsExternalMonthlyRows', 'CRM cost plan preview must merge stored AMS external monthly inputs');
assertIncludes(crmCostPlanService, 'crm_cost_plan_ams_external_monthly_d', 'CRM cost plan AMS external inputs must persist in a CRM-owned ledger');
assertIncludes(crmCostPlanService, "'ams-external-monthly-input'", 'CRM cost plan AMS external monthly writes must record a stable ledger activity');
assertIncludes(crmCostPlanService, 'confirmAmsExternalMonthlyInput', 'CRM cost plan service must expose AMS external monthly settlement confirmation');
assertIncludes(crmCostPlanService, 'reopenAmsExternalMonthlyInput', 'CRM cost plan service must expose AMS external monthly settlement reopen');
assertIncludes(crmCostPlanService, "'ams-external-monthly-confirm'", 'CRM cost plan AMS external monthly settlement confirmation must record a stable ledger activity');
assertIncludes(crmCostPlanService, "'ams-external-monthly-reopen'", 'CRM cost plan AMS external monthly settlement reopen must record a stable ledger activity');
assertIncludes(crmCostPlanService, '확정된 AMS 외부원가 월별 입력은 확정 해제 후 수정', 'CRM cost plan service must lock confirmed AMS external monthly inputs against edits');
assertNotIncludes(crmCostPlanService, "'AMS 외부원가 월별 저장'", 'CRM cost plan unavailable actions must not keep AMS external monthly storage after implementation');
assertNotIncludes(crmCostPlanService, "'AMS 외부원가 정산 확정'", 'CRM cost plan unavailable actions must not keep AMS external settlement confirmation after implementation');
assertIncludes(crmCostPlanService, 'getAccountingPaymentPreview', 'CRM cost plan service must expose accounting/payment handoff previews');
assertIncludes(crmCostPlanService, 'createAccountingPaymentHandoff', 'CRM cost plan service must expose accounting/payment handoff snapshot writes');
assertIncludes(crmCostPlanService, 'executeAccountingPayment', 'CRM cost plan service must expose accounting/payment execution');
assertIncludes(crmCostPlanService, 'buildAccountingPaymentExecutionArtifacts', 'CRM cost plan service must generate accounting/payment execution artifacts');
assertIncludes(crmCostPlanService, 'crm-demo-accounting://handoffs/', 'CRM cost plan execution must use a stable demo accounting evidence namespace');
assertIncludes(crmCostPlanService, 'recordAccountingPaymentExecutionEvidence', 'CRM cost plan service must record external accounting/payment execution evidence');
assertIncludes(crmCostPlanService, 'mergeAccountingPaymentExecutionEvidence', 'CRM cost plan service must merge accounting/payment execution evidence snapshots');
assertIncludes(crmCostPlanService, 'resolveAccountingPaymentExecutionEvidence', 'CRM cost plan service must reload accounting/payment execution evidence snapshots');
assertIncludes(crmCostPlanService, 'loadLatestAccountingPaymentHandoff', 'CRM cost plan handoff preview must load the latest active handoff snapshot');
assertIncludes(crmCostPlanService, 'crm_cost_plan_accounting_handoff_m', 'CRM cost plan accounting/payment handoffs must persist in a CRM-owned ledger');
assertIncludes(crmCostPlanService, "'accounting-payment-handoff-create'", 'CRM cost plan accounting/payment handoff writes must record a stable ledger activity');
assertIncludes(crmCostPlanService, "'accounting-payment-execution-evidence-record'", 'CRM cost plan accounting/payment execution evidence writes must record a stable ledger activity');
assertIncludes(crmCostPlanService, "'execution-evidence-updated'", 'CRM cost plan accounting/payment handoff must keep a distinct execution evidence status');
assertIncludes(crmCostPlanService, '실제 ERP/API 반영은 외부 회계·지급 시스템', 'CRM cost plan accounting/payment boundary must keep actual external system posting out of scope');
assertIncludes(crmCostPlanService, '확정된 내부원가 또는 AMS 정산 확정 row가 필요합니다.', 'CRM cost plan accounting/payment handoff must require confirmed cost rows');

const crmCostPlanServiceSpec = readText('apps/server/src/modules/crm/cost-plan/cost-plan.service.spec.ts');
assertIncludes(crmCostPlanServiceSpec, 'merges stored internal monthly cost inputs into the cost plan preview', 'CRM cost plan spec must cover stored internal monthly input preview merging');
assertIncludes(crmCostPlanServiceSpec, 'saves monthly internal cost inputs with a stable ledger activity', 'CRM cost plan spec must cover internal monthly input writes');
assertIncludes(crmCostPlanServiceSpec, 'counts confirmed internal monthly cost inputs in the preview', 'CRM cost plan spec must cover confirmed internal monthly input preview counts');
assertIncludes(crmCostPlanServiceSpec, 'rejects monthly internal cost edits after confirmation', 'CRM cost plan spec must cover confirmed internal monthly edit locking');
assertIncludes(crmCostPlanServiceSpec, 'confirms monthly internal cost inputs with a stable ledger activity', 'CRM cost plan spec must cover internal monthly confirmation writes');
assertIncludes(crmCostPlanServiceSpec, 'reopens confirmed monthly internal cost inputs with a stable ledger activity', 'CRM cost plan spec must cover internal monthly reopen writes');
assertIncludes(crmCostPlanServiceSpec, 'merges stored AMS vendor-WBS mappings into readiness', 'CRM cost plan spec must cover stored AMS mapping readiness');
assertIncludes(crmCostPlanServiceSpec, 'saves AMS vendor-WBS mappings with a stable ledger activity', 'CRM cost plan spec must cover AMS mapping writes');
assertIncludes(crmCostPlanServiceSpec, 'merges stored AMS external monthly cost inputs into the cost plan preview', 'CRM cost plan spec must cover stored AMS external monthly input preview merging');
assertIncludes(crmCostPlanServiceSpec, 'saves AMS external monthly cost inputs with a stable ledger activity', 'CRM cost plan spec must cover AMS external monthly input writes');
assertIncludes(crmCostPlanServiceSpec, 'counts confirmed AMS external monthly cost inputs in the cost plan preview', 'CRM cost plan spec must cover confirmed AMS external monthly input preview counts');
assertIncludes(crmCostPlanServiceSpec, 'rejects AMS external monthly cost edits after settlement confirmation', 'CRM cost plan spec must cover confirmed AMS external monthly edit locking');
assertIncludes(crmCostPlanServiceSpec, 'confirms AMS external monthly cost inputs with a stable ledger activity', 'CRM cost plan spec must cover AMS external monthly confirmation writes');
assertIncludes(crmCostPlanServiceSpec, 'reopens confirmed AMS external monthly cost inputs with a stable ledger activity', 'CRM cost plan spec must cover AMS external monthly reopen writes');
assertIncludes(crmCostPlanServiceSpec, 'builds accounting/payment handoff preview from confirmed internal and AMS cost inputs', 'CRM cost plan spec must cover accounting/payment handoff preview lines');
assertIncludes(crmCostPlanServiceSpec, 'records accounting/payment handoff snapshots with a stable ledger activity', 'CRM cost plan spec must cover accounting/payment handoff writes');
assertIncludes(crmCostPlanServiceSpec, 'records external accounting/payment execution evidence on the active handoff snapshot', 'CRM cost plan spec must cover accounting/payment execution evidence recording');
assertIncludes(crmCostPlanServiceSpec, 'external-payment://runs/pay-2026-001', 'CRM cost plan spec must assert external payment execution evidence paths');
assertIncludes(crmCostPlanServiceSpec, 'executes accounting/payment handoff and records generated evidence steps', 'CRM cost plan spec must cover accounting/payment execution artifact generation');
assertIncludes(crmCostPlanServiceSpec, 'crm-demo-accounting://handoffs/41/executions/demo/payment-execution', 'CRM cost plan spec must assert generated demo payment execution evidence paths');
assertIncludes(crmCostPlanServiceSpec, 'rejects accounting/payment handoff snapshots without confirmed costs', 'CRM cost plan spec must reject handoffs without confirmed cost rows');

const crmCostPlanController = readText('apps/server/src/modules/crm/cost-plan/cost-plan.controller.ts');
assertIncludes(crmCostPlanController, "@Post('internal-cost/monthly')", 'CRM cost plan controller must expose internal monthly input writes');
assertIncludes(crmCostPlanController, 'saveInternalMonthlyInput', 'CRM cost plan controller must delegate internal monthly input writes to the service');
assertIncludes(crmCostPlanController, "@Post('internal-cost/monthly/:id/confirm')", 'CRM cost plan controller must expose internal monthly input confirmation');
assertIncludes(crmCostPlanController, "@Post('internal-cost/monthly/:id/reopen')", 'CRM cost plan controller must expose internal monthly input reopen');
assertIncludes(crmCostPlanController, 'confirmInternalMonthlyInput', 'CRM cost plan controller must delegate internal monthly input confirmation to the service');
assertIncludes(crmCostPlanController, 'reopenInternalMonthlyInput', 'CRM cost plan controller must delegate internal monthly input reopen to the service');
assertIncludes(crmCostPlanController, "@Post('ams/vendor-wbs')", 'CRM cost plan controller must expose AMS vendor-WBS mapping writes');
assertIncludes(crmCostPlanController, 'saveAmsVendorWbsMapping', 'CRM cost plan controller must delegate AMS mapping writes to the service');
assertIncludes(crmCostPlanController, "@Post('ams/external-cost/monthly')", 'CRM cost plan controller must expose AMS external monthly input writes');
assertIncludes(crmCostPlanController, 'saveAmsExternalMonthlyInput', 'CRM cost plan controller must delegate AMS external monthly input writes to the service');
assertIncludes(crmCostPlanController, "@Post('ams/external-cost/monthly/:id/confirm')", 'CRM cost plan controller must expose AMS external monthly settlement confirmation');
assertIncludes(crmCostPlanController, "@Post('ams/external-cost/monthly/:id/reopen')", 'CRM cost plan controller must expose AMS external monthly settlement reopen');
assertIncludes(crmCostPlanController, 'confirmAmsExternalMonthlyInput', 'CRM cost plan controller must delegate AMS external monthly settlement confirmation to the service');
assertIncludes(crmCostPlanController, 'reopenAmsExternalMonthlyInput', 'CRM cost plan controller must delegate AMS external monthly settlement reopen to the service');
assertIncludes(crmCostPlanController, "@Get('accounting-payment-preview')", 'CRM cost plan controller must expose accounting/payment handoff preview reads');
assertIncludes(crmCostPlanController, "@Post('accounting-payment-handoff')", 'CRM cost plan controller must expose accounting/payment handoff snapshot writes');
assertIncludes(crmCostPlanController, 'createAccountingPaymentHandoff', 'CRM cost plan controller must delegate accounting/payment handoff snapshot writes to the service');
assertIncludes(crmCostPlanController, "@Post('accounting-payment-handoffs/:id/execute')", 'CRM cost plan controller must expose accounting/payment execution');
assertIncludes(crmCostPlanController, 'executeAccountingPayment', 'CRM cost plan controller must delegate accounting/payment execution to the service');
assertIncludes(crmCostPlanController, "@Post('accounting-payment-handoffs/:id/execution-evidence')", 'CRM cost plan controller must expose accounting/payment execution evidence recording');
assertIncludes(crmCostPlanController, 'recordAccountingPaymentExecutionEvidence', 'CRM cost plan controller must delegate accounting/payment execution evidence recording to the service');

const crmCostPlanDto = readText('apps/server/src/modules/crm/cost-plan/dto/cost-plan.dto.ts');
assertIncludes(crmCostPlanDto, 'CrmCostPlanInternalMonthlyInputDto', 'CRM cost plan DTOs must expose internal monthly input bodies');
assertIncludes(crmCostPlanDto, 'ArrayMinSize(12)', 'CRM cost plan internal monthly input must require 12 months');
assertIncludes(crmCostPlanDto, 'CrmCostPlanAmsVendorWbsMappingDto', 'CRM cost plan DTOs must expose AMS vendor-WBS mapping bodies');
assertIncludes(crmCostPlanDto, 'vendorName', 'CRM cost plan AMS mapping DTO must require a vendor name');
assertIncludes(crmCostPlanDto, 'CrmCostPlanAmsExternalMonthlyInputDto', 'CRM cost plan DTOs must expose AMS external monthly input bodies');
assertIncludes(crmCostPlanDto, '12개월 AMS 외부원가 계획 입력 금액', 'CRM cost plan AMS external monthly input must document monthly plan amounts');
assertIncludes(crmCostPlanDto, 'CrmCostPlanAccountingPaymentHandoffDto', 'CRM cost plan DTOs must expose accounting/payment handoff bodies');
assertIncludes(crmCostPlanDto, 'maxLength: 1000', 'CRM cost plan accounting/payment handoff memo must be bounded');
assertIncludes(crmCostPlanDto, 'CrmCostPlanAccountingPaymentExecutionDto', 'CRM cost plan DTOs must expose accounting/payment execution bodies');
assertIncludes(crmCostPlanDto, 'CrmCostPlanAccountingPaymentExecutionEvidenceDto', 'CRM cost plan DTOs must expose accounting/payment execution evidence bodies');
assertIncludes(crmCostPlanDto, 'CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS', 'CRM cost plan DTOs must restrict accounting/payment execution evidence steps');
assertIncludes(crmCostPlanDto, 'ArrayMinSize(1)', 'CRM cost plan execution evidence DTO must require at least one evidence step');

const crmCostPlanInternalMonthlyMigration = readText('packages/database/prisma/migrations/20260708123000_add_crm_cost_plan_internal_monthly/migration.sql');
assertIncludes(crmCostPlanInternalMonthlyMigration, 'crm_cost_plan_internal_monthly_d', 'CRM cost plan internal monthly migration must create the input ledger');
assertIncludes(crmCostPlanInternalMonthlyMigration, 'monthly_plan_amounts', 'CRM cost plan internal monthly migration must store monthly plan amounts');
assertIncludes(crmCostPlanInternalMonthlyMigration, 'monthly_actual_amounts', 'CRM cost plan internal monthly migration must store monthly actual amounts');
assertIncludes(dbInitEntrypoint, '20260708123000_add_crm_cost_plan_internal_monthly', 'db-init must protect the CRM cost plan internal monthly migration');

const crmCostPlanInternalConfirmMigration = readText('packages/database/prisma/migrations/20260708150000_add_crm_cost_plan_internal_confirmation/migration.sql');
assertIncludes(crmCostPlanInternalConfirmMigration, 'status_code', 'CRM cost plan internal confirmation migration must add a status code');
assertIncludes(crmCostPlanInternalConfirmMigration, 'confirmed', 'CRM cost plan internal confirmation migration must add a confirmed flag');
assertIncludes(crmCostPlanInternalConfirmMigration, 'confirmed_at', 'CRM cost plan internal confirmation migration must add confirmation timestamps');
assertIncludes(crmCostPlanInternalConfirmMigration, 'confirmed_by', 'CRM cost plan internal confirmation migration must add confirmation actor tracking');
assertIncludes(dbInitEntrypoint, '20260708150000_add_crm_cost_plan_internal_confirmation', 'db-init must protect the CRM cost plan internal confirmation migration');

const crmCostPlanAmsVendorWbsMigration = readText('packages/database/prisma/migrations/20260708133000_add_crm_cost_plan_ams_vendor_wbs_mapping/migration.sql');
assertIncludes(crmCostPlanAmsVendorWbsMigration, 'crm_cost_plan_ams_vendor_wbs_r', 'CRM cost plan AMS mapping migration must create the vendor-WBS ledger');
assertIncludes(crmCostPlanAmsVendorWbsMigration, 'vendor_name', 'CRM cost plan AMS mapping migration must store vendor names');
assertIncludes(crmCostPlanAmsVendorWbsMigration, 'vendor_contract_no', 'CRM cost plan AMS mapping migration must store vendor contract numbers');
assertIncludes(dbInitEntrypoint, '20260708133000_add_crm_cost_plan_ams_vendor_wbs_mapping', 'db-init must protect the CRM cost plan AMS mapping migration');

const crmCostPlanAmsExternalMonthlyMigration = readText('packages/database/prisma/migrations/20260708143000_add_crm_cost_plan_ams_external_monthly/migration.sql');
assertIncludes(crmCostPlanAmsExternalMonthlyMigration, 'crm_cost_plan_ams_external_monthly_d', 'CRM cost plan AMS external monthly migration must create the input ledger');
assertIncludes(crmCostPlanAmsExternalMonthlyMigration, 'monthly_plan_amounts', 'CRM cost plan AMS external monthly migration must store monthly plan amounts');
assertIncludes(crmCostPlanAmsExternalMonthlyMigration, 'monthly_actual_amounts', 'CRM cost plan AMS external monthly migration must store monthly actual amounts');
assertIncludes(dbInitEntrypoint, '20260708143000_add_crm_cost_plan_ams_external_monthly', 'db-init must protect the CRM cost plan AMS external monthly migration');

const crmCostPlanAmsExternalConfirmMigration = readText('packages/database/prisma/migrations/20260708160000_add_crm_cost_plan_ams_external_confirmation/migration.sql');
assertIncludes(crmCostPlanAmsExternalConfirmMigration, 'status_code', 'CRM cost plan AMS external confirmation migration must add a status code');
assertIncludes(crmCostPlanAmsExternalConfirmMigration, 'confirmed', 'CRM cost plan AMS external confirmation migration must add a confirmed flag');
assertIncludes(crmCostPlanAmsExternalConfirmMigration, 'confirmed_at', 'CRM cost plan AMS external confirmation migration must add confirmation timestamps');
assertIncludes(crmCostPlanAmsExternalConfirmMigration, 'confirmed_by', 'CRM cost plan AMS external confirmation migration must add confirmation actor tracking');
assertIncludes(dbInitEntrypoint, '20260708160000_add_crm_cost_plan_ams_external_confirmation', 'db-init must protect the CRM cost plan AMS external confirmation migration');

const crmCostPlanAccountingHandoffMigration = readText('packages/database/prisma/migrations/20260709133000_add_crm_cost_plan_accounting_handoff/migration.sql');
assertIncludes(crmCostPlanAccountingHandoffMigration, 'crm_cost_plan_accounting_handoff_m', 'CRM cost plan accounting/payment handoff migration must create the snapshot ledger');
assertIncludes(crmCostPlanAccountingHandoffMigration, 'preview_snapshot', 'CRM cost plan accounting/payment handoff migration must store preview snapshots');
assertIncludes(crmCostPlanAccountingHandoffMigration, 'lines_snapshot', 'CRM cost plan accounting/payment handoff migration must store line snapshots');
assertIncludes(crmCostPlanAccountingHandoffMigration, 'Accounting voucher issuance and payment execution remain external', 'CRM cost plan accounting/payment handoff migration must keep external execution out of scope');
assertIncludes(dbInitEntrypoint, '20260709133000_add_crm_cost_plan_accounting_handoff', 'db-init must protect the CRM cost plan accounting/payment handoff migration');

const crmCostPlanAccountingExecutionEvidenceMigration = readText('packages/database/prisma/migrations/20260709143000_add_crm_cost_plan_accounting_execution_evidence/migration.sql');
assertIncludes(crmCostPlanAccountingExecutionEvidenceMigration, 'execution_evidence_snapshot', 'CRM cost plan accounting/payment execution evidence migration must store external evidence snapshots');
assertIncludes(crmCostPlanAccountingExecutionEvidenceMigration, 'execution_evidence_updated_at', 'CRM cost plan accounting/payment execution evidence migration must store evidence update timestamps');
assertIncludes(crmCostPlanAccountingExecutionEvidenceMigration, 'voucher issuance and payment execution remain external', 'CRM cost plan accounting/payment execution evidence migration must keep external execution out of scope');
assertIncludes(dbInitEntrypoint, '20260709143000_add_crm_cost_plan_accounting_execution_evidence', 'db-init must protect the CRM cost plan accounting/payment execution evidence migration');

const crmCustomerService = readText('apps/server/src/modules/crm/customer/customer.service.ts');
assertIncludes(crmCustomerService, 'queueCrmAiIndexJob', 'CRM customer service must centralize customer/activity AI index job queueing');
assertIncludes(crmCustomerService, 'queueAiIndexBackfill', 'CRM customer service must expose controlled customer/activity AI index backfill queueing');
assertIncludes(crmCustomerService, 'DEFAULT_CUSTOMER_AI_INDEX_BACKFILL_LIMIT', 'CRM customer/activity backfill must define a default limit');
assertIncludes(crmCustomerService, 'MAX_CUSTOMER_AI_INDEX_BACKFILL_LIMIT', 'CRM customer/activity backfill must define a maximum limit');
assertIncludes(crmCustomerService, 'crm_customer_activity_backfill_requested', 'CRM customer/activity backfill must use a stable default reason code');
assertIncludes(crmCustomerService, "sourceApp: 'crm'", 'CRM customer service must queue CRM source app jobs');
assertIncludes(crmCustomerService, "entityType,\n        entityId", 'CRM customer service must queue customer/activity entity jobs');
assertIncludes(crmCustomerService, "jobType === 'backfill'", 'CRM customer service must distinguish backfill job priority');
assertIncludes(crmCustomerService, 'priority: 30', 'CRM customer/activity backfill jobs must use controlled low-priority queueing');
assertIncludes(crmCustomerService, "'customer_created'", 'CRM customer create must queue AI index upsert');
assertIncludes(crmCustomerService, "'customer_updated'", 'CRM customer update must queue AI index upsert');
assertIncludes(crmCustomerService, "'customer_activity_created'", 'CRM customer activity create must queue AI index upsert');
assertIncludes(crmCustomerService, 'crmCustomer.findMany', 'CRM customer service must read customer rows from CRM RDB');
assertIncludes(crmCustomerService, 'crmCustomerActivity.findMany', 'CRM customer service must read activity rows for controlled backfill');
assertIncludes(crmCustomerService, 'crmCustomerActivity.create', 'CRM customer service must persist customer activities in CRM RDB');

const crmCustomerController = readText('apps/server/src/modules/crm/customer/customer.controller.ts');
assertIncludes(crmCustomerController, '@UseGuards(RolesGuard, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard)', 'CRM customer controller must use shared auth plus CRM customer feature guard');
assertIncludes(crmCustomerController, 'RequireCrmCustomerFeature', 'CRM customer controller must use customer feature requirements');
assertIncludes(crmCustomerController, "@Get('access/me')", 'CRM customer controller must expose global customer access snapshot');
assertIncludes(crmCustomerController, "@Get(':id/access')", 'CRM customer controller must expose customer object access snapshot');
assertIncludes(crmCustomerController, "RequireCrmCustomerFeature('canViewCustomer')", 'CRM customer list/detail must require customer read capability');
assertIncludes(crmCustomerController, "RequireCrmCustomerFeature('canCreateCustomer')", 'CRM customer create must require customer create capability');
assertIncludes(crmCustomerController, "RequireCrmCustomerFeature('canEditCustomer'", 'CRM customer update must require customer edit capability');
assertIncludes(crmCustomerController, "RequireCrmCustomerFeature('canViewCustomerActivity'", 'CRM customer activity list must require activity read capability');
assertIncludes(crmCustomerController, "RequireCrmCustomerFeature('canCreateCustomerActivity'", 'CRM customer activity create must require activity create capability');
assertIncludes(crmCustomerController, 'CrmCustomerAiIndexBackfillDto', 'CRM customer controller must use the shared AI index backfill DTO');
assertIncludes(crmCustomerController, "@Post('ai-index/backfill')", 'CRM customer controller must expose a controlled AI index backfill endpoint');
assertIncludes(crmCustomerController, "@Roles('admin')", 'CRM customer/activity AI index backfill endpoint must require system override/admin access');
assertIncludes(crmCustomerController, 'queueAiIndexBackfill', 'CRM customer controller must delegate controlled backfill to CustomerService');

const crmCustomerModule = readText('apps/server/src/modules/crm/customer/customer.module.ts');
assertIncludes(crmCustomerModule, 'CommonAiIndexModule', 'CRM customer module must import CommonAiIndexModule for customer/activity write-hook queueing');
assertIncludes(crmCustomerModule, 'CrmAccessModule', 'CRM customer module must import CRM access guard/service module');

const crmSearchModule = readText('apps/server/src/modules/crm/search/search.module.ts');
assertIncludes(crmSearchModule, 'CommonAiIndexModule', 'CRM search module must import CommonAiIndexModule');
assertIncludes(crmSearchModule, 'CrmAiIndexAdapter', 'CRM search module must provide CrmAiIndexAdapter');
assertIncludes(crmSearchModule, 'CustomerModule', 'CRM search module must import CustomerModule for customer common search results');

const crmAiIndexAdapter = readText('apps/server/src/modules/crm/search/crm-ai-index.adapter.ts');
assertIncludes(crmAiIndexAdapter, "readonly sourceApp = 'crm'", 'CRM AI adapter must register CRM source app');
assertIncludes(crmAiIndexAdapter, "readonly adapterCode = 'crm.opportunity.ai-index'", 'CRM AI adapter must expose stable adapter code');
assertIncludes(crmAiIndexAdapter, "value === 'opportunity' || value === 'customer' || value === 'activity'", 'CRM AI adapter must explicitly scope supported CRM entity types');
assertIncludes(crmAiIndexAdapter, 'findOpportunityProjection', 'CRM AI adapter must project opportunity RDB rows');
assertIncludes(crmAiIndexAdapter, 'crmOpportunity.findUnique', 'CRM AI adapter must read CRM opportunity rows from RDB');
assertIncludes(crmAiIndexAdapter, "entityType: 'opportunity'", 'CRM AI adapter projection must use opportunity entity type');
assertIncludes(crmAiIndexAdapter, 'findCustomerProjection', 'CRM AI adapter must project customer RDB rows');
assertIncludes(crmAiIndexAdapter, 'crmCustomer.findUnique', 'CRM AI adapter must read CRM customer rows from RDB');
assertIncludes(crmAiIndexAdapter, "entityType: 'customer'", 'CRM AI adapter projection must use customer entity type');
assertIncludes(crmAiIndexAdapter, 'findActivityProjection', 'CRM AI adapter must project customer activity RDB rows');
assertIncludes(crmAiIndexAdapter, 'crmCustomerActivity.findUnique', 'CRM AI adapter must read CRM customer activity rows from RDB');
assertIncludes(crmAiIndexAdapter, "entityType: 'activity'", 'CRM AI adapter projection must use activity entity type');
assertIncludes(crmAiIndexAdapter, "target: {\n          sourceApp: 'crm'", 'CRM AI adapter projection target must stay in CRM');
assertIncludes(crmAiIndexAdapter, "accessScope: 'policy'", 'CRM AI adapter must use policy-scoped projection');
assertIncludes(crmAiIndexAdapter, 'ownerUserIds', 'CRM AI adapter ACL snapshots must preserve object owner user candidates');
assertIncludes(crmAiIndexAdapter, 'crm-policy-or-owner', 'CRM AI adapter ACL snapshots must identify owner-aware CRM policy');
assertIncludes(crmAiIndexAdapter, "contextEligible: true", 'CRM AI adapter must make policy-filtered CRM context retrievable');
assertIncludes(crmAiIndexAdapter, "getStatus('default').ready", 'CRM AI adapter must gate semantic/vector/RAG capabilities on provider readiness');
assertIncludes(crmAiIndexAdapter, 'semantic: embeddingReady', 'CRM AI adapter semantic capability must follow provider readiness');
assertIncludes(crmAiIndexAdapter, 'vector: embeddingReady', 'CRM AI adapter vector capability must follow provider readiness');
assertIncludes(crmAiIndexAdapter, 'ragContext: embeddingReady', 'CRM AI adapter RAG context capability must follow provider readiness');

const crmAiIndexAdapterSpec = readText('apps/server/src/modules/crm/search/crm-ai-index.adapter.spec.ts');
assertIncludes(crmAiIndexAdapterSpec, 'provider-gated CRM opportunity domain adapter', 'CRM AI adapter spec must cover provider-gated capabilities');
assertIncludes(crmAiIndexAdapterSpec, 'projects CRM opportunity RDB rows', 'CRM AI adapter spec must cover RDB projection');
assertIncludes(crmAiIndexAdapterSpec, 'crm-opportunity-financials', 'CRM AI adapter spec must cover deterministic opportunity chunk keys');
assertIncludes(crmAiIndexAdapterSpec, 'projects CRM customer rows', 'CRM AI adapter spec must cover customer projection');
assertIncludes(crmAiIndexAdapterSpec, 'projects CRM customer activity rows', 'CRM AI adapter spec must cover customer activity projection');
assertIncludes(crmAiIndexAdapterSpec, 'crm-customer-activities', 'CRM AI adapter spec must cover deterministic customer chunk keys');
assertIncludes(crmAiIndexAdapterSpec, "ownerUserIds: ['77']", 'CRM AI adapter spec must cover customer owner ACL candidates');
assertIncludes(crmAiIndexAdapterSpec, "ownerUserIds: ['88', '77']", 'CRM AI adapter spec must cover activity and parent customer owner ACL candidates');

const crmOpportunityServiceSpec = readText('apps/server/src/modules/crm/opportunity/opportunity.service.spec.ts');
assertIncludes(crmOpportunityServiceSpec, 'CRM RDB ledger', 'CRM opportunity service spec must cover RDB ledger reads');
assertIncludes(crmOpportunityServiceSpec, 'read-only integration boundaries', 'CRM opportunity service spec must preserve CRM/PMS/DMS boundaries');
assertIncludes(crmOpportunityServiceSpec, 'calculated revenue and cost totals', 'CRM opportunity service spec must cover create totals');
assertIncludes(crmOpportunityServiceSpec, "sourceApp: 'crm'", 'CRM opportunity service spec must cover AI index write-hook queueing');
assertIncludes(crmOpportunityServiceSpec, 'rejects direct updates for confirmed opportunities', 'CRM opportunity service spec must cover confirmed row locking');
assertIncludes(crmOpportunityServiceSpec, 'confirms an active opportunity without creating a new version or contract handoff', 'CRM opportunity service spec must cover confirm locking');
assertIncludes(crmOpportunityServiceSpec, 'reopens a confirmed opportunity back to proposal editing', 'CRM opportunity service spec must cover reopen unlocking');
assertIncludes(crmOpportunityServiceSpec, 'lists all versions in an opportunity group in version order', 'CRM opportunity service spec must cover version listing');
assertIncludes(crmOpportunityServiceSpec, 'adds a draft version from the confirmed latest opportunity without contract handoff', 'CRM opportunity service spec must cover version addition');
assertIncludes(crmOpportunityServiceSpec, 'rejects direct updates for previous opportunity versions', 'CRM opportunity service spec must cover previous version read-only behavior');
assertIncludes(crmOpportunityServiceSpec, 'applies payment terms and rate-based special discounts', 'CRM opportunity service spec must cover payment terms and special discount calculations');
assertIncludes(crmOpportunityServiceSpec, 'remaps linked revenue rows from draft cost ids to persisted cost line codes', 'CRM opportunity service spec must cover linked cost id remapping');
assertIncludes(crmOpportunityServiceSpec, 'lists opportunity history from the CRM history ledger', 'CRM opportunity service spec must cover history ledger reads');
assertIncludes(crmOpportunityServiceSpec, 'derives a read-only quote preview from opportunity revenue lines without generating documents', 'CRM opportunity service spec must cover quote preview derivation');
assertIncludes(crmOpportunityServiceSpec, 'executes quote DMS lifecycle artifacts and records returned evidence on the active handoff', 'CRM opportunity service spec must cover quote DMS lifecycle execution');

const crmCustomerServiceSpec = readText('apps/server/src/modules/crm/customer/customer.service.spec.ts');
assertIncludes(crmCustomerServiceSpec, 'queues controlled CRM customer/activity AI index backfill jobs', 'CRM customer service spec must cover controlled customer/activity backfill queueing');
assertIncludes(crmCustomerServiceSpec, 'reports CRM customer/activity AI index backfill queue failures without aborting the batch', 'CRM customer service spec must cover backfill failure summaries');
assertIncludes(crmCustomerServiceSpec, 'rejects invalid CRM customer/activity AI index backfill ids before querying', 'CRM customer service spec must reject invalid backfill IDs');

const crmCustomerWorkspace = readText('apps/web/crm/src/components/pages/customers/CustomerWorkspaceClient.tsx');
assertIncludes(crmCustomerWorkspace, 'CrmCustomerGlobalAccessSnapshot', 'CRM customer workspace must type global customer access responses through shared contracts');
assertIncludes(crmCustomerWorkspace, 'CrmCustomerAccessSnapshot', 'CRM customer workspace must type object customer access responses through shared contracts');
assertIncludes(crmCustomerWorkspace, '/api/crm/customers/access', 'CRM customer workspace must fetch global customer access snapshots');
assertIncludes(crmCustomerWorkspace, '/access', 'CRM customer workspace must fetch customer object access snapshots');
assertIncludes(crmCustomerWorkspace, 'canCreateCustomer', 'CRM customer workspace must gate customer create using CRM access snapshot');
assertIncludes(crmCustomerWorkspace, 'canEditCustomer', 'CRM customer workspace must gate customer update using CRM access snapshot');
assertIncludes(crmCustomerWorkspace, 'canViewCustomerActivity', 'CRM customer workspace must gate customer activity reads using CRM access snapshot');
assertIncludes(crmCustomerWorkspace, 'canCreateCustomerActivity', 'CRM customer workspace must gate customer activity create using CRM access snapshot');
assertIncludes(crmCustomerWorkspace, '고객 활동 조회 권한이 없습니다.', 'CRM customer workspace must show activity read denial state');
assertIncludes(crmCustomerWorkspace, '고객 저장 권한을 확인하는 중입니다.', 'CRM customer workspace must expose customer access loading state');

const crmOpportunityWorkspace = readText('apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx');
assertIncludes(crmOpportunityWorkspace, 'paymentTermLabels', 'CRM opportunity workspace must expose payment term choices');
assertIncludes(crmOpportunityWorkspace, 'Special DC', 'CRM opportunity workspace must show special discount controls and summary');
assertIncludes(crmOpportunityWorkspace, '최종 매출', 'CRM opportunity workspace must distinguish discounted final revenue');
assertIncludes(crmOpportunityWorkspace, 'syncLinkedRevenueLines', 'CRM opportunity workspace must sync linked cost rows into revenue rows');
assertIncludes(crmOpportunityWorkspace, '매출단가', 'CRM opportunity workspace must expose linked cost revenue unit price input');
assertIncludes(crmOpportunityWorkspace, 'CrmOpportunityHistoryListResponse', 'CRM opportunity workspace must type history responses through shared contracts');
assertIncludes(crmOpportunityWorkspace, '변경 이력', 'CRM opportunity workspace must show opportunity change history');
assertIncludes(crmOpportunityWorkspace, 'CrmOpportunityAccessSnapshot', 'CRM opportunity workspace must type object access responses through shared contracts');
assertIncludes(crmOpportunityWorkspace, 'canCreateOpportunity', 'CRM opportunity workspace must disable create using CRM access snapshot');
assertIncludes(crmOpportunityWorkspace, 'canEditOpportunity', 'CRM opportunity workspace must disable edit using CRM access snapshot');
assertIncludes(crmOpportunityWorkspace, '권한', 'CRM opportunity workspace must show opportunity capability state');
assertIncludes(crmOpportunityWorkspace, 'CrmOpportunityQuotePreview', 'CRM opportunity workspace must type quote preview responses through shared contracts');
assertIncludes(crmOpportunityWorkspace, '견적 후보', 'CRM opportunity workspace must show read-only quote candidate surface');
assertIncludes(crmOpportunityWorkspace, 'QuotePreviewSection', 'CRM opportunity workspace must render quote preview through a dedicated section');
assertIncludes(crmOpportunityWorkspace, 'CrmQuoteDmsDocumentDraft', 'CRM opportunity workspace must type quote DMS draft responses through shared contracts');
assertIncludes(crmOpportunityWorkspace, '/quote-dms-document-draft', 'CRM opportunity workspace must call the quote DMS draft proxy');
assertIncludes(crmOpportunityWorkspace, 'CrmQuoteDmsDocumentLifecycleExecutionResult', 'CRM opportunity workspace must type quote DMS lifecycle execution responses through shared contracts');
assertIncludes(crmOpportunityWorkspace, '/quote-dms-document-lifecycle-execution', 'CRM opportunity workspace must call the quote DMS lifecycle execution proxy');
assertIncludes(crmOpportunityWorkspace, 'DMS 견적 초안', 'CRM opportunity workspace must render quote DMS draft handoff readiness');
assertIncludes(crmOpportunityWorkspace, 'formatQuoteTemplateEvidence', 'CRM opportunity workspace must render quote DMS template evidence');
assertIncludes(crmOpportunityWorkspace, 'templateEvidence.sourcePath', 'CRM opportunity workspace must render quote template source path evidence');
assertIncludes(crmOpportunityWorkspace, 'DMS 견적 lifecycle', 'CRM opportunity workspace must render quote DMS lifecycle evidence');
assertIncludes(crmOpportunityWorkspace, 'formatQuoteLifecycleStatus', 'CRM opportunity workspace must format quote DMS lifecycle status');
assertIncludes(crmOpportunityWorkspace, 'latestHandoff', 'CRM opportunity workspace must show latest quote DMS handoff evidence');
assertIncludes(crmOpportunityWorkspace, 'DMS 초안 저장', 'CRM opportunity workspace must expose quote DMS markdown draft creation');
assertIncludes(crmOpportunityWorkspace, 'DMS 산출 실행', 'CRM opportunity workspace must expose quote DMS artifact execution');
assertIncludes(crmOpportunityWorkspace, 'dmsDocument.unavailableActions.map', 'CRM quote preview UI must render any server-declared unavailable boundary actions');

const crmOpportunityDetailRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/route.ts');
assertIncludes(crmOpportunityDetailRoute, 'export async function GET', 'CRM opportunity detail proxy must support selected row detail reads');

const crmOpportunityGlobalAccessRoute = readText('apps/web/crm/src/app/api/crm/opportunities/access/route.ts');
assertIncludes(crmOpportunityGlobalAccessRoute, '/access/me', 'CRM opportunity global access proxy must forward access snapshot reads');

const crmOpportunityAccessRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/access/route.ts');
assertIncludes(crmOpportunityAccessRoute, '/access', 'CRM opportunity object access proxy must forward access snapshot reads');

const crmCustomerGlobalAccessRoute = readText('apps/web/crm/src/app/api/crm/customers/access/route.ts');
assertIncludes(crmCustomerGlobalAccessRoute, '/access/me', 'CRM customer global access proxy must forward access snapshot reads');

const crmCustomerAccessRoute = readText('apps/web/crm/src/app/api/crm/customers/[id]/access/route.ts');
assertIncludes(crmCustomerAccessRoute, '/access', 'CRM customer object access proxy must forward access snapshot reads');

const crmBusinessPlanCarryForwardRoute = readText('apps/web/crm/src/app/api/crm/business-plan/plans/carry-forward/route.ts');
assertIncludes(crmBusinessPlanCarryForwardRoute, '/crm/business-plan/plans/carry-forward', 'CRM business plan carry-forward proxy must forward writes to the server API');

const crmBusinessPlanMonthlyInputRoute = readText('apps/web/crm/src/app/api/crm/business-plan/plans/[id]/lines/[lineId]/monthly-plan/route.ts');
assertIncludes(crmBusinessPlanMonthlyInputRoute, '/monthly-plan', 'CRM business plan monthly direct input proxy must forward writes to the server API');

const crmBusinessPlanWorkspace = readText('apps/web/crm/src/components/pages/business-plan/BusinessPlanPreviewWorkspaceClient.tsx');
assertIncludes(crmBusinessPlanWorkspace, '/api/crm/business-plan/plans/carry-forward', 'CRM business plan UI must call the carry-forward proxy');
assertIncludes(crmBusinessPlanWorkspace, '/rows', 'CRM business plan UI must call the full source-row CRUD proxies');
assertIncludes(crmBusinessPlanWorkspace, 'toBusinessPlanRowRequest', 'CRM business plan UI must serialize three-year source-grid rows');
assertIncludes(crmBusinessPlanWorkspace, '12개월 매출·외부원가', 'CRM business plan UI must expose monthly revenue and external-cost inputs');
assertIncludes(crmBusinessPlanWorkspace, '붙여넣기 값을 그리드에 반영', 'CRM business plan UI must expose spreadsheet paste behavior');
assertIncludes(crmBusinessPlanWorkspace, '최신 차수 삭제', 'CRM business plan UI must expose draft version deletion');
assertIncludes(crmBusinessPlanWorkspace, 'sourceBaseYear: query.baseYear - 1', 'CRM business plan UI must default carry-forward source to the previous base year');
assertIncludes(crmBusinessPlanWorkspace, '전년 이월', 'CRM business plan UI must expose the previous-year carry-forward action');

const crmBusinessPlanFallback = readText('apps/web/crm/src/components/pages/business-plan/businessPlanPreviewFallback.ts');
assertNotIncludes(crmBusinessPlanFallback, '월별 직접 입력', 'CRM business plan fallback must not mark monthly direct input unavailable after implementation');
assertNotIncludes(crmBusinessPlanFallback, '전년 사업계획 이월', 'CRM business plan fallback must not mark previous-year carry-forward unavailable after implementation');

const crmBusinessPlanPerformanceRoute = readText('apps/web/crm/src/app/api/crm/business-plan/performance-preview/route.ts');
assertIncludes(crmBusinessPlanPerformanceRoute, '/crm/business-plan/performance-preview', 'CRM business plan performance proxy must forward preview reads to the server API');
const crmBusinessPlanPerformanceActualRoute = readText('apps/web/crm/src/app/api/crm/business-plan/performance-actual/monthly/route.ts');
assertIncludes(crmBusinessPlanPerformanceActualRoute, '/crm/business-plan/performance-actual/monthly', 'CRM business plan performance actual proxy must forward direct actual writes to the server API');
assertIncludes(crmBusinessPlanPerformanceActualRoute, "method: 'POST'", 'CRM business plan performance actual proxy must use POST for direct actual writes');

const crmBusinessPlanPerformanceWorkspace = readText('apps/web/crm/src/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceClient.tsx');
assertIncludes(crmBusinessPlanPerformanceWorkspace, "'confirmed-plan': '확정계획'", 'CRM business plan performance UI must label confirmed-plan source rows');
assertIncludes(crmBusinessPlanPerformanceWorkspace, "'confirmed-cost': '확정원가'", 'CRM business plan performance UI must label confirmed-cost source rows');
assertIncludes(crmBusinessPlanPerformanceWorkspace, "'manual-actual': '직접실적'", 'CRM business plan performance UI must label manual actual source rows');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'currentData.summary.confirmedPlanCode', 'CRM business plan performance UI must surface the confirmed plan code');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'currentData.summary.costBasisLabel', 'CRM business plan performance UI must surface the cost basis label');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'currentData.summary.confirmedCostInputCount', 'CRM business plan performance UI must surface confirmed cost input counts');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'saveDirectActual', 'CRM business plan performance UI must expose direct actual save behavior');
assertIncludes(crmBusinessPlanPerformanceWorkspace, '직접 실적 저장', 'CRM business plan performance UI must render the direct actual save action');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'currentData.summary.directActualInputCount', 'CRM business plan performance UI must surface direct actual input counts');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'currentData.summary.amsExternalCostAdjustedWbsCount', 'CRM business plan performance UI must surface AMS duplicate adjustment counts');
assertIncludes(crmBusinessPlanPerformanceWorkspace, 'AMS 중복조정', 'CRM business plan performance UI must label AMS duplicate external cost adjustments');
assertIncludes(crmBusinessPlanPerformanceWorkspace, '월 균등 배분', 'CRM business plan performance UI must disclose annual confirmed-plan monthly allocation');
assertIncludes(crmBusinessPlanPerformanceWorkspace, '확정 사업계획 차수 기준 읽기 전용 비교', 'CRM business plan performance UI must label confirmed-plan previews as read-only comparisons');

const crmBusinessPlanPerformanceFallback = readText('apps/web/crm/src/components/pages/business-plan-performance/businessPlanPerformancePreviewFallback.ts');
assertIncludes(crmBusinessPlanPerformanceFallback, '확정 사업계획 차수 기준 비교', 'CRM business plan performance fallback must keep confirmed-plan comparison unavailable without a confirmed plan');
assertIncludes(crmBusinessPlanPerformanceFallback, '계획·실적 계약 청구 외부원가', 'CRM business plan performance fallback must expose the default cost basis');
assertIncludes(crmBusinessPlanPerformanceFallback, 'directActualInputCount: 0', 'CRM business plan performance fallback must initialize direct actual input counts');
assertIncludes(crmBusinessPlanPerformanceFallback, 'amsExternalCostAdjustedWbsCount: 0', 'CRM business plan performance fallback must initialize AMS duplicate adjustment counts');

const crmReportsConfirmRoute = readText('apps/web/crm/src/app/api/crm/reports/confirm/route.ts');
assertIncludes(crmReportsConfirmRoute, '/crm/reports/confirm', 'CRM reports confirmation proxy must forward writes to the server API');
assertIncludes(crmReportsConfirmRoute, "method: 'POST'", 'CRM reports confirmation proxy must use POST');

const crmReportsReopenRoute = readText('apps/web/crm/src/app/api/crm/reports/confirmations/[id]/reopen/route.ts');
assertIncludes(crmReportsReopenRoute, '/crm/reports/confirmations/', 'CRM reports confirmation reopen proxy must forward writes to the server API');
assertIncludes(crmReportsReopenRoute, '/reopen', 'CRM reports confirmation reopen proxy must call the reopen server route');

const crmReportsWorkspace = readText('apps/web/crm/src/components/pages/reports/ReportsPreviewWorkspaceClient.tsx');
assertIncludes(crmReportsWorkspace, 'confirmReport', 'CRM reports UI must expose report confirmation behavior');
assertIncludes(crmReportsWorkspace, 'reopenReport', 'CRM reports UI must expose report confirmation reopen behavior');
assertIncludes(crmReportsWorkspace, '/api/crm/reports/confirm', 'CRM reports UI must call the report confirmation proxy');
assertIncludes(crmReportsWorkspace, '/api/crm/reports/confirmations/', 'CRM reports UI must call the report confirmation reopen proxy');
assertIncludes(crmReportsWorkspace, 'latestConfirmation', 'CRM reports UI must surface the latest confirmation status');
assertIncludes(crmReportsWorkspace, '보고 확정', 'CRM reports UI must render the report confirmation action');
assertIncludes(crmReportsWorkspace, '확정 해제', 'CRM reports UI must render the report confirmation reopen action');

const crmReportsFallback = readText('apps/web/crm/src/components/pages/reports/reportsPreviewFallback.ts');
assertIncludes(crmReportsFallback, 'latestConfirmation: null', 'CRM reports fallback must initialize confirmation state');

const crmCostPlanInternalMonthlyRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/route.ts');
assertIncludes(crmCostPlanInternalMonthlyRoute, '/crm/cost-plan/internal-cost/monthly', 'CRM cost plan internal monthly proxy must forward writes to the server API');

const crmCostPlanInternalConfirmRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/[id]/confirm/route.ts');
assertIncludes(crmCostPlanInternalConfirmRoute, '/crm/cost-plan/internal-cost/monthly/', 'CRM cost plan internal monthly confirm proxy must forward writes to the server API');
assertIncludes(crmCostPlanInternalConfirmRoute, '/confirm', 'CRM cost plan internal monthly confirm proxy must call the confirm server route');

const crmCostPlanInternalReopenRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/internal-cost/monthly/[id]/reopen/route.ts');
assertIncludes(crmCostPlanInternalReopenRoute, '/crm/cost-plan/internal-cost/monthly/', 'CRM cost plan internal monthly reopen proxy must forward writes to the server API');
assertIncludes(crmCostPlanInternalReopenRoute, '/reopen', 'CRM cost plan internal monthly reopen proxy must call the reopen server route');

const crmCostPlanAmsVendorWbsRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/ams/vendor-wbs/route.ts');
assertIncludes(crmCostPlanAmsVendorWbsRoute, '/crm/cost-plan/ams/vendor-wbs', 'CRM cost plan AMS mapping proxy must forward writes to the server API');

const crmCostPlanAmsExternalMonthlyRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/route.ts');
assertIncludes(crmCostPlanAmsExternalMonthlyRoute, '/crm/cost-plan/ams/external-cost/monthly', 'CRM cost plan AMS external monthly proxy must forward writes to the server API');

const crmCostPlanAmsExternalConfirmRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/[id]/confirm/route.ts');
assertIncludes(crmCostPlanAmsExternalConfirmRoute, '/crm/cost-plan/ams/external-cost/monthly/', 'CRM cost plan AMS external confirm proxy must forward writes to the server API');
assertIncludes(crmCostPlanAmsExternalConfirmRoute, '/confirm', 'CRM cost plan AMS external confirm proxy must call the confirm server route');

const crmCostPlanAmsExternalReopenRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/ams/external-cost/monthly/[id]/reopen/route.ts');
assertIncludes(crmCostPlanAmsExternalReopenRoute, '/crm/cost-plan/ams/external-cost/monthly/', 'CRM cost plan AMS external reopen proxy must forward writes to the server API');
assertIncludes(crmCostPlanAmsExternalReopenRoute, '/reopen', 'CRM cost plan AMS external reopen proxy must call the reopen server route');

const crmCostPlanAccountingPaymentPreviewRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-preview/route.ts');
assertIncludes(crmCostPlanAccountingPaymentPreviewRoute, '/crm/cost-plan/accounting-payment-preview', 'CRM cost plan accounting/payment preview proxy must forward reads to the server API');

const crmCostPlanAccountingPaymentHandoffRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoff/route.ts');
assertIncludes(crmCostPlanAccountingPaymentHandoffRoute, '/crm/cost-plan/accounting-payment-handoff', 'CRM cost plan accounting/payment handoff proxy must forward writes to the server API');

const crmCostPlanAccountingPaymentExecuteRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execute/route.ts');
assertIncludes(crmCostPlanAccountingPaymentExecuteRoute, '/crm/cost-plan/accounting-payment-handoffs/', 'CRM cost plan accounting/payment execute proxy must forward writes to the server API');
assertIncludes(crmCostPlanAccountingPaymentExecuteRoute, '/execute', 'CRM cost plan accounting/payment execute proxy must call the execute server route');

const crmCostPlanAccountingPaymentExecutionEvidenceRoute = readText('apps/web/crm/src/app/api/crm/cost-plan/accounting-payment-handoffs/[id]/execution-evidence/route.ts');
assertIncludes(crmCostPlanAccountingPaymentExecutionEvidenceRoute, '/crm/cost-plan/accounting-payment-handoffs/', 'CRM cost plan accounting/payment execution evidence proxy must forward writes to the server API');
assertIncludes(crmCostPlanAccountingPaymentExecutionEvidenceRoute, '/execution-evidence', 'CRM cost plan accounting/payment execution evidence proxy must call the evidence server route');

const crmCostPlanWorkspace = readText('apps/web/crm/src/components/pages/cost-plan/CostPlanPreviewWorkspaceClient.tsx');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/internal-cost/monthly', 'CRM cost plan UI must call the internal monthly input proxy');
assertIncludes(crmCostPlanWorkspace, 'monthlyPlanAmounts', 'CRM cost plan UI must render monthly internal cost plan inputs');
assertIncludes(crmCostPlanWorkspace, 'monthlyActualAmounts', 'CRM cost plan UI must render monthly internal cost actual inputs');
assertIncludes(crmCostPlanWorkspace, '내부원가 월별 저장', 'CRM cost plan UI must expose internal monthly input saving');
assertIncludes(crmCostPlanWorkspace, 'runInternalCostWorkflow', 'CRM cost plan UI must expose internal monthly confirmation workflow calls');
assertIncludes(crmCostPlanWorkspace, 'internalCostConfirmedRowCount', 'CRM cost plan UI must surface confirmed internal monthly input counts');
assertIncludes(crmCostPlanWorkspace, 'internalCostInputStatus', 'CRM cost plan UI must render internal monthly input status');
assertIncludes(crmCostPlanWorkspace, '내부원가 확정', 'CRM cost plan UI must expose internal monthly input confirmation');
assertIncludes(crmCostPlanWorkspace, '확정 해제', 'CRM cost plan UI must expose internal monthly input reopen');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/ams/vendor-wbs', 'CRM cost plan UI must call the AMS vendor-WBS mapping proxy');
assertIncludes(crmCostPlanWorkspace, 'AMS 업체 매핑 저장', 'CRM cost plan UI must expose AMS vendor-WBS mapping saving');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/ams/external-cost/monthly', 'CRM cost plan UI must call the AMS external monthly input proxy');
assertIncludes(crmCostPlanWorkspace, 'amsExternalMonthlyPlanAmounts', 'CRM cost plan UI must render monthly AMS external cost plan inputs');
assertIncludes(crmCostPlanWorkspace, 'AMS 외부원가 월별 저장', 'CRM cost plan UI must expose AMS external monthly input saving');
assertIncludes(crmCostPlanWorkspace, 'runAmsExternalWorkflow', 'CRM cost plan UI must expose AMS external monthly confirmation workflow calls');
assertIncludes(crmCostPlanWorkspace, 'amsExternalCostConfirmedRowCount', 'CRM cost plan UI must surface confirmed AMS external monthly input counts');
assertIncludes(crmCostPlanWorkspace, 'amsExternalCostInputStatus', 'CRM cost plan UI must render AMS external monthly input status');
assertIncludes(crmCostPlanWorkspace, 'AMS 정산 확정', 'CRM cost plan UI must expose AMS external monthly settlement confirmation');
assertIncludes(crmCostPlanWorkspace, '정산 확정 해제', 'CRM cost plan UI must expose AMS external monthly settlement reopen');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/accounting-payment-preview', 'CRM cost plan UI must call the accounting/payment preview proxy');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/accounting-payment-handoff', 'CRM cost plan UI must call the accounting/payment handoff proxy');
assertIncludes(crmCostPlanWorkspace, '/api/crm/cost-plan/accounting-payment-handoffs/', 'CRM cost plan UI must call the accounting/payment execution proxy');
assertIncludes(crmCostPlanWorkspace, '/execute', 'CRM cost plan UI must call the accounting/payment execute route');
assertIncludes(crmCostPlanWorkspace, 'AccountingPaymentHandoffPanel', 'CRM cost plan UI must render accounting/payment handoff status');
assertIncludes(crmCostPlanWorkspace, '회계·지급 handoff 기록', 'CRM cost plan UI must expose accounting/payment handoff snapshot recording');
assertIncludes(crmCostPlanWorkspace, '회계·지급 실행', 'CRM cost plan UI must expose accounting/payment execution');
assertIncludes(crmCostPlanWorkspace, 'latestHandoff?.executionEvidence', 'CRM cost plan UI must render accounting/payment execution evidence paths');
assertIncludes(crmCostPlanWorkspace, 'unavailableActions', 'CRM cost plan UI must show actual external system actions as unavailable');

const crmCostPlanFallback = readText('apps/web/crm/src/components/pages/cost-plan/costPlanPreviewFallback.ts');
assertNotIncludes(crmCostPlanFallback, '내부원가 월별 저장', 'CRM cost plan fallback must not mark internal monthly input unavailable after implementation');
assertNotIncludes(crmCostPlanFallback, '내부원가 계획/실적 확정', 'CRM cost plan fallback must not keep internal cost confirmation unavailable after implementation');
assertNotIncludes(crmCostPlanFallback, 'AMS 업체-WBS 매핑 저장', 'CRM cost plan fallback must not mark AMS vendor-WBS mapping unavailable after implementation');
assertNotIncludes(crmCostPlanFallback, 'AMS 외부원가 월별 저장', 'CRM cost plan fallback must not mark AMS external monthly input unavailable after implementation');
assertIncludes(crmCostPlanFallback, 'internalCostConfirmedRowCount', 'CRM cost plan fallback must expose confirmed internal monthly input counts');
assertNotIncludes(crmCostPlanFallback, 'AMS 외부원가 정산 확정', 'CRM cost plan fallback must not keep AMS external settlement confirmation unavailable after implementation');
assertIncludes(crmCostPlanFallback, 'amsExternalCostConfirmedRowCount', 'CRM cost plan fallback must expose confirmed AMS external monthly input counts');

const crmOpportunityHistoryRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/history/route.ts');
assertIncludes(crmOpportunityHistoryRoute, '/history', 'CRM opportunity history proxy must forward history reads to the server API');

const crmOpportunityQuotePreviewRoute = readText('apps/web/crm/src/app/api/crm/opportunities/[id]/quote-preview/route.ts');
assertIncludes(crmOpportunityQuotePreviewRoute, '/quote-preview', 'CRM opportunity quote preview proxy must forward quote preview reads to the server API');

const pmsSearchModule = readText('apps/server/src/modules/pms/search/search.module.ts');
assertIncludes(pmsSearchModule, 'CommonAiIndexModule', 'PMS search module must import CommonAiIndexModule');
assertIncludes(pmsSearchModule, 'PmsAiIndexAdapter', 'PMS search module must provide PmsAiIndexAdapter');

const pmsAiIndexAdapter = readText('apps/server/src/modules/pms/search/pms-ai-index.adapter.ts');
assertIncludes(pmsAiIndexAdapter, "readonly sourceApp = 'pms'", 'PMS AI adapter must register PMS source app');
assertIncludes(pmsAiIndexAdapter, "readonly adapterCode = 'pms.project.ai-index'", 'PMS AI adapter must expose stable adapter code');
assertIncludes(pmsAiIndexAdapter, "request.entityType !== 'project'", 'PMS AI adapter must support project entities');
assertIncludes(pmsAiIndexAdapter, "request.entityType !== 'task'", 'PMS AI adapter must support task entities');
assertIncludes(pmsAiIndexAdapter, "request.entityType !== 'projectMember'", 'PMS AI adapter must support project member entities');
assertIncludes(pmsAiIndexAdapter, "request.entityType !== 'projectStatus'", 'PMS AI adapter must support project status entities');
assertIncludes(pmsAiIndexAdapter, 'projectMembers', 'PMS AI adapter must project project member ACL data from RDB');
assertIncludes(pmsAiIndexAdapter, 'projectOrgs', 'PMS AI adapter must project project organization ACL data from RDB');
assertIncludes(pmsAiIndexAdapter, 'findTaskProjection', 'PMS AI adapter must project task RDB rows');
assertIncludes(pmsAiIndexAdapter, 'findProjectMemberProjection', 'PMS AI adapter must project project member RDB rows');
assertIncludes(pmsAiIndexAdapter, 'findProjectStatusProjection', 'PMS AI adapter must project project status RDB rows');
assertIncludes(pmsAiIndexAdapter, 'buildTaskAclSnapshot', 'PMS AI adapter must project task ACL data from project/member/org rows');
assertIncludes(pmsAiIndexAdapter, 'buildTaskChunks', 'PMS AI adapter must chunk task context');
assertIncludes(pmsAiIndexAdapter, "entityType: 'task'", 'PMS AI adapter task projection must use task entity type');
assertIncludes(pmsAiIndexAdapter, "entityType: 'projectMember'", 'PMS AI adapter member projection must use projectMember entity type');
assertIncludes(pmsAiIndexAdapter, "entityType: 'projectStatus'", 'PMS AI adapter status projection must use projectStatus entity type');
assertIncludes(pmsAiIndexAdapter, "chunkKey: `pms-task-${section.key}`", 'PMS AI adapter task chunks must use stable task chunk keys');
assertIncludes(pmsAiIndexAdapter, "chunkKey: `pms-project-member-${section.key}`", 'PMS AI adapter member chunks must use stable member chunk keys');
assertIncludes(pmsAiIndexAdapter, "chunkKey: `pms-project-status-${section.key}`", 'PMS AI adapter status chunks must use stable status chunk keys');
assertIncludes(pmsAiIndexAdapter, "target: {\n          sourceApp: 'pms'", 'PMS AI adapter projection target must stay in PMS');
assertIncludes(pmsAiIndexAdapter, "accessScope: 'acl'", 'PMS AI adapter must use ACL-scoped projection');
assertIncludes(pmsAiIndexAdapter, "contextEligible: true", 'PMS AI adapter must make ACL-filtered PMS project context retrievable');
assertIncludes(pmsAiIndexAdapter, "getStatus('default').ready", 'PMS AI adapter must gate semantic/vector/RAG capabilities on provider readiness');
assertIncludes(pmsAiIndexAdapter, 'semantic: embeddingReady', 'PMS AI adapter semantic capability must follow provider readiness');
assertIncludes(pmsAiIndexAdapter, 'vector: embeddingReady', 'PMS AI adapter vector capability must follow provider readiness');
assertIncludes(pmsAiIndexAdapter, 'ragContext: embeddingReady', 'PMS AI adapter RAG context capability must follow provider readiness');

const pmsAiIndexAdapterSpec = readText('apps/server/src/modules/pms/search/pms-ai-index.adapter.spec.ts');
assertIncludes(pmsAiIndexAdapterSpec, 'projects PMS project RDB rows', 'PMS AI adapter spec must cover RDB projection');
assertIncludes(pmsAiIndexAdapterSpec, 'projects PMS task RDB rows', 'PMS AI adapter spec must cover task RDB projection');
assertIncludes(pmsAiIndexAdapterSpec, 'projects PMS project member RDB rows', 'PMS AI adapter spec must cover project member RDB projection');
assertIncludes(pmsAiIndexAdapterSpec, 'projects PMS project status RDB rows', 'PMS AI adapter spec must cover project status RDB projection');
assertIncludes(pmsAiIndexAdapterSpec, 'readableUserIds', 'PMS AI adapter spec must cover ACL user snapshot');
assertIncludes(pmsAiIndexAdapterSpec, 'organizationIds', 'PMS AI adapter spec must cover ACL organization snapshot');
assertIncludes(pmsAiIndexAdapterSpec, 'provider-gated PMS project domain adapter', 'PMS AI adapter spec must cover provider-gated capabilities');

const pmsProjectModule = readText('apps/server/src/modules/pms/project/project.module.ts');
assertIncludes(pmsProjectModule, 'CommonAiIndexModule', 'PMS project module must import CommonAiIndexModule for write-hook queueing');

const pmsProjectController = readText('apps/server/src/modules/pms/project/project.controller.ts');
assertIncludes(pmsProjectController, 'ProjectAiIndexBackfillRequest', 'PMS project controller must use the shared AI index backfill contract');
assertIncludes(pmsProjectController, '@Post("ai-index/backfill")', 'PMS project controller must expose a controlled AI index backfill endpoint');
assertIncludes(pmsProjectController, "@Roles('admin')", 'PMS project AI index backfill endpoint must require system override/admin access');
assertIncludes(pmsProjectController, 'queueAiIndexBackfill', 'PMS project controller must delegate controlled backfill to ProjectService');
assertIncludes(pmsProjectController, 'ApplyCrmContractHandoffSnapshotDto', 'PMS project controller must type CRM handoff snapshot apply requests');
assertIncludes(pmsProjectController, '@Post(":id/contracts/crm-handoff-snapshot")', 'PMS project controller must expose CRM handoff snapshot apply endpoint');
assertIncludes(pmsProjectController, 'applyCrmContractHandoffSnapshot', 'PMS project controller must delegate CRM handoff snapshot application');

const pmsProjectHandoffContractService = readText('apps/server/src/modules/pms/project/project-handoff-contract.service.ts');
assertIncludes(pmsProjectHandoffContractService, 'CRM_HANDOFF_SNAPSHOT_BOUNDARY_NOTICE', 'PMS CRM handoff snapshot application must keep a boundary notice');
assertIncludes(pmsProjectHandoffContractService, 'assertReadyCrmContractHandoffPreview', 'PMS CRM handoff snapshot application must validate ready CRM previews');
assertIncludes(pmsProjectHandoffContractService, 'contractPayment.updateMany', 'PMS CRM handoff snapshot application must replace stale payment snapshots idempotently');
assertIncludes(pmsProjectHandoffContractService, 'projectHandoff.create', 'PMS CRM handoff snapshot application must record an accepted handoff snapshot');
assertIncludes(pmsProjectHandoffContractService, 'syncExecutionDetailFromPrimaryContract', 'PMS CRM handoff snapshot application must keep execution detail in sync with the primary contract snapshot');
assertIncludes(pmsProjectHandoffContractService, "lastSource: 'crm'", 'PMS CRM handoff snapshot rows must identify CRM as the source');

const pmsProjectHandoffContractServiceSpec = readText('apps/server/src/modules/pms/project/project-handoff-contract.service.spec.ts');
assertIncludes(pmsProjectHandoffContractServiceSpec, 'applies a ready CRM contract handoff preview', 'PMS CRM handoff snapshot spec must cover ready preview application');
assertIncludes(pmsProjectHandoffContractServiceSpec, 'rejects a blocked CRM handoff preview', 'PMS CRM handoff snapshot spec must cover blocked preview rejection');

const pmsProjectService = readText('apps/server/src/modules/pms/project/project.service.ts');
assertIncludes(pmsProjectService, 'AiIndexingService', 'PMS project service must use the common AI index job queue');
assertIncludes(pmsProjectService, 'queueProjectAiIndexJob', 'PMS project service must centralize PMS AI index job queueing');
assertIncludes(pmsProjectService, 'queueAiIndexBackfill', 'PMS project service must expose controlled PMS AI index backfill queueing');
assertIncludes(pmsProjectService, 'DEFAULT_PROJECT_AI_INDEX_BACKFILL_LIMIT', 'PMS project backfill must define a default limit');
assertIncludes(pmsProjectService, 'MAX_PROJECT_AI_INDEX_BACKFILL_LIMIT', 'PMS project backfill must define a maximum limit');
assertIncludes(pmsProjectService, 'project_backfill_requested', 'PMS project backfill must use a stable default reason code');
assertIncludes(pmsProjectService, "sourceApp: 'pms'", 'PMS project service must queue PMS source app jobs');
assertIncludes(pmsProjectService, "entityType: 'project'", 'PMS project service must queue project entity jobs');
assertIncludes(pmsProjectService, "jobType === 'backfill'", 'PMS project service must distinguish backfill job priority');
assertIncludes(pmsProjectService, 'priority: 30', 'PMS project backfill jobs must use controlled low-priority queueing');

const pmsProjectsApi = readText('apps/web/pms/src/lib/api/endpoints/projects.ts');
assertIncludes(pmsProjectsApi, 'ApplyCrmContractHandoffSnapshotRequest', 'PMS web API must expose CRM handoff snapshot apply request type');
assertIncludes(pmsProjectsApi, 'applyCrmContractHandoffSnapshot', 'PMS web API must call the CRM handoff snapshot apply endpoint');
assertIncludes(pmsProjectsApi, '/contracts/crm-handoff-snapshot', 'PMS web API must target the CRM handoff snapshot apply endpoint');

const pmsUseProjects = readText('apps/web/pms/src/hooks/queries/useProjects.ts');
assertIncludes(pmsUseProjects, 'useApplyCrmContractHandoffSnapshot', 'PMS project hooks must expose CRM handoff snapshot apply mutation');
assertIncludes(pmsUseProjects, 'projectContractKeys.all', 'PMS CRM handoff snapshot mutation must refresh contract snapshots');
assertIncludes(pmsUseProjects, 'projectHandoffKeys.all', 'PMS CRM handoff snapshot mutation must refresh handoff snapshots');

const pmsHandoffsTab = readText('apps/web/pms/src/components/pages/project/tabs/HandoffsTab.tsx');
assertIncludes(pmsHandoffsTab, 'useApplyCrmContractHandoffSnapshot', 'PMS handoff tab must use the CRM handoff snapshot apply mutation');
assertIncludes(pmsHandoffsTab, '명시 반영', 'PMS handoff tab must label CRM handoff snapshot application as explicit');
assertIncludes(pmsHandoffsTab, '스냅샷 반영', 'PMS handoff tab must expose a CRM handoff snapshot apply action');
assertIncludes(pmsHandoffsTab, "preview.readiness === 'ready'", 'PMS handoff tab must only enable CRM snapshot application for ready previews');
assertIncludes(pmsProjectService, "'project_created'", 'PMS project create must queue AI index upsert');
assertIncludes(pmsProjectService, "'project_updated'", 'PMS project update must queue AI index upsert');
assertIncludes(pmsProjectService, "'project_deleted'", 'PMS project delete must queue AI index delete');
assertIncludes(pmsProjectService, "'stage_advanced'", 'PMS project stage transitions must queue AI index upsert');
assertIncludes(pmsProjectService, 'PMS project AI index job queue failed', 'PMS project writes must degrade gracefully when AI queueing fails');

const pmsProjectServiceSpec = readText('apps/server/src/modules/pms/project/project.service.spec.ts');
assertIncludes(pmsProjectServiceSpec, 'queues PMS AI index upsert job after project create', 'PMS project service spec must cover create queue hook');
assertIncludes(pmsProjectServiceSpec, 'queues PMS AI index delete job after project removal', 'PMS project service spec must cover delete queue hook');
assertIncludes(pmsProjectServiceSpec, 'does not fail project update when AI index queue fails', 'PMS project service spec must cover queue failure isolation');
assertIncludes(pmsProjectServiceSpec, 'queues controlled PMS AI index backfill jobs for active projects', 'PMS project service spec must cover controlled backfill queueing');
assertIncludes(pmsProjectServiceSpec, 'reports PMS AI index backfill queue failures without aborting the batch', 'PMS project service spec must cover backfill failure summaries');
assertIncludes(pmsProjectServiceSpec, 'rejects invalid PMS AI index backfill project ids before querying', 'PMS project service spec must reject invalid backfill IDs');
assertIncludes(pmsProjectServiceSpec, 'queues PMS AI index upsert job after request detail upsert', 'PMS project service spec must cover detail upsert queue hook');
assertIncludes(pmsProjectServiceSpec, 'queues PMS AI index upsert job after stage advance', 'PMS project service spec must cover stage transition queue hook');

const pmsTaskModule = readText('apps/server/src/modules/pms/task/task.module.ts');
assertIncludes(pmsTaskModule, 'CommonAiIndexModule', 'PMS task module must import CommonAiIndexModule for task write-hook queueing');

const pmsTaskController = readText('apps/server/src/modules/pms/task/task.controller.ts');
assertIncludes(pmsTaskController, 'TaskAiIndexBackfillRequest', 'PMS task controller must use the shared AI index backfill contract');
assertIncludes(pmsTaskController, "@Post('ai-index/backfill')", 'PMS task controller must expose a project-scoped AI index backfill endpoint');
assertIncludes(pmsTaskController, "@RequireProjectFeature('canManageTasks')", 'PMS task AI index backfill endpoint must require task management access');
assertIncludes(pmsTaskController, 'queueAiIndexBackfill', 'PMS task controller must delegate controlled backfill to TaskService');

const pmsTaskService = readText('apps/server/src/modules/pms/task/task.service.ts');
assertIncludes(pmsTaskService, 'AiIndexingService', 'PMS task service must use the common AI index job queue');
assertIncludes(pmsTaskService, 'queueTaskAiIndexJob', 'PMS task service must centralize task AI index job queueing');
assertIncludes(pmsTaskService, 'queueAiIndexBackfill', 'PMS task service must expose controlled task AI index backfill queueing');
assertIncludes(pmsTaskService, 'DEFAULT_TASK_AI_INDEX_BACKFILL_LIMIT', 'PMS task backfill must define a default limit');
assertIncludes(pmsTaskService, 'MAX_TASK_AI_INDEX_BACKFILL_LIMIT', 'PMS task backfill must define a maximum limit');
assertIncludes(pmsTaskService, 'task_backfill_requested', 'PMS task backfill must use a stable default reason code');
assertIncludes(pmsTaskService, "sourceApp: 'pms'", 'PMS task service must queue PMS source app jobs');
assertIncludes(pmsTaskService, "entityType: 'task'", 'PMS task service must queue task entity jobs');
assertIncludes(pmsTaskService, "jobType === 'backfill'", 'PMS task service must distinguish backfill job priority');
assertIncludes(pmsTaskService, 'priority: 30', 'PMS task backfill jobs must use controlled low-priority queueing');
assertIncludes(pmsTaskService, "'task_created'", 'PMS task create must queue AI index upsert');
assertIncludes(pmsTaskService, "'task_updated'", 'PMS task update must queue AI index upsert');
assertIncludes(pmsTaskService, "'task_deleted'", 'PMS task delete must queue AI index delete');
assertIncludes(pmsTaskService, 'PMS task AI index job queue failed', 'PMS task writes must degrade gracefully when AI queueing fails');

const pmsTaskServiceSpec = readText('apps/server/src/modules/pms/task/task.service.spec.ts');
assertIncludes(pmsTaskServiceSpec, 'queues PMS AI index upsert job after task create', 'PMS task service spec must cover create queue hook');
assertIncludes(pmsTaskServiceSpec, 'queues PMS AI index upsert job after task update', 'PMS task service spec must cover update queue hook');
assertIncludes(pmsTaskServiceSpec, 'does not fail task update when AI index queue fails', 'PMS task service spec must cover queue failure isolation');
assertIncludes(pmsTaskServiceSpec, 'queues PMS AI index delete job after task removal', 'PMS task service spec must cover delete queue hook');
assertIncludes(pmsTaskServiceSpec, 'queues controlled PMS AI index backfill jobs for project tasks', 'PMS task service spec must cover controlled backfill queueing');
assertIncludes(pmsTaskServiceSpec, 'reports PMS task AI index backfill queue failures without aborting the batch', 'PMS task service spec must cover backfill failure summaries');
assertIncludes(pmsTaskServiceSpec, 'rejects invalid PMS task AI index backfill task ids before querying', 'PMS task service spec must reject invalid backfill IDs');

const snsSearchModule = readText('apps/server/src/modules/sns/search/search.module.ts');
assertIncludes(snsSearchModule, 'CommonAiIndexModule', 'SNS search module must import CommonAiIndexModule');
assertIncludes(snsSearchModule, 'SnsAiIndexAdapter', 'SNS search module must provide SnsAiIndexAdapter');

const snsAiIndexAdapter = readText('apps/server/src/modules/sns/search/sns-ai-index.adapter.ts');
assertIncludes(snsAiIndexAdapter, "readonly sourceApp = 'sns'", 'SNS AI adapter must register SNS source app');
assertIncludes(snsAiIndexAdapter, "readonly adapterCode = 'sns.post.ai-index'", 'SNS AI adapter must expose stable adapter code');
assertIncludes(snsAiIndexAdapter, "request.entityType !== 'post'", 'SNS AI adapter must keep post-only first-slice scope explicit');
assertIncludes(snsAiIndexAdapter, 'findPostProjection', 'SNS AI adapter must project post RDB rows');
assertIncludes(snsAiIndexAdapter, 'snsPost.findFirst', 'SNS AI adapter must read SNS post rows from RDB');
assertIncludes(snsAiIndexAdapter, "entityType: 'post'", 'SNS AI adapter projection must use post entity type');
assertIncludes(snsAiIndexAdapter, "target: {\n          sourceApp: 'sns'", 'SNS AI adapter projection target must stay in SNS');
assertIncludes(snsAiIndexAdapter, "accessScope: 'public'", 'SNS AI adapter must preserve public post ACL');
assertIncludes(snsAiIndexAdapter, "access: 'organization-acl'", 'SNS AI adapter must use organization ACL snapshot for organization visibility');
assertIncludes(snsAiIndexAdapter, "accessScope: 'acl'", 'SNS organization AI adapter ACL must avoid broad authenticated organization scope');
assertIncludes(snsAiIndexAdapter, 'organizationIds', 'SNS organization AI adapter ACL must include organization IDs');
assertIncludes(snsAiIndexAdapter, "accessScope: 'owner'", 'SNS followers/self AI adapter ACL must narrow to owner scope');
assertIncludes(snsAiIndexAdapter, 'readableUserIds', 'SNS AI adapter ACL must include explicit readable user IDs');
assertIncludes(snsAiIndexAdapter, "getStatus('default').ready", 'SNS AI adapter must gate semantic/vector/RAG capabilities on provider readiness');
assertIncludes(snsAiIndexAdapter, 'semantic: embeddingReady', 'SNS AI adapter semantic capability must follow provider readiness');
assertIncludes(snsAiIndexAdapter, 'vector: embeddingReady', 'SNS AI adapter vector capability must follow provider readiness');
assertIncludes(snsAiIndexAdapter, 'ragContext: embeddingReady', 'SNS AI adapter RAG context capability must follow provider readiness');

const snsAiIndexAdapterSpec = readText('apps/server/src/modules/sns/search/sns-ai-index.adapter.spec.ts');
assertIncludes(snsAiIndexAdapterSpec, 'provider-gated SNS post domain adapter', 'SNS AI adapter spec must cover provider-gated capabilities');
assertIncludes(snsAiIndexAdapterSpec, 'projects public SNS post rows', 'SNS AI adapter spec must cover public post projection');
assertIncludes(snsAiIndexAdapterSpec, 'organization ACL snapshots', 'SNS AI adapter spec must cover organization ACL projection');
assertIncludes(snsAiIndexAdapterSpec, 'owner-only ACL', 'SNS AI adapter spec must cover followers/self owner-only projection');

const snsPostModule = readText('apps/server/src/modules/sns/post/post.module.ts');
assertIncludes(snsPostModule, 'CommonAiIndexModule', 'SNS post module must import CommonAiIndexModule for post write-hook queueing');

const snsPostService = readText('apps/server/src/modules/sns/post/post.service.ts');
assertIncludes(snsPostService, 'AiIndexingService', 'SNS post service must use the common AI index job queue');
assertIncludes(snsPostService, 'queuePostAiIndexJob', 'SNS post service must centralize post AI index job queueing');
assertIncludes(snsPostService, "sourceApp: 'sns'", 'SNS post service must queue SNS source app jobs');
assertIncludes(snsPostService, "entityType: 'post'", 'SNS post service must queue post entity jobs');
assertIncludes(snsPostService, "'post_created'", 'SNS post create must queue AI index upsert');
assertIncludes(snsPostService, "'post_updated'", 'SNS post update must queue AI index upsert');
assertIncludes(snsPostService, "'post_deleted'", 'SNS post delete must queue AI index delete');
assertIncludes(snsPostService, 'SNS post AI index job queue failed', 'SNS post writes must degrade gracefully when AI queueing fails');

const snsPostServiceSpec = readText('apps/server/src/modules/sns/post/post.service.spec.ts');
assertIncludes(snsPostServiceSpec, 'queues SNS AI index upsert job after post create', 'SNS post service spec must cover create queue hook');
assertIncludes(snsPostServiceSpec, 'queues SNS AI index upsert job after post update', 'SNS post service spec must cover update queue hook');
assertIncludes(snsPostServiceSpec, 'does not fail post update when SNS AI index queue fails', 'SNS post service spec must cover queue failure isolation');
assertIncludes(snsPostServiceSpec, 'queues SNS AI index delete job after post soft delete', 'SNS post service spec must cover delete queue hook');

const dmsSearchService = readText('apps/server/src/modules/dms/search/search.service.ts');
assertIncludes(dmsSearchService, 'syncCommonAiIndex', 'DMS search sync must also update the common AI index');
assertIncludes(dmsSearchService, 'AiEmbeddingProviderService', 'DMS search service must use the common AI embedding provider');
assertIncludes(dmsSearchService, 'CREATE TABLE IF NOT EXISTS dms_document_embeddings', 'DMS legacy vector store must remain available until provider-ready transition is documented');
assertIncludes(dmsSearchService, 'INSERT INTO dms_document_embeddings', 'DMS legacy vector write path must remain available during common AI/RAG migration');
assertIncludes(dmsSearchService, 'FROM dms_document_embeddings', 'DMS legacy vector read path must remain available during common AI/RAG migration');

const dmsAskModule = readText('apps/server/src/modules/dms/ask/ask.module.ts');
assertIncludes(dmsAskModule, 'CommonAiIndexModule', 'DMS Ask module must import CommonAiIndexModule');

const dmsAskService = readText('apps/server/src/modules/dms/ask/ask.service.ts');
assertIncludes(dmsAskService, 'AiRetrievalService', 'DMS Ask service must use common AI retrieval');
assertIncludes(dmsAskService, 'AiConversationService', 'DMS Ask service must use common conversation/run audit');
assertIncludes(dmsAskService, 'AiModelGatewayService', 'DMS Ask service must use common model gateway');
assertIncludes(dmsAskService, "sourceApp: 'dms'", 'DMS Ask common retrieval must be scoped to DMS source app');
assertIncludes(dmsAskService, "entityTypes: ['document']", 'DMS Ask common retrieval must request document projections');
assertIncludes(dmsAskService, 'retrievalLogId', 'DMS Ask must connect retrieval logs to run audit');
assertIncludes(dmsAskService, 'contextItems', 'DMS Ask must consume common retrieval context items');
assertIncludes(dmsAskService, 'modelStatus.providerCode', 'DMS Ask run audit must record gateway provider metadata');
assertIncludes(dmsAskService, 'deploymentName: modelStatus.deploymentName', 'DMS Ask run audit must record gateway deployment metadata');
assertIncludes(dmsAskService, 'safeStartAskAudit', 'DMS Ask must start common conversation/run audit');
assertIncludes(dmsAskService, 'safeCompleteAskAuditSuccess', 'DMS Ask must complete successful runs');
assertIncludes(dmsAskService, 'safeCompleteAskAuditFailure', 'DMS Ask must complete failed runs');
assertIncludes(dmsAskService, 'loadLegacySearchContext', 'DMS Ask must preserve legacy DMS search fallback during migration');
assertNotIncludes(dmsAskService, 'getChatModel', 'DMS Ask must not call the DMS chat model provider directly');
assertNotIncludes(dmsAskService, 'generateText, streamText', 'DMS Ask must not import AI SDK generation primitives directly');

const roadmap = readText('docs/common/explanation/architecture/ai-rag-platform-roadmap.md');
assertIncludes(roadmap, 'Central Common Foundation View', 'AI/RAG roadmap must separate central foundation progress from service rollout progress');
assertIncludes(roadmap, 'central common foundation 89.26%', 'AI/RAG roadmap must record central foundation progress separately');
assertIncludes(roadmap, 'service rollout backlog', 'AI/RAG roadmap must not conflate central foundation with service rollout backlog');
assertIncludes(roadmap, 'AI-RAG-06. Retrieval Service', 'AI/RAG roadmap must keep retrieval phase');
assertIncludes(roadmap, 'AI-RAG-07. Conversation and Run Service', 'AI/RAG roadmap must keep conversation/run phase');
assertIncludes(roadmap, 'AI-RAG-07B', 'AI/RAG roadmap must track DMS Ask migration status');
assertIncludes(roadmap, 'AI-RAG-07C', 'AI/RAG roadmap must track model gateway integration status');
assertIncludes(roadmap, 'do not adopt LangChain or LangGraph', 'AI/RAG roadmap must keep the LangChain/LangGraph non-adoption decision');
assertIncludes(roadmap, 'docs/common/guides/ai-rag-runtime-runbook.md', 'AI/RAG roadmap must point to the runtime smoke runbook');
assertIncludes(roadmap, 'DB_INIT_PRISMA_PUSH_MODE=auto', 'AI/RAG roadmap must document the non-destructive legacy DB init mode');
assertIncludes(roadmap, 'AI_RAG_PROVIDER_READY_EVIDENCE:START', 'AI/RAG roadmap must contain a provider-ready evidence recording block');
assertIncludes(roadmap, 'Provider-ready evidence status:', 'AI/RAG roadmap must expose provider-ready evidence status');

const handoff = readText('docs/common/explanation/architecture/ai-rag-platform-handoff.md');
assertIncludes(handoff, 'AI_RAG_PROVIDER_READY_EVIDENCE:START', 'AI/RAG handoff must contain a provider-ready evidence recording block');
assertIncludes(handoff, 'Provider-ready evidence status:', 'AI/RAG handoff must expose provider-ready evidence status');

const pmsRoadmap = readText('docs/pms/planning/roadmap.md');
const pmsBacklog = readText('docs/pms/planning/backlog.md');
const pmsCloseBrief = readText('docs/pms/planning/current-baseline-close-brief.md');
for (const [content, label] of [
  [pmsRoadmap, 'PMS roadmap'],
  [pmsBacklog, 'PMS backlog'],
  [pmsCloseBrief, 'PMS current baseline close brief'],
]) {
  assertIncludes(content, 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START', `${label} must contain a PMS provider-ready evidence recording block`);
  assertIncludes(content, 'Provider-ready evidence status:', `${label} must expose PMS provider-ready evidence status`);
}

const runtimeRunbook = readText('docs/common/guides/ai-rag-runtime-runbook.md');
assertIncludes(runtimeRunbook, 'DB_INIT_PRISMA_PUSH_MODE', 'AI/RAG runtime runbook must document DB init modes');
assertIncludes(runtimeRunbook, 'DB_INIT_PRISMA_PUSH_MODE=auto', 'AI/RAG runtime runbook must document auto mode');
assertIncludes(runtimeRunbook, 'AI_RAG_SMOKE_PROVIDER_MODE=unavailable', 'AI/RAG runtime runbook must document provider-unavailable smoke');
assertIncludes(runtimeRunbook, 'AI_INDEX_WORKER_ENABLED', 'AI/RAG runtime runbook must document AI index scheduler enablement');
assertIncludes(runtimeRunbook, '/ai-index/jobs/metrics', 'AI/RAG runtime runbook must document AI index queue metrics');
assertIncludes(runtimeRunbook, '/ai-index/jobs/scheduler', 'AI/RAG runtime runbook must document AI index scheduler status');
assertIncludes(runtimeRunbook, 'verify:ai-rag-runtime:ready', 'AI/RAG runtime runbook must document provider-ready smoke');
assertIncludes(runtimeRunbook, 'verify:ai-rag-runtime:ready-precheck', 'AI/RAG runtime runbook must document provider-ready precheck script');
assertIncludes(runtimeRunbook, 'verify:ai-rag-runtime-report', 'AI/RAG runtime runbook must document structured report verification');
assertIncludes(runtimeRunbook, '--summary-path', 'AI/RAG runtime runbook must document smoke report summary generation');
assertIncludes(runtimeRunbook, 'AI_RAG_SMOKE_SUMMARY_PATH', 'AI/RAG runtime runbook must document workflow summary path');
assertIncludes(runtimeRunbook, '--check-provider-env', 'AI/RAG runtime runbook must document provider-ready env precheck');
assertIncludes(runtimeRunbook, 'AZURE_USE_MANAGED_IDENTITY=true', 'AI/RAG runtime runbook must require explicit managed identity enablement');
assertIncludes(runtimeRunbook, '.github/workflows/ai-rag-runtime.yml', 'AI/RAG runtime runbook must document the provider-ready CI/operational gate');
assertIncludes(runtimeRunbook, 'prisma db push --accept-data-loss', 'AI/RAG runtime runbook must explicitly forbid destructive Prisma db push');
assertIncludes(runtimeRunbook, 'Legacy DMS Vector Store Transition', 'AI/RAG runtime runbook must document legacy DMS vector store transition criteria');
assertIncludes(runtimeRunbook, 'dms_document_embeddings', 'AI/RAG runtime runbook must name the legacy DMS vector store');
assertIncludes(runtimeRunbook, 'loadLegacySearchContext', 'AI/RAG runtime runbook must preserve the legacy DMS Ask fallback during migration');
assertIncludes(runtimeRunbook, 'provider-ready workflow green', 'AI/RAG runtime runbook must require provider-ready workflow evidence before legacy vector transition');
assertIncludes(runtimeRunbook, 'verifyLegacyCommonRetrievalComparison', 'AI/RAG runtime runbook must document provider-ready legacy/common retrieval comparison');
assertIncludes(runtimeRunbook, 'parallel read/write -> common default -> legacy read disable -> archival/drop', 'AI/RAG runtime runbook must document staged legacy vector transition order');
assertIncludes(runtimeRunbook, 'provider_mode=unavailable', 'AI/RAG runtime runbook must document deterministic provider-unavailable workflow behavior');
assertIncludes(runtimeRunbook, 'verify:ai-rag-central-foundation:complete', 'AI/RAG runtime runbook must document central foundation completion gate');
assertIncludes(runtimeRunbook, 'record:ai-rag-provider-ready-evidence', 'AI/RAG runtime runbook must document provider-ready evidence recording');
assertIncludes(runtimeRunbook, 'complete:ai-rag-central-foundation', 'AI/RAG runtime runbook must document the central completion flow runner');
assertIncludes(runtimeRunbook, '--provider-ready-summary', 'AI/RAG runtime runbook must pass provider-ready summary into the central completion gate');

const centralFoundationVerifier = readText('scripts/verify-ai-rag-central-foundation.mjs');
assertIncludes(centralFoundationVerifier, 'validateProviderReadyReport', 'central foundation verifier must validate provider-ready report evidence');
assertIncludes(centralFoundationVerifier, 'validateProviderReadySummary', 'central foundation verifier must validate provider-ready summary evidence');
assertIncludes(centralFoundationVerifier, 'validateProviderReadyEvidenceRecord', 'central foundation verifier must validate provider-ready docs evidence record');
assertIncludes(centralFoundationVerifier, '--require-provider-ready-report', 'central foundation verifier must expose a completion mode');
assertIncludes(centralFoundationVerifier, '--provider-ready-roadmap', 'central foundation verifier must allow alternate roadmap evidence docs for self-test and automation');
assertIncludes(centralFoundationVerifier, '--provider-ready-handoff', 'central foundation verifier must allow alternate handoff evidence docs for self-test and automation');
assertIncludes(centralFoundationVerifier, 'Provider-ready report is required', 'central foundation completion verifier must fail without provider-ready evidence');
assertIncludes(centralFoundationVerifier, 'Provider-ready summary is required', 'central foundation completion verifier must fail without provider-ready summary evidence');
assertIncludes(centralFoundationVerifier, 'Report SHA256', 'central foundation completion verifier must bind docs record to report digest');
assertIncludes(centralFoundationVerifier, 'service rollout', 'central foundation verifier must preserve rollout separation wording');

const evidenceRecorder = readText('scripts/record-ai-rag-provider-ready-evidence.mjs');
assertIncludes(evidenceRecorder, 'verify-ai-rag-runtime-report.mjs', 'AI/RAG evidence recorder must verify runtime report before recording docs');
assertIncludes(evidenceRecorder, 'verify-ai-rag-central-foundation.mjs', 'AI/RAG evidence recorder must validate central report evidence before recording docs');
assertIncludes(evidenceRecorder, 'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'AI/RAG evidence recorder must support evidence block output path env');
assertIncludes(evidenceRecorder, '--evidence-block-path', 'AI/RAG evidence recorder must expose evidence block output path option');
assertIncludes(evidenceRecorder, '--roadmap', 'AI/RAG evidence recorder must expose alternate roadmap evidence doc option');
assertIncludes(evidenceRecorder, '--handoff', 'AI/RAG evidence recorder must expose alternate handoff evidence doc option');
assertIncludes(evidenceRecorder, 'assertProviderReadyFlow', 'AI/RAG evidence recorder self-test must cover the provider-ready report/summary/evidence flow');
assertIncludes(evidenceRecorder, 'verifyRecordedEvidence', 'AI/RAG evidence recorder must verify recorded docs against the central completion gate');
assertIncludes(evidenceRecorder, 'Report SHA256', 'AI/RAG evidence recorder must record report digest');
assertIncludes(evidenceRecorder, 'Summary SHA256', 'AI/RAG evidence recorder must record summary digest');
assertIncludes(evidenceRecorder, 'AI_RAG_PROVIDER_READY_EVIDENCE:START', 'AI/RAG evidence recorder must use stable docs markers');

const completionRunner = readText('scripts/complete-ai-rag-central-foundation.mjs');
assertIncludes(completionRunner, 'verify:ai-rag-runtime:ready-precheck', 'AI/RAG completion runner must start with provider-ready precheck');
assertIncludes(completionRunner, 'verify:ai-rag-runtime:ready', 'AI/RAG completion runner must run provider-ready runtime smoke by default');
assertIncludes(completionRunner, 'verify:ai-rag-runtime-report', 'AI/RAG completion runner must verify provider-ready runtime report');
assertIncludes(completionRunner, 'record:ai-rag-provider-ready-evidence', 'AI/RAG completion runner must record provider-ready evidence');
assertIncludes(completionRunner, 'verify:ai-rag-central-foundation:complete', 'AI/RAG completion runner must finish with the central completion gate');
assertIncludes(completionRunner, 'AI_RAG_PROVIDER_READY_REPORT_PATH', 'AI/RAG completion runner must support provider-ready report path env');
assertIncludes(completionRunner, 'AI_RAG_PROVIDER_READY_SUMMARY_PATH', 'AI/RAG completion runner must support provider-ready summary path env');
assertIncludes(completionRunner, 'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'AI/RAG completion runner must support evidence block path env');
assertIncludes(completionRunner, 'AI_RAG_PROVIDER_READY_ENV_FILE', 'AI/RAG completion runner must support provider-ready env file path env');
assertIncludes(completionRunner, '--env-file', 'AI/RAG completion runner must support explicit provider-ready env files');
assertIncludes(completionRunner, 'loadProviderReadyEnv', 'AI/RAG completion runner must load provider-ready env files');
assertIncludes(completionRunner, 'parseEnvFileText', 'AI/RAG completion runner must parse provider-ready env files without adding a dependency');
assertIncludes(completionRunner, '--use-existing-artifacts', 'AI/RAG completion runner must support verified artifact-only completion');
assertIncludes(completionRunner, '--dry-run', 'AI/RAG completion runner must support workflow evidence dry-run mode');
assertIncludes(completionRunner, 'central foundation report evidence check', 'AI/RAG completion runner must avoid claiming completion in dry-run mode');
assertIncludes(completionRunner, '--docker-runtime', 'AI/RAG completion runner must support managed Docker runtime mode');
assertIncludes(completionRunner, "buildDockerComposeArgs(options, ['up', '-d', '--build', 'server'])", 'AI/RAG completion runner must be able to start the Docker server runtime');
assertIncludes(completionRunner, "'--env-file'", 'AI/RAG completion runner must pass provider-ready env files to Docker Compose interpolation');
assertIncludes(completionRunner, "step.label === 'provider-ready runtime smoke'", 'AI/RAG completion runner must start Docker after provider precheck and before live smoke');
assertIncludes(completionRunner, 'waitForRuntimeHealth', 'AI/RAG completion runner must wait for the runtime health endpoint before live smoke');
assertIncludes(completionRunner, "buildDockerComposeArgs(options, ['down', '--remove-orphans'])", 'AI/RAG completion runner must expose non-volume cleanup for managed Docker runtime mode');
assertIncludes(completionRunner, '--self-test', 'AI/RAG completion runner must expose a self-test mode');

const runtimeWorkflow = readText('.github/workflows/ai-rag-runtime.yml');
assertIncludes(runtimeWorkflow, 'workflow_dispatch', 'AI/RAG runtime workflow must be manually dispatchable');
assertIncludes(runtimeWorkflow, 'provider_mode', 'AI/RAG runtime workflow must expose provider mode input');
assertIncludes(runtimeWorkflow, 'AI_RAG_WORKFLOW_PROVIDER_MODE', 'AI/RAG runtime workflow must bind provider mode into the runtime env writer');
assertIncludes(runtimeWorkflow, 'if [[ "${AI_RAG_WORKFLOW_PROVIDER_MODE}" == "ready" ]]; then', 'AI/RAG runtime workflow must write Azure env only in provider-ready mode');
assertIncludes(runtimeWorkflow, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-deployment>', 'AI/RAG runtime workflow must force placeholder deployment for provider-unavailable mode');
assertIncludes(runtimeWorkflow, 'Run provider-ready completion flow', 'AI/RAG runtime workflow must route provider-ready proof through the central completion runner');
assertIncludes(runtimeWorkflow, 'pnpm run complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run', 'AI/RAG runtime workflow must run provider-ready precheck, Docker runtime, live smoke, report verification, and evidence dry-run through the completion runner');
assertIncludes(runtimeWorkflow, 'pnpm run verify:ai-rag-runtime:unavailable', 'AI/RAG runtime workflow must still support provider-unavailable smoke');
assertIncludes(runtimeWorkflow, 'AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}', 'AI/RAG runtime workflow must source Azure endpoint from secrets');
assertIncludes(runtimeWorkflow, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${{ secrets.AZURE_OPENAI_EMBEDDING_DEPLOYMENT }}', 'AI/RAG runtime workflow must source Azure embedding deployment from secrets');
assertIncludes(runtimeWorkflow, 'AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}', 'AI/RAG runtime workflow must source Azure API key from secrets');
assertIncludes(runtimeWorkflow, 'AZURE_USE_MANAGED_IDENTITY: ${{ vars.AZURE_USE_MANAGED_IDENTITY }}', 'AI/RAG runtime workflow must require explicit managed identity configuration');
assertIncludes(runtimeWorkflow, 'AZURE_USE_MANAGED_IDENTITY=false', 'AI/RAG runtime workflow must disable managed identity in provider-unavailable mode');
assertIncludes(runtimeWorkflow, 'docker compose -f compose.yaml -f compose.local.yaml up -d --build server', 'AI/RAG runtime workflow must start the Docker server stack through the explicit local overlay');
assertIncludes(runtimeWorkflow, 'AI_RAG_SMOKE_BASE_URL: http://127.0.0.1:4000/api', 'AI/RAG runtime workflow must smoke the live local server');
assertIncludes(runtimeWorkflow, 'AI_RAG_SMOKE_REPORT_PATH: output/ai-rag-runtime-smoke-${{ inputs.provider_mode }}.json', 'AI/RAG runtime workflow must write a provider-mode smoke report');
assertIncludes(runtimeWorkflow, 'AI_RAG_SMOKE_SUMMARY_PATH: output/ai-rag-runtime-smoke-${{ inputs.provider_mode }}.md', 'AI/RAG runtime workflow must write a provider-mode Markdown smoke summary');
assertIncludes(runtimeWorkflow, 'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH: output/ai-rag-provider-ready-evidence-${{ inputs.provider_mode }}.md', 'AI/RAG runtime workflow must define provider-ready evidence block output path');
assertIncludes(runtimeWorkflow, 'pnpm run verify:ai-rag-runtime-report -- --provider-mode=${{ inputs.provider_mode }} --path="${AI_RAG_SMOKE_REPORT_PATH}" --summary-path="${AI_RAG_SMOKE_SUMMARY_PATH}"', 'AI/RAG runtime workflow must verify the smoke report and write a summary before artifact upload');
assertNotIncludes(runtimeWorkflow, 'pnpm run complete:ai-rag-central-foundation -- --use-existing-artifacts --dry-run', 'AI/RAG runtime workflow must not use artifact-only completion for the live provider-ready run');
assertIncludes(runtimeWorkflow, 'actions/upload-artifact@v4', 'AI/RAG runtime workflow must upload the runtime smoke report artifact');
assertIncludes(runtimeWorkflow, 'output/ai-rag-runtime-smoke-*.json', 'AI/RAG runtime workflow must upload AI/RAG smoke JSON reports');
assertIncludes(runtimeWorkflow, 'output/ai-rag-runtime-smoke-*.md', 'AI/RAG runtime workflow must upload AI/RAG smoke Markdown summaries');
assertIncludes(runtimeWorkflow, 'output/ai-rag-provider-ready-evidence-*.md', 'AI/RAG runtime workflow must upload provider-ready evidence block artifacts');

const compose = readText('compose.yaml');
assertIncludes(compose, 'AZURE_OPENAI_ENDPOINT: ${AZURE_OPENAI_ENDPOINT:-}', 'compose server runtime must accept Azure OpenAI endpoint interpolation');
assertIncludes(compose, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${AZURE_OPENAI_EMBEDDING_DEPLOYMENT:-}', 'compose server runtime must accept Azure embedding deployment interpolation');
assertIncludes(compose, 'AZURE_OPENAI_API_KEY: ${AZURE_OPENAI_API_KEY:-}', 'compose server runtime must accept Azure API key interpolation');
assertIncludes(compose, 'AZURE_USE_MANAGED_IDENTITY: ${AZURE_USE_MANAGED_IDENTITY:-false}', 'compose server runtime must accept explicit managed identity mode interpolation');
assertIncludes(compose, 'AZURE_MANAGED_IDENTITY_CLIENT_ID: ${AZURE_MANAGED_IDENTITY_CLIENT_ID:-}', 'compose server runtime must accept managed identity client id interpolation');

const runtimeSmoke = readText('scripts/verify-ai-rag-runtime-smoke.mjs');
assertIncludes(runtimeSmoke, 'runtime-smoke-${new Date().toISOString()', 'runtime smoke must use unique DMS fixture paths by default');
assertIncludes(runtimeSmoke, '/ai-index/status?sourceApp=dms', 'runtime smoke must verify DMS source status');
assertIncludes(runtimeSmoke, '/dms/content', 'runtime smoke must prepare a DMS document fixture');
assertIncludes(runtimeSmoke, '/ai-index/jobs/run?limit=10', 'runtime smoke must execute pending common AI index jobs');
assertIncludes(runtimeSmoke, '/ai-index/retrieval/query', 'runtime smoke must exercise common retrieval');
assertIncludes(runtimeSmoke, '/dms/ask', 'runtime smoke must exercise DMS Ask audit path');
assertIncludes(runtimeSmoke, 'common.cm_ai_embedding_m', 'runtime smoke must inspect common embedding rows');
assertIncludes(runtimeSmoke, 'conversation.source_app_code = \'dms\'', 'runtime smoke must validate DMS run audit through conversation source');
assertIncludes(runtimeSmoke, 'verifyRetrievalAuditRows', 'runtime smoke must verify retrieval log header/item audit rows in all provider modes');
assertIncludes(runtimeSmoke, 'common.cm_ai_retrieval_log_item_m', 'runtime smoke must inspect retrieval log item audit rows');
assertIncludes(runtimeSmoke, 'verifyAskAuditRows', 'runtime smoke must verify DMS Ask run audit rows after provider-mode checks');
assertIncludes(runtimeSmoke, 'common.cm_ai_run_source_r', 'runtime smoke must inspect DMS Ask run-source audit rows');
assertIncludes(runtimeSmoke, 'included_in_prompt', 'runtime smoke must require prompt-included run-source rows in provider-ready mode');
assertIncludes(runtimeSmoke, 'verifyLegacyCommonRetrievalComparison', 'runtime smoke must compare legacy DMS vector rows with common retrieval in provider-ready mode');
assertIncludes(runtimeSmoke, 'dms_document_embeddings', 'runtime smoke must inspect the legacy DMS vector store during provider-ready comparison');
assertIncludes(runtimeSmoke, 'legacy/common retrieval comparison', 'runtime smoke must report legacy/common retrieval comparison evidence');
assertIncludes(runtimeSmoke, 'getCommonRetrievalDocumentMatches', 'runtime smoke must match common retrieval results back to the DMS smoke document');
assertIncludes(runtimeSmoke, 'AI_RAG_SMOKE_REPORT_PATH', 'runtime smoke must support writing a structured report file');
assertIncludes(runtimeSmoke, 'writeSmokeReport', 'runtime smoke must write a structured report after successful verification');
assertIncludes(runtimeSmoke, 'assertPlannedSourceCoverage', 'runtime smoke must validate planned source coverage');
assertIncludes(runtimeSmoke, 'sourceCoverage', 'runtime smoke report must include planned source coverage evidence');
assertIncludes(runtimeSmoke, "REGISTERED_SOURCE_APPS = ['crm', 'dms', 'pms', 'sns']", 'runtime smoke must preserve registered source list');
assertIncludes(runtimeSmoke, "MISSING_ADAPTER_SOURCE_APPS = ['admin']", 'runtime smoke must preserve planned missing adapter source list');
assertIncludes(runtimeSmoke, 'legacyCommonComparison', 'runtime smoke report must include legacy/common comparison evidence');
assertIncludes(runtimeSmoke, 'AI_RAG_SMOKE_PROVIDER_MODE', 'runtime smoke must support provider mode expectations');
assertIncludes(runtimeSmoke, 'AI_RAG_SMOKE_CHECK_PROVIDER_ENV', 'runtime smoke must support provider-ready environment prechecks');
assertIncludes(runtimeSmoke, 'providerEnvReady', 'runtime smoke dry-run must report provider environment readiness');
assertIncludes(runtimeSmoke, 'getProviderEnvStatus', 'runtime smoke must inspect provider-ready environment inputs before live calls');
assertIncludes(runtimeSmoke, 'readOptionalBooleanEnv(\'AZURE_USE_MANAGED_IDENTITY\')', 'runtime smoke must parse managed identity enablement explicitly');
assertIncludes(runtimeSmoke, 'explicit AZURE_USE_MANAGED_IDENTITY=true', 'runtime smoke must not accept implicit managed identity credentials');

const runtimeReportVerifier = readText('scripts/verify-ai-rag-runtime-report.mjs');
assertIncludes(runtimeReportVerifier, 'validateReport', 'runtime report verifier must validate structured smoke reports');
assertIncludes(runtimeReportVerifier, 'AI_RAG_SMOKE_REPORT_PATH', 'runtime report verifier must support the smoke report path env');
assertIncludes(runtimeReportVerifier, 'AI_RAG_SMOKE_SUMMARY_PATH', 'runtime report verifier must support the smoke summary path env');
assertIncludes(runtimeReportVerifier, '--self-test', 'runtime report verifier must expose a self-test mode');
assertIncludes(runtimeReportVerifier, '--summary-path', 'runtime report verifier must expose a summary artifact option');
assertIncludes(runtimeReportVerifier, 'formatReportSummary', 'runtime report verifier must format a Markdown evidence summary');
assertIncludes(runtimeReportVerifier, 'validateSourceCoverage', 'runtime report verifier must validate planned source coverage evidence');
assertIncludes(runtimeReportVerifier, 'sourceCoverage.missingAdapters', 'runtime report summary must expose planned source adapter gaps');
assertIncludes(runtimeReportVerifier, 'EXPECTED_REGISTERED_SOURCE_APPS', 'runtime report verifier must pin registered source apps');
assertIncludes(runtimeReportVerifier, 'EXPECTED_MISSING_ADAPTER_SOURCE_APPS', 'runtime report verifier must pin planned missing adapter source apps');
assertIncludes(runtimeReportVerifier, "EXPECTED_REGISTERED_SOURCE_APPS = ['crm', 'dms', 'pms', 'sns']", 'runtime report verifier must preserve registered source list');
assertIncludes(runtimeReportVerifier, "EXPECTED_MISSING_ADAPTER_SOURCE_APPS = ['admin']", 'runtime report verifier must preserve planned missing adapter source list');
assertIncludes(runtimeReportVerifier, 'schemaVersion', 'runtime report verifier must validate report schema version');
assertIncludes(runtimeReportVerifier, 'providerMode', 'runtime report verifier must validate provider mode');
assertIncludes(runtimeReportVerifier, 'promptSourceCount', 'runtime report verifier must validate Ask prompt-source audit evidence');
assertIncludes(runtimeReportVerifier, 'legacyCommonComparison', 'runtime report verifier must validate legacy/common comparison evidence');
assertIncludes(runtimeReportVerifier, 'commonQueryNeedleMatched', 'runtime report verifier must require the common retrieval query match in provider-ready mode');

console.log('✓ AI/RAG platform verification passed');
