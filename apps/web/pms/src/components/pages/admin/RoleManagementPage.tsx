'use client';

import { UserCog } from 'lucide-react';

export function RoleManagementPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <UserCog className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h2 className="text-lg font-semibold text-gray-700 mb-2">역할 관리</h2>
      <p className="text-sm text-muted-foreground">역할 관리 기능 준비 중</p>
    </div>
  );
}
