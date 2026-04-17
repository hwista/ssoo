#!/usr/bin/env node

import { PrismaClient } from '../packages/database/dist/index.js';

const argv = process.argv.slice(2);

const options = {
  dryRun: argv.includes('--dry-run'),
  help: argv.includes('--help'),
  keepTempUser: argv.includes('--keep-temp-user'),
  baseUrl: readOption('base-url', 'ACCESS_VERIFY_BASE_URL', 'http://localhost:4000/api'),
  adminLoginId: readOption('admin-login-id', 'ACCESS_VERIFY_ADMIN_LOGIN_ID', 'admin'),
  adminPassword: readOption('admin-password', 'ACCESS_VERIFY_ADMIN_PASSWORD', 'admin123!'),
  roleCode: readOption('role-code', 'ACCESS_VERIFY_ROLE_MENU_ROLE_CODE', 'user'),
  customerId: readOption('customer-id', 'ACCESS_VERIFY_CUSTOMER_ID'),
  internalOrgCode: readOption('internal-org-code', 'ACCESS_VERIFY_INTERNAL_ORG_CODE'),
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
  const prisma = new PrismaClient();

  try {
    const adminAccessToken = await login(config.baseUrl, config.adminLoginId, config.adminPassword);

    await verifyRoleMenuOperatorSurface(config.baseUrl, adminAccessToken, config.roleCode);
    await verifyAdminUserCrudAndOrgBridge(config.baseUrl, adminAccessToken, prisma, config);

    console.log('✓ access admin verification passed');
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyRoleMenuOperatorSurface(baseUrl, adminAccessToken, roleCode) {
  console.log(`→ verify: PMS role-menu operator surface (role=${roleCode})`);

  const originalPermissions = await fetchRoleMenuPermissions(baseUrl, adminAccessToken, roleCode);
  assertArray(originalPermissions, 'role menu permissions');

  const adminMenu = originalPermissions.find((permission) => permission?.isAdminMenu === true);
  if (adminMenu) {
    if (adminMenu.accessSource !== 'system-override') {
      throw new Error('관리자 메뉴는 system.override source 로 노출되어야 합니다.');
    }
    if (adminMenu.isEditable !== false) {
      throw new Error('관리자 메뉴는 읽기 전용이어야 합니다.');
    }
  }

  const candidate = originalPermissions.find(
    (permission) => permission?.isAdminMenu === false && permission?.isEditable === true,
  );
  if (!candidate) {
    throw new Error('수정 가능한 일반 메뉴를 찾지 못했습니다.');
  }

  const overrideAccessType = pickRoleOverrideAccessType(
    candidate.baselineAccessType,
    candidate.accessType,
  );

  try {
    await updateRoleMenuPermissions(baseUrl, adminAccessToken, roleCode, [
      { menuId: candidate.menuId, accessType: overrideAccessType },
    ]);

    const updatedPermissions = await fetchRoleMenuPermissions(baseUrl, adminAccessToken, roleCode);
    const updatedCandidate = findRoleMenuPermission(updatedPermissions, candidate.menuId);

    if (!updatedCandidate) {
      throw new Error('수정 후 대상 메뉴를 다시 찾지 못했습니다.');
    }

    if (updatedCandidate.accessType !== overrideAccessType) {
      throw new Error('role-menu override accessType 이 기대값과 다릅니다.');
    }
    if (updatedCandidate.accessSource !== 'role-override') {
      throw new Error('role-menu override accessSource 가 role-override 여야 합니다.');
    }
    if (updatedCandidate.baselineAccessType !== candidate.baselineAccessType) {
      throw new Error('role-menu override baselineAccessType 이 변하면 안 됩니다.');
    }
    if (updatedCandidate.isEditable !== true) {
      throw new Error('일반 메뉴는 role override 상태에서도 editable 이어야 합니다.');
    }
  } finally {
    await updateRoleMenuPermissions(baseUrl, adminAccessToken, roleCode, [
      { menuId: candidate.menuId, accessType: candidate.accessType },
    ]);

    const resetPermissions = await fetchRoleMenuPermissions(baseUrl, adminAccessToken, roleCode);
    const resetCandidate = findRoleMenuPermission(resetPermissions, candidate.menuId);

    if (!resetCandidate) {
      throw new Error('reset 후 대상 메뉴를 다시 찾지 못했습니다.');
    }

    if (resetCandidate.accessType !== candidate.accessType) {
      throw new Error('role-menu reset 후 accessType 이 원래 값으로 복원되지 않았습니다.');
    }
    if (resetCandidate.accessSource !== candidate.accessSource) {
      throw new Error('role-menu reset 후 accessSource 가 원래 값으로 복원되지 않았습니다.');
    }
  }
}

async function verifyAdminUserCrudAndOrgBridge(baseUrl, adminAccessToken, prisma, config) {
  console.log('→ verify: admin user CRUD + org bridge parity');

  const customer = await loadCustomer(prisma, config.customerId);
  const internalOrganization = await loadInternalOrganization(prisma, config.internalOrgCode);

  const suffix = String(Date.now()).slice(-8);
  const loginId = `admin.verify.${suffix}`;
  let createdUserId = null;

  try {
    const createdUser = await createUser(baseUrl, adminAccessToken, {
      loginId,
      password: 'Password1!',
      userName: `Admin Verify ${suffix}`,
      displayName: `Verify ${suffix}`,
      email: `admin.verify.${suffix}@example.com`,
      roleCode: 'user',
      departmentCode: internalOrganization.orgCode,
      employeeNumber: `E${suffix}`,
      customerId: String(customer.id),
      primaryAffiliationType: 'internal',
    });

    createdUserId = createdUser.id;
    assertNoLegacyUserFields(createdUser, 'create response');
    if (createdUser.primaryAffiliationType !== 'internal') {
      throw new Error('생성 직후 primaryAffiliationType 이 internal 이어야 합니다.');
    }

    const createdInspection = await inspectAccess(baseUrl, adminAccessToken, { loginId });
    assertInspectSubjectShape(createdInspection.subject, loginId, 'create inspect');
    if (!Array.isArray(createdInspection.organizationIds) || createdInspection.organizationIds.length < 2) {
      throw new Error('생성 직후 inspect.organizationIds 는 internal/external 두 소속을 모두 반영해야 합니다.');
    }

    const updatedUser = await updateUser(baseUrl, adminAccessToken, createdUserId, {
      customerId: String(customer.id),
      companyName: customer.customerName,
      primaryAffiliationType: 'external',
    });

    assertNoLegacyUserFields(updatedUser, 'update response');
    if (updatedUser.primaryAffiliationType !== 'external') {
      throw new Error('수정 후 primaryAffiliationType 이 external 이어야 합니다.');
    }

    const updatedInspection = await inspectAccess(baseUrl, adminAccessToken, { loginId });
    assertInspectSubjectShape(updatedInspection.subject, loginId, 'update inspect');

    const relations = await prisma.userOrganizationRelation.findMany({
      where: {
        userId: BigInt(createdUserId),
        isActive: true,
      },
      select: {
        isPrimary: true,
        affiliationRole: true,
        organization: {
          select: {
            orgCode: true,
            orgType: true,
          },
        },
      },
      orderBy: {
        userOrgRelationId: 'asc',
      },
    });

    const internalRelation = relations.find((relation) => relation.organization.orgType === 'internal');
    const externalRelation = relations.find((relation) => relation.organization.orgType === 'external');

    if (!internalRelation || !externalRelation) {
      throw new Error('internal/external active organization relation 둘 다 존재해야 합니다.');
    }
    if (internalRelation.isPrimary !== false) {
      throw new Error('external 전환 후 internal relation 은 primary 가 아니어야 합니다.');
    }
    if (externalRelation.isPrimary !== true) {
      throw new Error('external 전환 후 external relation 이 primary 여야 합니다.');
    }
    if (externalRelation.affiliationRole !== 'external') {
      throw new Error('external 전환 후 external relation affiliationRole 이 external 이어야 합니다.');
    }
  } finally {
    if (createdUserId && !config.keepTempUser) {
      await prisma.user.delete({
        where: {
          id: BigInt(createdUserId),
        },
      });
    }
  }
}

async function loadCustomer(prisma, customerId) {
  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: BigInt(customerId) },
      select: { id: true, customerCode: true, customerName: true, isActive: true },
    });

    if (!customer || customer.isActive !== true) {
      throw new Error(`활성 customer(${customerId})를 찾지 못했습니다.`);
    }

    return customer;
  }

  const customer = await prisma.customer.findFirst({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, customerCode: true, customerName: true },
  });

  if (!customer) {
    throw new Error('활성 customer seed 를 찾지 못했습니다.');
  }

  return customer;
}

async function loadInternalOrganization(prisma, internalOrgCode) {
  if (internalOrgCode) {
    const organization = await prisma.organization.findFirst({
      where: {
        orgCode: internalOrgCode,
        orgType: 'internal',
        isActive: true,
      },
      select: {
        orgId: true,
        orgCode: true,
      },
    });

    if (!organization) {
      throw new Error(`활성 internal organization(${internalOrgCode})를 찾지 못했습니다.`);
    }

    return organization;
  }

  const organization = await prisma.organization.findFirst({
    where: {
      orgType: 'internal',
      isActive: true,
    },
    orderBy: { orgId: 'asc' },
    select: {
      orgId: true,
      orgCode: true,
    },
  });

  if (!organization) {
    throw new Error('활성 internal organization 을 찾지 못했습니다.');
  }

  return organization;
}

async function fetchRoleMenuPermissions(baseUrl, accessToken, roleCode) {
  return fetchSuccessData(
    `${baseUrl}/roles/${roleCode}/menus`,
    authHeaders(accessToken),
    [200],
    `/roles/${roleCode}/menus`,
  );
}

async function updateRoleMenuPermissions(baseUrl, accessToken, roleCode, permissions) {
  return fetchSuccessData(
    `${baseUrl}/roles/${roleCode}/menus`,
    authHeaders(accessToken, { 'Content-Type': 'application/json' }),
    [200],
    `PUT /roles/${roleCode}/menus`,
    {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    },
  );
}

async function createUser(baseUrl, accessToken, payload) {
  return fetchSuccessData(
    `${baseUrl}/users`,
    authHeaders(accessToken, { 'Content-Type': 'application/json' }),
    [201],
    'POST /users',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

async function updateUser(baseUrl, accessToken, userId, payload) {
  return fetchSuccessData(
    `${baseUrl}/users/${userId}`,
    authHeaders(accessToken, { 'Content-Type': 'application/json' }),
    [200],
    `PUT /users/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

async function inspectAccess(baseUrl, accessToken, query) {
  const params = new URLSearchParams();
  if (query.loginId) {
    params.set('loginId', query.loginId);
  }
  if (query.userId) {
    params.set('userId', query.userId);
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

function assertInspectSubjectShape(subject, expectedLoginId, label) {
  if (!isPlainObject(subject)) {
    throw new Error(`${label} subject 가 객체가 아닙니다.`);
  }

  const keys = Object.keys(subject).sort();
  const expectedKeys = ['displayName', 'isActive', 'loginId', 'roleCode', 'userId', 'userName'];
  if (keys.join('|') !== expectedKeys.join('|')) {
    throw new Error(`${label} subject key set 이 기대와 다릅니다: ${keys.join(', ')}`);
  }
  if (subject.loginId !== expectedLoginId) {
    throw new Error(`${label} subject.loginId 가 요청 대상과 다릅니다.`);
  }
}

function assertNoLegacyUserFields(user, label) {
  if (!isPlainObject(user)) {
    throw new Error(`${label} 가 객체가 아닙니다.`);
  }

  for (const field of ['userTypeCode', 'isAdmin']) {
    if (field in user) {
      throw new Error(`${label} 에 제거되어야 할 legacy field(${field})가 남아 있습니다.`);
    }
  }
}

function findRoleMenuPermission(permissions, menuId) {
  return permissions.find((permission) => permission?.menuId === menuId) ?? null;
}

function pickRoleOverrideAccessType(baselineAccessType, currentAccessType) {
  const candidatesByBaseline = {
    full: ['read', 'none'],
    read: ['full', 'none'],
    none: ['read', 'full'],
  };

  const candidates = candidatesByBaseline[baselineAccessType] ?? ['read', 'full', 'none'];
  return candidates.find((candidate) => candidate !== currentAccessType) ?? candidates[0];
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

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${label} 요청이 ${expectedStatuses.join(' 또는 ')} 가 아니라 ${response.status} 를 반환했습니다. `
      + `body=${JSON.stringify(data)}`,
    );
  }

  if (!isPlainObject(data) || data.success !== true || !('data' in data)) {
    throw new Error(`${label} 응답이 success envelope 형식이 아닙니다.`);
  }

  return data.data;
}

function authHeaders(accessToken, extraHeaders = undefined) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(extraHeaders ?? {}),
  };
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 가 배열이 아닙니다.`);
  }
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

function assertStatus(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} 요청이 ${expectedStatus} 가 아니라 ${response.status} 를 반환했습니다.`);
  }
}

function readOption(name, envKey, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const argValue = argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  return argValue ?? process.env[envKey] ?? defaultValue;
}

function printUsage() {
  console.log(`Usage:
  node scripts/verify-access-admin.mjs [options]

Options:
  --dry-run
  --keep-temp-user
  --base-url=http://localhost:4000/api
  --admin-login-id=admin
  --admin-password=admin123!
  --role-code=user
  --customer-id=<customerId>
  --internal-org-code=<orgCode>

Environment variables:
  DATABASE_URL
  ACCESS_VERIFY_BASE_URL
  ACCESS_VERIFY_ADMIN_LOGIN_ID
  ACCESS_VERIFY_ADMIN_PASSWORD
  ACCESS_VERIFY_ROLE_MENU_ROLE_CODE
  ACCESS_VERIFY_CUSTOMER_ID
  ACCESS_VERIFY_INTERNAL_ORG_CODE`);
}

function printDryRun(config) {
  console.log('access admin verification dry-run');
  console.table([
    { key: 'baseUrl', value: config.baseUrl },
    { key: 'adminLoginId', value: config.adminLoginId },
    { key: 'adminPassword', value: mask(config.adminPassword) },
    { key: 'roleCode', value: config.roleCode },
    { key: 'customerId', value: config.customerId ?? '(auto select active customer)' },
    { key: 'internalOrgCode', value: config.internalOrgCode ?? '(auto select active internal org)' },
    { key: 'keepTempUser', value: String(config.keepTempUser) },
  ]);
  console.log('planned checks:');
  console.log('1. admin login');
  console.log('2. PMS role-menu operator read/update/reset semantics');
  console.log('3. admin user create/update contract without legacy fields');
  console.log('4. inspect subject shape for the temp user');
  console.log('5. cm_user_org_r parity for internal -> external primary switching');
}

function mask(value) {
  if (!value) {
    return '(empty)';
  }

  return '*'.repeat(Math.max(4, value.length));
}
