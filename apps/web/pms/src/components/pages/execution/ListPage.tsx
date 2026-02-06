'use client';

import { useState, useCallback } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';

interface ExecutionItem {
  id: string;
  projectNo: string;
  projectName: string;
  customerName: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
}

const sampleData: ExecutionItem[] = [
  { id: '1', projectNo: 'PRJ-2026-001', projectName: 'ERP 시스템 구축', customerName: '삼성전자', status: '진행중', startDate: '2026-01-01', endDate: '2026-06-30', progress: 35 },
  { id: '2', projectNo: 'PRJ-2026-002', projectName: 'MES 고도화', customerName: 'LG전자', status: '진행중', startDate: '2026-02-01', endDate: '2026-08-31', progress: 15 },
  { id: '3', projectNo: 'PRJ-2025-003', projectName: '품질관리 시스템', customerName: 'SK하이닉스', status: '검수중', startDate: '2025-07-01', endDate: '2026-01-31', progress: 95 },
];

const statusOptions = [
  { label: '준비중', value: 'preparing' },
  { label: '진행중', value: 'inProgress' },
  { label: '검수중', value: 'reviewing' },
  { label: '완료', value: 'completed' },
  { label: '보류', value: 'hold' },
];

const columns: ColumnDef<ExecutionItem>[] = [
  { accessorKey: 'projectNo', header: '프로젝트번호', size: 130 },
  { accessorKey: 'projectName', header: '프로젝트명', size: 200 },
  { accessorKey: 'customerName', header: '고객사', size: 120 },
  {
    accessorKey: 'status',
    header: '상태',
    size: 80,
    cell: ({ row }) => {
      const status = row.original.status;
      const colorMap: Record<string, string> = {
        '준비중': 'bg-yellow-100 text-yellow-800',
        '진행중': 'bg-green-100 text-green-800',
        '검수중': 'bg-blue-100 text-blue-800',
        '완료': 'bg-gray-100 text-gray-800',
        '보류': 'bg-red-100 text-red-800',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'progress',
    header: '진행률',
    size: 100,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="bg-ls-red h-2 rounded-full"
            style={{ width: `${row.original.progress}%` }}
          />
        </div>
        <span className="text-xs">{row.original.progress}%</span>
      </div>
    ),
  },
  { accessorKey: 'startDate', header: '시작일', size: 100 },
  { accessorKey: 'endDate', header: '종료일', size: 100 },
];

export function ExecutionListPage() {
  const { openTab } = useTabStore();
  const [data] = useState(sampleData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => {
    openTab({
      menuCode: 'execution.create',
      menuId: 'execution.create',
      title: '프로젝트 등록',
      path: '/execution/create',
    });
  };

  const handleDelete = () => {
    alert('선택된 항목을 삭제합니다.');
  };

  const handleSearch = useCallback((_values: FilterValues) => {
    // TODO: 검색 기능 구현
  }, []);

  const handleReset = useCallback(() => {
    // TODO: 검색 초기화 구현
  }, []);

  const handleRowClick = useCallback((row: ExecutionItem) => {
    openTab({
      menuCode: `execution.${row.id}`,
      menuId: `execution.${row.id}`,
      title: `${row.projectNo} - ${row.projectName}`,
      path: `/execution/${row.id}`,
    });
  }, [openTab]);

  return (
    <ListPageTemplate
      breadcrumb={['실행', '프로젝트 목록']}
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
          { key: 'projectNo', type: 'text', placeholder: '프로젝트번호' },
          { key: 'projectName', type: 'text', placeholder: '프로젝트명' },
          { key: 'customerName', type: 'text', placeholder: '고객사' },
          { key: 'status', type: 'select', placeholder: '상태', options: statusOptions },
        ],
        onSearch: handleSearch,
        onReset: handleReset,
      }}
      table={{
        columns,
        data,
        loading: false,
        onRowClick: handleRowClick,
        pagination: {
          page,
          pageSize,
          total: data.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        },
      }}
    />
  );
}
