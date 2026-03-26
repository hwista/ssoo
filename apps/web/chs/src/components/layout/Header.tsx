'use client';

import { Search, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const initials = user?.loginId?.slice(0, 2)?.toUpperCase() || '?';

  return (
    <header className="h-[60px] border-b bg-white flex items-center px-4 gap-4 shrink-0">
      <div
        className="text-title-card text-ssoo-primary cursor-pointer select-none"
        onClick={() => router.push('/')}
      >
        SSOO{' '}
        <span className="text-caption font-normal text-muted-foreground">CHS</span>
      </div>

      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사람, 게시물, 스킬 검색..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            onFocus={() => router.push('/search')}
            readOnly
          />
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          피드
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/board')}
        >
          게시판
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/search')}
        >
          전문가
        </Button>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        <Avatar
          className="h-8 w-8 cursor-pointer"
          onClick={() => router.push('/profile/me')}
        >
          <AvatarImage src={undefined} />
          <AvatarFallback className="text-caption bg-ssoo-primary text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
