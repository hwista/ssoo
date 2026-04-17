'use client';

import { useState } from 'react';
import { GitBranchPlus, Link2, Plus, X } from 'lucide-react';
import {
  useCreateProjectRelation,
  useProjectAccess,
  useProjectRelations,
  useRemoveProjectRelation,
} from '@/hooks/queries';
import type { ProjectRelationItem } from '@/lib/api/endpoints/projects';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirmStore } from '@/stores/confirm.store';

const PROJECT_RELATION_COMPAT_SOURCE = 'pms-project-relation-compat';

const OUTGOING_LABELS = {
  successor: '후속 프로젝트',
  split: '분리된 프로젝트',
  merge: '병합 대상',
  linked: '연결 프로젝트',
} as const;

const INCOMING_LABELS = {
  successor: '선행 프로젝트',
  split: '분리 원본',
  merge: '병합 원본',
  linked: '연결 프로젝트',
} as const;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface RelationsSectionProps {
  projectId: number;
}

export function RelationsSection({ projectId }: RelationsSectionProps) {
  const [targetProjectId, setTargetProjectId] = useState('');
  const { data, isLoading, error } = useProjectRelations(projectId);
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;
  const createProjectRelation = useCreateProjectRelation();
  const removeProjectRelation = useRemoveProjectRelation();
  const { confirm } = useConfirmStore();
  const relations = data?.data ?? [];

  const handleAdd = async () => {
    const trimmedTargetProjectId = targetProjectId.trim();

    if (!/^\d+$/.test(trimmedTargetProjectId)) {
      toast.error('대상 프로젝트 ID 형식을 확인해주세요.', {
        description: '연결 프로젝트는 숫자 프로젝트 ID 로만 추가할 수 있습니다.',
      });
      return;
    }

    try {
      await createProjectRelation.mutateAsync({
        projectId,
        data: {
          relationTypeCode: 'linked',
          targetProjectId: trimmedTargetProjectId,
        },
      });
      setTargetProjectId('');
      toast.success('연결 프로젝트를 추가했습니다.');
    } catch (createError) {
      toast.error('연결 프로젝트를 추가하지 못했습니다.', {
        description: getErrorMessage(createError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleRemove = async (relation: ProjectRelationItem) => {
    const counterpartProjectName = relation.targetProject?.projectName ?? `프로젝트 ${relation.targetProjectId}`;
    const confirmed = await confirm({
      title: '연결 관계를 제거할까요?',
      description: `${counterpartProjectName} 과의 직접 연결을 해제합니다.`,
      confirmText: '제거',
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeProjectRelation.mutateAsync({
        projectId,
        targetProjectId: String(relation.targetProjectId),
        relationTypeCode: 'linked',
      });
      toast.success('연결 프로젝트를 제거했습니다.');
    } catch (removeError) {
      toast.error('연결 프로젝트를 제거하지 못했습니다.', {
        description: getErrorMessage(removeError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <GitBranchPlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">연결 프로젝트</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <code>nextProjectId</code> 기반 후속 프로젝트는 계속 기준 반영되고, 종료사유{' '}
          <code>linked</code> 는 별도입니다. 실제 연결 대상을 남길 때만 여기서 직접
          연결합니다.
        </p>
      </div>

      {canEditProject ? (
        <div className="mb-4 rounded-md border border-dashed bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">연결 대상 프로젝트 ID</label>
              <Input
                placeholder="예: 10001"
                value={targetProjectId}
                onChange={(event) => setTargetProjectId(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleAdd}
                disabled={createProjectRelation.isPending || targetProjectId.trim().length === 0}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                연결 추가
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            직접 연결한 프로젝트만 여기서 관리합니다. 종료사유 <code>linked</code> 와는
            별개입니다.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">프로젝트 관계를 불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-destructive">프로젝트 관계를 불러오지 못했습니다.</p>
      ) : relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          현재 연결된 프로젝트 관계가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {relations.map((relation) => {
            const isOutgoing = String(relation.sourceProjectId) === String(projectId);
            const counterpartProject = isOutgoing
              ? relation.targetProject
              : relation.sourceProject;
            const label = isOutgoing
              ? OUTGOING_LABELS[relation.relationTypeCode] ?? relation.relationTypeCode
              : INCOMING_LABELS[relation.relationTypeCode] ?? relation.relationTypeCode;
            const isCompatibilityRelation = relation.lastSource === PROJECT_RELATION_COMPAT_SOURCE;
            const provenanceLabel = isCompatibilityRelation
              ? '기준 반영'
              : relation.relationTypeCode === 'linked'
                ? '직접 연결'
                : '직접 편집';
            const canRemove = canEditProject && relation.relationTypeCode === 'linked' && isOutgoing;

            return (
              <div
                key={`${relation.sourceProjectId}-${relation.targetProjectId}-${relation.relationTypeCode}`}
                className="flex flex-col gap-3 rounded-md border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {counterpartProject?.projectName
                        ?? `프로젝트 ${isOutgoing ? relation.targetProjectId : relation.sourceProjectId}`}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {counterpartProject
                      ? `PRJ-${String(counterpartProject.id).padStart(6, '0')} · ${counterpartProject.statusCode}/${counterpartProject.stageCode}`
                      : `ID ${isOutgoing ? relation.targetProjectId : relation.sourceProjectId}`}
                    {relation.memo ? ` · ${relation.memo}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {provenanceLabel}
                  </span>
                  {canRemove ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removeProjectRelation.isPending}
                      onClick={() => handleRemove(relation)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
