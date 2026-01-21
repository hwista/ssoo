'use client';
import React, { useEffect, useState, useCallback } from 'react';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number; // ms, 0이면 자동으로 사라지지 않음
  onClose: (id: string) => void;
  index?: number; // 노티피케이션 순서
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 3000,
  onClose,
  index = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  console.log('🚨 Notification 컴포넌트 렌더링:', { id, title, type, isVisible, isLeaving });

  const handleClose = useCallback(() => {
    console.log('🚨 노티피케이션 X버튼 클릭됨:', id);
    console.log('🚨 onClose 함수 존재 여부:', typeof onClose);
    setIsLeaving(true);
    setTimeout(() => {
      console.log('🚨 노티피케이션 onClose 호출:', id);
      try {
        onClose(id);
        console.log('🚨 onClose 호출 성공:', id);
      } catch (error) {
        console.error('🚨 onClose 호출 실패:', error);
      }
    }, 300); // 애니메이션 시간
  }, [id, onClose]);

  useEffect(() => {
    console.log('노티피케이션 useEffect 시작:', { id, duration });
    
    // 마운트 시 애니메이션을 위해 약간 지연
    const showTimer = setTimeout(() => {
      console.log('노티피케이션 표시:', id);
      setIsVisible(true);
    }, 50);
    
    // 자동 닫기
    let autoCloseTimer: NodeJS.Timeout | null = null;
    if (duration && duration > 0) {
      autoCloseTimer = setTimeout(() => {
        console.log('노티피케이션 자동 닫기:', id);
        handleClose();
      }, duration);
    }

    return () => {
      console.log('노티피케이션 cleanup:', id);
      clearTimeout(showTimer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [duration, handleClose, id]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-100 shadow-2xl',
          borderColor: 'border-green-400 border-2',
          textColor: 'text-green-900 font-semibold',
          iconBg: 'bg-green-200'
        };
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-100 shadow-2xl',
          borderColor: 'border-red-400 border-2',
          textColor: 'text-red-900 font-semibold',
          iconBg: 'bg-red-200'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-100 shadow-2xl',
          borderColor: 'border-yellow-400 border-2',
          textColor: 'text-yellow-900 font-semibold',
          iconBg: 'bg-yellow-200'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-100 shadow-2xl',
          borderColor: 'border-blue-400 border-2',
          textColor: 'text-blue-900 font-semibold',
          iconBg: 'bg-blue-200'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        fixed z-[9999] w-80 max-w-sm pointer-events-auto
        ${styles.bgColor} ${styles.borderColor} ${styles.textColor}
        border-2 rounded-lg shadow-2xl
        transition-all duration-500 ease-in-out
        ${isVisible && !isLeaving 
          ? 'opacity-100 transform translate-x-0 scale-100' 
          : 'opacity-0 transform translate-x-full scale-95'
        }
      `}
      style={{
        top: `${20 + index * 80}px`, // 위에서부터 순서대로 배치
        right: '20px', // 오른쪽 고정
        minHeight: '60px' // 최소 높이 보장
      }}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 w-8 h-8 ${styles.iconBg} rounded-full flex items-center justify-center mr-3`}>
            <span className="text-sm">{styles.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            {message && (
              <p className="mt-1 text-sm opacity-90">{message}</p>
            )}
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto cursor-pointer"
            style={{ zIndex: 10000 }}
            onMouseDown={(e) => {
              console.log('Notification X button mousedown');
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              console.log('Notification X button mouseup');
              e.stopPropagation();
            }}
            aria-label="Close notification"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;