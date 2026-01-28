'use client';

import React from 'react';
import WikiEditor from '@/components/WikiEditor';
import { useTreeStore } from '@/stores';

/**
 * Wiki 페이지 (문서 편집/뷰어)
 * - 새 레이아웃에서는 ContentArea 내에 렌더링됨
 * - selectedFile이 있으면 해당 문서 표시
 */
export default function WikiPage() {
  const { selectedFile } = useTreeStore();

  // 파일 미선택 시
  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">문서를 선택해주세요</p>
          <p className="text-sm">사이드바에서 파일을 선택하거나 새 문서를 만드세요</p>
        </div>
      </div>
    );
  }

  return <WikiEditor />;
}