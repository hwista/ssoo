'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const STORAGE_KEY = 'cms-user-settings';

interface CmsSettings {
  notifyComments: boolean;
  notifyMentions: boolean;
  notifyFollows: boolean;
  showEmail: boolean;
  showSkillMap: boolean;
}

const DEFAULTS: CmsSettings = {
  notifyComments: true,
  notifyMentions: true,
  notifyFollows: true,
  showEmail: false,
  showSkillMap: true,
};

function loadSettings(): CmsSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<CmsSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const toggle = useCallback((key: keyof CmsSettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">설정</h1>
        {saved && <span className="text-xs text-emerald-600">저장됨</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림 설정</CardTitle>
          <CardDescription>알림 수신 방법을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow label="새 댓글 알림" active={settings.notifyComments} onToggle={() => toggle('notifyComments')} />
          <Separator />
          <ToggleRow label="멘션 알림" active={settings.notifyMentions} onToggle={() => toggle('notifyMentions')} />
          <Separator />
          <ToggleRow label="팔로우 알림" active={settings.notifyFollows} onToggle={() => toggle('notifyFollows')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 공개 설정</CardTitle>
          <CardDescription>프로필 정보 공개 범위를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow label="이메일 공개" active={settings.showEmail} onToggle={() => toggle('showEmail')} />
          <Separator />
          <ToggleRow label="스킬맵 공개" active={settings.showSkillMap} onToggle={() => toggle('showSkillMap')} />
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Button variant={active ? 'default' : 'outline'} size="sm" onClick={onToggle}>
        {active ? '활성' : '비활성'}
      </Button>
    </div>
  );
}
