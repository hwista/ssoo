'use client';

import * as React from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/types/file-tree';

interface FolderPickerTreeProps {
  files: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
}

interface FolderNodeProps {
  node: FileNode;
  level: number;
  selectedPath: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function sortDirectories(nodes: FileNode[]): FileNode[] {
  return [...nodes]
    .filter((n) => n.type === 'directory')
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

function FolderNode({ node, level, selectedPath, expandedPaths, onToggle, onSelect }: FolderNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const childDirs = sortDirectories(node.children ?? []);
  const hasChildDirs = childDirs.length > 0;

  const handleClick = () => {
    onSelect(node.path);
    if (hasChildDirs) onToggle(node.path);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 w-full h-8 px-2 text-sm rounded-md transition-colors cursor-pointer',
          isSelected
            ? 'bg-ssoo-primary/10 text-ssoo-primary font-medium ring-1 ring-ssoo-primary/30'
            : 'hover:bg-ssoo-sitemap-bg text-gray-700'
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {hasChildDirs ? (
          <ChevronRight
            className={cn(
              'w-4 h-4 shrink-0 text-gray-400 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        {isExpanded ? (
          <FolderOpen className={cn('w-4 h-4 shrink-0', isSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
        ) : (
          <Folder className={cn('w-4 h-4 shrink-0', isSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
        )}

        <span className="flex-1 truncate">{node.name}</span>
      </div>

      {hasChildDirs && isExpanded && (
        <div>
          {childDirs.map((child) => (
            <FolderNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 디렉토리 전용 트리 선택 컴포넌트.
 * 사이드바 FileTree 와 상태를 공유하지 않으며, 자체 expand/collapse를 관리합니다.
 */
export function FolderPickerTree({ files, selectedPath, onSelect }: FolderPickerTreeProps) {
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => {
    // 초기: selectedPath의 상위 폴더를 모두 펼침
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

  const directories = sortDirectories(files);

  if (directories.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-gray-400 text-center">
        폴더가 없습니다.
      </div>
    );
  }

  // 루트("/") 선택 옵션
  const isRootSelected = selectedPath === '' || selectedPath === '/';

  return (
    <div className="py-1">
      <div
        onClick={() => onSelect('')}
        className={cn(
          'flex items-center gap-1 w-full h-8 px-2 text-sm rounded-md transition-colors cursor-pointer',
          isRootSelected
            ? 'bg-ssoo-primary/10 text-ssoo-primary font-medium ring-1 ring-ssoo-primary/30'
            : 'hover:bg-ssoo-sitemap-bg text-gray-700'
        )}
      >
        <Folder className={cn('w-4 h-4 shrink-0', isRootSelected ? 'text-ssoo-primary' : 'text-gray-500')} />
        <span className="flex-1 truncate">/  (루트)</span>
      </div>

      {directories.map((node) => (
        <FolderNode
          key={node.path}
          node={node}
          level={1}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
