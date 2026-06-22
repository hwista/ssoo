export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';
export const PASSWORD_RESET_PATH = '/password-reset';

export const ROOT_ENTRY_PATHS = [APP_HOME_PATH, LOGIN_PATH, PASSWORD_RESET_PATH] as const;

export const ALLOWED_PATH_PREFIXES = [
  ...ROOT_ENTRY_PATHS,
  '/board',
  '/profile',
  '/search',
  '/ssoo',
  '/settings',
] as const;
