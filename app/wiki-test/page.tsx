'use client';

// ⚠️ TODO: 이 파일은 테스트용으로 나중에 삭제 예정
// Phase 4 완료 후 제거할 것

import React from 'react';
import { WikiProvider, useWikiContext } from '@/contexts/WikiContext';
import { TreeDataProvider, useTreeDataContext } from '@/contexts/TreeDataContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationContainer from '@/components/NotificationContainer';
import WikiSidebar from '@/components/WikiSidebar';
import WikiEditor from '@/components/WikiEditor';
import WikiModals from '@/components/WikiModals';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// WikiContext와 TreeDataContext를 모두 사용하는 내부 컴포넌트
const WikiContextTest: React.FC = () => {
  const {
    files,
    isEditing,
    isLoading,
    loadFileTree,
    setCreateModal,
    showNotification
  } = useWikiContext();
  
  const { selectedFile } = useTreeDataContext();

  React.useEffect(() => {
    // 컴포넌트 마운트 시 파일 트리 로드
    loadFileTree();
  }, [loadFileTree]);

  const testNotification = () => {
    showNotification('테스트 알림입니다!', 'success');
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Wiki Context 테스트 - Full Components</h1>
      
      <div className="flex gap-4 h-[600px]">
        {/* WikiSidebar 테스트 */}
        <WikiSidebar width={320} className="h-full" />

        {/* WikiEditor 테스트 */}
        <WikiEditor className="flex-1" />
      </div>

      {/* 상태 정보 */}
      <Card className="p-4 mt-4">
        <h2 className="text-lg font-semibold mb-2">상태 정보</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <strong>파일 수:</strong> {files.length}
          </div>
          <div>
            <strong>선택된 파일:</strong> {selectedFile || '없음'}
          </div>
          <div>
            <strong>편집 모드:</strong> {isEditing ? '편집 중' : '보기 모드'}
          </div>
          <div>
            <strong>로딩 상태:</strong> {isLoading ? '로딩 중' : '완료'}
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button onClick={testNotification}>
            알림 테스트
          </Button>
          <Button onClick={() => setCreateModal({ 
            isOpen: true, 
            mode: 'file', 
            initialPath: '' 
          })}>
            파일 생성 모달 테스트
          </Button>
        </div>
      </Card>

      {/* WikiModals - 모든 모달 통합 관리 */}
      <WikiModals />
    </div>
  );
};

// TreeDataContext를 사용하기 위한 래퍼 컴포넌트
const WikiTestWithTreeData: React.FC = () => {
  const { files } = useWikiContext();
  
  return (
    <TreeDataProvider files={files}>
      <WikiContextTest />
    </TreeDataProvider>
  );
};

// 메인 테스트 페이지 컴포넌트
const WikiContextTestPage: React.FC = () => {
  return (
    <NotificationProvider>
      <WikiProvider>
        <WikiTestWithTreeData />
        <NotificationContainer />
      </WikiProvider>
    </NotificationProvider>
  );
};

export default WikiContextTestPage;