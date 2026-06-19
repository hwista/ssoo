'use client';

import type { AuthIdentity } from '@ssoo/types/common';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { resolveCurrentSsooAccountCenterHref } from './account-center';
import { Button } from '@ssoo/web-ui';

const DEFAULT_AUTH_USER_MENU_DROPDOWN_WIDTH = 256;

export interface AuthUserMenuAction {
  key: string;
  label: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void | Promise<void>;
}

export interface AuthUserMenuAccountCenter {
  href?: string;
  snsAppUrl?: string | null;
  path?: string | null;
  label?: ReactNode;
  disabled?: boolean;
  includeReturnTo?: boolean;
  onSelect?: (href: string) => void | Promise<void>;
}

export interface AuthUserMenuUserSurfaceAction {
  label?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void | Promise<void>;
}

export interface AuthUserMenuUserSurfaces {
  myProfile?: false | AuthUserMenuUserSurfaceAction;
  personalSettings?: false | AuthUserMenuUserSurfaceAction;
}

export interface AuthUserMenuProps {
  user: Pick<AuthIdentity, 'loginId' | 'userName'> | null;
  dropdownWidth?: number;
  onLogout: () => void | Promise<void>;
  accountCenter?: AuthUserMenuAccountCenter;
  userSurfaces?: AuthUserMenuUserSurfaces;
  actions?: AuthUserMenuAction[];
  fallbackLoginId?: string;
  secondaryLabel?: string | null;
  fallbackSecondaryLabel?: string | null;
}

export function AuthUserMenu({
  user,
  dropdownWidth,
  onLogout,
  accountCenter,
  userSurfaces,
  actions = [],
  fallbackLoginId = '사용자',
  secondaryLabel,
  fallbackSecondaryLabel = null,
}: AuthUserMenuProps) {
  const loginId = user?.loginId ?? fallbackLoginId;
  const displayName = user?.userName?.trim() || loginId;
  const resolvedSecondaryLabel = secondaryLabel ?? fallbackSecondaryLabel;
  const buildSurfaceAction = (
    key: string,
    icon: LucideIcon,
    defaultLabel: ReactNode,
    config: AuthUserMenuUserSurfaceAction,
  ): AuthUserMenuAction => ({
    key,
    label: config.label ?? defaultLabel,
    icon,
    disabled: config.disabled,
    onSelect: async () => {
      if (config.onSelect) {
        await config.onSelect();
      }
    },
  });
  const resolvedUserSurfaceActions = userSurfaces
    ? [
      ...(userSurfaces.myProfile === false
        ? []
        : [buildSurfaceAction(
          'my-profile',
          User,
          '내 프로필',
          userSurfaces.myProfile ?? {},
        )]),
      ...(userSurfaces.personalSettings === false
        ? []
        : [buildSurfaceAction(
          'personal-settings',
          Settings,
          '내 설정',
          userSurfaces.personalSettings ?? {},
        )]),
    ]
    : [];
  const resolvedActions = [
    ...resolvedUserSurfaceActions,
    ...(!userSurfaces && accountCenter
      ? [{
        key: 'account-center',
        label: accountCenter.label ?? '내 계정',
        icon: User,
        disabled: accountCenter.disabled,
        onSelect: async () => {
          const href = accountCenter.href ?? resolveCurrentSsooAccountCenterHref({
            snsAppUrl: accountCenter.snsAppUrl,
            path: accountCenter.path,
            includeReturnTo: accountCenter.includeReturnTo,
          });

          if (accountCenter.onSelect) {
            await accountCenter.onSelect(href);
            return;
          }

          if (typeof window !== 'undefined') {
            window.location.assign(href);
          }
        },
      } satisfies AuthUserMenuAction]
      : []),
    ...actions,
  ];

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button variant="plain" size="plain"
          type="button"
          className="flex h-control-h cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="max-w-[80px] truncate text-sm font-medium text-white">{displayName}</span>
          <ChevronDown className="h-3 w-3 text-white/70" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-md border border-white/20 bg-ssoo-primary p-1 text-white shadow-md"
          style={{ width: dropdownWidth ?? DEFAULT_AUTH_USER_MENU_DROPDOWN_WIDTH }}
        >
          <DropdownMenuPrimitive.Label className="px-3 py-2.5 font-normal">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                {resolvedSecondaryLabel ? (
                  <p className="truncate text-xs text-white/60">{resolvedSecondaryLabel}</p>
                ) : null}
              </div>
            </div>
          </DropdownMenuPrimitive.Label>

          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-white/15" />

          {resolvedActions.map((action, index) => {
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
                {index < resolvedActions.length - 1 ? (
                  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-white/15" />
                ) : null}
              </div>
            );
          })}

          {resolvedActions.length > 0 ? (
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
