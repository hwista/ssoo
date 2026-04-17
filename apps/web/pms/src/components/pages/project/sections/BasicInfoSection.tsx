'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProjectSchema } from '@/lib/validations/project';
import type { UpdateProjectInput } from '@/lib/validations/project';
import { useProjectAccess, useUpdateProject } from '@/hooks/queries';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';
import type { Project, ProjectStageCode, ProjectStatusCode } from '@/lib/api/endpoints/projects';
import { OrganizationsSection } from './OrganizationsSection';
import { RelationsSection } from './RelationsSection';

const statusLabels: Record<ProjectStatusCode, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const stageLabels: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행',
  done: '완료',
};

interface BasicInfoSectionProps {
  project: Project;
  onUpdated: () => void;
}

export function BasicInfoSection({ project, onUpdated }: BasicInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateProject = useUpdateProject();
  const { data: accessResponse } = useProjectAccess(project.id);
  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;

  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      projectName: project.projectName,
      description: project.memo ?? '',
    },
  });

  const handleSave = async (data: UpdateProjectInput) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          projectName: data.projectName,
          description: data.description,
        },
      });
      setIsEditing(false);
      onUpdated();
    } catch {
      // error handled by mutation
    }
  };

  if (!isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">기본 정보</h2>
          {canEditProject && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              편집
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">프로젝트명</p>
            <p className="font-medium">{project.projectName}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">상태</p>
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {statusLabels[project.statusCode]}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">단계</p>
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              {stageLabels[project.stageCode]}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">등록일</p>
            <p>{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
          {project.memo && (
            <div className="col-span-2 lg:col-span-4">
              <p className="text-muted-foreground mb-1">메모</p>
              <p className="whitespace-pre-wrap">{project.memo}</p>
            </div>
          )}
          <div className="col-span-2 lg:col-span-4">
            <OrganizationsSection projectId={project.id} />
          </div>
          <div className="col-span-2 lg:col-span-4">
            <RelationsSection projectId={project.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">기본 정보 편집</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <X className="h-3.5 w-3.5 mr-1" />
            취소
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSave)}
            disabled={updateProject.isPending || !canEditProject}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            저장
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <FormField
          label="프로젝트명"
          required
          error={form.formState.errors.projectName?.message}
        >
          <Input {...form.register('projectName')} />
        </FormField>
        <FormField label="메모" error={form.formState.errors.description?.message}>
          <Textarea {...form.register('description')} rows={3} />
        </FormField>
        <OrganizationsSection projectId={project.id} />
        <RelationsSection projectId={project.id} />
      </div>
    </div>
  );
}
