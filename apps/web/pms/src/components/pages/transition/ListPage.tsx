'use client';

import { useState, useCallback } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';

interface TransitionItem {
  id: string;
  transitionNo: string;
  projectName: string;
  customerName: string;
  status: string;
  handoffDate: string;
  operationType: string;
}

const sampleData: TransitionItem[] = [
  { id: '1', transitionNo: 'TRN-2026-001', projectName: 'ERP 시스템', customerName: '삼성전자', status: '전환중', handoffDate: '2026-01-31', operationType: '유지보수' },
  { id: '2', transitionNo: 'TRN-2025-002', projectName: '인사관리 시스템', customerName: 'LG전자', status: '완료', handoffDate: '2025-12-31', operationType: '운영' },
  { id: '3', transitionNo: 'TRN-2026-003', projectName: '재고관리 시스템', customerName: 'SK하이닉스', status: '대기', handoffDate: '2026-02-28', operationType: '유지보수' },
];

const statusOptions = [
  { label: '대기', value: 'waiting' },
  { label: '전환중', value: 'transitioning' },
  { label: '완료', value: 'completed' },
];

const columns: ColumnDef<TransitionItem>[] = [
  { accessorKey: 'transitionNo', header: '전환번호', size: 130 },
  { accessorKey: 'projectName', header: '프로젝트명', size: 200 },
  { accessorKey: 'customerName', header: '고객사', size: 120 },
  {
    accessorKey: 'status',
    header: '상태',
    size: 80,
    cell: ({ row }) => {
      const status = row.original.status;
      const colorMap: Record<string, string> = {
        '대기': 'bg-yellow-100 text-yellow-800',
        '전환중': 'bg-blue-100 text-blue-800',
        '완료': 'bg-green-100 text-green-800',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      );
    },
  },
  { accessorKey: 'operationType', header: '운영유형', size: 100 },
  { accessorKey: 'handoffDate', header: '전환일', size: 100 },
];

export function TransitionListPage() {
  const { openTab } = useTabStore();
  const [data] = useState(sampleData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => {
    openTab({
      menuCode: 'transition.create',
      menuId: 'transition.create',
      title: '전환 등록',
      path: '/transition/create',
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

  const handleRowClick = useCallback((row: TransitionItem) => {
    openTab({
      menuCode: `transition.${row.id}`,
      menuId: `transition.${row.id}`,
      title: `${row.transitionNo} - ${row.projectName}`,
      path: `/transition/${row.id}`,
    });
  }, [openTab]);

  return (
    <ListPageTemplate
      breadcrumb={['전환', '전환 목록']}
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
          { key: 'transitionNo', type: 'text', placeholder: '전환번호' },
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
        enableClientPagination: true,
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
