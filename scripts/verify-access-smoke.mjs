#!/usr/bin/env node

const argv = process.argv.slice(2);
const COMMUNITY_ROUTE_PREFIX_CANDIDATES = ['chs', 'cms'];

const COMMUNITY_FEATURE_PERMISSION_SUFFIXES = {
  canReadFeed: 'feed.read',
  canCreatePost: 'post.write',
  canComment: 'comment.write',
  canReact: 'reaction.use',
  canFollow: 'follow.manage',
  canManageSkills: 'skill.manage',
  canManageBoards: 'board.manage',
};

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

const PMS_MANAGEMENT_FEATURES = [
  'canEditProject',
  'canManageMembers',
  'canManageTasks',
  'canManageMilestones',
  'canManageIssues',
  'canManageDeliverables',
  'canManageCloseConditions',
  'canAdvanceStage',
];

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

const FOUNDATION_POLICY_TRACE_KEYS = [
  'rolePermissionCodes',
  'organizationPermissionCodes',
  'userGrantedPermissionCodes',
  'userRevokedPermissionCodes',
];

const options = {
  dryRun: argv.includes('--dry-run'),
  help: argv.includes('--help'),
  skipRuntime: argv.includes('--skip-runtime'),
  baseUrl: readOption('base-url', 'ACCESS_VERIFY_BASE_URL', 'http://localhost:4000/api'),
  adminLoginId: readOption('admin-login-id', 'ACCESS_VERIFY_ADMIN_LOGIN_ID', 'admin'),
  adminPassword: readOption('admin-password', 'ACCESS_VERIFY_ADMIN_PASSWORD', 'admin123!'),
  subjectLoginId: readOption('subject-login-id', 'ACCESS_VERIFY_SUBJECT_LOGIN_ID', 'admin'),
  runtimeLoginId: readOption('runtime-login-id', 'ACCESS_VERIFY_RUNTIME_LOGIN_ID', 'viewer.han'),
  runtimePassword: readOption('runtime-password', 'ACCESS_VERIFY_RUNTIME_PASSWORD', 'user123!'),
  runtimeProjectId: readOption('runtime-project-id', 'ACCESS_VERIFY_RUNTIME_PROJECT_ID'),
  communityRoutePrefix: readOption(
    'community-route-prefix',
    'ACCESS_VERIFY_COMMUNITY_ROUTE_PREFIX',
  ),
  nonAdminLoginId: readOption('non-admin-login-id', 'ACCESS_VERIFY_NON_ADMIN_LOGIN_ID'),
  nonAdminPassword: readOption('non-admin-password', 'ACCESS_VERIFY_NON_ADMIN_PASSWORD'),
};

if (options.help) {
  printUsage();
  process.exit(0);
}

if (options.dryRun) {
  printDryRun(options);
  process.exit(0);
}

await main(options);

async function main(config) {
  const adminAccessToken = await login(config.baseUrl, config.adminLoginId, config.adminPassword);

  await verifyProfileContract(config.baseUrl, adminAccessToken);
  await verifyAccessInspect(config.baseUrl, adminAccessToken, config.subjectLoginId);

  const runtimeContext = config.skipRuntime
    ? null
    : await verifyRuntimeDomainChecks(config, adminAccessToken);

  if (config.skipRuntime) {
    console.log('! runtime domain 검증은 --skip-runtime 옵션으로 건너뜁니다.');
  }

  await verifyNonAdminInspectBoundary(config, runtimeContext);

  console.log('✓ access smoke verification passed');
}

async function login(baseUrl, loginId, password) {
  console.log(`→ login: ${loginId}`);
  const { response, data } = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ssoo-app': 'pms',
    },
    body: JSON.stringify({ loginId, password }),
  });

  assertStatus(response, 200, '로그인');

  const accessToken = data?.data?.accessToken;
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('로그인 응답에서 accessToken 을 찾지 못했습니다.');
  }

  return accessToken;
}

async function verifyProfileContract(baseUrl, accessToken) {
  console.log('→ verify: /users/profile contract');
  const { response, data } = await requestJson(`${baseUrl}/users/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  assertStatus(response, 200, '/users/profile');

  const profile = data?.data;
  if (!profile || typeof profile !== 'object') {
    throw new Error('/users/profile 응답이 비어 있습니다.');
  }

  for (const field of ['roleCode', 'userTypeCode', 'isAdmin']) {
    if (field in profile) {
      throw new Error(`/users/profile 응답에 제거되어야 할 legacy field(${field})가 남아 있습니다.`);
    }
  }
}

async function verifyAccessInspect(baseUrl, accessToken, subjectLoginId) {
  console.log(`→ verify: /access/ops/inspect as admin (subject=${subjectLoginId})`);
  const inspection = await inspectAccess(baseUrl, accessToken, { loginId: subjectLoginId });
  if (!inspection || typeof inspection !== 'object') {
    throw new Error('/access/ops/inspect 응답이 비어 있습니다.');
  }

  if (inspection.subject?.loginId !== subjectLoginId) {
    throw new Error('inspect 응답 subject.loginId 가 요청 대상과 일치하지 않습니다.');
  }

  if (typeof inspection.action?.policy?.hasSystemOverride !== 'boolean') {
    throw new Error('inspect 응답에 action.policy.hasSystemOverride 가 없습니다.');
  }

  if (!Array.isArray(inspection.action?.grantedPermissionCodes)) {
    throw new Error('inspect 응답에 grantedPermissionCodes 배열이 없습니다.');
  }

  return inspection;
}

async function verifyAccessInspectForbidden(baseUrl, accessToken, subjectLoginId) {
  console.log(`→ verify: /access/ops/inspect forbidden for non-admin (subject=${subjectLoginId})`);
  const params = new URLSearchParams({ loginId: subjectLoginId });
  const { response } = await requestJson(`${baseUrl}/access/ops/inspect?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  assertStatus(response, 403, '/access/ops/inspect non-admin forbidden');
}

async function verifyRuntimeDomainChecks(config, adminAccessToken) {
  console.log(`→ login runtime user: ${config.runtimeLoginId}`);
  const runtimeAccessToken = await login(
    config.baseUrl,
    config.runtimeLoginId,
    config.runtimePassword,
  );
  const runtimeInspection = await inspectAccess(config.baseUrl, adminAccessToken, {
    loginId: config.runtimeLoginId,
  });

  await verifyPmsRuntime(
    config.baseUrl,
    runtimeAccessToken,
    adminAccessToken,
    runtimeInspection,
    config.runtimeProjectId,
  );
  await verifyCmsRuntime(
    config.baseUrl,
    runtimeAccessToken,
    runtimeInspection,
    config.communityRoutePrefix,
  );
  await verifyDmsRuntime(config.baseUrl, runtimeAccessToken, runtimeInspection);

  return {
    accessToken: runtimeAccessToken,
    inspection: runtimeInspection,
  };
}

async function verifyPmsRuntime(
  baseUrl,
  runtimeAccessToken,
  adminAccessToken,
  runtimeInspection,
  runtimeProjectId,
) {
  console.log('→ verify: PMS /menus/my runtime snapshot');
  const menuSnapshot = await fetchSuccessData(
    `${baseUrl}/menus/my`,
    authHeaders(runtimeAccessToken),
    [200],
    '/menus/my',
  );
  assertArray(menuSnapshot.generalMenus, 'PMS generalMenus');
  assertArray(menuSnapshot.adminMenus, 'PMS adminMenus');
  assertArray(menuSnapshot.favorites, 'PMS favorites');
  assertMenuTree(menuSnapshot.generalMenus, false, 'PMS generalMenus');
  assertMenuTree(menuSnapshot.adminMenus, true, 'PMS adminMenus');

  if (!runtimeInspection.action.policy.hasSystemOverride && menuSnapshot.adminMenus.length > 0) {
    throw new Error('system.override 가 없는 사용자는 adminMenus 를 받으면 안 됩니다.');
  }

  console.log('→ verify: PMS /projects accessible list');
  const runtimeProjects = await fetchSuccessData(
    `${baseUrl}/projects?limit=20`,
    authHeaders(runtimeAccessToken),
    [200],
    '/projects runtime list',
  );
  const adminProjects = await fetchSuccessData(
    `${baseUrl}/projects?limit=20`,
    authHeaders(adminAccessToken),
    [200],
    '/projects admin list',
  );
  assertArray(runtimeProjects, 'PMS runtime project list');
  assertArray(adminProjects, 'PMS admin project list');

  const runtimeProjectIds = new Set(
    runtimeProjects
      .map((project) => project?.id)
      .filter((value) => typeof value === 'string' && value.length > 0),
  );
  const accessibleProjectId = runtimeProjectId ?? runtimeProjects[0]?.id;

  if (!accessibleProjectId) {
    throw new Error(
      'runtime persona 가 접근 가능한 PMS 프로젝트를 찾지 못했습니다. ACCESS_VERIFY_RUNTIME_PROJECT_ID 를 지정하거나 demo seed 를 확인하세요.',
    );
  }

  runtimeProjectIds.add(accessibleProjectId);

  console.log(`→ verify: PMS project allow path (project=${accessibleProjectId})`);
  const projectAccess = await fetchSuccessData(
    `${baseUrl}/projects/${accessibleProjectId}/access`,
    authHeaders(runtimeAccessToken),
    [200],
    `/projects/${accessibleProjectId}/access`,
  );
  assertProjectAccessSnapshot(projectAccess, accessibleProjectId);
  assertPolicyTrace(
    projectAccess.policy,
    runtimeInspection.action.policy,
    'PMS project foundation policy',
    FOUNDATION_POLICY_TRACE_KEYS,
  );

  if (
    projectAccess.roles.isOwnerOrganizationMember
    && (
      typeof projectAccess.ownerOrganizationId !== 'string'
      || !runtimeInspection.organizationIds.includes(projectAccess.ownerOrganizationId)
    )
  ) {
    throw new Error('PMS project access snapshot 의 owner organization 관계가 inspect 결과와 모순됩니다.');
  }

  await fetchSuccessData(
    `${baseUrl}/projects/${accessibleProjectId}`,
    authHeaders(runtimeAccessToken),
    [200],
    `/projects/${accessibleProjectId}`,
  );

  if (!projectAccess.features.canEditProject) {
    console.log(`→ verify: PMS project update forbidden (project=${accessibleProjectId})`);
    const { response } = await requestJson(`${baseUrl}/projects/${accessibleProjectId}`, {
      method: 'PUT',
      headers: authHeaders(runtimeAccessToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
    });
    assertStatus(response, 403, `/projects/${accessibleProjectId} update forbidden`);
  } else {
    console.log('! runtime persona 가 PMS project edit 권한이 있어 update deny probe 는 건너뜁니다.');
  }

  const foreignProject = adminProjects.find(
    (project) => typeof project?.id === 'string' && !runtimeProjectIds.has(project.id),
  );

  if (foreignProject && !runtimeInspection.action.policy.hasSystemOverride) {
    console.log(`→ verify: PMS foreign project denied (project=${foreignProject.id})`);
    const foreignDetail = await requestJson(`${baseUrl}/projects/${foreignProject.id}`, {
      headers: authHeaders(runtimeAccessToken),
    });
    assertStatus(foreignDetail.response, 403, `/projects/${foreignProject.id} foreign detail forbidden`);

    const foreignAccess = await requestJson(`${baseUrl}/projects/${foreignProject.id}/access`, {
      headers: authHeaders(runtimeAccessToken),
    });
    assertStatus(foreignAccess.response, 403, `/projects/${foreignProject.id}/access foreign forbidden`);
  } else {
    console.log('! PMS foreign project deny probe 는 대상이 없거나 runtime persona 가 override 를 가져 건너뜁니다.');
  }
}

async function verifyCmsRuntime(baseUrl, runtimeAccessToken, runtimeInspection, communityRoutePrefix) {
  const communityRoute = await resolveCommunityRoute(
    baseUrl,
    runtimeAccessToken,
    communityRoutePrefix,
  );
  const communityPermissionPrefix = resolveCommunityPermissionPrefix(
    accessSnapshotPermissionSource(communityRoute.accessSnapshot),
    runtimeInspection,
    communityRoute.routePrefix,
  );
  const communityFeaturePermissionCodes = buildCommunityFeaturePermissionCodes(
    communityPermissionPrefix,
  );

  console.log(
    `→ verify: community access snapshot (${communityRoute.routePrefix} route, ${communityPermissionPrefix} permissions)`,
  );
  const accessSnapshot = communityRoute.accessSnapshot;
  assertFeatureFlags(
    accessSnapshot.features,
    communityFeaturePermissionCodes,
    runtimeInspection.action.grantedPermissionCodes,
    runtimeInspection.action.policy.hasSystemOverride,
    'CMS access snapshot',
  );
  assertPolicyTrace(
    accessSnapshot.policy,
    runtimeInspection.action.policy,
    'CMS access policy',
    FULL_POLICY_TRACE_KEYS,
  );

  const chsFeedExpectedStatus = accessSnapshot.features.canReadFeed ? [200] : [403];
  const feed = await fetchSuccessData(
    `${baseUrl}/${communityRoute.routePrefix}/feed`,
    authHeaders(runtimeAccessToken),
    chsFeedExpectedStatus,
    `/${communityRoute.routePrefix}/feed`,
    { allowNonSuccessEnvelope: !accessSnapshot.features.canReadFeed },
  );
  if (accessSnapshot.features.canReadFeed) {
    assertArray(feed.items, 'CMS feed items');
  }

  if (!accessSnapshot.features.canCreatePost) {
    console.log('→ verify: CMS create post forbidden');
    const { response } = await requestJson(`${baseUrl}/${communityRoute.routePrefix}/posts`, {
      method: 'POST',
      headers: authHeaders(runtimeAccessToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'access smoke',
        content: 'access smoke',
        visibilityScopeCode: 'public',
      }),
    });
    assertStatus(response, 403, `/${communityRoute.routePrefix}/posts create forbidden`);
  } else {
    console.log('! runtime persona 가 CMS 게시물 작성 권한이 있어 create deny probe 는 건너뜁니다.');
  }
}

async function verifyDmsRuntime(baseUrl, runtimeAccessToken, runtimeInspection) {
  console.log('→ verify: DMS access snapshot');
  const accessSnapshot = await fetchSuccessData(
    `${baseUrl}/dms/access/me`,
    authHeaders(runtimeAccessToken),
    [200],
    '/dms/access/me',
  );

  if (accessSnapshot.isAuthenticated !== true) {
    throw new Error('/dms/access/me 응답에서 isAuthenticated=true 가 필요합니다.');
  }

  assertFeatureFlags(
    accessSnapshot.features,
    DMS_FEATURE_PERMISSION_CODES,
    runtimeInspection.action.grantedPermissionCodes,
    runtimeInspection.action.policy.hasSystemOverride,
    'DMS access snapshot',
  );
  assertPolicyTrace(
    accessSnapshot.policy,
    runtimeInspection.action.policy,
    'DMS access policy',
    FULL_POLICY_TRACE_KEYS,
  );

  const dmsFilesExpectedStatus = accessSnapshot.features.canReadDocuments ? [200] : [403];
  const files = await fetchSuccessData(
    `${baseUrl}/dms/files`,
    authHeaders(runtimeAccessToken),
    dmsFilesExpectedStatus,
    '/dms/files',
    { allowNonSuccessEnvelope: !accessSnapshot.features.canReadDocuments },
  );
  if (accessSnapshot.features.canReadDocuments) {
    assertArray(files, 'DMS file tree');
  }

  const dmsSearchExpectedStatus = accessSnapshot.features.canUseSearch ? [200, 201] : [403];
  const search = await fetchSuccessData(
    `${baseUrl}/dms/search`,
    authHeaders(runtimeAccessToken, {
      'Content-Type': 'application/json',
    }),
    dmsSearchExpectedStatus,
    '/dms/search',
    {
      method: 'POST',
      body: JSON.stringify({ query: 'ERP' }),
      allowNonSuccessEnvelope: !accessSnapshot.features.canUseSearch,
    },
  );
  if (accessSnapshot.features.canUseSearch) {
    if (search.query !== 'ERP') {
      throw new Error('/dms/search 응답 query 가 요청값과 일치하지 않습니다.');
    }
  }

  const dmsSettingsExpectedStatus = accessSnapshot.features.canManageSettings ? [200] : [403];
  await fetchSuccessData(
    `${baseUrl}/dms/settings`,
    authHeaders(runtimeAccessToken),
    dmsSettingsExpectedStatus,
    '/dms/settings',
    { allowNonSuccessEnvelope: !accessSnapshot.features.canManageSettings },
  );

  if (!accessSnapshot.features.canUseGit) {
    console.log('→ verify: DMS git forbidden');
    const { response } = await requestJson(`${baseUrl}/dms/git`, {
      headers: authHeaders(runtimeAccessToken),
    });
    assertStatus(response, 403, '/dms/git forbidden');
  } else {
    console.log('! runtime persona 가 DMS git 권한이 있어 git deny probe 는 건너뜁니다.');
  }
}

async function verifyNonAdminInspectBoundary(config, runtimeContext) {
  if (
    runtimeContext
    && runtimeContext.inspection.action.policy.hasSystemOverride === false
    && runtimeContext.inspection.subject.loginId !== config.adminLoginId
  ) {
    await verifyAccessInspectForbidden(
      config.baseUrl,
      runtimeContext.accessToken,
      config.subjectLoginId,
    );
    return;
  }

  if (config.nonAdminLoginId && config.nonAdminPassword) {
    const nonAdminAccessToken = await login(
      config.baseUrl,
      config.nonAdminLoginId,
      config.nonAdminPassword,
    );
    await verifyAccessInspectForbidden(config.baseUrl, nonAdminAccessToken, config.subjectLoginId);
    return;
  }

  console.log('! non-admin credential 이 없어 403 검증은 건너뜁니다.');
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

async function fetchSuccessData(
  url,
  headers,
  expectedStatuses,
  label,
  options = {},
) {
  const { response, data } = await requestJson(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });

  assertStatusOneOf(response, expectedStatuses, label);
  if (options.allowNonSuccessEnvelope && response.status >= 400) {
    return data;
  }

  return extractSuccessEnvelope(data, label);
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

function assertProjectAccessSnapshot(projectAccess, projectId) {
  if (!isPlainObject(projectAccess)) {
    throw new Error(`/projects/${projectId}/access 응답이 객체가 아닙니다.`);
  }

  if (projectAccess.projectId !== projectId) {
    throw new Error(`/projects/${projectId}/access 응답 projectId 가 요청값과 다릅니다.`);
  }

  assertBooleanFields(
    projectAccess.features,
    [
      'canViewProject',
      'canEditProject',
      'canManageMembers',
      'canManageTasks',
      'canManageMilestones',
      'canManageIssues',
      'canManageDeliverables',
      'canManageCloseConditions',
      'canAdvanceStage',
    ],
    'PMS project features',
  );
  assertBooleanFields(
    projectAccess.roles,
    ['isProjectOwner', 'isOwnerOrganizationMember', 'isProjectMember'],
    'PMS project roles',
  );
  assertArray(projectAccess.roles?.memberRoleCodes, 'PMS project memberRoleCodes');

  if (!projectAccess.features.canViewProject) {
    throw new Error(`/projects/${projectId}/access 에서 canViewProject=true 여야 합니다.`);
  }

  if (
    projectAccess.features.canViewProject !== (
      projectAccess.policy?.hasSystemOverride === true
      || projectAccess.roles.isProjectOwner
      || projectAccess.roles.isOwnerOrganizationMember
      || projectAccess.roles.isProjectMember
      || PMS_MANAGEMENT_FEATURES.some((featureKey) => projectAccess.features[featureKey] === true)
    )
  ) {
    throw new Error(`/projects/${projectId}/access canViewProject 계산이 역할/관리 capability 와 일치하지 않습니다.`);
  }
}

function assertMenuTree(items, expectedAdminMenu, label) {
  for (const item of items) {
    if (!isPlainObject(item)) {
      throw new Error(`${label} item 이 객체가 아닙니다.`);
    }

    if (typeof item.menuId !== 'string' || item.menuId.length === 0) {
      throw new Error(`${label} menuId 가 비어 있습니다.`);
    }
    if (typeof item.menuCode !== 'string' || item.menuCode.length === 0) {
      throw new Error(`${label} menuCode 가 비어 있습니다.`);
    }
    if (typeof item.menuName !== 'string' || item.menuName.length === 0) {
      throw new Error(`${label} menuName 이 비어 있습니다.`);
    }
    if (typeof item.accessType !== 'string' || item.accessType.length === 0) {
      throw new Error(`${label} accessType 이 비어 있습니다.`);
    }
    if (item.isAdminMenu !== expectedAdminMenu) {
      throw new Error(`${label} isAdminMenu 값이 기대와 다릅니다.`);
    }

    assertArray(item.children, `${label} children`);
    assertMenuTree(item.children, expectedAdminMenu, label);
  }
}

function assertBooleanFields(target, keys, label) {
  if (!isPlainObject(target)) {
    throw new Error(`${label} 가 객체가 아닙니다.`);
  }

  for (const key of keys) {
    if (typeof target[key] !== 'boolean') {
      throw new Error(`${label} ${key} 가 boolean 이 아닙니다.`);
    }
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 가 배열이 아닙니다.`);
  }
}

function buildCommunityFeaturePermissionCodes(permissionPrefix) {
  return Object.fromEntries(
    Object.entries(COMMUNITY_FEATURE_PERMISSION_SUFFIXES).map(([featureKey, suffix]) => [
      featureKey,
      `${permissionPrefix}.${suffix}`,
    ]),
  );
}

function accessSnapshotPermissionSource(accessSnapshot) {
  return {
    grantedPermissionCodes: accessSnapshot?.policy?.grantedPermissionCodes,
    rolePermissionCodes: accessSnapshot?.policy?.rolePermissionCodes,
    organizationPermissionCodes: accessSnapshot?.policy?.organizationPermissionCodes,
  };
}

function resolveCommunityPermissionPrefix(accessSnapshotPolicy, runtimeInspection, fallbackPrefix) {
  const permissionCodes = [
    ...normalizeStringArray(accessSnapshotPolicy?.grantedPermissionCodes),
    ...normalizeStringArray(accessSnapshotPolicy?.rolePermissionCodes),
    ...normalizeStringArray(accessSnapshotPolicy?.organizationPermissionCodes),
    ...normalizeStringArray(runtimeInspection?.action?.grantedPermissionCodes),
    ...normalizeStringArray(runtimeInspection?.action?.policy?.grantedPermissionCodes),
    ...normalizeStringArray(runtimeInspection?.action?.policy?.rolePermissionCodes),
    ...normalizeStringArray(runtimeInspection?.action?.policy?.organizationPermissionCodes),
  ];

  const discoveredPrefix = COMMUNITY_ROUTE_PREFIX_CANDIDATES.find((prefix) =>
    permissionCodes.some((code) => code.startsWith(`${prefix}.`)),
  );

  return discoveredPrefix ?? fallbackPrefix ?? 'cms';
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

async function requestJsonProbe(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!text) {
    return { response, data: null };
  }

  try {
    return { response, data: JSON.parse(text) };
  } catch {
    return { response, data: null };
  }
}

async function resolveCommunityRoute(baseUrl, runtimeAccessToken, preferredRoutePrefix) {
  const routePrefixes = preferredRoutePrefix
    ? [preferredRoutePrefix]
    : COMMUNITY_ROUTE_PREFIX_CANDIDATES;
  const attemptedPaths = [];

  for (const routePrefix of routePrefixes) {
    const label = `/${routePrefix}/access/me`;
    const url = `${baseUrl}${label}`;
    const { response, data } = await requestJsonProbe(url, {
      headers: authHeaders(runtimeAccessToken),
    });

    if (response.status === 404) {
      attemptedPaths.push(label);
      continue;
    }

    assertStatus(response, 200, label);
    return {
      routePrefix,
      accessSnapshot: extractSuccessEnvelope(data, label),
    };
  }

  throw new Error(
    `community access snapshot endpoint 를 찾지 못했습니다. 시도한 경로: ${attemptedPaths.join(', ')}`,
  );
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

function extractSuccessEnvelope(data, label) {
  if (!isPlainObject(data) || data.success !== true || !('data' in data)) {
    throw new Error(`${label} 응답이 success envelope 형식이 아닙니다.`);
  }

  return data.data;
}

function printUsage() {
  console.log(`Usage:
  node scripts/verify-access-smoke.mjs [options]

Options:
  --dry-run
  --skip-runtime
  --base-url=http://localhost:4000/api
  --admin-login-id=admin
  --admin-password=admin123!
  --subject-login-id=admin
  --runtime-login-id=viewer.han
  --runtime-password=user123!
  --runtime-project-id=<projectId>
  --community-route-prefix=<chs|cms>
  --non-admin-login-id=<loginId>
  --non-admin-password=<password>

Environment variables:
  ACCESS_VERIFY_BASE_URL
  ACCESS_VERIFY_ADMIN_LOGIN_ID
  ACCESS_VERIFY_ADMIN_PASSWORD
  ACCESS_VERIFY_SUBJECT_LOGIN_ID
  ACCESS_VERIFY_RUNTIME_LOGIN_ID
  ACCESS_VERIFY_RUNTIME_PASSWORD
  ACCESS_VERIFY_RUNTIME_PROJECT_ID
  ACCESS_VERIFY_COMMUNITY_ROUTE_PREFIX
  ACCESS_VERIFY_NON_ADMIN_LOGIN_ID
  ACCESS_VERIFY_NON_ADMIN_PASSWORD`);
}

function printDryRun(config) {
  console.log('access smoke verification dry-run');
  console.table([
    { key: 'baseUrl', value: config.baseUrl },
    { key: 'adminLoginId', value: config.adminLoginId },
    { key: 'adminPassword', value: mask(config.adminPassword) },
    { key: 'subjectLoginId', value: config.subjectLoginId },
    { key: 'skipRuntime', value: String(config.skipRuntime) },
    { key: 'runtimeLoginId', value: config.runtimeLoginId },
    { key: 'runtimePassword', value: config.skipRuntime ? '(skip runtime)' : mask(config.runtimePassword) },
    { key: 'runtimeProjectId', value: config.runtimeProjectId ?? '(auto select)' },
    {
      key: 'communityRoutePrefix',
      value: config.communityRoutePrefix ?? COMMUNITY_ROUTE_PREFIX_CANDIDATES.join(' -> '),
    },
    { key: 'nonAdminLoginId', value: config.nonAdminLoginId ?? '(skip forbidden check)' },
    { key: 'nonAdminPassword', value: config.nonAdminPassword ? mask(config.nonAdminPassword) : '(skip forbidden check)' },
  ]);
  console.log('planned checks:');
  console.log('1. admin login');
  console.log('2. /users/profile legacy field contract');
  console.log('3. /access/ops/inspect success for admin/system.override subject');
  if (config.skipRuntime) {
    console.log('4. runtime PMS/CMS/DMS verification skipped');
  } else {
    console.log('4. runtime user login');
    console.log('5. PMS menus + accessible project allow + foreign project deny');
    console.log('6. CHS/CMS access/feed + post create boundary');
    console.log('7. DMS access/files/search/settings/git boundary');
  }
  console.log('8. /access/ops/inspect 403 for non-admin runtime or explicit credential');
}

function mask(value) {
  if (!value) {
    return '(empty)';
  }

  return '*'.repeat(Math.max(4, value.length));
}
