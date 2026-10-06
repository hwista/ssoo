'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useState } from 'react';
import { GitBranchPlus, Link2, Plus, X } from 'lucide-react';
import {
  useCreateProjectRelation,
  useProjectAccess,
  useProjectList,
  useProjectRelations,
  useRemoveProjectRelation,
} from '@/hooks/queries';
import type { Project, ProjectRelationItem } from '@/lib/api/endpoints/projects';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmStore } from '@/stores/confirm.store';
import { SsooSearchInput } from '@ssoo/web-shell';

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

const formatProjectOption = (project: Project) =>
  `${project.projectName} · PRJ-${String(project.id).padStart(6, '0')} · ${project.statusCode}/${project.stageCode}`;

const formatProjectContext = (project: Project) =>
  [project.customerName, project.plantSiteName, project.systemInstanceName].filter(Boolean).join(' · ');

const getCounterpartProject = (relation: ProjectRelationItem, isOutgoing: boolean) =>
  isOutgoing ? relation.targetProject : relation.sourceProject;

const formatCounterpartProjectName = (
  relation: ProjectRelationItem,
  isOutgoing: boolean,
) => getCounterpartProject(relation, isOutgoing)?.projectName ?? '프로젝트 정보 조회 필요';

const formatCounterpartProjectMeta = (
  relation: ProjectRelationItem,
  isOutgoing: boolean,
) => {
  const counterpartProject = getCounterpartProject(relation, isOutgoing);

  if (!counterpartProject) {
    return '연결 대상 기준정보 조회 필요';
  }

  return `PRJ-${String(counterpartProject.id).padStart(6, '0')} · ${counterpartProject.statusCode}/${counterpartProject.stageCode}`;
};

interface RelationsSectionProps {
  projectId: number;
}

export function RelationsSection({ projectId }: RelationsSectionProps) {
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedTargetProjectId, setSelectedTargetProjectId] = useState('');
  const { data, isLoading, error } = useProjectRelations(projectId);
  const { data: accessResponse } = useProjectAccess(projectId);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;
  const {
    data: projectLookupResponse,
    isLoading: isProjectLookupLoading,
    isError: isProjectLookupError,
    refetch: refetchProjectLookup,
  } = useProjectList(
    { search: projectSearch, page: 1, pageSize: 20 },
    { enabled: canEditProject },
  );
  const createProjectRelation = useCreateProjectRelation();
  const removeProjectRelation = useRemoveProjectRelation();
  const { confirm } = useConfirmStore();
  const relations = data?.data ?? [];
  const linkedTargetProjectIds = new Set(
    relations
      .filter(
        (relation) =>
          relation.relationTypeCode === 'linked' &&
          String(relation.sourceProjectId) === String(projectId),
      )
      .map((relation) => String(relation.targetProjectId)),
  );
  const projectOptions = (projectLookupResponse?.data?.items ?? []).filter(
    (project) =>
      String(project.id) !== String(projectId) &&
      !linkedTargetProjectIds.has(String(project.id)),
  );
  const selectedProject = projectOptions.find(
    (project) => String(project.id) === selectedTargetProjectId,
  );

  const handleAdd = async () => {
    if (!selectedTargetProjectId) {
      toast.error('연결할 프로젝트를 선택해주세요.', {
        description: '조회 가능한 프로젝트 목록에서 직접 연결 대상을 선택합니다.',
      });
      return;
    }

    try {
      await createProjectRelation.mutateAsync({
        projectId,
        data: {
          relationTypeCode: 'linked',
          targetProjectId: selectedTargetProjectId,
        },
      });
      setSelectedTargetProjectId('');
      setProjectSearch('');
      toast.success('연결 프로젝트를 추가했습니다.', {
        description: selectedProject ? formatProjectOption(selectedProject) : undefined,
      });
    } catch (createError) {
      toast.error('연결 프로젝트를 추가하지 못했습니다.', {
        description: getErrorMessage(createError, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleRemove = async (relation: ProjectRelationItem) => {
    const counterpartProjectName = formatCounterpartProjectName(relation, true);
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
        <div className="mb-4 rounded-md border border-dashed bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr),minmax(240px,1.35fr),auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">프로젝트 검색</label>
              <SsooSearchInput
                id="pms-project-relation-lookup-input"
                name="pms-project-relation-lookup-query"
                ariaLabel="연결 프로젝트 검색"
                intent="entity-lookup"
                placeholder="프로젝트명 또는 번호"
                value={projectSearch}
                onChange={(event) => {
                  setProjectSearch(event.target.value);
                  setSelectedTargetProjectId('');
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">연결 대상 프로젝트</label>
              <Select
                value={selectedTargetProjectId}
                onValueChange={setSelectedTargetProjectId}
                disabled={isProjectLookupLoading || projectOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isProjectLookupLoading ? '조회 중...' : '프로젝트 선택'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      조회 결과 없음
                    </SelectItem>
                  ) : (
                    projectOptions.map((project) => (
                      <SelectItem key={String(project.id)} value={String(project.id)}>
                        {formatProjectOption(project)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleAdd}
                disabled={createProjectRelation.isPending || !selectedTargetProjectId}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                연결 추가
              </Button>
            </div>
          </div>
          {isProjectLookupError ? (
            <SsooErrorNotice className="mt-2 gap-2">
              <span>프로젝트 조회 결과를 불러오지 못했습니다.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => void refetchProjectLookup()}
              >
                다시 조회
              </Button>
            </SsooErrorNotice>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedProject
                ? formatProjectContext(selectedProject) || '선택한 프로젝트를 직접 연결합니다.'
                : '조회 가능한 프로젝트 중 직접 연결할 대상을 선택합니다.'}
            </p>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">프로젝트 관계를 불러오는 중...</p>
      ) : error ? (
        <SsooErrorNotice as="p" compact>프로젝트 관계를 불러오지 못했습니다.</SsooErrorNotice>
      ) : relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          현재 연결된 프로젝트 관계가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {relations.map((relation) => {
            const isOutgoing = String(relation.sourceProjectId) === String(projectId);
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
                className="flex flex-col gap-3 rounded-md border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {formatCounterpartProjectName(relation, isOutgoing)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {formatCounterpartProjectMeta(relation, isOutgoing)}
                    {relation.memo ? ` · ${relation.memo}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-ssoo-accent-bg px-2 py-0.5 text-xs font-medium text-ssoo-accent">
                    {label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
