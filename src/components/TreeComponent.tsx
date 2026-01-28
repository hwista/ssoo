'use client';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { normalizePath } from '@/lib/utils/pathUtils';
import { logger } from '@/lib/utils/errorUtils';
import type { FileNode } from '@/types';

interface TreeComponentProps {
  // 트리 데이터와 기본 동작
  treeData: FileNode[];
  selectedFile?: string | null;
  onFileSelect?: (path: string) => void;
  
  // 검색 기능
  showSearch?: boolean;
  searchPlaceholder?: string;
  
  // 확장/축소 기능
  showExpandCollapseButtons?: boolean;
  defaultExpanded?: boolean;
  expandedFolders?: Set<string>;
  onExpandedFoldersChange?: (expanded: Set<string>) => void;
  onToggleFolder?: (path: string) => void; // 개별 폴더 토글
  
  // 컨텍스트 메뉴
  enableContextMenu?: boolean;
  onContextMenu?: (event: React.MouseEvent, node: FileNode | null) => void;
  
  // 표시 옵션
  showOnlyFolders?: boolean; // 폴더만 표시 (모달용)
  showFileIcons?: boolean;   // 파일 아이콘 표시
  
  // 새로 생성된 항목
  newlyCreatedItems?: Set<string>; // 새로 생성된 항목들의 경로
  updatedItems?: Set<string>; // 수정된 항목들의 경로
  
  // 이름 변경
  renamingItem?: { path: string; newName: string } | null;
  onRename?: (oldPath: string, newName: string) => void;
  onCancelRename?: () => void;
  onRenamingNameChange?: (newName: string) => void;
  
  // 스타일링
  className?: string;
  height?: string;
}

const TreeComponent: React.FC<TreeComponentProps> = ({
  treeData,
  selectedFile,
  onFileSelect,
  showSearch = true,
  searchPlaceholder = "파일 검색...",
  showExpandCollapseButtons = true,
  defaultExpanded = false,
  expandedFolders: externalExpandedFolders,
  onExpandedFoldersChange,
  onToggleFolder,
  enableContextMenu = true,
  onContextMenu,
  showOnlyFolders = false,
  showFileIcons = true,
  newlyCreatedItems = new Set(),
  updatedItems = new Set(),
  renamingItem,
  onRename,
  onCancelRename,
  onRenamingNameChange,
  className = "",
  height = "100%"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalExpandedFolders, setInternalExpandedFolders] = useState<Set<string>>(new Set());
  
  // expandedFolders를 외부에서 관리하는지 내부에서 관리하는지 결정
  const expandedFolders = externalExpandedFolders || internalExpandedFolders;
  const setExpandedFolders = onExpandedFoldersChange || setInternalExpandedFolders;

  // 자동 스크롤 기능 - 새로 생성된 항목이나 선택된 파일로 스크롤
  useEffect(() => {
    // 새로 생성된 항목이 있는지 확인
    const newlyCreatedArray = Array.from(newlyCreatedItems);
    const targetPath = newlyCreatedArray.length > 0 
      ? newlyCreatedArray[newlyCreatedArray.length - 1] // 가장 최근 생성된 항목
      : selectedFile;

    if (process.env.NODE_ENV === 'development') {
      console.log('스크롤 체크:', { 
        targetPath, 
        selectedFile,
        newlyCreatedCount: newlyCreatedArray.length,
        isNewlyCreated: targetPath ? newlyCreatedItems.has(targetPath) : false 
      });
    }
    
    if (targetPath && (newlyCreatedItems.has(targetPath) || targetPath === selectedFile)) {
      logger.debug('자동 스크롤 시도', { targetPath });
      
      // DOM 요소가 렌더링될 때까지 잠시 대기
      const scrollToElement = () => {
        // querySelector 대신 더 안전한 방법 사용
        const allElements = document.querySelectorAll('[data-file-path]');
        let targetElement = null;
        
        console.log('전체 data-file-path 요소 개수:', allElements.length);
        console.log('찾는 경로:', targetPath);
        
        // 모든 요소를 순회하여 정확한 경로 매칭 (경로 구분자 정규화)
        for (const element of allElements) {
          const filePath = element.getAttribute('data-file-path');
          console.log('검사 중인 경로:', filePath);
          
          // 경로 구분자를 정규화하여 비교 (\ 또는 /를 통일)
          const normalizedFilePath = normalizePath(filePath || '');
          const normalizedTargetPath = normalizePath(targetPath);
          
          if (normalizedFilePath === normalizedTargetPath) {
            targetElement = element;
            console.log('매칭된 요소 발견! (정규화된 경로)');
            console.log('DOM 경로:', filePath);
            console.log('찾는 경로:', targetPath);
            console.log('정규화된 DOM 경로:', normalizedFilePath);
            console.log('정규화된 찾는 경로:', normalizedTargetPath);
            break;
          }
        }
        
        console.log('스크롤 타겟 요소:', targetElement);
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          console.log('스크롤 실행됨');
          return true;
        }
        return false;
      };

      // 즉시 시도하고, 실패하면 잠시 후 재시도
      if (!scrollToElement()) {
        console.log('첫 번째 스크롤 시도 실패, 100ms 후 재시도');
        setTimeout(() => {
          if (!scrollToElement()) {
            console.log('두 번째 스크롤 시도도 실패, 500ms 후 재시도');
            setTimeout(scrollToElement, 500);
          }
        }, 100);
      }
    }
  }, [selectedFile, newlyCreatedItems, updatedItems]);

  // 초기 확장 상태 설정
  useEffect(() => {
    if (defaultExpanded && !externalExpandedFolders) {
      const allFolders = new Set<string>();
      const collectFolders = (nodes: FileNode[]) => {
        nodes.forEach(node => {
          if (node.type === 'directory') {
            allFolders.add(node.path);
            if (node.children) {
              collectFolders(node.children);
            }
          }
        });
      };
      collectFolders(treeData);
      setExpandedFolders(allFolders);
    }
  }, [treeData, defaultExpanded, externalExpandedFolders, setExpandedFolders]);

  // 전체 펼치기
  const expandAll = () => {
    const allFolders = new Set<string>();
    const collectFolders = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'directory') {
          allFolders.add(node.path);
          if (node.children) {
            collectFolders(node.children);
          }
        }
      });
    };
    collectFolders(treeData);
    setExpandedFolders(allFolders);
  };

  // 전체 접기
  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  // 폴더 토글
  const toggleFolder = (path: string) => {
    // 외부에서 토글 함수를 제공하면 사용 (TreeDataContext 등)
    if (onToggleFolder) {
      onToggleFolder(path);
    } else {
      // 내부 상태로 관리
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      setExpandedFolders(newExpanded);
    }
  };

  // 트리 정렬 함수 (폴더 먼저, 그 다음 파일)
  const sortTree = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .sort((a, b) => {
        // 1. 타입별 정렬 (directory가 file보다 먼저)
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        // 2. 같은 타입 내에서는 이름으로 정렬 (대소문자 구분 없이)
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      })
      .map(node => {
        // 자식 노드가 있으면 재귀적으로 정렬
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: sortTree(node.children)
          };
        }
        return node;
      });
  };

  // 검색 필터링
  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = node.children && filterTree(node.children, query).length > 0;
      
      if (matchesSearch) return true;
      if (hasMatchingChildren) {
        return {
          ...node,
          children: filterTree(node.children!, query)
        };
      }
      return false;
    }).map(node => {
      if (node.children) {
        return {
          ...node,
          children: filterTree(node.children, query)
        };
      }
      return node;
    });
  };

  // 파일 아이콘 가져오기
  const getFileIcon = (node: FileNode) => {
    if (!showFileIcons) return '';
    
    if (node.type === 'directory') {
      return '📁';
    }
    
    const extension = node.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'md':
        return '📝';
      case 'txt':
        return '📄';
      case 'js':
      case 'ts':
        return '📜';
      case 'json':
        return '⚙️';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '🖼️';
      default:
        return '📄';
    }
  };

  // 트리 노드 렌더링 함수
  const renderTreeNode = (node: FileNode, level: number = 0): React.ReactNode => {
    if (showOnlyFolders && node.type === 'file') {
      return null;
    }
    
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    
    // 새로 생성된 항목 체크 시 경로 정규화
    const normalizedNodePath = normalizePath(node.path);
    const isNewlyCreated = Array.from(newlyCreatedItems).some(item => 
      normalizePath(item) === normalizedNodePath
    );
    
    // 수정된 항목 체크 시 경로 정규화
    const isUpdated = Array.from(updatedItems).some(item => 
      normalizePath(item) === normalizedNodePath
    );
    
    // 이름 변경 중인지 확인
    const isRenaming = renamingItem?.path === node.path;
    
    const icon = getFileIcon(node);
    
    // 디버깅용 로그
    if (isNewlyCreated) {
      console.log('새로 생성된 항목 렌더링:', node.path, 'isNewlyCreated:', isNewlyCreated);
      console.log('data-file-path 속성:', node.path);
    }
    
    return (
      <div key={node.path}>
        <div
          data-file-path={node.path}
          className={`flex items-center gap-1 h-control-h px-2 cursor-pointer rounded-md transition-colors duration-150 group ${
            isSelected 
              ? 'bg-ssoo-content-border text-ssoo-primary font-medium' 
              : isNewlyCreated
                ? 'text-green-600 hover:bg-ssoo-sitemap-bg'
                : isUpdated
                  ? 'text-blue-600 hover:bg-ssoo-sitemap-bg'
                  : 'text-gray-700 hover:bg-ssoo-sitemap-bg'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            // 폴더인 경우 선택만, 파일인 경우 선택 + 로드
            if (onFileSelect) {
              onFileSelect(node.path);
            }
          }}
          onContextMenu={enableContextMenu ? (e) => onContextMenu?.(e, node) : undefined}
        >
          {node.type === 'directory' && (
            <span 
              className={`flex-shrink-0 select-none cursor-pointer transition-transform ${
                isSelected ? 'text-ssoo-primary' : 'text-gray-400'
              } ${isExpanded ? 'rotate-90' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // 부모 클릭 이벤트 차단
                toggleFolder(node.path);
              }}
              title={isExpanded ? '접기' : '펼치기'}
            >
              ▶
            </span>
          )}
          {node.type !== 'directory' && <span className="w-4 h-4 flex-shrink-0" />}
          {icon && <span className={`flex-shrink-0 ${isSelected ? '' : ''}`}>{icon}</span>}
          {isRenaming ? (
            <input
              type="text"
              value={renamingItem?.newName || ''}
              onChange={(e) => {
                onRenamingNameChange?.(e.target.value);
              }}
              onBlur={() => {
                if (renamingItem && onRename) {
                  onRename(renamingItem.path, renamingItem.newName);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renamingItem && onRename) {
                    onRename(renamingItem.path, renamingItem.newName);
                  }
                } else if (e.key === 'Escape') {
                  onCancelRename?.();
                }
              }}
              autoFocus
              className="flex-1 min-w-0 text-sm bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className={`truncate flex-1 min-w-0 ${
                isNewlyCreated ? 'font-bold text-base' : 
                isUpdated ? 'font-bold text-base' : 
                'text-sm'
              }`} 
              title={node.name}
            >
              {node.name}
            </span>
          )}
          {isNewlyCreated && !isRenaming && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-sm select-none">
              NEW
            </span>
          )}
          {isUpdated && !isNewlyCreated && !isRenaming && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-bold text-white bg-yellow-500 rounded-sm select-none">
              UPDATE
            </span>
          )}
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {sortTree(node.children)
              .filter(child => !showOnlyFolders || child.type === 'directory')
              .map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = sortTree(filterTree(treeData, searchQuery));

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {/* 상단 컨트롤 영역 - 검색이나 확장/축소 버튼이 활성화된 경우에만 렌더링 */}
      {(showSearch || showExpandCollapseButtons) && (
        <div className="flex-shrink-0 p-3 border-b bg-gray-50">
          {/* 검색 입력과 버튼들을 한 줄에 배치 */}
          <div className="flex items-center gap-2 mb-2">
            {showSearch && (
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm"
              />
            )}
            
            {showExpandCollapseButtons && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Button onClick={expandAll} title="전체 펼치기" size="sm" variant="ghost">▼</Button>
                <Button onClick={collapseAll} title="전체 접기" size="sm" variant="ghost">▶</Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 트리 영역 */}
      <div className="flex-1 overflow-auto p-2">
        {filteredTree.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            {searchQuery ? '검색 결과가 없습니다.' : '파일이 없습니다.'}
          </div>
        ) : (
          <div>
            {filteredTree
              .filter(node => !showOnlyFolders || node.type === 'directory')
              .map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeComponent;