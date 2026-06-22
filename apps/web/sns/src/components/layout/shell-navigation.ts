import { Home, LayoutGrid, Search, Settings, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  SSOO_USER_SURFACE_MY_PROFILE_PATH,
  SSOO_USER_SURFACE_SETTINGS_PATH,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  parseSsooUserSurfaceRoute,
} from '@ssoo/web-auth';
import { APP_HOME_PATH } from '@/lib/constants/routes';

export type SnsShellSectionKey = 'feed' | 'board' | 'search' | 'profile' | 'settings';

export interface SnsShellNavItem {
  key: SnsShellSectionKey;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  requiresFeedAccess?: boolean;
}

export const SNS_SHELL_NAV_ITEMS: SnsShellNavItem[] = [
  {
    key: 'feed',
    href: APP_HOME_PATH,
    label: '피드',
    description: '콘텐츠 타임라인',
    icon: Home,
    requiresFeedAccess: true,
  },
  {
    key: 'board',
    href: '/board',
    label: '게시판',
    description: '공지 · Q&A · 모집',
    icon: LayoutGrid,
    requiresFeedAccess: true,
  },
  {
    key: 'search',
    href: '/search',
    label: '전문가',
    description: '사람 · 스킬 탐색',
    icon: Search,
    requiresFeedAccess: true,
  },
  {
    key: 'profile',
    href: SSOO_USER_SURFACE_MY_PROFILE_PATH,
    label: '프로필',
    description: '소개 · 스킬 · 이력',
    icon: UserRound,
  },
  {
    key: 'settings',
    href: SSOO_USER_SURFACE_SETTINGS_PATH,
    label: '설정',
    description: '개인 환경과 정책',
    icon: Settings,
  },
];

export function getSnsShellSection(pathname: string): SnsShellSectionKey {
  if (pathname.startsWith('/board')) {
    return 'board';
  }
  if (pathname.startsWith('/search')) {
    return 'search';
  }
  if (pathname.startsWith('/profile')) {
    return 'profile';
  }
  if (pathname.startsWith('/__user/profile')) {
    return 'profile';
  }
  if (pathname.startsWith('/settings')) {
    return 'settings';
  }
  if (pathname.startsWith('/__user/settings')) {
    return 'settings';
  }
  return 'feed';
}

export function getSnsShellTabOptions(path: string) {
  const rawPath = path || APP_HOME_PATH;
  const rawPathname = rawPath.split('?')[0] || APP_HOME_PATH;
  const normalizedPath = rawPathname === '/settings'
    ? SSOO_USER_SURFACE_SETTINGS_PATH
    : rawPathname === '/profile/me'
      ? SSOO_USER_SURFACE_MY_PROFILE_PATH
      : rawPathname.startsWith('/profile/')
        ? getSsooUserSurfaceTabPath('user-profile', decodeURIComponent(rawPathname.slice('/profile/'.length)))
        : rawPath;
  const pathname = normalizedPath.split('?')[0] || APP_HOME_PATH;
  const userSurfaceRoute = parseSsooUserSurfaceRoute(normalizedPath);

  if (userSurfaceRoute) {
    return {
      id: getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId),
      title: getSsooUserSurfaceTabTitle(userSurfaceRoute.kind),
      path: normalizedPath,
      closable: true,
    };
  }

  const section = getSnsShellSection(pathname);
  const navItem = SNS_SHELL_NAV_ITEMS.find((item) => item.key === section) ?? SNS_SHELL_NAV_ITEMS[0];

  if (pathname.startsWith('/board/') && pathname !== '/board') {
    return {
      id: normalizedPath.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, ''),
      title: '게시글',
      path: normalizedPath,
      closable: true,
    };
  }

  if (pathname.startsWith('/profile/') && pathname !== '/profile/me') {
    return {
      id: normalizedPath.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, ''),
      title: '프로필',
      path: normalizedPath,
      closable: true,
    };
  }

  return {
    id: pathname === APP_HOME_PATH ? 'home' : navItem.key,
    title: pathname === APP_HOME_PATH ? '홈' : navItem.label,
    path: normalizedPath,
    closable: pathname !== APP_HOME_PATH,
  };
}

export function getSnsShellTabIcon(path: string) {
  const pathname = path.split('?')[0] || APP_HOME_PATH;
  if (pathname.startsWith('/__user/profile')) {
    return UserRound;
  }
  if (pathname.startsWith('/__user/settings')) {
    return Settings;
  }
  const section = getSnsShellSection(pathname);
  return SNS_SHELL_NAV_ITEMS.find((item) => item.key === section)?.icon ?? Home;
}
