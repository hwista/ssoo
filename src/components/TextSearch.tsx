'use client';

import React, { useState, useCallback } from 'react';
import { Search, FileText, X } from 'lucide-react';

interface SearchMatch {
  line: number;
  content: string;
  highlight: string;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
  totalMatches: number;
}

interface TextSearchProps {
  onFileSelect?: (filePath: string) => void;
  onClose?: () => void;
}

export default function TextSearch({ onFileSelect, onClose }: TextSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      setError('검색어는 2자 이상 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        caseSensitive: caseSensitive.toString(),
        limit: '30'
      });

      const response = await fetch(`/api/text-search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '검색 실패');
      }

      setResults(data.results);
      setTotalMatches(data.totalMatches);

      // 첫 3개 파일은 자동 확장
      const initialExpanded = new Set<string>(data.results.slice(0, 3).map((r: SearchResult) => r.filePath));
      setExpandedFiles(initialExpanded);

    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, caseSensitive]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleExpand = (filePath: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleFileClick = (filePath: string) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-6 w-6" />
          파일 내용 검색
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* 검색 입력 */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="검색어를 입력하세요..."
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '검색 중...' : '검색'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="rounded"
          />
          대소문자 구분
        </label>
      </div>

      {/* 검색 결과 */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {!error && results.length === 0 && query && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            검색 결과가 없습니다
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="text-sm text-gray-500 mb-4">
              {results.length}개 파일에서 {totalMatches}개 결과 발견
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.filePath}
                  className="border rounded-md overflow-hidden"
                >
                  {/* 파일 헤더 */}
                  <div
                    className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleExpand(result.filePath)}
                  >
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-blue-600 hover:underline truncate cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(result.filePath);
                        }}
                      >
                        {result.fileName}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {result.filePath}
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {result.totalMatches}개 매치
                    </span>
                  </div>

                  {/* 매치 목록 */}
                  {expandedFiles.has(result.filePath) && (
                    <div className="border-t divide-y">
                      {result.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="p-2 text-sm hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleFileClick(result.filePath)}
                        >
                          <span className="text-gray-400 mr-2 font-mono text-xs">
                            L{match.line}
                          </span>
                          <span
                            className="text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: match.highlight
                                .replace(/\*\*(.*?)\*\*/g, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>')
                            }}
                          />
                        </div>
                      ))}
                      {result.totalMatches > result.matches.length && (
                        <div className="p-2 text-xs text-gray-400 text-center">
                          +{result.totalMatches - result.matches.length}개 더 있음
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
