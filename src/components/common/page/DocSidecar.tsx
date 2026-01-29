'use client';

import * as React from 'react';
import { User, Calendar, FileText, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 목차 아이템
 */
export interface TocItem {
  /** 고유 ID (스크롤 타겟) */
  id: string;
  /** 표시 텍스트 */
  text: string;
  /** 헤딩 레벨 (1~6) */
  level: number;
}

/**
 * 문서 메타데이터
 */
export interface DocMetadata {
  /** 작성자 */
  author?: string;
  /** 생성일 */
  createdAt?: Date | string;
  /** 수정일 */
  updatedAt?: Date | string;
  /** 줄 수 */
  lineCount?: number;
  /** 문자 수 */
  charCount?: number;
  /** 단어 수 */
  wordCount?: number;
}

/**
 * DocSidecar Props
 */
export interface DocSidecarProps {
  /** 문서 메타데이터 */
  metadata?: DocMetadata;
  /** 태그 목록 */
  tags?: string[];
  /** 추가 className */
  className?: string;
}

/**
 * 날짜 포맷팅 헬퍼
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * DocSidecar 컴포넌트
 * 
 * 문서 메타정보 + 목차를 표시하는 우측 패널
 * 
 * @example
 * ```tsx
 * <DocSidecar
 *   metadata={{
 *     author: 'admin',
 *     createdAt: new Date(),
 *     lineCount: 156,
 *   }}
 *   tags={['frontend', 'react']}
 *   toc={headings}
 *   onTocClick={(id) => scrollTo(id)}
 * />
 * ```
 */
export function DocSidecar({
  metadata,
  tags,
  className,
}: DocSidecarProps) {
  return (
    <div className={cn('p-4 space-y-6', className)}>
      {/* 문서 정보 섹션 */}
      {metadata && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <FileText className="h-4 w-4 mr-1.5" />
            문서 정보
          </h3>
          <dl className="space-y-2 text-sm">
            {metadata.author && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <User className="h-3.5 w-3.5 mr-1" />
                  작성자
                </dt>
                <dd className="text-ssoo-primary">{metadata.author}</dd>
              </div>
            )}
            {metadata.createdAt && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  생성일
                </dt>
                <dd className="text-ssoo-primary">{formatDate(metadata.createdAt)}</dd>
              </div>
            )}
            {metadata.updatedAt && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  수정일
                </dt>
                <dd className="text-ssoo-primary">{formatDate(metadata.updatedAt)}</dd>
              </div>
            )}
            {metadata.lineCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">줄 수</dt>
                <dd className="text-ssoo-primary">{metadata.lineCount.toLocaleString()}</dd>
              </div>
            )}
            {metadata.charCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">문자 수</dt>
                <dd className="text-ssoo-primary">{metadata.charCount.toLocaleString()}</dd>
              </div>
            )}
            {metadata.wordCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">단어 수</dt>
                <dd className="text-ssoo-primary">{metadata.wordCount.toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* 태그 섹션 */}
      {tags && tags.length > 0 && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <Tag className="h-4 w-4 mr-1.5" />
            태그
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-ssoo-content-border text-ssoo-primary rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 빈 상태 */}
      {!metadata && (!tags || tags.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-4">
          문서 정보가 없습니다
        </p>
      )}
    </div>
  );
}
