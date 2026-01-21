'use client';
import React from 'react';
import Notification from './Notification';
import { useNotification } from '@/contexts/NotificationContext';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  
  console.log('🎯 NotificationContainer 렌더링:', {
    count: notifications.length,
    items: notifications.map(n => ({ id: n.id, title: n.title, type: n.type }))
  });
  
  if (notifications.length === 0) {
    console.log('❌ 노티피케이션이 없어서 렌더링하지 않음');
    return null;
  }

  console.log('✅ 노티피케이션 UI 렌더링 중:', notifications.length, '개');

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          {...notification}
          index={index}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;