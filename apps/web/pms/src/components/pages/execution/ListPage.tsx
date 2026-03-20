'use client';

import { useState, useCallback, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';
import { useProjectList } from '@/hooks/queries';
import type { Project, ProjectFilters, ProjectStageCode } from '@/lib/api/endpoints/projects';

const stageOptions: { label: string; value: ProjectStageCode }[] = [
  { label: '대기', value: 'waiting' },
  { label: '진행', value: 'in_progress' },
  { label: '완료', value: 'done' },
];

const stageLabels: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행',
  done: '완료',
};

const columns: ColumnDef<Project>[] = [
  {
    accessorKey: 'id',
    header: '프로젝트번호',
    size: 130,
    cell: ({ row }) => `PRJ-${String(row.original.id).padStart(6, '0')}`,
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
    id: 'contractAmount',
    header: '계약금액',
    size: 130,
    cell: ({ row }) => {
      const amount = row.original.executionDetail?.contractAmount;
      if (!amount) return '-';
      const unit = row.original.executionDetail?.contractUnitCode || '';
      return `${Number(amount).toLocaleString()} ${unit}`;
    },
  },
  {
    id: 'contractSignedAt',
    header: '계약일',
    size: 120,
    cell: ({ row }) => {
      const date = row.original.executionDetail?.contractSignedAt;
      return date ? new Date(date).toLocaleDateString() : '-';
    },
  },
  {
    accessorKey: 'createdAt',
    header: '등록일',
    size: 120,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

export function ExecutionListPage() {
  const { openTab } = useTabStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ProjectFilters>({
    statusCode: 'execution',
  });

  const { data: response, isLoading, error, refetch } = useProjectList({
    ...filters,
    statusCode: 'execution',
    page,
    pageSize,
  });

  const projects = useMemo(() => response?.data?.items ?? [], [response]);
  const total = response?.data?.total ?? 0;
  const apiError = response && !response.success
    ? new Error(response.message || '요청 처리 중 오류가 발생했습니다.')
    : null;

  const handleDelete = () => {
    alert('선택된 항목을 삭제합니다.');
  };

  const handleSearch = useCallback((values: FilterValues) => {
    setFilters({
      statusCode: 'execution',
      search: values.projectName?.trim() || undefined,
      stageCode: values.stageCode as ProjectStageCode | undefined,
    });
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ statusCode: 'execution' });
    setPage(1);
  }, []);

  const handleRowClick = useCallback((row: Project) => {
    openTab({
      menuCode: `project.detail`,
      menuId: `project.detail.${row.id}`,
      title: `PRJ-${String(row.id).padStart(6, '0')} ${row.projectName}`,
      path: '/project/detail',
      params: { id: String(row.id) },
    });
  }, [openTab]);

  return (
    <ListPageTemplate
      breadcrumb={['수행', '프로젝트 목록']}
      header={{
        collapsible: true,
        actions: [
          {
            label: '삭제',
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'destructive',
            onClick: handleDelete,
          },
        ],
        filters: [
          { key: 'projectName', type: 'text', placeholder: '프로젝트명' },
          { key: 'stageCode', type: 'select', placeholder: '단계', options: stageOptions },
        ],
        onSearch: handleSearch,
        onReset: handleReset,
      }}
      table={{
        columns,
        data: projects,
        loading: isLoading,
        error: apiError || error,
        onRetry: () => refetch(),
        onRowClick: handleRowClick,
        getRowId: (row) => row.id,
        headerClassName: 'bg-ssoo-content-bg',
        headerCellClassName: 'bg-ssoo-content-bg',
        pagination: {
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        },
      }}
    />
  );
}
