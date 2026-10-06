'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useMemo } from 'react';
import { useProjectMembers } from '@/hooks/queries';
import type { ProjectMember } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMPTY_OWNER_VALUE = '__none';

interface ProjectMemberOwnerSelectProps {
  projectId: number;
  value?: number | string | null;
  onChange: (userId: string | undefined) => void;
  disabled?: boolean;
}

interface ProjectMemberOwnerOption {
  value: string;
  label: string;
  description: string;
  roles: string[];
}

export function ProjectMemberOwnerSelect({
  projectId,
  value,
  onChange,
  disabled,
}: ProjectMemberOwnerSelectProps) {
  const { data, isLoading, isError, error, refetch } = useProjectMembers(projectId);
  const ownerOptions = useMemo(() => buildOwnerOptions(data?.data ?? []), [data?.data]);
  const selectedValue = value ? String(value) : EMPTY_OWNER_VALUE;
  const selectedOwner = ownerOptions.find((option) => option.value === selectedValue);
  const hasExternalSelectedOwner =
    selectedValue !== EMPTY_OWNER_VALUE && !selectedOwner;

  return (
    <div className="space-y-2">
      <Select
        value={selectedValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === EMPTY_OWNER_VALUE ? undefined : nextValue)
        }
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? '조회 중...' : '담당자 선택'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_OWNER_VALUE}>선택 안함</SelectItem>
          {hasExternalSelectedOwner ? (
            <SelectItem value={selectedValue}>현재 등록된 사용자 정보 조회 필요</SelectItem>
          ) : null}
          {ownerOptions.length === 0 ? (
            <SelectItem value="__empty" disabled>
              프로젝트 멤버 없음
            </SelectItem>
          ) : (
            ownerOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {option.roles.length > 0 ? ` · ${option.roles.join('/')}` : ''}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {isError ? (
        <SsooErrorNotice className="gap-2 px-3 py-2">
          <span>{error?.message ?? '프로젝트 멤버를 불러오지 못했습니다.'}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => void refetch()}
          >
            다시 시도
          </Button>
        </SsooErrorNotice>
      ) : selectedOwner ? (
        <p className="text-xs text-muted-foreground">{selectedOwner.description}</p>
      ) : hasExternalSelectedOwner ? (
        <p className="text-xs text-muted-foreground">
          현재 저장된 담당자가 활성 프로젝트 멤버 목록에 없습니다.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          프로젝트 멤버 중 담당자를 선택합니다.
        </p>
      )}
    </div>
  );
}

export function formatProjectMemberOwnerLabel(
  members: ProjectMember[],
  userId: number | string | null | undefined,
) {
  if (!userId) {
    return '-';
  }

  return (
    buildOwnerOptions(members).find((option) => option.value === String(userId))?.label
    ?? '사용자 정보 조회 필요'
  );
}

function buildOwnerOptions(members: ProjectMember[]): ProjectMemberOwnerOption[] {
  const options = new Map<string, ProjectMemberOwnerOption>();

  for (const member of members) {
    const value = String(member.userId);
    const user = member.user;
    const label = user?.displayName || user?.userName || '사용자 정보 조회 필요';
    const description = [
      user?.email,
      user?.departmentCode,
      user?.positionCode,
      member.organizationId ? '소속 조직 연결' : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const existing = options.get(value);

    if (existing) {
      if (!existing.roles.includes(member.roleCode)) {
        existing.roles.push(member.roleCode);
      }
      continue;
    }

    options.set(value, {
      value,
      label,
      description: description || '소속 정보 없음',
      roles: member.roleCode ? [member.roleCode] : [],
    });
  }

  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}
