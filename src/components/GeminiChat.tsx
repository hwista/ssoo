import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MessageCircleQuestion } from 'lucide-react';
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
    <Card className="h-full flex flex-col p-6 gap-4 bg-white">
      <div className="flex items-center gap-2.5 mb-2">
        <MessageCircleQuestion className="h-7 w-7 text-indigo-600" />
        <h3 className="text-lg font-semibold">Gemini에게 질문하기</h3>
      </div>
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="궁금한 점을 입력하세요..."
        className="mb-2"
        autoFocus
      />
      <Button onClick={handleAsk} disabled={loading || !question.trim()} className="self-start">
        질문하기
      </Button>
      <div className="flex-1 flex flex-col min-h-0">
        <div
          style={{ height: responseHeight }}
          className="mt-4 bg-gray-100 rounded-lg p-4 overflow-y-auto resize-y"
        >
          {loading ? (
            <Spinner label="Gemini가 답변 중..." />
          ) : answer ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {answer}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              답변이 여기에 표시됩니다.
            </p>
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
