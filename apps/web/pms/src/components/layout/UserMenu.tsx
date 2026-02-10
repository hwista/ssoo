'use client';

import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 사용자 프로필 드롭다운 메뉴
 * - 사용자 정보 표시 (loginId, roleCode)
 * - 설정 (준비 중)
 * - 로그아웃
 */
export function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-control-h px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors cursor-pointer">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <ChevronDown className="w-3 h-3 text-white/70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="w-52 bg-ssoo-primary text-white border-white/20"
      >
        {/* 사용자 정보 */}
        <DropdownMenuLabel className="font-normal px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.loginId ?? '사용자'}</p>
              <p className="text-xs text-white/60 truncate">{user?.roleCode ?? ''}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/15" />

        {/* 설정 */}
        <DropdownMenuItem
          disabled
          className="text-white/40 focus:bg-white/10 focus:text-white px-3 py-2"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>설정</span>
          <span className="ml-auto text-xs text-white/40">준비 중</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/15" />

        {/* 로그아웃 */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-white focus:bg-white/10 focus:text-white px-3 py-2 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
