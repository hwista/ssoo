'use client';

import { Menu } from 'lucide-react';

export function MenuManagementPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Menu className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h2 className="text-lg font-semibold text-gray-700 mb-2">메뉴 관리</h2>
      <p className="text-sm text-muted-foreground">메뉴 관리 기능 준비 중</p>
    </div>
  );
}
