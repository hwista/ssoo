'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAccessStore } from '@/stores';
import { CMS_SHELL_NAV_ITEMS, getCmsShellSection } from './shell-navigation';
import { CMS_SHELL_SIZES } from '@/lib/constants/layout';

export function SecondaryStrip() {
  const pathname = usePathname();
  const currentSection = getCmsShellSection(pathname);
  const currentItem = CMS_SHELL_NAV_ITEMS.find((item) => item.key === currentSection);
  const canReadFeed = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);

  return (
    <div
      className="flex items-end border-b border-gray-200 bg-gray-50 px-3"
      style={{ height: CMS_SHELL_SIZES.secondaryStrip.containerHeight }}
    >
      <div className="flex flex-1 items-end overflow-x-auto">
        {CMS_SHELL_NAV_ITEMS.map((item) => {
          const isActive = item.key === currentSection;
          const isDisabled = item.requiresFeedAccess && !canReadFeed;
          const Icon = item.icon;

          return isDisabled ? (
            <span
              key={item.key}
              className="flex h-control-h items-center gap-1.5 border-b-2 border-b-transparent px-3 text-xs text-gray-400"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </span>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex h-control-h items-center gap-1.5 border-b-2 px-3 text-sm transition-colors',
                isActive
                  ? 'border-b-ls-red bg-ssoo-content-border text-ssoo-primary'
                  : 'border-b-transparent text-gray-600 hover:bg-gray-100 hover:text-ssoo-primary'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="hidden h-control-h items-center pl-4 text-xs text-gray-500 lg:flex">
        {currentItem?.description}
      </div>
    </div>
  );
}
