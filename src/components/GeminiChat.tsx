import React from 'react';
import { Card, Text, Input, Button, Spinner } from '@fluentui/react-components';
import { ChatHelp24Regular } from '@fluentui/react-icons';
import { useGeminiStore } from '@/stores/gemini-store';
import { useResize } from '@/hooks/useResize';

const GeminiChat: React.FC = () => {
  const { question, setQuestion, answer, setAnswer, loading, setLoading } = useGeminiStore();
  const { size: responseHeight, isResizing, resizerProps } = useResize({
    initial: 200,
    min: 100,
    max: 600,
    direction: 'vertical',
  });

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch (err) {
      setAnswer('Gemini API 오류: ' + (typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : String(err)));
    }
    setLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !loading && question.trim()) {
      handleAsk();
    }
  };

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 24, gap: 16, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <ChatHelp24Regular style={{ fontSize: 28, color: '#6264a7' }} />
        <Text size={500} weight="semibold">Gemini에게 질문하기</Text>
      </div>
      <Input
        value={question}
        onChange={(_, data) => setQuestion(data.value)}
        onKeyDown={handleKeyDown}
        placeholder="궁금한 점을 입력하세요..."
        style={{ marginBottom: 8 }}
        appearance="outline"
        size="large"
        autoFocus
      />
      <Button appearance="primary" onClick={handleAsk} disabled={loading || !question.trim()} style={{ alignSelf: 'flex-start' }}>
        질문하기
      </Button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          style={{
            height: responseHeight,
            marginTop: 16,
            background: '#f3f2f1',
            borderRadius: 8,
            padding: 16,
            overflowY: 'auto',
            resize: 'vertical',
          }}
        >
          {loading ? (
            <Spinner label="Gemini가 답변 중..." />
          ) : answer ? (
            <Text size={400} style={{ color: '#323130', whiteSpace: 'pre-wrap' }}>
              {answer}
            </Text>
          ) : (
            <Text size={300} style={{ color: '#888' }}>
              답변이 여기에 표시됩니다.
            </Text>
          )}
        </div>
        <div
          {...resizerProps}
          style={{
            height: '8px',
            cursor: 'row-resize',
            backgroundColor: isResizing ? '#6264a7' : 'transparent',
            transition: 'background-color 0.2s',
          }}
          className="hover:bg-gray-200"
        />
      </div>
    </Card>
  );
};

export default GeminiChat;
