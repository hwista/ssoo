'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageModalProps } from '@/types/components';

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialAlt = '',
  initialUrl = ''
}) => {
  const [imageAlt, setImageAlt] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 모달이 열릴 때마다 초기값 설정
  React.useEffect(() => {
    if (isOpen) {
      setImageAlt(initialAlt);
      setImageUrl(initialUrl);
    }
  }, [isOpen, initialAlt, initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageAlt.trim() && imageUrl.trim()) {
      onInsert(imageAlt.trim(), imageUrl.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg flex flex-col items-center relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          aria-label="닫기"
        >
          ×
        </button>
        <h3 className="text-lg font-semibold mb-4">이미지 삽입</h3>
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이미지 설명 (Alt 텍스트)
            </label>
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이미지에 대한 설명"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이미지 URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.png"
            />
          </div>
          {imageUrl && (
            <div className="w-full flex justify-center items-center py-2">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="max-h-64 max-w-full rounded-md border border-gray-200 shadow"
                style={{ objectFit: 'contain', background: '#fafafa' }}
              />
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="default">
              삽입
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImageModal;