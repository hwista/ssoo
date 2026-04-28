#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path, { resolve } from 'node:path';

const requireFromDatabasePackage = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { PrismaClient } = requireFromDatabasePackage('@prisma/client');

process.env.DATABASE_URL ??= 'postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public';

const HARNESS_RUN_ID = process.env.HERMES_HARNESS_RUN_ID;
const HARNESS_REPO_ROOT = process.env.HERMES_HARNESS_REPO_ROOT || process.cwd();
const STAGE_HELPER = resolve(HARNESS_REPO_ROOT, '.hermes/scripts/harness-stage-event');
let currentRole = null;

const ROLE_PROFILES = {
  planner: { provider: 'github-copilot', model: 'claude-sonnet-4.6' },
  critic: { provider: 'openai-codex', model: 'gpt-5.4' },
  builder: { provider: 'github-copilot', model: 'gpt-5.4' },
  reviewer: { provider: 'github-copilot', model: 'claude-sonnet-4.6' },
};

function emitStage(action, role, extra = {}) {
  if (!HARNESS_RUN_ID) {
    return;
  }

  const args = [action, '--run-id', HARNESS_RUN_ID, '--role', role];
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    args.push(`--${key.replaceAll('_', '-')}`, String(value));
  }

  spawnSync(STAGE_HELPER, args, { stdio: 'ignore' });
}

function startRole(role, extra = {}) {
  currentRole = role;
  emitStage('start', role, { ...ROLE_PROFILES[role], ...extra });
}

function completeRole(role, extra = {}) {
  emitStage('complete', role, { ...ROLE_PROFILES[role], status: 'succeeded', ...extra });
}

function handoffRole(fromRole, toRole, extra = {}) {
  completeRole(fromRole, { handoff_to: `${toRole}-01`, ...extra });
  startRole(toRole);
}

function failCurrentRole(error, reason) {
  const activeRole = currentRole || 'reviewer';
  emitStage('fallback', activeRole, {
    ...ROLE_PROFILES[activeRole],
    status: 'failed',
    fallback_reason: reason,
    notes: error instanceof Error ? error.message : String(error),
  });
}

const argv = process.argv.slice(2);

const DMS_FEATURE_PERMISSION_CODES = {
  canReadDocuments: 'dms.document.read',
  canWriteDocuments: 'dms.document.write',
  canManageTemplates: 'dms.template.manage',
  canUseAssistant: 'dms.assistant.use',
  canUseSearch: 'dms.search.use',
  canManageSettings: 'dms.settings.manage',
  canManageStorage: 'dms.storage.manage',
  canUseGit: 'dms.git.use',
};

const FULL_POLICY_TRACE_KEYS = [
  'grantedPermissionCodes',
  'rolePermissionCodes',
  'organizationPermissionCodes',
  'userGrantedPermissionCodes',
  'userRevokedPermissionCodes',
  'domainGrantedPermissionCodes',
  'objectGrantedPermissionCodes',
  'objectRevokedPermissionCodes',
];

const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X6n4AAAAASUVORK5CYII=';

const options = {
  dryRun: argv.includes('--dry-run'),
  help: argv.includes('--help'),
  baseUrl: readOption('base-url', 'ACCESS_VERIFY_BASE_URL', 'http://localhost:4000/api'),
  adminLoginId: readOption('admin-login-id', 'ACCESS_VERIFY_ADMIN_LOGIN_ID', 'admin'),
  adminPassword: readOption('admin-password', 'ACCESS_VERIFY_ADMIN_PASSWORD', 'admin123!'),
  runtimeLoginId: readOption('runtime-login-id', 'ACCESS_VERIFY_RUNTIME_LOGIN_ID', 'viewer.han'),
  runtimePassword: readOption('runtime-password', 'ACCESS_VERIFY_RUNTIME_PASSWORD', 'user123!'),
  fixtureDir: readOption('fixture-dir', 'ACCESS_VERIFY_DMS_FIXTURE_DIR', 'verify-access'),
};

const DMS_APP_ROOT = resolve(HARNESS_REPO_ROOT, 'apps/web/dms');
const DMS_RUNTIME_BINDINGS = resolveDmsRuntimeBindings();

if (options.help) {
  printUsage();
  process.exit(0);
}

if (options.dryRun) {
  printDryRun(options);
  process.exit(0);
}

await runObserved(options);

async function runObserved(config) {
  startRole('planner');
  try {
    await main(config);
    completeRole('reviewer');
  } catch (error) {
    failCurrentRole(error, 'dms_verification_failed');
    throw error;
  }
}

async function main(config) {
  const prisma = new PrismaClient();
  let adminAccessToken = null;
  let probe = null;
  let mainError = null;

  try {
    adminAccessToken = await login(config.baseUrl, config.adminLoginId, config.adminPassword);
    probe = await prepareProbeFixtures(
      config.baseUrl,
      adminAccessToken,
      config.fixtureDir,
      config.runtimeLoginId,
    );
    await verifyCommentRelationProjection(prisma, probe);

    const runtimeAccessToken = await login(
      config.baseUrl,
      config.runtimeLoginId,
      config.runtimePassword,
    );
    const runtimeInspection = await inspectAccess(config.baseUrl, adminAccessToken, {
      loginId: config.runtimeLoginId,
    });
    const runtimeAccessSnapshot = await verifyAccessSnapshot(
      config.baseUrl,
      runtimeAccessToken,
      runtimeInspection,
      'runtime',
    );

    handoffRole('planner', 'critic');
    await verifyRuntimeDocumentInspect(
      config.baseUrl,
      adminAccessToken,
      config.runtimeLoginId,
      probe.documentPath,
    );
    await verifyReadSurfaces(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canReadDocuments,
      probe,
    );
    assertNoSidecarFiles(DMS_RUNTIME_BINDINGS.markdownRoot.resolvedPath, 'DMS markdown runtime root');
    assertProbeSidecarAbsent(probe, 'DMS read/file/content/binary surfaces');
    await verifySearchBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canUseSearch,
      probe.searchQuery,
      probe.documentPath,
    );
    await verifyFileWriteBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canWriteDocuments,
    );
    await verifyContentWriteBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canWriteDocuments,
    );

    handoffRole('critic', 'builder');
    await verifyAssistantBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canUseAssistant,
      probe.documentPath,
      'runtime',
    );
    await verifySettingsBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canManageSettings,
      'runtime',
    );
    await verifyGitBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canUseGit,
      probe.documentPath,
      'runtime',
    );
    await verifyStorageBoundary(
      config.baseUrl,
      runtimeAccessToken,
      {
        canReadDocuments: runtimeAccessSnapshot.features.canReadDocuments,
        canManageStorage: runtimeAccessSnapshot.features.canManageStorage,
      },
      probe,
      'runtime',
    );
    await verifyTemplateBoundary(
      config.baseUrl,
      runtimeAccessToken,
      runtimeAccessSnapshot.features.canManageTemplates,
      probe.documentPath,
      'runtime',
    );

    await verifyAdminPrivilegedSurfaces(
      config.baseUrl,
      adminAccessToken,
      config.adminLoginId,
      probe,
    );
    assertNoSidecarFiles(DMS_RUNTIME_BINDINGS.templateDir, 'DMS template directory (markdownRoot/_templates)');

    handoffRole('builder', 'reviewer');
    console.log('✓ DMS access verification passed');
  } catch (error) {
    mainError = error;
    throw error;
  } finally {
    if (probe) {
      try {
        await cleanupProbeFixtures(config.baseUrl, adminAccessToken, probe);
      } catch (cleanupError) {
        if (mainError) {
          console.warn(`! cleanup failed: ${errorMessage(cleanupError)}`);
        } else {
          throw cleanupError;
        }
      }
    }
    await prisma.$disconnect();
  }
}

async function prepareProbeFixtures(baseUrl, accessToken, fixtureDir, runtimeLoginId) {
  const normalizedDir = fixtureDir.replace(/^[/\\]+|[/\\]+$/g, '');
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const documentPath = `${normalizedDir}/verify-dms-${suffix}.md`;
  const title = `DMS Access Verify ${suffix}`;
  const probe = {
    documentPath,
    title,
    searchQuery: title,
    imagePath: null,
    attachmentPath: null,
    storagePath: null,
    commentId: `comment-${suffix}`,
    sidecarPath: resolveProbeSidecarAbsolutePath(
      documentPath,
      DMS_RUNTIME_BINDINGS.markdownRoot.resolvedPath,
    ),
  };

  console.log(`→ prepare: DMS probe fixtures (${documentPath})`);

  try {
    const imageUpload = await uploadProbeFile(
      baseUrl,
      accessToken,
      '/dms/file/upload-image',
      documentPath,
      `verify-${suffix}.png`,
      'image/png',
      Buffer.from(PNG_1X1_BASE64, 'base64'),
      'DMS image upload',
    );
    probe.imagePath = imageUpload.path;

    const attachmentUpload = await uploadProbeFile(
      baseUrl,
      accessToken,
      '/dms/file/upload-attachment',
      documentPath,
      `verify-${suffix}.png`,
      'image/png',
      Buffer.from(PNG_1X1_BASE64, 'base64'),
      'DMS attachment upload',
    );
    probe.attachmentPath = attachmentUpload.path;

    const storageUpload = await uploadStorageProbe(
      baseUrl,
      accessToken,
      suffix,
    );
    probe.storagePath = storageUpload.path;

    await saveProbeDocument(baseUrl, accessToken, probe, {
      image: imageUpload,
      attachment: attachmentUpload,
      storage: storageUpload,
    }, runtimeLoginId);
    assertProbeSidecarAbsent(probe, 'DMS save surface');

    return probe;
  } catch (error) {
    await cleanupProbeFixtures(baseUrl, accessToken, probe, { suppressErrors: true });
    throw error;
  }
}

async function saveProbeDocument(baseUrl, accessToken, probe, uploads, runtimeLoginId) {
  const content = [
    `# ${probe.title}`,
    '',
    'Temporary DMS access verification fixture.',
    '',
    `![probe image](${uploads.image.path})`,
    '',
    `attachment: ${uploads.attachment.path}`,
    `storage: ${uploads.storage.path}`,
    '',
  ].join('\n');

  const metadata = {
    title: probe.title,
    summary: 'Temporary DMS access verification fixture.',
    tags: ['access-verification', 'dms'],
    sourceLinks: [],
    bodyLinks: [
      {
        url: uploads.image.path,
        label: 'probe image',
        type: 'image',
      },
    ],
    sourceFiles: [
      {
        name: uploads.storage.name,
        path: uploads.storage.path,
        storageUri: uploads.storage.storageUri,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: uploads.storage.size,
        provider: uploads.storage.provider,
        versionId: uploads.storage.versionId,
        etag: uploads.storage.etag,
        checksum: uploads.storage.checksum,
        origin: uploads.storage.origin,
        status: uploads.storage.status,
      },
    ],
    comments: [
      {
        id: probe.commentId,
        author: runtimeLoginId,
        content: 'Temporary DMS access verification comment.',
        createdAt: new Date().toISOString(),
      },
    ],
    referenceFiles: [
      {
        name: uploads.attachment.fileName,
        path: uploads.attachment.path,
        type: uploads.attachment.type ?? 'image/png',
        size: uploads.attachment.size,
        provider: 'local',
        origin: 'manual',
        status: 'published',
      },
    ],
    acl: {
      owners: [],
      editors: [],
      viewers: [],
    },
    grants: runtimeLoginId
      ? [
          {
            principalType: 'user',
            principalId: runtimeLoginId,
            role: 'read',
          },
        ]
      : [],
    visibility: {
      scope: 'self',
    },
    author: 'access-verifier',
    lastModifiedBy: 'access-verifier',
  };

  const payload = {
    path: probe.documentPath,
    content,
    metadata,
  };
  const { response, data } = await requestJson(`${baseUrl}/dms/content`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  assertStatusOneOf(response, [200, 502], 'DMS probe document save');

  if (response.status === 200) {
    assertSuccessEnvelope(data, 'DMS probe document save');

    const savedPath = data.data?.savedPath;
    if (typeof savedPath !== 'string' || savedPath !== probe.documentPath) {
      throw new Error('DMS probe document savedPath 가 요청값과 다릅니다.');
    }
    return;
  }

  const errorMessageText = data?.error?.message;
  if (
    typeof errorMessageText !== 'string'
    || !errorMessageText.includes('검색 인덱스 동기화에 실패했습니다')
  ) {
    throw new Error(`DMS probe document save 가 예상 외 502 를 반환했습니다: ${JSON.stringify(data)}`);
  }

  await fetchSuccessData(
    `${baseUrl}/dms/file?path=${encodeURIComponent(probe.documentPath)}`,
    authHeaders(accessToken),
    [200],
    'DMS probe document existence after 502',
  );
}

async function uploadProbeFile(
  baseUrl,
  accessToken,
  routePath,
  documentPath,
  fileName,
  mimeType,
  content,
  label,
) {
  const form = new FormData();
  form.set('documentPath', documentPath);
  form.set('file', new Blob([content], { type: mimeType }), fileName);

  const { response, data } = await requestJson(`${baseUrl}${routePath}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: form,
  });

  assertStatusOneOf(response, [200, 201], label);
  assertSuccessEnvelope(data, label);

  const result = data.data;
  if (!isPlainObject(result) || typeof result.path !== 'string' || !result.path) {
    throw new Error(`${label} path 를 찾지 못했습니다.`);
  }

  return result;
}

async function uploadStorageProbe(baseUrl, accessToken, suffix) {
  const { response, data } = await requestJson(`${baseUrl}/dms/storage/upload`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      provider: 'local',
      fileName: 'verify-storage-reference.pptx',
      relativePath: 'access-verification',
      content: `DMS access verification storage fixture ${suffix}`,
      origin: 'reference',
      status: 'published',
    }),
  });

  assertStatusOneOf(response, [200, 201], 'DMS storage upload');
  assertSuccessEnvelope(data, 'DMS storage upload');

  const result = data.data;
  if (
    !isPlainObject(result)
    || typeof result.path !== 'string'
    || typeof result.storageUri !== 'string'
    || typeof result.provider !== 'string'
  ) {
    throw new Error('DMS storage upload 응답이 storage reference 형식이 아닙니다.');
  }

  return result;
}

async function cleanupProbeFixtures(baseUrl, accessToken, probe, options = {}) {
  console.log(`→ cleanup: DMS probe fixtures (${probe.documentPath})`);
  const errors = [];

  for (const assetPath of [probe.imagePath, probe.attachmentPath]) {
    if (!assetPath) {
      continue;
    }

    try {
      await deleteProbeAsset(baseUrl, accessToken, assetPath);
    } catch (error) {
      errors.push(`asset ${assetPath}: ${errorMessage(error)}`);
    }
  }

  try {
    await deleteProbeDocument(baseUrl, accessToken, probe.documentPath);
  } catch (error) {
    errors.push(`document ${probe.documentPath}: ${errorMessage(error)}`);
  }

  if (errors.length > 0 && options.suppressErrors !== true) {
    throw new Error(`fixture cleanup failed: ${errors.join(' | ')}`);
  }
}

function readJsonFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function resolveDmsRuntimeBindings() {
  // DMS config JSON files have been removed — settings now live in dm_config_m (DB).
  // For verification purposes, resolve paths using env overrides or hardcoded defaults only.
  const runtimeBindings = {
    markdownRoot: resolveRuntimeBinding(
      { defaultConfig: null, userConfig: null },
      ['git', 'repositoryPath'],
      '../../../.runtime/dms/documents',
      'DMS_MARKDOWN_ROOT',
    ),
  };
  // templateRoot is derived: markdownRoot/_templates
  runtimeBindings.templateDir = path.join(runtimeBindings.markdownRoot.resolvedPath, '_templates');
  return runtimeBindings;
}

function resolveRuntimeBinding(configs, pathKeys, fallbackPath, envVar) {
  const configuredPath = [
    readConfiguredPath(configs.userConfig, pathKeys),
    readConfiguredPath(configs.defaultConfig, pathKeys),
  ]
    .find(Boolean) ?? fallbackPath;
  const envOverride = process.env[envVar]?.trim();
  const effectiveInput = envOverride && envOverride.length > 0
    ? envOverride
    : configuredPath;

  return {
    configuredPath,
    effectiveInput,
    resolvedPath: path.isAbsolute(effectiveInput)
      ? effectiveInput
      : resolve(DMS_APP_ROOT, effectiveInput),
    relativeToAppRoot: !path.isAbsolute(effectiveInput),
    source: envOverride && envOverride.length > 0 ? 'env' : 'config',
    envVar: envOverride && envOverride.length > 0 ? envVar : undefined,
  };
}

function readConfiguredPath(config, pathKeys) {
  let current = config;
  for (const key of pathKeys) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[key];
  }

  if (typeof current !== 'string') {
    return undefined;
  }

  const trimmed = current.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveProbeSidecarAbsolutePath(documentPath, markdownRoot) {
  const absoluteDocumentPath = resolve(markdownRoot, documentPath);
  const parsed = path.parse(absoluteDocumentPath);
  return path.join(parsed.dir, `${parsed.name}.sidecar.json`);
}

function assertProbeSidecarAbsent(probe, label) {
  if (!probe.sidecarPath) {
    throw new Error(`${label} 검증 전에 probe sidecar 경로를 계산하지 못했습니다.`);
  }

  if (fs.existsSync(probe.sidecarPath)) {
    throw new Error(`${label} 이후 probe sidecar 가 다시 생성되었습니다: ${probe.sidecarPath}`);
  }
}

function assertNoSidecarFiles(rootDir, label) {
  const sidecarPaths = collectSidecarFiles(rootDir);
  if (sidecarPaths.length > 0) {
    throw new Error(`${label} 에 sidecar 파일이 남아 있습니다:\n${sidecarPaths.join('\n')}`);
  }
}

function collectSidecarFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.sidecar.json')) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

async function deleteProbeDocument(baseUrl, accessToken, documentPath) {
  const { response } = await requestJson(`${baseUrl}/dms/content`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      path: documentPath,
    }),
  });

  assertStatusOneOf(response, [200, 404, 502], 'DMS probe document delete');

  if (response.status === 502) {
    const check = await requestJson(`${baseUrl}/dms/file?path=${encodeURIComponent(documentPath)}`, {
      headers: authHeaders(accessToken),
    });

    if (check.response.status !== 404) {
      throw new Error('DMS probe document delete 가 502 이후에도 문서를 남겨두었습니다.');
    }
  }
}

async function deleteProbeAsset(baseUrl, accessToken, assetPath) {
  const { response } = await requestJson(`${baseUrl}/dms/file`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      action: 'delete',
      path: assetPath,
    }),
  });

  assertStatusOneOf(response, [200, 201, 404], `DMS probe asset delete (${assetPath})`);
}

async function verifyAccessSnapshot(baseUrl, accessToken, inspection, label) {
  console.log(`→ verify: DMS ${label} access snapshot`);
  const accessSnapshot = await fetchSuccessData(
    `${baseUrl}/dms/access/me`,
    authHeaders(accessToken),
    [200],
    `/dms/access/me (${label})`,
  );

  if (accessSnapshot.isAuthenticated !== true) {
    throw new Error(`/dms/access/me (${label}) 응답에서 isAuthenticated=true 가 필요합니다.`);
  }

  assertFeatureFlags(
    accessSnapshot.features,
    DMS_FEATURE_PERMISSION_CODES,
    inspection.action.grantedPermissionCodes,
    inspection.action.policy.hasSystemOverride,
    `DMS ${label} access snapshot`,
  );
  assertPolicyTrace(
    accessSnapshot.policy,
    inspection.action.policy,
    `DMS ${label} access policy`,
    FULL_POLICY_TRACE_KEYS,
  );

  return accessSnapshot;
}

async function verifyRuntimeDocumentInspect(
  baseUrl,
  adminAccessToken,
  runtimeLoginId,
  documentPath,
) {
  console.log(`→ verify: DMS object inspect (path=${documentPath})`);
  const inspection = await inspectAccess(baseUrl, adminAccessToken, {
    loginId: runtimeLoginId,
    targetObjectType: 'dms.document',
    targetObjectId: documentPath,
    domainPermissionCodes: 'dms.document.read,dms.document.write',
  });

  if (!isPlainObject(inspection.object)) {
    throw new Error('DMS object inspect 응답에 object section 이 없습니다.');
  }

  if (inspection.object.targetObjectId !== documentPath) {
    throw new Error('DMS object inspect targetObjectId 가 요청값과 다릅니다.');
  }

  const domainGranted = normalizeStringArray(inspection.object.policy?.domainGrantedPermissionCodes);
  if (domainGranted.join('|') !== 'dms.document.read|dms.document.write') {
    throw new Error('DMS object inspect domainGrantedPermissionCodes 가 요청값과 다릅니다.');
  }

  const objectGranted = normalizeStringArray(inspection.object.policy?.objectGrantedPermissionCodes);
  const objectRevoked = normalizeStringArray(inspection.object.policy?.objectRevokedPermissionCodes);
  if (objectGranted.length > 0 || objectRevoked.length > 0) {
    throw new Error('DMS object inspect probe 문서에는 object exception 이 없어야 합니다.');
  }
}

async function verifyReadSurfaces(baseUrl, accessToken, canReadDocuments, probe) {
  console.log('→ verify: DMS read/file/content/binary surfaces');

  const files = await fetchSuccessData(
    `${baseUrl}/dms/files`,
    authHeaders(accessToken),
    canReadDocuments ? [200] : [403],
    '/dms/files',
    { allowNonSuccessEnvelope: !canReadDocuments },
  );

  if (!canReadDocuments) {
    await assertJsonStatus(
      `${baseUrl}/dms/file?path=${encodeURIComponent(probe.documentPath)}`,
      authHeaders(accessToken),
      403,
      '/dms/file read forbidden',
    );
    await assertJsonStatus(
      `${baseUrl}/dms/content?path=${encodeURIComponent(probe.documentPath)}`,
      authHeaders(accessToken),
      403,
      '/dms/content read forbidden',
    );
    await assertJsonStatus(
      `${baseUrl}/dms/content/metadata?path=${encodeURIComponent(probe.documentPath)}`,
      authHeaders(accessToken),
      403,
      '/dms/content/metadata forbidden',
    );
    await assertBinaryEndpoint(
      `${baseUrl}/dms/file/raw?path=${encodeURIComponent(probe.imagePath)}`,
      authHeaders(accessToken),
      403,
      '/dms/file/raw forbidden',
    );
    await assertBinaryEndpoint(
      `${baseUrl}/dms/file/serve-attachment?path=${encodeURIComponent(probe.attachmentPath)}&download=1&name=${encodeURIComponent(path.posix.basename(probe.attachmentPath))}`,
      authHeaders(accessToken),
      403,
      '/dms/file/serve-attachment forbidden',
    );
    return;
  }

  assertArray(files, 'DMS file tree');
  const filePaths = flattenFileTree(files);
  if (!filePaths.includes(probe.documentPath)) {
    throw new Error(`DMS file tree 에 probe 문서(${probe.documentPath})가 없습니다.`);
  }

  const fileData = await fetchSuccessData(
    `${baseUrl}/dms/file?path=${encodeURIComponent(probe.documentPath)}`,
    authHeaders(accessToken),
    [200],
    '/dms/file read',
  );
  assertFileData(fileData, '/dms/file read');

  const contentData = await fetchSuccessData(
    `${baseUrl}/dms/content?path=${encodeURIComponent(probe.documentPath)}`,
    authHeaders(accessToken),
    [200],
    '/dms/content read',
  );
  assertContentData(contentData, '/dms/content read');

  if (contentData.content !== fileData.content) {
    throw new Error('/dms/file 과 /dms/content content 가 일치하지 않습니다.');
  }

  const contentMetadata = await fetchSuccessData(
    `${baseUrl}/dms/content/metadata?path=${encodeURIComponent(probe.documentPath)}`,
    authHeaders(accessToken),
    [200],
    '/dms/content/metadata',
  );
  assertDocumentMetadata(contentMetadata, '/dms/content/metadata');

  if (contentMetadata.title !== probe.title) {
    throw new Error('/dms/content/metadata title 이 probe title 과 다릅니다.');
  }
  if (!isPlainObject(contentData.metadata) || contentData.metadata.title !== contentMetadata.title) {
    throw new Error('/dms/content metadata title 이 /dms/content/metadata 와 다릅니다.');
  }
  const contentComments = Array.isArray(contentMetadata.comments) ? contentMetadata.comments : [];
  if (!contentComments.some((comment) => isPlainObject(comment) && comment.id === probe.commentId)) {
    throw new Error('/dms/content/metadata comments projection 에 probe comment 가 없습니다.');
  }
  if (
    !isPlainObject(contentData.metadata)
    || !Array.isArray(contentData.metadata.comments)
    || !contentData.metadata.comments.some((comment) => isPlainObject(comment) && comment.id === probe.commentId)
  ) {
    throw new Error('/dms/content read metadata comments projection 에 probe comment 가 없습니다.');
  }

  await assertBinaryEndpoint(
    `${baseUrl}/dms/file/raw?path=${encodeURIComponent(probe.imagePath)}`,
    authHeaders(accessToken),
    200,
    '/dms/file/raw',
    (response, body) => {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`/dms/file/raw content-type 이 image/* 가 아닙니다: ${contentType}`);
      }
      if (body.length === 0) {
        throw new Error('/dms/file/raw 응답 body 가 비어 있습니다.');
      }
    },
  );

  await assertBinaryEndpoint(
    `${baseUrl}/dms/file/serve-attachment?path=${encodeURIComponent(probe.attachmentPath)}&download=1&name=${encodeURIComponent(path.posix.basename(probe.attachmentPath))}`,
    authHeaders(accessToken),
    200,
    '/dms/file/serve-attachment',
    (response, body) => {
      const disposition = response.headers.get('content-disposition') || '';
      if (!disposition.toLowerCase().includes('attachment')) {
        throw new Error('/dms/file/serve-attachment 응답이 attachment disposition 이 아닙니다.');
      }
      if (body.length === 0) {
        throw new Error('/dms/file/serve-attachment 응답 body 가 비어 있습니다.');
      }
    },
  );
}

async function verifyCommentRelationProjection(prisma, probe) {
  console.log('→ verify: DMS comment relation projection');
  const comment = await prisma.dmsDocumentComment.findFirst({
    where: {
      commentKey: probe.commentId,
      isActive: true,
    },
    select: {
      document: {
        select: {
          relativePath: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error('dm_document_comment_m relation 에 probe comment 가 기록되지 않았습니다.');
  }

  if (comment.document.relativePath !== probe.documentPath) {
    throw new Error('probe comment relation 이 기대한 문서 경로에 연결되지 않았습니다.');
  }
}

async function verifySearchBoundary(baseUrl, accessToken, canUseSearch, query, activeDocPath) {
  console.log('→ verify: DMS search boundary');
  const search = await fetchSuccessData(
    `${baseUrl}/dms/search`,
    authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    canUseSearch ? [200, 201] : [403],
    '/dms/search',
    {
      method: 'POST',
      body: JSON.stringify({ query, activeDocPath, contextMode: 'doc' }),
      allowNonSuccessEnvelope: !canUseSearch,
    },
  );

  if (!canUseSearch) {
    return;
  }

  if (search.query !== query) {
    throw new Error('/dms/search 응답 query 가 요청값과 일치하지 않습니다.');
  }
  assertArray(search.results, '/dms/search results');
}

async function verifyFileWriteBoundary(baseUrl, accessToken, canWriteDocuments) {
  console.log('→ verify: DMS file write boundary');
  const { response } = await requestJson(`${baseUrl}/dms/file`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ action: 'write' }),
  });
  assertStatus(response, canWriteDocuments ? 400 : 403, '/dms/file write boundary');
}

async function verifyContentWriteBoundary(baseUrl, accessToken, canWriteDocuments) {
  console.log('→ verify: DMS content write/delete boundary');
  const postResult = await requestJson(`${baseUrl}/dms/content`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({}),
  });
  assertStatus(postResult.response, canWriteDocuments ? 400 : 403, '/dms/content POST boundary');

  const deleteResult = await requestJson(`${baseUrl}/dms/content`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({}),
  });
  assertStatus(deleteResult.response, canWriteDocuments ? 400 : 403, '/dms/content DELETE boundary');
}

async function verifyAssistantBoundary(baseUrl, accessToken, canUseAssistant, activeDocPath, label) {
  console.log(`→ verify: DMS ask boundary (${label})`);
  const { response } = await requestJson(`${baseUrl}/dms/ask`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      query: 'access boundary check',
      activeDocPath,
      contextMode: 'invalid',
      stream: false,
    }),
  });
  assertStatus(response, canUseAssistant ? 400 : 403, `/dms/ask boundary (${label})`);
}

async function verifySettingsBoundary(baseUrl, accessToken, canManageSettings, label) {
  console.log(`→ verify: DMS settings boundary (${label})`);
  const getResult = await requestJson(`${baseUrl}/dms/settings?includeRuntime=1`, {
    headers: authHeaders(accessToken),
  });
  assertStatus(getResult.response, canManageSettings ? 200 : 403, `/dms/settings GET (${label})`);

  if (canManageSettings) {
    assertSuccessEnvelope(getResult.data, `/dms/settings GET (${label})`);
    assertSettingsSnapshot(getResult.data.data, `/dms/settings GET (${label})`);
  }

  const postResult = await requestJson(`${baseUrl}/dms/settings`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      action: 'update',
      config: {},
    }),
  });
  assertStatus(postResult.response, canManageSettings ? 200 : 403, `/dms/settings POST (${label})`);
  if (canManageSettings) {
    assertSuccessEnvelope(postResult.data, `/dms/settings POST (${label})`);
    assertSettingsSnapshot(postResult.data.data, `/dms/settings POST (${label})`);
  }
}

async function verifyGitBoundary(baseUrl, accessToken, canUseGit, samplePath, label) {
  console.log(`→ verify: DMS git boundary (${label})`);
  const getResult = await requestJson(`${baseUrl}/dms/git`, {
    headers: authHeaders(accessToken),
  });
  assertStatusOneOf(getResult.response, canUseGit ? [200, 400] : [403], `/dms/git GET (${label})`);

  if (canUseGit && getResult.response.status === 200) {
    assertSuccessEnvelope(getResult.data, `/dms/git GET (${label})`);
  }

  const postResult = await requestJson(`${baseUrl}/dms/git`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      action: 'restore',
      path: samplePath,
    }),
  });
  assertStatus(postResult.response, canUseGit ? 400 : 403, `/dms/git POST (${label})`);
}

async function verifyStorageBoundary(baseUrl, accessToken, features, probe, label) {
  const { canReadDocuments, canManageStorage } = features;
  console.log(`→ verify: DMS storage/open + resync boundary (${label})`);
  const requestBody = {
    provider: 'local',
    path: probe.storagePath,
    documentPath: probe.documentPath,
  };

  const postResult = await requestJson(`${baseUrl}/dms/storage/open`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(requestBody),
  });
  assertStatusOneOf(
    postResult.response,
    canReadDocuments ? [200, 201] : [403],
    `/dms/storage/open POST (${label})`,
  );

  if (canReadDocuments) {
    assertSuccessEnvelope(postResult.data, `/dms/storage/open POST (${label})`);
    const result = postResult.data.data;
    if (result.path !== probe.storagePath) {
      throw new Error(`/dms/storage/open POST (${label}) path 가 요청값과 다릅니다.`);
    }
    if (typeof result.storageUri !== 'string' || !result.storageUri.startsWith('local://')) {
      throw new Error(`/dms/storage/open POST (${label}) storageUri 가 local:// 형식이 아닙니다.`);
    }
    if (
      typeof result.openUrl !== 'string'
      || !result.openUrl.includes(`documentPath=${encodeURIComponent(probe.documentPath)}`)
    ) {
      throw new Error(`/dms/storage/open POST (${label}) openUrl 에 documentPath 가 없습니다.`);
    }
  }

  const params = new URLSearchParams({
    provider: 'local',
    path: probe.storagePath,
    documentPath: probe.documentPath,
  });
  await assertBinaryEndpoint(
    `${baseUrl}/dms/storage/open?${params.toString()}`,
    authHeaders(accessToken),
    canReadDocuments ? 200 : 403,
    `/dms/storage/open GET (${label})`,
    canReadDocuments
      ? (response, body) => {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          throw new Error(`/dms/storage/open GET (${label}) 가 binary 대신 JSON 을 반환했습니다.`);
        }
        if (body.length === 0) {
          throw new Error(`/dms/storage/open GET (${label}) 응답 body 가 비어 있습니다.`);
        }
      }
      : undefined,
  );

  const resyncResult = await requestJson(`${baseUrl}/dms/storage/resync`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(requestBody),
  });
  assertStatusOneOf(
    resyncResult.response,
    canManageStorage ? [200, 201] : [403],
    `/dms/storage/resync (${label})`,
  );

  if (canManageStorage) {
    assertSuccessEnvelope(resyncResult.data, `/dms/storage/resync (${label})`);
    const result = resyncResult.data.data;
    if (result.path !== probe.storagePath) {
      throw new Error(`/dms/storage/resync (${label}) path 가 요청값과 다릅니다.`);
    }
    if (result.provider !== 'local') {
      throw new Error(`/dms/storage/resync (${label}) provider 가 local 이 아닙니다.`);
    }
  }

  const invalidProviderResult = await requestJson(`${baseUrl}/dms/storage/open`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      ...requestBody,
      provider: 'invalid-provider',
    }),
  });
  assertStatusOneOf(
    invalidProviderResult.response,
    canReadDocuments ? [400] : [403],
    `/dms/storage/open invalid provider (${label})`,
  );
}

async function verifyTemplateBoundary(baseUrl, accessToken, canManageTemplates, sourceDocumentPath, label) {
  console.log(`→ verify: DMS template boundary (${label})`);

  const listResult = await requestJson(`${baseUrl}/dms/templates`, {
    headers: authHeaders(accessToken),
  });
  assertStatus(listResult.response, canManageTemplates ? 200 : 403, `/dms/templates GET (${label})`);

  const upsertBody = {
    id: `verify-template-${label}-${Date.now().toString(36)}`,
    name: `Verify template ${label}`,
    scope: 'personal',
    kind: 'document',
    content: '# Verification template\n\nBody generated by verify-access-dms.',
    originType: 'referenced',
    referenceDocuments: [
      {
        path: sourceDocumentPath,
        source: 'manual',
        kind: 'document',
      },
    ],
  };

  const upsertResult = await requestJson(`${baseUrl}/dms/templates`, {
    method: 'POST',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(upsertBody),
  });
  assertStatusOneOf(
    upsertResult.response,
    canManageTemplates ? [200, 201] : [403],
    `/dms/templates POST (${label})`,
  );

  if (!canManageTemplates) {
    return;
  }

  assertSuccessEnvelope(listResult.data, `/dms/templates GET (${label})`);
  assertSuccessEnvelope(upsertResult.data, `/dms/templates POST (${label})`);
  const saved = upsertResult.data.data;
  if (!isPlainObject(saved) || saved.id !== upsertBody.id) {
    throw new Error(`/dms/templates POST (${label}) 응답에 저장된 템플릿 id 가 없습니다.`);
  }

  const getResult = await requestJson(
    `${baseUrl}/dms/templates/${encodeURIComponent(upsertBody.id)}?scope=personal`,
    {
      headers: authHeaders(accessToken),
    },
  );
  assertStatus(getResult.response, 200, `/dms/templates/:id GET (${label})`);
  assertSuccessEnvelope(getResult.data, `/dms/templates/:id GET (${label})`);
  const fetched = getResult.data.data;
  if (!isPlainObject(fetched) || fetched.id !== upsertBody.id) {
    throw new Error(`/dms/templates/:id GET (${label}) 응답 id 가 일치하지 않습니다.`);
  }

  const deleteResult = await requestJson(`${baseUrl}/dms/templates`, {
    method: 'DELETE',
    headers: authHeaders(accessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      id: upsertBody.id,
      scope: 'personal',
    }),
  });
  assertStatus(deleteResult.response, 200, `/dms/templates DELETE (${label})`);
  assertSuccessEnvelope(deleteResult.data, `/dms/templates DELETE (${label})`);
}

async function verifyAdminPrivilegedSurfaces(baseUrl, accessToken, adminLoginId, probe) {
  const adminInspection = await inspectAccess(baseUrl, accessToken, {
    loginId: adminLoginId,
  });
  const adminAccessSnapshot = await verifyAccessSnapshot(
    baseUrl,
    accessToken,
    adminInspection,
    'admin',
  );

  if (adminAccessSnapshot.policy.hasSystemOverride !== true) {
    throw new Error('DMS admin access snapshot 에 hasSystemOverride=true 가 필요합니다.');
  }

  await verifyAssistantBoundary(baseUrl, accessToken, true, probe.documentPath, 'admin');
  await verifySettingsBoundary(baseUrl, accessToken, true, 'admin');
  await verifyGitBoundary(baseUrl, accessToken, true, probe.documentPath, 'admin');
  await verifyStorageBoundary(baseUrl, accessToken, { canReadDocuments: true, canManageStorage: true }, probe, 'admin');
  await verifyTemplateBoundary(baseUrl, accessToken, true, probe.documentPath, 'admin');
}

function assertSettingsSnapshot(settingsSnapshot, label) {
  if (!isPlainObject(settingsSnapshot)) {
    throw new Error(`${label} 응답 data 가 객체가 아닙니다.`);
  }
  if (typeof settingsSnapshot.docDir !== 'string' || settingsSnapshot.docDir.length === 0) {
    throw new Error(`${label} docDir 가 비어 있습니다.`);
  }
  if (!isPlainObject(settingsSnapshot.runtime)) {
    throw new Error(`${label} runtime snapshot 이 없습니다.`);
  }

  const runtime = settingsSnapshot.runtime;
  if (!isPlainObject(runtime.git)) {
    throw new Error(`${label} runtime.git 이 객체가 아닙니다.`);
  }
  if (!isPlainObject(runtime.paths)) {
    throw new Error(`${label} runtime.paths 가 객체가 아닙니다.`);
  }

  const markdownRoot = assertRuntimePathInfo(runtime.paths.markdownRoot, `${label} runtime.paths.markdownRoot`);
  // templateDir is now a derived string, not a full RuntimePathInfo
  if (typeof runtime.paths.templateDir !== 'string' || runtime.paths.templateDir.length === 0) {
    throw new Error(`${label} runtime.paths.templateDir 가 비어 있거나 문자열이 아닙니다.`);
  }
  const ingestQueue = assertRuntimePathInfo(runtime.paths.ingestQueue, `${label} runtime.paths.ingestQueue`);

  if (!isPlainObject(runtime.paths.storageRoots)) {
    throw new Error(`${label} runtime.paths.storageRoots 가 객체가 아닙니다.`);
  }

  const localStorage = assertRuntimePathInfo(
    runtime.paths.storageRoots.local,
    `${label} runtime.paths.storageRoots.local`,
  );
  assertRuntimePathInfo(runtime.paths.storageRoots.sharepoint, `${label} runtime.paths.storageRoots.sharepoint`);
  assertRuntimePathInfo(runtime.paths.storageRoots.nas, `${label} runtime.paths.storageRoots.nas`);

  if (settingsSnapshot.docDir !== markdownRoot.resolvedPath) {
    throw new Error(`${label} docDir 와 runtime.paths.markdownRoot.resolvedPath 가 다릅니다.`);
  }
  if (runtime.git.configuredRoot !== markdownRoot.resolvedPath) {
    throw new Error(`${label} runtime.git.configuredRoot 가 markdownRoot 와 다릅니다.`);
  }
  if (runtime.git.configuredRootInput !== markdownRoot.effectiveInput) {
    throw new Error(`${label} runtime.git.configuredRootInput 이 markdownRoot.effectiveInput 과 다릅니다.`);
  }
  if (runtime.git.configuredRootExists !== markdownRoot.exists) {
    throw new Error(`${label} runtime.git.configuredRootExists 가 markdownRoot.exists 와 다릅니다.`);
  }
  if (runtime.git.configuredRootRelativeToAppRoot !== markdownRoot.relativeToAppRoot) {
    throw new Error(`${label} runtime.git.configuredRootRelativeToAppRoot 가 markdownRoot.relativeToAppRoot 와 다릅니다.`);
  }

  const uniqueRuntimeRoots = new Set([
    markdownRoot.resolvedPath,
    runtime.paths.templateDir,
    ingestQueue.resolvedPath,
    localStorage.resolvedPath,
  ]);
  if (uniqueRuntimeRoots.size !== 4) {
    throw new Error(`${label} runtime root 가 markdown/template/ingest/local storage 로 분리되어 있지 않습니다.`);
  }
}

function assertRuntimePathInfo(info, label) {
  if (!isPlainObject(info)) {
    throw new Error(`${label} 가 객체가 아닙니다.`);
  }
  if (typeof info.configuredPath !== 'string' || info.configuredPath.length === 0) {
    throw new Error(`${label} configuredPath 가 비어 있습니다.`);
  }
  if (typeof info.effectiveInput !== 'string' || info.effectiveInput.length === 0) {
    throw new Error(`${label} effectiveInput 이 비어 있습니다.`);
  }
  if (typeof info.resolvedPath !== 'string' || info.resolvedPath.length === 0) {
    throw new Error(`${label} resolvedPath 가 비어 있습니다.`);
  }
  if (typeof info.exists !== 'boolean') {
    throw new Error(`${label} exists 가 boolean 이 아닙니다.`);
  }
  if (typeof info.relativeToAppRoot !== 'boolean') {
    throw new Error(`${label} relativeToAppRoot 가 boolean 이 아닙니다.`);
  }
  if (info.source !== 'config' && info.source !== 'env') {
    throw new Error(`${label} source 가 config/env 가 아닙니다.`);
  }
  if (info.source === 'env' && typeof info.envVar !== 'string') {
    throw new Error(`${label} env override 인데 envVar 가 없습니다.`);
  }

  return info;
}

async function login(baseUrl, loginId, password) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    console.log(`→ login: ${loginId}${attempt > 1 ? ` (retry ${attempt})` : ''}`);
    const { response, data } = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ssoo-app': 'dms',
      },
      body: JSON.stringify({ loginId, password }),
    });

    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number.parseInt(response.headers.get('retry-after') || '', 10);
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 1500;
      console.log(`! login throttled, waiting ${waitMs}ms before retry`);
      await delay(waitMs);
      continue;
    }

    assertStatus(response, 200, '로그인');

    const accessToken = data?.data?.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new Error('로그인 응답에서 accessToken 을 찾지 못했습니다.');
    }

    return accessToken;
  }

  throw new Error('로그인 재시도 한도를 초과했습니다.');
}

async function inspectAccess(baseUrl, accessToken, query) {
  const params = new URLSearchParams();
  if (query.loginId) {
    params.set('loginId', query.loginId);
  }
  if (query.userId) {
    params.set('userId', query.userId);
  }
  if (query.targetObjectType) {
    params.set('targetObjectType', query.targetObjectType);
  }
  if (query.targetObjectId) {
    params.set('targetObjectId', query.targetObjectId);
  }
  if (query.domainPermissionCodes) {
    params.set('domainPermissionCodes', query.domainPermissionCodes);
  }

  const { response, data } = await requestJson(
    `${baseUrl}/access/ops/inspect?${params.toString()}`,
    {
      headers: authHeaders(accessToken),
    },
  );

  assertStatus(response, 200, '/access/ops/inspect');

  const inspection = data?.data;
  if (!isPlainObject(inspection)) {
    throw new Error('/access/ops/inspect 응답 data 가 객체가 아닙니다.');
  }

  return inspection;
}

async function fetchSuccessData(url, headers, expectedStatuses, label, options = {}) {
  const { response, data } = await requestJson(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });

  assertStatusOneOf(response, expectedStatuses, label);
  if (options.allowNonSuccessEnvelope && response.status >= 400) {
    return data;
  }

  assertSuccessEnvelope(data, label);
  return data.data;
}

function assertSuccessEnvelope(data, label) {
  if (!isPlainObject(data) || data.success !== true || !('data' in data)) {
    throw new Error(`${label} 응답이 success envelope 형식이 아닙니다.`);
  }
}

function authHeaders(accessToken, extraHeaders = undefined) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(extraHeaders ?? {}),
  };
}

function assertFeatureFlags(features, mapping, grantedPermissionCodes, hasSystemOverride, label) {
  if (!isPlainObject(features)) {
    throw new Error(`${label} features 가 객체가 아닙니다.`);
  }

  const granted = new Set(normalizeStringArray(grantedPermissionCodes));
  for (const [featureKey, permissionCode] of Object.entries(mapping)) {
    if (typeof features[featureKey] !== 'boolean') {
      throw new Error(`${label} ${featureKey} 가 boolean 이 아닙니다.`);
    }

    const expected = hasSystemOverride || granted.has(permissionCode);
    if (features[featureKey] !== expected) {
      throw new Error(
        `${label} ${featureKey}=${String(features[featureKey])} 이지만 expected=${String(expected)} 입니다.`,
      );
    }
  }
}

function assertPolicyTrace(actual, expected, label, keys) {
  if (!isPlainObject(actual) || !isPlainObject(expected)) {
    throw new Error(`${label} policy trace 가 객체가 아닙니다.`);
  }

  if (actual.hasSystemOverride !== expected.hasSystemOverride) {
    throw new Error(`${label} hasSystemOverride 가 inspect 결과와 다릅니다.`);
  }

  for (const key of keys) {
    const actualValues = normalizeStringArray(actual[key]);
    const expectedValues = normalizeStringArray(expected[key]);
    if (actualValues.join('|') !== expectedValues.join('|')) {
      throw new Error(`${label} ${key} 가 inspect 결과와 다릅니다.`);
    }
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 가 배열이 아닙니다.`);
  }
}

function assertFileData(fileData, label) {
  if (!isPlainObject(fileData)) {
    throw new Error(`${label} 응답이 객체가 아닙니다.`);
  }
  if (typeof fileData.content !== 'string') {
    throw new Error(`${label} content 가 string 이 아닙니다.`);
  }
  if (!isPlainObject(fileData.metadata)) {
    throw new Error(`${label} metadata 가 객체가 아닙니다.`);
  }
  if (!isPlainObject(fileData.metadata.document)) {
    throw new Error(`${label} metadata.document 가 객체가 아닙니다.`);
  }
}

function assertContentData(contentData, label) {
  if (!isPlainObject(contentData)) {
    throw new Error(`${label} 응답이 객체가 아닙니다.`);
  }
  if (typeof contentData.content !== 'string') {
    throw new Error(`${label} content 가 string 이 아닙니다.`);
  }
  if (!isPlainObject(contentData.metadata)) {
    throw new Error(`${label} metadata 가 객체가 아닙니다.`);
  }
}

function assertDocumentMetadata(metadata, label) {
  if (!isPlainObject(metadata)) {
    throw new Error(`${label} 응답이 객체가 아닙니다.`);
  }
  if (typeof metadata.title !== 'string' || metadata.title.length === 0) {
    throw new Error(`${label} title 이 비어 있습니다.`);
  }
  if (!isPlainObject(metadata.acl)) {
    throw new Error(`${label} acl 이 객체가 아닙니다.`);
  }
  assertArray(metadata.acl.owners, `${label} acl.owners`);
  assertArray(metadata.acl.editors, `${label} acl.editors`);
  assertArray(metadata.acl.viewers, `${label} acl.viewers`);
}

function flattenFileTree(nodes) {
  const filePaths = [];

  for (const node of nodes) {
    if (!isPlainObject(node)) {
      continue;
    }

    if (node.type === 'file' && typeof node.path === 'string') {
      filePaths.push(node.path);
    }

    if (Array.isArray(node.children)) {
      filePaths.push(...flattenFileTree(node.children));
    }
  }

  return filePaths;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .slice()
    .sort((left, right) => left.localeCompare(right));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function assertJsonStatus(url, headers, expectedStatus, label, options = {}) {
  const { response } = await requestJson(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });
  assertStatus(response, expectedStatus, label);
}

async function assertBinaryEndpoint(url, headers, expectedStatus, label, onSuccess = undefined) {
  const { response, body } = await requestBinary(url, {
    headers,
  });

  if (response.status !== expectedStatus) {
    const preview = body.toString('utf-8', 0, Math.min(body.length, 500));
    throw new Error(`${label} 요청이 ${expectedStatus} 가 아니라 ${response.status} 를 반환했습니다. body=${preview}`);
  }

  if (expectedStatus === 200 && onSuccess) {
    onSuccess(response, body);
  }
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!text) {
    return { response, data: null };
  }

  try {
    return { response, data: JSON.parse(text) };
  } catch (error) {
    throw new Error(
      `JSON 응답 파싱 실패 (${url}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function requestBinary(url, init = {}) {
  const response = await fetch(url, init);
  const body = Buffer.from(await response.arrayBuffer());
  return { response, body };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertStatus(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} 요청이 ${expectedStatus} 가 아니라 ${response.status} 를 반환했습니다.`);
  }
}

function assertStatusOneOf(response, expectedStatuses, label) {
  if (expectedStatuses.includes(response.status)) {
    return;
  }

  throw new Error(
    `${label} 요청이 ${expectedStatuses.join(' 또는 ')} 가 아니라 ${response.status} 를 반환했습니다.`,
  );
}

function readOption(name, envKey, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const argValue = argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  return argValue ?? process.env[envKey] ?? defaultValue;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`Usage:
  node scripts/verify-access-dms.mjs [options]

Options:
  --dry-run
  --base-url=http://localhost:4000/api
  --admin-login-id=admin
  --admin-password=admin123!
  --runtime-login-id=viewer.han
  --runtime-password=user123!
  --fixture-dir=verify-access

Environment variables:
  ACCESS_VERIFY_BASE_URL
  ACCESS_VERIFY_ADMIN_LOGIN_ID
  ACCESS_VERIFY_ADMIN_PASSWORD
  ACCESS_VERIFY_RUNTIME_LOGIN_ID
  ACCESS_VERIFY_RUNTIME_PASSWORD
  ACCESS_VERIFY_DMS_FIXTURE_DIR`);
}

function printDryRun(config) {
  console.log('DMS access verification dry-run');
  console.table([
    { key: 'baseUrl', value: config.baseUrl },
    { key: 'adminLoginId', value: config.adminLoginId },
    { key: 'adminPassword', value: mask(config.adminPassword) },
    { key: 'runtimeLoginId', value: config.runtimeLoginId },
    { key: 'runtimePassword', value: mask(config.runtimePassword) },
    { key: 'fixtureDir', value: config.fixtureDir },
  ]);
  console.log('planned checks:');
  console.log('1. admin/runtime login');
  console.log('2. temporary DMS probe document + image/attachment/reference fixture creation');
  console.log('3. DMS access snapshot parity against access inspect');
  console.log('4. runtime document object inspect parity for dms.document.read/write');
  console.log('5. file/content/files/raw/serve-attachment + runtime no-sidecar verification');
  console.log('6. search/ask/settings runtime/git/storage open-resync boundary verification');
  console.log('7. admin privileged DMS surfaces allow path verification');
  console.log('8. fixture cleanup');
}

function mask(value) {
  if (!value) {
    return '(empty)';
  }

  return '*'.repeat(Math.max(4, value.length));
}
