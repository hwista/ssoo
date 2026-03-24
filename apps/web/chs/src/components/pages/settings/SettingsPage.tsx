'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/common/StateDisplay';
import { useMyProfile, useUpdateProfile } from '@/hooks/queries/useProfiles';

interface ProfileSettingsForm {
  bio: string;
  coverImageUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
}

export function SettingsPage() {
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<ProfileSettingsForm>({
    bio: '',
    coverImageUrl: '',
    linkedinUrl: '',
    websiteUrl: '',
  });

  useEffect(() => {
    const profile = profileQuery.data?.data?.data;
    if (!profile) return;

    setForm({
      bio: profile.bio ?? '',
      coverImageUrl: profile.coverImageUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      websiteUrl: profile.websiteUrl ?? '',
    });
  }, [profileQuery.data?.data?.data]);

  const handleChange = (
    key: keyof ProfileSettingsForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        bio: form.bio.trim() || undefined,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
      });
      toast.success('프로필 설정이 저장되었습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast.error(message);
    }
  };

  if (profileQuery.isLoading) {
    return <LoadingState fullHeight message="프로필 설정을 불러오는 중..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold mb-4">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 설정</CardTitle>
          <CardDescription>
            CHS 프로필에 노출되는 정보를 수정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">소개</label>
            <Textarea
              rows={5}
              value={form.bio}
              onChange={(event) => handleChange('bio', event.target.value)}
              placeholder="자신을 소개하는 내용을 입력하세요."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">커버 이미지 URL</label>
            <Input
              value={form.coverImageUrl}
              onChange={(event) =>
                handleChange('coverImageUrl', event.target.value)
              }
              placeholder="https://example.com/cover.png"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">LinkedIn URL</label>
            <Input
              value={form.linkedinUrl}
              onChange={(event) =>
                handleChange('linkedinUrl', event.target.value)
              }
              placeholder="https://www.linkedin.com/in/your-profile"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">개인 웹사이트 URL</label>
            <Input
              value={form.websiteUrl}
              onChange={(event) =>
                handleChange('websiteUrl', event.target.value)
              }
              placeholder="https://your-site.example"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSave()} disabled={updateProfile.isPending}>
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림 설정</CardTitle>
          <CardDescription>
            알림 세부 설정은 서버 계약이 준비되면 제공될 예정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            현재는 프로필 편집만 저장할 수 있으며, 알림 토글은 추후 서버 설정 API와 함께 제공됩니다.
          </p>
          <Separator />
          <Button variant="outline" size="sm" disabled>
            향후 제공 예정
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
