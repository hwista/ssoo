'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input, Button, Card, Text, Spinner } from '@fluentui/react-components';
import { Send24Regular, Bot24Regular, Person24Regular, Document24Regular } from '@fluentui/react-icons';

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
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input.trim(), limit: 5 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI 응답 실패');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
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
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot24Regular style={{ color: '#6264a7' }} />
          <Text size={400} weight="semibold">AI 어시스턴트</Text>
        </div>
        <Text size={200} style={{ color: '#6b7280' }}>
          위키 문서 기반으로 질문에 답변합니다
        </Text>
      </div>

      {/* 메시지 영역 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
            <Bot24Regular style={{ fontSize: 48, marginBottom: 16 }} />
            <Text block>질문을 입력하면 위키 문서를 기반으로 답변해드립니다.</Text>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              gap: 12,
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            {/* 아바타 */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: message.role === 'user' ? '#6264a7' : '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {message.role === 'user' ? (
                <Person24Regular style={{ color: '#fff' }} />
              ) : (
                <Bot24Regular style={{ color: '#6264a7' }} />
              )}
            </div>

            {/* 메시지 내용 */}
            <div style={{
              maxWidth: '80%',
              backgroundColor: message.role === 'user' ? '#6264a7' : '#f3f4f6',
              color: message.role === 'user' ? '#fff' : '#1f2937',
              padding: 12,
              borderRadius: 12,
              borderTopLeftRadius: message.role === 'user' ? 12 : 4,
              borderTopRightRadius: message.role === 'user' ? 4 : 12
            }}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>

              {/* 소스 문서 */}
              {message.sources && message.sources.length > 0 && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <Text size={200} style={{ color: '#6b7280', marginBottom: 8, display: 'block' }}>
                    참고 문서:
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {message.sources.map((source, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSourceClick(source.filePath)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255,255,255,0.5)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        <Document24Regular style={{ width: 14, height: 14, color: '#6264a7' }} />
                        <span style={{ color: '#4b5563' }}>{source.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot24Regular style={{ color: '#6264a7' }} />
            </div>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: 12,
              borderRadius: 12,
              borderTopLeftRadius: 4
            }}>
              <Spinner size="tiny" />
              <Text size={200} style={{ marginLeft: 8 }}>답변 생성 중...</Text>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 12,
            backgroundColor: '#fef2f2',
            borderRadius: 8,
            border: '1px solid #fecaca'
          }}>
            <Text style={{ color: '#dc2626' }}>{error}</Text>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{
        padding: 16,
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="질문을 입력하세요..."
            value={input}
            onChange={(e, data) => setInput(data.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
            disabled={isLoading}
          />
          <Button
            appearance="primary"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            icon={<Send24Regular />}
          >
            전송
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AIChat;
