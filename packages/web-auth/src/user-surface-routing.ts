export const SSOO_USER_SURFACE_MY_PROFILE_PATH = '/__user/profile/me';
export const SSOO_USER_SURFACE_SETTINGS_PATH = '/__user/settings';
export const SSOO_USER_SURFACE_PROFILE_PATH_PREFIX = '/__user/profile/';

export type SsooUserSurfaceTabKind = 'my-profile' | 'user-profile' | 'personal-settings';

export interface SsooUserSurfaceRoute {
  kind: SsooUserSurfaceTabKind;
  userId?: string;
  path: string;
  title: string;
}

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

export function getSsooUserSurfaceTabPath(kind: SsooUserSurfaceTabKind, userId?: string | null): string {
  if (kind === 'personal-settings') {
    return SSOO_USER_SURFACE_SETTINGS_PATH;
  }

  if (kind === 'user-profile') {
    const normalizedUserId = userId?.trim() || 'me';
    return `${SSOO_USER_SURFACE_PROFILE_PATH_PREFIX}${encodeURIComponent(normalizedUserId)}`;
  }

  return SSOO_USER_SURFACE_MY_PROFILE_PATH;
}

export function getSsooUserSurfaceTabId(kind: SsooUserSurfaceTabKind, userId?: string | null): string {
  if (kind === 'personal-settings') {
    return 'ssoo-user-settings';
  }

  if (kind === 'user-profile') {
    const normalizedUserId = userId?.trim() || 'me';
    return `ssoo-user-profile-${normalizedUserId}`;
  }

  return 'ssoo-user-profile-me';
}

export function getSsooUserSurfaceTabTitle(kind: SsooUserSurfaceTabKind): string {
  if (kind === 'personal-settings') {
    return '내 설정';
  }

  if (kind === 'user-profile') {
    return '프로필';
  }

  return '내 프로필';
}

export function getSsooUserSurfacePageDescription(kind: SsooUserSurfaceTabKind): string {
  if (kind === 'personal-settings') {
    return '전역 프로필과 계정 표면에 쓰이는 개인 정보를 관리합니다.';
  }

  if (kind === 'user-profile') {
    return 'SSOO 전역 사용자 프로필과 활동 피드를 확인합니다.';
  }

  return '내 프로필과 활동 피드를 확인합니다.';
}

export function parseSsooUserSurfaceRoute(path: string | null | undefined): SsooUserSurfaceRoute | null {
  if (!path) {
    return null;
  }

  const pathname = stripQuery(path);

  if (pathname === SSOO_USER_SURFACE_SETTINGS_PATH) {
    return {
      kind: 'personal-settings',
      path: pathname,
      title: getSsooUserSurfaceTabTitle('personal-settings'),
    };
  }

  if (pathname === SSOO_USER_SURFACE_MY_PROFILE_PATH) {
    return {
      kind: 'my-profile',
      path: pathname,
      title: getSsooUserSurfaceTabTitle('my-profile'),
    };
  }

  if (pathname.startsWith(SSOO_USER_SURFACE_PROFILE_PATH_PREFIX)) {
    const encodedUserId = pathname.slice(SSOO_USER_SURFACE_PROFILE_PATH_PREFIX.length);
    const userId = decodeURIComponent(encodedUserId || 'me');

    return {
      kind: userId === 'me' ? 'my-profile' : 'user-profile',
      userId,
      path: pathname,
      title: getSsooUserSurfaceTabTitle(userId === 'me' ? 'my-profile' : 'user-profile'),
    };
  }

  return null;
}

export function isSsooUserSurfaceRoute(path: string | null | undefined): boolean {
  return parseSsooUserSurfaceRoute(path) !== null;
}
