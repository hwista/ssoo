'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  Settings,
  FileText,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/organizations', label: '조직 관리', icon: Building2 },
  { href: '/roles', label: '역할 & 권한', icon: Shield },
  { href: '/dms', label: 'DMS 관리', icon: FileText },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      {/* 로고 */}
      <div className="flex h-[60px] items-center border-b px-5">
        <Link href="/" className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-base font-bold text-foreground">SSOO Admin</span>
        </Link>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 */}
      <div className="border-t p-3 text-center text-xs text-muted-foreground">
        SSOO System Admin
      </div>
    </aside>
  );
}
