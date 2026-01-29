'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Folder, Settings, Plus, RefreshCw, Upload } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useTreeStore, useWikiUIStore, useWikiItemsStore, useWikiEditorStore } from '@/stores';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useToast } from '@/lib/toast';
import TreeComponent from '@/components/TreeComponent';
import CreateFileModal from '@/components/CreateFileModal';
import { useMessage } from '@/hooks/useMessage';
import { logger } from '@/lib/utils/errorUtils';
import type { FileNode } from '@/types';
import { WikiSidebarProps } from '@/types/components';

const WikiSidebar: React.FC<WikiSidebarProps> = ({
  width,
  className = ""
}) => {
  // tree-store에서 트리 상태 가져오기
  const {
    selectedFile,
    expandedFolders,
    toggleFolder,
    expandAll,
    collapseAll,
    selectFile,
    findNodeByPath
  } = useTreeStore();

  // tree-store에서 파일 데이터 가져오기
  const { files, refreshFileTree } = useTreeStore();
  
  // wiki-editor-store에서 파일 로드 가져오기
  const { loadFile } = useWikiEditorStore();
  
  // useFileOperations에서 CRUD 작업 가져오기
  const { createFile, deleteFile, renameFile } = useFileOperations();
  
  // Toast 알림
  const { showSuccess, showError: showErrorToast } = useToast();
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') showSuccess('알림', message);
    else if (type === 'error') showErrorToast('오류', message);
    else showSuccess('정보', message);
  };

  // UI Store에서 UI 상태 가져오기
  const {
    contextMenu,
    setContextMenu,
    createModal,
    setCreateModal,
    renamingItem,
    setRenamingItem,
  } = useWikiUIStore();

  // Items Store에서 생성/업데이트 아이템 상태 가져오기
  const {
    newlyCreatedItems,
    updatedItems,
    addUpdatedItem,
  } = useWikiItemsStore();

  // 메시지 처리 hook
  const { showError } = useMessage();

  // 로컬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Refs
  const menuIdCounterRef = useRef(0);
  const contextMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(async (path: string) => {
    logger.info('파일 선택됨', { path });
    
    // 디렉토리인 경우 폴더 확장/축소만 처리
    const node = findNodeByPath(path);
    if (node?.type === 'directory') {
      toggleFolder(path);
      return;
    }

    // 파일인 경우 선택하고 로드
    if (node?.type === 'file') {
      selectFile(path);
      await loadFile(path);
    }
  }, [findNodeByPath, toggleFolder, selectFile, loadFile]);

  // 컨텍스트 메뉴 표시 함수
  const showNewContextMenu = useCallback((e: React.MouseEvent, node: FileNode | null = null) => {
    const menuId = `menu-${++menuIdCounterRef.current}`;
    
    // 이전 타이머 정리
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
      contextMenuTimeoutRef.current = null;
    }

    const menuType = node 
      ? (node.type === 'directory' ? 'folder' : 'file')
      : 'empty';

    const newContextMenu = {
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target: node,
      type: menuType as 'file' | 'folder' | 'empty',
      id: menuId,
      isRendering: false
    };

    setContextMenu(newContextMenu);

    logger.debug('컨텍스트 메뉴 표시', { menuId, type: newContextMenu.type });
  }, [setContextMenu]);

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    
    logger.debug('컨텍스트 메뉴 호출', { node: node?.path || 'empty', x: e.clientX, y: e.clientY });
    
    // 기존 메뉴가 있으면 닫기
    if (contextMenu?.visible) {
      setContextMenu(null);
      setTimeout(() => {
        showNewContextMenu(e, node);
      }, 50);
      return;
    }
    
    showNewContextMenu(e, node);
  }, [contextMenu, setContextMenu, showNewContextMenu]);

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
      contextMenuTimeoutRef.current = null;
    }
  }, [setContextMenu]);

  // 파일/폴더 생성 핸들러
  const handleCreate = useCallback((type: 'file' | 'folder', parentPath?: string) => {
    closeContextMenu();
    setCreateModal({
      isOpen: true,
      mode: type,
      initialPath: parentPath || ''
    });
  }, [closeContextMenu, setCreateModal]);

  // 삭제 핸들러
  const handleDelete = useCallback(async (path: string) => {
    closeContextMenu();
    
    const confirmDelete = window.confirm(
      `정말로 "${path}"를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    );
    
    if (confirmDelete) {
      try {
        await deleteFile(path);
        showNotification('항목이 삭제되었습니다.', 'success');
      } catch (error) {
        showNotification(
          error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.',
          'error'
        );
      }
    }
  }, [closeContextMenu, deleteFile, showNotification]);

  // 이름 변경 시작
  const handleRenameStart = useCallback((path: string, currentName: string) => {
    closeContextMenu();
    setRenamingItem({
      path,
      newName: currentName
    });
  }, [closeContextMenu, setRenamingItem]);

  // 이름 변경 완료
  const handleRenameComplete = useCallback(async (oldPath: string, newName: string) => {
    try {
      const pathParts = oldPath.split('/');
      const oldName = pathParts[pathParts.length - 1];
      
      // 동일한 이름이면 아무 작업도 하지 않음
      if (oldName === newName) {
        setRenamingItem(null);
        return;
      }
      
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      
      await renameFile(oldPath, newPath);
      setRenamingItem(null);
      
      // 업데이트된 항목으로 표시 (새로운 경로로)
      addUpdatedItem(newPath);
      
      showNotification('이름이 변경되었습니다.', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : '이름 변경 중 오류가 발생했습니다.',
        'error'
      );
    }
  }, [renameFile, setRenamingItem, addUpdatedItem, showNotification]);

  // 이름 변경 취소
  const handleRenameCancel = useCallback(() => {
    setRenamingItem(null);
  }, [setRenamingItem]);

  // 이름 변경 중 이름 업데이트
  const handleRenamingNameChange = useCallback((newName: string) => {
    if (renamingItem) {
      setRenamingItem({ ...renamingItem, newName });
    }
  }, [renamingItem, setRenamingItem]);

  // 모달에서 파일/폴더 생성 처리
  const handleCreateFromModal = useCallback(async (params: {
    name: string;
    extension: string;
    path: string;
    type: 'file' | 'folder';
  }) => {
    console.log('🚀 handleCreateFromModal 시작:', params);
    try {
      console.log('📝 createFile 호출 전');
      await createFile(params);
      console.log('✅ createFile 성공 - catch 블록 실행되지 않음');
      
      // 성공 시에도 모달을 자동으로 닫지 않음
      console.log('📢 showNotification 호출:', showNotification);
      showNotification(
        `${params.type === 'file' ? '파일' : '폴더'}이 생성되었습니다.`,
        'success'
      );
      console.log('✅ showNotification 호출 완료');
    } catch (error) {
      console.error('❌ catch 블록 실행됨 - createFile 실패:', error);
      console.error('❌ 에러 타입:', typeof error);
      console.error('❌ 에러 instanceof Error:', error instanceof Error);
      
      // 실패 시 상세한 에러 메시지 표시
      console.log('📢 showError 호출:', showError);
      showError('생성 실패', {
        title: `${params.type === 'file' ? '파일' : '폴더'} 생성 실패`,
        details: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
      console.log('✅ showError 호출 완료');
      // CreateFileModal에서도 에러를 받을 수 있도록 다시 throw
      throw error;
    }
    console.log('🏁 handleCreateFromModal 종료');
  }, [createFile, showNotification, showError]);

  // 검색 필터링
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return files;
    
    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        let filteredChildren: FileNode[] = [];
        
        if (node.children) {
          filteredChildren = filterNodes(node.children);
        }
        
        // 노드 자체가 매치되거나 하위에 매치되는 항목이 있으면 포함
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterNodes(files);
  }, [files, searchQuery]);

  // 전체 확장
  const handleExpandAll = useCallback(() => {
    expandAll();
  }, [expandAll]);

  const handleCollapseAll = useCallback(() => {
    collapseAll();
  }, [collapseAll]);

  // 배경 클릭으로 컨텍스트 메뉴 닫기
  const handleBackgroundClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  return (
    <nav 
      className="p-0 border-r border-gray-200 bg-[#f3f2f1] flex flex-col h-screen shadow-[2px_0_8px_rgba(0,0,0,0.04)]"
      style={{ width, minWidth: width, maxWidth: width }} 
      onClick={handleBackgroundClick}
    >
      {/* 상단 로고 및 앱 이름 */}
      <div className="py-5 flex flex-col items-center border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 bg-gradient-to-r from-[#e9eafc] to-[#f3f2f1] rounded-2xl shadow-sm p-4 my-2 w-[90%] justify-center">
          <img src="/lsitc.png" alt="회사 로고" className="w-10 h-10 rounded-lg object-contain bg-white shadow-sm" />
          <span className="font-bold text-[22px] text-[#6264a7] tracking-wide">WIKI</span>
        </div>
      </div>
      {/* 검색 및 액션 영역 */}
      <div className="p-3 border-b border-gray-200 bg-[#f3f2f1]">
        <div className="flex gap-2 mb-2">
          <button className="bg-[#6264a7] text-white border-none rounded-md px-4 py-2 font-medium flex items-center gap-1.5 cursor-pointer" onClick={() => setCreateModal({ isOpen: true, mode: 'file', initialPath: '' })}>
            <Plus className="h-5 w-5" /> 새로 만들기
          </button>
          <button className="bg-[#e1dfdd] text-[#323130] border-none rounded-md p-2 flex items-center cursor-pointer" onClick={refreshFileTree}>
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="bg-[#e1dfdd] text-[#323130] border-none rounded-md p-2 flex items-center cursor-pointer" onClick={() => setShowUploadModal(true)} title="마크다운 파일 업로드">
            <Upload className="h-5 w-5" />
          </button>
        </div>
        <input
          type="text"
          placeholder="파일 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 rounded-md border border-[#e1dfdd] px-3 mb-2 text-base"
        />
        <div className="flex gap-2">
          <button className="bg-[#e1dfdd] text-[#323130] border-none rounded-md px-3 py-1.5 font-medium cursor-pointer" onClick={expandAll}>모두 열기</button>
          <button className="bg-[#e1dfdd] text-[#323130] border-none rounded-md px-3 py-1.5 font-medium cursor-pointer" onClick={collapseAll}>모두 닫기</button>
        </div>
      </div>
      {/* 파일 트리 영역 */}
      <div className="flex-1 overflow-auto bg-[#f8f8f8] py-2 w-full">
        <TreeComponent
          treeData={filteredFiles}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          showSearch={false}
          showExpandCollapseButtons={false}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          enableContextMenu={true}
          onContextMenu={handleContextMenu}
          newlyCreatedItems={newlyCreatedItems}
          updatedItems={updatedItems}
          renamingItem={renamingItem}
          onRename={handleRenameComplete}
          onCancelRename={handleRenameCancel}
          onRenamingNameChange={handleRenamingNameChange}
          className="px-2 pt-0.5"
        />
      </div>
      {/* 하단 사용자 정보 및 설정 */}
      <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#6264a7] flex items-center justify-center text-white font-bold text-base">U</div>
        <span className="font-medium text-[#323130]">사용자명</span>
        <button className="bg-transparent border-none text-[#6264a7] rounded-md p-1.5 cursor-pointer">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu?.visible && (
        <div
          className="fixed z-[9999] min-w-[180px] max-w-[240px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            left: (() => {
              const menuWidth = 180;
              return contextMenu.x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : contextMenu.x;
            })(),
            top: (() => {
              const menuHeight = 180;
              return contextMenu.y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : contextMenu.y;
            })(),
          }}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100 text-left bg-transparent" onClick={() => handleCreate('file', contextMenu.target?.path)}>
                <span className="text-lg">📄</span> <span>새 파일</span>
              </button>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100 text-left bg-transparent" onClick={() => handleCreate('folder', contextMenu.target?.path)}>
                <span className="text-lg">📁</span> <span>새 폴더</span>
              </button>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100 text-left bg-transparent" onClick={() => handleRenameStart(contextMenu.target?.path || '', contextMenu.target?.name || '')}>
                <span className="text-lg">✏️</span> <span>이름 변경</span>
              </button>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 cursor-pointer hover:bg-red-50 text-red-600 text-left bg-transparent border-none" onClick={() => handleDelete(contextMenu.target?.path || '')}>
                <span className="text-lg">🗑️</span> <span>삭제</span>
              </button>
            </>
          )}
          {contextMenu.type === 'file' && (
            <>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100 text-left bg-transparent" onClick={() => handleRenameStart(contextMenu.target?.path || '', contextMenu.target?.name || '')}>
                <span className="text-lg">✏️</span> <span>이름 변경</span>
              </button>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 cursor-pointer hover:bg-red-50 text-red-600 text-left bg-transparent border-none" onClick={() => handleDelete(contextMenu.target?.path || '')}>
                <span className="text-lg">🗑️</span> <span>삭제</span>
              </button>
            </>
          )}
          {contextMenu.type === 'empty' && (
            <>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100 text-left bg-transparent" onClick={() => handleCreate('file')}>
                <span className="text-lg">📄</span> <span>새 파일</span>
              </button>
              <button className="w-full px-5 py-3 text-[15px] flex items-center gap-2 cursor-pointer hover:bg-gray-100 text-left bg-transparent border-none" onClick={() => handleCreate('folder')}>
                <span className="text-lg">📁</span> <span>새 폴더</span>
              </button>
            </>
          )}
        </div>
      )}
      {/* 파일 생성 모달 */}
      <CreateFileModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false, mode: 'file', initialPath: '' })}
        onConfirm={handleCreateFromModal}
        mode={createModal.mode}
        initialPath={createModal.initialPath}
        treeData={files}
      />
      {/* 마크다운 업로드 모달 */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: '90%' }}>
            <FileUpload
              onUploadComplete={(result) => {
                showNotification(`${result.originalName} 업로드 완료`, 'success');
                refreshFileTree();
              }}
              onError={(error) => {
                showNotification(error, 'error');
              }}
              onClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}
    </nav>
  );
};

export default WikiSidebar;
