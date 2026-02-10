'use client';

import { useState, useCallback, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { DataGrid, ColumnDef } from '@/components/common';
import type { FilterValues } from '@/components/common/page/Header';
import { useProjectList } from '@/hooks/queries';
import type { Project, ProjectFilters, ProjectStageCode, ProjectStatusCode } from '@/lib/api/endpoints/projects';

interface RequestDetailRow {
  label: string;
  value: string;
}

const stageOptions: { label: string; value: ProjectStageCode }[] = [
  { label: '대기', value: 'waiting' },
  { label: '진행', value: 'in_progress' },
  { label: '완료', value: 'done' },
];

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

const columns: ColumnDef<Project>[] = [
  {
    accessorKey: 'id',
    header: '요청번호',
    size: 100,
    cell: ({ row }) => `REQ-${String(row.original.id).padStart(6, '0')}`,
  },
  {
    accessorKey: 'projectName',
    header: '프로젝트명',
    size: 220,
  },
  {
    accessorKey: 'customerId',
    header: '고객사',
    size: 120,
    cell: ({ row }) => row.original.customerId ? String(row.original.customerId) : '-',
  },
  {
    accessorKey: 'statusCode',
    header: '상태',
    size: 90,
    cell: ({ row }) => {
      const status = row.original.statusCode;
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {statusLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: 'stageCode',
    header: '단계',
    size: 90,
    cell: ({ row }) => {
      const stage = row.original.stageCode;
      const colorMap: Record<ProjectStageCode, string> = {
        waiting: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-green-100 text-green-800',
        done: 'bg-gray-100 text-gray-800',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[stage]}`}>
          {stageLabels[stage]}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: '요청일',
    size: 130,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

const detailColumns: ColumnDef<RequestDetailRow>[] = [
  {
    accessorKey: 'label',
    header: '항목',
    size: 160,
  },
  {
    accessorKey: 'value',
    header: '값',
  },
];

export function RequestListPage() {
  const { openTab } = useTabStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ProjectFilters>({
    statusCode: 'request',
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSecondGridOpen, setIsSecondGridOpen] = useState(false);

  const { data: response, isLoading, error, refetch } = useProjectList({
    ...filters,
    statusCode: 'request',
    page,
    pageSize,
  });

  const projects = useMemo(() => response?.data?.items ?? [], [response]);
  const total = response?.data?.total ?? 0;
  const apiError = response && !response.success
    ? new Error(response.message || '요청 처리 중 오류가 발생했습니다.')
    : null;
  const filtersApplied = Boolean(filters.search || filters.stageCode || filters.customerId);
  const filteredProjects = useMemo(() => {
    if (!filtersApplied) {
      return projects;
    }

    return projects.filter((project) => {
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        if (!project.projectName.toLowerCase().includes(keyword)) {
          return false;
        }
      }

      if (filters.stageCode && project.stageCode !== filters.stageCode) {
        return false;
      }

      if (filters.customerId && project.customerId !== filters.customerId) {
        return false;
      }

      return true;
    });
  }, [filters, filtersApplied, projects]);

  const detailRows = useMemo<RequestDetailRow[]>(() => {
    if (!selectedProject) {
      return [];
    }
    const createdAt = new Date(selectedProject.createdAt).toLocaleString();
    const memo = selectedProject.memo || '요청 상세 테스트 데이터';
    return [
      { label: '프로젝트명', value: selectedProject.projectName },
      { label: '상태', value: statusLabels[selectedProject.statusCode] },
      { label: '단계', value: stageLabels[selectedProject.stageCode] },
      { label: '고객사 ID', value: selectedProject.customerId ? String(selectedProject.customerId) : '-' },
      { label: '요청일시', value: createdAt },
      { label: '요청 내용', value: memo },
      { label: '희망 일정', value: '2026-03-01 ~ 2026-06-30 (테스트 데이터)' },
    ];
  }, [selectedProject]);

  const handleCreate = () => {
    openTab({
      menuCode: 'request.create',
      menuId: 'request.create',
      title: '요청 등록',
      path: '/request/create',
    });
  };

  const handleDelete = () => {
    alert('선택된 항목을 삭제합니다.');
  };

  const handleSearch = useCallback((values: FilterValues) => {
    const nextFilters: ProjectFilters = {
      statusCode: 'request',
      search: values.projectName?.trim() || undefined,
      stageCode: values.stageCode as ProjectStageCode | undefined,
    };

    const customerId = Number(values.customerId);
    if (!Number.isNaN(customerId) && values.customerId?.trim()) {
      nextFilters.customerId = customerId;
    }

    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ statusCode: 'request' });
    setPage(1);
  }, []);

  const handleRowClick = useCallback((row: Project) => {
    setSelectedProject(row);
    setIsSecondGridOpen(true);
  }, []);

  return (
    <ListPageTemplate
      breadcrumb={['요청', '요청 목록']}
      header={{
        collapsible: true,
        actions: [
          {
            label: '등록',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreate,
          },
          {
            label: '삭제',
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'destructive',
            onClick: handleDelete,
          },
        ],
        filters: [
          { key: 'projectName', type: 'text', placeholder: '프로젝트명' },
          { key: 'customerId', type: 'text', placeholder: '고객사 ID' },
          { key: 'stageCode', type: 'select', placeholder: '단계', options: stageOptions },
        ],
        onSearch: handleSearch,
        onReset: handleReset,
      }}
      table={{
        columns,
        data: filteredProjects,
        loading: isLoading,
        error: apiError || error,
        onRetry: () => refetch(),
        onRowClick: handleRowClick,
        secondGrid: {
          enabled: true,
          title: selectedProject
            ? `${selectedProject.projectName} 상세`
            : '요청 상세',
          content: (
            <DataGrid
              columns={detailColumns}
              data={detailRows}
              loading={false}
              emptyState={<div className="text-center text-sm text-muted-foreground">행을 선택하세요.</div>}
            />
          ),
          defaultOpen: Boolean(selectedProject),
          height: 220,
          isOpen: isSecondGridOpen,
          onOpenChange: setIsSecondGridOpen,
        },
        pagination: {
          page,
          pageSize,
          total: filtersApplied ? filteredProjects.length : total,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        },
      }}
    />
  );
}
