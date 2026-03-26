'use client';

import * as React from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterFileTree } from '@/lib/utils/fileTree';
import type { FileNode } from '@/types/file-tree';

export interface PickerTreeProps {
  files: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  /** 'file': 파일 선택 (폴더=펼침만), 'folder': 폴더 선택 (폴더=선택+펼침). 기본: 'file' */
  mode?: 'file' | 'folder';
  /** 파일 확장자 필터 (mode='file'일 때만 유효, 예: ['.md']) */
  fileFilter?: string[];
  /** 검색 입력 표시 여부 */
  showSearch?: boolean;
  /** 루트("/") 옵션 표시 여부 */
  showRoot?: boolean;
  /** 외부 필터 값 (제공 시 내부 검색 대신 사용) */
  filterValue?: string;
  /** 필터 모드: 'name'=이름 부분 일치(기본), 'path'=경로 접두사 일치 */
  filterMode?: 'name' | 'path';
  placeholder?: string;
  maxHeight?: string;
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  selectedPath: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  folderMode: boolean;
  fileFilter?: string[];
}

function sortNodes(nodes: FileNode[], foldersOnly: boolean): FileNode[] {
  const filtered = foldersOnly
    ? nodes.filter((n) => n.type === 'directory')
    : nodes;
  return [...filtered].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

function matchesFilter(name: string, filter?: string[]): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.some((ext) => name.endsWith(ext));
}

/** 경로 접두사 필터: 노드 경로가 query로 시작하거나, query가 노드 경로로 시작하면 포함 */
function filterByPath(nodes: FileNode[], query: string): FileNode[] {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();

  return nodes.reduce<FileNode[]>((acc, node) => {
    const lowerPath = node.path.toLowerCase();
    // 노드가 query의 조상이거나 자손이면 포함
    const isAncestor = lowerQuery.startsWith(lowerPath + '/') || lowerQuery === lowerPath;
    const isDescendant = lowerPath.startsWith(lowerQuery + '/') || lowerPath.startsWith(lowerQuery);
    const nameMatch = node.name.toLowerCase().startsWith(lowerQuery.split('/').pop() || '');

    if (isAncestor || isDescendant || nameMatch) {
      const filteredChildren = node.children ? filterByPath(node.children, query) : [];
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }

    return acc;
  }, []);
}

function TreeNode({ node, level, selectedPath, expandedPaths, onToggle, onSelect, folderMode, fileFilter }: TreeNodeProps) {
  const isDir = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  if (!isDir && (folderMode || !matchesFilter(node.name, fileFilter))) return null;

  const children = isDir ? sortNodes(node.children ?? [], folderMode) : [];
  const hasChildren = children.length > 0;

  const handleClick = () => {
    if (folderMode) {
      onSelect(node.path);
      if (hasChildren) onToggle(node.path);
    } else if (isDir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <div
        data-picker-path={node.path}
        onClick={handleClick}
        className={cn(
          'flex h-7 w-full cursor-pointer items-center gap-1 rounded-md px-2 text-caption transition-colors',
          isSelected
            ? 'bg-ssoo-content-border text-label-sm text-ssoo-primary'
            : 'hover:bg-ssoo-sitemap-bg text-gray-700',
        )}
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        {isDir && hasChildren ? (
          <ChevronRight
            className={cn('w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform', isExpanded && 'rotate-90')}
          />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}

        {isDir ? (
          isExpanded
            ? <FolderOpen className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
            : <Folder className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
        ) : (
          <FileText className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-ssoo-primary' : 'text-gray-400')} />
        )}

        <span className="flex-1 truncate">{node.title || node.name}</span>
      </div>

      {isDir && isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
              folderMode={folderMode}
              fileFilter={fileFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 통합 파일/폴더 선택 트리.
 * mode='file': 파일 선택 모드 (LinkInsertDialog 등)
 * mode='folder': 폴더 선택 모드 (SaveLocationDialog 등)
 */
export function PickerTree({
  files,
  selectedPath,
  onSelect,
  mode = 'file',
  fileFilter,
  showSearch = false,
  showRoot = false,
  filterValue,
  filterMode = 'name',
  placeholder = '검색...',
  maxHeight = '100%',
}: PickerTreeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const folderMode = mode === 'folder';
  const [searchQuery, setSearchQuery] = React.useState('');

  // 외부 filterValue 우선, 없으면 내부 searchQuery 사용
  const activeQuery = filterValue ?? searchQuery;
  const hasActiveFilter = activeQuery.length > 0;

  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => {
    const paths = new Set<string>();
    if (selectedPath && selectedPath !== '/') {
      const parts = selectedPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'));
      }
    }
    return paths;
  });

  // selectedPath 변경 시 ancestor 폴더 자동 펼침
  React.useEffect(() => {
    if (!selectedPath || selectedPath === '/') return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const parts = selectedPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        next.add(parts.slice(0, i).join('/'));
      }
      return next;
    });
  }, [selectedPath]);

  // 선택된 항목으로 자동 스크롤
  React.useEffect(() => {
    if (!containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      const isRoot = !selectedPath || selectedPath === '/';
      const selector = isRoot
        ? '[data-picker-path="/"]'
        : `[data-picker-path="${CSS.escape(selectedPath)}"]`;
      const el = containerRef.current?.querySelector(selector);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedPath, expandedPaths]);

  const handleToggle = React.useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const displayTree = React.useMemo(() => {
    let filtered = files;
    if (activeQuery) {
      filtered = filterMode === 'path'
        ? filterByPath(files, activeQuery)
        : filterFileTree(files, activeQuery);
    }
    return sortNodes(filtered, folderMode);
  }, [files, activeQuery, filterMode, folderMode]);

  // 필터 활성 시 모든 폴더 자동 확장
  React.useEffect(() => {
    if (hasActiveFilter) {
      const allDirPaths = new Set<string>();
      const collectDirs = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.type === 'directory') {
            allDirPaths.add(n.path);
            if (n.children) collectDirs(n.children);
          }
        }
      };
      collectDirs(displayTree);
      setExpandedPaths(allDirPaths);
    }
  }, [hasActiveFilter, displayTree]);

  const isRootSelected = selectedPath === '' || selectedPath === '/';

  const emptyMessage = hasActiveFilter
    ? '검색 결과 없음'
    : (folderMode ? '폴더가 없습니다.' : '파일 없음');

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full h-control-h-sm rounded-md border border-ssoo-content-border bg-transparent pl-7 pr-7 text-caption focus:border-ssoo-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-y-auto flex-1 min-h-0 rounded-md border border-ssoo-content-border"
        style={maxHeight !== '100%' ? { maxHeight } : undefined}
      >
        {displayTree.length === 0 && (!showRoot || hasActiveFilter) ? (
          <div className="px-3 py-4 text-caption text-gray-400 text-center">
            {emptyMessage}
          </div>
        ) : (
          <div className="p-1">
            {showRoot && !hasActiveFilter && (
              <div
                data-picker-path="/"
                onClick={() => onSelect('')}
                className={cn(
                  'flex h-7 w-full cursor-pointer items-center gap-1 rounded-md px-2 text-caption transition-colors',
                  isRootSelected
                    ? 'bg-ssoo-content-border text-label-sm text-ssoo-primary'
                    : 'hover:bg-ssoo-sitemap-bg text-gray-700',
                )}
              >
                <Folder className={cn('w-3.5 h-3.5 shrink-0', isRootSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
                <span className="flex-1 truncate">/  (루트)</span>
              </div>
            )}
            {displayTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                level={showRoot ? 1 : 0}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                onSelect={onSelect}
                folderMode={folderMode}
                fileFilter={fileFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
