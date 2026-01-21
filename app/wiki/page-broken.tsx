'use client';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ContextMenu from '@/components/wiki/ContextMenu';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useFileOperations } from '@/hooks/useFileOperations';
import { isMarkdownFile } from '@/utils/fileUtils';
import { FileNode } from '@/types/wiki';

export default function WikiPage() {
  // 커스텀 훅 사용
  const fileOps = useFileOperations();
  const contextMenuOps = useContextMenu();

  // 로컬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const sidebarWidth = 320;

  // 초기 로드
  useEffect(() => {
    fileOps.fetchTree();
    
    // Server-Sent Events로 실시간 파일 변화 감지
    const eventSource = new EventSource('/api/watch');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📡 파일 변화 감지:', data);
      
      if (data.type === 'change') {
        fileOps.fetchTree();
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE 연결 오류:', error);
      console.log('🔌 클라이언트 연결 종료');
    };

    return () => {
      eventSource.close();
      console.log('📡 SSE 스트림 취소됨');
      contextMenuOps.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // README 자동 로드
  useEffect(() => {
    if (fileOps.treeData.length > 0 && !fileOps.selectedFile) {
      const readme = fileOps.treeData.find(node => node.name === 'README.md' && node.type === 'file');
      if (readme) {
        fileOps.loadFile(readme.path);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileOps.treeData, fileOps.selectedFile]);

  // 폴더 토글
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // 모든 폴더 확장
  const expandAllFolders = () => {
    const getAllFolderPaths = (nodes: FileNode[], basePath = ''): string[] => {
      const paths: string[] = [];
      nodes.forEach(node => {
        if (node.type === 'directory') {
          const fullPath = basePath ? `${basePath}/${node.name}` : node.name;
          paths.push(fullPath);
          if (node.children) {
            paths.push(...getAllFolderPaths(node.children, fullPath));
          }
        }
      });
      return paths;
    };
    
    setExpandedFolders(new Set(getAllFolderPaths(fileOps.treeData)));
  };

  // 모든 폴더 축소
  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  // 검색 필터
  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    if (!searchQuery) return nodes;
    
    return nodes.filter(node => {
      const nameMatches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = node.children ? filterNodes(node.children) : [];
      
      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        };
      }
      return false;
    }).filter(Boolean) as FileNode[];
  };

  // 컨텍스트 메뉴 액션 처리
  const handleMenuAction = async (action: string) => {
    if (!contextMenuOps.contextMenu) return;

    if (action === 'open' && contextMenuOps.contextMenu.target) {
      if (contextMenuOps.contextMenu.target.type === 'file') {
        fileOps.loadFile(contextMenuOps.contextMenu.target.path);
      }
    } else if (action === 'delete' && contextMenuOps.contextMenu.target) {
      await fileOps.deleteFileOrFolder(contextMenuOps.contextMenu.target.path);
    } else if (action === 'new-file') {
      const folderPath = contextMenuOps.contextMenu.target?.type === 'directory' ? contextMenuOps.contextMenu.target.path : '';
      const fileName = prompt('새 파일 이름을 입력하세요:');
      if (fileName) {
        await fileOps.createFile(fileName, folderPath || undefined);
      }
    } else if (action === 'new-folder') {
      const folderPath = contextMenuOps.contextMenu.target?.type === 'directory' ? contextMenuOps.contextMenu.target.path : '';
      const folderName = prompt('새 폴더 이름을 입력하세요:');
      if (folderName) {
        await fileOps.createFolder(folderName, folderPath || undefined);
      }
    }
  };

  // 파일 트리 렌더링
  const renderTree = (nodes: FileNode[], level = 0, basePath = '') => {
    const filteredNodes = level === 0 ? filterNodes(nodes) : nodes;
    
    return filteredNodes.map((node) => {
      const fullPath = basePath ? `${basePath}/${node.name}` : node.name;
      const isExpanded = expandedFolders.has(fullPath);
      
      return (
        <div key={fullPath} style={{ marginLeft: `${level * 20}px` }}>
          <div
            className={`flex items-center py-1 px-2 rounded cursor-pointer transition-colors hover:bg-gray-100 ${
              fileOps.selectedFile === node.path ? 'bg-blue-100' : ''
            }`}
            onClick={() => {
              if (node.type === 'file') {
                fileOps.loadFile(node.path);
              } else {
                toggleFolder(fullPath);
              }
            }}
            onContextMenu={(e) => contextMenuOps.handleContextMenu(e, node)}
          >
            {node.type === 'directory' && (
              <span className="mr-1 text-xs">
                {isExpanded ? '📂' : '📁'}
              </span>
            )}
            {node.type === 'file' && (
              <span className="mr-1 text-xs">
                {isMarkdownFile(node.name) ? '📄' : '📄'}
              </span>
            )}
            <span className="text-sm text-gray-800 truncate min-w-0">{node.name}</span>
          </div>
          {node.type === 'directory' && isExpanded && node.children && (
            <div>
              {renderTree(node.children, level + 1, fullPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      <div
        className="bg-white border-r border-gray-200 flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">📝 Markdown Wiki</h1>
          
          {/* 검색 */}
          <div className="mt-3">
            <Input
              type="text"
              placeholder="파일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* 폴더 컨트롤 */}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Button variant="outline" size="small" onClick={expandAllFolders}>
              📂 모두 열기
            </Button>
            <Button variant="outline" size="small" onClick={collapseAllFolders}>
              📁 모두 닫기
            </Button>
          </div>

          {/* 새 파일/폴더 */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-1">
              <select
                value={fileOps.selectedFileType}
                onChange={(e) => fileOps.setSelectedFileType(e.target.value as 'md' | 'txt' | 'json' | 'js' | 'ts' | 'css')}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="md">Markdown</option>
                <option value="txt">Text</option>
                <option value="json">JSON</option>
                <option value="js">JavaScript</option>
                <option value="ts">TypeScript</option>
                <option value="css">CSS</option>
              </select>
            </div>
            <Button
              onClick={() => {
                const fileName = prompt('새 파일 이름을 입력하세요:');
                if (fileName) {
                  fileOps.createFile(fileName);
                }
              }}
              className="w-full text-xs h-8"
            >
              📄 새 파일
            </Button>
            <Button
              onClick={() => {
                const folderName = prompt('새 폴더 이름을 입력하세요:');
                if (folderName) {
                  fileOps.createFolder(folderName);
                }
              }}
              className="w-full text-xs h-8"
            >
              📁 새 폴더
            </Button>
          </div>
        </div>

        {/* 파일 트리 */}
        <div 
          className="flex-1 overflow-y-auto p-2 tree-container"
          onContextMenu={(e) => contextMenuOps.handleContextMenu(e)}
        >
          {renderTree(fileOps.treeData)}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 m-4">
          {fileOps.selectedFile ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{fileOps.selectedFile}</h2>
                <div className="space-x-2">
                  {fileOps.isEditing ? (
                    <>
                      <Button onClick={fileOps.saveFile}>💾 저장</Button>
                      <Button variant="outline" onClick={() => fileOps.setIsEditing(false)}>❌ 취소</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => fileOps.setIsEditing(true)}>✏️ 편집</Button>
                      <Button variant="primary" onClick={() => fileOps.deleteFileOrFolder(fileOps.selectedFile!)}>
                        🗑️ 삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {fileOps.isEditing ? (
                <textarea
                  value={fileOps.content}
                  onChange={(e) => fileOps.setContent(e.target.value)}
                  className="w-full h-[70vh] border p-2 rounded-md font-mono text-sm"
                />
              ) : (
                <div className="prose max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children, ...props }) => {
                        if (href && isMarkdownFile(href)) {
                          return (
                            <button
                              className="text-blue-600 underline hover:text-blue-800"
                              onClick={() => fileOps.loadFile(href)}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      }
                    }}
                  >
                    {fileOps.content}
                  </ReactMarkdown>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">왼쪽에서 문서를 선택하거나 새로 만드세요.</p>
          )}
        </Card>

        {/* 컨텍스트 메뉴 */}
        <ContextMenu
          contextMenu={contextMenuOps.contextMenu}
          selectedFileType={fileOps.selectedFileType}
          onClose={contextMenuOps.closeContextMenu}
          onMenuAction={handleMenuAction}
        />
      </div>
    </div>
  );
}