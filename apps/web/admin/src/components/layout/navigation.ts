import {
  Building2,
  KeyRound,
  LayoutDashboard,
  Shield,
  Search,
  Bot,
  Code2,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/organizations', label: '조직 관리', icon: Building2 },
  { href: '/codes', label: '공통코드 관리', icon: Code2 },
  { href: '/roles', label: '역할 & 권한', icon: Shield },
  { href: '/auth', label: '인증 정책', icon: KeyRound },
  { href: '/ai-operations', label: 'AI 운영', icon: Bot },
];

const ADMIN_SYSTEM_NAV_ITEMS: AdminNavItem[] = [
  { href: '/ssoo/search', label: '통합 검색', icon: Search },
];

export function getAdminNavItem(path: string): AdminNavItem {
  const pathname = path.split('?')[0] || '/';
  const systemItem = ADMIN_SYSTEM_NAV_ITEMS.find((item) => pathname === item.href);
  if (systemItem) return systemItem;

  return ADMIN_NAV_ITEMS.find((item) => (
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
  )) ?? ADMIN_NAV_ITEMS[0];
}

export function getAdminTabOptions(path: string) {
  const normalizedPath = path || '/';
  const pathname = normalizedPath.split('?')[0] || '/';
  const item = getAdminNavItem(normalizedPath);

  return {
    id: pathname === '/' ? 'home' : pathname.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, ''),
    title: pathname === '/' ? '홈' : item.label,
    path: normalizedPath,
    closable: pathname !== '/',
  };
}

export function getAdminTabIcon(path: string) {
  return getAdminNavItem(path).icon;
}
