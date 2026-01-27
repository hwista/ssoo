'use client';
import React, { memo } from 'react';
import { ContextMenuState, FileType } from '@/types';
import { logger } from '@/utils/errorUtils';

interface ContextMenuProps {
  contextMenu: ContextMenuState | null;
  selectedFileType: FileType;
  onClose: () => void;
  onMenuAction: (action: string) => Promise<void>;
}

const ContextMenu = memo(({ contextMenu, onClose, onMenuAction }: ContextMenuProps) => {
  if (!contextMenu?.visible) {
    return null;
  }

  logger.debug('ContextMenu 컴포넌트 렌더링', { id: contextMenu.id });

  const handleClose = () => {
    onClose();
  };

  const handleMenuAction = async (action: string) => {
    handleClose();
    await onMenuAction(action);
  };

  const menuElement = (
    <div
      key={`context-menu-${contextMenu.id}`}
      className="fixed inset-0 z-50"
      onClick={handleClose}
      style={{
        pointerEvents: 'auto'
      }}
    >
      <div 
        className="absolute inset-0" 
        onClick={handleClose}
      />
      
      <div
        className="absolute bg-white rounded-lg shadow-xl py-1 min-w-48 border border-gray-200"
        style={{
          left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : contextMenu.x),
          top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 300 : contextMenu.y),
          zIndex: 1000
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {contextMenu.type === 'file' && (
          <>
            <button
              onClick={() => handleMenuAction('open')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📄 열기
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => handleMenuAction('delete')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 삭제
            </button>
          </>
        )}
        
        {contextMenu.type === 'folder' && (
          <>
            <button
              onClick={() => handleMenuAction('new-file')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📄 새 파일
            </button>
            <button
              onClick={() => handleMenuAction('new-folder')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📁 새 폴더
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => handleMenuAction('delete')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 삭제
            </button>
          </>
        )}
        
        {contextMenu.type === 'empty' && (
          <>
            <button
              onClick={() => handleMenuAction('new-file')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📄 새 파일
            </button>
            <button
              onClick={() => handleMenuAction('new-folder')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              📁 새 폴더
            </button>
          </>
        )}
      </div>
    </div>
  );

  return menuElement;
});

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;