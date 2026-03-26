/**
 * Common Components (Level 2 - Composite/분자)
 * 
 * 비즈니스 로직 없이 재사용 가능한 복합 컴포넌트
 * shadcn/ui 원자 컴포넌트를 조합하여 구성
 * 
 * 구조:
 * - page/: 레이아웃 빌딩블록 (Breadcrumb, Header, Content, FilterBar)
 * - datagrid/: 테이블 슬롯 컴포넌트 (DataGrid, Toolbar, Body, Footer, Pagination)
 * - form/: 폼 슬롯 컴포넌트 (FormSection, FormActions, FormField)
 * - StateDisplay: 로딩/에러/빈 상태 표시
 * - ConfirmDialog: 확인 다이얼로그
 */

// 페이지 레이아웃 빌딩블록
export {
  Breadcrumb,
  Header,
  Content,
  FilterBar,
} from './page';
export type {
  BreadcrumbItem,
  BreadcrumbProps,
  HeaderProps,
  ActionItem,
  FilterField,
  ContentProps,
  FilterBarProps,
} from './page';

// DataGrid 슬롯 컴포넌트
export { 
  DataGrid, 
  Toolbar as DataGridToolbar,
  Body as DataGridBody,
  Footer as DataGridFooter,
  Pagination,
  createSortableHeader, 
  createActionsColumn,
} from './datagrid';
export type { DataGridProps, ColumnDef } from './datagrid';

// Form 슬롯 컴포넌트
export { FormSection, FormActions, FormField } from './form';
export type { FormSectionProps, FormActionsProps, FormFieldProps } from './form';

// 상태 표시
export { LoadingState, LoadingSpinner, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, LoadingSpinnerProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';

// 다이얼로그
export { ConfirmDialog } from './ConfirmDialog';
