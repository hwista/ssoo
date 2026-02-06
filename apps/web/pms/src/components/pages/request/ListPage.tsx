'use client';

import { useState, useCallback } from 'react';
import { ListPageTemplate } from '@/components/templates';
import { Plus, Trash2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { ColumnDef } from '@tanstack/react-table';
import type { FilterValues } from '@/components/common/page/Header';

// 샘플 데이터 타입
interface RequestItem {
  id: string;
  requestNo: string;
  title: string;
  customerName: string;
  status: string;
  requestDate: string;
  dueDate: string;
}

// 샘플 데이터
const sampleData: RequestItem[] = [
  { id: '1', requestNo: 'REQ-2026-001', title: '시스템 개선 요청', customerName: '삼성전자', status: '접수', requestDate: '2026-01-15', dueDate: '2026-02-15' },
  { id: '2', requestNo: 'REQ-2026-002', title: '신규 기능 개발', customerName: 'LG전자', status: '검토중', requestDate: '2026-01-16', dueDate: '2026-03-01' },
  { id: '3', requestNo: 'REQ-2026-003', title: '버그 수정 요청', customerName: 'SK하이닉스', status: '진행중', requestDate: '2026-01-17', dueDate: '2026-01-25' },
  { id: '4', requestNo: 'REQ-2026-004', title: 'UI 개선 작업', customerName: '현대자동차', status: '접수', requestDate: '2026-01-18', dueDate: '2026-02-28' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
  { id: '5', requestNo: 'REQ-2026-005', title: '데이터 마이그레이션', customerName: '삼성전자', status: '완료', requestDate: '2026-01-10', dueDate: '2026-01-19' },
];

// 상태 옵션
const statusOptions = [
  { label: '접수', value: 'received' },
  { label: '검토중', value: 'reviewing' },
  { label: '진행중', value: 'inProgress' },
  { label: '완료', value: 'completed' },
  { label: '반려', value: 'rejected' },
];

// 테이블 컬럼 정의
const columns: ColumnDef<RequestItem>[] = [
  {
    accessorKey: 'requestNo',
    header: '요청번호',
    size: 130,
  },
  {
    accessorKey: 'title',
    header: '제목',
    size: 200,
  },
  {
    accessorKey: 'customerName',
    header: '고객사',
    size: 120,
  },
  {
    accessorKey: 'status',
    header: '상태',
    size: 80,
    cell: ({ row }) => {
      const status = row.original.status;
      const colorMap: Record<string, string> = {
        '접수': 'bg-blue-100 text-blue-800',
        '검토중': 'bg-yellow-100 text-yellow-800',
        '진행중': 'bg-green-100 text-green-800',
        '완료': 'bg-gray-100 text-gray-800',
        '반려': 'bg-ls-red/10 text-ls-red',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'requestDate',
    header: '요청일',
    size: 100,
  },
  {
    accessorKey: 'dueDate',
    header: '완료예정일',
    size: 100,
  },
];

export function RequestListPage() {
  const { openTab } = useTabStore();
  const [data] = useState(sampleData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleSearch = useCallback((_values: FilterValues) => {
    // TODO: 검색 기능 구현
  }, []);

  const handleReset = useCallback(() => {
    // TODO: 검색 초기화 구현
  }, []);

  const handleRowClick = useCallback((row: RequestItem) => {
    openTab({
      menuCode: `request.${row.id}`,
      menuId: `request.${row.id}`,
      title: `${row.requestNo} - ${row.title}`,
      path: `/request/${row.id}`,
    });
  }, [openTab]);

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
          { key: 'requestNo', type: 'text', placeholder: '요청번호' },
          { key: 'title', type: 'text', placeholder: '제목' },
          { key: 'customerName', type: 'text', placeholder: '고객사' },
          { key: 'status', type: 'select', placeholder: '상태', options: statusOptions },
          { key: 'requestDate', type: 'dateRange', label: '요청일' },
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
