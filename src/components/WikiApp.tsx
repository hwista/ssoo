'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTreeStore } from '@/stores/tree-store';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import WikiSidebar from '@/components/WikiSidebar';
import WikiEditor from '@/components/WikiEditor';
import WikiModals from '@/components/WikiModals';
import { WikiAppProps } from '@/types/components';
import { useResize } from '@/hooks/useResize';
import { FileNode } from '@/types';
import { Folder, Search, MessageCircle } from 'lucide-react';
import GeminiChat from '@/components/GeminiChat';
import AIChat from '@/components/AIChat';

// README.md 파일 찾기 헬퍼 함수
const findReadmeFile = (nodes: FileNode[]): string | null => {
  for (const node of nodes) {
    if (node.type === 'file') {
      const fileName = node.name.toLowerCase();
      if (fileName === 'readme.md' || fileName === 'readme.txt') {
        return node.path;
      }
    }
    if (node.children) {
      const found = findReadmeFile(node.children);
      if (found) return found;
    }
  }
  return null;
};

// 메인 Wiki 컴포넌트 (tree-store 사용)
const WikiAppContent: React.FC<{
  sidebarWidth: number;
  isResizing: boolean;
  resizerProps: React.HTMLAttributes<HTMLDivElement>;
}> = ({ sidebarWidth, isResizing, resizerProps }) => {
  const { files, selectFile, loadFileTree, isInitialized } = useTreeStore();
  const { loadFile } = useWikiEditorStore();
  // sidebarType: 'tree' | 'gemini' | 'ai'
  const [sidebarType, setSidebarType] = useState<'tree' | 'gemini' | 'ai'>('tree');
  
  // 초기 로드 플래그 - 한 번만 실행되도록 보장
  const initialLoadDone = useRef(false);

  // 앱 초기화: 파일 트리 로드
  useEffect(() => {
    if (!isInitialized) {
      loadFileTree();
    }
  }, [isInitialized, loadFileTree]);

  // 초기 README.md 자동 로드 (한 번만 실행)
  useEffect(() => {
    if (initialLoadDone.current || files.length === 0) return;
    
    const readmePath = findReadmeFile(files);
    if (readmePath) {
      initialLoadDone.current = true;
      selectFile(readmePath);
      loadFile(readmePath);
    }
  }, [files]); // selectFile, loadFile 제거 - 함수 참조 변경으로 인한 무한루프 방지

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 맨 왼쪽 vertical sidebar */}
      <div style={{ width: 64, background: '#f3f2f1', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, zIndex: 10 }}>
        <button
          style={{ width: 44, height: 44, borderRadius: 12, background: sidebarType === 'tree' ? '#6264a7' : 'transparent', color: sidebarType === 'tree' ? '#fff' : '#6264a7', border: 'none', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}
          onClick={() => setSidebarType('tree')}
          title="파일트리"
        >
          <Folder className="h-6 w-6" />
        </button>
        <button
          style={{ width: 44, height: 44, borderRadius: 12, background: sidebarType === 'ai' ? '#6264a7' : 'transparent', color: sidebarType === 'ai' ? '#fff' : '#6264a7', border: 'none', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}
          onClick={() => setSidebarType('ai')}
          title="AI 검색 (RAG)"
        >
          <Search className="h-6 w-6" />
        </button>
        <button
          style={{ width: 44, height: 44, borderRadius: 12, background: sidebarType === 'gemini' ? '#6264a7' : 'transparent', color: sidebarType === 'gemini' ? '#fff' : '#6264a7', border: 'none', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}
          onClick={() => setSidebarType('gemini')}
          title="Gemini 대화"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
      {/* 파일트리 사이드바 or GeminiChat */}
      {sidebarType === 'tree' && (
        <div
          style={{ width: sidebarWidth }}
          className="flex-shrink-0 bg-white border-r border-gray-200"
        >
          <WikiSidebar width={sidebarWidth} className="h-full" />
        </div>
      )}
      {sidebarType === 'tree' && (
        <div
          className={`w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors ${
            isResizing ? 'bg-blue-400' : ''
          }`}
          {...resizerProps}
        />
      )}
      {sidebarType === 'ai' && (
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <AIChat onFileSelect={async (path) => {
            selectFile(path);
            await loadFile(path);
          }} />
        </div>
      )}
      {sidebarType === 'ai' && (
        <div
          className={`w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors ${isResizing ? 'bg-blue-400' : ''}`}
          {...resizerProps}
        />
      )}
      {sidebarType === 'gemini' && (
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <GeminiChat />
        </div>
      )}
      {sidebarType === 'gemini' && (
        <div
          className={`w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors ${isResizing ? 'bg-blue-400' : ''}`}
          {...resizerProps}
        />
      )}
      {/* 메인 에디터 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <WikiEditor className="flex-1" />
      </div>

      {/* 모달 컨테이너 */}
      <WikiModals />
    </div>
  );
};

const WikiApp: React.FC<WikiAppProps> = () => {
  // 사이드바 리사이즈 훅 (초기 너비 320)
  const { size: sidebarWidth, isResizing, resizerProps } = useResize({
    initial: 320,
    min: 200,
    max: 600
  });

  return (
    <WikiAppContent
      sidebarWidth={sidebarWidth}
      isResizing={isResizing}
      resizerProps={resizerProps}
    />
  );
};

export default WikiApp;