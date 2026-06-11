import { Home, LayoutGrid, Search, Settings, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
    href: '/profile/me',
    label: '프로필',
    description: '소개 · 스킬 · 이력',
    icon: UserRound,
  },
  {
    key: 'settings',
    href: '/settings',
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
  if (pathname.startsWith('/settings')) {
    return 'settings';
  }
  return 'feed';
}
