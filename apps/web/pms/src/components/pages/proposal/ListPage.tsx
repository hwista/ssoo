'use client';

import { useState, useCallback } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';

interface ProposalItem {
  id: string;
  proposalNo: string;
  title: string;
  customerName: string;
  status: string;
  createdAt: string;
  amount: string;
}

const sampleData: ProposalItem[] = [
  { id: '1', proposalNo: 'PRP-2026-001', title: '시스템 구축 제안', customerName: '삼성전자', status: '작성중', createdAt: '2026-01-15', amount: '50,000,000' },
  { id: '2', proposalNo: 'PRP-2026-002', title: '유지보수 계약 제안', customerName: 'LG전자', status: '제출완료', createdAt: '2026-01-16', amount: '12,000,000' },
  { id: '3', proposalNo: 'PRP-2026-003', title: '클라우드 마이그레이션', customerName: 'SK하이닉스', status: '협상중', createdAt: '2026-01-17', amount: '80,000,000' },
];

const statusOptions = [
  { label: '작성중', value: 'drafting' },
  { label: '제출완료', value: 'submitted' },
  { label: '협상중', value: 'negotiating' },
  { label: '수주', value: 'won' },
  { label: '실주', value: 'lost' },
];

const columns: ColumnDef<ProposalItem>[] = [
  { accessorKey: 'proposalNo', header: '제안번호', size: 130 },
  { accessorKey: 'title', header: '제안명', size: 200 },
  { accessorKey: 'customerName', header: '고객사', size: 120 },
  {
    accessorKey: 'status',
    header: '상태',
    size: 80,
    cell: ({ row }) => {
      const status = row.original.status;
      const colorMap: Record<string, string> = {
        '작성중': 'bg-yellow-100 text-yellow-800',
        '제출완료': 'bg-blue-100 text-blue-800',
        '협상중': 'bg-green-100 text-green-800',
        '수주': 'bg-purple-100 text-purple-800',
        '실주': 'bg-gray-100 text-gray-800',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      );
    },
  },
  { accessorKey: 'amount', header: '제안금액', size: 120 },
  { accessorKey: 'createdAt', header: '작성일', size: 100 },
];

export function ProposalListPage() {
  const { openTab } = useTabStore();
  const [data] = useState(sampleData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => {
    openTab({
      menuCode: 'proposal.create',
      menuId: 'proposal.create',
      title: '제안 등록',
      path: '/proposal/create',
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

  const handleRowClick = useCallback((row: ProposalItem) => {
    openTab({
      menuCode: `proposal.${row.id}`,
      menuId: `proposal.${row.id}`,
      title: `${row.proposalNo} - ${row.title}`,
      path: `/proposal/${row.id}`,
    });
  }, [openTab]);

  return (
    <ListPageTemplate
      breadcrumb={['제안', '제안 목록']}
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
          { key: 'proposalNo', type: 'text', placeholder: '제안번호' },
          { key: 'title', type: 'text', placeholder: '제안명' },
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
