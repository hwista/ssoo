'use client';

import { Briefcase, Globe, Linkedin, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyProfile, useUserProfile } from '@/hooks/queries/useProfiles';

interface ProfilePageProps {
  userId?: string;
}

export function ProfilePage({ userId }: ProfilePageProps) {
  const myProfile = useMyProfile();
  const otherProfile = useUserProfile(userId || '');
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
  const initials = user?.displayName?.slice(0, 2) || user?.userName?.slice(0, 2) || '?';

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
            <h1 className="text-xl font-bold">{user?.displayName || user?.userName}</h1>
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
                  <span><strong>{profile.followStats.followersCount}</strong> 팔로워</span>
                  <span><strong>{profile.followStats.followingCount}</strong> 팔로잉</span>
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

      {/* Skills Card */}
      {profile.skills && profile.skills.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">스킬</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {profile.skills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{skill.skillName}</span>
                  <Badge variant="outline" className="ml-2 text-xs">{skill.skillCategory}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ssoo-primary rounded-full"
                      style={{ width: `${(skill.proficiencyLevel / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{skill.endorsementCount} 추천</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Career Card */}
      {profile.careers && profile.careers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">프로젝트 이력</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {profile.careers.map((career, i) => (
              <div key={career.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div>
                  <h4 className="text-sm font-semibold">{career.projectName}</h4>
                  <p className="text-xs text-muted-foreground">{career.roleName}</p>
                  {career.companyName && <p className="text-xs text-muted-foreground">{career.companyName}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(career.startDate).toLocaleDateString('ko-KR')} ~{' '}
                    {career.endDate ? new Date(career.endDate).toLocaleDateString('ko-KR') : '현재'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
