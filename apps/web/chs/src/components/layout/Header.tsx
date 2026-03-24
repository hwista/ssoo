'use client';

import { KeyboardEvent, useState } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadCount } from '@/hooks/queries/useNotifications';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationDropdown } from './NotificationDropdown';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const unreadCountQuery = useUnreadCount();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const keyword = searchQuery.trim();
    router.push(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search');
  };

  const initials = user?.loginId?.slice(0, 2)?.toUpperCase() || '?';
  const unreadCount = unreadCountQuery.data?.data?.data?.count ?? 0;

  return (
    <header className="h-[60px] border-b bg-white flex items-center px-4 gap-4 shrink-0">
      <div
        className="font-bold text-lg text-ssoo-primary cursor-pointer select-none"
        onClick={() => router.push('/')}
      >
        SSOO{' '}
        <span className="text-xs font-normal text-muted-foreground">CHS</span>
      </div>

      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사람, 게시물, 스킬 검색..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
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
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <Bell className="h-5 w-5" />
          </Button>
          <NotificationDropdown
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        <Avatar
          className="h-8 w-8 cursor-pointer"
          onClick={() => router.push('/profile/me')}
        >
          <AvatarImage src={undefined} />
          <AvatarFallback className="text-xs bg-ssoo-primary text-white">
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
