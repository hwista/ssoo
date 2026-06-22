export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';
export const PASSWORD_RESET_PATH = '/password-reset';

export const ADMIN_ROOT_ENTRY_PATHS = [
  APP_HOME_PATH,
  LOGIN_PATH,
  PASSWORD_RESET_PATH,
  '/auth',
  '/users',
  '/organizations',
  '/roles',
] as const;

export const ADMIN_ALLOWED_PATH_PREFIXES = [
  '/dms',
  '/ssoo',
] as const;
