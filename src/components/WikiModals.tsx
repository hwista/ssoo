'use client';

import React from 'react';
import MessageModal from '@/components/MessageModal';
import { useMessage } from '@/hooks/useMessage';

interface WikiModalsProps {
  className?: string;
}

const WikiModals: React.FC<WikiModalsProps> = ({ className = '' }) => {
  const { messageState, hideMessage } = useMessage();

  return (
    <div className={className}>
      {/* 메시지 모달 */}
      {messageState.isOpen && (
        <MessageModal
          isOpen={messageState.isOpen}
          title={messageState.title}
          message={messageState.message}
          type={messageState.type}
          onConfirm={messageState.onConfirm || (() => {})}
          onClose={hideMessage}
        />
      )}
    </div>
  );
};

export default WikiModals;