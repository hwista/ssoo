'use client';

import * as React from 'react';
import { Info, History, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantSessionHistoryList } from '@/components/common/assistant/SessionHistoryList';

/**
 * AI Sidecar Section 타입
 */
interface SidecarSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * AI Sidecar Props
 */
export interface AiSidecarProps {
  /** AI 기능 유형 */
  variant: 'ask' | 'search' | 'create';
  /** 채팅 세션 히스토리 */
  history?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    active?: boolean;
    persistedToDb?: boolean;
  }>;
  /** 참조 소스 문서 목록 */
  sources?: Array<{ title: string; path: string }>;
  /** 히스토리 선택 콜백 */
  onHistorySelect?: (item: { id: string; title: string; updatedAt: string; active?: boolean; persistedToDb?: boolean }) => void;
  /** 히스토리 DB 저장/해제 */
  onHistoryPersistToggle?: (item: { id: string; title: string; updatedAt: string; active?: boolean; persistedToDb?: boolean }) => void;
  /** 추천 질문 */
  suggestions?: string[];
  /** 추천 질문 선택 */
  onSuggestionSelect?: (suggestion: string) => void;
  /** 추가 className */
  className?: string;
}

// ─── 섹션 컴포넌트 ───────────────────────────────────────

function CollapsibleSection({ title, icon, children, defaultOpen = true }: Omit<SidecarSection, 'id'>) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-ssoo-content-border last:border-b-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ssoo-primary hover:bg-ssoo-content-bg/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-xs text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── 변형별 설명 ─────────────────────────────────────────

const VARIANT_INFO: Record<AiSidecarProps['variant'], { title: string; tips: string[] }> = {
  ask: {
    title: 'AI 어시스턴트',
    tips: [
      '질문 의도에 따라 대화/문서 검색/기능 안내를 자동으로 분기합니다.',
      '플로팅 패널의 크게보기 버튼으로 /ai/ask 탭으로 확장할 수 있습니다.',
      '추천 질문 클릭 시 즉시 전송되며, 대화가 시작되면 추천 영역이 자동으로 접힙니다.',
    ],
  },
  search: {
    title: 'AI 검색',
    tips: [
      '정확한 단어를 사용하면 검색 정확도가 높아집니다.',
      '문서 제목, 본문 내 키워드로 검색됩니다.',
      '검색 결과를 클릭하면 해당 문서로 이동합니다.',
    ],
  },
  create: {
    title: 'AI 작성',
    tips: [
      '문서, 스프레드시트, 프레젠테이션, PDF 파일을 첨부할 수 있습니다.',
      '파일 유형에 맞는 템플릿이 자동 선택됩니다.',
      '여러 파일을 동시에 첨부하여 비교 요약할 수 있습니다.',
    ],
  },
};

/**
 * AI 전용 사이드카 콘텐츠
 * 
 * DocPageTemplate의 sidecarContent 슬롯에 사용합니다.
 * 기존 문서 Sidecar와 동일한 위치에 AI 맞춤 정보를 표시합니다.
 */
export function AiSidecar({
  variant,
  history = [],
  sources = [],
  onHistorySelect,
  onHistoryPersistToggle,
  suggestions = [],
  onSuggestionSelect,
  className,
}: AiSidecarProps) {
  const info = VARIANT_INFO[variant];
  const historyTitle = variant === 'search' ? '검색 기록' : '채팅 기록';
  const historyEmptyText = variant === 'search'
    ? '아직 검색 기록이 없습니다. 검색을 실행하면 여기에 표시됩니다.'
    : '아직 기록이 없습니다. 질문을 보내면 여기에 표시됩니다.';
  const suggestionTitle = variant === 'search' ? '인기 검색어' : '추천 질문';

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* 사이드카 헤더 */}
      <div className="border-b border-ssoo-content-border px-4 py-3">
        <h3 className="text-sm font-semibold text-ssoo-primary">{info.title} 도우미</h3>
      </div>

      {/* 섹션 목록 */}
      <div className="flex-1 overflow-auto">
        {/* 사용 팁 */}
        <CollapsibleSection
          title="사용 팁"
          icon={<Info className="h-4 w-4 text-gray-500" />}
          defaultOpen
        >
          <ul className="space-y-1.5">
            {info.tips.map((tip, index) => (
              <li key={index} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                <span className="shrink-0 text-ssoo-primary/50">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* 추천 질문 (AI 질문 페이지) */}
        {(variant === 'ask' || variant === 'search') && suggestions.length > 0 && (
          <CollapsibleSection
            title={suggestionTitle}
            icon={<Info className="h-4 w-4 text-gray-500" />}
            defaultOpen
          >
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestionSelect?.(suggestion)}
                  className="max-w-full truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-xs text-ssoo-primary transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg"
                  title={suggestion}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* 참조 소스 (질문/검색에서 결과가 있을 때) */}
        {sources.length > 0 && (
          <CollapsibleSection
            title="참조 문서"
            icon={<BookOpen className="h-4 w-4 text-gray-500" />}
            defaultOpen
          >
            <ul className="space-y-1.5">
              {sources.map((source, index) => (
                <li key={index} className="text-xs text-gray-600 truncate" title={source.path}>
                  <span className="text-ssoo-primary">{source.title}</span>
                  <span className="ml-1 text-gray-400">{source.path}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 채팅 기록 */}
        <CollapsibleSection
          title={historyTitle}
          icon={<History className="h-4 w-4 text-gray-500" />}
          defaultOpen={variant === 'ask' || variant === 'search'}
        >
          <AssistantSessionHistoryList
            items={history}
            isActive={(item) => Boolean(item.active)}
            onSelect={(item) => onHistorySelect?.(item)}
            onTogglePersist={onHistoryPersistToggle ? (item) => onHistoryPersistToggle(item) : undefined}
            emptyText={historyEmptyText}
            variant="sidecar"
          />
        </CollapsibleSection>

      </div>
    </div>
  );
}
