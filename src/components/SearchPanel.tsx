'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Search, FileText, RefreshCw } from 'lucide-react';
import { searchApi, SearchResult as ApiSearchResult } from '@/lib/utils/apiClient';

// UI에서 사용하는 검색 결과 타입
interface SearchResult {
  id: string;
  content: string;
  fileName: string;
  filePath: string;
  chunkIndex: number;
  score: number;
}

// API 응답을 UI 타입으로 변환
function mapApiResultToUIResult(apiResult: ApiSearchResult, index: number): SearchResult {
  return {
    id: `${apiResult.path}-${index}`,
    content: apiResult.content,
    fileName: apiResult.title || apiResult.path.split('/').pop() || '',
    filePath: apiResult.path,
    chunkIndex: index,
    score: apiResult.score,
  };
}

interface SearchPanelProps {
  onFileSelect?: (filePath: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexStatus, setIndexStatus] = useState<{ count: number; status: string } | null>(null);

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await searchApi.search(query, 10);

      if (!response.success) {
        throw new Error(response.error || '검색 실패');
      }

      // API 결과를 UI 타입으로 변환
      const mappedResults = (response.data?.results || []).map(mapApiResultToUIResult);
      setResults(mappedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  // 인덱스 상태 확인
  const checkIndexStatus = useCallback(async () => {
    try {
      const response = await searchApi.getIndexStatus();

      if (response.success && response.data) {
        setIndexStatus({ count: response.data.indexedDocuments, status: response.data.status });
      }
    } catch (err) {
      console.error('인덱스 상태 확인 실패:', err);
    }
  }, []);

  // 문서 인덱싱
  const handleIndex = useCallback(async () => {
    setIsIndexing(true);
    setError(null);

    try {
      const response = await searchApi.indexDocuments(true);

      if (!response.success) {
        throw new Error(response.error || '인덱싱 실패');
      }

      await checkIndexStatus();
      alert(response.data?.message || '인덱싱 완료');
    } catch (err) {
      setError(err instanceof Error ? err.message : '인덱싱 중 오류가 발생했습니다');
    } finally {
      setIsIndexing(false);
    }
  }, [checkIndexStatus]);

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 결과 클릭 처리
  const handleResultClick = (filePath: string) => {
    // docs/wiki/ 경로를 제거하고 상대 경로만 전달
    const relativePath = filePath.replace(/^docs[\\/]wiki[\\/]/, '');
    onFileSelect?.(relativePath);
  };

  // 컴포넌트 마운트 시 인덱스 상태 확인
  React.useEffect(() => {
    checkIndexStatus();
  }, [checkIndexStatus]);

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">AI 검색</h3>

        {indexStatus && (
          <p className="text-xs text-muted-foreground">
            인덱싱된 문서: {indexStatus.count}개
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? <Spinner size="sm" /> : '검색'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleIndex}
          disabled={isIndexing}
          title="문서 인덱싱"
        >
          {isIndexing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-lg mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            검색 결과 ({results.length}건)
          </p>

          <div className="flex flex-col gap-2">
            {results.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result.filePath)}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition-all hover:bg-indigo-50 hover:border-indigo-400"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="font-semibold text-sm">{result.fileName}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    유사도: {(1 - result.score).toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {result.content.substring(0, 200)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length === 0 && query && (
        <div className="text-center p-6 text-muted-foreground">
          <p>검색 결과가 없습니다</p>
        </div>
      )}
    </Card>
  );
};

export default SearchPanel;
