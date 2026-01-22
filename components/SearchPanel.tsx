'use client';

import React, { useState, useCallback } from 'react';
import { Input, Button, Card, Text, Spinner } from '@fluentui/react-components';
import { Search24Regular, Document24Regular, ArrowSync24Regular } from '@fluentui/react-icons';

interface SearchResult {
  id: string;
  content: string;
  fileName: string;
  filePath: string;
  chunkIndex: number;
  score: number;
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
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '검색 실패');
      }

      setResults(data.results);
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
      const response = await fetch('/api/search');
      const data = await response.json();

      if (response.ok) {
        setIndexStatus({ count: data.indexedDocuments, status: data.status });
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
      const response = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reindex: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '인덱싱 실패');
      }

      await checkIndexStatus();
      alert(data.message);
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
    <Card style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Text size={500} weight="semibold" block style={{ marginBottom: 8 }}>
          AI 검색
        </Text>

        {indexStatus && (
          <Text size={200} style={{ color: '#6b7280' }}>
            인덱싱된 문서: {indexStatus.count}개
          </Text>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="검색어를 입력하세요..."
          value={query}
          onChange={(e, data) => setQuery(data.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
          contentBefore={<Search24Regular />}
        />
        <Button
          appearance="primary"
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? <Spinner size="tiny" /> : '검색'}
        </Button>
        <Button
          appearance="secondary"
          onClick={handleIndex}
          disabled={isIndexing}
          title="문서 인덱싱"
        >
          {isIndexing ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
        </Button>
      </div>

      {error && (
        <div style={{
          padding: 12,
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ color: '#dc2626' }}>{error}</Text>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <Text size={300} weight="semibold" block style={{ marginBottom: 8, color: '#6b7280' }}>
            검색 결과 ({results.length}건)
          </Text>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result.filePath)}
                style={{
                  padding: 12,
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0ff';
                  e.currentTarget.style.borderColor = '#6264a7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Document24Regular style={{ color: '#6264a7' }} />
                  <Text weight="semibold" size={300}>{result.fileName}</Text>
                  <Text size={200} style={{ color: '#9ca3af', marginLeft: 'auto' }}>
                    유사도: {(1 - result.score).toFixed(3)}
                  </Text>
                </div>
                <Text size={200} style={{
                  color: '#4b5563',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {result.content.substring(0, 200)}...
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length === 0 && query && (
        <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
          <Text>검색 결과가 없습니다</Text>
        </div>
      )}
    </Card>
  );
};

export default SearchPanel;
