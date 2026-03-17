'use client';

import * as React from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterFileTree } from '@/lib/utils/fileTree';
import type { FileNode } from '@/types/file-tree';

export interface FilePickerTreeProps {
  files: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  /** .md 등 확장자 필터 (예: ['.md']) */
  fileFilter?: string[];
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
  fileFilter?: string[];
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

function matchesFilter(name: string, filter?: string[]): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.some((ext) => name.endsWith(ext));
}

function TreeNode({ node, level, selectedPath, expandedPaths, onToggle, onSelect, fileFilter }: TreeNodeProps) {
  const isDir = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  if (!isDir && !matchesFilter(node.name, fileFilter)) return null;

  const children = isDir ? sortNodes(node.children ?? []) : [];
  const hasChildren = children.length > 0;

  const handleClick = () => {
    if (isDir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 w-full h-7 px-2 text-xs rounded-md transition-colors cursor-pointer',
          isSelected
            ? 'bg-ssoo-primary/10 text-ssoo-primary font-medium ring-1 ring-ssoo-primary/30'
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
              fileFilter={fileFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 파일 선택 트리 (검색 필터 내장)
 * FolderPickerTree와 달리 파일도 표시하며, 파일 클릭 시 onSelect 호출
 */
export function FilePickerTree({
  files,
  selectedPath,
  onSelect,
  fileFilter,
  placeholder = '파일 검색...',
  maxHeight = '240px',
}: FilePickerTreeProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => {
    const paths = new Set<string>();
    if (selectedPath) {
      const parts = selectedPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'));
      }
    }
    return paths;
  });

  const handleToggle = React.useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const displayTree = React.useMemo(() => {
    const filtered = searchQuery ? filterFileTree(files, searchQuery) : files;
    return sortNodes(filtered);
  }, [files, searchQuery]);

  // 검색 시 모든 폴더 자동 확장
  React.useEffect(() => {
    if (searchQuery) {
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
  }, [searchQuery, displayTree]);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-control-h-sm pl-7 pr-7 text-xs border border-ssoo-content-border rounded-md focus:outline-none focus:border-ssoo-primary bg-transparent"
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

      <div className="overflow-y-auto flex-1 min-h-0 rounded-md border border-ssoo-content-border" style={maxHeight !== '100%' ? { maxHeight } : undefined}>
        {displayTree.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            {searchQuery ? '검색 결과 없음' : '파일 없음'}
          </div>
        ) : (
          <div className="py-1">
            {displayTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                level={0}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                onSelect={onSelect}
                fileFilter={fileFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
