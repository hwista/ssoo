'use client';

import type { AuthIdentity } from '@ssoo/types/common';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AuthUserMenuAction {
  key: string;
  label: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void | Promise<void>;
}

export interface AuthUserMenuProps {
  user: Pick<AuthIdentity, 'loginId'> | null;
  dropdownWidth?: number;
  onLogout: () => void | Promise<void>;
  actions?: AuthUserMenuAction[];
  fallbackLoginId?: string;
  secondaryLabel?: string | null;
  fallbackSecondaryLabel?: string | null;
}

export function AuthUserMenu({
  user,
  dropdownWidth,
  onLogout,
  actions = [],
  fallbackLoginId = '사용자',
  secondaryLabel,
  fallbackSecondaryLabel = null,
}: AuthUserMenuProps) {
  const loginId = user?.loginId ?? fallbackLoginId;
  const resolvedSecondaryLabel = secondaryLabel ?? fallbackSecondaryLabel;

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex h-control-h cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <ChevronDown className="h-3 w-3 text-white/70" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-md border border-white/20 bg-ssoo-primary p-1 text-white shadow-md"
          style={dropdownWidth ? { width: dropdownWidth } : { width: 208 }}
        >
          <DropdownMenuPrimitive.Label className="px-3 py-2.5 font-normal">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium text-white">{loginId}</p>
                {resolvedSecondaryLabel ? (
                  <p className="truncate text-xs text-white/60">{resolvedSecondaryLabel}</p>
                ) : null}
              </div>
            </div>
          </DropdownMenuPrimitive.Label>

          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-white/15" />

          {actions.map((action, index) => {
            const Icon = action.icon;

            return (
              <div key={action.key}>
                <DropdownMenuPrimitive.Item
                  disabled={action.disabled}
                  onSelect={() => {
                    if (action.disabled) {
                      return;
                    }
                    void action.onSelect?.();
                  }}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-white outline-none transition-colors focus:bg-white/10 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:cursor-default data-[disabled]:opacity-50 [&>svg]:shrink-0"
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span>{action.label}</span>
                  {action.trailing}
                </DropdownMenuPrimitive.Item>
                {index < actions.length - 1 ? (
                  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-white/15" />
                ) : null}
              </div>
            );
          })}

          {actions.length > 0 ? (
            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-white/15" />
          ) : null}

          <DropdownMenuPrimitive.Item
            onSelect={() => {
              void onLogout();
            }}
            className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-white outline-none transition-colors focus:bg-white/10 focus:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
