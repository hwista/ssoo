'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, FileText, ExternalLink } from 'lucide-react';
import { useTabStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchApi, aiApi } from '@/lib/utils/apiClient';

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

/**
 * AI 검색 페이지
 * - 벡터 검색 (RAG)
 * - Gemini AI 질문
 */
export function AISearchPage() {
  const { openTab } = useTabStore();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'vector' | 'gemini'>('vector');
  const [error, setError] = useState<string | null>(null);

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      if (searchType === 'vector') {
        const response = await searchApi.search(query.trim());
        
        if (!response.success) {
          throw new Error(response.error || '검색 요청 실패');
        }
        
        if (response.data?.results) {
          setResults(response.data.results.map((r) => ({
            path: r.path || '',
            title: r.title || r.path?.split('/').pop() || '제목 없음',
            snippet: r.content?.substring(0, 200) || '',
            score: r.score || 0,
          })));
        }
      } else {
        const response = await aiApi.ask(query.trim());
        
        if (!response.success) {
          throw new Error(response.error || 'AI 요청 실패');
        }
        
        if (response.data?.answer) {
          setResults([{
            path: '',
            title: 'AI 답변',
            snippet: response.data.answer,
            score: 1,
          }]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류 발생');
    } finally {
      setIsSearching(false);
    }
  }, [query, searchType]);

  // 결과 클릭 시 문서 열기
  const handleResultClick = useCallback((result: SearchResult) => {
    if (!result.path) return;
    
    openTab({
      id: `file-${result.path.replace(/\//g, '-')}`,
      title: result.title,
      path: `/wiki/${encodeURIComponent(result.path)}`,
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [openTab]);

  // Enter 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 검색</h1>
        <p className="text-gray-600 mb-6">
          문서를 검색하거나 AI에게 질문하세요.
        </p>

        {/* 검색 타입 선택 */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={searchType === 'vector' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('vector')}
          >
            <Search className="w-4 h-4 mr-1" />
            문서 검색
          </Button>
          <Button
            variant={searchType === 'gemini' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('gemini')}
          >
            <FileText className="w-4 h-4 mr-1" />
            AI 질문
          </Button>
        </div>

        {/* 검색 입력 */}
        <div className="flex gap-2 mb-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchType === 'vector' ? '검색어를 입력하세요...' : 'AI에게 질문하세요...'}
            className="flex-1"
            disabled={isSearching}
          />
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-4">
            {error}
          </div>
        )}

        {/* 검색 결과 */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              검색 결과 ({results.length}건)
            </h2>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${
                  result.path ? 'hover:border-ssoo-primary cursor-pointer' : ''
                } transition-colors`}
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    {result.path ? (
                      <FileText className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Search className="w-4 h-4 text-ssoo-primary" />
                    )}
                    {result.title}
                  </h3>
                  {result.path && (
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                  {result.snippet}
                </p>
                {result.path && (
                  <p className="text-xs text-gray-400 mt-2">{result.path}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 검색 전 안내 */}
        {!isSearching && results.length === 0 && !error && (
          <div className="text-center text-gray-500 py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>검색어를 입력하고 Enter를 누르세요</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default AISearchPage;
