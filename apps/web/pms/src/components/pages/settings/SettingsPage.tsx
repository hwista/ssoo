'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'pms-user-settings';

interface PmsSettings {
  showCompletedTasks: boolean;
  defaultProjectView: 'board' | 'list' | 'timeline';
  notifyTaskAssignment: boolean;
  notifyIssueUpdate: boolean;
}

const DEFAULTS: PmsSettings = {
  showCompletedTasks: false,
  defaultProjectView: 'board',
  notifyTaskAssignment: true,
  notifyIssueUpdate: true,
};

function loadSettings(): PmsSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<PmsSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback(<K extends keyof PmsSettings>(key: K, value: PmsSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
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
          <CardTitle className="text-base">프로젝트 표시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">완료된 작업 표시</span>
            <Button
              variant={settings.showCompletedTasks ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('showCompletedTasks', !settings.showCompletedTasks)}
            >
              {settings.showCompletedTasks ? '표시' : '숨김'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">기본 프로젝트 보기</span>
            <div className="flex gap-1">
              {(['board', 'list', 'timeline'] as const).map((v) => (
                <Button
                  key={v}
                  variant={settings.defaultProjectView === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update('defaultProjectView', v)}
                >
                  {v === 'board' ? '보드' : v === 'list' ? '목록' : '타임라인'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">작업 배정 알림</span>
            <Button
              variant={settings.notifyTaskAssignment ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('notifyTaskAssignment', !settings.notifyTaskAssignment)}
            >
              {settings.notifyTaskAssignment ? '활성' : '비활성'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">이슈 변경 알림</span>
            <Button
              variant={settings.notifyIssueUpdate ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('notifyIssueUpdate', !settings.notifyIssueUpdate)}
            >
              {settings.notifyIssueUpdate ? '활성' : '비활성'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
