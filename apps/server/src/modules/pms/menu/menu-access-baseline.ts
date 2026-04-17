export type MenuAccessType = 'full' | 'read' | 'none';

export type MenuAccessSource = 'baseline' | 'role-override' | 'system-override';

const VIEWER_BASELINE_MENU_CODES = new Set<string>(['dashboard']);

export function normalizeMenuAccessType(accessType?: string | null): MenuAccessType {
  switch (accessType) {
    case 'full':
    case 'read':
    case 'none':
      return accessType;
    default:
      return 'none';
  }
}

export function resolvePmsMenuBaselineAccessType(options: {
  roleCode?: string | null;
  menuCode: string;
  isAdminMenu: boolean;
  hasSystemOverride: boolean;
}): MenuAccessType {
  if (options.isAdminMenu) {
    return options.hasSystemOverride ? 'full' : 'none';
  }

  switch (options.roleCode) {
    case 'admin':
    case 'manager':
      return 'full';
    case 'user':
      return 'read';
    case 'viewer':
      return VIEWER_BASELINE_MENU_CODES.has(options.menuCode) ? 'read' : 'none';
    default:
      return 'none';
  }
}

export function resolvePmsMenuAccess(options: {
  roleCode?: string | null;
  menuCode: string;
  isAdminMenu: boolean;
  hasSystemOverride: boolean;
  roleOverrideAccessType?: string | null;
}): {
  accessType: MenuAccessType;
  accessSource: MenuAccessSource;
  baselineAccessType: MenuAccessType;
  isEditable: boolean;
} {
  const baselineAccessType = resolvePmsMenuBaselineAccessType(options);

  if (options.isAdminMenu) {
    return {
      accessType: baselineAccessType,
      accessSource: 'system-override',
      baselineAccessType,
      isEditable: false,
    };
  }

  const roleOverrideAccessType = normalizeMenuAccessType(options.roleOverrideAccessType);
  const hasRoleOverride =
    options.roleOverrideAccessType !== undefined
    && options.roleOverrideAccessType !== null
    && roleOverrideAccessType !== baselineAccessType;

  if (hasRoleOverride) {
    return {
      accessType: roleOverrideAccessType,
      accessSource: 'role-override',
      baselineAccessType,
      isEditable: true,
    };
  }

  return {
    accessType: baselineAccessType,
    accessSource: 'baseline',
    baselineAccessType,
    isEditable: true,
  };
}
