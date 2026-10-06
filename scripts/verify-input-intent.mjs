import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

import {
  getSsooSearchInputSignatureError,
  isReservedSsooCredentialFieldSignature,
  shouldRejectSsooUnexpectedAutofill,
} from '../packages/web-shell/src/search-input-autofill.ts';

const rootDir = path.resolve(import.meta.dirname, '..');
const isSelfTest = process.argv.includes('--self-test');
const allowedSearchIntents = new Set([
  'global-search',
  'navigation-search',
  'data-filter',
  'entity-lookup',
  'in-view-search',
  'hybrid-input',
]);

const expectedSearchInventory = new Map(Object.entries({
  'packages/web-shell/src/header.tsx': 1,
  'packages/web-shell/src/sidebar.tsx': 1,
  'packages/web-shell/src/data-workspace-page.tsx': 2,
  'packages/web-shell/src/ai-search/toolbar/SearchControls.tsx': 1,
  'apps/web/admin/src/components/pages/roles/AccessManagementPage.tsx': 3,
  'apps/web/admin/src/components/pages/users/UserManagementPage.tsx': 1,
  'apps/web/crm/src/components/pages/business-plan/BusinessPlanPreviewWorkspaceClient.tsx': 1,
  'apps/web/crm/src/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceClient.tsx': 1,
  'apps/web/crm/src/components/pages/contracts/ContractPerformanceWorkspaceClient.tsx': 2,
  'apps/web/crm/src/components/pages/contracts/ContractWorkspaceClient.tsx': 3,
  'apps/web/crm/src/components/pages/contracts/ContractUpsertPanel.tsx': 1,
  'apps/web/crm/src/components/pages/cost-plan/CostPlanPreviewWorkspaceClient.tsx': 1,
  'apps/web/crm/src/components/pages/customers/CustomerWorkspaceClient.tsx': 1,
  'apps/web/crm/src/components/pages/reports/ReportsPreviewWorkspaceClient.tsx': 1,
  'apps/web/crm/src/components/pages/opportunities/OpportunityContractDocumentCard.tsx': 1,
  'apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx': 4,
  'apps/web/dms/src/components/common/assistant/reference/Picker.tsx': 1,
  'apps/web/dms/src/components/common/picker-tree/PickerTree.tsx': 1,
  'apps/web/dms/src/components/pages/markdown/_components/editor/LinkInsertDialog.tsx': 1,
  'apps/web/pms/src/components/common/datagrid/Toolbar.tsx': 1,
  'apps/web/pms/src/components/common/page/FilterBar.tsx': 1,
  'apps/web/pms/src/components/pages/admin/MasterDataPage.tsx': 1,
  'apps/web/pms/src/components/pages/project/sections/OrganizationsSection.tsx': 1,
  'apps/web/pms/src/components/pages/project/sections/RelationsSection.tsx': 1,
  'apps/web/pms/src/components/pages/project/tabs/ExecutionDetailTab.tsx': 1,
  'apps/web/pms/src/components/pages/project/tabs/HandoffsTab.tsx': 1,
  'apps/web/pms/src/components/pages/project/tabs/MembersTab.tsx': 1,
  'apps/web/sns/src/components/pages/search/SearchPage.tsx': 1,
}));

const sourceRoots = [
  'apps/web',
  'packages/web-auth/src',
  'packages/web-shell/src',
];

const credentialSourceRequirements = new Map(Object.entries({
  'packages/web-auth/src/ui.tsx': [
    'name="ssoo-login"',
    'name="username"',
    'autoComplete="username"',
    'name="password"',
    'autoComplete="current-password"',
  ],
  'packages/web-auth/src/password-reset-page.tsx': [
    'name="ssoo-password-reset-request"',
    'name="email"',
    'name="one-time-code"',
    'autoComplete="one-time-code"',
    'name="new-password"',
    'name="confirm-new-password"',
  ],
  'packages/web-auth/src/user-surface.tsx': [
    'data-ssoo-credential-region="password-change"',
    'id="account-current-password"',
    'id="account-new-password"',
    'id="account-confirm-password"',
  ],
  'apps/web/admin/src/components/pages/users/UserManagementPage.tsx': [
    'data-ssoo-credential-region="managed-user"',
    'name="managed-user-login-id"',
    'name="managed-user-new-password"',
    'name="managed-user-email"',
  ],
  'apps/web/admin/src/components/pages/auth/AuthPolicyPage.tsx': [
    'name="microsoft-client-secret"',
    'data-ssoo-input-intent="noncredential-secret"',
  ],
}));

const sharedSearchContractRequirements = new Map(Object.entries({
  'packages/web-shell/src/search-input.tsx': [
    'getSsooSearchInputSignatureError',
    'shouldRejectSsooUnexpectedAutofill',
    'type="search"',
    'role="searchbox"',
    'autoComplete="off"',
    'data-ssoo-input-intent={intent}',
    'data-form-type="other"',
    'data-1p-ignore="true"',
    'data-lpignore="true"',
    'data-bwignore="true"',
    'ssoo:unexpected-autofill-rejected',
  ],
  'packages/web-shell/src/search-input-autofill.ts': [
    'candidateValue !== expectedValue',
    'nativeAutofilled',
    '!hasRecentTextEntryIntent',
    'SSOO_RESERVED_CREDENTIAL_FIELD_SIGNATURES',
  ],
}));

const inventoryCountContracts = new Map(Object.entries({
  '.github/instructions/project.instructions.md': (count) => `${count}개 입력 inventory`,
  '.codex/instructions/project.instructions.md': (count) => `${count}개 입력 inventory`,
  'docs/common/explanation/architecture/ssoo-frame-system.md': (count) => `현행 ${count}개 inventory`,
  'docs/common/explanation/architecture/search-input-autofill-integrity-ralph-plan.md': (count) => `다음 ${count}개 구현 지점`,
  'docs/CHANGELOG.md': (count) => `${count}개 header/sidebar`,
}));

const browserEvidenceRequirements = new Map(Object.entries({
  'automation/tests/e2e/input-intent-integrity.spec.ts': [
    "CSS.forcePseudoState",
    "element.matches(':autofill')",
    "element.matches(':-webkit-autofill')",
    'ssoo:unexpected-autofill-rejected',
    'ssoo-admin-navigation-search-input',
    'ssoo-crm-navigation-search-input',
    'ssoo-pms-desktop-navigation-search-input',
    'ssoo-dms-workspace-navigation-search-input',
    'ssoo-sns-navigation-search-input',
    'admin-user-filter-search-input',
    'crm-contract-search-input',
    'pms-master-data-search-input',
    'ssoo-in-view-search-input',
    'sns-expert-search-input',
    "navigation: 'dms-home-search'",
    'const credentialProbeValues',
    "'A0122024330'",
    "'user.name'",
    "'user.name@example.com'",
    'credentialCandidate: string',
    'fixed five-app shell',
    'width: 390, height: 844',
    'monitorBrowserFailures',
  ],
  'package.json': [
    '"test:e2e:input-intent"',
    'SSOO_INPUT_INTENT_E2E=1',
  ],
}));

const forbiddenScopeAndValueCoupling = new Map(Object.entries({
  'automation/tests/e2e/input-intent-integrity.spec.ts': [
    'SSOO_INPUT_INTENT_APPS',
    'requestedApps',
    'selectedApps',
    'allAppSurfaces',
    'allDomainInputSurfaces',
    'if (crmUrl)',
  ],
  'package.json': [
    'test:e2e:input-intent:non-crm',
    'SSOO_INPUT_INTENT_APPS=',
  ],
  'packages/web-shell/src/search-input-autofill.ts': [
    "'admin'",
    '"admin"',
  ],
  'packages/web-shell/src/search-input.tsx': [
    "'admin'",
    '"admin"',
  ],
}));

function toRelativePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function collectTsxFiles(directory) {
  const absoluteDirectory = path.join(rootDir, directory);
  if (!fs.existsSync(absoluteDirectory)) return [];

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') return [];
      return collectTsxFiles(toRelativePath(absolutePath));
    }
    if (!entry.isFile() || !entry.name.endsWith('.tsx') || entry.name.endsWith('.stories.tsx')) return [];
    return [absolutePath];
  });
}

function getTagName(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  return tagName.getText();
}

function getAttributes(openingElement) {
  return new Map(openingElement.attributes.properties.flatMap((property) => (
    ts.isJsxAttribute(property) ? [[property.name.text, property]] : []
  )));
}

function getStringAttribute(attribute) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression
    && ts.isStringLiteral(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isRawSearchLike(openingElement, sourceFile) {
  const source = openingElement.getText(sourceFile);
  return (
    /\btype\s*=\s*["'{]search\b/i.test(source)
    || /(?:placeholder|aria-label|ariaLabel|name|id)\s*=\s*(?:["'{][\s\S]*?)(?:검색|search|query|filter|lookup|찾기)/i.test(source)
    || /(?:value|defaultValue|onChange)\s*=\s*\{[\s\S]*?\b(?:search|query|filter|lookup)(?:Text|Value|Input|Term|Keyword|Field|Query|Search)?\b/i.test(source)
  );
}

function validateSource(relativePath, sourceText) {
  const errors = [];
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let searchInputCount = 0;

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = getTagName(node.tagName);
      const attributes = getAttributes(node);

      if (tagName === 'SsooSearchInput') {
        searchInputCount += 1;
        for (const requiredAttribute of ['id', 'name', 'ariaLabel', 'intent']) {
          if (!attributes.has(requiredAttribute)) {
            errors.push(`${relativePath}:${lineOf(sourceFile, node)} SsooSearchInput requires ${requiredAttribute}`);
          }
        }

        const intent = getStringAttribute(attributes.get('intent'));
        if (!intent || !allowedSearchIntents.has(intent)) {
          errors.push(`${relativePath}:${lineOf(sourceFile, node)} has invalid or dynamic search intent`);
        }

        for (const signatureAttribute of ['id', 'name']) {
          const signature = getStringAttribute(attributes.get(signatureAttribute));
          if (signature !== null && signature.trim().length === 0) {
            errors.push(`${relativePath}:${lineOf(sourceFile, node)} has an empty search ${signatureAttribute}`);
          }
          if (signature !== null && isReservedSsooCredentialFieldSignature(signature)) {
            errors.push(`${relativePath}:${lineOf(sourceFile, node)} search ${signatureAttribute} collides with credential signature: ${signature}`);
          }
        }

        const ariaLabel = getStringAttribute(attributes.get('ariaLabel'));
        if (ariaLabel !== null && ariaLabel.trim().length === 0) {
          errors.push(`${relativePath}:${lineOf(sourceFile, node)} has an empty search ariaLabel`);
        }
      }

      if (
        (tagName === 'Input' || tagName === 'input')
        && relativePath !== 'packages/web-shell/src/search-input.tsx'
        && isRawSearchLike(node, sourceFile)
      ) {
        errors.push(`${relativePath}:${lineOf(sourceFile, node)} raw search-like ${tagName} must use SsooSearchInput`);
      }

      const type = getStringAttribute(attributes.get('type'));
      if (type === 'password') {
        for (const requiredAttribute of ['id', 'name', 'autoComplete', 'data-ssoo-input-intent']) {
          if (!attributes.has(requiredAttribute)) {
            errors.push(`${relativePath}:${lineOf(sourceFile, node)} password input requires ${requiredAttribute}`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { errors, searchInputCount };
}

function assertDecision(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function getInventoryCountContractError(relativePath, sourceText, count, getExpectedMarker) {
  const expectedMarker = getExpectedMarker(count);
  return sourceText.includes(expectedMarker)
    ? null
    : `${relativePath} missing inventory count contract: ${expectedMarker}`;
}

function getForbiddenContractErrors(relativePath, sourceText, forbiddenFragments) {
  return forbiddenFragments
    .filter((fragment) => sourceText.includes(fragment))
    .map((fragment) => `${relativePath} contains forbidden selectable-scope or value-coupled contract: ${fragment}`);
}

function runDecisionSelfTest() {
  const credentialCandidates = [
    'admin',
    'A0122024330',
    'user.name',
    'user.name@example.com',
    '홍길동',
  ];
  for (const candidateValue of credentialCandidates) {
    assertDecision(shouldRejectSsooUnexpectedAutofill({
      expectedValue: '', candidateValue, nativeAutofilled: true, hasRecentTextEntryIntent: false,
    }), true, `unexpected native autofill: ${candidateValue}`);
    assertDecision(shouldRejectSsooUnexpectedAutofill({
      expectedValue: candidateValue, candidateValue, nativeAutofilled: true, hasRecentTextEntryIntent: false,
    }), false, `intentional initial value: ${candidateValue}`);
    assertDecision(shouldRejectSsooUnexpectedAutofill({
      expectedValue: '', candidateValue, nativeAutofilled: false, hasRecentTextEntryIntent: false,
    }), false, `ordinary programmatic or test input: ${candidateValue}`);
    assertDecision(shouldRejectSsooUnexpectedAutofill({
      expectedValue: '', candidateValue, nativeAutofilled: true, hasRecentTextEntryIntent: true,
    }), false, `intentional user text entry: ${candidateValue}`);
  }
  assertDecision(shouldRejectSsooUnexpectedAutofill({
    expectedValue: '', candidateValue: '', nativeAutofilled: true, hasRecentTextEntryIntent: false,
  }), false, 'empty candidate');

  const validSignatureError = getSsooSearchInputSignatureError({
    id: 'fixture-search-input',
    name: 'fixture-search-query',
    ariaLabel: '검색',
  });
  if (validSignatureError !== null) {
    throw new Error(`valid search signature failed: ${validSignatureError}`);
  }

  const emptySignatureError = getSsooSearchInputSignatureError({
    id: '',
    name: 'fixture-search-query',
    ariaLabel: '검색',
  });
  if (!emptySignatureError?.includes('id must not be empty')) {
    throw new Error('runtime empty search signature fixture was not rejected');
  }

  const reservedSignatureError = getSsooSearchInputSignatureError({
    id: 'fixture-search-input',
    name: 'username',
    ariaLabel: '검색',
  });
  if (!reservedSignatureError?.includes('reserved credential signature')) {
    throw new Error('runtime credential-colliding search signature fixture was not rejected');
  }
}

function runVerifierSelfTest() {
  runDecisionSelfTest();
  const rawResult = validateSource('self-test/raw.tsx', '<Input placeholder="사용자 검색" value={query} />');
  if (rawResult.errors.length !== 1) throw new Error('raw search input negative fixture was not rejected');

  const missingResult = validateSource(
    'self-test/missing.tsx',
    '<SsooSearchInput id="fixture" ariaLabel="검색" intent="data-filter" />',
  );
  if (!missingResult.errors.some((error) => error.includes('requires name'))) {
    throw new Error('missing search name negative fixture was not rejected');
  }

  const validResult = validateSource(
    'self-test/valid.tsx',
    '<SsooSearchInput id="fixture" name="fixture-query" ariaLabel="검색" intent="data-filter" />',
  );
  if (validResult.errors.length > 0) throw new Error(`valid fixture failed: ${validResult.errors.join(', ')}`);

  const credentialCollisionResult = validateSource(
    'self-test/credential-collision.tsx',
    '<SsooSearchInput id="fixture" name="username" ariaLabel="검색" intent="data-filter" />',
  );
  if (!credentialCollisionResult.errors.some((error) => error.includes('collides with credential signature'))) {
    throw new Error('credential-colliding search signature negative fixture was not rejected');
  }

  const emptySignatureResult = validateSource(
    'self-test/empty-signature.tsx',
    '<SsooSearchInput id=" " name="fixture-query" ariaLabel=" " intent="data-filter" />',
  );
  if (
    !emptySignatureResult.errors.some((error) => error.includes('empty search id'))
    || !emptySignatureResult.errors.some((error) => error.includes('empty search ariaLabel'))
  ) {
    throw new Error('empty search signature negative fixture was not rejected');
  }

  const matchingCountError = getInventoryCountContractError(
    'self-test/docs.md',
    '현행 7개 inventory',
    7,
    (count) => `현행 ${count}개 inventory`,
  );
  if (matchingCountError) throw new Error(`matching inventory count fixture failed: ${matchingCountError}`);

  const staleCountError = getInventoryCountContractError(
    'self-test/docs.md',
    '현행 6개 inventory',
    7,
    (count) => `현행 ${count}개 inventory`,
  );
  if (!staleCountError?.includes('현행 7개 inventory')) {
    throw new Error('stale inventory count negative fixture was not rejected');
  }

  const forbiddenScopeErrors = getForbiddenContractErrors(
    'self-test/e2e.ts',
    'const selectedApps = new Set();',
    ['selectedApps'],
  );
  if (forbiddenScopeErrors.length !== 1) {
    throw new Error('selectable app scope negative fixture was not rejected');
  }
  console.log('[verify-input-intent] self-test passed');
}

function runRepositoryVerification() {
  runDecisionSelfTest();
  const files = sourceRoots.flatMap(collectTsxFiles);
  const errors = [];
  const actualInventory = new Map();

  for (const filePath of files) {
    const relativePath = toRelativePath(filePath);
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const result = validateSource(relativePath, sourceText);
    errors.push(...result.errors);
    if (result.searchInputCount > 0) actualInventory.set(relativePath, result.searchInputCount);
  }

  for (const [relativePath, expectedCount] of expectedSearchInventory) {
    const actualCount = actualInventory.get(relativePath) ?? 0;
    if (actualCount !== expectedCount) {
      errors.push(`${relativePath} search inventory expected ${expectedCount}, received ${actualCount}`);
    }
  }
  for (const [relativePath, actualCount] of actualInventory) {
    if (!expectedSearchInventory.has(relativePath)) {
      errors.push(`${relativePath} contains ${actualCount} unregistered SsooSearchInput instance(s)`);
    }
  }

  const expectedTotal = [...expectedSearchInventory.values()].reduce((sum, count) => sum + count, 0);
  const actualTotal = [...actualInventory.values()].reduce((sum, count) => sum + count, 0);
  if (actualTotal !== expectedTotal) {
    errors.push(`search inventory total expected ${expectedTotal}, received ${actualTotal}`);
  }

  for (const [relativePath, getExpectedMarker] of inventoryCountContracts) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const contractError = getInventoryCountContractError(
      relativePath,
      source,
      expectedTotal,
      getExpectedMarker,
    );
    if (contractError) errors.push(contractError);
  }

  for (const [relativePath, requirements] of credentialSourceRequirements) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    for (const requirement of requirements) {
      if (!source.includes(requirement)) errors.push(`${relativePath} missing credential contract: ${requirement}`);
    }
  }

  for (const [relativePath, requirements] of sharedSearchContractRequirements) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    for (const requirement of requirements) {
      if (!source.includes(requirement)) errors.push(`${relativePath} missing shared search contract: ${requirement}`);
    }
  }

  for (const [relativePath, requirements] of browserEvidenceRequirements) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    for (const requirement of requirements) {
      if (!source.includes(requirement)) errors.push(`${relativePath} missing browser evidence contract: ${requirement}`);
    }
  }


  for (const [relativePath, forbiddenFragments] of forbiddenScopeAndValueCoupling) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    errors.push(...getForbiddenContractErrors(relativePath, source, forbiddenFragments));
  }

  const primitiveSource = fs.readFileSync(path.join(rootDir, 'packages/web-ui/src/input.tsx'), 'utf8');
  if (primitiveSource.includes('data-ssoo-input-intent') || primitiveSource.includes('autoComplete=')) {
    errors.push('packages/web-ui/src/input.tsx must remain a purpose-neutral primitive');
  }

  if (errors.length > 0) {
    console.error('[verify-input-intent] failed');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`[verify-input-intent] passed (${actualTotal} registered search inputs, ${credentialSourceRequirements.size} credential surfaces, ${sharedSearchContractRequirements.size} shared contract sources, ${browserEvidenceRequirements.size} browser evidence surfaces)`);
}

if (isSelfTest) runVerifierSelfTest();
else runRepositoryVerification();
