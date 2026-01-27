'use client';
import { useState, useRef } from 'react';
import { ContextMenuState, FileNode } from '@/types';

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuIdCounterRef = useRef<number>(0);

  const handleContextMenu = (e: React.MouseEvent, node?: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 기존 메뉴가 있으면 먼저 닫기
    if (contextMenu?.visible) {
      setContextMenu(null);
      setTimeout(() => {
        showNewContextMenu(e, node);
      }, 10);
      return;
    }
    
    showNewContextMenu(e, node);
  };

  const showNewContextMenu = (e: React.MouseEvent, node?: FileNode) => {
    console.log('🎯 handleContextMenu 호출됨:', { 
      node: node?.name, 
      type: node?.type,
      target: (e.target as HTMLElement)?.className,
      currentTarget: (e.currentTarget as HTMLElement)?.className
    });
    
    // 기존 타이머 제거
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
      console.log('🗑️ 기존 타이머 제거됨');
    }
    
    // 즉시 기존 메뉴 닫기
    setContextMenu(null);
    
    // 고유 ID 생성 (카운터 기반)
    menuIdCounterRef.current += 1;
    const menuId = `menu-${e.clientX}-${e.clientY}-${menuIdCounterRef.current}`;
    console.log('🆔 생성된 메뉴 ID:', menuId);
    
    // 새 메뉴 생성 (100ms 지연으로 더 확실한 중복 방지)
    contextMenuTimeoutRef.current = setTimeout(() => {
      console.log('✅ 실제 메뉴 생성:', menuId);
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        target: node || null,
        type: node ? (node.type === 'directory' ? 'folder' : 'file') : 'empty',
        id: menuId
      });
    }, 100);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const cleanup = () => {
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
    }
  };

  return {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
    cleanup
  };
};