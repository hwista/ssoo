'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-title-subsection mb-4">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-control-lg">알림 설정</CardTitle>
          <CardDescription>알림 수신 방법을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm">새 댓글 알림</span>
            <Button variant="outline" size="sm">활성</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-body-sm">멘션 알림</span>
            <Button variant="outline" size="sm">활성</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-body-sm">팔로우 알림</span>
            <Button variant="outline" size="sm">활성</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-control-lg">프로필 공개 설정</CardTitle>
          <CardDescription>프로필 정보 공개 범위를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm">이메일 공개</span>
            <Button variant="outline" size="sm">비공개</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-body-sm">스킬맵 공개</span>
            <Button variant="outline" size="sm">전체 공개</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
