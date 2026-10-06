export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';
export const PASSWORD_RESET_PATH = '/password-reset';
export const GLOBAL_SEARCH_PATH = '/ssoo/search';
export const OPERATIONS_GIT_SETTINGS_PATH = '/settings/operations/git';
export const SETTINGS_PATH_PREFIX = '/settings';

export const ROOT_ENTRY_PATHS = [
  '/recovery',
  APP_HOME_PATH,
  LOGIN_PATH,
  PASSWORD_RESET_PATH,
  GLOBAL_SEARCH_PATH,
  OPERATIONS_GIT_SETTINGS_PATH,
] as const;

export const ALLOWED_PATH_PREFIXES = [
  SETTINGS_PATH_PREFIX,
] as const;
