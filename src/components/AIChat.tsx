'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Send, Bot, User, FileText } from 'lucide-react';
import { aiApi } from '@/lib/utils/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    fileName: string;
    filePath: string;
    preview: string;
    score: number;
  }>;
  timestamp: Date;
}

interface AIChatProps {
  onFileSelect?: (filePath: string) => void;
}

const AIChat: React.FC<AIChatProps> = ({ onFileSelect }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 영역 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 질문 전송
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiApi.ask(input.trim());

      if (!response.success) {
        throw new Error(response.error || 'AI 응답 실패');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data?.answer || '',
        sources: response.data?.sources as Message['sources'],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 응답 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 소스 클릭 처리
  const handleSourceClick = (filePath: string) => {
    const relativePath = filePath.replace(/^docs[\\/]wiki[\\/]/, '');
    onFileSelect?.(relativePath);
  };

  return (
    <Card className="h-full flex flex-col p-0">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          <span className="font-semibold">AI 어시스턴트</span>
        </div>
        <p className="text-xs text-muted-foreground">
          위키 문서 기반으로 질문에 답변합니다
        </p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4" />
            <p>질문을 입력하면 위키 문서를 기반으로 답변해드립니다.</p>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* 아바타 */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user' ? 'bg-indigo-600' : 'bg-gray-200'
            }`}>
              {message.role === 'user' ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <Bot className="h-5 w-5 text-indigo-600" />
              )}
            </div>

            {/* 메시지 내용 */}
            <div className={`max-w-[80%] p-3 rounded-xl ${
              message.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                : 'bg-gray-100 text-gray-900 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>

              {/* 소스 문서 */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <p className="text-xs text-gray-500 mb-2">참고 문서:</p>
                  <div className="flex flex-col gap-1">
                    {message.sources.map((source, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSourceClick(source.filePath)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded cursor-pointer text-xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-gray-600">{source.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="bg-gray-100 p-3 rounded-xl rounded-tl-sm flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs">답변 생성 중...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            placeholder="질문을 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4 mr-1" />
            전송
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AIChat;
