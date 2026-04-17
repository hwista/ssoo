'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAccessStore } from '@/stores';
import { CMS_SHELL_NAV_ITEMS, getCmsShellSection } from './shell-navigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = getCmsShellSection(pathname);
  const canReadFeed = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);

  return (
    <aside className="group/sidebar fixed left-0 top-0 z-40 flex h-full w-14 flex-col overflow-hidden border-r border-ssoo-content-border bg-ssoo-content-bg transition-[width,box-shadow] duration-300 hover:w-[340px] hover:shadow-xl">
      <div className="flex h-header-h items-center gap-3 border-b border-white/10 bg-ssoo-primary px-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex min-w-0 items-center gap-3 overflow-hidden text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white text-sm font-bold text-ssoo-primary">
            S
          </div>
          <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            <p className="truncate text-sm font-semibold text-white">SSOO CMS</p>
            <p className="truncate text-[11px] text-white/70">Content Management System</p>
          </div>
        </button>
      </div>

      <div className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {CMS_SHELL_NAV_ITEMS.map((item) => {
            const isActive = currentSection === item.key;
            const isDisabled = item.requiresFeedAccess && !canReadFeed;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }
                  router.push(item.href);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  isActive
                    ? 'bg-ssoo-sitemap-bg text-ssoo-primary'
                    : 'text-gray-600 hover:bg-ssoo-sitemap-bg/70 hover:text-ssoo-primary',
                  isDisabled && 'cursor-not-allowed opacity-50'
                )}
                title={item.label}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-ssoo-primary' : 'text-ssoo-primary/80')} />
                <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  <div className="truncate text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-ssoo-content-border px-3 py-3 text-[10px] text-gray-400">
        <div className="group-hover/sidebar:hidden">CMS</div>
        <div className="hidden space-y-0.5 group-hover/sidebar:block">
          <div className="text-xs font-medium text-gray-600">SSOO CMS</div>
          <div>Icon rail + hover reveal shell</div>
        </div>
      </div>
    </aside>
  );
}
