'use client';

import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

interface UserMenuProps {
  /** 드롭다운 너비 (부모 액션 영역 기준) */
  dropdownWidth?: number;
}

/**
 * 사용자 프로필 드롭다운 메뉴 (DMS)
 * - 인증 미구현 상태: 더미 사용자 정보 표시
 * - 설정 / 로그아웃 (준비 중)
 */
export function UserMenu({ dropdownWidth }: UserMenuProps) {
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
        className="bg-ssoo-primary text-white border-white/20"
        style={dropdownWidth ? { width: dropdownWidth } : { width: 208 }}
      >
        {/* 사용자 정보 */}
        <DropdownMenuLabel className="font-normal px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium text-white truncate">admin</p>
              <p className="text-xs text-white/60 truncate">관리자</p>
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
          disabled
          className="text-white/40 focus:bg-white/10 focus:text-white px-3 py-2"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
          <span className="ml-auto text-xs text-white/40">준비 중</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
