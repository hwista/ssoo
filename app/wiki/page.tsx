'use client';

import React from 'react';
import WikiApp from '@/components/WikiApp';
import { WikiProvider } from '@/contexts/WikiContext';
import { GeminiChatProvider } from '@/contexts/GeminiChatContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function WikiPage() {
  return (
    <NotificationProvider>
      <WikiProvider>
        <GeminiChatProvider>
          <WikiApp />
        </GeminiChatProvider>
      </WikiProvider>
    </NotificationProvider>
  );
}