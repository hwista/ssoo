'use client';

import * as React from 'react';
import { focusSearchHighlight, highlightViewerHtml } from './viewerUtils';

export function useViewerSearch({
  content,
  contentRef,
  onSearch,
}: {
  content: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onSearch?: (query: string) => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResultCount, setSearchResultCount] = React.useState(0);
  const [currentResultIndex, setCurrentResultIndex] = React.useState(-1);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [highlightedContent, setHighlightedContent] = React.useState<string | null>(null);

  const clearHighlights = React.useCallback(() => {
    setHighlightedContent(null);
    setSearchResultCount(0);
    setCurrentResultIndex(-1);
    setHasSearched(false);
  }, []);

  const handleSearchSubmit = React.useCallback(() => {
    if (!searchQuery.trim()) return;

    const result = highlightViewerHtml(content, searchQuery);
    setHighlightedContent(result.highlightedContent);
    setSearchResultCount(result.searchResultCount);
    setHasSearched(result.hasSearched);
    setCurrentResultIndex(result.currentResultIndex);
    onSearch?.(searchQuery.trim());
  }, [content, onSearch, searchQuery]);

  const handleNavigateResult = React.useCallback((direction: 'prev' | 'next') => {
    if (searchResultCount === 0) return;

    setCurrentResultIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % searchResultCount;
      }
      return (prev - 1 + searchResultCount) % searchResultCount;
    });
  }, [searchResultCount]);

  const handleSearchClose = React.useCallback(() => {
    setSearchQuery('');
    clearHighlights();
  }, [clearHighlights]);

  React.useEffect(() => {
    if (currentResultIndex < 0 || !highlightedContent) return;

    const timer = window.setTimeout(() => {
      focusSearchHighlight(contentRef.current, currentResultIndex, Boolean(highlightedContent));
    }, 10);

    return () => window.clearTimeout(timer);
  }, [contentRef, currentResultIndex, highlightedContent]);

  return {
    searchQuery,
    searchResultCount,
    currentResultIndex,
    hasSearched,
    highlightedContent,
    setSearchQuery,
    handleSearchSubmit,
    handleNavigateResult,
    handleSearchClose,
  };
}
