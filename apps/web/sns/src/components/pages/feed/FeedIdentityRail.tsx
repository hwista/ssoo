'use client';

import Link from 'next/link';
import { Bookmark, LayoutGrid, Search, Settings, UserRound } from 'lucide-react';
import { useMyProfile } from '@/hooks/queries/useProfiles';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const QUICK_LINKS = [
  { href: APP_HOME_PATH, label: '내 피드', icon: Bookmark },
  { href: '/board', label: '게시판', icon: LayoutGrid },
  { href: '/search', label: '전문가 검색', icon: Search },
  { href: '/profile/me', label: '내 프로필', icon: UserRound },
  { href: '/settings', label: '설정', icon: Settings },
] as const;

export function FeedIdentityRail() {
  const authUser = useAuthStore((state) => state.user);
  const { data, isLoading } = useMyProfile();
  const profile = data?.data?.data;
  const user = profile?.user;
  const initials =
    user?.displayName?.slice(0, 2) ||
    authUser?.displayName?.slice(0, 2) ||
    user?.userName?.slice(0, 2) ||
    authUser?.userName?.slice(0, 2) ||
    authUser?.loginId?.slice(0, 2) ||
    '?';
  const topSkills = profile?.skills?.slice(0, 3) ?? [];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-ssoo-primary to-ssoo-secondary" />
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          <Avatar className="-mt-8 h-16 w-16 border-4 border-background shadow-sm">
            <AvatarImage src={user?.avatarUrl || authUser?.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white">{initials}</AvatarFallback>
          </Avatar>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">
                  {user?.displayName || authUser?.displayName || user?.userName || authUser?.userName || authUser?.loginId}
                </h2>
                {(user?.positionCode || user?.departmentCode) && (
                  <p className="text-sm text-muted-foreground">
                    {[user?.positionCode, user?.departmentCode].filter(Boolean).join(' · ')}
                  </p>
                )}
                {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                <div>
                  <div className="text-lg font-semibold">{profile?.followStats?.followersCount ?? 0}</div>
                  <div className="text-xs text-muted-foreground">팔로워</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{profile?.skills?.length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">보유 스킬</div>
                </div>
              </div>

              {topSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topSkills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-xs">
                      #{skill.skillName}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">바로 가기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
