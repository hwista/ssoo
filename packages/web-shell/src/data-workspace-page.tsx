'use client';

import { SsooErrorPanel } from './error-recovery';
import * as React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Home,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type Table as TanStackTable,
  type Updater,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ssoo/web-ui';

import { cn } from './cn';
import type { SsooContentPageTone } from './content-page-template';
import {
  SSOO_PAGE_CHROME_METRICS,
  SSOO_PAGE_CHROME_CLASSES,
} from './page-chrome-metrics';
import type { SsooPageBreadcrumbItem } from './page-breadcrumb';
import {
  SsooWorkspacePage,
  type SsooWorkspaceContentWidth,
} from './workspace-page';
import { SsooSearchInput } from './search-input';

const ALL_FILTER_VALUE = '__all__';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 36;

export interface SsooDataWorkspaceAction {
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface SsooDataWorkspaceFilterOption {
  label: string;
  value: string;
}

interface SsooDataWorkspaceFilterFieldBase {
  key: string;
  label?: string;
  placeholder?: string;
  width?: string;
}

export interface SsooDataWorkspaceTextFilterField extends SsooDataWorkspaceFilterFieldBase {
  type: 'text';
  id: string;
  name: string;
  ariaLabel: string;
}

export interface SsooDataWorkspaceSelectFilterField extends SsooDataWorkspaceFilterFieldBase {
  type: 'select';
  options?: SsooDataWorkspaceFilterOption[];
}

export interface SsooDataWorkspaceDateFilterField extends SsooDataWorkspaceFilterFieldBase {
  type: 'date' | 'dateRange';
}

export type SsooDataWorkspaceFilterField =
  | SsooDataWorkspaceTextFilterField
  | SsooDataWorkspaceSelectFilterField
  | SsooDataWorkspaceDateFilterField;

export type SsooDataWorkspaceFilterValues = Record<string, string>;

export interface SsooDataWorkspaceToolbarProps {
  actions?: SsooDataWorkspaceAction[];
  filters?: SsooDataWorkspaceFilterField[];
  filterValues?: SsooDataWorkspaceFilterValues;
  defaultFilterValues?: SsooDataWorkspaceFilterValues;
  onFilterValuesChange?: (values: SsooDataWorkspaceFilterValues) => void;
  onSearch?: (values: SsooDataWorkspaceFilterValues) => void;
  onReset?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export interface SsooDataWorkspaceContentProps {
  layout?: 'single' | 'vertical' | 'horizontal';
  ratio?: [number, number];
  children: React.ReactNode;
  className?: string;
}

export interface SsooDataGridPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface SsooDataGridSecondPanel {
  enabled?: boolean;
  content: React.ReactNode;
  defaultOpen?: boolean;
  height?: number | string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface SsooDataGridProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string | number;
  selectedRowId?: string | number | null;
  enableRowSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  enableSearch?: boolean;
  searchField?: string;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  pagination?: SsooDataGridPagination;
  enableClientPagination?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  headerCellClassName?: string;
  secondGrid?: SsooDataGridSecondPanel;
}

export interface SsooDataWorkspacePageProps<TData = unknown, TValue = unknown> {
  breadcrumb?: Array<string | SsooPageBreadcrumbItem>;
  breadcrumbItems?: SsooPageBreadcrumbItem[];
  breadcrumbRootIconSlot?: React.ReactNode;
  breadcrumbAriaLabel?: string;
  toolbar?: SsooDataWorkspaceToolbarProps;
  content?: Omit<SsooDataWorkspaceContentProps, 'children' | 'className'>;
  table?: Omit<SsooDataGridProps<TData, TValue>, 'className'>;
  children?: React.ReactNode;
  contentWidth?: SsooWorkspaceContentWidth;
  pageTone?: SsooContentPageTone;
  className?: string;
  contentClassName?: string;
}

export function SsooDataWorkspacePage<TData = unknown, TValue = unknown>({
  breadcrumb,
  breadcrumbItems,
  breadcrumbRootIconSlot,
  breadcrumbAriaLabel,
  toolbar,
  content,
  table,
  children,
  contentWidth = 'platform',
  pageTone = 'neutral',
  className,
  contentClassName,
}: SsooDataWorkspacePageProps<TData, TValue>) {
  const headerSlot = toolbar ? <SsooDataWorkspaceHeader {...toolbar} /> : null;

  return (
    <SsooWorkspacePage
      breadcrumb={breadcrumb}
      breadcrumbItems={breadcrumbItems}
      breadcrumbRootIconSlot={breadcrumbRootIconSlot === undefined ? <Home className="h-3.5 w-3.5" /> : breadcrumbRootIconSlot}
      breadcrumbAriaLabel={breadcrumbAriaLabel ?? '데이터 화면 경로'}
      headerSlot={headerSlot}
      contentWidth={contentWidth}
      pageTone={pageTone}
      className={className}
      contentClassName={contentClassName}
      contentDataAttributes={{ 'data-ssoo-data-workspace': true }}
    >
      <SsooDataWorkspaceContent {...content}>
        {children ?? (table ? <SsooDataGrid {...table} /> : null)}
      </SsooDataWorkspaceContent>
    </SsooWorkspacePage>
  );
}

function SsooDataWorkspaceHeader({
  actions,
  filters,
  filterValues,
  defaultFilterValues,
  onFilterValuesChange,
  onSearch,
  onReset,
  collapsible = true,
  defaultCollapsed = false,
  className,
}: SsooDataWorkspaceToolbarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [internalFilterValues, setInternalFilterValues] = React.useState<SsooDataWorkspaceFilterValues>(defaultFilterValues ?? {});
  const resolvedFilterValues = filterValues ?? internalFilterValues;
  const hasActions = Boolean(actions?.length);
  const hasFilters = Boolean(filters?.length);
  const showFilterRow = hasFilters && !isCollapsed;

  const setNextFilterValues = React.useCallback((nextValues: SsooDataWorkspaceFilterValues) => {
    if (filterValues === undefined) {
      setInternalFilterValues(nextValues);
    }
    onFilterValuesChange?.(nextValues);
  }, [filterValues, onFilterValuesChange]);

  const handleFilterChange = React.useCallback((key: string, value: string) => {
    setNextFilterValues({ ...resolvedFilterValues, [key]: value });
  }, [resolvedFilterValues, setNextFilterValues]);

  const handleSearch = React.useCallback(() => {
    onSearch?.(resolvedFilterValues);
  }, [onSearch, resolvedFilterValues]);

  const handleReset = React.useCallback(() => {
    setNextFilterValues({});
    onReset?.();
  }, [onReset, setNextFilterValues]);

  if (!hasActions && !hasFilters) {
    return null;
  }

  return (
    <section
      className={cn(
        SSOO_PAGE_CHROME_CLASSES.header,
        'flex-col items-stretch justify-start gap-0 overflow-hidden p-0',
        className,
      )}
      style={{ minHeight: SSOO_PAGE_CHROME_METRICS.headerMinHeightPx }}
      data-ssoo-data-workspace-header
      data-ssoo-data-workspace-toolbar
    >
      <div className={cn(
        'flex min-h-[52px] items-center justify-between gap-3 px-4 py-2',
        showFilterRow && 'border-b border-ssoo-content-border',
      )}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {hasActions ? actions?.map((action, index) => (
            <Button
              key={index}
              type="button"
              variant={action.variant ?? 'default'}
              size="pageAction"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
              <span>{action.label}</span>
            </Button>
          )) : null}
        </div>

        {collapsible && hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="shrink-0"
          >
            <span>{isCollapsed ? '펼치기' : '접기'}</span>
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {showFilterRow ? (
        <div className="flex min-h-[52px] flex-wrap items-center gap-3 px-4 py-2">
          <SsooDataWorkspaceFilterBar
            fields={filters ?? []}
            values={resolvedFilterValues}
            onChange={handleFilterChange}
            onEnterSearch={handleSearch}
            className="min-w-[min(100%,520px)] flex-1"
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button type="button" variant="default" size="pageAction" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              <span>검색</span>
            </Button>
            <Button type="button" variant="outline" size="pageAction" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              <span>초기화</span>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SsooDataWorkspaceToolbar({
  actions,
  filters,
  filterValues,
  defaultFilterValues,
  onFilterValuesChange,
  onSearch,
  onReset,
  collapsible = true,
  defaultCollapsed = false,
  className,
}: SsooDataWorkspaceToolbarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [internalFilterValues, setInternalFilterValues] = React.useState<SsooDataWorkspaceFilterValues>(defaultFilterValues ?? {});
  const resolvedFilterValues = filterValues ?? internalFilterValues;
  const hasActions = Boolean(actions?.length);
  const hasFilters = Boolean(filters?.length);

  const setNextFilterValues = React.useCallback((nextValues: SsooDataWorkspaceFilterValues) => {
    if (filterValues === undefined) {
      setInternalFilterValues(nextValues);
    }
    onFilterValuesChange?.(nextValues);
  }, [filterValues, onFilterValuesChange]);

  const handleFilterChange = React.useCallback((key: string, value: string) => {
    setNextFilterValues({ ...resolvedFilterValues, [key]: value });
  }, [resolvedFilterValues, setNextFilterValues]);

  const handleSearch = React.useCallback(() => {
    onSearch?.(resolvedFilterValues);
  }, [onSearch, resolvedFilterValues]);

  const handleReset = React.useCallback(() => {
    setNextFilterValues({});
    onReset?.();
  }, [onReset, setNextFilterValues]);

  return (
    <section
      className={cn('shrink-0 overflow-hidden rounded-lg border border-ssoo-content-border bg-card', className)}
      data-ssoo-data-workspace-toolbar
    >
      <div className={cn('flex min-h-[52px] items-center justify-between gap-3 px-4 py-2', hasFilters && !isCollapsed && 'border-b border-ssoo-content-border')}>
        <div className="flex min-w-0 items-center gap-2">
          {hasActions ? actions?.map((action, index) => (
            <Button
              key={index}
              type="button"
              variant={action.variant ?? 'default'}
              size="pageAction"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
              <span>{action.label}</span>
            </Button>
          )) : null}
        </div>

        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            <span>{isCollapsed ? '펼치기' : '접기'}</span>
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {!isCollapsed && hasFilters ? (
        <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
          <SsooDataWorkspaceFilterBar
            fields={filters ?? []}
            values={resolvedFilterValues}
            onChange={handleFilterChange}
            onEnterSearch={handleSearch}
            className="flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="default" size="pageAction" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              <span>검색</span>
            </Button>
            <Button type="button" variant="outline" size="pageAction" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              <span>초기화</span>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export interface SsooDataWorkspaceFilterBarProps {
  fields: SsooDataWorkspaceFilterField[];
  values: SsooDataWorkspaceFilterValues;
  onChange: (key: string, value: string) => void;
  onEnterSearch?: () => void;
  className?: string;
}

export function SsooDataWorkspaceFilterBar({
  fields,
  values,
  onChange,
  onEnterSearch,
  className,
}: SsooDataWorkspaceFilterBarProps) {
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnterSearch?.();
    }
  }, [onEnterSearch]);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {fields.map((field) => {
        const value = values[field.key] ?? '';
        const width = field.width ?? (field.type === 'text' ? '200px' : '150px');

        if (field.type === 'select') {
          return (
            <div key={field.key} className="min-w-0" style={{ width }}>
              {field.label ? <label className="mb-1 block text-caption ssoo-text-primary-70">{field.label}</label> : null}
              <Select
                value={value || ALL_FILTER_VALUE}
                onValueChange={(nextValue) => onChange(field.key, nextValue === ALL_FILTER_VALUE ? '' : nextValue)}
              >
                <SelectTrigger className="h-control-h">
                  <SelectValue placeholder={field.placeholder ?? '전체'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.type === 'text') {
          return (
            <div key={field.key} className="min-w-0" style={{ width }}>
              {field.label ? <label className="mb-1 block text-caption ssoo-text-primary-70" htmlFor={field.id}>{field.label}</label> : null}
              <SsooSearchInput
                id={field.id}
                name={field.name}
                ariaLabel={field.ariaLabel}
                intent="data-filter"
                value={value}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.key, event.target.value)}
                onKeyDown={handleKeyDown}
                className="h-control-h"
              />
            </div>
          );
        }

        if (field.type === 'dateRange') {
          const startValue = values[`${field.key}_start`] ?? '';
          const endValue = values[`${field.key}_end`] ?? '';
          return (
            <div key={field.key} className="flex min-w-0 items-center gap-2">
              {field.label ? <label className="text-caption ssoo-text-primary-70">{field.label}</label> : null}
              <Input
                type="date"
                value={startValue}
                onChange={(event) => onChange(`${field.key}_start`, event.target.value)}
                className="h-control-h w-36"
              />
              <span className="ssoo-text-primary-60">~</span>
              <Input
                type="date"
                value={endValue}
                onChange={(event) => onChange(`${field.key}_end`, event.target.value)}
                className="h-control-h w-36"
              />
            </div>
          );
        }

        return (
          <div key={field.key} className="min-w-0" style={{ width }}>
            {field.label ? <label className="mb-1 block text-caption ssoo-text-primary-70">{field.label}</label> : null}
            <Input
              type="date"
              value={value}
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="h-control-h"
            />
          </div>
        );
      })}
    </div>
  );
}

export function SsooDataWorkspaceContent({
  layout = 'single',
  ratio = [50, 50],
  children,
  className,
}: SsooDataWorkspaceContentProps) {
  const childArray = React.Children.toArray(children);

  const getChildStyle = (index: number): React.CSSProperties | undefined => {
    if (layout === 'single' || childArray.length <= 1) {
      return { flex: 1 };
    }

    return { flex: ratio[index] ?? 50 };
  };

  return (
    <section
      className={cn(
        'min-h-0 flex-1 overflow-hidden rounded-lg border border-ssoo-content-border bg-card',
        layout === 'single' && 'flex flex-col',
        layout === 'vertical' && 'flex flex-col gap-0',
        layout === 'horizontal' && 'flex flex-row gap-0',
        className,
      )}
      data-ssoo-data-workspace-content
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          style={getChildStyle(index)}
          className={cn(
            'min-h-0',
            layout === 'vertical' && index > 0 && 'border-t border-ssoo-content-border',
            layout === 'horizontal' && index > 0 && 'border-l border-ssoo-content-border',
          )}
        >
          {child}
        </div>
      ))}
    </section>
  );
}

export function SsooDataGrid<TData, TValue>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
  enableSearch = false,
  searchField,
  searchPlaceholder = '검색...',
  enableColumnVisibility = false,
  enableSorting = true,
  headerClassName,
  headerCellClassName,
  getRowId,
  selectedRowId,
  pagination,
  enableClientPagination = false,
  emptyState,
  className,
  tableClassName,
  secondGrid,
}: SsooDataGridProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [paginationState, setPaginationState] = React.useState<PaginationState>({
    pageIndex: Math.max(0, (pagination?.page ?? 1) - 1),
    pageSize: pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
  });
  const secondGridEnabled = Boolean(secondGrid?.enabled);
  const isSecondGridControlled = secondGrid?.isOpen !== undefined;
  const [internalSecondGridOpen, setInternalSecondGridOpen] = React.useState(secondGrid?.defaultOpen ?? false);
  const isSecondGridOpen = isSecondGridControlled ? Boolean(secondGrid?.isOpen) : internalSecondGridOpen;

  React.useEffect(() => {
    if (!enableClientPagination) {
      return;
    }

    setPaginationState((prev) => {
      const next = {
        pageIndex: Math.max(0, (pagination?.page ?? 1) - 1),
        pageSize: pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
      };
      return prev.pageIndex === next.pageIndex && prev.pageSize === next.pageSize ? prev : next;
    });
  }, [enableClientPagination, pagination?.page, pagination?.pageSize]);

  React.useEffect(() => {
    if (secondGridEnabled && !isSecondGridControlled) {
      setInternalSecondGridOpen(secondGrid?.defaultOpen ?? false);
    }
  }, [isSecondGridControlled, secondGrid?.defaultOpen, secondGridEnabled]);

  const handlePaginationChange = React.useCallback((updater: Updater<PaginationState>) => {
    setPaginationState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (pagination) {
        if (next.pageIndex !== prev.pageIndex) {
          pagination.onPageChange(next.pageIndex + 1);
        }
        if (next.pageSize !== prev.pageSize) {
          pagination.onPageSizeChange?.(next.pageSize);
        }
      }
      return next;
    });
  }, [pagination]);

  const setSecondGridOpen = React.useCallback((nextOpen: boolean) => {
    if (!secondGridEnabled) {
      return;
    }
    if (!isSecondGridControlled) {
      setInternalSecondGridOpen(nextOpen);
    }
    secondGrid?.onOpenChange?.(nextOpen);
  }, [isSecondGridControlled, secondGrid, secondGridEnabled]);

  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label="행 선택"
          onClick={(event) => event.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(enableClientPagination && {
      getPaginationRowModel: getPaginationRowModel(),
      onPaginationChange: handlePaginationChange,
    }),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(enableClientPagination && { pagination: paginationState }),
    },
  });

  React.useEffect(() => {
    if (!onSelectionChange) {
      return;
    }
    onSelectionChange(table.getSelectedRowModel().rows.map((row) => row.original));
  }, [onSelectionChange, rowSelection, table]);

  if (error) {
    return <SsooErrorPanel className={className} error={error} title="데이터를 불러오지 못했습니다" onRetry={onRetry} />;
  }

  if (loading && data.length === 0) {
    return (
      <div className={cn('flex h-full min-h-40 items-center justify-center text-sm ssoo-text-primary-70', className)}>
        데이터를 불러오는 중...
      </div>
    );
  }

  const showToolbar = enableSearch || enableColumnVisibility;

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col', className)} data-ssoo-data-grid>
      {showToolbar ? (
        <SsooDataGridToolbar
          table={table}
          enableSearch={enableSearch}
          searchField={searchField}
          searchPlaceholder={searchPlaceholder}
          enableColumnVisibility={enableColumnVisibility}
        />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <SsooDataGridBody
          table={table}
          columns={tableColumns}
          loading={loading}
          emptyState={emptyState}
          onRowClick={onRowClick}
          tableClassName={tableClassName}
          minRows={pagination?.pageSize ?? DEFAULT_PAGE_SIZE}
          rowHeight={DEFAULT_ROW_HEIGHT}
          headerHeight={DEFAULT_HEADER_HEIGHT}
          headerClassName={headerClassName}
          headerCellClassName={headerCellClassName}
          getRowId={getRowId}
          selectedRowId={selectedRowId}
        />
        {secondGridEnabled ? (
          <SsooDataGridSecondPanel
            isOpen={isSecondGridOpen}
            height={secondGrid?.height ?? '66%'}
          >
            {secondGrid?.content}
          </SsooDataGridSecondPanel>
        ) : null}
      </div>

      <SsooDataGridFooter
        table={table}
        enableRowSelection={enableRowSelection}
        pagination={pagination}
        enableClientPagination={enableClientPagination}
        secondGrid={secondGridEnabled ? {
          isOpen: isSecondGridOpen,
          onToggle: () => setSecondGridOpen(!isSecondGridOpen),
        } : undefined}
      />
    </div>
  );
}

interface SsooDataGridToolbarProps<TData> {
  table: TanStackTable<TData>;
  enableSearch?: boolean;
  searchField?: string;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
}

function SsooDataGridToolbar<TData>({
  table,
  enableSearch,
  searchField,
  searchPlaceholder,
  enableColumnVisibility,
}: SsooDataGridToolbarProps<TData>) {
  const searchableColumn = searchField ? table.getColumn(searchField) : undefined;
  const searchFieldIdentifier = searchField?.replace(/[^a-zA-Z0-9_-]/g, '-') ?? 'column';

  return (
    <div className="mb-3 flex shrink-0 items-center gap-2">
      {enableSearch && searchableColumn ? (
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ssoo-text-primary-50" />
          <SsooSearchInput
            id={`ssoo-data-grid-${searchFieldIdentifier}-filter`}
            name={`ssoo-data-grid-${searchFieldIdentifier}-query`}
            ariaLabel={searchPlaceholder ?? `${searchField} 검색`}
            intent="data-filter"
            value={(searchableColumn.getFilterValue() as string | undefined) ?? ''}
            onChange={(event) => searchableColumn.setFilterValue(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-control-h pl-9"
          />
        </div>
      ) : null}

      {enableColumnVisibility ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="default" className="ml-auto">
              컬럼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

interface SsooDataGridBodyProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  tableClassName?: string;
  headerClassName?: string;
  headerCellClassName?: string;
  getRowId?: (row: TData) => string | number;
  selectedRowId?: string | number | null;
  minRows?: number;
  rowHeight?: number;
  headerHeight?: number;
}

function SsooDataGridBody<TData, TValue>({
  table,
  columns,
  loading = false,
  emptyState,
  onRowClick,
  tableClassName,
  headerClassName,
  headerCellClassName,
  getRowId,
  selectedRowId,
  minRows = 0,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
}: SsooDataGridBodyProps<TData, TValue>) {
  const minBodyHeight = minRows > 0 ? minRows * rowHeight + headerHeight : undefined;

  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-ssoo-content-border', tableClassName)}
      style={minBodyHeight ? { minHeight: minBodyHeight } : undefined}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className={cn('shadow-sm', headerClassName ?? 'bg-ssoo-content-bg')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} style={{ height: headerHeight }}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn('sticky top-0 z-10', headerCellClassName ?? 'bg-ssoo-content-bg')}
                    style={{ height: headerHeight }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {columns.map((_, columnIndex) => (
                  <TableCell key={`skeleton-${rowIndex}-${columnIndex}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            )) : null}

            {!loading && table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => {
              const rowId = getRowId ? getRowId(row.original) : undefined;
              const isActive = selectedRowId !== null && selectedRowId !== undefined && rowId === selectedRowId;

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'transition-colors',
                    row.index % 2 === 1 ? 'bg-ssoo-content-bg' : 'bg-card',
                    onRowClick && 'cursor-pointer hover:bg-ssoo-sitemap-bg',
                    isActive && 'bg-ssoo-content-border',
                  )}
                  style={{ height: rowHeight }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            }) : null}

            {!loading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-full text-center align-middle"
                  style={minBodyHeight ? { height: Math.max(0, minBodyHeight - headerHeight) } : undefined}
                >
                  {emptyState ?? <div className="text-sm font-normal ssoo-text-primary-70">조회된 데이터가 없습니다</div>}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface SsooDataGridFooterProps<TData> {
  table: TanStackTable<TData>;
  enableRowSelection?: boolean;
  pagination?: SsooDataGridPagination;
  enableClientPagination?: boolean;
  secondGrid?: {
    isOpen: boolean;
    onToggle: () => void;
  };
}

function SsooDataGridFooter<TData>({
  table,
  enableRowSelection = false,
  pagination,
  enableClientPagination = false,
  secondGrid,
}: SsooDataGridFooterProps<TData>) {
  const hasContent = enableRowSelection || pagination || enableClientPagination || secondGrid;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="relative flex min-h-[52px] items-center px-4 py-2">
      {secondGrid ? (
        <div className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 bg-transparent">
          <SsooDataGridSecondToggleButton
            isOpen={secondGrid.isOpen}
            onToggle={secondGrid.onToggle}
            className="pointer-events-auto"
          />
        </div>
      ) : null}

      {enableRowSelection ? (
        <div className="whitespace-nowrap text-sm ssoo-text-primary-70">
          {table.getFilteredSelectedRowModel().rows.length}개 선택됨 / {table.getFilteredRowModel().rows.length}개
        </div>
      ) : null}

      {pagination ? (
        <SsooDataGridPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          showTotal={!enableRowSelection}
          className={enableRowSelection ? 'ml-4 flex-1 px-0' : 'flex-1 px-0'}
        />
      ) : null}

      {enableClientPagination && !pagination ? (
        <div className={cn('flex items-center gap-2', enableRowSelection ? 'ml-4' : 'ml-auto')}>
          <Button type="button" variant="outline" size="default" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            이전
          </Button>
          <span className="text-sm ssoo-text-primary-70">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button type="button" variant="outline" size="default" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            다음
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface SsooDataGridPaginationProps extends SsooDataGridPagination {
  pageSizeOptions?: number[];
  showPageSizeSelect?: boolean;
  showTotal?: boolean;
  className?: string;
}

export function SsooDataGridPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50, 100],
  showPageSizeSelect = true,
  showTotal = true,
  className,
}: SsooDataGridPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className={cn('flex items-center justify-between px-2', className)}>
      <div className="flex items-center gap-4 text-sm ssoo-text-primary-70">
        {showPageSizeSelect && onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span>페이지당</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="h-control-h w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>개</span>
          </div>
        ) : null}

        {showTotal ? <span>{startItem}-{endItem} / 총 {total.toLocaleString()}개</span> : null}
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">첫 페이지</span>
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">이전 페이지</span>
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium">{page}</span>
          <span className="text-sm ssoo-text-primary-70">/</span>
          <span className="text-sm ssoo-text-primary-70">{totalPages}</span>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">다음 페이지</span>
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">마지막 페이지</span>
        </Button>
      </div>
    </div>
  );
}

interface SsooDataGridSecondToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function SsooDataGridSecondToggleButton({
  isOpen,
  onToggle,
  className,
}: SsooDataGridSecondToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xsIcon"
      onClick={onToggle}
      className={cn('w-12 transition-all duration-300 ease-in-out', className)}
      aria-label={isOpen ? '보조 그리드 접기' : '보조 그리드 펼치기'}
    >
      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
    </Button>
  );
}

interface SsooDataGridSecondPanelProps {
  isOpen: boolean;
  height: number | string;
  children: React.ReactNode;
}

export function SsooDataGridSecondPanel({
  isOpen,
  height,
  children,
}: SsooDataGridSecondPanelProps) {
  const panelHeight = typeof height === 'number' ? `${height}px` : height;
  const maxHeight = `calc(${panelHeight} + 24px)`;

  return (
    <div
      className="absolute bottom-0 left-[5px] right-[5px] z-10 overflow-visible"
      data-ssoo-data-grid-second-panel
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-ssoo-content-border bg-ssoo-content-bg shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out',
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
        style={{ maxHeight: isOpen ? maxHeight : 0 }}
      >
        <div className="bg-ssoo-content-bg">
          <div className="overflow-auto" style={{ height: panelHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export type {
  ColumnDef as SsooDataGridColumnDef,
  TanStackTable as SsooDataGridTable,
};
