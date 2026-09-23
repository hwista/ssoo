'use client';

import type { PmsUserSettings } from '@ssoo/types';
import { usePmsSettings, useUpdatePmsSettings } from '@/hooks/queries/usePmsSettings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SettingsPage() {
  const query = usePmsSettings();
  const save = useUpdatePmsSettings();
  const settings = query.data;
  const update = (patch: Partial<PmsUserSettings>) => save.mutate(patch);

  if (!settings) return (
    <div className="p-4" role="status">
      {query.isError ? <>설정을 불러오지 못했습니다. <Button variant="outline" onClick={() => query.refetch()}>다시 시도</Button></> : '설정을 불러오는 중입니다.'}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">프로젝트 사용 설정</h1>
      <p className="text-sm text-muted-foreground">내 계정에 저장되며 다른 기기에서도 적용됩니다.</p>
      <div role="status" aria-live="polite" className="text-sm">
        {save.isPending ? '저장 중…' : save.isError ? (
          <div className="text-destructive">저장하지 못했습니다. 기존 설정을 유지합니다. <Button variant="outline" size="sm" onClick={() => save.variables && update(save.variables)}>저장 다시 시도</Button></div>
        ) : save.isSuccess ? '저장됨' : null}
        {query.isError && <p className="text-destructive">최신 설정을 확인하지 못했습니다. <Button variant="outline" size="sm" onClick={() => query.refetch()}>새로 확인</Button></p>}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">프로젝트 표시</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">완료된 작업 표시</span>
            <Button aria-label="완료된 작업 표시" aria-pressed={settings.showCompletedTasks} disabled={save.isPending} variant={settings.showCompletedTasks ? 'default' : 'outline'} size="sm" onClick={() => update({ showCompletedTasks: !settings.showCompletedTasks })}>
              {settings.showCompletedTasks ? '표시' : '숨김'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">프로젝트의 작업 목록에 적용합니다. 전체 집계와 공수 기록은 유지합니다.</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">내 프로젝트 기본 보기</span>
            <div className="flex flex-wrap gap-1">
              {(['board', 'list', 'timeline'] as const).map((view) => (
                <Button key={view} aria-pressed={settings.defaultProjectView === view} disabled={save.isPending} variant={settings.defaultProjectView === view ? 'default' : 'outline'} size="sm" onClick={() => update({ defaultProjectView: view })}>
                  {view === 'board' ? '보드' : view === 'list' ? '목록' : '타임라인'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">업무 알림</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([['notifyTaskAssignment', '작업 배정 알림'], ['notifyIssueUpdate', '이슈 변경 알림']] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{label}</span>
              <Button aria-label={label} aria-pressed={settings[key]} disabled={save.isPending} variant={settings[key] ? 'default' : 'outline'} size="sm" onClick={() => update({ [key]: !settings[key] })}>
                {settings[key] ? '켜짐' : '꺼짐'}
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">끄면 이후 해당 알림을 받지 않습니다. 이미 받은 알림과 다른 종류의 알림은 유지됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
