export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';

export const ROOT_ENTRY_PATHS = [APP_HOME_PATH, LOGIN_PATH] as const;

export const ALLOWED_PATH_PREFIXES = [
  ...ROOT_ENTRY_PATHS,
  '/board',
  '/profile',
  '/search',
  '/settings',
] as const;
