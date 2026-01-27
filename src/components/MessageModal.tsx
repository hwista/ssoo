'use client';

import React, { useState } from 'react';
import type { MessageType } from '@/types';

interface MessageModalProps {
  isOpen: boolean;
  type: MessageType;
  title?: string;
  message: string;
  details?: string; // 상세 정보 추가
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const getModalConfig = (type: MessageType) => {
  switch (type) {
    case 'success':
      return {
        icon: '🎉',
        iconColor: 'text-green-500',
        borderColor: 'border-green-200',
        bgColor: 'bg-green-50',
        confirmButtonColor: 'bg-green-500 hover:bg-green-600 focus:ring-green-300',
        defaultTitle: '성공!'
      };
    case 'error':
      return {
        icon: '❌',
        iconColor: 'text-red-500',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        confirmButtonColor: 'bg-red-500 hover:bg-red-600 focus:ring-red-300',
        defaultTitle: '오류 발생'
      };
    case 'warning':
      return {
        icon: '⚠️',
        iconColor: 'text-yellow-500',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        confirmButtonColor: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300',
        defaultTitle: '경고'
      };
    case 'confirm':
      return {
        icon: '❓',
        iconColor: 'text-blue-500',
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50',
        confirmButtonColor: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
        defaultTitle: '확인'
      };
    case 'info':
      return {
        icon: 'ℹ️',
        iconColor: 'text-blue-500',
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50',
        confirmButtonColor: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
        defaultTitle: '알림'
      };
    default:
      return {
        icon: 'ℹ️',
        iconColor: 'text-gray-500',
        borderColor: 'border-gray-200',
        bgColor: 'bg-gray-50',
        confirmButtonColor: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-300',
        defaultTitle: '메시지'
      };
  }
};

export default function MessageModal({
  isOpen,
  type,
  title,
  message,
  details,
  confirmText = '확인',
  cancelText = '취소',
  showCancel = false,
  onConfirm,
  onCancel,
  onClose
}: MessageModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const config = getModalConfig(type);
  const displayTitle = title || config.defaultTitle;
  const hasDetails = details && (type === 'error' || type === 'warning');

  const handleConfirm = () => {
    onConfirm();
    onClose?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (type === 'confirm' && onCancel) {
        handleCancel();
      } else {
        handleConfirm();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border-2 ${config.borderColor} ${config.bgColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* 아이콘 */}
          <div className={`text-4xl mb-4 ${config.iconColor}`}>
            {config.icon}
          </div>
          
          {/* 제목 */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {displayTitle}
          </h3>
          
          {/* 메시지 */}
          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
            {message}
          </p>

          {/* 상세 정보 토글 버튼 (에러/경고일 때만) */}
          {hasDetails && (
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto transition-colors"
              >
                <span>{showDetails ? '▼' : '▶'}</span>
                <span>{showDetails ? '간단히' : '자세히'}</span>
              </button>
            </div>
          )}

          {/* 상세 정보 */}
          {hasDetails && showDetails && (
            <div className="mb-4 p-3 bg-gray-100 rounded text-left border">
              <div className="text-xs text-gray-500 mb-1">상세 정보:</div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                {details}
              </pre>
            </div>
          )}
          
          {/* 버튼들 */}
          <div className={`flex gap-3 ${showCancel ? 'justify-center' : 'justify-center'}`}>
            {showCancel && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 font-medium"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white rounded transition-all duration-150 font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${config.confirmButtonColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}