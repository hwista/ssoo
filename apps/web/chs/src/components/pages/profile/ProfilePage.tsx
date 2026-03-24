'use client';

import { useState } from 'react';
import { Briefcase, Globe, Linkedin, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollow, useUnfollow } from '@/hooks/queries/useFollows';
import { useMyProfile, useUserProfile } from '@/hooks/queries/useProfiles';
import { useAuthStore } from '@/stores/auth.store';
import { FollowListDialog } from './FollowListDialog';
import { SkillSection } from './SkillSection';
import { CareerSection } from './CareerSection';

interface ProfilePageProps {
  userId?: string;
}

export function ProfilePage({ userId }: ProfilePageProps) {
  const currentUser = useAuthStore((state) => state.user);
  const myProfile = useMyProfile();
  const otherProfile = useUserProfile(userId || '');
  const follow = useFollow();
  const unfollow = useUnfollow();
  const [followDialogType, setFollowDialogType] = useState<'followers' | 'following' | null>(null);
  const { data, isLoading } = userId && userId !== 'me' ? otherProfile : myProfile;
  const profile = data?.data?.data;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">프로필을 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = profile.user;
  const isOwnProfile = currentUser?.userId === profile.userId;
  const initials = user?.displayName?.slice(0, 2) || user?.userName?.slice(0, 2) || '?';

  const handleFollowToggle = async () => {
    if (isOwnProfile) {
      return;
    }

    try {
      if (profile.followStats?.isFollowing) {
        await unfollow.mutateAsync(profile.userId);
        return;
      }

      await follow.mutateAsync(profile.userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '팔로우 상태 변경에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Profile Header Card */}
      <Card>
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-ssoo-primary to-ssoo-secondary rounded-t-lg" />
        <CardContent className="relative pt-0 pb-4">
          <Avatar className="h-24 w-24 -mt-12 border-4 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold">{user?.displayName || user?.userName}</h1>
              {!isOwnProfile && (
                <Button
                  variant={profile.followStats?.isFollowing ? 'outline' : 'default'}
                  size="sm"
                  disabled={follow.isPending || unfollow.isPending}
                  onClick={() => void handleFollowToggle()}
                >
                  {profile.followStats?.isFollowing ? '팔로잉' : '팔로우'}
                </Button>
              )}
            </div>
            {user?.positionCode && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {user.positionCode}
                {user.departmentCode && ` · ${user.departmentCode}`}
              </p>
            )}
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {profile.followStats && (
                <>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setFollowDialogType('followers')}
                  >
                    <strong>{profile.followStats.followersCount}</strong> 팔로워
                  </button>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setFollowDialogType('following')}
                  >
                    <strong>{profile.followStats.followingCount}</strong> 팔로잉
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              {profile.linkedinUrl && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4" /></a>
                </Button>
              )}
              {profile.websiteUrl && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /></a>
                </Button>
              )}
              {user?.email && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`mailto:${user.email}`}><Mail className="h-4 w-4" /></a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SkillSection skills={profile.skills ?? []} isOwnProfile={Boolean(isOwnProfile)} />
      <CareerSection careers={profile.careers ?? []} isOwnProfile={Boolean(isOwnProfile)} />
      {followDialogType && (
        <FollowListDialog
          userId={profile.userId}
          type={followDialogType}
          open={Boolean(followDialogType)}
          onOpenChange={(open) => {
            if (!open) {
              setFollowDialogType(null);
            }
          }}
        />
      )}
    </div>
  );
}
