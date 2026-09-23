'use client';

import { useTaskAssignees } from '@/hooks/queries/usePmsSettings';
import { Button, NativeSelect } from '@ssoo/web-ui';

export function TaskAssigneeSelect({ projectId, value, label, disabled, onChange }: {
  projectId: string; value?: string | null; label?: string; disabled?: boolean; onChange: (value: string | null) => void;
}) {
  const query = useTaskAssignees(projectId);
  const candidates = query.data ?? [];
  if (disabled) return <span className="text-muted-foreground">{label || '미지정'}</span>;
  return (
    <div className="min-w-28">
      <NativeSelect aria-label="작업 담당자" value={value || ''} disabled={query.isPending || query.isError} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">미지정</option>
        {value && !candidates.some((item) => item.userId === value) && <option value={value}>{label || '기존 담당자'}</option>}
        {candidates.map((item) => <option key={item.userId} value={item.userId}>{item.label}</option>)}
      </NativeSelect>
      {query.isError && <div role="alert" className="text-xs text-destructive">담당자를 불러오지 못했습니다. <Button size="sm" variant="ghost" onClick={() => query.refetch()}>다시 시도</Button></div>}
    </div>
  );
}
