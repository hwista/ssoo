'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LinkModalProps } from '@/types/components';

const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialText = '',
  initialUrl = ''
}) => {
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // 모달이 열릴 때마다 초기값 설정
  React.useEffect(() => {
    if (isOpen) {
      setLinkText(initialText);
      setLinkUrl(initialUrl);
    }
  }, [isOpen, initialText, initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkText.trim() && linkUrl.trim()) {
      onInsert(linkText.trim(), linkUrl.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-90vw">
        <h3 className="text-lg font-semibold mb-4">링크 삽입</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              링크 텍스트
            </label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="링크에 표시될 텍스트"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              삽입
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkModal;