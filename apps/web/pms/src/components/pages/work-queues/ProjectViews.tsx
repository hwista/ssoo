'use client';

import type { Project } from '@/lib/api/endpoints/projects';
import { formatProjectCustomerName, formatProjectExecutionAssetLabel } from '@/lib/project-display';
import { formatPmsDate } from '@/lib/pms-format';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const STATUS_LABELS = { request: '요청/인계', proposal: '제안 참조', execution: '수행', transition: '종료/전환' };
const STAGE_LABELS = { waiting: '대기', in_progress: '진행중', done: '완료' };

function period(project: Project) {
  const stage = project.projectStatuses?.find((item) => item.statusCode === project.statusCode);
  const start = stage?.expectedStartAt ? Date.parse(stage.expectedStartAt) : NaN;
  const end = stage?.expectedEndAt ? Date.parse(stage.expectedEndAt) : NaN;
  const valid = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  return { start, end, valid, label: valid
    ? `${formatPmsDate(stage!.expectedStartAt)} ~ ${formatPmsDate(stage!.expectedEndAt)}`
    : !stage?.expectedStartAt && !stage?.expectedEndAt ? '일정 미정' : '기간 확인 필요' };
}

export function ProjectViews({ projects, view, onOpen }: {
  projects: Project[]; view: 'list' | 'timeline'; onOpen: (project: Project) => void;
}) {
  if (view === 'list') return (
    <div className="overflow-x-auto rounded-lg border bg-card" aria-label="내 프로젝트 목록">
      <Table className="min-w-[960px] table-fixed">
        <TableHeader><TableRow>
          <TableHead className="w-[240px]">프로젝트</TableHead><TableHead className="w-[160px]">단계 / 상태</TableHead><TableHead className="w-[320px]">고객사 / 자산</TableHead><TableHead className="w-[100px]">담당자</TableHead><TableHead className="w-[140px]">최근 수정</TableHead>
        </TableRow></TableHeader>
        <TableBody>{projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell><Button variant="link" size="plain" className="block w-full whitespace-normal break-words px-4 py-2 text-left" onClick={() => onOpen(project)}>{project.projectName}</Button><p className="text-xs text-muted-foreground">PRJ-{String(project.id).padStart(6, '0')}</p></TableCell>
            <TableCell className="whitespace-nowrap">{STATUS_LABELS[project.statusCode]} / {STAGE_LABELS[project.stageCode]}</TableCell>
            <TableCell className="break-words">{formatProjectCustomerName(project)} / {formatProjectExecutionAssetLabel(project)}</TableCell>
            <TableCell className="whitespace-nowrap">{project.currentOwnerUserId ? '지정됨' : '미지정'}</TableCell>
            <TableCell className="whitespace-nowrap">{formatPmsDate(project.updatedAt)}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );

  const rows = projects.map((project) => ({ project, ...period(project) }));
  const dated = rows.filter((row) => row.valid);
  const min = dated.length ? Math.min(...dated.map((row) => row.start)) : 0;
  const max = dated.length ? Math.max(...dated.map((row) => row.end)) : 0;
  const span = Math.max(max - min, 86_400_000);
  return (
    <div className="space-y-3" aria-label="내 프로젝트 타임라인">
      <p className="text-sm text-muted-foreground">현재 단계의 예정 기간입니다. 일정이 없는 프로젝트도 아래에 표시합니다.</p>
      {dated.length > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>{formatPmsDate(new Date(min).toISOString())}</span><span>{formatPmsDate(new Date(max).toISOString())}</span></div>}
      {rows.map((row) => (
        <div key={row.project.id} className="rounded-lg border bg-card p-3">
          <Button variant="link" size="plain" className="block max-w-full whitespace-normal break-words px-4 py-2 text-left" onClick={() => onOpen(row.project)}>{row.project.projectName}</Button>
          <p className="text-xs text-muted-foreground">PRJ-{String(row.project.id).padStart(6, '0')} · {STATUS_LABELS[row.project.statusCode]} · {STAGE_LABELS[row.project.stageCode]} · {row.label}</p>
          {row.valid && <svg viewBox="0 0 1000 20" preserveAspectRatio="none" className="mt-2 h-5 w-full" role="img" aria-label={`${row.project.projectName} 예정 기간 ${row.label}`}>
            <rect x="0" y="6" width="1000" height="8" rx="4" className="fill-muted" />
            <rect x={((row.start - min) / span) * 984} y="3" width={Math.max(8, ((row.end - row.start) / span) * 984)} height="14" rx="4" className="fill-ssoo-primary" />
          </svg>}
        </div>
      ))}
    </div>
  );
}
