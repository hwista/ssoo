'use client';

import { useState, useCallback, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { DataGrid, ColumnDef } from '@/components/common';
import type { FilterValues } from '@/components/common/page/Header';
import { useProjectList } from '@/hooks/queries';
import type { Project, ProjectFilters, ProjectRequestDetail, ProjectStageCode, ProjectStatusCode } from '@/lib/api/endpoints/projects';

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
    cell: ({ row }) => {
      const label = `REQ-${String(row.original.id).padStart(6, '0')}`;
      return (
        <button
          type="button"
          className="text-label-md text-ssoo-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            const { openTab } = useTabStore.getState();
            openTab({
              menuCode: 'project.detail',
              menuId: `project.detail.${row.original.id}`,
              title: `PRJ-${String(row.original.id).padStart(6, '0')} ${row.original.projectName}`,
              path: '/project/detail',
              params: { id: String(row.original.id) },
            });
          }}
        >
          {label}
        </button>
      );
    },
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
        <span className="px-2 py-1 rounded text-label-sm bg-blue-100 text-blue-800">
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
        <span className={`px-2 py-1 rounded text-label-sm ${colorMap[stage]}`}>
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

const detailColumns: ColumnDef<ProjectRequestDetail>[] = [
  {
    accessorKey: 'requestSourceCode',
    header: '요청구분',
    size: 120,
    cell: ({ row }) => row.original.requestSourceCode || '-',
  },
  {
    accessorKey: 'requestChannelCode',
    header: '접수채널',
    size: 120,
    cell: ({ row }) => row.original.requestChannelCode || '-',
  },
  {
    accessorKey: 'requestSummary',
    header: '요약',
    size: 240,
    cell: ({ row }) => row.original.requestSummary || '-',
  },
  {
    accessorKey: 'requestReceivedAt',
    header: '접수일',
    size: 140,
    cell: ({ row }) => {
      const value = row.original.requestReceivedAt;
      return value ? new Date(value).toLocaleDateString() : '-';
    },
  },
  {
    accessorKey: 'requestPriorityCode',
    header: '우선순위',
    size: 120,
    cell: ({ row }) => row.original.requestPriorityCode || '-',
  },
  {
    accessorKey: 'requestOwnerUserId',
    header: '담당자',
    size: 120,
    cell: ({ row }) => row.original.requestOwnerUserId ? String(row.original.requestOwnerUserId) : '-',
  },
  {
    accessorKey: 'memo',
    header: '메모',
    size: 240,
    cell: ({ row }) => row.original.memo || '-',
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

  const detailRows = useMemo<ProjectRequestDetail[]>(() => {
    if (!selectedProject) {
      return [];
    }
    const detail = selectedProject.requestDetail;
    const fallbackDate = new Date(selectedProject.createdAt).toISOString();
    return [
      {
        requestSourceCode: detail?.requestSourceCode ?? 'RFP',
        requestChannelCode: detail?.requestChannelCode ?? 'email',
        requestSummary: detail?.requestSummary ?? `${selectedProject.projectName} 요청`,
        requestReceivedAt: detail?.requestReceivedAt ?? fallbackDate,
        requestPriorityCode: detail?.requestPriorityCode ?? 'normal',
        requestOwnerUserId: detail?.requestOwnerUserId ?? selectedProject.currentOwnerUserId ?? null,
        memo: detail?.memo ?? selectedProject.memo ?? '요청 상세 테스트 데이터',
      },
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
        getRowId: (row) => row.id,
        selectedRowId: selectedProject?.id ?? null,
        headerClassName: 'bg-ssoo-content-bg',
        headerCellClassName: 'bg-ssoo-content-bg',
        secondGrid: {
          enabled: true,
          content: (
            <DataGrid
              columns={detailColumns}
              data={detailRows}
              loading={false}
              className="h-full"
              tableClassName="h-full"
              headerClassName="bg-ssoo-content-bg"
              headerCellClassName="bg-ssoo-content-bg"
              emptyState={<div className="text-center text-body-sm text-muted-foreground">행을 선택하세요.</div>}
            />
          ),
          defaultOpen: Boolean(selectedProject),
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
