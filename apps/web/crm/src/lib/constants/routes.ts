export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';
export const PASSWORD_RESET_PATH = '/password-reset';
export const GLOBAL_SEARCH_PATH = '/ssoo/search';
export const CRM_WORKSPACE_ENTRY_PATHS = [
  '/opportunities',
  '/customers',
  '/quote-settings',
  '/contracts',
  '/contract-performance',
  '/reports',
  '/business-years',
  '/business-plan',
  '/business-plan-performance',
  '/cost-plan',
  '/operations',
  '/operations/settings',
  '/settings',
] as const;

export const ROOT_ENTRY_PATHS = [
  '/recovery',
  APP_HOME_PATH,
  LOGIN_PATH,
  PASSWORD_RESET_PATH,
  GLOBAL_SEARCH_PATH,
  ...CRM_WORKSPACE_ENTRY_PATHS,
] as const;
