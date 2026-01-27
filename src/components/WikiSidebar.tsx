'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Input as FluentInput, Menu, MenuList, MenuItem } from '@fluentui/react-components';
import { makeStyles, shorthands } from '@fluentui/react-components';
import { Document24Regular, Folder24Regular, Settings24Regular, Add24Regular, ArrowSync24Regular, ArrowUpload24Regular } from '@fluentui/react-icons';
import FileUpload from '@/components/FileUpload';
import { useWikiContext } from '@/contexts/WikiContext';
import { useTreeDataContext } from '@/contexts/TreeDataContext';
import TreeComponent from '@/components/TreeComponent';
import CreateFileModal from '@/components/CreateFileModal';
import { useMessage } from '@/hooks/useMessage';
import { logger } from '@/lib/utils/errorUtils';
import type { FileNode } from '@/types';
import { WikiSidebarProps } from '@/types/components';

const useStyles = makeStyles({
  sidebar: {
    ...shorthands.padding('0'),
    ...shorthands.borderRight('1px', 'solid', '#e5e7eb'),
    backgroundColor: '#f3f2f1',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    minWidth: 0, // minWidth를 0으로 설정하여 width prop에 따라 유동적으로 변경
    maxWidth: '100vw', // maxWidth를 화면 전체로 설정
    boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
  },
  logoArea: {
    ...shorthands.padding('20px', '0'),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
  },
  navArea: {
    ...shorthands.padding('16px', '0'),
    borderBottom: '1px solid #e5e7eb',
    background: '#f3f2f1',
  },
  searchArea: {
    ...shorthands.padding('12px', '16px'),
    borderBottom: '1px solid #e5e7eb',
    background: '#f3f2f1',
  },
  treeArea: {
    flex: 1,
    overflow: 'auto',
    background: '#f8f8f8',
    padding: '8px 0',
    width: '100%', // 내부 영역도 width: 100%로 설정
  },
  userArea: {
    ...shorthands.padding('16px'),
    borderTop: '1px solid #e5e7eb',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
});

const WikiSidebar: React.FC<WikiSidebarProps> = ({
  width,
  className = ""
}) => {
  // TreeDataContext에서 트리 상태 가져오기
  const {
    selectedFile,
    expandedFolders,
    toggleFolder,
    expandAll,
    collapseAll,
    selectFile,
    findNodeByPath
  } = useTreeDataContext();

  // WikiContext에서 파일 시스템 액션 가져오기
  const {
    files,
    contextMenu,
    createModal,
    newlyCreatedItems,
    updatedItems,
    renamingItem,
    
    // 액션들
    setContextMenu,
    setCreateModal,
    refreshFileTree,
    setRenamingItem,
    loadFile,
    createFile,
    deleteFile,
    renameFile,
    addUpdatedItem,
    showNotification
  } = useWikiContext();

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

  const styles = useStyles();

  return (
    <nav className={styles.sidebar} style={{ width, minWidth: width, maxWidth: width }} onClick={handleBackgroundClick}>
      {/* 상단 로고 및 앱 이름 */}
      <div className={styles.logoArea}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'linear-gradient(90deg, #e9eafc 0%, #f3f2f1 100%)',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(98,100,167,0.08)',
          padding: '16px 24px',
          margin: '8px 0',
          width: '90%',
          justifyContent: 'center',
        }}>
          <img src="/lsitc.png" alt="회사 로고" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} />
          <span style={{ fontWeight: 700, fontSize: 22, color: '#6264a7', letterSpacing: '1px', lineHeight: 1.2 }}>WIKI</span>
        </div>
      </div>
      {/* 주요 네비게이션 메뉴 삭제됨 */}
      {/* 검색 및 액션 영역 */}
      <div className={styles.searchArea}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button style={{ background: '#6264a7', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setCreateModal({ isOpen: true, mode: 'file', initialPath: '' })}>
            <Add24Regular /> 새로 만들기
          </button>
          <button style={{ background: '#e1dfdd', color: '#323130', border: 'none', borderRadius: 6, padding: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={refreshFileTree}>
            <ArrowSync24Regular />
          </button>
          <button style={{ background: '#e1dfdd', color: '#323130', border: 'none', borderRadius: 6, padding: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowUploadModal(true)} title="마크다운 파일 업로드">
            <ArrowUpload24Regular />
          </button>
        </div>
        <input
          type="text"
          placeholder="파일 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #e1dfdd', padding: '0 12px', marginBottom: 8, fontSize: 15 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#e1dfdd', color: '#323130', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, cursor: 'pointer' }} onClick={expandAll}>모두 열기</button>
          <button style={{ background: '#e1dfdd', color: '#323130', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, cursor: 'pointer' }} onClick={collapseAll}>모두 닫기</button>
        </div>
      </div>
      {/* 파일 트리 영역 */}
      <div className={styles.treeArea}>
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
      <div className={styles.userArea}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6264a7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>U</div>
        <span style={{ fontWeight: 500, color: '#323130' }}>사용자명</span>
        <button style={{ background: 'none', border: 'none', color: '#6264a7', borderRadius: 6, padding: 6, cursor: 'pointer' }}>
          <Settings24Regular />
        </button>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu?.visible && (
        <div
          style={{
            position: 'fixed',
            left: (() => {
              const menuWidth = 180;
              return contextMenu.x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : contextMenu.x;
            })(),
            top: (() => {
              const menuHeight = 180;
              return contextMenu.y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : contextMenu.y;
            })(),
            zIndex: 9999,
            minWidth: 180,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '1px solid #e5e7eb',
            padding: 0,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            maxWidth: 240,
          }}
        >
          <Menu open={true} positioning={{ position: 'below', align: 'start' }}>
            <MenuList style={{ padding: 0 }}>
              {contextMenu.type === 'folder' && (
                <>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleCreate('file', contextMenu.target?.path)}>
                    <span style={{fontSize:18}}>📄</span> <span>새 파일</span>
                  </MenuItem>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleCreate('folder', contextMenu.target?.path)}>
                    <span style={{fontSize:18}}>📁</span> <span>새 폴더</span>
                  </MenuItem>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleRenameStart(contextMenu.target?.path || '', contextMenu.target?.name || '')}>
                    <span style={{fontSize:18}}>✏️</span> <span>이름 변경</span>
                  </MenuItem>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#e53e3e', background: 'none', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#ffe5e5'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleDelete(contextMenu.target?.path || '')}>
                    <span style={{fontSize:18}}>🗑️</span> <span>삭제</span>
                  </MenuItem>
                </>
              )}
              {contextMenu.type === 'file' && (
                <>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleRenameStart(contextMenu.target?.path || '', contextMenu.target?.name || '')}>
                    <span style={{fontSize:18}}>✏️</span> <span>이름 변경</span>
                  </MenuItem>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#e53e3e', background: 'none', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#ffe5e5'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleDelete(contextMenu.target?.path || '')}>
                    <span style={{fontSize:18}}>🗑️</span> <span>삭제</span>
                  </MenuItem>
                </>
              )}
              {contextMenu.type === 'empty' && (
                <>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleCreate('file')}>
                    <span style={{fontSize:18}}>📄</span> <span>새 파일</span>
                  </MenuItem>
                  <MenuItem style={{ padding: '12px 22px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={() => handleCreate('folder')}>
                    <span style={{fontSize:18}}>📁</span> <span>새 폴더</span>
                  </MenuItem>
                </>
              )}
            </MenuList>
          </Menu>
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
